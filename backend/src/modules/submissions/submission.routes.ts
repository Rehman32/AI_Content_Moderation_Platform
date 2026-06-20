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

/**
 * @swagger
 * tags:
 *   name: Submissions
 *   description: Submission and image upload management
 */

router.use(protect);

/**
 * @swagger
 * /api/v1/submissions:
 *   get:
 *     summary: List submissions
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of submissions
 */
router.get('/', validate(getSubmissionsSchema), submissionController.list);

/**
 * @swagger
 * /api/v1/submissions:
 *   post:
 *     summary: Create a new submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: Submission created successfully
 */
router.post('/', validate(createSubmissionSchema), submissionController.create);

/**
 * @swagger
 * /api/v1/submissions/{submissionId}:
 *   get:
 *     summary: Get a single submission by ID
 *     tags: [Submissions]
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
 *         description: Submission details including images
 */
router.get('/:submissionId', validate(getSubmissionByIdSchema), submissionController.getById);

/**
 * @swagger
 * /api/v1/submissions/{submissionId}/images:
 *   post:
 *     summary: Upload images to a submission
 *     tags: [Submissions]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 */
router.post(
  '/:submissionId/images',
  upload.array('images', 10),
  validate(uploadImagesSchema),
  submissionController.uploadImages
);

/**
 * @swagger
 * /api/v1/submissions/{submissionId}/images:
 *   get:
 *     summary: Get all images for a submission
 *     tags: [Submissions]
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
 *         description: List of images
 */
router.get('/:submissionId/images', validate(getSubmissionByIdSchema), submissionController.getImages);

export default router;
