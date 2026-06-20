import { z } from 'zod';
import dotenv from 'dotenv';

// Ensure .env is loaded before validation
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  MONGO_URI: z.string().url('MONGO_URI must be a valid URL'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long for security'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required for moderation'),
  AI_PROVIDER: z.enum(['gemini']).default('gemini'),
});

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    process.exit(1); // Fail fast
  }

  return parsed.data;
};

export const env = parseEnv();
