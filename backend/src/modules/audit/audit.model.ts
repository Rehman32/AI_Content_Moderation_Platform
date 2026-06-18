import mongoose, { Schema } from 'mongoose';
import { IAuditLog, AuditEventType, EntityType } from './audit.interface';
import { UserRole } from '../users/user.interface';

/**
 * AuditLog schema.
 * 
 * ENGINEERING DECISIONS:
 * 1. IMMUTABILITY: 
 *    Audit logs must NEVER be updated or deleted. Mongoose middleware
 *    will enforce this by throwing an error on any update/delete operations.
 * 2. MIXED TYPES FOR FLEXIBILITY:
 *    `previousState` and `newState` are Schema.Types.Mixed because different 
 *    events store different shapes (e.g. an entire PolicyVersion vs just a string status).
 * 3. INDEXING:
 *    - { entityId: 1, entityType: 1 } -> Fast lookups for an entity's history
 *    - { actorId: 1 } -> Fast lookups for an admin's actions
 *    - { eventType: 1 } -> Filtering by event type
 *    - { createdAt: -1 } -> Chronological sorting (most recent first)
 */
const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Null indicates the SYSTEM performed the action
    },
    actorRole: {
      type: String,
      enum: [...Object.values(UserRole), 'SYSTEM'],
      required: true,
    },
    eventType: {
      type: String,
      enum: Object.values(AuditEventType),
      required: true,
    },
    entityType: {
      type: String,
      enum: Object.values(EntityType),
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    previousState: {
      type: Schema.Types.Mixed,
    },
    newState: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // No updatedAt because logs are immutable
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
AuditLogSchema.index({ entityId: 1, entityType: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ eventType: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

// ─── Immutability Guards ─────────────────────────────────────────────────────
// Mongoose middleware to prevent accidental mutations of audit records.

// @ts-ignore
AuditLogSchema.pre('save', function (next: any) {
  if (!this.isNew) {
    return next(new Error('Audit logs are immutable and cannot be updated.'));
  }
  next();
});

// @ts-ignore
AuditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne'], function (next: any) {
  next(new Error('Audit logs are immutable and cannot be updated via query.'));
});

// @ts-ignore
AuditLogSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], function (next: any) {
  next(new Error('Audit logs are immutable and cannot be deleted.'));
});

export const AuditLogModel = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
