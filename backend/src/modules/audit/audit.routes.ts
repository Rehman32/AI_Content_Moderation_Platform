import { Router } from 'express';
import { AuditController } from './audit.controller';
import { protect } from '../../middleware/auth.middleware';
import { restrictTo } from '../../middleware/role.middleware';
import { UserRole } from '../users/user.interface';

const router = Router();
const auditController = new AuditController();

// Audit logs are highly sensitive — strictly ADMIN only
router.use(protect);
router.use(restrictTo(UserRole.ADMIN));

// Get paginated audit logs with filters
router.get('/', auditController.queryLogs);

// Get full history for a specific entity
router.get('/:entityType/:entityId', auditController.getEntityHistory);

export default router;
