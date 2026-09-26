import { authApi }       from './domains/auth';
import { bookingsApi }   from './domains/bookings';
import { tenantsApi }    from './domains/tenants';
import { ownerApi }      from './domains/owner';
import { agencyApi }     from './domains/agency';
import { platformApi }   from './domains/platform';
import { vettingApi }    from './domains/onboarding';
import { roomsApi }      from './domains/rooms';
import { housekeepingApi } from './domains/housekeeping';
import { studentHousingApi } from './domains/university';
import { maintenanceApi }  from './domains/maintenance';
import { foliosApi }       from './domains/folios';
import { accountingApi }   from './domains/accounting';
import { messagingApi }    from './domains/messaging';
import { contactApi, newsletterApi, mailboxApi } from './domains/public';
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
import {
  outletsApi,
  menuApi,
  tablesApi,
  tabsApi,
  shiftsApi,
  tillsApi,
  posStaffApi,
  restaurantReportsApi,
} from './domains/restaurant';

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
  studentHousing: studentHousingApi,
  maintenance:   maintenanceApi,
  folios:        foliosApi,
  accounting:    accountingApi,
  messaging:     messagingApi,
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

  // Restaurant / POS module (TAD 23) — management/oversight dashboard only;
  // order-taking, payment, and the kitchen queue live on separate mobile apps.
  restaurantOutlets:  outletsApi,
  restaurantMenu:     menuApi,
  restaurantTables:   tablesApi,
  restaurantTabs:     tabsApi,
  restaurantShifts:   shiftsApi,
  restaurantTills:    tillsApi,
  posStaff:           posStaffApi,
  restaurantReports:  restaurantReportsApi,

  // ── Customer Portal (Next.js — my.stayos.co.za) ───────────────────────
  discovery:     discoveryApi,
  customer:      customerApi,
  notifications: notificationsApi,
  reviews:       reviewsApi,
  support:       supportApi,
  university:    universityApi,
  payments:      paymentsApi,

  // ── Marketing site (Next.js — apps/public / stayos.co.za) & mailbox ──
  contact:       contactApi,
  newsletter:    newsletterApi,
  mailbox:       mailboxApi,
} as const;

export { ApiError, setTokenGetter, setTenantIdGetter, setRefreshCallback } from './client';
export type { PaginatedResult } from './client';
export type {
  AgencyMandate,
  AgencyEnterPropertyResponse,
  StaffPropertyAssignment,
} from './domains/agency';
export type {
  Room,
  CalendarRoom,
  CalendarBooking,
  CalendarBlock,
  CalendarMatrixResponse,
  CalendarMatrixParams,
} from './domains/rooms';
export type { RatePlanSummary, RatePlan, PricingRule, SeasonalRate, Promotion, PromotionUsage, PromotionUsageBooking } from './domains/property-ops';
export { RATE_PLAN_TYPES, RULE_CONDITIONS } from './domains/property-ops';
export { HOUSEKEEPING_CATEGORY_LABELS, housekeepingCategoryOf } from './domains/housekeeping';
export type { VisitorLogEntry, HostSearchResult, VisitorPolicy } from './domains/property-ops';
export type {
  ChatChannel,
  ChatMessage,
  ChatParticipant,
  ChatDirectoryEntry,
  ChatChannelMember,
  ChatWrappedKey,
} from './domains/property-ops';
export type {
  HousekeepingTask,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
  HousekeepingCategory,
  HousekeepingTaskFilters,
  ChecklistItem,
  ResolvedChecklist,
  CreateHousekeepingTaskInput,
} from './domains/housekeeping';
export type { Folio, FolioPayment, FolioLineItem, FolioBalance, FolioListEntry, FolioListFilters } from './domains/folios';
export type {
  StudentApplication,
  StudentApplicationStatus,
  UpdateApplicationStatusInput,
  Lease,
  Announcement,
} from './domains/university';
export type { WorkOrder, Asset, MaintenanceSchedule, MaintenanceAnalytics } from './domains/maintenance';
export type { IcalSubscription, IcalSyncResult } from './domains/property-ops';
export type {
  Shift, TimeClockEntry, LabourCostRow, StaffMember,
  StaffHRProfile, StaffDocument, DisciplinaryRecord, PerformanceReview,
  TimesheetPreviewRow, TimesheetExportRecord,
} from './domains/property-ops';
export type { LedgerAccount, JournalEntryInput, JournalLineInput, OtherIncomeEntryInput } from './domains/accounting';
export type { SubmitExpenseInput } from './domains/property-ops';
export type { GuestRegisterEntry, GuestRegisterListEntry, GuestRegisterCaptureInput } from './domains/property-ops';
export type {
  GuestThreadDTO,
  GuestThreadMessageDTO,
  GuestThreadMemberDTO,
  GuestThreadWrappedKeyDTO,
} from './domains/customer';
export type { OwnerMandate, OwnerMandateAcceptResponse } from './domains/owner';
export type { TenantAddonSubscription } from '@stayos/types';
export type {
  Outlet,
  OutletSettings,
  MenuCategory,
  MenuItem,
  ModifierGroup,
  ModifierOption,
  RecipeIngredient,
  StockItemOption,
  RestaurantTable,
  PosTab,
  PosDiscount,
  PosServiceCharge,
  PosOrder,
  PosOrderItem,
  SelectedModifier,
  PosPayment,
  CashierShift,
  CashierShiftSalesSummary,
  PosTill,
  RestaurantSalesSummary,
  RestaurantFoodCost,
  RestaurantShiftReconciliation,
  RestaurantTabAgingEntry,
  RestaurantSalesByStaff,
} from './domains/restaurant';
