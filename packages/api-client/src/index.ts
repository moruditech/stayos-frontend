import { authApi }       from './domains/auth';
import { bookingsApi }   from './domains/bookings';
import { tenantsApi }    from './domains/tenants';
import { ownerApi }      from './domains/owner';
import { agencyApi }     from './domains/agency';
import { platformApi }   from './domains/platform';
import { vettingApi }    from './domains/onboarding';
import { roomsApi }      from './domains/rooms';
import { housekeepingApi } from './domains/housekeeping';
import { maintenanceApi }  from './domains/maintenance';
import { foliosApi }       from './domains/folios';
import {
  pricingApi,
  promotionsApi,
  accessApi,
  rosterApi,
  hrApi,
  expensesApi,
  procurementApi,
  reportsApi,
  staffchatApi,
  channelsApi,
  staffApi,
  guestregisterApi,
} from './domains/property-ops';
import {
  discoveryApi,
  customerApi,
  notificationsApi,
  reviewsApi,
  supportApi,
  universityApi,
  paymentsApi,
} from './domains/customer';
import { newsletterApi, contactApi, mailboxApi } from './domains/public';

export const api = {
  // ── Cross-portal auth ──────────────────────────────────────────────────
  auth:          authApi,

  // ── Platform Admin (Vite — admin.stayos.co.za) ────────────────────────
  platform:      platformApi,
  vetting:       vettingApi,

  // ── Agency Portal (Vite — agency.stayos.co.za) ────────────────────────
  agency:        agencyApi,

  // ── Owner Portal (Next.js — owners.stayos.co.za) ──────────────────────
  owner:         ownerApi,

  // ── Property Operations Portal (Next.js — app.stayos.co.za) ──────────
  tenants:       tenantsApi,
  bookings:      bookingsApi,
  rooms:         roomsApi,
  housekeeping:  housekeepingApi,
  maintenance:   maintenanceApi,
  folios:        foliosApi,
  pricing:       pricingApi,
  promotions:    promotionsApi,
  access:        accessApi,
  roster:        rosterApi,
  hr:            hrApi,
  expenses:      expensesApi,
  procurement:   procurementApi,
  reports:       reportsApi,
  staffchat:     staffchatApi,
  channels:      channelsApi,
  staff:         staffApi,
  guestregister: guestregisterApi,

  // ── Customer Portal (Next.js — my.stayos.co.za) ───────────────────────
  discovery:     discoveryApi,
  customer:      customerApi,
  notifications: notificationsApi,
  reviews:       reviewsApi,
  support:       supportApi,
  university:    universityApi,
  payments:      paymentsApi,

  // ── Public marketing site (Next.js — stayos.co.za) ─────────────────────
  newsletter:    newsletterApi,
  contact:       contactApi,
  mailbox:       mailboxApi,
} as const;

export { ApiError, setTokenGetter, setTenantIdGetter, setRefreshCallback } from './client';
export type { PaginatedResult } from './client';
export type {
  AgencyMandate,
  AgencyEnterPropertyResponse,
  StaffPropertyAssignment,
} from './domains/agency';
