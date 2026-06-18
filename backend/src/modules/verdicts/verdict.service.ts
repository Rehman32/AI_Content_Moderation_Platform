import { VerdictModel } from './verdict.model';
import { VerdictOutcome } from './verdict.types';
import { PolicyEvaluationEngine } from './verdict.evaluator';
import { PolicyVersionModel } from '../policies/policy.model';
import { ImageModel } from '../submissions/image.model';
import { ImageStatus } from '../submissions/image.interface';
import { AppError } from '../../utils/AppError';
import { Types } from 'mongoose';
import { auditService } from '../audit/audit.service';
import { AuditEventType, EntityType } from '../audit/audit.interface';

const evaluationEngine = new PolicyEvaluationEngine();

interface PaginationOptions {
  page: number;
  limit: number;
  outcome?: string;
  submissionId?: string;
}

export class VerdictService {
  /**
   * Generate a verdict for a single image.
   *
   * WORKFLOW:
   *  1. Fetch image — must be COMPLETED (AI analysis done).
   *  2. Fetch the ACTIVE policy version — this is the policy at judgment time.
   *  3. Run the deterministic PolicyEvaluationEngine.
   *  4. Persist the verdict with a snapshot of the AI results AND the
   *     policy version reference.
   *  5. Return the full verdict document.
   *
   * IDEMPOTENCY:
   *  If a verdict already exists for this image under the current active
   *  policy version, return it immediately without re-evaluating.
   *  This prevents duplicate verdicts from concurrent requests.
   *
   *  HOWEVER: if the active policy has CHANGED since the last verdict,
   *  a NEW verdict is generated (new policy version = new judgment context).
   *  This is correct behaviour — a policy change may change the outcome.
   */
  public async generateVerdict(imageId: string) {
    // ── Step 1: Fetch the image ────────────────────────────────────────────
    const image = await ImageModel.findById(imageId);

    if (!image) {
      throw new AppError('Image not found', 404);
    }

    if (image.status !== ImageStatus.COMPLETED || !image.moderationResult) {
      throw new AppError(
        `Cannot generate a verdict: image has not been analyzed yet (status: ${image.status})`,
        400
      );
    }

    // ── Step 2: Fetch the active policy ────────────────────────────────────
    const activePolicy = await PolicyVersionModel.findOne({
      isActive: true,
      isDeleted: false,
    });

    if (!activePolicy) {
      throw new AppError(
        'No active policy found. An admin must activate a policy before verdicts can be generated.',
        404
      );
    }

    // ── Step 3: Idempotency check ──────────────────────────────────────────
    const existingVerdict = await VerdictModel.findOne({
      imageId: new Types.ObjectId(imageId),
      policyVersionId: activePolicy._id,
    });

    if (existingVerdict) {
      console.log(
        `[VerdictService] Verdict already exists for image ${imageId} ` +
        `under policy v${activePolicy.versionNumber} — returning cached verdict`
      );
      return existingVerdict;
    }

    // ── Step 4: Run deterministic policy evaluation ────────────────────────
    console.log(
      `[VerdictService] Evaluating image ${imageId} against ` +
      `policy "${activePolicy.name}" (v${activePolicy.versionNumber})`
    );

    const evaluation = evaluationEngine.evaluate(
      image.moderationResult.categories,
      activePolicy
    );

    // ── Step 5: Persist the verdict ────────────────────────────────────────
    const verdict = await VerdictModel.create({
      imageId: new Types.ObjectId(imageId),
      submissionId: image.submissionId,
      policyVersionId: activePolicy._id,
      policyVersionNumber: activePolicy.versionNumber,
      aiResults: image.moderationResult.categories,   // Snapshot — immune to future model changes
      triggeredRules: evaluation.triggeredRules,
      finalOutcome: evaluation.finalOutcome,
      reasoning: evaluation.reasoning,
      generatedAt: new Date(),
    });

    console.log(
      `[VerdictService] Verdict generated for image ${imageId}: ` +
      `${evaluation.finalOutcome} | ${evaluation.triggeredRules.length} rule(s) triggered`
    );

    await auditService.logEvent({
      actorId: null, // SYSTEM initiated action via admin trigger or batch process
      actorRole: 'SYSTEM',
      eventType: AuditEventType.VERDICT_GENERATED,
      entityType: EntityType.VERDICT,
      entityId: verdict._id,
      newState: { outcome: evaluation.finalOutcome },
      metadata: { 
        imageId, 
        policyVersionId: activePolicy._id, 
        triggeredRulesCount: evaluation.triggeredRules.length 
      },
    });

    return verdict;
  }

