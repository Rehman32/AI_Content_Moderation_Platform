import { ModerationService } from './moderation.service';
import { VerdictService } from '../verdicts/verdict.service';
import { VerdictModel } from '../verdicts/verdict.model';
import { PolicyVersionModel } from '../policies/policy.model';
import { ImageModel } from '../submissions/image.model';
import { SubmissionModel } from '../submissions/submission.model';
import { ImageStatus } from '../submissions/image.interface';
import { SubmissionStatus } from '../submissions/submission.interface';
import { VerdictOutcome } from '../verdicts/verdict.types';
import { auditService } from '../audit/audit.service';
import { AuditEventType, EntityType } from '../audit/audit.interface';
import { AppError } from '../../utils/AppError';
import { Types } from 'mongoose';

// ─── Output Types ─────────────────────────────────────────────────────────────

/**
 * The granular status of each pipeline step.
 * Stored on the OrchestrationResult so callers can see exactly where the
 * pipeline succeeded or stalled — critical for debugging partial failures.
 */
export enum StepStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  SKIPPED = 'SKIPPED',   // Idempotent: step had already been completed
  FAILED = 'FAILED',
}

export interface IPipelineStep {
  name: string;
  status: StepStatus;
  durationMs?: number;
  error?: string;
}

export interface IOrchestrationResult {
  imageId: string;
  submissionId: string;
  steps: IPipelineStep[];
  finalOutcome?: VerdictOutcome;
  completedAt: Date;
  totalDurationMs: number;
}

export interface ISubmissionOrchestrationResult {
  submissionId: string;
  totalImages: number;
  succeeded: number;
  failed: number;
  overallOutcome: VerdictOutcome;
  imageResults: IOrchestrationResult[];
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * ModerationOrchestrator
 *
 * WHY ORCHESTRATION IS PREFERABLE TO PLACING LOGIC IN CONTROLLERS:
 *
 * 1. SINGLE RESPONSIBILITY:
 *    Controllers handle HTTP protocol concerns (parsing input, formatting output,
 *    status codes). Business workflows — multi-step sequences with compensating
 *    actions and rollback logic — are not HTTP concerns. Mixing them creates
 *    controllers that are untestable, brittle, and impossible to reuse.
 *
 * 2. REUSABILITY:
 *    The orchestrated workflow can be triggered from an HTTP request, a cron job,
 *    a message queue consumer, or a background worker — WITHOUT importing Express.
 *    A controller-embedded workflow is forever trapped in the HTTP context.
 *
 * 3. TESTABILITY:
 *    The orchestrator is a plain class with injected dependencies. Every step
 *    can be independently unit-tested with mocks, without spinning up an
 *    Express server or a database.
 *
 * 4. FAILURE ISOLATION:
 *    A controller cannot neatly implement multi-step compensating logic
 *    (e.g., "if step 4 fails, roll back the state change from step 2").
 *    The orchestrator wraps each step with try/catch, records the failure,
 *    and can either halt or continue the pipeline depending on step criticality.
 *
 * 5. OBSERVABILITY:
 *    By tracking each step's status and duration in IPipelineStep[], the
 *    orchestrator produces a self-describing execution trace. Controllers
 *    only know success or failure — orchestrators know the exact step that failed
 *    and how long every phase took.
 *
 * 6. INDEPENDENT SERVICES:
 *    This orchestrator is a pure coordinator. It calls:
 *      - ModerationService.moderateImage()   (AI analysis, no verdict logic)
 *      - VerdictService.generateVerdict()     (policy eval, no AI logic)
 *      - AuditService.logEvent()              (audit, no business logic)
 *    Each service remains completely unaware of the others.
 */
export class ModerationOrchestrator {
  private moderationService: ModerationService;
  private verdictService: VerdictService;

  constructor() {
    this.moderationService = new ModerationService();
    this.verdictService = new VerdictService();
  }

  // ─── Public Methods ──────────────────────────────────────────────────────────

