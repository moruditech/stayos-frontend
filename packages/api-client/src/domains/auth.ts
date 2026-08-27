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
  // Present alongside the HttpOnly cookie so localStorage-based clients
  // (e.g. the admin portal, which can't rely on a cross-site cookie
  // surviving third-party-cookie blocking) can store and send it explicitly.
  refreshToken?: string;
  mfaRequired?: boolean;
  tempToken?: string; // 1-minute token — only present when mfaRequired is true
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

export const authApi = {
  login: (input: LoginInput) =>
    client.post<LoginResponse>('/auth/login', input),

  // skipRefreshCheck: true — the refresh endpoint must never trigger
  // ensureFreshToken() on itself. See client.ts skipRefreshCheck for the
  // full explanation of why this would otherwise cause a deadlock.
  //
  // storedRefreshToken: pass the localStorage-held token explicitly for
  // clients that use that flow (see packages/auth/token-store.ts). Sent in
  // the body; the server falls back to the cookie if this is omitted, so
  // cookie-based portals (customer/property) are unaffected.
  refresh: (storedRefreshToken?: string) =>
    client.post<RefreshResponse>(
      '/auth/refresh',
      storedRefreshToken ? { refreshToken: storedRefreshToken } : undefined,
      { skipRefreshCheck: true }
    ),

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
