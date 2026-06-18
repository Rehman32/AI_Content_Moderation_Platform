import { Types } from 'mongoose';
import { AuditLogModel } from './audit.model';
import { AuditEventType, EntityType } from './audit.interface';
import { UserRole } from '../users/user.interface';

interface LogActionParams {
  actorId: string | Types.ObjectId | null;
  actorRole: UserRole | 'SYSTEM';
  eventType: AuditEventType;
  entityType: EntityType;
  entityId: string | Types.ObjectId;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface AuditQueryOptions {
  page: number;
  limit: number;
  eventType?: AuditEventType;
  entityType?: EntityType;
  entityId?: string;
  actorId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class AuditService {
  /**
   * Log an event into the audit trail.
   * 
   * ENGINEERING DECISION: Fire-and-forget vs. Awaited.
   * Typically, audit logging should not block the main business transaction.
   * However, in a compliance-heavy system, if the audit log fails, the action
   * should probably fail. We await it here. For ultra-high throughput, this
   * could be pushed to a message queue (e.g., RabbitMQ).
   */
  public async logEvent(params: LogActionParams): Promise<void> {
    try {
      await AuditLogModel.create({
        actorId: params.actorId ? new Types.ObjectId(params.actorId) : null,
        actorRole: params.actorRole,
        eventType: params.eventType,
        entityType: params.entityType,
        entityId: new Types.ObjectId(params.entityId),
        previousState: params.previousState,
        newState: params.newState,
        metadata: params.metadata,
      });
      // Do not log the payload to console to prevent leaking PII/sensitive data in standard stdout logs
    } catch (error) {
      // If audit logging fails, it's a critical system error. 
      // Depending on strictness, we might throw or just log to a critical alert channel.
      console.error('[AuditService] FAILED TO WRITE AUDIT LOG:', error);
      throw new Error('Failed to write to audit log');
    }
  }

  /**
   * Retrieve audit logs with pagination and filtering.
   */
  public async queryLogs(options: AuditQueryOptions) {
    const { page, limit, eventType, entityType, entityId, actorId, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (eventType) query.eventType = eventType;
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = new Types.ObjectId(entityId);
    if (actorId) query.actorId = new Types.ObjectId(actorId);

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const [logs, total] = await Promise.all([
      AuditLogModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actorId', 'firstName lastName email'),
      AuditLogModel.countDocuments(query),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get the full history of a specific entity.
   */
  public async getEntityHistory(entityType: EntityType, entityId: string) {
    return await AuditLogModel.find({
      entityType,
      entityId: new Types.ObjectId(entityId),
    })
      .sort({ createdAt: -1 })
      .populate('actorId', 'firstName lastName email');
  }
}

// Export a singleton instance for easy imports across other services
export const auditService = new AuditService();
