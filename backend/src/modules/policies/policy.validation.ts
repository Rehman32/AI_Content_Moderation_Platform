import { z } from 'zod';
import { ContentCategory, Severity, ModerationAction } from './policy.interface';

// ─── Rule Schema ────────────────────────────────────────────────────────────
const policyRuleSchema = z.object({
  category: z.nativeEnum(ContentCategory, {
    error: `Category must be one of: ${Object.values(ContentCategory).join(', ')}`,
  }),
  enabled: z.boolean().default(true),
  severity: z.nativeEnum(Severity, {
    error: `Severity must be one of: ${Object.values(Severity).join(', ')}`,
  }),
  action: z.nativeEnum(ModerationAction, {
    error: `Action must be one of: ${Object.values(ModerationAction).join(', ')}`,
  }),
  confidenceThreshold: z
    .number()
    .min(0, 'Confidence threshold must be between 0 and 1')
    .max(1, 'Confidence threshold must be between 0 and 1'),
  description: z.string().max(200).default(''),
});

// ─── Create Policy Version ─────────────────────────────────────────────────
export const createPolicyVersionSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, 'Policy name must be at least 3 characters')
      .max(100, 'Policy name cannot exceed 100 characters'),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(500, 'Description cannot exceed 500 characters'),
    rules: z
      .array(policyRuleSchema)
      .min(1, 'At least one rule is required')
      .refine(
        (rules) => {
          const categories = rules.map((r) => r.category);
          return categories.length === new Set(categories).size;
        },
        { message: 'Duplicate content categories are not allowed' }
      ),
  }),
});

// ─── Activate Policy Version ────────────────────────────────────────────────
export const activatePolicyVersionSchema = z.object({
  params: z.object({
    versionId: z.string().min(1, 'Version ID is required'),
  }),
});

// ─── Get Policy By Version ID ───────────────────────────────────────────────
export const getPolicyByIdSchema = z.object({
  params: z.object({
    versionId: z.string().min(1, 'Version ID is required'),
  }),
});

// ─── Soft Delete Policy Version ─────────────────────────────────────────────
export const deletePolicyVersionSchema = z.object({
  params: z.object({
    versionId: z.string().min(1, 'Version ID is required'),
  }),
});

// ─── Pagination query (history endpoint) ────────────────────────────────────
export const getPolicyHistorySchema = z.object({
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    includeDeleted: z.string().optional().default('false'),
  }),
});
