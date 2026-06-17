import { Router } from 'express';
import { SubmissionController } from './submission.controller';
import { validate } from '../../middleware/validate.middleware';
import {
  createSubmissionSchema,
  getSubmissionByIdSchema,
  uploadImagesSchema,
  getSubmissionsSchema,
} from './submission.validation';
import { protect } from '../../middleware/auth.middleware';
import { upload } from '../../config/multer';

const router = Router();
const submissionController = new SubmissionController();

// All submission routes require authentication
router.use(protect);

// ─── Submission CRUD ────────────────────────────────────────────────────────

// List submissions (user sees own, admin sees all)
router.get(
  '/',
  validate(getSubmissionsSchema),
  submissionController.list
);

// Create a new submission
router.post(
  '/',
  validate(createSubmissionSchema),
  submissionController.create
);

// Get a single submission with its images
router.get(
  '/:submissionId',
  validate(getSubmissionByIdSchema),
  submissionController.getById
);

// ─── Image Upload & Retrieval ───────────────────────────────────────────────

// Upload images to an existing submission
// Multer middleware runs BEFORE validation — it must parse the multipart
// body before Zod can validate the params.
router.post(
  '/:submissionId/images',
  upload.array('images', 10),
  validate(uploadImagesSchema),
  submissionController.uploadImages
);

// Get all images for a submission
router.get(
  '/:submissionId/images',
  validate(getSubmissionByIdSchema),
  submissionController.getImages
);

export default router;
