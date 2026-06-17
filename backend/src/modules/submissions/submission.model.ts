import mongoose, { Schema } from 'mongoose';
import { ISubmission, SubmissionStatus } from './submission.interface';

const SubmissionSchema = new Schema<ISubmission>(
  {
    title: {
      type: String,
      required: [true, 'Submission title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Submitter information is required'],
    },
    status: {
      type: String,
      enum: Object.values(SubmissionStatus),
      default: SubmissionStatus.PENDING,
    },
    imageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
// Primary access pattern: "my submissions" — every user's dashboard query.
SubmissionSchema.index({ submittedBy: 1, createdAt: -1 });

// Admin queue: "all pending submissions" sorted by oldest first.
SubmissionSchema.index({ status: 1, createdAt: 1 });

export const SubmissionModel = mongoose.model<ISubmission>(
  'Submission',
  SubmissionSchema
);
