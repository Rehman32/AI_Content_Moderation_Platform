import { useMutation } from '@tanstack/react-query';
import { authApi } from './auth.api';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LoginFormData, RegisterFormData } from '../schemas';

export const useLogin = () => {
  const { login } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginFormData) => authApi.login(data),
    onSuccess: (response: any) => {
      // Backend returns: { success, data: { user }, token }
      const token = response.token || response.data?.token;
      const user = response.data?.user;

      if (token && user) {
        login(user, token);
        toast.success('Successfully logged in');
        if (user.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/submissions');
        }
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to login');
    },
  });
};

export const useRegister = () => {
  const { login } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterFormData) => authApi.register(data),
    onSuccess: (response: any) => {
      const token = response.token || response.data?.token;
      const user = response.data?.user;

      if (token && user) {
        login(user, token);
        toast.success('Account created successfully');
        router.push('/submissions');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to register');
    },
  });
};
