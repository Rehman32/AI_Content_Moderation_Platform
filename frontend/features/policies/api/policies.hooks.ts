import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policiesApi } from './policies.api';
import { toast } from 'sonner';

export const policyKeys = {
  all: ['policies'] as const,
  lists: () => [...policyKeys.all, 'list'] as const,
  list: (params: any) => [...policyKeys.lists(), params] as const,
  details: () => [...policyKeys.all, 'detail'] as const,
  detail: (id: string) => [...policyKeys.details(), id] as const,
  active: () => [...policyKeys.all, 'active'] as const,
};

export const usePoliciesHistory = (params: { page?: number; limit?: number; includeDeleted?: boolean } = {}) => {
  return useQuery({
    queryKey: policyKeys.list(params),
    queryFn: () => policiesApi.getHistory(params),
  });
};

export const useActivePolicy = () => {
  return useQuery({
    queryKey: policyKeys.active(),
    queryFn: () => policiesApi.getActive(),
  });
};

export const usePolicy = (id: string) => {
  return useQuery({
    queryKey: policyKeys.detail(id),
    queryFn: () => policiesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreatePolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description: string; rules: any[] }) => policiesApi.createVersion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.all });
      toast.success('Policy version created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useActivatePolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => policiesApi.activate(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.all });
      toast.success('Policy version activated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
