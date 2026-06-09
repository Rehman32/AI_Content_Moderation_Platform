import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:5000/api/v1'),
});

const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

if (!parsedEnv.success) {
  console.error('❌ Invalid frontend environment variables:', parsedEnv.error.format());
  throw new Error('Invalid frontend environment variables');
}

export const env = parsedEnv.data;
