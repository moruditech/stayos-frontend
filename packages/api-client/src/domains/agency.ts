import { client } from '../client';
import type {
  AgencyProfile,
  AgencyPortfolio,
  AgencyAnalytics,
  AgencyPropertyComparison,
  AgencyStaffMember,
  AgencyStatement,
  AgencyBilling,
  AgencyOnboardingState,
  PropertyMandate,
  Pagination,
} from '@stayos/types';

export interface AgencyEnterPropertyResponse {
  // Token is tenant-scoped with the mapped property-level role.
  // Delivered via redirect to the Property Operations Portal with the
  // token in a URL query param — read once, stripped immediately.
  // See useEnterAgencyProperty hook in apps/agency.
  accessToken: string;
  refreshToken: string;
  property: { _id: string; name: string };
  agencyRole: string;
  propertyRole: string;
  mandateId: string;
}

// AgencyMandate is PropertyMandate with propertyId always populated on this
// surface (mandate.controller.js's agency-side handlers populate it) —
// narrower than the general type's `string | {...}` union.
export type AgencyMandate = PropertyMandate & {
  propertyId: { _id: string; name: string; slug: string; type?: string | undefined };
};

export interface StaffPropertyAssignment {
  staffId: string;
  assignedProperties: { _id: string; name: string; slug: string; type?: string | undefined }[];
}

