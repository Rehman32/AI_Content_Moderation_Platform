import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { protect } from '../../middleware/auth.middleware';
import { restrictTo } from '../../middleware/role.middleware';
import { UserRole } from '../users/user.interface';

const router = Router();
const analyticsController = new AnalyticsController();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Platform KPIs and Reporting
 */

router.use(protect);
router.use(restrictTo(UserRole.ADMIN));

/**
 * @swagger
 * /api/v1/analytics/dashboard:
 *   get:
 *     summary: Get platform KPI dashboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics
 */
router.get('/dashboard', analyticsController.getDashboard);

/**
 * @swagger
 * /api/v1/analytics/trends:
 *   get:
 *     summary: Get daily moderation volume trends
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         required: false
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Trends report
 */
router.get('/trends', analyticsController.getTrends);

/**
 * @swagger
 * /api/v1/analytics/categories:
 *   get:
 *     summary: Get most triggered content categories
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category stats
 */
router.get('/categories', analyticsController.getCategories);

/**
 * @swagger
 * /api/v1/analytics/appeals:
 *   get:
 *     summary: Get appeal statistics and resolution metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Appeal analytics
 */
router.get('/appeals', analyticsController.getAppeals);

export default router;
