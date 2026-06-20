import { useQuery } from '@tanstack/react-query';
import { auditApi } from './audit.api';

export const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (params: any) => [...auditKeys.lists(), params] as const,
  entityHistory: (type: string, id: string) => [...auditKeys.all, 'history', type, id] as const,
};

export const useAuditLogs = (params: { page?: number; limit?: number; eventType?: string; entityType?: string } = {}) => {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => auditApi.queryLogs(params),
  });
};

export const useEntityHistory = (entityType: string, entityId: string) => {
  return useQuery({
    queryKey: auditKeys.entityHistory(entityType, entityId),
    queryFn: () => auditApi.getEntityHistory(entityType, entityId),
    enabled: !!entityType && !!entityId,
  });
};