export const agencyApi = {
  // GET /agency/me
  getMe: () => client.get<AgencyProfile>('/agency/me'),

  // PATCH /agency/me
  updateMe: (input: Record<string, unknown>) =>
    client.patch<AgencyProfile>('/agency/me', input),

  // GET /agency/me/portfolio
  getPortfolio: () => client.get<AgencyPortfolio>('/agency/me/portfolio'),

  // GET /agency/me/analytics
  getAnalytics: (params?: Record<string, string>) =>
    client.get<AgencyAnalytics>('/agency/me/analytics', { params }),

  // GET /agency/me/analytics/compare — per-property comparison, Document 13 §2.
  // Missing from an earlier pass of this file despite being in the route table.
  getCompareAnalytics: () =>
    client.get<AgencyPropertyComparison[]>('/agency/me/analytics/compare'),

  // GET /agency/mandates — small, bounded list (an agency's own mandates);
  // not paginated on the backend (mandateService.listMandatesForAgency
  // returns a bare array, unlike the paginate()-backed endpoints below).
  listMandates: (params?: { status?: string | undefined }) =>
    client.get<AgencyMandate[]>('/agency/mandates', { params }),

  // GET /agency/mandates/:id — agency side DOES have a detail route (unlike owner)
  getMandate: (id: string) => client.get<AgencyMandate>(`/agency/mandates/${id}`),

  // POST /agency/mandates — agency-initiated mandate request against an
  // EXISTING property (propertyDetails.existingPropertyId set, no other
  // propertyDetails fields). See onboardProperty below for the other path.
  createMandate: (input: Record<string, unknown>) =>
    client.post<{ mandate: AgencyMandate } & Record<string, unknown>>('/agency/mandates', input),

  // PATCH /agency/mandates/:id/accept — accept an owner-initiated offer
  acceptMandate: (id: string) =>
    client.patch<AgencyMandate>(`/agency/mandates/${id}/accept`),

  // GET /agency/properties — CORRECTED: this is not a bare property array.
  // agency.controller.js#listProperties literally delegates to
  // service.getPortfolio() — identical shape to getPortfolio() above. An
  // earlier pass of this file typed it as Record<string, unknown>[], which
  // would have thrown at the first `.properties.map(...)` call.
  listProperties: () => client.get<AgencyPortfolio>('/agency/properties'),

  // POST /agency/properties/onboard — creates the property AND the mandate
  // in one call (Document 13 §4's "onboard a brand-new client" path).
  // propertyDetails carries name/type/address/ownerFirstName/ownerLastName
  // — no existingPropertyId. Same response shape as createMandate above.
  onboardProperty: (input: Record<string, unknown>) =>
    client.post<{ mandate: AgencyMandate } & Record<string, unknown>>(
      '/agency/properties/onboard',
      input
    ),

  // POST /agency/properties/:id/enter
  // Returns a tenant-scoped token — delivered via redirect to Property
  // Operations Portal with the token in a URL query param.
  enterProperty: (id: string) =>
    client.post<AgencyEnterPropertyResponse>(`/agency/properties/${id}/enter`),

  // POST /agency/properties/:id/terminate-mandate
  terminateMandate: (propertyId: string, reason?: string) =>
    client.post<{ message: string }>(
      `/agency/properties/${propertyId}/terminate-mandate`,
      { reason }
    ),

  // GET /agency/me/staff — CORRECTED: paginated on the backend
  // (agency.service.js#listStaff uses the shared paginate() helper).
  listStaff: (params?: { page?: number | undefined; limit?: number | undefined }) =>
    client.getPaginated<AgencyStaffMember>('/agency/me/staff', { params }),

  // POST /agency/me/staff — invite-based, no password field. The backend
  // generates a random password and emails an accept-invite link; the form
  // for this should never collect or send a password.
  createStaff: (input: Record<string, unknown>) =>
    client.post<AgencyStaffMember>('/agency/me/staff', input),

  // GET /agency/me/staff/:id
  getStaff: (id: string) => client.get<AgencyStaffMember>(`/agency/me/staff/${id}`),

  // PATCH /agency/me/staff/:id
  updateStaff: (id: string, input: Record<string, unknown>) =>
    client.patch<AgencyStaffMember>(`/agency/me/staff/${id}`, input),

  // DELETE /agency/me/staff/:id
  deleteStaff: (id: string) =>
    client.delete<{ message: string }>(`/agency/me/staff/${id}`),

  // GET /agency/staff/:id/properties
  getStaffProperties: (id: string) =>
    client.get<StaffPropertyAssignment>(`/agency/staff/${id}/properties`),

  // PATCH /agency/staff/:id/properties — CORRECTED: body field is
  // `propertyIds`, not `assignedProperties` (verified against
  // mandate.validation.js#staffPropertyAssignSchema). The old field name
  // would have failed Zod validation silently mismatched against the
  // schema's own field-error names too, since `propertyIds` is what
  // VALIDATION_ERROR would report back.
  updateStaffProperties: (id: string, propertyIds: string[]) =>
    client.patch<StaffPropertyAssignment>(`/agency/staff/${id}/properties`, {
      propertyIds,
    }),

  // GET /agency/statements — CORRECTED: paginated, but with a hand-rolled
  // meta shape ({total,page,limit,pages}) that doesn't match the shared
  // paginate() utility's ({...,totalPages,hasNextPage,hasPrevPage}) —
  // verified directly against agency.controller.js#getStatements, which
  // builds its own meta object inline instead of using paginate(). Normalise
  // `pages` -> `totalPages` here so DataTable/Pagination (which read
  // `meta.totalPages`) work regardless of which shape a given endpoint sends.
  listStatements: async (params?: { page?: number | undefined; limit?: number | undefined; period?: string | undefined; status?: string | undefined }) => {
    const result = await client.getPaginated<AgencyStatement>('/agency/statements', { params });
    const rawMeta = result.meta as Pagination & { pages?: number };
    return {
      data: result.data,
      meta: { ...rawMeta, totalPages: rawMeta.totalPages ?? rawMeta.pages ?? 1 } as Pagination,
    };
  },

  // GET /agency/statements/:id/pdf — requires auth, so this can't be a bare
  // href (a plain anchor click sends no Authorization header). Returns an
  // object URL via an authenticated fetch; pass directly as DownloadButton's
  // href prop, which already supports href-as-async-function.
  getStatementPdfUrl: (id: string) => () => client.getBlobUrl(`/agency/statements/${id}/pdf`),

  // GET /agency/me/billing
  getBilling: () => client.get<AgencyBilling>('/agency/me/billing'),

  // GET /agency/me/billing/invoices — CONFIRMED BACKEND GAP: this route is
  // wired to the exact same controller function as getBilling() above
  // (agency.routes.js maps both to ctrl.getBilling), so it currently
  // returns the subscription record again, not a distinct invoice list.
  // Called here in case the backend fixes the wiring later; the Billing
  // page treats a response with no `invoices` array as "not available yet"
  // rather than assuming the shape.
  getBillingInvoices: () =>
    client.get<AgencyBilling & { invoices?: Record<string, unknown>[] }>(
      '/agency/me/billing/invoices'
    ),

  // GET/PATCH /agency/me/onboarding
  getOnboarding: () => client.get<AgencyOnboardingState>('/agency/me/onboarding'),
  updateOnboardingStep: (step: string, data: Record<string, unknown>) =>
    client.patch<AgencyOnboardingState>(`/agency/me/onboarding/${step}`, data),
};
