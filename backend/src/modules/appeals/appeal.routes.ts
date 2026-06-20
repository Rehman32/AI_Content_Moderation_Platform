import { Router } from 'express';
import { AppealController } from './appeal.controller';
import { protect } from '../../middleware/auth.middleware';
import { restrictTo } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createAppealSchema, reviewAppealSchema } from './appeal.validation';
import { UserRole } from '../users/user.interface';

const router = Router();
const appealController = new AppealController();

/**
 * @swagger
 * tags:
 *   name: Appeals
 *   description: Appeals management for moderation decisions
 */

router.use(protect);

/**
 * @swagger
 * /api/v1/appeals:
 *   get:
 *     summary: List all appeals (Admin queue)
 *     tags: [Appeals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of appeals
 */
router.get(
  '/',
  restrictTo(UserRole.ADMIN),
  appealController.list
);

/**
 * @swagger
 * /api/v1/appeals/{appealId}:
 *   get:
 *     summary: Get a single appeal
 *     tags: [Appeals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appealId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appeal details
 */
router.get(
  '/:appealId',
  appealController.getById
);

/**
 * @swagger
 * /api/v1/appeals/submissions/{submissionId}:
 *   get:
 *     summary: Get all appeals for a submission
 *     tags: [Appeals]
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
 *         description: List of appeals
 */
router.get(
  '/submissions/:submissionId',
  appealController.getBySubmission
);

/**
 * @swagger
 * /api/v1/appeals/submissions/{submissionId}:
 *   post:
 *     summary: File an appeal for a submission
 *     tags: [Appeals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Appeal created
 */
router.post(
  '/submissions/:submissionId',
  validate(createAppealSchema),
  appealController.createAppeal
);

/**
 * @swagger
 * /api/v1/appeals/{appealId}/review:
 *   patch:
 *     summary: Mark an appeal as under review
 *     tags: [Appeals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appealId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appeal marked under review
 */
router.patch(
  '/:appealId/review',
  restrictTo(UserRole.ADMIN),
  appealController.markUnderReview
);

/**
 * @swagger
 * /api/v1/appeals/{appealId}/approve:
 *   patch:
 *     summary: Approve an appeal
 *     tags: [Appeals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appealId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appeal approved
 */
router.patch(
  '/:appealId/approve',
  restrictTo(UserRole.ADMIN),
  validate(reviewAppealSchema),
  appealController.approveAppeal
);

/**
 * @swagger
 * /api/v1/appeals/{appealId}/reject:
 *   patch:
 *     summary: Reject an appeal
 *     tags: [Appeals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appealId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appeal rejected
 */
router.patch(
  '/:appealId/reject',
  restrictTo(UserRole.ADMIN),
  validate(reviewAppealSchema),
  appealController.rejectAppeal
);

export default router;
