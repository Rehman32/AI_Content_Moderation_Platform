import mongoose from 'mongoose';
import { UserModel as User } from '../modules/users/user.model';
import { UserRole } from '../modules/users/user.interface';
import { env } from '../config/env.config';

const seedAdmin = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const adminEmail = env.ADMIN_EMAIL;
    const adminPassword = env.ADMIN_PASSWORD;

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log(`⚠️ Admin user with email ${adminEmail} already exists. Skipping seed.`);
      process.exit(0);
    }

    console.log(`🌱 Seeding initial admin account: ${adminEmail}...`);
    
    await User.create({
      firstName: 'System',
      lastName: 'Admin',
      email: adminEmail,
      passwordHash: adminPassword, // Pre-save hook hashes it automatically
      role: UserRole.ADMIN,
    });

    console.log('✅ Admin account seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
