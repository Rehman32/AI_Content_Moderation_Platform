import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from './analytics.api';

export const analyticsKeys = {
  dashboard: ['analytics', 'dashboard'] as const,
};

export const useDashboard = () => {
  return useQuery({
    queryKey: analyticsKeys.dashboard,
    queryFn: () => analyticsApi.getDashboard(),
  });
};
