import { SubmissionModel } from './submission.model';
import { ImageModel } from './image.model';
import { AppError } from '../../utils/AppError';
import { SubmissionStatus } from './submission.interface';
import { ImageStatus } from './image.interface';
import path from 'path';
import fs from 'fs';
import { auditService } from '../audit/audit.service';
import { AuditEventType, EntityType } from '../audit/audit.interface';
import { UserRole } from '../users/user.interface';

interface CreateSubmissionInput {
  title: string;
  description?: string;
  submittedBy: string;
}

interface PaginationOptions {
  page: number;
  limit: number;
  status?: string;
  userId?: string; // When set, scopes to a single user's submissions
}

export class SubmissionService {
  /**
   * Create a new submission (no images yet).
   *
   * DESIGN DECISION — Two-step flow (create submission → upload images):
   * This decouples the metadata creation from the file upload, which:
   *  1. Keeps the create endpoint simple and fast (no multipart parsing).
   *  2. Allows the frontend to show a submission form first, then an
   *     upload dropzone — standard UX pattern.
   *  3. Makes retry logic simpler: if uploads fail, the submission
   *     already exists and uploads can be retried independently.
   */
  public async createSubmission(data: CreateSubmissionInput) {
    const submission = await SubmissionModel.create({
      title: data.title,
      description: data.description || '',
      submittedBy: data.submittedBy,
    });

    await auditService.logEvent({
      actorId: data.submittedBy,
      actorRole: UserRole.USER, // Assuming generic USER, platform implies anyone can submit
      eventType: AuditEventType.SUBMISSION_CREATED,
      entityType: EntityType.SUBMISSION,
      entityId: submission._id,
      newState: { title: submission.title, status: submission.status },
    });

    return submission;
  }

  /**
   * Process uploaded files and create Image documents.
   *
   * BUSINESS RULES:
   *  - Submission must exist and belong to the uploading user.
   *  - Submission must be in PENDING status (no uploads to completed submissions).
   *  - At least one file must be provided.
   *  - imageCount on Submission is atomically incremented via $inc.
   *
   * ATOMIC COUNTER:
   *  $inc is used instead of count-then-set to prevent race conditions
   *  when multiple upload requests hit the same submission concurrently.
   */
  public async uploadImages(
    submissionId: string,
    userId: string,
    files: Express.Multer.File[]
  ) {
    const submission = await SubmissionModel.findById(submissionId);

    if (!submission) {
      // Clean up uploaded files since the submission doesn't exist
      this.cleanupFiles(files);
      throw new AppError('Submission not found', 404);
    }

    // Ownership check: users can only upload to their own submissions
    if (submission.submittedBy.toString() !== userId) {
      this.cleanupFiles(files);
      throw new AppError('You can only upload images to your own submissions', 403);
    }

    // Status guard: no uploads to completed/rejected submissions
    if (submission.status !== SubmissionStatus.PENDING) {
      this.cleanupFiles(files);
      throw new AppError(
        `Cannot upload images to a submission with status: ${submission.status}`,
        400
      );
    }

    if (!files || files.length === 0) {
      throw new AppError('At least one image file is required', 400);
    }

    // Create Image documents for each uploaded file
    const imageDocuments = files.map((file) => ({
      submissionId: submission._id,
      uploadedBy: userId,
      status: ImageStatus.PENDING,
      meta: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath: path.relative(process.cwd(), file.path),
        storageType: 'LOCAL' as const,
      },
    }));

    const images = await ImageModel.insertMany(imageDocuments);

    // Atomically increment imageCount
    await SubmissionModel.findByIdAndUpdate(submissionId, {
      $inc: { imageCount: files.length },
    });

    await auditService.logEvent({
      actorId: userId,
      actorRole: UserRole.USER,
      eventType: AuditEventType.IMAGES_UPLOADED,
      entityType: EntityType.SUBMISSION,
      entityId: submission._id,
      metadata: { uploadedCount: files.length, fileNames: files.map((f) => f.originalname) },
    });

    return images;
  }

  /**
   * Get a submission by ID, including its images.
   *
   * Returns the submission with a virtual `images` array populated
   * via a separate query. This is the standard MongoDB pattern for
   * parent-child relationships without embedding.
   */
  public async getSubmissionById(submissionId: string, userId?: string) {
    const submission = await SubmissionModel.findById(submissionId)
      .populate('submittedBy', 'firstName lastName email');

    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    const images = await ImageModel.find({ submissionId })
      .sort({ createdAt: 1 });

    return { submission, images };
  }

  /**
   * Get a user's submissions with pagination.
   * Admins can see all submissions; regular users only see their own.
   */
  public async getSubmissions(options: PaginationOptions) {
    const { page, limit, status, userId } = options;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (userId) {
      filter.submittedBy = userId;
    }
    if (status && Object.values(SubmissionStatus).includes(status as SubmissionStatus)) {
      filter.status = status;
    }

    const [submissions, total] = await Promise.all([
      SubmissionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('submittedBy', 'firstName lastName email'),
      SubmissionModel.countDocuments(filter),
    ]);

    return {
      submissions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all images for a specific submission.
   */
  public async getSubmissionImages(submissionId: string) {
    const submission = await SubmissionModel.findById(submissionId);

    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    const images = await ImageModel.find({ submissionId })
      .sort({ createdAt: 1 });

    return images;
  }

  /**
   * Cleanup orphaned files from disk when a business rule rejects the upload.
   * Called before throwing errors to prevent storage leaks.
   */
  private cleanupFiles(files: Express.Multer.File[]) {
    for (const file of files) {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch {
        // Log but don't throw — cleanup failure shouldn't mask the real error
        console.error(`Failed to cleanup file: ${file.path}`);
      }
    }
  }
}
