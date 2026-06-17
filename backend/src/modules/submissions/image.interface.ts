import { Document, Types } from 'mongoose';

/**
 * Processing status for an individual image within a submission.
 *
 * PENDING    → Uploaded, awaiting AI analysis.
 * PROCESSING → Currently being analyzed by the AI moderation service.
 * COMPLETED  → Analysis done, verdict available.
 * FAILED     → Analysis failed (e.g. corrupt file, AI timeout).
 */
export enum ImageStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * Metadata about the uploaded file.
 * Kept as a sub-object for clean separation from domain fields.
 * Every field here maps 1:1 to what Multer provides, making
 * future migration to S3 a matter of swapping the storage engine
 * and populating these same fields from the S3 response.
 */
export interface IImageMeta {
  originalName: string;
  mimeType: string;
  size: number;           // bytes
  storagePath: string;    // local: relative path | S3: object key
  storageType: 'LOCAL' | 'S3';
}

/**
 * A single image document.
 *
 * ARCHITECTURAL DECISION — submissionId in Image vs imageIds[] in Submission:
 *
 * In MongoDB, unbounded arrays are an anti-pattern. A submission can have
 * 1–50+ images. Storing imageIds[] inside Submission means:
 *  1. The Submission document grows with every upload (write amplification).
 *  2. Concurrent uploads cause $push race conditions.
 *  3. Querying "all images for submission X" requires fetching the
 *     Submission first, then a second query with $in on the IDs.
 *
 * By placing submissionId on Image:
 *  1. Image.find({ submissionId }) is a single indexed query — O(log n).
 *  2. Each upload is an independent insert (no contention on Submission doc).
 *  3. The Submission document stays small and fixed-size.
 *  4. Pagination of images per submission is trivial with skip/limit.
 */
export interface IImage extends Document {
  submissionId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  status: ImageStatus;
  meta: IImageMeta;
  createdAt: Date;
  updatedAt: Date;
}
