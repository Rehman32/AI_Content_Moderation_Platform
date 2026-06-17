import mongoose, { Schema } from 'mongoose';
import {
  IPolicyVersion,
  IPolicyRule,
  ContentCategory,
  Severity,
  ModerationAction,
} from './policy.interface';

/**
 * Sub-schema for individual moderation rules.
 * Embedded (not a separate collection) because rules have no identity
 * outside of the policy version that owns them.
 */
const PolicyRuleSchema = new Schema<IPolicyRule>(
  {
    category: {
      type: String,
      enum: Object.values(ContentCategory),
      required: [true, 'Content category is required'],
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    severity: {
      type: String,
      enum: Object.values(Severity),
      required: [true, 'Severity level is required'],
    },
    action: {
      type: String,
      enum: Object.values(ModerationAction),
      required: [true, 'Moderation action is required'],
    },
    confidenceThreshold: {
      type: Number,
      required: [true, 'Confidence threshold is required'],
      min: [0, 'Confidence threshold must be between 0 and 1'],
      max: [1, 'Confidence threshold must be between 0 and 1'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false } // Rules don't need their own ObjectIds
);

/**
 * Main PolicyVersion schema.
 *
 * INDEXING STRATEGY:
 *  - { isActive: 1, isDeleted: 1 } — Hot path: "get the current active policy"
 *    fires on every moderation request. A compound partial index keeps it O(1).
 *  - { versionNumber: -1 } — Unique descending for fast history pagination
 *    and ensuring no duplicate version numbers.
 *  - { createdBy: 1 } — Audit queries: "show me all policies created by admin X".
 */
const PolicyVersionSchema = new Schema<IPolicyVersion>(
  {
    versionNumber: {
      type: Number,
      required: [true, 'Version number is required'],
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Policy name is required'],
      trim: true,
      maxlength: [100, 'Policy name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Policy description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    rules: {
      type: [PolicyRuleSchema],
      validate: {
        validator: function (rules: IPolicyRule[]) {
          // Ensure no duplicate categories within a single version
          const categories = rules.map((r) => r.category);
          return categories.length === new Set(categories).size;
        },
        message: 'Duplicate content categories are not allowed within a single policy version',
      },
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator information is required'],
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    activatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
PolicyVersionSchema.index({ isActive: 1, isDeleted: 1 });
PolicyVersionSchema.index({ versionNumber: -1 });
PolicyVersionSchema.index({ createdBy: 1 });

export const PolicyVersionModel = mongoose.model<IPolicyVersion>(
  'PolicyVersion',
  PolicyVersionSchema
);
