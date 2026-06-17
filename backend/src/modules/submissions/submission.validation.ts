import { z } from 'zod';

// ─── Create Submission ──────────────────────────────────────────────────────
export const createSubmissionSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(150, 'Title cannot exceed 150 characters'),
    description: z
      .string()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional()
      .default(''),
  }),
});

// ─── Get Submission By ID ───────────────────────────────────────────────────
export const getSubmissionByIdSchema = z.object({
  params: z.object({
    submissionId: z.string().min(1, 'Submission ID is required'),
  }),
});

// ─── Upload Images (params validation only — files validated by multer) ─────
export const uploadImagesSchema = z.object({
  params: z.object({
    submissionId: z.string().min(1, 'Submission ID is required'),
  }),
});

// ─── Get Submission List (pagination) ───────────────────────────────────────
export const getSubmissionsSchema = z.object({
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    status: z.string().optional(),
  }),
});
