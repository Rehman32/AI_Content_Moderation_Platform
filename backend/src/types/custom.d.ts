import { UserRole } from '../modules/users/user.interface';

declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: string;
        role: UserRole | string;
      };
    }
  }
}
