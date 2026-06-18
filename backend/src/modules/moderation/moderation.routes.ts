import { Router } from 'express';
import { ModerationController } from './moderation.controller';
import { OrchestratorController } from './orchestrator.controller';
import { protect } from '../../middleware/auth.middleware';
import { restrictTo } from '../../middleware/role.middleware';
import { UserRole } from '../users/user.interface';

const router = Router();
const moderationController = new ModerationController();
const orchestratorController = new OrchestratorController();

// All moderation routes require authentication
router.use(protect);

// ─── Image-Level: Raw AI Analysis (step 1 only) ──────────────────────────────

// Trigger AI analysis for a single image — AI output only, no verdict
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

// ─── Image-Level: Full Pipeline Orchestration ────────────────────────────────

// Run the full pipeline: AI Analysis → Policy Evaluation → Verdict → Status Update
router.post(
  '/images/:imageId/process',
  restrictTo(UserRole.ADMIN),
  orchestratorController.processImage
);

// ─── Submission-Level: Raw Batch AI Analysis ─────────────────────────────────

// Trigger batch AI analysis for all pending images (no verdict generation)
router.post(
  '/submissions/:submissionId/analyze',
  restrictTo(UserRole.ADMIN),
  moderationController.analyzeSubmission
);

// ─── Submission-Level: Full Pipeline Orchestration ───────────────────────────

// Run the full pipeline for every processable image in a submission
router.post(
  '/submissions/:submissionId/process',
  restrictTo(UserRole.ADMIN),
  orchestratorController.processSubmission
);

export default router;

