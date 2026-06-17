import { Router } from 'express';
import { ModerationController } from './moderation.controller';
import { protect } from '../../middleware/auth.middleware';
import { restrictTo } from '../../middleware/role.middleware';
import { UserRole } from '../users/user.interface';

const router = Router();
const moderationController = new ModerationController();

// All moderation routes require authentication
router.use(protect);

// ─── Image-Level Moderation ─────────────────────────────────────────────────

// Trigger analysis for a single image (ADMIN only)
router.post(
  '/images/:imageId/analyze',
  restrictTo(UserRole.ADMIN),
  moderationController.analyzeImage
);

// Retrieve stored moderation result for a single image (any authenticated user)
router.get(
  '/images/:imageId/result',
  moderationController.getResult
);

// ─── Submission-Level Moderation ────────────────────────────────────────────

// Trigger batch analysis for all pending images in a submission (ADMIN only)
router.post(
  '/submissions/:submissionId/analyze',
  restrictTo(UserRole.ADMIN),
  moderationController.analyzeSubmission
);

export default router;
