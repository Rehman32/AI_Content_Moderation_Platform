import mongoose, { Schema } from 'mongoose';
import { IAppeal, AppealStatus } from './appeal.interface';

/**
 * Sub-schema for the verdict snapshot embedded on the appeal.
 * Stored without _id — it is not an independent document.
 */
const VerdictSnapshotSchema = new Schema(
  {
    verdictId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    finalOutcome: {
      type: String,
      required: true,
    },
    reasoning: {
      type: String,
      required: true,
    },
    policyVersionNumber: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

/**
 * Appeal schema.
 *
 * INDEXING STRATEGY:
 *  - { submissionId: 1, status: 1 } — Hottest query: "does this submission have
 *    an open appeal?" Partial compound index makes duplicate-prevention O(1).
 *  - { appellantId: 1, createdAt: -1 } — User's appeal history, paginated.
 *  - { status: 1, createdAt: 1 } — Admin review queue ordered by arrival time
 *    (oldest first = FIFO fairness).
 *
 * UNIQUE CONSTRAINT:
 *  A submission can only have ONE active (non-terminal) appeal at a time.
 *  This is enforced by the service layer (business rule) rather than a DB
 *  unique index, because uniqueness depends on status (PENDING | UNDER_REVIEW),
 *  not on the submissionId alone. A sparse partial index cannot express
 *  "unique where status IN [...]" in MongoDB.
 *
 *  The service guard is the authoritative enforcement point.
 */
const AppealSchema = new Schema<IAppeal>(
  {
    submissionId: {
      type: Schema.Types.ObjectId,
      ref: 'Submission',
      required: [true, 'Submission reference is required'],
    },
    appellantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Appellant reference is required'],
    },
    verdictSnapshot: {
      type: VerdictSnapshotSchema,
      required: [true, 'Verdict snapshot is required'],
    },
    reason: {
      type: String,
      required: [true, 'Appeal reason is required'],
      trim: true,
      minlength: [20, 'Appeal reason must be at least 20 characters'],
      maxlength: [2000, 'Appeal reason cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(AppealStatus),
      default: AppealStatus.PENDING,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Admin notes cannot exceed 2000 characters'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
AppealSchema.index({ submissionId: 1, status: 1 });
AppealSchema.index({ appellantId: 1, createdAt: -1 });
AppealSchema.index({ status: 1, createdAt: 1 });

export const AppealModel = mongoose.model<IAppeal>('Appeal', AppealSchema);
