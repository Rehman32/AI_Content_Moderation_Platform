import { api } from '../../../lib/axios';
import { AuditLog, Pagination } from '../../../types';

interface AuditQueryResponse {
  logs: AuditLog[];
  pagination: Pagination;
}

export const auditApi = {
  queryLogs: async (params: { page?: number; limit?: number; eventType?: string; entityType?: string }) => {
    const res = await api.get<{ success: boolean; data: AuditQueryResponse }>('/audit', { params });
    return res.data;
  },

  getEntityHistory: async (entityType: string, entityId: string) => {
    const res = await api.get<{ success: boolean; data: { entityType: string; entityId: string; history: AuditLog[] } }>(`/audit/${entityType}/${entityId}`);
    return res.data;
  },
};
