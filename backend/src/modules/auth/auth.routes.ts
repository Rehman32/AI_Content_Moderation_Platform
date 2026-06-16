import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { registerSchema, loginSchema } from './auth.validation';
import { protect } from '../../middleware/auth.middleware';
import { restrictTo } from '../../middleware/role.middleware';
import { UserRole } from '../users/user.interface';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Protected routes
router.use(protect);

router.get('/me', authController.getMe);

// Example admin-only route
router.get('/admin-only', restrictTo(UserRole.ADMIN), (req, res) => {
  res.status(200).json({ success: true, message: 'Welcome Admin!' });
});

export default router;
