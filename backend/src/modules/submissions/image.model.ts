import mongoose, { Schema } from 'mongoose';
import { IImage, ImageStatus } from './image.interface';

const ImageMetaSchema = new Schema(
  {
    originalName: {
      type: String,
      required: [true, 'Original file name is required'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
    },
    storagePath: {
      type: String,
      required: [true, 'Storage path is required'],
    },
    storageType: {
      type: String,
      enum: ['LOCAL', 'S3'],
      default: 'LOCAL',
    },
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

const ModerationResultSchema = new Schema(
  {
    safe: { type: Boolean, required: true },
    overallRisk: { type: Number, required: true },
    categories: { type: [CategoryResultSchema], default: [] },
    analyzedAt: { type: Date, required: true },
    providerName: { type: String, required: true },
    modelVersion: { type: String, required: true },
    processingTimeMs: { type: Number, required: true },
  },
  { _id: false }
);

const ImageSchema = new Schema<IImage>(
  {
    submissionId: {
      type: Schema.Types.ObjectId,
      ref: 'Submission',
      required: [true, 'Submission reference is required'],
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader information is required'],
    },
    status: {
      type: String,
      enum: Object.values(ImageStatus),
      default: ImageStatus.PENDING,
    },
    meta: {
      type: ImageMetaSchema,
      required: [true, 'Image metadata is required'],
    },
    moderationResult: {
      type: ModerationResultSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
// Hot path: "all images for submission X" — fires every time a submission detail is loaded.
ImageSchema.index({ submissionId: 1, createdAt: 1 });

// Moderation pipeline: "all images pending analysis".
ImageSchema.index({ status: 1 });

export const ImageModel = mongoose.model<IImage>('Image', ImageSchema);
