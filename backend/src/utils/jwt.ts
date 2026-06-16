import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

export const generateToken = (userId: Types.ObjectId | string, role: string): string => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

  return jwt.sign({ id: userId, role }, secret, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
};
