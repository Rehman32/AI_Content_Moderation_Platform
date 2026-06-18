import { VerdictOutcome } from '../verdicts/verdict.types';
import { AppealStatus } from '../appeals/appeal.interface';

// ─── Dashboard Types ──────────────────────────────────────────────────────────

export interface IPlatformCounts {
  totalUsers: number;
  totalSubmissions: number;
  totalImages: number;
  totalVerdicts: number;
  totalAppeals: number;
}

export interface IVerdictDistribution {
  outcome: VerdictOutcome;
  count: number;
  percentage: number;
}

export interface IDashboardMetrics {
  counts: IPlatformCounts;
  verdictDistribution: IVerdictDistribution[];
  approvalRate: number;       // 0–100
  blockedRate: number;        // 0–100
  flaggedRate: number;        // 0–100
  appealSuccessRate: number;  // percentage of appeals that were APPROVED
  generatedAt: Date;
}

// ─── Trend Types ──────────────────────────────────────────────────────────────

export interface IDailyVolume {
  date: string;             // ISO date string "YYYY-MM-DD"
  verdicts: number;
  blocked: number;
  approved: number;
  flagged: number;
}

export interface ITrendsReport {
  period: string;           // e.g. "Last 30 days"
  dailyVolume: IDailyVolume[];
  averageProcessingTimeMs: number;
  peakDay: IDailyVolume | null;
}

// ─── Category Types ───────────────────────────────────────────────────────────

export interface ICategoryStats {
  category: string;
  totalEvaluated: number;
  totalTriggered: number;
  triggerRate: number;      // 0–100 percentage
  averageConfidence: number;
}

// ─── Appeal Analytics Types ───────────────────────────────────────────────────

export interface IAppealStatusBreakdown {
  status: AppealStatus;
  count: number;
  percentage: number;
}

export interface IAppealAnalytics {
  total: number;
  breakdown: IAppealStatusBreakdown[];
  successRate: number;      // APPROVED / (APPROVED + REJECTED) * 100
  pendingCount: number;
  averageResolutionDays: number | null;
}
