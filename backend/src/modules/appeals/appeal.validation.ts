import { z } from 'zod';

/**
 * Validation for creating a new appeal.
 */
export const createAppealSchema = z.object({
  body: z.object({
    reason: z
      .string()
      .min(20, 'Appeal reason must be at least 20 characters')
      .max(2000, 'Appeal reason cannot exceed 2000 characters')
      .trim(),
  }),
});

/**
 * Validation for an admin reviewing an appeal.
 * adminNotes are optional — admin may approve without a written explanation,
 * though it is strongly encouraged for auditability.
 */
export const reviewAppealSchema = z.object({
  body: z.object({
    adminNotes: z
      .string()
      .max(2000, 'Admin notes cannot exceed 2000 characters')
      .trim()
      .optional(),
  }),
});

export type CreateAppealInput = z.infer<typeof createAppealSchema>['body'];
export type ReviewAppealInput = z.infer<typeof reviewAppealSchema>['body'];
