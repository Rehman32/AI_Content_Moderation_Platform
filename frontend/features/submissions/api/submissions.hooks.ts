import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { submissionsApi } from './submissions.api';
import { toast } from 'sonner';

export const submissionKeys = {
  all: ['submissions'] as const,
  lists: () => [...submissionKeys.all, 'list'] as const,
  list: (params: any) => [...submissionKeys.lists(), params] as const,
  details: () => [...submissionKeys.all, 'detail'] as const,
  detail: (id: string) => [...submissionKeys.details(), id] as const,
};

export const useSubmissions = (params: { page?: number; limit?: number; status?: string } = {}) => {
  return useQuery({
    queryKey: submissionKeys.list(params),
    queryFn: () => submissionsApi.list(params),
  });
};

export const useSubmission = (id: string) => {
  return useQuery({
    queryKey: submissionKeys.detail(id),
    queryFn: () => submissionsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string }) => submissionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.all });
      toast.success('Submission created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useUploadImages = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, files }: { submissionId: string; files: File[] }) =>
      submissionsApi.uploadImages(submissionId, files),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.detail(variables.submissionId) });
      toast.success('Images uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
