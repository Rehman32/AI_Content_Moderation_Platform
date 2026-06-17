import { UserModel } from '../users/user.model';
import { AppError } from '../../utils/AppError';
import { generateToken } from '../../utils/jwt';

export class AuthService {
  public async registerUser(data: any) {
    const existingUser = await UserModel.findOne({ email: data.email });
    if (existingUser) {
      throw new AppError('Email is already registered', 400);
    }

    const user = await UserModel.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash: data.password, // Hook handles hashing
    });

    const token = generateToken(user._id.toString(), user.role);

    const userResponse = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { user: userResponse, token };
  }

  public async loginUser(email: string, password: string) {
    const user = await UserModel.findOne({ email }).select('+passwordHash');
    
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('User account is deactivated', 403);
    }

    const token = generateToken(user._id.toString(), user.role);

    const userResponse = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { user: userResponse, token };
  }
}
