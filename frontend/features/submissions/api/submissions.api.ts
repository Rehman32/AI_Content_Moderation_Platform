import { api } from '../../../lib/axios';
import { Submission, SubmissionImage, Pagination } from '../../../types';

interface SubmissionsListResponse {
  submissions: Submission[];
  pagination: Pagination;
}

export const submissionsApi = {
  create: async (data: { title: string; description?: string }) => {
    const res = await api.post('/submissions', data);
    return res.data;
  },

  list: async (params: { page?: number; limit?: number; status?: string }) => {
    const res = await api.get<{ success: boolean; data: SubmissionsListResponse }>('/submissions', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<{ success: boolean; data: { submission: Submission; images: SubmissionImage[] } }>(`/submissions/${id}`);
    return res.data;
  },

  uploadImages: async (submissionId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    const res = await api.post(`/submissions/${submissionId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getImages: async (submissionId: string) => {
    const res = await api.get<{ success: boolean; data: { images: SubmissionImage[] } }>(`/submissions/${submissionId}/images`);
    return res.data;
  },
};
