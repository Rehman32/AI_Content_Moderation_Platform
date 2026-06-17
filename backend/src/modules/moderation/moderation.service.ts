import fs from 'fs';
import path from 'path';
import { ImageModel } from '../submissions/image.model';
import { SubmissionModel } from '../submissions/submission.model';
import { ImageStatus } from '../submissions/image.interface';
import { SubmissionStatus } from '../submissions/submission.interface';
import { getAIProvider } from '../../services/ai/ai-factory';
import { AppError } from '../../utils/AppError';
import { IAIAnalysisResult } from './moderation.types';

export class ModerationService {
  /**
   * Moderate a single image by its database ID.
   *
   * WORKFLOW:
   *  1. Fetch image document, validate it's in PENDING state.
   *  2. Mark as PROCESSING (idempotency guard — prevents double analysis
   *     if two requests trigger moderation for the same image concurrently).
   *  3. Read file from disk into a Buffer (provider-agnostic — works for
   *     both local and S3 when the read method is swapped).
   *  4. Call the AI provider through the factory (no direct Gemini reference).
   *  5. Persist the result on the Image document.
   *  6. Mark as COMPLETED.
   *  7. On any failure, mark as FAILED and rethrow — caller can decide
   *     whether to surface the error or swallow it for batch jobs.
   */
  public async moderateImage(imageId: string): Promise<IAIAnalysisResult> {
    const image = await ImageModel.findById(imageId);

    if (!image) {
      throw new AppError('Image not found', 404);
    }

    // Idempotency: skip if already analyzed
    if (image.status === ImageStatus.COMPLETED) {
      if (!image.moderationResult) {
        throw new AppError('Image is marked completed but has no moderation result', 500);
      }
      return image.moderationResult as IAIAnalysisResult;
    }

    if (image.status === ImageStatus.PROCESSING) {
      throw new AppError('Image is already being processed', 409);
    }

    if (image.status === ImageStatus.FAILED) {
      throw new AppError(
        'Image analysis previously failed. Re-submit the image to retry.',
        400
      );
    }

    // ── Step 1: Mark as PROCESSING ─────────────────────────────────────────
    await ImageModel.findByIdAndUpdate(imageId, { status: ImageStatus.PROCESSING });

    try {
      // ── Step 2: Read file from disk ───────────────────────────────────────
      const absolutePath = path.join(process.cwd(), image.meta.storagePath);

      if (!fs.existsSync(absolutePath)) {
        throw new AppError(
          `Image file not found on disk: ${image.meta.storagePath}`,
          404
        );
      }

      const imageBuffer = fs.readFileSync(absolutePath);

      // ── Step 3: Analyze via AI provider (abstracted) ──────────────────────
      const provider = getAIProvider();

      console.log(
        `[ModerationService] Analyzing image ${imageId} with provider: ${provider.providerName}`
      );

      const result = await provider.analyzeImage({
        imageBuffer,
        mimeType: image.meta.mimeType,
        imageId: imageId,
      });

      // ── Step 4: Persist result on the Image document ──────────────────────
      await ImageModel.findByIdAndUpdate(imageId, {
        status: ImageStatus.COMPLETED,
        moderationResult: {
          safe: result.safe,
          overallRisk: result.overallRisk,
          categories: result.categories,
          analyzedAt: result.analyzedAt,
          providerName: result.providerName,
          modelVersion: result.modelVersion,
          processingTimeMs: result.processingTimeMs,
        },
      });

      console.log(
        `[ModerationService] Image ${imageId} analyzed: ` +
        `safe=${result.safe}, overallRisk=${result.overallRisk.toFixed(2)}`
      );

      return result;

    } catch (error: any) {
      // ── Step 5: Mark as FAILED so the pipeline knows not to retry blindly ─
      await ImageModel.findByIdAndUpdate(imageId, { status: ImageStatus.FAILED });

      console.error(`[ModerationService] Failed to analyze image ${imageId}:`, error?.message);

      // Re-throw so the controller can format the HTTP response appropriately
      if (error instanceof AppError) throw error;
      throw new AppError(`Moderation failed: ${error?.message || 'Unknown error'}`, 503);
    }
  }

  /**
   * Moderate all PENDING images in a submission.
   *
   * DESIGN DECISION — Sequential processing:
   * Images are processed one-by-one rather than in parallel (Promise.all).
   * Reason: Gemini enforces per-project rate limits. Firing 10 concurrent
   * requests for a submission risks 429 errors. Sequential processing is
   * safer and still fast enough for the typical submission size (< 10 images).
   *
   * For high-throughput production use, replace with a proper job queue
   * (BullMQ) with a configurable concurrency level.
   *
   * Returns a summary of the batch: how many succeeded, how many failed.
   */
  public async moderateSubmission(submissionId: string) {
    const submission = await SubmissionModel.findById(submissionId);

    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    const pendingImages = await ImageModel.find({
      submissionId,
      status: ImageStatus.PENDING,
    });

    if (pendingImages.length === 0) {
      throw new AppError('No pending images found for this submission', 400);
    }

    // Update submission to REVIEWING status
    await SubmissionModel.findByIdAndUpdate(submissionId, {
      status: SubmissionStatus.REVIEWING,
    });

    let succeeded = 0;
    let failed = 0;
    const results: Array<{ imageId: string; success: boolean; result?: IAIAnalysisResult; error?: string }> = [];

    for (const image of pendingImages) {
      try {
        const result = await this.moderateImage(image._id.toString());
        results.push({ imageId: image._id.toString(), success: true, result });
        succeeded++;
      } catch (error: any) {
        results.push({
          imageId: image._id.toString(),
          success: false,
          error: error?.message || 'Unknown error',
        });
        failed++;
        // Continue with remaining images — don't abort the whole batch
      }
    }

    // Update submission status based on batch outcome
    const finalStatus = failed === pendingImages.length
      ? SubmissionStatus.PENDING    // All failed — keep PENDING so it can be retried
      : SubmissionStatus.COMPLETED;

    await SubmissionModel.findByIdAndUpdate(submissionId, {
      status: finalStatus,
    });

    console.log(
      `[ModerationService] Submission ${submissionId} batch complete: ` +
      `${succeeded} succeeded, ${failed} failed`
    );

    return {
      submissionId,
      totalImages: pendingImages.length,
      succeeded,
      failed,
      finalStatus,
      results,
    };
  }

  /**
   * Retrieve the moderation result for a single image.
   */
  public async getModerationResult(imageId: string) {
    const image = await ImageModel.findById(imageId);

    if (!image) {
      throw new AppError('Image not found', 404);
    }

    if (image.status !== ImageStatus.COMPLETED || !image.moderationResult) {
      throw new AppError(
        `Moderation result not available. Image status: ${image.status}`,
        404
      );
    }

    return image.moderationResult;
  }
}
