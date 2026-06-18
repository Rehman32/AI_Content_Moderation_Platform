import { Router } from 'express';
import { AppealController } from './appeal.controller';
import { protect } from '../../middleware/auth.middleware';
import { restrictTo } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createAppealSchema, reviewAppealSchema } from './appeal.validation';
import { UserRole } from '../users/user.interface';

const router = Router();
const appealController = new AppealController();

// All appeal routes require authentication
router.use(protect);

// ─── Read Routes (authenticated users — service layer enforces ownership) ─────

// Admin review queue — list all appeals with optional status filter
router.get(
  '/',
  restrictTo(UserRole.ADMIN),
  appealController.list
);

// Get a single appeal (ownership check in service)
router.get(
  '/:appealId',
  appealController.getById
);

// Get all appeals for a specific submission (ownership check in service)
router.get(
  '/submissions/:submissionId',
  appealController.getBySubmission
);

// ─── Write Routes (authenticated user creates) ────────────────────────────────

// File an appeal for a submission (user must own the submission)
router.post(
  '/submissions/:submissionId',
  validate(createAppealSchema),
  appealController.createAppeal
);

// ─── Admin Review Routes ──────────────────────────────────────────────────────

// Triage: mark appeal as under review
router.patch(
  '/:appealId/review',
  restrictTo(UserRole.ADMIN),
  appealController.markUnderReview
);

// Approve appeal (overrides verdict, non-destructive)
router.patch(
  '/:appealId/approve',
  restrictTo(UserRole.ADMIN),
  validate(reviewAppealSchema),
  appealController.approveAppeal
);

// Reject appeal (original verdict stands)
router.patch(
  '/:appealId/reject',
  restrictTo(UserRole.ADMIN),
  validate(reviewAppealSchema),
  appealController.rejectAppeal
);

export default router;
