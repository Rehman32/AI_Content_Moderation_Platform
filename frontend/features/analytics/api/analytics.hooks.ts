import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from './analytics.api';

export const analyticsKeys = {
  dashboard: ['analytics', 'dashboard'] as const,
  trends: (days: number) => ['analytics', 'trends', days] as const,
  categories: ['analytics', 'categories'] as const,
  appeals: ['analytics', 'appeals'] as const,
};

export const useDashboard = () => {
  return useQuery({
    queryKey: analyticsKeys.dashboard,
    queryFn: () => analyticsApi.getDashboard(),
  });
};

export const useTrends = (days: number = 30) => {
  return useQuery({
    queryKey: analyticsKeys.trends(days),
    queryFn: () => analyticsApi.getTrends(days),
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: analyticsKeys.categories,
    queryFn: () => analyticsApi.getCategories(),
  });
};

export const useAppealsAnalytics = () => {
  return useQuery({
    queryKey: analyticsKeys.appeals,
    queryFn: () => analyticsApi.getAppeals(),
  });
};
