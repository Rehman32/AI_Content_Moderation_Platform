import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { protect } from '../../middleware/auth.middleware';
import { restrictTo } from '../../middleware/role.middleware';
import { UserRole } from '../users/user.interface';

const router = Router();
const analyticsController = new AnalyticsController();

// All analytics are sensitive platform data — admin only
router.use(protect);
router.use(restrictTo(UserRole.ADMIN));

// Platform KPI dashboard
router.get('/dashboard', analyticsController.getDashboard);

// Daily moderation volume trends (?days=30)
router.get('/trends', analyticsController.getTrends);

// Most triggered content categories
router.get('/categories', analyticsController.getCategories);

// Appeal statistics and resolution metrics
router.get('/appeals', analyticsController.getAppeals);

export default router;
