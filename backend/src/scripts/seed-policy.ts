import mongoose from 'mongoose';
import { PolicyVersionModel as PolicyVersion } from '../modules/policies/policy.model';
import { UserModel as User } from '../modules/users/user.model';
import { UserRole } from '../modules/users/user.interface';
import { ContentCategory, Severity, ModerationAction } from '../modules/policies/policy.interface';
import { env } from '../config/env.config';

const seedPolicy = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Ensure there is an admin to attribute the policy creation to
    const adminEmail = env.ADMIN_EMAIL;
    const adminUser = await User.findOne({ email: adminEmail, role: UserRole.ADMIN });

    if (!adminUser) {
      console.error(`❌ Admin user ${adminEmail} not found. Please run seed-admin.ts first.`);
      process.exit(1);
    }

    // Check if any active policy already exists
    const activePolicy = await PolicyVersion.findOne({ isActive: true });
    
    if (activePolicy) {
      console.log('⚠️ An active policy already exists. Skipping policy seed.');
      process.exit(0);
    }

    console.log('🌱 Seeding default moderation policy...');

    // Standard Default Policy
    const defaultRules = [
      { category: ContentCategory.HATE_SPEECH, enabled: true, severity: Severity.HIGH, action: ModerationAction.REJECT, confidenceThreshold: 0.8, description: '' },
      { category: ContentCategory.HARASSMENT, enabled: true, severity: Severity.HIGH, action: ModerationAction.REJECT, confidenceThreshold: 0.8, description: '' },
      { category: ContentCategory.SEXUAL_CONTENT, enabled: true, severity: Severity.HIGH, action: ModerationAction.REJECT, confidenceThreshold: 0.8, description: '' },
      { category: ContentCategory.VIOLENCE, enabled: true, severity: Severity.HIGH, action: ModerationAction.REJECT, confidenceThreshold: 0.8, description: '' },
    ];

    const newPolicy = await PolicyVersion.create({
      name: 'Default Strict Safety Policy v1.0',
      description: 'Initial platform bootstrap policy containing strict thresholds for core categories.',
      versionNumber: 1, // Automatically assigned by pre-save hook usually, but explicit here
      isActive: true,
      rules: defaultRules,
      createdBy: adminUser._id,
    });

    console.log(`✅ Default policy seeded successfully! (Version ID: ${newPolicy._id})`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding policy:', error);
    process.exit(1);
  }
};

seedPolicy();
