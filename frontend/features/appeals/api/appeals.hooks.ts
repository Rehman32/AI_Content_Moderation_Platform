import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appealsApi } from './appeals.api';
import { toast } from 'sonner';

export const appealKeys = {
  all: ['appeals'] as const,
  lists: () => [...appealKeys.all, 'list'] as const,
  list: (params: any) => [...appealKeys.lists(), params] as const,
  details: () => [...appealKeys.all, 'detail'] as const,
  detail: (id: string) => [...appealKeys.details(), id] as const,
  bySubmission: (id: string) => [...appealKeys.all, 'submission', id] as const,
};

export const useAppeals = (params: { page?: number; limit?: number; status?: string } = {}) => {
  return useQuery({
    queryKey: appealKeys.list(params),
    queryFn: () => appealsApi.list(params),
  });
};

export const useAppealsBySubmission = (submissionId: string) => {
  return useQuery({
    queryKey: appealKeys.bySubmission(submissionId),
    queryFn: () => appealsApi.getBySubmission(submissionId),
    enabled: !!submissionId,
  });
};

export const useCreateAppeal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { submissionId: string; reason: string }) => appealsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appealKeys.all });
      toast.success('Appeal submitted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
