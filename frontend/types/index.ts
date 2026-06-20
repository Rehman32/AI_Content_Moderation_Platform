export type { Role, User, ApiResponse, ApiError } from './auth';

export interface Submission {
  _id: string;
  title: string;
  description: string;
  submittedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  status: 'PENDING' | 'REVIEWING' | 'COMPLETED' | 'REJECTED';
  imageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImageMeta {
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  storageType: string;
}

export interface ModerationCategory {
  name: string;
  confidence: number;
  flagged: boolean;
  reasoning: string;
}

export interface ModerationResult {
  safe: boolean;
  overallRisk: number;
  categories: ModerationCategory[];
  analyzedAt: string;
  providerName: string;
  modelVersion: string;
  processingTimeMs: number;
}

export interface SubmissionImage {
  _id: string;
  submissionId: string;
  uploadedBy: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  meta: ImageMeta;
  moderationResult: ModerationResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface TriggeredRule {
  category: string;
  confidence: number;
  threshold: number;
  action: string;
  reasoning: string;
}

export interface Verdict {
  _id: string;
  imageId: string | { _id: string; meta: ImageMeta; status: string };
  submissionId: string;
  policyVersionId: string | { _id: string; name: string; versionNumber: number };
  policyVersionNumber: number;
  aiResults: ModerationCategory[];
  triggeredRules: TriggeredRule[];
  finalOutcome: 'APPROVED' | 'FLAGGED_FOR_REVIEW' | 'BLOCKED';
  reasoning: string;
  isOverridden: boolean;
  generatedAt: string;
  createdAt: string;
}

export interface Appeal {
  _id: string;
  submissionId: string | { _id: string; title: string; status: string };
  appellantId: string | { _id: string; firstName: string; lastName: string; email: string };
  verdictSnapshot: {
    verdictId: string;
    finalOutcome: string;
    reasoning: string;
    policyVersionNumber: number;
  };
  reason: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewedBy: string | { _id: string; firstName: string; lastName: string; email: string } | null;
  reviewedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardMetrics {
  counts: {
    totalUsers: number;
    totalSubmissions: number;
    totalImages: number;
    totalVerdicts: number;
    totalAppeals: number;
  };
  verdictDistribution: { outcome: string; count: number; percentage: number }[];
  approvalRate: number;
  blockedRate: number;
  flaggedRate: number;
  appealSuccessRate: number;
  generatedAt: string;
}
