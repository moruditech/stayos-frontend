import { client } from '../client';
import type {
  LoginInput,
  RegisterInput,
  MfaVerifyInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from '@stayos/validators';

export interface LoginResponse {
  accessToken: string;
  mfaRequired?: boolean;
  tempToken?: string; // 1-minute token — only present when mfaRequired is true
}

export interface RefreshResponse {
  accessToken: string;
}

export const authApi = {
  login: (input: LoginInput) =>
    client.post<LoginResponse>('/auth/login', input),

  refresh: () => client.post<RefreshResponse>('/auth/refresh'),

  logout: () => client.post<void>('/auth/logout'),

  register: (input: RegisterInput) =>
    client.post<{ message: string }>('/auth/register', input),

  verifyEmail: (token: string) =>
    client.get<{ message: string }>(`/auth/verify/${token}`),

  forgotPassword: (input: ForgotPasswordInput) =>
    client.post<{ message: string }>('/auth/forgot-password', input),

  resetPassword: (token: string, input: ResetPasswordInput) =>
    client.post<{ message: string }>(`/auth/reset-password/${token}`, input),

  changePassword: (input: ChangePasswordInput) =>
    client.patch<{ message: string }>('/auth/password', input),

  mfaVerify: (input: MfaVerifyInput) =>
    client.post<LoginResponse>('/auth/mfa/verify', input),

  // GET /auth/google — initiates OAuth; browser is redirected, not a fetch call.
  // The callback URL is /auth/google/callback (handled by the backend).
  googleLoginUrl: (): string => `${'/api/v1'}/auth/google`,
};
