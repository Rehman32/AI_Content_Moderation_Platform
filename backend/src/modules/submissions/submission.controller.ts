import { Request, Response, NextFunction } from 'express';
import { SubmissionService } from './submission.service';
import { AppError } from '../../utils/AppError';
import { UserRole } from '../users/user.interface';

const submissionService = new SubmissionService();

export class SubmissionController {
  /**
   * POST /api/v1/submissions
   * Create a new submission (any authenticated user).
   */
  public async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new AppError('Not authenticated', 401));
      }

      const submission = await submissionService.createSubmission({
        ...req.body,
        submittedBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        message: 'Submission created successfully',
        data: { submission },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/submissions/:submissionId/images
   * Upload images to an existing submission.
   */
  public async uploadImages(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new AppError('Not authenticated', 401));
      }

      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return next(new AppError('At least one image file is required', 400));
      }

      const images = await submissionService.uploadImages(
        req.params.submissionId as string,
        req.user.id,
        files
      );

      res.status(201).json({
        success: true,
        message: `${images.length} image(s) uploaded successfully`,
        data: { images },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/submissions/:submissionId
   * Get a single submission with its images.
   */
  public async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new AppError('Not authenticated', 401));
      }

      const { submission, images } = await submissionService.getSubmissionById(
        req.params.submissionId as string,
        req.user.id
      );

      // Ownership or admin check
      if (
        submission.submittedBy._id?.toString() !== req.user.id &&
        req.user.role !== UserRole.ADMIN
      ) {
        return next(new AppError('You can only view your own submissions', 403));
      }

      res.status(200).json({
        success: true,
        data: { submission, images },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/submissions
   * List submissions. Users see their own; admins see all.
   */
  public async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new AppError('Not authenticated', 401));
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string | undefined;

      // Scope to user's own submissions unless admin
      const userId = req.user.role === UserRole.ADMIN ? undefined : req.user.id;

      const result = await submissionService.getSubmissions({
        page,
        limit,
        status,
        userId,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/submissions/:submissionId/images
   * Get all images for a submission.
   */
  public async getImages(req: Request, res: Response, next: NextFunction) {
    try {
      const images = await submissionService.getSubmissionImages(
        req.params.submissionId as string
      );

      res.status(200).json({
        success: true,
        data: { images },
      });
    } catch (error) {
      next(error);
    }
  }
}
