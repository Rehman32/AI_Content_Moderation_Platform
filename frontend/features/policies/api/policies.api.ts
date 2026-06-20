import { api } from '../../../lib/axios';
import { PolicyVersion, Pagination } from '../../../types';

interface PolicyHistoryResponse {
  policies: PolicyVersion[];
  pagination: Pagination;
}

export const policiesApi = {
  createVersion: async (data: { name: string; description: string; rules: any[] }) => {
    const res = await api.post('/policies', data);
    return res.data;
  },

  getActive: async () => {
    const res = await api.get<{ success: boolean; data: { policyVersion: PolicyVersion } }>('/policies/active');
    return res.data;
  },

  getById: async (versionId: string) => {
    const res = await api.get<{ success: boolean; data: { policyVersion: PolicyVersion } }>(`/policies/${versionId}`);
    return res.data;
  },

  getHistory: async (params: { page?: number; limit?: number; includeDeleted?: boolean }) => {
    const res = await api.get<{ success: boolean; data: PolicyHistoryResponse }>('/policies/history', { params });
    return res.data;
  },

  activate: async (versionId: string) => {
    const res = await api.patch(`/policies/${versionId}/activate`);
    return res.data;
  },
};
