import { Request, Response, NextFunction } from 'express';
import { ModerationService } from './moderation.service';
import { AppError } from '../../utils/AppError';

const moderationService = new ModerationService();

export class ModerationController {
  /**
   * POST /api/v1/moderation/images/:imageId/analyze
   * Trigger AI analysis for a single image.
   */
  public async analyzeImage(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await moderationService.moderateImage(
        req.params.imageId as string
      );

      res.status(200).json({
        success: true,
        message: 'Image analyzed successfully',
        data: { result },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/moderation/submissions/:submissionId/analyze
   * Trigger AI analysis for all pending images in a submission.
   */
  public async analyzeSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await moderationService.moderateSubmission(
        req.params.submissionId as string
      );

      const statusCode = summary.failed > 0 ? 207 : 200; // 207 Multi-Status for partial failures

      res.status(statusCode).json({
        success: summary.failed === 0,
        message: summary.failed === 0
          ? `All ${summary.succeeded} image(s) analyzed successfully`
          : `${summary.succeeded} succeeded, ${summary.failed} failed`,
        data: { summary },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/moderation/images/:imageId/result
   * Retrieve the stored moderation result for a single image.
   */
  public async getResult(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await moderationService.getModerationResult(
        req.params.imageId as string
      );

      res.status(200).json({
        success: true,
        data: { result },
      });
    } catch (error) {
      next(error);
    }
  }
}
