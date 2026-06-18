import { Document, Types } from 'mongoose';
import { ICategoryResult } from '../moderation/moderation.types';
import { ModerationAction } from '../policies/policy.interface';

/**
 * The three possible final outcomes of a verdict.
 *
 * ENGINEERING DECISION — Why these three (not the policy ModerationAction values)?
 *
 * ModerationAction is the policy layer's vocabulary: APPROVE, FLAG, HOLD,
 * REJECT, ESCALATE. These are the *actions a moderator takes*.
 *
 * VerdictOutcome is the verdict layer's vocabulary: what is the *final state
 * of this image from a content-compliance perspective*?
 *
 * They are intentionally different because:
 *  - The policy action drives workflow (what happens next).
 *  - The verdict outcome is the permanent compliance record (what happened).
 *
 * Example: REJECT action → BLOCKED outcome.
 *          ESCALATE action → FLAGGED_FOR_REVIEW outcome (still needs human eyes).
 *          HOLD action → FLAGGED_FOR_REVIEW (same — not yet resolved).
 */
export enum VerdictOutcome {
  APPROVED = 'APPROVED',
  FLAGGED_FOR_REVIEW = 'FLAGGED_FOR_REVIEW',
  BLOCKED = 'BLOCKED',
}

/**
 * A single rule evaluation record — which rule triggered and why.
 * Stored verbatim so every verdict can be replayed and audited.
 */
export interface ITriggeredRule {
  category: string;             // The policy category name
  policyAction: ModerationAction;
  policyThreshold: number;      // What the policy required
  aiConfidence: number;         // What the AI reported
  reasoning: string;            // AI-generated explanation
}

/**
 * The full verdict document.
 *
 * IMMUTABILITY GUARANTEE:
 *  Verdicts are never updated after creation. If a human reviewer
 *  overrides a verdict, a *new* verdict is created with a reference
 *  to the overridden one. This preserves the full audit chain.
 *
 * VERSION-AWARENESS:
 *  policyVersionId is a hard foreign-key snapshot — it points to the
 *  exact PolicyVersion that was active at judgment time. Even if a new
 *  policy is activated tomorrow, this verdict still references v1.
 */
export interface IVerdict extends Document {
  imageId: Types.ObjectId;
  submissionId: Types.ObjectId;
  policyVersionId: Types.ObjectId;
  policyVersionNumber: number;      // Denormalized for fast display without JOIN
  aiResults: ICategoryResult[];     // Full snapshot of AI output at verdict time
  triggeredRules: ITriggeredRule[]; // Which policy rules fired
  finalOutcome: VerdictOutcome;
  reasoning: string;                // Human-readable explanation of the verdict
  isOverridden: boolean;            // True if a human has overridden this verdict
  overriddenBy?: Types.ObjectId;    // User who overrode it
  overriddenAt?: Date;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
