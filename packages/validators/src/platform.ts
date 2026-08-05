import { z } from 'zod';
import { PLAN_FEATURES, PLATFORM_ROLES, TENANT_STATUS, AGENCY_STATUS } from '@stayos/constants';

const TENANT_STATUS_VALUES = Object.values(TENANT_STATUS) as [string, ...string[]];
const AGENCY_STATUS_VALUES = Object.values(AGENCY_STATUS) as [string, ...string[]];
const PLATFORM_ROLE_VALUES = Object.values(PLATFORM_ROLES) as [string, ...string[]];
const PLAN_FEATURE_VALUES = Object.values(PLAN_FEATURES) as [string, ...string[]];

// ── Tenant status / featured (Document 14 §3) ──────────────────────────────
// Mongoose-level validation only on the backend (isValidTenantTransition,
// not a Zod schema) — the enum here still needs to match TENANT_STATUS
// exactly since a value outside it 422s as TRANSITION_INVALID regardless.
export const changeTenantStatusSchema = z.object({
  status: z.enum(TENANT_STATUS_VALUES, { errorMap: () => ({ message: 'Select a status' }) }),
  reason: z.string().max(500).optional(),
});
export type ChangeTenantStatusInput = z.infer<typeof changeTenantStatusSchema>;

export const setFeaturedSchema = z.object({
  featured: z.boolean(),
  featuredUntil: z.string().optional().nullable(),
});
export type SetFeaturedInput = z.infer<typeof setFeaturedSchema>;

// ── Agency status (Document 14 §3) ─────────────────────────────────────────
export const changeAgencyStatusSchema = z.object({
  status: z.enum(AGENCY_STATUS_VALUES, { errorMap: () => ({ message: 'Select a status' }) }),
});
export type ChangeAgencyStatusInput = z.infer<typeof changeAgencyStatusSchema>;

// ── Subscription refund — super_admin only (Document 14 §4) ───────────────
export const refundSubscriptionSchema = z.object({
  amount: z.number({ invalid_type_error: 'Enter an amount' }).positive('Amount must be greater than zero'),
  reason: z.string().min(1, 'A reason is required for the audit log').max(500),
});
export type RefundSubscriptionInput = z.infer<typeof refundSubscriptionSchema>;

// ── Platform users (Document 14 §5) ────────────────────────────────────────
// createPlatformUser requires a plaintext password on the backend (unlike
// agency staff, which is invite-only) — verified directly against
// platform.service.js#createPlatformUser (hashPassword(data.password), no
// random-password fallback).
export const createPlatformUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(PLATFORM_ROLE_VALUES, { errorMap: () => ({ message: 'Select a role' }) }),
});
export type CreatePlatformUserInput = z.infer<typeof createPlatformUserSchema>;

export const updatePlatformUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(PLATFORM_ROLE_VALUES).optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePlatformUserInput = z.infer<typeof updatePlatformUserSchema>;

// ── Subscription plans (Document 14 §5) ────────────────────────────────────
// Mirrors createPlanSchema / updatePlanSchema exactly, field for field —
// this is the one route in this module the backend actually validates with
// Zod, and `features` is constrained to the confirmed PLAN_FEATURES enum at
// submission specifically so a typo fails the form instead of silently
// creating a PlanGate reference nothing can ever satisfy (Document 14 §5).
const TIER_VALUES = [
  'starter', 'growth', 'pro', 'enterprise',
  'pbsa_starter', 'pbsa_growth', 'pbsa_pro', 'pbsa_enterprise',
  'agency_base', 'agency_pro',
  'addon',
] as const;

const bundleDiscountSchema = z.object({
  minProperties: z.number().int().min(1),
  discountPercent: z.number().min(0).max(100),
});

