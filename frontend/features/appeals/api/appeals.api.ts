import { api } from '../../../lib/axios';
import { Appeal, Pagination } from '../../../types';

interface AppealsListResponse {
  appeals: Appeal[];
  pagination: Pagination;
}

export const appealsApi = {
  create: async (data: { submissionId: string; reason: string }) => {
    const res = await api.post('/appeals', data);
    return res.data;
  },

  list: async (params: { page?: number; limit?: number; status?: string }) => {
    const res = await api.get<{ success: boolean; data: AppealsListResponse }>('/appeals', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<{ success: boolean; data: { appeal: Appeal } }>(`/appeals/${id}`);
    return res.data;
  },

  getBySubmission: async (submissionId: string) => {
    const res = await api.get<{ success: boolean; data: { appeals: Appeal[] } }>(`/appeals/submission/${submissionId}`);
    return res.data;
  },
};
