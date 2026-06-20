import { api } from '../../../lib/axios';
import { DashboardMetrics } from '../../../types';

export const analyticsApi = {
  getDashboard: async () => {
    const res = await api.get<{ success: boolean; data: { metrics: DashboardMetrics } }>('/analytics/dashboard');
    return res.data;
  },
};
