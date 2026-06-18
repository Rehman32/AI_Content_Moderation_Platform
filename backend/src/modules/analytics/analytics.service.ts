import { UserModel } from '../users/user.model';
import { SubmissionModel } from '../submissions/submission.model';
import { ImageModel } from '../submissions/image.model';
import { VerdictModel } from '../verdicts/verdict.model';
import { AppealModel } from '../appeals/appeal.model';
import { VerdictOutcome } from '../verdicts/verdict.types';
import { AppealStatus } from '../appeals/appeal.interface';
import {
  IDashboardMetrics,
  ITrendsReport,
  ICategoryStats,
  IAppealAnalytics,
  IVerdictDistribution,
} from './analytics.types';

/**
 * WHY AGGREGATION PIPELINES OVER APPLICATION-SIDE COUNTING:
 *
 * 1. NETWORK EFFICIENCY:
 *    Application-side counting requires fetching ALL documents to the app server,
 *    then iterating them in JavaScript. A single MongoDB aggregation executes on
 *    the database server and returns a single summarised document.
 *    For 1M verdicts: application-side = 1M documents over the wire.
 *    Aggregation: 1 document over the wire.
 *
 * 2. ATOMIC CONSISTENCY:
 *    Multiple `Model.countDocuments()` calls run as separate queries at different
 *    instants — a write between calls produces an inconsistent snapshot.
 *    `$facet` in a single pipeline runs all sub-aggregations against the same
 *    collection state at query time.
 *
 * 3. INDEX UTILISATION:
 *    MongoDB's query planner uses existing indexes inside `$match` stages of
 *    aggregation pipelines. The same indexes we created for hot-path queries
 *    (finalOutcome, status, createdAt) also accelerate analytics without
 *    needing separate analytics indexes.
 *
 * 4. COMPUTED FIELDS AT THE DB LAYER:
 *    Percentages, rates, and date bucketing ($dateToString, $avg, $divide)
 *    are computed by the database engine — faster and more precise than
 *    JavaScript arithmetic on the application server.
 *
 * 5. SCALABILITY:
 *    Aggregation pipelines support $allowDiskUse for very large datasets,
 *    can be converted to materialised views, and work seamlessly with
 *    MongoDB Atlas's online archive for time-series data.
 */
