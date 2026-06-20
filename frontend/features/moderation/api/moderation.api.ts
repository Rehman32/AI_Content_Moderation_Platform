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
};
