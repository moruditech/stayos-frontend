/**
 * Property Operations domains: pricing, promotions, access, roster/timeclock,
 * HR, expenses, procurement, reports, staffchat, channels.
 *
 * Route paths confirmed against the backend route files and route mounting
 * in src/routes/index.js.
 *
 * NOTE: /staff routes mount the roster module — so timeclock and roster
 * are under /staff/*, not /roster/*. Confirmed in routes/index.js.
 */
import { client } from '../client';

// ── Pricing ────────────────────────────────────────────────────────────────────

// Matches RatePlan.model.js's real fields — just enough for a picker/filter.
// NOTE: the rate-plans management page (pricing/rate-plans) posts a
// different, non-matching shape (ratePerNight/description/isDefault) that
// isn't on this model at all — a separate, pre-existing bug in that page's
// create form, not touched here. This type only covers what listing needs.
export interface RatePlanSummary {
  _id: string;
  name: string;
  code: string;
  type: string;
  isActive: boolean;
}

export const pricingApi = {
  listRatePlans: () => client.get<RatePlanSummary[]>('/pricing/rate-plans'),
  createRatePlan: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/pricing/rate-plans', input),
  getRatePlan: (id: string) => client.get<Record<string, unknown>>(`/pricing/rate-plans/${id}`),
  updateRatePlan: (id: string, input: Record<string, unknown>) =>
    client.patch<Record<string, unknown>>(`/pricing/rate-plans/${id}`, input),
  deleteRatePlan: (id: string) => client.delete<{ message: string }>(`/pricing/rate-plans/${id}`),
  cloneRatePlan: (id: string) =>
    client.post<Record<string, unknown>>(`/pricing/rate-plans/${id}/clone`),
  getDynamicRules: () => client.get<Record<string, unknown>>('/pricing/dynamic-rules'),
  updateDynamicRules: (input: Record<string, unknown>) =>
    client.patch<Record<string, unknown>>('/pricing/dynamic-rules', input),
  calculate: (params: Record<string, unknown>) =>
    client.get<{ ratePerNight: number; nights: number; subTotal: number }>('/pricing/calculate', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
};

// ── Promotions ─────────────────────────────────────────────────────────────────
// Backend routes/schemas: src/modules/promotions/{promotions.routes,promotions.validation}.js

// Matches Promotion.model.js's real fields.
export interface Promotion {
  _id: string;
  code: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_night';
  value: number;
  minBookingValue: number;
  // Actual Room _ids this promotion applies to — empty/absent = all rooms.
  applicableRoomIds?: string[];
  // 0=Sunday..6=Saturday — empty/absent = every day within validFrom/validTo.
  daysOfWeek?: number[];
  validFrom: string;
  validTo: string;
  maxUses?: number;
  maxUsesPerCustomer: number;
  usedCount: number;
  isActive: boolean;
}

// GET /promotions/:id/usage — src/modules/promotions/promotions.service.js#getUsage
export interface PromotionUsageBooking {
  _id: string;
  confirmationNumber: string;
  customerId?: { _id: string; firstName: string; lastName: string; email: string } | null;
  totalAmount: number;
  discountAmount: number;
  createdAt: string;
}

export interface PromotionUsage {
  code: string;
  usedCount: number;
  maxUses?: number;
  maxUsesPerCustomer: number;
  bookings: PromotionUsageBooking[];
  totalDiscountGiven: number;
}

export const promotionsApi = {
  list: () => client.get<Promotion[]>('/promotions'),
  create: (input: Record<string, unknown>) =>
    client.post<Promotion>('/promotions', input),
  get: (id: string) => client.get<Promotion>(`/promotions/${id}`),
  update: (id: string, input: Record<string, unknown>) =>
    client.patch<Promotion>(`/promotions/${id}`, input),
  delete: (id: string) => client.delete<{ message: string }>(`/promotions/${id}`),
  getUsage: (id: string) => client.get<PromotionUsage>(`/promotions/${id}/usage`),
  // Customer-scope only — a property-staff (tenant scope) session will get a 403
  // from this route. Staff-facing code should use `lookup` instead.
  validate: (code: string) =>
    client.get<{ valid: boolean; promotion?: Promotion }>(`/promotions/${code}/validate`),
  // Tenant-scope: resolves a human-readable code to a promotion for staff use
  // (e.g. the new-booking form), returning the ObjectId the booking endpoint expects.
  lookup: (code: string, subTotal?: number) =>
    client.get<{ _id: string; description?: string; value: number; type: string }>('/promotions/lookup', {
      params: { code, subTotal } as Record<string, string | number | boolean | undefined>,
    }),
};

// ── Access Control ─────────────────────────────────────────────────────────────
// Backend routes/schemas: src/modules/access/{access.routes,access.validation}.js

// Matches VisitorLog.model.js's real fields — checkedInAt/checkedOutAt
// (not checkInTime/checkOutTime), hostName/hostRoomNumber snapshots rather
// than a free-text host string.
export interface VisitorLogEntry {
  _id: string;
  visitorName: string;
  idCaptureDeclined: boolean;
  vehicleReg?: string;
  hostId: string;
  hostModel: 'Customer' | 'PropertyStaff';
  hostName: string;
  hostRoomNumber?: string | null;
  purpose: 'guest' | 'delivery' | 'contractor' | 'family' | 'other';
  visitType: 'day_visit' | 'sleepover';
  consentGiven: boolean;
  checkedInAt: string;
  checkedOutAt?: string | null;
  checkedInBy?: { firstName: string; lastName: string } | string;
  gateUsed?: string;
  notes?: string;
  overstayAlertSentAt?: string | null;
}

// GET /access/hosts/search?type=guest|staff&q=... result shape.
// disambiguated is true when another result in the same response shares this
// guest's name — the frontend appends the room number to the visible label
// in that case so the two are told apart.
export interface HostSearchResult {
  hostType: 'guest' | 'staff';
  hostId: string;
  hostBookingId?: string;
  label: string;
  sublabel?: string;
  disambiguated?: boolean;
}

export interface VisitorPolicy {
  enforceVisitingHours: boolean;
  visitingHoursStart: string;   // HH:mm, 24-hour, tenant-local
  visitingHoursEnd: string;
  maxDayVisitHours: number;
  maxSleepoverHours: number;
  overstayAlertsEnabled: boolean;
}

export const accessApi = {
  listVisitors: (params?: Record<string, unknown>) =>
    client.get<VisitorLogEntry[]>('/access/visitors', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  checkInVisitor: (input: Record<string, unknown>) =>
    client.post<VisitorLogEntry>('/access/visitors', input),
  checkOutVisitor: (id: string) =>
    client.patch<VisitorLogEntry>(`/access/visitors/${id}/check-out`),
  // Debounce this call client-side and only fire once q.length >= 2 — the
  // backend also enforces the 2-char floor (hostSearchQuerySchema).
  searchHosts: (type: 'guest' | 'staff', q: string) =>
    client.get<HostSearchResult[]>('/access/hosts/search', {
      params: { type, q } as Record<string, string | number | boolean | undefined>,
    }),
  getVisitorPolicy: () => client.get<VisitorPolicy>('/access/visitor-policy'),
  updateVisitorPolicy: (input: Partial<VisitorPolicy>) =>
    client.patch<VisitorPolicy>('/access/visitor-policy', input),
  generateCode: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/access/codes', input),
  getCodesForBooking: (bookingId: string) =>
    client.get<Record<string, unknown>[]>(`/access/codes/booking/${bookingId}`),
  revokeCode: (id: string) => client.delete<{ message: string }>(`/access/codes/${id}`),
};

// ── Roster & Timeclock — mounted at /staff (NOT /roster) ─────────────────────

export const rosterApi = {
  getRoster: (params?: Record<string, unknown>) =>
    client.get<Record<string, unknown>[]>('/staff/roster', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  createShift: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/staff/roster', input),
  cancelShift: (id: string) =>
    client.delete<{ message: string }>(`/staff/roster/${id}`),
  requestSwap: (id: string, input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>(`/staff/roster/${id}/swap`, input),
  approveSwap: (id: string) =>
    client.patch<Record<string, unknown>>(`/staff/roster/${id}/swap/approve`),
  clockIn: (input?: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/staff/timeclock/clock-in', input),
  clockOut: (input?: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/staff/timeclock/clock-out', input),
  getTimeclockEntries: (params?: Record<string, unknown>) =>
    client.get<Record<string, unknown>[]>('/staff/timeclock/entries', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  giveBiometricConsent: () =>
    client.post<{ message: string }>('/staff/timeclock/biometric-consent'),
  withdrawBiometricConsent: () =>
    client.delete<{ message: string }>('/staff/timeclock/biometric-consent'),
  getLabourCost: (params?: Record<string, unknown>) =>
    client.get<Record<string, unknown>>('/staff/labour-cost', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
};

// ── HR ────────────────────────────────────────────────────────────────────────

export const hrApi = {
  getProfile: (staffId: string) =>
    client.get<Record<string, unknown>>(`/hr/profiles/${staffId}`),
  createProfile: (staffId: string, input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>(`/hr/profiles/${staffId}`, input),
  updateProfile: (staffId: string, input: Record<string, unknown>) =>
    client.patch<Record<string, unknown>>(`/hr/profiles/${staffId}`, input),
  probationReview: (staffId: string, input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>(`/hr/profiles/${staffId}/probation/review`, input),
  listDocuments: (staffId: string) =>
    client.get<Record<string, unknown>[]>(`/hr/documents/${staffId}`),
  uploadDocument: (staffId: string, formData: FormData) =>
    client.post<Record<string, unknown>>(`/hr/documents/${staffId}`, formData),
  deleteDocument: (id: string) =>
    client.delete<{ message: string }>(`/hr/documents/${id}`),
  listDisciplinary: (staffId: string) =>
    client.get<Record<string, unknown>[]>(`/hr/disciplinary/${staffId}`),
  createDisciplinary: (staffId: string, input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>(`/hr/disciplinary/${staffId}`, input),
  acknowledgeDisciplinary: (id: string) =>
    client.patch<Record<string, unknown>>(`/hr/disciplinary/${id}/acknowledge`),
  getTimesheets: (params?: Record<string, unknown>) =>
    client.get<Record<string, unknown>[]>('/hr/timesheets', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  exportTimesheets: (input: Record<string, unknown>) =>
    client.post<{ exportId: string }>('/hr/timesheets/export', input),
  listTimesheetExports: () =>
    client.get<Record<string, unknown>[]>('/hr/timesheets/exports'),
};

// ── Expenses ──────────────────────────────────────────────────────────────────

export const expensesApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<Record<string, unknown>[]>('/expenses', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  submit: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/expenses', input),
  get: (id: string) => client.get<Record<string, unknown>>(`/expenses/${id}`),
  approve: (id: string) =>
    client.patch<Record<string, unknown>>(`/expenses/${id}/approve`),
  reject: (id: string, reason: string) =>
    client.patch<Record<string, unknown>>(`/expenses/${id}/reject`, { reason }),
  reimburse: (id: string) =>
    client.patch<Record<string, unknown>>(`/expenses/${id}/reimburse`),
  listFloats: () =>
    client.get<Record<string, unknown>[]>('/expenses/pettycash/floats'),
  createFloat: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/expenses/pettycash/floats', input),
  getFloatLedger: (id: string, params?: Record<string, unknown>) =>
    client.get<Record<string, unknown>>(`/expenses/pettycash/floats/${id}/ledger`, {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  reconcileFloat: (id: string, input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>(`/expenses/pettycash/floats/${id}/reconcile`, input),
};

// ── Procurement ───────────────────────────────────────────────────────────────

export const procurementApi = {
  listSuppliers: () =>
    client.get<Record<string, unknown>[]>('/procurement/suppliers'),
  createSupplier: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/procurement/suppliers', input),
  getSupplier: (id: string) =>
    client.get<Record<string, unknown>>(`/procurement/suppliers/${id}`),
  updateSupplier: (id: string, input: Record<string, unknown>) =>
    client.patch<Record<string, unknown>>(`/procurement/suppliers/${id}`, input),
  deleteSupplier: (id: string) =>
    client.delete<{ message: string }>(`/procurement/suppliers/${id}`),
  listStockItems: () =>
    client.get<Record<string, unknown>[]>('/procurement/stock-items'),
  createStockItem: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/procurement/stock-items', input),
  updateStockItem: (id: string, input: Record<string, unknown>) =>
    client.patch<Record<string, unknown>>(`/procurement/stock-items/${id}`, input),
  adjustStock: (id: string, input: { quantity: number; reason: string }) =>
    client.post<Record<string, unknown>>(`/procurement/stock-items/${id}/adjust`, input),
  getLowStock: () =>
    client.get<Record<string, unknown>[]>('/procurement/stock-items/low-stock'),
  listPurchaseOrders: () =>
    client.get<Record<string, unknown>[]>('/procurement/purchase-orders'),
  createPurchaseOrder: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/procurement/purchase-orders', input),
  getPurchaseOrder: (id: string) =>
    client.get<Record<string, unknown>>(`/procurement/purchase-orders/${id}`),
  updatePurchaseOrder: (id: string, input: Record<string, unknown>) =>
    client.patch<Record<string, unknown>>(`/procurement/purchase-orders/${id}`, input),
  sendPurchaseOrder: (id: string) =>
    client.post<Record<string, unknown>>(`/procurement/purchase-orders/${id}/send`),
  receivePurchaseOrder: (id: string) =>
    client.post<Record<string, unknown>>(`/procurement/purchase-orders/${id}/receive`),
  listVendorContracts: () =>
    client.get<Record<string, unknown>[]>('/procurement/vendor-contracts'),
  createVendorContract: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/procurement/vendor-contracts', input),
  getVendorContract: (id: string) =>
    client.get<Record<string, unknown>>(`/procurement/vendor-contracts/${id}`),
  updateVendorContract: (id: string, input: Record<string, unknown>) =>
    client.patch<Record<string, unknown>>(`/procurement/vendor-contracts/${id}`, input),
  deleteVendorContract: (id: string) =>
    client.delete<{ message: string }>(`/procurement/vendor-contracts/${id}`),
  renewVendorContract: (id: string, input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>(`/procurement/vendor-contracts/${id}/renew`, input),
};

// ── Reports ───────────────────────────────────────────────────────────────────

export const reportsApi = {
  getRevenue: (params?: Record<string, unknown>) =>
    client.get<Record<string, unknown>>('/reports/revenue', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  getOccupancy: (params?: Record<string, unknown>) =>
    client.get<Record<string, unknown>>('/reports/occupancy', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  getBookings: (params?: Record<string, unknown>) =>
    client.get<Record<string, unknown>>('/reports/bookings', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  getHousekeeping: (params?: Record<string, unknown>) =>
    client.get<Record<string, unknown>>('/reports/housekeeping', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  getMaintenance: (params?: Record<string, unknown>) =>
    client.get<Record<string, unknown>>('/reports/maintenance', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  getFinance: (params?: Record<string, unknown>) =>
    client.get<Record<string, unknown>>('/reports/finance', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  // Student-financial report requires property:* (different from other reports)
  getStudentsFinancial: (params?: Record<string, unknown>) =>
    client.get<Record<string, unknown>>('/reports/students/financial', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  getNightAudit: (date: string) =>
    client.get<Record<string, unknown>>(`/reports/night-audit/${date}`),
  export: (type: string, params?: Record<string, unknown>) =>
    client.get<{ url: string }>(`/reports/export/${type}`, {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
};

// ── Staff Chat ─────────────────────────────────────────────────────────────────
// Confirmed against src/modules/staffchat/*.js. End-to-end encrypted: message
// bodies never travel as plaintext — see ChatMessage.ciphertext/iv and
// @stayos/crypto, which does the actual encrypt/decrypt in the browser. This
// api-client layer only ever moves opaque envelopes; it has no crypto in it.

export interface ChatParticipant {
  _id: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface ChatChannel {
  _id: string;
  type: 'department' | 'direct' | 'property_wide' | 'group';
  department: string | null;
  name: string; // always a display-ready label — department label, "All Staff", DM, or the group's name
  participants: ChatParticipant[]; // populated for 'direct'/'group'; empty for 'department'/'property_wide'
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Still-encrypted preview of the most recent message — decrypt client-side
  // if the channel key is already cached (@stayos/crypto), else show a
  // placeholder like "Encrypted message".
  lastMessage: { _id: string; ciphertext: string; iv: string; senderId: string; type: string; createdAt: string } | null;
  unreadCount: number;
}

export interface ChatMessage {
  _id: string;
  channelId: string;
  senderId: { _id: string; firstName: string; lastName: string; role?: string };
  type: 'message' | 'announcement' | 'handover_note';
  ciphertext: string;
  iv: string;
  attachments: { url: string; name: string }[];
  isPinned: boolean;
  handoverDate?: string;
  readBy: string[];
  createdAt: string;
}

export interface ChatDirectoryEntry {
  _id: string;
  firstName: string;
  lastName: string;
  role: string;
  departments: string[];
  hasKey: boolean; // has this person published an E2EE public key yet?
}

export interface ChatChannelMember {
  staffId: string;
  firstName: string;
  lastName: string;
  role: string;
  publicKey: JsonWebKey | null;
}

export interface ChatWrappedKey {
  memberId: string;
  wrappedKey: string;
  iv: string;
  ephemeralPublicKey: JsonWebKey;
}

export const staffchatApi = {
  // Who can I message? Any active colleague — not gated behind the
  // staff:manage HR roster permission the way staffApi.list() is.
  getDirectory: () => client.get<ChatDirectoryEntry[]>('/staffchat/directory'),

  getMyChannels: () => client.get<ChatChannel[]>('/staffchat/channels'),
  getOrCreateDM: (targetStaffId: string) =>
    client.post<ChatChannel>('/staffchat/channels/direct', { targetStaffId }),
  createGroup: (input: { name: string; memberIds: string[]; keys?: ChatWrappedKey[] }) =>
    client.post<ChatChannel>('/staffchat/channels/group', input),
  updateGroup: (channelId: string, input: { name?: string; addMemberIds?: string[]; removeMemberIds?: string[] }) =>
    client.patch<ChatChannel>(`/staffchat/channels/${channelId}`, input),

  getMessages: (channelId: string, params?: { page?: number; limit?: number }) =>
    client.getPaginated<ChatMessage>(`/staffchat/channels/${channelId}/messages`, {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  sendMessage: (
    channelId: string,
    input: { ciphertext: string; iv: string; type?: ChatMessage['type']; attachments?: ChatMessage['attachments']; handoverDate?: string }
  ) => client.post<ChatMessage>(`/staffchat/channels/${channelId}/messages`, input),
  pinMessage: (messageId: string, isPinned: boolean) =>
    client.patch<ChatMessage>(`/staffchat/messages/${messageId}/pin`, { isPinned }),
  markRead: (messageId: string) =>
    client.patch<ChatMessage>(`/staffchat/messages/${messageId}/read`),
  getHandover: (department: string) =>
    client.get<ChatMessage | null>('/staffchat/handover', { params: { department } }),

  // ── End-to-end encryption ──────────────────────────────────────────────────
  // The server only stores/relays opaque blobs here — see StaffChannelKey.model.js
  // and @stayos/crypto for what actually happens to the key material.
  setMyPublicKey: (publicKey: JsonWebKey) =>
    client.put<{ publicKey: JsonWebKey; publicKeyUpdatedAt: string }>('/staffchat/keys/me', { publicKey }),
  setKeyBackup: (input: { salt: string; iv: string; ciphertext: string }) =>
    client.post<{ updatedAt: string }>('/staffchat/keys/me/backup', input),
  getKeyBackup: () =>
    client.get<{ salt: string; iv: string; ciphertext: string; updatedAt: string } | null>('/staffchat/keys/me/backup'),

  getChannelMembers: (channelId: string) =>
    client.get<{ members: ChatChannelMember[]; channelHasKey: boolean }>(`/staffchat/channels/${channelId}/members`),
  getMyChannelKey: (channelId: string) =>
    client.get<ChatWrappedKey | null>(`/staffchat/channels/${channelId}/key`),
  publishChannelKeys: (channelId: string, wraps: ChatWrappedKey[], bootstrap?: boolean) =>
    client.post<{ updated: number }>(`/staffchat/channels/${channelId}/keys`, { wraps, bootstrap }),
};

// ── Channels (iCal sync) ──────────────────────────────────────────────────────

export const channelsApi = {
  // Channel management routes are under /channels/ical/subscriptions/*
  // Confirmed against src/modules/channels/ical.routes.js.
  list: () => client.get<Record<string, unknown>[]>('/channels/ical/subscriptions'),
  connect: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/channels/ical/subscriptions', input),
  sync: (id: string) =>
    client.post<{ message: string }>(`/channels/ical/subscriptions/${id}/sync-now`),
  disconnect: (id: string) =>
    client.delete<{ message: string }>(`/channels/ical/subscriptions/${id}`),
};

// ── Guest Register (Property Ops) ────────────────────────────────────────────
// Backend routes: src/modules/guestregister/guestregister.routes.js
// Check-in is blocked with a 422 (GUEST_REGISTER_REQUIRED) until an entry
// exists for the booking — see stayos-audit-report.md G-02.

export interface GuestRegisterEntry {
  _id: string;
  bookingId: string;
  fullName: string;
  documentType: 'sa_id' | 'passport' | 'other';
  residenceStatus: string;
  nationality: string;
  residentialAddress: string;
  checkInAt: string;
  capturedVia: string;
}

export interface GuestRegisterCaptureInput {
  fullName: string;
  idOrPassportNumber: string;
  documentType: 'sa_id' | 'passport' | 'other';
  residenceStatus: string;
  nationality: string;
  residentialAddress: string;
  signatureData: string; // base64
  idDocument: File;
}

export const guestregisterApi = {
  // GET /guestregister/booking/:bookingId — null if no entry exists yet
  getByBooking: (bookingId: string) =>
    client.get<GuestRegisterEntry | null>(`/guestregister/booking/${bookingId}`),

  // POST /guestregister/:bookingId — multipart (idDocument file + form fields)
  capture: (bookingId: string, input: GuestRegisterCaptureInput) => {
    const form = new FormData();
    form.append('idDocument', input.idDocument);
    form.append('fullName', input.fullName);
    form.append('idOrPassportNumber', input.idOrPassportNumber);
    form.append('documentType', input.documentType);
    form.append('residenceStatus', input.residenceStatus);
    form.append('nationality', input.nationality);
    form.append('residentialAddress', input.residentialAddress);
    form.append('signatureData', input.signatureData);
    return client.post<GuestRegisterEntry>(`/guestregister/${bookingId}`, form);
  },

  list: (params?: { from?: string; to?: string; page?: number; limit?: number }) =>
    client.get<GuestRegisterEntry[]>('/guestregister', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  export: (params?: { from?: string; to?: string }) =>
    client.get<GuestRegisterEntry[]>('/guestregister/export', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  getDocumentUrl: (entryId: string) =>
    client.get<{ url: string }>(`/guestregister/${entryId}/document`),
};

// ── Tenant Staff ──────────────────────────────────────────────────────────────
// Mounted at /properties/me/staff (tenants routes)

export interface StaffMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  grantedPermissions: string[];
  deniedPermissions: string[];
  createdAt: string;
}

export const staffApi = {
  list: () => client.get<StaffMember[]>('/properties/me/staff'),
  create: (input: Partial<StaffMember> & { password: string }) =>
    client.post<StaffMember>('/properties/me/staff', input),
  get: (id: string) => client.get<StaffMember>(`/properties/me/staff/${id}`),
  update: (id: string, input: Partial<StaffMember>) =>
    client.patch<StaffMember>(`/properties/me/staff/${id}`, input),
  delete: (id: string) =>
    client.delete<{ message: string }>(`/properties/me/staff/${id}`),
  updatePermissions: (id: string, input: { grantedPermissions: string[]; deniedPermissions: string[] }) =>
    client.patch<StaffMember>(`/properties/me/staff/${id}/permissions`, input),
};
