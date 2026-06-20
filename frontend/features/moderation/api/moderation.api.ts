import { api } from '../../../lib/axios';
import { Verdict } from '../../../types';

export const moderationApi = {
  processImage: async (imageId: string) => {
    const res = await api.post(`/moderation/images/${imageId}/process`);
    return res.data;
  },

  getVerdictByImage: async (imageId: string) => {
    const res = await api.get<{ success: boolean; data: { verdict: Verdict } }>(`/verdicts/image/${imageId}`);
    return res.data;
  },

  getSubmissionVerdicts: async (submissionId: string) => {
    const res = await api.get<{ success: boolean; data: { verdicts: Verdict[] } }>(`/verdicts/submission/${submissionId}`);
    return res.data;
  },

  generateForSubmission: async (submissionId: string) => {
    const res = await api.post<{ success: boolean; data: { result: any } }>(`/verdicts/submissions/${submissionId}`);
    return res.data;
  },

  listVerdicts: async (params: { page?: number; limit?: number; outcome?: string; submissionId?: string }) => {
    const res = await api.get<{ success: boolean; data: { verdicts: Verdict[]; pagination: any } }>('/verdicts', { params });
    return res.data;
  },
};
