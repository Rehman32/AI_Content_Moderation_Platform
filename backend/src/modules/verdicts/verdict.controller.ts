import { Request, Response, NextFunction } from 'express';
import { VerdictService } from './verdict.service';

const verdictService = new VerdictService();

export class VerdictController {
  /**
   * POST /api/v1/verdicts/images/:imageId
   * Generate a verdict for a single analyzed image.
   */
  public async generateForImage(req: Request, res: Response, next: NextFunction) {
    try {
      const verdict = await verdictService.generateVerdict(
        req.params.imageId as string
      );

      res.status(201).json({
        success: true,
        message: `Verdict generated: ${verdict.finalOutcome}`,
        data: { verdict },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/verdicts/submissions/:submissionId
   * Generate verdicts for all analyzed images in a submission.
   */
  public async generateForSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await verdictService.generateSubmissionVerdicts(
        req.params.submissionId as string
      );

      res.status(201).json({
        success: true,
        message: `Submission verdict: ${result.overallOutcome}`,
        data: { result },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/verdicts/:verdictId
   * Get a single verdict by its ID.
   */
  public async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const verdict = await verdictService.getVerdictById(
        req.params.verdictId as string
      );

      res.status(200).json({
        success: true,
        data: { verdict },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/verdicts/images/:imageId
   * Get the latest verdict for a specific image.
   */
  public async getByImageId(req: Request, res: Response, next: NextFunction) {
    try {
      const verdict = await verdictService.getVerdictByImageId(
        req.params.imageId as string
      );

      res.status(200).json({
        success: true,
        data: { verdict },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/verdicts/submissions/:submissionId
   * Get all verdicts for a submission.
   */
  public async getBySubmissionId(req: Request, res: Response, next: NextFunction) {
    try {
      const verdicts = await verdictService.getSubmissionVerdicts(
        req.params.submissionId as string
      );

      res.status(200).json({
        success: true,
        data: { verdicts },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/verdicts
   * Paginated list of all verdicts with optional filters.
   */
  public async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const outcome = req.query.outcome as string | undefined;
      const submissionId = req.query.submissionId as string | undefined;

      const result = await verdictService.listVerdicts({
        page,
        limit,
        outcome,
        submissionId,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
