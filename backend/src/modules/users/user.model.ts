import mongoose, { Schema } from 'mongoose';
import bcryptjs from 'bcryptjs';
import { IUser, UserRole } from './user.interface';

const UserSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Exclude password from query results by default
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash passwords
UserSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;

  const salt = await bcryptjs.genSalt(10);
  this.passwordHash = await bcryptjs.hash(this.passwordHash, salt);
});

// Instance method to check passwords
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcryptjs.compare(password, this.passwordHash);
};

export const UserModel = mongoose.model<IUser>('User', UserSchema);
