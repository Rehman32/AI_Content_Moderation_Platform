import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { AppError } from '../../utils/AppError';
import { UserModel } from '../users/user.model';

const authService = new AuthService();

export class AuthController {
  public async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, token } = await authService.registerUser(req.body);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user },
        token,
      });
    } catch (error) {
      next(error);
    }
  }

  public async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      const { user, token } = await authService.loginUser(email, password);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { user },
        token,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new AppError('Not authenticated', 401));
      }

      const user = await UserModel.findById(req.user.id);

      if (!user) {
        return next(new AppError('User no longer exists', 404));
      }

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}