  /**
   * Generate verdicts for all AI-analyzed images in a submission.
   * Each image gets its own verdict document.
   * Failed evaluations do not abort the batch.
   */
  public async generateSubmissionVerdicts(submissionId: string) {
    const analyzedImages = await ImageModel.find({
      submissionId,
      status: ImageStatus.COMPLETED,
    });

    if (analyzedImages.length === 0) {
      throw new AppError(
        'No analyzed images found. Run AI moderation before generating verdicts.',
        400
      );
    }

    let generated = 0;
    let skipped = 0;
    let failed = 0;
    const verdicts = [];

    for (const image of analyzedImages) {
      try {
        const verdict = await this.generateVerdict(image._id.toString());
        verdicts.push(verdict);

        // Count whether this was a new verdict or a cached one
        if ((verdict as any).__v === 0 && verdict.isNew !== false) {
          generated++;
        } else {
          skipped++;
        }
      } catch (error: any) {
        failed++;
        console.error(
          `[VerdictService] Failed to generate verdict for image ${image._id}: ` +
          error?.message
        );
      }
    }

    // Compute overall submission outcome: BLOCKED beats FLAGGED beats APPROVED
    const outcomes = verdicts.map((v) => v.finalOutcome);
    const overallOutcome = this.computeOverallOutcome(outcomes);

    return {
      submissionId,
      totalImages: analyzedImages.length,
      generated: verdicts.length,
      failed,
      overallOutcome,
      verdicts,
    };
  }

  /**
   * Retrieve a single verdict by its ID.
   */
  public async getVerdictById(verdictId: string) {
    const verdict = await VerdictModel.findById(verdictId)
      .populate('imageId', 'meta status submissionId')
      .populate('policyVersionId', 'name versionNumber')
      .populate('overriddenBy', 'firstName lastName email');

    if (!verdict) {
      throw new AppError('Verdict not found', 404);
    }

    return verdict;
  }

  /**
   * Get the current verdict for a specific image.
   */
  public async getVerdictByImageId(imageId: string) {
    // Return the most recent verdict for this image (latest policy version)
    const verdict = await VerdictModel.findOne({ imageId: new Types.ObjectId(imageId) })
      .sort({ policyVersionNumber: -1 })
      .populate('policyVersionId', 'name versionNumber')
      .populate('overriddenBy', 'firstName lastName email');

    if (!verdict) {
      throw new AppError('No verdict found for this image', 404);
    }

    return verdict;
  }

  /**
   * Get all verdicts for a submission.
   */
  public async getSubmissionVerdicts(submissionId: string) {
    const verdicts = await VerdictModel.find({
      submissionId: new Types.ObjectId(submissionId),
    })
      .sort({ createdAt: 1 })
      .populate('imageId', 'meta.originalName meta.mimeType status')
      .populate('policyVersionId', 'name versionNumber');

    return verdicts;
  }

  /**
   * Paginated list of all verdicts with optional filtering.
   * Used by admin review dashboard.
   */
  public async listVerdicts(options: PaginationOptions) {
    const { page, limit, outcome, submissionId } = options;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (outcome && Object.values(VerdictOutcome).includes(outcome as VerdictOutcome)) {
      filter.finalOutcome = outcome;
    }
    if (submissionId) {
      filter.submissionId = new Types.ObjectId(submissionId);
    }

    const [verdicts, total] = await Promise.all([
      VerdictModel.find(filter)
        .sort({ generatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('imageId', 'meta.originalName meta.mimeType')
        .populate('policyVersionId', 'name versionNumber'),
      VerdictModel.countDocuments(filter),
    ]);

    return {
      verdicts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Compute the strictest overall outcome across a set of verdicts.
   * BLOCKED > FLAGGED_FOR_REVIEW > APPROVED
   */
  private computeOverallOutcome(outcomes: VerdictOutcome[]): VerdictOutcome {
    if (outcomes.includes(VerdictOutcome.BLOCKED)) return VerdictOutcome.BLOCKED;
    if (outcomes.includes(VerdictOutcome.FLAGGED_FOR_REVIEW)) return VerdictOutcome.FLAGGED_FOR_REVIEW;
    return VerdictOutcome.APPROVED;
  }
}
