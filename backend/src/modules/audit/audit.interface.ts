import { Document, Types } from 'mongoose';
import { UserRole } from '../users/user.interface';

export enum AuditEventType {
  // Policy Events
  POLICY_CREATED = 'POLICY_CREATED',
  POLICY_ACTIVATED = 'POLICY_ACTIVATED',
  
  // Submission & Image Events
  SUBMISSION_CREATED = 'SUBMISSION_CREATED',
  IMAGES_UPLOADED = 'IMAGES_UPLOADED',
  
  // Moderation & Verdict Events
  MODERATION_EXECUTED = 'MODERATION_EXECUTED',
  VERDICT_GENERATED = 'VERDICT_GENERATED',
  VERDICT_OVERRIDDEN = 'VERDICT_OVERRIDDEN',
  
  // Appeals (Future)
  APPEAL_CREATED = 'APPEAL_CREATED',
  APPEAL_APPROVED = 'APPEAL_APPROVED',
  APPEAL_REJECTED = 'APPEAL_REJECTED',
}

export enum EntityType {
  POLICY_VERSION = 'POLICY_VERSION',
  SUBMISSION = 'SUBMISSION',
  IMAGE = 'IMAGE',
  VERDICT = 'VERDICT',
  APPEAL = 'APPEAL',
  USER = 'USER',
}

export interface IAuditLog extends Document {
  actorId: Types.ObjectId | null;     // Null if system-generated
  actorRole: UserRole | 'SYSTEM';
  eventType: AuditEventType;
  entityType: EntityType;
  entityId: Types.ObjectId;
  previousState?: Record<string, any>; // Schemaless object for flexibility
  newState?: Record<string, any>;      // Schemaless object for flexibility
  metadata?: Record<string, any>;      // E.g., IP address, user agent, reason
  createdAt: Date;                     // The 'timestamp'
}
