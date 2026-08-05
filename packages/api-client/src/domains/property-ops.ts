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

export const pricingApi = {
  listRatePlans: () => client.get<Record<string, unknown>[]>('/pricing/rate-plans'),
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
    client.get<{ rate: number; breakdown: Record<string, number> }>('/pricing/calculate', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
};

// ── Promotions ─────────────────────────────────────────────────────────────────

export const promotionsApi = {
  list: () => client.get<Record<string, unknown>[]>('/promotions'),
  create: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/promotions', input),
  get: (id: string) => client.get<Record<string, unknown>>(`/promotions/${id}`),
  update: (id: string, input: Record<string, unknown>) =>
    client.patch<Record<string, unknown>>(`/promotions/${id}`, input),
  delete: (id: string) => client.delete<{ message: string }>(`/promotions/${id}`),
  getUsage: (id: string) => client.get<Record<string, unknown>>(`/promotions/${id}/usage`),
  validate: (code: string) =>
    client.get<{ valid: boolean; promotion?: Record<string, unknown> }>(`/promotions/${code}/validate`),
};

// ── Access Control ─────────────────────────────────────────────────────────────

export const accessApi = {
  listVisitors: (params?: Record<string, unknown>) =>
    client.get<Record<string, unknown>[]>('/access/visitors', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  checkInVisitor: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/access/visitors', input),
  checkOutVisitor: (id: string) =>
    client.patch<Record<string, unknown>>(`/access/visitors/${id}/check-out`),
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
  getFloatLedger: (id: string) =>
    client.get<Record<string, unknown>>(`/expenses/pettycash/floats/${id}/ledger`),
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

export interface ChatChannel {
  _id: string;
  name?: string;
  type: 'direct' | 'group';
  participants: { _id: string; firstName: string; lastName: string }[];
  lastMessage?: { text: string; createdAt: string };
  unreadCount?: number;
}

export interface ChatMessage {
  _id: string;
  channelId: string;
  senderId: { _id: string; firstName: string; lastName: string };
  text: string;
  pinned: boolean;
  readBy: string[];
  createdAt: string;
}

export const staffchatApi = {
  getMyChannels: () => client.get<ChatChannel[]>('/staffchat/channels'),
  getOrCreateDM: (recipientId: string) =>
    client.post<ChatChannel>('/staffchat/channels/direct', { recipientId }),
  getMessages: (channelId: string, params?: Record<string, unknown>) =>
    client.get<ChatMessage[]>(`/staffchat/channels/${channelId}/messages`, {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  sendMessage: (channelId: string, text: string) =>
    client.post<ChatMessage>(`/staffchat/channels/${channelId}/messages`, { text }),
  pinMessage: (messageId: string) =>
    client.patch<ChatMessage>(`/staffchat/messages/${messageId}/pin`),
  markRead: (messageId: string) =>
    client.patch<ChatMessage>(`/staffchat/messages/${messageId}/read`),
  getHandover: () => client.get<Record<string, unknown>>('/staffchat/handover'),
};

// ── Channels (iCal sync) ──────────────────────────────────────────────────────

export const channelsApi = {
  // Channel management routes are under /channels/ical/*
  // Specific endpoints depend on the ical.routes.js implementation.
  // The module handles both import and export configuration.
  list: () => client.get<Record<string, unknown>[]>('/channels/ical'),
  connect: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/channels/ical', input),
  sync: (id: string) =>
    client.post<{ message: string }>(`/channels/ical/${id}/sync`),
  disconnect: (id: string) =>
    client.delete<{ message: string }>(`/channels/ical/${id}`),
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
