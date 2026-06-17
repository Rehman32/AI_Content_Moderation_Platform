import { Document, Types } from 'mongoose';

/**
 * Severity levels for moderation actions.
 * Ordered from least to most severe for comparison logic.
 */
export enum Severity {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Moderation actions that can be taken when a rule triggers.
 */
export enum ModerationAction {
  APPROVE = 'APPROVE',
  FLAG = 'FLAG',
  HOLD = 'HOLD',
  REJECT = 'REJECT',
  ESCALATE = 'ESCALATE',
}

/**
 * Content categories the platform can moderate.
 * Designed as an extensible enum — new categories can be added
 * without breaking existing policy versions.
 */
export enum ContentCategory {
  HATE_SPEECH = 'HATE_SPEECH',
  HARASSMENT = 'HARASSMENT',
  VIOLENCE = 'VIOLENCE',
  SEXUAL_CONTENT = 'SEXUAL_CONTENT',
  SELF_HARM = 'SELF_HARM',
  SPAM = 'SPAM',
  MISINFORMATION = 'MISINFORMATION',
  COPYRIGHT = 'COPYRIGHT',
  OTHER = 'OTHER',
}

/**
 * A single moderation rule within a policy.
 * Each rule maps a content category to a severity threshold and action.
 */
export interface IPolicyRule {
  category: ContentCategory;
  enabled: boolean;
  severity: Severity;
  action: ModerationAction;
  confidenceThreshold: number; // 0.0 – 1.0, AI confidence floor
  description: string;
}

/**
 * A single immutable policy version document.
 *
 * ARCHITECTURAL DECISION — PolicyVersion collection vs. in-place updates:
 *
 * In a content moderation platform, verdicts reference the policy that was
 * active at the time of moderation. If we mutated a single policy document,
 * every historical verdict would retroactively appear to have been judged
 * under the *current* rules — corrupting the audit trail.
 *
 * By storing each version as a separate, immutable document:
 *  1. Verdicts hold a foreign key to the exact PolicyVersion used.
 *  2. No data is ever lost; full change history is queryable.
 *  3. Activating a new version is an atomic swap, not a destructive overwrite.
 *  4. Rollbacks are trivial — just re-activate a previous version.
 */
export interface IPolicyVersion extends Document {
  versionNumber: number;
  name: string;
  description: string;
  rules: IPolicyRule[];
  isActive: boolean;
  isDeleted: boolean;
  createdBy: Types.ObjectId;
  activatedAt: Date | null;
  activatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
