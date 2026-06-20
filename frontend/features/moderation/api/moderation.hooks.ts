import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi } from './moderation.api';
import { submissionKeys } from '../../submissions/api/submissions.hooks';
import { toast } from 'sonner';

export const moderationKeys = {
  verdictsBySubmission: (id: string) => ['verdicts', 'submission', id] as const,
};

export const useProcessImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => moderationApi.processImage(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.all });
      toast.success('Image processed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useSubmissionVerdicts = (submissionId: string) => {
  return useQuery({
    queryKey: moderationKeys.verdictsBySubmission(submissionId),
    queryFn: () => moderationApi.getSubmissionVerdicts(submissionId),
    enabled: !!submissionId,
  });
};

export const useListVerdicts = (params: { page?: number; limit?: number; outcome?: string; submissionId?: string } = {}) => {
  return useQuery({
    queryKey: [...moderationKeys.verdictsBySubmission('all'), params],
    queryFn: () => moderationApi.listVerdicts(params),
  });
};

export const useGenerateSubmissionVerdicts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (submissionId: string) => moderationApi.generateForSubmission(submissionId),
    onSuccess: (_, submissionId) => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.verdictsBySubmission(submissionId) });
      toast.success('Verdicts generated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
