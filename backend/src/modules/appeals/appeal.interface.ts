import { Document, Types } from 'mongoose';

/**
 * Appeal lifecycle statuses.
 *
 * PENDING       → Created by user, awaiting admin triage.
 * UNDER_REVIEW  → Admin has opened the appeal for review.
 * APPROVED      → Admin approved — verdict overridden, submission reinstated.
 * REJECTED      → Admin rejected — original verdict stands.
 *
 * TRANSITIONS:
 *   PENDING → UNDER_REVIEW  (admin picks it up)
 *   PENDING → APPROVED      (direct approval without explicit triage)
 *   PENDING → REJECTED      (direct rejection)
 *   UNDER_REVIEW → APPROVED
 *   UNDER_REVIEW → REJECTED
 *
 *   APPROVED and REJECTED are terminal — no further transitions allowed.
 *   This is the immutability guarantee for the review history.
 */
export enum AppealStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * A snapshot of the verdict state at the time the appeal was created.
 * Stored to make appeals fully self-describing — even if the active
 * policy changes, the appeal always references what was originally decided.
 */
export interface IAppealVerdictSnapshot {
  verdictId: Types.ObjectId;
  finalOutcome: string;   // VerdictOutcome string — decoupled from enum reference
  reasoning: string;
  policyVersionNumber: number;
}

/**
 * The Appeal document interface.
 *
 * DESIGN DECISIONS:
 *
 * 1. APPEAL BELONGS TO A SUBMISSION (not an image):
 *    Users experience moderation at the submission level. They don't know which
 *    specific image failed — they know their submission was blocked. The appeal
 *    is therefore a challenge to the submission-level outcome.
 *
 * 2. VERDICT SNAPSHOT (not a foreign key to VerdictModel):
 *    The appeal stores a snapshot of the verdict at creation time. This ensures
 *    that if the policy changes and a new verdict is generated, the appeal still
 *    accurately documents what the user was appealing against.
 *
 * 3. IMMUTABLE REVIEW HISTORY:
 *    Once an appeal reaches APPROVED or REJECTED, its status cannot change.
 *    This is enforced at both the service layer (guard) and the Mongoose schema
 *    (terminal state validation). A new appeal must be filed for a new challenge.
 */
export interface IAppeal extends Document {
  submissionId: Types.ObjectId;
  appellantId: Types.ObjectId;          // User who filed the appeal
  verdictSnapshot: IAppealVerdictSnapshot;
  reason: string;                        // User-provided grounds for appeal
  status: AppealStatus;
  reviewedBy?: Types.ObjectId;           // Admin who made the final decision
  reviewedAt?: Date;
  adminNotes?: string;                   // Admin's written justification
  createdAt: Date;
  updatedAt: Date;
}
