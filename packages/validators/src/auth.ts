import { z } from 'zod';

// ── Shared field primitives ────────────────────────────────────────────────────
// Kept in sync with emailField/passwordField in backend auth.validation.js.
// Field names in every schema below must exactly match the `field` values
// the backend returns in ApiFieldError[] on VALIDATION_ERROR — any mismatch
// causes setError() to drop the error silently (Document 06 §3).

const emailField    = z.string().email('Invalid email address');
const passwordField = z.string().min(8, 'Password must be at least 8 characters');

// userType is sent to POST /auth/login so the backend knows which model to
// query. The frontend sends it based on which portal is initiating login —
// not something the user selects from a list in every portal.
const USER_TYPES = ['platform', 'agency', 'property', 'customer', 'owner'] as const;
export type UserType = (typeof USER_TYPES)[number];

// ── POST /auth/register (customer self-registration) ──────────────────────────
export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).trim(),
  lastName: z.string().min(1, 'Last name is required').max(100).trim(),
  email: emailField,
  password: passwordField,
  phone: z.string().optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// ── POST /auth/login ──────────────────────────────────────────────────────────
// rememberMe: false → 7-day refresh cookie; true → 30-day sliding session.
// The backend alone sets cookie maxAge — the frontend only sends the boolean.
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
  userType: z.enum(USER_TYPES),
  rememberMe: z.boolean().default(false),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ── POST /auth/mfa/verify ─────────────────────────────────────────────────────
// tempToken is the 1-minute token returned in the mfaRequired response body —
// carried by the form as a hidden field and submitted alongside the TOTP code.
// The MFA form needs a visible countdown and resend affordance (Document 02 §1).
export const mfaVerifySchema = z.object({
  tempToken: z.string().min(1, 'Temp token is required'),
  totpCode: z
    .string()
    .length(6, 'TOTP code must be 6 digits')
    .regex(/^\d+$/, 'TOTP code must be numeric'),
});
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;

// ── POST /auth/forgot-password ────────────────────────────────────────────────
// Always returns 200 — never confirms whether the email exists (prevents
// enumeration). Do not display different success/failure UI based on backend
// response — show the same "if an account exists you'll receive an email" copy
// regardless.
export const forgotPasswordSchema = z.object({
  email: emailField,
  userType: z.enum(USER_TYPES),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ── POST /auth/reset-password/:token ─────────────────────────────────────────
export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ── POST /auth/claim-account (unclaimed guest account setup) ──────────────────
// Used by guests whose booking was created on their behalf by staff — they set
// a password to claim their account (Document 11 §3).
export const claimAccountSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ClaimAccountInput = z.infer<typeof claimAccountSchema>;

// ── PATCH /auth/password (change password while authenticated) ────────────────
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordField,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ── POST /auth/mfa/disable ────────────────────────────────────────────────────
export const mfaDisableSchema = z.object({
  totpCode: z
    .string()
    .length(6, 'TOTP code must be 6 digits')
    .regex(/^\d+$/, 'TOTP code must be numeric'),
});
export type MfaDisableInput = z.infer<typeof mfaDisableSchema>;