  /**
   * Execute the full moderation pipeline for a single image.
   *
   * PIPELINE STAGES:
   *  1. VALIDATE       — Confirm image exists and is in a processable state.
   *  2. AI_ANALYSIS    — Call ModerationService to analyze image via AI provider.
   *  3. VERDICT        — Call VerdictService to evaluate AI results vs. active policy.
   *  4. STATUS_UPDATE  — Mark image as COMPLETED / FAILED and update submission.
   *
   * IDEMPOTENCY:
   *  If the image is already COMPLETED with a verdict, the orchestrator detects
   *  this in Step 1 (VALIDATE) and returns the cached result immediately with
   *  all steps marked SKIPPED.
   *
   * FAILURE STRATEGY:
   *  - AI_ANALYSIS failure: Mark image FAILED. Do not generate verdict. Abort.
   *  - VERDICT failure:     Image stays COMPLETED (AI data is preserved). Abort.
   *    The verdict step can be independently retried without re-running AI.
   *  - STATUS_UPDATE failure: Non-critical. Log error but do not fail the pipeline.
   *    The Submission can be reconciled by a background job.
   */
  public async orchestrateImage(imageId: string): Promise<IOrchestrationResult> {
    const startTime = Date.now();
    const steps: IPipelineStep[] = [];
    let finalOutcome: VerdictOutcome | undefined;
    let submissionId = '';

    // ── Step 1: VALIDATE ──────────────────────────────────────────────────────
    const validateStep = await this.executeStep('VALIDATE', async () => {
      const image = await ImageModel.findById(imageId);
      if (!image) throw new AppError('Image not found', 404);

      submissionId = image.submissionId.toString();

      // Full idempotency: if already COMPLETED + verdict exists, return immediately
      if (image.status === ImageStatus.COMPLETED && image.moderationResult) {
        const activePolicy = await PolicyVersionModel.findOne({ isActive: true, isDeleted: false });
        if (activePolicy) {
          const existingVerdict = await VerdictModel.findOne({
            imageId: new Types.ObjectId(imageId),
            policyVersionId: activePolicy._id,
          });

          if (existingVerdict) {
            finalOutcome = existingVerdict.finalOutcome;
            console.log(
              `[Orchestrator] Image ${imageId} already fully processed — returning cached result`
            );
            return { cached: true, outcome: existingVerdict.finalOutcome };
          }
        }
      }

      // Block re-processing if currently in-flight
      if (image.status === ImageStatus.PROCESSING) {
        throw new AppError('Image is currently being processed by another worker', 409);
      }

      return { cached: false };
    });

    steps.push(validateStep);

    // If cached, return immediately — all remaining steps are skipped
    if (validateStep.status === StepStatus.SUCCESS &&
        (validateStep as any)._payload?.cached === true) {
      return this.buildResult(imageId, submissionId, steps, finalOutcome, startTime, true);
    }

    if (validateStep.status === StepStatus.FAILED) {
      return this.buildResult(imageId, submissionId, steps, finalOutcome, startTime);
    }

    // ── Step 2: AI_ANALYSIS ───────────────────────────────────────────────────
    const analysisStep = await this.executeStep('AI_ANALYSIS', async () => {
      console.log(`[Orchestrator] Step: AI_ANALYSIS for image ${imageId}`);
      const aiResult = await this.moderationService.moderateImage(imageId);
      console.log(
        `[Orchestrator] AI_ANALYSIS complete: safe=${aiResult.safe}, ` +
        `risk=${aiResult.overallRisk.toFixed(2)}, provider=${aiResult.providerName}`
      );
      return aiResult;
    });

    steps.push(analysisStep);

    // AI failure is unrecoverable — cannot generate verdict without AI data
    if (analysisStep.status === StepStatus.FAILED) {
      // COMPENSATING ACTION: Image is already marked FAILED by ModerationService.
      // Update submission status to reflect partial failure.
      await this.tryUpdateSubmissionStatus(submissionId, imageId);
      return this.buildResult(imageId, submissionId, steps, finalOutcome, startTime);
    }

    // ── Step 3: VERDICT ───────────────────────────────────────────────────────
    const verdictStep = await this.executeStep('VERDICT', async () => {
      console.log(`[Orchestrator] Step: VERDICT for image ${imageId}`);
      const verdict = await this.verdictService.generateVerdict(imageId);
      finalOutcome = verdict.finalOutcome;
      console.log(`[Orchestrator] VERDICT complete: ${verdict.finalOutcome}`);
      return { verdictId: verdict._id.toString(), outcome: verdict.finalOutcome };
    });

    steps.push(verdictStep);

    // Verdict failure: image AI data is preserved. Verdict can be retried independently.
    if (verdictStep.status === StepStatus.FAILED) {
      await this.tryUpdateSubmissionStatus(submissionId, imageId);
      return this.buildResult(imageId, submissionId, steps, finalOutcome, startTime);
    }

    // ── Step 4: STATUS_UPDATE ─────────────────────────────────────────────────
    const statusStep = await this.executeStep('STATUS_UPDATE', async () => {
      await this.updateSubmissionStatus(submissionId);
    });

    steps.push(statusStep);

    // STATUS_UPDATE failure is non-critical — pipeline result is still valid.
    // Log it but don't mark the overall pipeline as failed.
    if (statusStep.status === StepStatus.FAILED) {
      console.error(
        `[Orchestrator] STATUS_UPDATE failed for submission ${submissionId}. ` +
        `Verdict is still valid — submission status will reconcile on next run.`
      );
    }

    return this.buildResult(imageId, submissionId, steps, finalOutcome, startTime);
  }

