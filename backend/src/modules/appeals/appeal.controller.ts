import { Request, Response, NextFunction } from 'express';
import { AppealService } from './appeal.service';
import { AppealStatus } from './appeal.interface';

const appealService = new AppealService();

export class AppealController {
  /**
   * POST /api/v1/appeals/submissions/:submissionId
   * Create an appeal for a submission.
   * Authenticated user must be the submission owner.
   */
  public async createAppeal(req: Request, res: Response, next: NextFunction) {
    try {
      const appeal = await appealService.createAppeal({
        submissionId: req.params.submissionId as string,
        appellantId: req.user!.id,
        reason: req.body.reason,
      });

      res.status(201).json({
        success: true,
        message: 'Appeal filed successfully. An admin will review your request.',
        data: { appeal },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/appeals/:appealId/approve
   * Admin approves an appeal — overrides verdict and reinstates submission.
   */
  public async approveAppeal(req: Request, res: Response, next: NextFunction) {
    try {
      const appeal = await appealService.approveAppeal({
        appealId: req.params.appealId as string,
        adminId: req.user!.id,
        adminNotes: req.body.adminNotes,
      });

      res.status(200).json({
        success: true,
        message: 'Appeal approved. The original verdict has been overridden.',
        data: { appeal },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/appeals/:appealId/reject
   * Admin rejects an appeal — original verdict stands.
   */
  public async rejectAppeal(req: Request, res: Response, next: NextFunction) {
    try {
      const appeal = await appealService.rejectAppeal({
        appealId: req.params.appealId as string,
        adminId: req.user!.id,
        adminNotes: req.body.adminNotes,
      });

      res.status(200).json({
        success: true,
        message: 'Appeal rejected. The original moderation verdict stands.',
        data: { appeal },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/appeals/:appealId/review
   * Admin marks an appeal as UNDER_REVIEW (triage step).
   */
  public async markUnderReview(req: Request, res: Response, next: NextFunction) {
    try {
      const appeal = await appealService.markUnderReview(
        req.params.appealId as string,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        message: 'Appeal marked as under review.',
        data: { appeal },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/appeals/:appealId
   * Get a single appeal. Users can only access their own; admins see all.
   */
  public async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const appeal = await appealService.getAppealById(
        req.params.appealId as string,
        req.user!.id,
        req.user!.role
      );

      res.status(200).json({
        success: true,
        data: { appeal },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/appeals/submissions/:submissionId
   * Get all appeals for a specific submission.
   */
  public async getBySubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const appeals = await appealService.getAppealsBySubmission(
        req.params.submissionId as string,
        req.user!.id,
        req.user!.role
      );

      res.status(200).json({
        success: true,
        data: { appeals },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/appeals
   * List all appeals (admin review queue). Supports ?status=PENDING&page=1&limit=10
   */
  public async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as AppealStatus | undefined;
      const appellantId = req.query.appellantId as string | undefined;

      const result = await appealService.listAppeals({
        page,
        limit,
        status,
        appellantId,
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
