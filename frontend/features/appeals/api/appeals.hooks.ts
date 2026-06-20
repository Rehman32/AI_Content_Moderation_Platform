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

export const useApproveAppeal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appealId, adminNotes }: { appealId: string; adminNotes?: string }) => appealsApi.approve(appealId, adminNotes),
    onMutate: async ({ appealId }) => {
      await queryClient.cancelQueries({ queryKey: appealKeys.all });
      const previousAppeals = queryClient.getQueryData(appealKeys.all);
      // Optimistically update
      queryClient.setQueriesData({ queryKey: appealKeys.all }, (old: any) => {
        if (!old || !old.data || !old.data.appeals) return old;
        return {
          ...old,
          data: {
            ...old.data,
            appeals: old.data.appeals.map((appeal: any) =>
              appeal._id === appealId ? { ...appeal, status: 'APPROVED' } : appeal
            ),
          },
        };
      });
      return { previousAppeals };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(appealKeys.all, context?.previousAppeals);
      toast.error(err.message || 'Failed to approve appeal');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: appealKeys.all });
    },
    onSuccess: () => {
      toast.success('Appeal approved successfully');
    },
  });
};

export const useRejectAppeal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appealId, adminNotes }: { appealId: string; adminNotes?: string }) => appealsApi.reject(appealId, adminNotes),
    onMutate: async ({ appealId }) => {
      await queryClient.cancelQueries({ queryKey: appealKeys.all });
      const previousAppeals = queryClient.getQueryData(appealKeys.all);
      // Optimistically update
      queryClient.setQueriesData({ queryKey: appealKeys.all }, (old: any) => {
        if (!old || !old.data || !old.data.appeals) return old;
        return {
          ...old,
          data: {
            ...old.data,
            appeals: old.data.appeals.map((appeal: any) =>
              appeal._id === appealId ? { ...appeal, status: 'REJECTED' } : appeal
            ),
          },
        };
      });
      return { previousAppeals };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(appealKeys.all, context?.previousAppeals);
      toast.error(err.message || 'Failed to reject appeal');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: appealKeys.all });
    },
    onSuccess: () => {
      toast.success('Appeal rejected successfully');
    },
  });
};

export const useMarkAppealUnderReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appealId: string) => appealsApi.markUnderReview(appealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appealKeys.all });
      toast.success('Appeal marked as under review');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