  /**
   * Execute the full orchestrated moderation pipeline for all pending images
   * in a submission.
   *
   * SEQUENTIAL PROCESSING:
   *  Each image is processed one-by-one to respect AI provider rate limits.
   *  A failed image does not abort the batch — remaining images are processed.
   *
   * OVERALL OUTCOME:
   *  Applies the strictest-wins principle across all verdicts:
   *  BLOCKED > FLAGGED_FOR_REVIEW > APPROVED
   */
  public async orchestrateSubmission(
    submissionId: string
  ): Promise<ISubmissionOrchestrationResult> {
    console.log(`[Orchestrator] Starting full pipeline for submission ${submissionId}`);

    const submission = await SubmissionModel.findById(submissionId);
    if (!submission) throw new AppError('Submission not found', 404);

    const pendingImages = await ImageModel.find({
      submissionId,
      status: { $in: [ImageStatus.PENDING, ImageStatus.FAILED] },
    });

    if (pendingImages.length === 0) {
      throw new AppError(
        'No processable images found. All images are either completed or currently processing.',
        400
      );
    }

    // Mark submission as REVIEWING
    await SubmissionModel.findByIdAndUpdate(submissionId, {
      status: SubmissionStatus.REVIEWING,
    });

    let succeeded = 0;
    let failed = 0;
    const imageResults: IOrchestrationResult[] = [];
    const outcomes: VerdictOutcome[] = [];

    for (const image of pendingImages) {
      const imageId = image._id.toString();
      try {
        const result = await this.orchestrateImage(imageId);
        imageResults.push(result);

        const hasFailed = result.steps.some((s) => s.status === StepStatus.FAILED);
        if (hasFailed) {
          failed++;
        } else {
          succeeded++;
          if (result.finalOutcome) outcomes.push(result.finalOutcome);
        }
      } catch (error: any) {
        failed++;
        console.error(`[Orchestrator] Unhandled error for image ${imageId}:`, error?.message);
        imageResults.push(this.buildErrorResult(imageId, submissionId, error?.message));
      }
    }

    const overallOutcome = this.computeOverallOutcome(outcomes);

    // Final submission status
    const finalStatus = failed === pendingImages.length
      ? SubmissionStatus.PENDING   // All failed — keep PENDING for retry
      : SubmissionStatus.COMPLETED;

    await SubmissionModel.findByIdAndUpdate(submissionId, { status: finalStatus });

    console.log(
      `[Orchestrator] Submission ${submissionId} complete: ` +
      `${succeeded} succeeded, ${failed} failed, overall=${overallOutcome}`
    );

    return {
      submissionId,
      totalImages: pendingImages.length,
      succeeded,
      failed,
      overallOutcome,
      imageResults,
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Wraps a step function with timing, error catching, and structured step output.
   * Attaches the step's return value as _payload for internal inspection.
   */
  private async executeStep(
    name: string,
    fn: () => Promise<any>
  ): Promise<IPipelineStep & { _payload?: any }> {
    const t0 = Date.now();
    try {
      const payload = await fn();
      const step: IPipelineStep & { _payload?: any } = {
        name,
        status: StepStatus.SUCCESS,
        durationMs: Date.now() - t0,
        _payload: payload,
      };
      return step;
    } catch (error: any) {
      return {
        name,
        status: StepStatus.FAILED,
        durationMs: Date.now() - t0,
        error: error?.message || 'Unknown error',
      };
    }
  }

  /**
   * Attempt to update submission status after a per-image pipeline run.
   * Non-fatal — failure is logged but not re-thrown.
   */
  private async tryUpdateSubmissionStatus(submissionId: string, imageId: string): Promise<void> {
    try {
      await this.updateSubmissionStatus(submissionId);
    } catch (err: any) {
      console.error(
        `[Orchestrator] Non-critical: Could not update submission status ` +
        `for submission ${submissionId} after image ${imageId} failed:`,
        err?.message
      );
    }
  }

  /**
   * Recompute and update the parent submission's status based on
   * the current state of all its images.
   *
   * TRANSACTION STRATEGY:
   *  MongoDB does not support multi-document ACID transactions in standalone
   *  mode by default. However, the status computation is idempotent — it reads
   *  the current ground truth (all image statuses) and derives the correct
   *  submission status. This means it can be safely re-run on failure
   *  (e.g., by a reconciliation cron job) without corrupting state.
   */
  private async updateSubmissionStatus(submissionId: string): Promise<void> {
    const allImages = await ImageModel.find({ submissionId });

    if (allImages.length === 0) return;

    const statuses = allImages.map((img) => img.status);
    const allCompleted = statuses.every((s) => s === ImageStatus.COMPLETED);
    const allFailed = statuses.every((s) => s === ImageStatus.FAILED);
    const anyProcessing = statuses.some((s) => s === ImageStatus.PROCESSING);

    let newStatus: SubmissionStatus;

    if (allCompleted) {
      newStatus = SubmissionStatus.COMPLETED;
    } else if (allFailed) {
      newStatus = SubmissionStatus.PENDING; // Allow retry
    } else if (anyProcessing) {
      newStatus = SubmissionStatus.REVIEWING;
    } else {
      // Mixed state (some completed, some pending/failed)
      newStatus = SubmissionStatus.REVIEWING;
    }

    await SubmissionModel.findByIdAndUpdate(submissionId, { status: newStatus });

    console.log(
      `[Orchestrator] Submission ${submissionId} status → ${newStatus} ` +
      `(${statuses.join(', ')})`
    );
  }

  /**
   * Build the final result object from accumulated step data.
   * Strips internal _payload fields before returning to callers.
   */
  private buildResult(
    imageId: string,
    submissionId: string,
    steps: IPipelineStep[],
    finalOutcome: VerdictOutcome | undefined,
    startTime: number,
    allSkipped = false
  ): IOrchestrationResult {
    // Strip the internal _payload property used for step inspection
    const cleanSteps = steps.map(({ _payload, ...step }: any) => step as IPipelineStep);

    // If we returned early due to a cached result, mark remaining steps as SKIPPED
    if (allSkipped) {
      ['AI_ANALYSIS', 'VERDICT', 'STATUS_UPDATE'].forEach((name) => {
        if (!cleanSteps.find((s) => s.name === name)) {
          cleanSteps.push({ name, status: StepStatus.SKIPPED });
        }
      });
    }

    return {
      imageId,
      submissionId,
      steps: cleanSteps,
      finalOutcome,
      completedAt: new Date(),
      totalDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Construct a minimal error result for images that threw unhandled exceptions
   * during batch orchestration.
   */
  private buildErrorResult(
    imageId: string,
    submissionId: string,
    errorMessage: string
  ): IOrchestrationResult {
    return {
      imageId,
      submissionId,
      steps: [{ name: 'VALIDATE', status: StepStatus.FAILED, error: errorMessage }],
      completedAt: new Date(),
      totalDurationMs: 0,
    };
  }

  /**
   * Strictest-wins: BLOCKED > FLAGGED_FOR_REVIEW > APPROVED
   */
  private computeOverallOutcome(outcomes: VerdictOutcome[]): VerdictOutcome {
    if (outcomes.includes(VerdictOutcome.BLOCKED)) return VerdictOutcome.BLOCKED;
    if (outcomes.includes(VerdictOutcome.FLAGGED_FOR_REVIEW)) return VerdictOutcome.FLAGGED_FOR_REVIEW;
    if (outcomes.length === 0) return VerdictOutcome.APPROVED;
    return VerdictOutcome.APPROVED;
  }
}
