import { api } from '../../../lib/axios';
import { DashboardMetrics } from '../../../types';

export const analyticsApi = {
  getDashboard: async () => {
    const res = await api.get<{ success: boolean; data: { metrics: DashboardMetrics } }>('/analytics/dashboard');
    return res.data;
  },

  getTrends: async (days: number = 30) => {
    const res = await api.get<{ success: boolean; data: { report: any } }>('/analytics/trends', { params: { days } });
    return res.data;
  },

  getCategories: async () => {
    const res = await api.get<{ success: boolean; data: { categories: any[] } }>('/analytics/categories');
    return res.data;
  },

  getAppeals: async () => {
    const res = await api.get<{ success: boolean; data: { analytics: any } }>('/analytics/appeals');
    return res.data;
  },
};
