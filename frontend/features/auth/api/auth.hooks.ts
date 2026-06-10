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
    onSuccess: (response) => {
      // The API returns standard ApiResponse with data.user and data.token
      // Wait, let's check API definition carefully: `AuthResponse`
      // For `/auth/login`, our backend returns: { success: true, token, data: { user } } 
      // Oops! Let's adapt to what backend actually returns.
      // Based on our swagger guide: backend returns `token` at root OR inside data depending on endpoint.
      // We will parse it dynamically.
      const token = response.data?.token || (response as any).token;
      const user = response.data?.user || (response.data as any);

      if (token && user) {
        login(user, token);
        toast.success('Successfully logged in');
        // Redirect to appropriate dashboard based on role
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
    onSuccess: (response) => {
      const token = response.data?.token || (response as any).token;
      const user = response.data?.user || (response.data as any);

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
