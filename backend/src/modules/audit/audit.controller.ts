import { Request, Response, NextFunction } from 'express';
import { auditService } from './audit.service';
import { AuditEventType, EntityType } from './audit.interface';

export class AuditController {
  /**
   * GET /api/v1/audit
   * Query audit logs with pagination and filters.
   * Restricted to ADMIN.
   */
  public async queryLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const eventType = req.query.eventType as AuditEventType | undefined;
      const entityType = req.query.entityType as EntityType | undefined;
      const entityId = req.query.entityId as string | undefined;
      const actorId = req.query.actorId as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const result = await auditService.queryLogs({
        page,
        limit,
        eventType,
        entityType,
        entityId,
        actorId,
        startDate,
        endDate,
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
   * GET /api/v1/audit/:entityType/:entityId
   * Get complete history for a specific entity.
   */
  public async getEntityHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { entityType, entityId } = req.params;

      const logs = await auditService.getEntityHistory(
        entityType as EntityType,
        entityId as string
      );

      res.status(200).json({
        success: true,
        data: {
          entityType,
          entityId,
          history: logs,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
