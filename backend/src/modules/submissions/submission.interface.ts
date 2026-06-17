import { Document, Types } from 'mongoose';

/**
 * Submission status lifecycle.
 *
 * PENDING   → Just created, awaiting moderation.
 * REVIEWING → Moderation in progress (images being analyzed).
 * COMPLETED → All images moderated, final verdict issued.
 * REJECTED  → Submission rejected after moderation.
 */
export enum SubmissionStatus {
  PENDING = 'PENDING',
  REVIEWING = 'REVIEWING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export interface ISubmission extends Document {
  title: string;
  description: string;
  submittedBy: Types.ObjectId;
  status: SubmissionStatus;
  imageCount: number;       // Denormalized counter for fast reads
  createdAt: Date;
  updatedAt: Date;
}