export const createPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  tier: z.enum(TIER_VALUES, { errorMap: () => ({ message: 'Select a tier' }) }),
  targetType: z.enum(['property', 'pbsa', 'agency', 'addon'], {
    errorMap: () => ({ message: 'Select a target type' }),
  }),
  description: z.string().optional(),
  monthlyPrice: z.number().min(0, 'Cannot be negative'),
  annualMonthlyPrice: z.number().min(0).optional(),
  sixMonthMonthlyPrice: z.number().min(0).optional(),
  currency: z.string().default('ZAR'),

  roomLimit: z.number().int().min(0).nullable().optional(),
  propertyStaffLimit: z.number().int().min(0).nullable().optional(),
  bedLimit: z.number().int().min(0).nullable().optional(),

  isAddon: z.boolean().default(false),
  addonBaseBeds: z.number().int().min(0).nullable().optional(),
  addonPerBedBlock: z.number().min(0).nullable().optional(),
  addonBedBlockSize: z.number().int().min(1).default(30),

  isAgencyPlan: z.boolean().default(false),
  agencyBaseSeats: z.number().int().min(0).nullable().optional(),
  perPropertyPrice: z.number().min(0).nullable().optional(),
  additionalStaffPrice: z.number().min(0).nullable().optional(),

  bundleDiscounts: z.array(bundleDiscountSchema).optional(),

  features: z.array(z.enum(PLAN_FEATURE_VALUES)).optional(),

  onboardingFee: z.number().min(0).default(0),

  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  trialDays: z.number().int().min(0).default(14),
});
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = createPlanSchema.partial();
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

// ── Coupons (Document 14 §5) ────────────────────────────────────────────────
// Mongoose-level validation only — enum values mirrored from
// SubscriptionCoupon.model.js directly.
export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, hyphens, and underscores only')
    .transform((v) => v.toUpperCase()),
  description: z.string().min(1, 'A description is required'),
  discountType: z.enum(['percent', 'fixed_monthly'], {
    errorMap: () => ({ message: 'Select a discount type' }),
  }),
  discountValue: z.number().positive('Enter a discount amount'),
  applicablePlanTiers: z.array(z.string()).optional(),
  applicableTargetTypes: z.array(z.string()).optional(),
  durationMonths: z.number().int().positive().nullable().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  maxRedemptionsPerTenant: z.number().int().positive().default(1),
  isActive: z.boolean().default(true),
  expiresAt: z.string().nullable().optional(),
  eligibilityNote: z.string().optional(),
  requiresVerification: z.boolean().default(false),
});
export type CreateCouponInput = z.infer<typeof createCouponSchema>;

export const updateCouponSchema = createCouponSchema.partial();
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

// ── Referral reward (Document 14 §5) — super_admin only ────────────────────
export const rewardReferralSchema = z.object({
  invoiceId: z.string().optional(),
});
export type RewardReferralInput = z.infer<typeof rewardReferralSchema>;

// ── Vetting queue actions (Document 14 §6) ─────────────────────────────────
export const approveApplicationSchema = z.object({
  notes: z.string().max(1000).optional(),
});
export type ApproveApplicationInput = z.infer<typeof approveApplicationSchema>;

export const rejectApplicationSchema = z.object({
  reason: z.string().min(1, 'A rejection reason is required').max(1000),
});
export type RejectApplicationInput = z.infer<typeof rejectApplicationSchema>;

export const requestDocsSchema = z.object({
  notes: z.string().min(1, 'Let the applicant know what you need').max(1000),
  docTypes: z.array(z.string()).optional(),
});
export type RequestDocsInput = z.infer<typeof requestDocsSchema>;

export const flagApplicationSchema = z.object({
  reason: z.string().min(1, 'A flag reason helps whoever reviews this next').max(500),
});
export type FlagApplicationInput = z.infer<typeof flagApplicationSchema>;

export const reviewDocumentSchema = z.object({
  status: z.enum(['approved', 'rejected'], { errorMap: () => ({ message: 'Select a decision' }) }),
  note: z.string().max(500).optional(),
});
export type ReviewDocumentInput = z.infer<typeof reviewDocumentSchema>;

// ── Review moderation (Document 14 §8) ─────────────────────────────────────
export const moderateReviewSchema = z.object({
  status: z.enum(['approved', 'rejected', 'flagged'], {
    errorMap: () => ({ message: 'Select a decision' }),
  }),
});
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;

// ── Support ticket management (Document 14 §7) ─────────────────────────────
export const assignTicketSchema = z.object({
  assigneeId: z.string().min(1, 'Select a team member'),
});
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

export const updateTicketStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'pending_user', 'resolved', 'closed']),
  resolution: z.string().max(2000).optional(),
});
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
