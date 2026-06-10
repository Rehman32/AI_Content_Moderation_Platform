import { api } from '../../../lib/axios';
import { ApiResponse, User } from '../../../types';
import { LoginFormData, RegisterFormData } from '../schemas';

interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  login: async (data: LoginFormData): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterFormData): Promise<ApiResponse<AuthResponse>> => {
    // Drop confirmPassword before sending to backend
    const { confirmPassword, ...payload } = data;
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', payload);
    return response.data;
  },

  getMe: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data;
  },
};
