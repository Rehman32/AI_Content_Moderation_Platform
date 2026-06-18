import { Router } from 'express';
import { VerdictController } from './verdict.controller';
import { protect } from '../../middleware/auth.middleware';
import { restrictTo } from '../../middleware/role.middleware';
import { UserRole } from '../users/user.interface';

const router = Router();
const verdictController = new VerdictController();

// All verdict routes require authentication
router.use(protect);

// ─── Read Routes (any authenticated user) ──────────────────────────────────

// List all verdicts (paginated, filterable by outcome/submissionId)
router.get(
  '/',
  verdictController.list
);

// Get a specific verdict by its ID
router.get(
  '/:verdictId',
  verdictController.getById
);

// Get the latest verdict for a specific image
router.get(
  '/images/:imageId',
  verdictController.getByImageId
);

// Get all verdicts for a submission
router.get(
  '/submissions/:submissionId',
  verdictController.getBySubmissionId
);

// ─── Write Routes (ADMIN only) ──────────────────────────────────────────────

// Generate verdict for a single image (requires prior AI moderation)
router.post(
  '/images/:imageId',
  restrictTo(UserRole.ADMIN),
  verdictController.generateForImage
);

// Generate verdicts for an entire submission batch
router.post(
  '/submissions/:submissionId',
  restrictTo(UserRole.ADMIN),
  verdictController.generateForSubmission
);

export default router;
