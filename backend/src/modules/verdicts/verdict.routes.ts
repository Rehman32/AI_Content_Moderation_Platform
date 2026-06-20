import { Router } from 'express';
import { VerdictController } from './verdict.controller';
import { protect } from '../../middleware/auth.middleware';
import { restrictTo } from '../../middleware/role.middleware';
import { UserRole } from '../users/user.interface';

const router = Router();
const verdictController = new VerdictController();

/**
 * @swagger
 * tags:
 *   name: Verdicts
 *   description: Moderation verdicts based on AI output and policies
 */

router.use(protect);

/**
 * @swagger
 * /api/v1/verdicts:
 *   get:
 *     summary: List all verdicts
 *     tags: [Verdicts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of verdicts
 */
router.get('/', verdictController.list);

/**
 * @swagger
 * /api/v1/verdicts/{verdictId}:
 *   get:
 *     summary: Get a specific verdict
 *     tags: [Verdicts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: verdictId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verdict details
 */
router.get('/:verdictId', verdictController.getById);

/**
 * @swagger
 * /api/v1/verdicts/images/{imageId}:
 *   get:
 *     summary: Get the latest verdict for an image
 *     tags: [Verdicts]
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
 *         description: Verdict details
 */
router.get('/images/:imageId', verdictController.getByImageId);

/**
 * @swagger
 * /api/v1/verdicts/submissions/{submissionId}:
 *   get:
 *     summary: Get all verdicts for a submission
 *     tags: [Verdicts]
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
 *         description: List of verdicts for submission
 */
router.get('/submissions/:submissionId', verdictController.getBySubmissionId);

/**
 * @swagger
 * /api/v1/verdicts/images/{imageId}:
 *   post:
 *     summary: Generate verdict for a single image
 *     tags: [Verdicts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Verdict generated
 */
router.post(
  '/images/:imageId',
  restrictTo(UserRole.ADMIN),
  verdictController.generateForImage
);

/**
 * @swagger
 * /api/v1/verdicts/submissions/{submissionId}:
 *   post:
 *     summary: Generate verdicts for an entire submission batch
 *     tags: [Verdicts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Verdicts generated
 */
router.post(
  '/submissions/:submissionId',
  restrictTo(UserRole.ADMIN),
  verdictController.generateForSubmission
);

export default router;
