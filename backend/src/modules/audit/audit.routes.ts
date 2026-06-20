import { Router } from 'express';
import { AuditController } from './audit.controller';
import { protect } from '../../middleware/auth.middleware';
import { restrictTo } from '../../middleware/role.middleware';
import { UserRole } from '../users/user.interface';

const router = Router();
const auditController = new AuditController();

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Immutable system history and event logging
 */

router.use(protect);
router.use(restrictTo(UserRole.ADMIN));

/**
 * @swagger
 * /api/v1/audit:
 *   get:
 *     summary: Get paginated audit logs with filters
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated audit logs
 */
router.get('/', auditController.queryLogs);

/**
 * @swagger
 * /api/v1/audit/{entityType}/{entityId}:
 *   get:
 *     summary: Get full history for a specific entity
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Entity history
 */
router.get('/:entityType/:entityId', auditController.getEntityHistory);

export default router;
