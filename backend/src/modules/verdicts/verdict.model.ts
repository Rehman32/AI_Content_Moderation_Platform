import mongoose, { Schema } from 'mongoose';
import { IVerdict, VerdictOutcome } from './verdict.types';
import { ModerationAction } from '../policies/policy.interface';

const TriggeredRuleSchema = new Schema(
  {
    category: { type: String, required: true },
    policyAction: {
      type: String,
      enum: Object.values(ModerationAction),
      required: true,
    },
    policyThreshold: { type: Number, required: true },
    aiConfidence: { type: Number, required: true },
    reasoning: { type: String, default: '' },
  },
  { _id: false }
);

const CategoryResultSchema = new Schema(
  {
    name: { type: String, required: true },
    confidence: { type: Number, required: true },
    flagged: { type: Boolean, required: true },
    reasoning: { type: String, default: '' },
  },
  { _id: false }
);

/**
 * Verdict schema.
 *
 * INDEXING STRATEGY:
 *  - { imageId: 1 }            — "Has this image been verdicted?" (most frequent)
 *  - { submissionId: 1 }       — "All verdicts for this submission" (dashboard)
 *  - { finalOutcome: 1 }       — "All BLOCKED verdicts" (admin review queue)
 *  - { policyVersionId: 1 }    — "All verdicts under policy v3" (policy audit)
 *  - { imageId: 1, policyVersionId: 1 } unique — prevents duplicate verdicts
 *    for the same image under the same policy version
 *
 * NOTE: imageId + policyVersionId uniqueness allows the same image to be
 * re-evaluated under a DIFFERENT policy version (e.g. after a policy update
 * admin triggers re-review), producing a new verdict document each time.
 */
const VerdictSchema = new Schema<IVerdict>(
  {
    imageId: {
      type: Schema.Types.ObjectId,
      ref: 'Image',
      required: [true, 'Image reference is required'],
    },
    submissionId: {
      type: Schema.Types.ObjectId,
      ref: 'Submission',
      required: [true, 'Submission reference is required'],
    },
    policyVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'PolicyVersion',
      required: [true, 'Policy version reference is required'],
    },
    policyVersionNumber: {
      type: Number,
      required: [true, 'Policy version number is required'],
    },
    aiResults: {
      type: [CategoryResultSchema],
      default: [],
    },
    triggeredRules: {
      type: [TriggeredRuleSchema],
      default: [],
    },
    finalOutcome: {
      type: String,
      enum: Object.values(VerdictOutcome),
      required: [true, 'Final outcome is required'],
    },
    reasoning: {
      type: String,
      required: [true, 'Reasoning is required'],
      trim: true,
    },
    isOverridden: {
      type: Boolean,
      default: false,
    },
    overriddenBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    overriddenAt: {
      type: Date,
      default: null,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
VerdictSchema.index({ imageId: 1 });
VerdictSchema.index({ submissionId: 1 });
VerdictSchema.index({ finalOutcome: 1 });
VerdictSchema.index({ policyVersionId: 1 });

// Unique constraint: one verdict per image per policy version
VerdictSchema.index({ imageId: 1, policyVersionId: 1 }, { unique: true });

export const VerdictModel = mongoose.model<IVerdict>('Verdict', VerdictSchema);
