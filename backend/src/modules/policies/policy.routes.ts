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

// All policy routes require authentication
router.use(protect);

// ─── Read Routes (USER + ADMIN) ────────────────────────────────────────────
router.get(
  '/active',
  policyController.getActive
);

router.get(
  '/history',
  validate(getPolicyHistorySchema),
  policyController.getHistory
);

router.get(
  '/:versionId',
  validate(getPolicyByIdSchema),
  policyController.getById
);

// ─── Write Routes (ADMIN only) ─────────────────────────────────────────────
router.post(
  '/',
  restrictTo(UserRole.ADMIN),
  validate(createPolicyVersionSchema),
  policyController.createVersion
);

router.patch(
  '/:versionId/activate',
  restrictTo(UserRole.ADMIN),
  validate(activatePolicyVersionSchema),
  policyController.activate
);

router.delete(
  '/:versionId',
  restrictTo(UserRole.ADMIN),
  validate(deletePolicyVersionSchema),
  policyController.softDelete
);

export default router;
