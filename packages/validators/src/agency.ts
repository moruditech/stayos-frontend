import { z } from 'zod';
import { AGENCY_ROLES } from '@stayos/constants';

const AGENCY_ROLE_VALUES = Object.values(AGENCY_ROLES) as [string, ...string[]];

// ── Profile (PATCH /agency/me) ─────────────────────────────────────────────
// Mirrors updateAgencySchema exactly. `type`/`slug`/`status` are not
// editable here — the backend schema doesn't accept them.
export const updateAgencyProfileSchema = z.object({
  name: z.string().min(1, 'Agency name is required').max(300).trim().optional(),
  contactName: z.string().min(1, 'Contact name is required').max(200).trim().optional(),
  contactPhone: z.string().optional(),
  settings: z
    .object({
      commissionEnabled: z.boolean().optional(),
      commissionPercent: z.number().min(0).max(100).optional(),
      ownerReadOnlyDefault: z.boolean().optional(),
    })
    .optional(),
});
export type UpdateAgencyProfileInput = z.infer<typeof updateAgencyProfileSchema>;

// ── Mandate terms — shared by both onboarding entry points ────────────────
// Document 13 §4 is explicit that "Onboard a new property" and "Request an
// existing property's mandate" must be presented as genuinely separate
// forms even though both submit createMandateAgencySchema's shape on the
// backend. These stay as two schemas below (not one schema with optional
// everything) so each form only ever asks for what it actually needs and
// validates only that.
const mandateTermsSchema = z.object({
  ownerEmail: z.string().email('Enter a valid email address'),
  feeType: z.enum(['percentage', 'fixed'], {
    errorMap: () => ({ message: "Select 'percentage' or 'fixed'" }),
  }),
  feeValue: z.number({ invalid_type_error: 'Enter a fee amount' }).min(0, 'Fee cannot be negative'),
  noticeDays: z
    .number()
    .int()
    .min(7, 'Notice period must be at least 7 days')
    .max(180, 'Notice period cannot exceed 180 days')
    .default(30),
});

// ── Flow 1: "Request management of an existing property" ──────────────────
// POST /agency/mandates. The owner already has a StayOS account and
// property; the agency is asking to manage it.
export const requestExistingMandateSchema = mandateTermsSchema.extend({
  existingPropertyId: z.string().min(1, 'Select a property'),
});
export type RequestExistingMandateInput = z.infer<typeof requestExistingMandateSchema>;

// ── Flow 2: "Onboard a brand-new property" ──────────────────────────────────
// POST /agency/properties/onboard. The property and its owner don't have a
// StayOS account yet — this call creates the property AND the mandate,
// then invites the owner to claim it.
export const onboardNewPropertySchema = mandateTermsSchema.extend({
  name: z.string().min(1, 'Property name is required').max(300),
  type: z.enum(['guesthouse', 'hotel', 'bed_and_breakfast', 'boutique_hotel', 'student_housing', 'lodge', 'villa', 'apartment']),
  ownerFirstName: z.string().min(1, "Owner's first name is required"),
  ownerLastName: z.string().min(1, "Owner's last name is required"),
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    province: z.enum(['GP', 'WC', 'KZN', 'EC', 'FS', 'LP', 'MP', 'NW', 'NC'], {
      errorMap: () => ({ message: 'Select a province' }),
    }),
    postalCode: z.string().optional(),
    country: z.string().default('ZA'),
  }),
});
export type OnboardNewPropertyInput = z.infer<typeof onboardNewPropertySchema>;

export const terminateMandateSchema = z.object({
  reason: z.string().max(500, 'Keep the reason under 500 characters').optional(),
});
export type TerminateMandateInput = z.infer<typeof terminateMandateSchema>;

// ── Staff (mirrors createStaffSchema / updateStaffSchema exactly) ─────────
// No password field — createStaff is invite-only; the backend generates a
// random password and emails an accept-invite link (agency.service.js).
export const createAgencyStaffSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).trim(),
  lastName: z.string().min(1, 'Last name is required').max(100).trim(),
  email: z.string().email('Enter a valid email address').toLowerCase(),
  role: z.enum(AGENCY_ROLE_VALUES, {
    errorMap: () => ({ message: 'Select a role' }),
  }),
  assignedProperties: z.array(z.string()).optional(),
});
export type CreateAgencyStaffInput = z.infer<typeof createAgencyStaffSchema>;

export const updateAgencyStaffSchema = z.object({
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  role: z.enum(AGENCY_ROLE_VALUES).optional(),
  assignedProperties: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateAgencyStaffInput = z.infer<typeof updateAgencyStaffSchema>;

export const staffPropertyAssignSchema = z.object({
  propertyIds: z.array(z.string()).min(0),
});
export type StaffPropertyAssignInput = z.infer<typeof staffPropertyAssignSchema>;
