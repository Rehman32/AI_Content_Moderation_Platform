import { Request, Response, NextFunction } from 'express';
import { PolicyService } from './policy.service';
import { AppError } from '../../utils/AppError';

const policyService = new PolicyService();

export class PolicyController {
  /**
   * POST /api/v1/policies
   * Create a new policy version (Admin only).
   */
  public async createVersion(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new AppError('Not authenticated', 401));
      }

      const policyVersion = await policyService.createPolicyVersion({
        ...req.body,
        createdBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        message: `Policy version ${policyVersion.versionNumber} created successfully`,
        data: { policyVersion },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/policies/active
   * Retrieve the currently active policy.
   */
  public async getActive(req: Request, res: Response, next: NextFunction) {
    try {
      const activePolicy = await policyService.getActivePolicy();

      res.status(200).json({
        success: true,
        data: { policyVersion: activePolicy },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/policies/:versionId
   * Retrieve a specific policy version by ID.
   */
  public async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const policy = await policyService.getPolicyById(req.params.versionId as string);

      res.status(200).json({
        success: true,
        data: { policyVersion: policy },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/policies/history
   * Paginated list of all policy versions (newest first).
   */
  public async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const includeDeleted = req.query.includeDeleted === 'true';

      const result = await policyService.getPolicyHistory({
        page,
        limit,
        includeDeleted,
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
   * PATCH /api/v1/policies/:versionId/activate
   * Activate a specific policy version (Admin only).
   */
  public async activate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new AppError('Not authenticated', 401));
      }

      const activated = await policyService.activatePolicy(
        req.params.versionId as string,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: 'Policy version activated successfully',
        data: { policyVersion: activated },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/policies/:versionId
   * Soft-delete a policy version (Admin only).
   */
  public async softDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await policyService.softDeletePolicy(req.params.versionId as string);

      res.status(200).json({
        success: true,
        message: `Policy version ${deleted.versionNumber} soft-deleted`,
        data: { policyVersion: deleted },
      });
    } catch (error) {
      next(error);
    }
  }
}
