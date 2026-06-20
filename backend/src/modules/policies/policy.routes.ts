import { Router } from 'express';
import { PolicyController } from './policy.controller';
import { validate } from '../../middleware/validate.middleware';
import {
  createPolicyVersionSchema,
  activatePolicyVersionSchema,
  getPolicyByIdSchema,
  deletePolicyVersionSchema,
  getPolicyHistorySchema,
} from './policy.validation';
import { protect } from '../../middleware/auth.middleware';
import { restrictTo } from '../../middleware/role.middleware';
import { UserRole } from '../users/user.interface';

const router = Router();
const policyController = new PolicyController();

/**
 * @swagger
 * tags:
 *   name: Policies
 *   description: Moderation policy management and versioning
 */

router.use(protect);

/**
 * @swagger
 * /api/v1/policies/active:
 *   get:
 *     summary: Get the currently active policy version
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active policy returned
 */
router.get('/active', policyController.getActive);

/**
 * @swagger
 * /api/v1/policies/history:
 *   get:
 *     summary: Get all policy versions
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of policy versions
 */
router.get('/history', validate(getPolicyHistorySchema), policyController.getHistory);

/**
 * @swagger
 * /api/v1/policies/{versionId}:
 *   get:
 *     summary: Get a policy by its ID
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Policy details
 */
router.get('/:versionId', validate(getPolicyByIdSchema), policyController.getById);

/**
 * @swagger
 * /api/v1/policies:
 *   post:
 *     summary: Create a new policy version
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               rules:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     category:
 *                       type: string
 *                     threshold:
 *                       type: number
 *                     action:
 *                       type: string
 *                       enum: [BLOCK, FLAG_FOR_REVIEW]
 *     responses:
 *       201:
 *         description: Policy version created
 */
router.post('/', restrictTo(UserRole.ADMIN), validate(createPolicyVersionSchema), policyController.createVersion);

/**
 * @swagger
 * /api/v1/policies/{versionId}/activate:
 *   patch:
 *     summary: Activate a specific policy version
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Policy activated
 */
router.patch('/:versionId/activate', restrictTo(UserRole.ADMIN), validate(activatePolicyVersionSchema), policyController.activate);

/**
 * @swagger
 * /api/v1/policies/{versionId}:
 *   delete:
 *     summary: Soft delete a policy version
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Policy softly deleted
 */
router.delete('/:versionId', restrictTo(UserRole.ADMIN), validate(deletePolicyVersionSchema), policyController.softDelete);

export default router;
