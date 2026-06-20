import { Router } from 'express';
import { ModerationController } from './moderation.controller';
import { OrchestratorController } from './orchestrator.controller';
import { protect } from '../../middleware/auth.middleware';
import { restrictTo } from '../../middleware/role.middleware';
import { UserRole } from '../users/user.interface';

const router = Router();
const moderationController = new ModerationController();
const orchestratorController = new OrchestratorController();

/**
 * @swagger
 * tags:
 *   name: Moderation
 *   description: AI Analysis and Pipeline Orchestration
 */

router.use(protect);

/**
 * @swagger
 * /api/v1/moderation/images/{imageId}/analyze:
 *   post:
 *     summary: Trigger raw AI analysis for a single image
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: AI analysis complete
 */
router.post(
  '/images/:imageId/analyze',
  restrictTo(UserRole.ADMIN),
  moderationController.analyzeImage
);

/**
 * @swagger
 * /api/v1/moderation/images/{imageId}/result:
 *   get:
 *     summary: Retrieve stored moderation result for an image
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Moderation result
 */
router.get(
  '/images/:imageId/result',
  moderationController.getResult
);

/**
 * @swagger
 * /api/v1/moderation/images/{imageId}/process:
 *   post:
 *     summary: Run full moderation pipeline for an image
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pipeline executed successfully
 */
router.post(
  '/images/:imageId/process',
  restrictTo(UserRole.ADMIN),
  orchestratorController.processImage
);

/**
 * @swagger
 * /api/v1/moderation/submissions/{submissionId}/analyze:
 *   post:
 *     summary: Trigger batch AI analysis for a submission
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Batch analysis complete
 */
router.post(
  '/submissions/:submissionId/analyze',
  restrictTo(UserRole.ADMIN),
  moderationController.analyzeSubmission
);

/**
 * @swagger
 * /api/v1/moderation/submissions/{submissionId}/process:
 *   post:
 *     summary: Run full moderation pipeline for an entire submission
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pipeline executed for all images
 */
router.post(
  '/submissions/:submissionId/process',
  restrictTo(UserRole.ADMIN),
  orchestratorController.processSubmission
);

export default router;