export class AnalyticsService {

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  /**
   * Produces all dashboard KPIs in a single round-trip using parallel
   * Promise.all over lightweight countDocuments() calls (which are O(1)
   * when the collection has a relevant index or uses the collection metadata).
   *
   * The verdict distribution uses a $group + $project pipeline so we get
   * counts AND percentages in one pass — no second query needed.
   */
  public async getDashboardMetrics(): Promise<IDashboardMetrics> {
    // ── Parallel count queries ───────────────────────────────────────────────
    const [
      totalUsers,
      totalSubmissions,
      totalImages,
      totalVerdicts,
      totalAppeals,
      verdictGroupRaw,
      appealGroupRaw,
    ] = await Promise.all([
      UserModel.countDocuments(),
      SubmissionModel.countDocuments(),
      ImageModel.countDocuments(),
      VerdictModel.countDocuments(),
      AppealModel.countDocuments(),

      // Verdict outcome distribution — group by finalOutcome
      VerdictModel.aggregate([
        {
          $group: {
            _id: '$finalOutcome',
            count: { $sum: 1 },
          },
        },
      ]),

      // Appeal status distribution — just need APPROVED count for success rate
      AppealModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // ── Verdict distribution with percentages ────────────────────────────────
    const verdictMap = new Map<string, number>(
      verdictGroupRaw.map((g: any) => [g._id, g.count])
    );

    const verdictDistribution: IVerdictDistribution[] = Object.values(VerdictOutcome).map(
      (outcome) => {
        const count = verdictMap.get(outcome) ?? 0;
        return {
          outcome,
          count,
          percentage: totalVerdicts > 0
            ? parseFloat(((count / totalVerdicts) * 100).toFixed(2))
            : 0,
        };
      }
    );

    // ── Rate helpers ─────────────────────────────────────────────────────────
    const rate = (outcome: VerdictOutcome): number => {
      const count = verdictMap.get(outcome) ?? 0;
      return totalVerdicts > 0
        ? parseFloat(((count / totalVerdicts) * 100).toFixed(2))
        : 0;
    };

    // ── Appeal success rate ──────────────────────────────────────────────────
    const appealMap = new Map<string, number>(
      appealGroupRaw.map((g: any) => [g._id, g.count])
    );
    const approvedAppeals = appealMap.get(AppealStatus.APPROVED) ?? 0;
    const rejectedAppeals = appealMap.get(AppealStatus.REJECTED) ?? 0;
    const resolvedAppeals = approvedAppeals + rejectedAppeals;
    const appealSuccessRate = resolvedAppeals > 0
      ? parseFloat(((approvedAppeals / resolvedAppeals) * 100).toFixed(2))
      : 0;

    return {
      counts: {
        totalUsers,
        totalSubmissions,
        totalImages,
        totalVerdicts,
        totalAppeals,
      },
      verdictDistribution,
      approvalRate: rate(VerdictOutcome.APPROVED),
      blockedRate: rate(VerdictOutcome.BLOCKED),
      flaggedRate: rate(VerdictOutcome.FLAGGED_FOR_REVIEW),
      appealSuccessRate,
      generatedAt: new Date(),
    };
  }

  // ─── Trends ────────────────────────────────────────────────────────────────

  /**
   * Daily moderation volume and average AI processing time for the last N days.
   *
   * PIPELINE DESIGN:
   *  $match  → filter to last N days using the `generatedAt` index.
   *  $group  → bucket by calendar day ($dateToString strips the time component).
   *            Count total verdicts + count by each outcome using $cond.
   *  $sort   → chronological order for charting libraries.
   *  $project → rename _id to date for cleaner client consumption.
   *
   * The average processing time uses the Image collection's
   * moderationResult.processingTimeMs field — aggregated separately.
   */
  public async getTrendsReport(days = 30): Promise<ITrendsReport> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [dailyVolumeRaw, processingTimeRaw] = await Promise.all([
      // Daily verdict volume bucketed by date
      VerdictModel.aggregate([
        { $match: { generatedAt: { $gte: since } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$generatedAt' },
            },
            verdicts: { $sum: 1 },
            blocked: {
              $sum: { $cond: [{ $eq: ['$finalOutcome', VerdictOutcome.BLOCKED] }, 1, 0] },
            },
            approved: {
              $sum: { $cond: [{ $eq: ['$finalOutcome', VerdictOutcome.APPROVED] }, 1, 0] },
            },
            flagged: {
              $sum: {
                $cond: [{ $eq: ['$finalOutcome', VerdictOutcome.FLAGGED_FOR_REVIEW] }, 1, 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            date: '$_id',
            verdicts: 1,
            blocked: 1,
            approved: 1,
            flagged: 1,
          },
        },
      ]),

      // Average AI processing time from Images that have been moderated
      ImageModel.aggregate([
        { $match: { 'moderationResult': { $ne: null } } },
        {
          $group: {
            _id: null,
            avgProcessingTimeMs: { $avg: '$moderationResult.processingTimeMs' },
          },
        },
      ]),
    ]);

    const avgMs: number =
      processingTimeRaw.length > 0
        ? Math.round(processingTimeRaw[0].avgProcessingTimeMs ?? 0)
        : 0;

    // Find the peak traffic day
    const peakDay = dailyVolumeRaw.length > 0
      ? dailyVolumeRaw.reduce((max: any, day: any) =>
          day.verdicts > max.verdicts ? day : max
        )
      : null;

    return {
      period: `Last ${days} days`,
      dailyVolume: dailyVolumeRaw,
      averageProcessingTimeMs: avgMs,
      peakDay,
    };
  }

  // ─── Category Analytics ────────────────────────────────────────────────────

  /**
   * Most triggered AI content categories, with trigger rates and confidence averages.
   *
   * PIPELINE DESIGN:
   *  $unwind → flatten the aiResults array so each category becomes a
   *            separate pipeline document. This is the correct pattern for
   *            operating on array sub-documents without a collection scan.
   *  $group  → group by category name. Compute:
   *            - total evaluated (every occurrence)
   *            - total triggered (where flagged: true)
   *            - average confidence
   *  $project → compute trigger rate as (triggered / evaluated * 100).
   *  $sort   → most triggered categories first for the UI.
   */
  public async getCategoryStats(): Promise<ICategoryStats[]> {
    const pipeline = await VerdictModel.aggregate([
      // $unwind flattens the aiResults array — each element becomes its own document
      { $unwind: '$aiResults' },
      {
        $group: {
          _id: '$aiResults.name',
          totalEvaluated: { $sum: 1 },
          totalTriggered: {
            $sum: { $cond: ['$aiResults.flagged', 1, 0] },
          },
          averageConfidence: { $avg: '$aiResults.confidence' },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          totalEvaluated: 1,
          totalTriggered: 1,
          triggerRate: {
            $round: [
              { $multiply: [{ $divide: ['$totalTriggered', '$totalEvaluated'] }, 100] },
              2,
            ],
          },
          averageConfidence: { $round: ['$averageConfidence', 4] },
        },
      },
      { $sort: { totalTriggered: -1 } }, // Most triggered first
    ]);

    return pipeline;
  }

  // ─── Appeal Analytics ──────────────────────────────────────────────────────

  /**
   * Comprehensive appeal statistics.
   *
   * PIPELINE DESIGN:
   *  $facet → runs two sub-pipelines against the same collection snapshot:
   *    1. statusBreakdown: groups by status to get counts per status.
   *    2. resolutionTime: measures time between createdAt and reviewedAt for
   *       resolved appeals to compute average turnaround in days.
   *
   * $facet is the idiomatic MongoDB pattern for multi-dimensional analytics
   * on a single collection — equivalent to running multiple CTEs in SQL.
   */
  public async getAppealAnalytics(): Promise<IAppealAnalytics> {
    const [result] = await AppealModel.aggregate([
      {
        $facet: {
          // Sub-pipeline 1: Count by status
          statusBreakdown: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
          // Sub-pipeline 2: Average days to resolution (only for resolved appeals)
          resolutionTime: [
            {
              $match: {
                reviewedAt: { $ne: null },
                status: { $in: [AppealStatus.APPROVED, AppealStatus.REJECTED] },
              },
            },
            {
              $project: {
                resolutionDays: {
                  $divide: [
                    { $subtract: ['$reviewedAt', '$createdAt'] },
                    1000 * 60 * 60 * 24, // ms → days
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                avgResolutionDays: { $avg: '$resolutionDays' },
              },
            },
          ],
        },
      },
    ]);

    if (!result) {
      return {
        total: 0,
        breakdown: [],
        successRate: 0,
        pendingCount: 0,
        averageResolutionDays: null,
      };
    }

    const statusMap = new Map<string, number>(
      result.statusBreakdown.map((g: any) => [g._id, g.count])
    );

    const total = Array.from(statusMap.values()).reduce((a, b) => a + b, 0);

    const breakdown = Object.values(AppealStatus).map((status) => {
      const count = statusMap.get(status) ?? 0;
      return {
        status,
        count,
        percentage: total > 0
          ? parseFloat(((count / total) * 100).toFixed(2))
          : 0,
      };
    });

    const approvedCount = statusMap.get(AppealStatus.APPROVED) ?? 0;
    const rejectedCount = statusMap.get(AppealStatus.REJECTED) ?? 0;
    const resolved = approvedCount + rejectedCount;
    const successRate = resolved > 0
      ? parseFloat(((approvedCount / resolved) * 100).toFixed(2))
      : 0;

    const avgResolutionDays =
      result.resolutionTime.length > 0
        ? parseFloat(result.resolutionTime[0].avgResolutionDays.toFixed(2))
        : null;

    return {
      total,
      breakdown,
      successRate,
      pendingCount: statusMap.get(AppealStatus.PENDING) ?? 0,
      averageResolutionDays: avgResolutionDays,
    };
  }
}
