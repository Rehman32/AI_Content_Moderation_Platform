import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/dashboard
   * Platform-wide KPIs: counts, rates, and verdict distribution.
   */
  public async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await analyticsService.getDashboardMetrics();

      res.status(200).json({
        success: true,
        data: { metrics },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/trends?days=30
   * Daily moderation volume and average processing time over the last N days.
   */
  public async getTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const days = Math.min(parseInt(req.query.days as string) || 30, 365); // Cap at 1 year

      const report = await analyticsService.getTrendsReport(days);

      res.status(200).json({
        success: true,
        data: { report },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/categories
   * Most triggered AI content categories, sorted by trigger count.
   */
  public async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await analyticsService.getCategoryStats();

      res.status(200).json({
        success: true,
        data: { categories },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/appeals
   * Appeal counts, success rate, and average resolution time.
   */
  public async getAppeals(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await analyticsService.getAppealAnalytics();

      res.status(200).json({
        success: true,
        data: { analytics },
      });
    } catch (error) {
      next(error);
    }
  }
}
