/**
 * Cache-key factory for the Property Operations Portal.
 * Every query key used in this app is defined here.
 * Real-time invalidation (useSocketEvent) references these same builders.
 */

export const dashboardKeys = {
  summary: () => ['dashboard', 'summary'] as const,
};

export const bookingKeys = {
  all:        ['bookings'] as const,
  list:       (filters: Record<string, unknown>) => ['bookings', 'list', filters] as const,
  detail:     (id: string) => ['bookings', 'detail', id] as const,
  folio:      (id: string) => ['bookings', id, 'folio'] as const,
  arrivals:   () => ['bookings', 'arrivals'] as const,
  departures: () => ['bookings', 'departures'] as const,
};

export const guestRegisterKeys = {
  all:    ['guestregister'] as const,
  byBooking: (bookingId: string) => ['guestregister', 'booking', bookingId] as const,
  list:   (filters?: Record<string, unknown>) => ['guestregister', 'list', filters ?? {}] as const,
};

export const roomKeys = {
  all:          ['rooms'] as const,
  list:         (filters?: Record<string, unknown>) => ['rooms', 'list', filters ?? {}] as const,
  detail:       (id: string) => ['rooms', 'detail', id] as const,
  statusBoard:  () => ['rooms', 'status-board'] as const,
  calendar:     (params: Record<string, unknown>) => ['rooms', 'calendar', params] as const,
  availability: (params: Record<string, unknown>) => ['rooms', 'availability', params] as const,
};

export const housekeepingKeys = {
  tasks:     (filters?: Record<string, unknown>) => ['housekeeping', 'tasks', filters ?? {}] as const,
  task:      (id: string) => ['housekeeping', 'task', id] as const,
  checklist: (taskType: string, roomId?: string) => ['housekeeping', 'checklist', taskType, roomId ?? null] as const,
  lostFound: () => ['housekeeping', 'lost-found'] as const,
  analytics: () => ['housekeeping', 'analytics'] as const,
};

export const folioKeys = {
  list:    (filters?: Record<string, unknown>) => ['folios', 'list', filters ?? {}] as const,
  detail:  (id: string) => ['folios', 'detail', id] as const,
  balance: (id: string) => ['folios', id, 'balance'] as const,
};

export const maintenanceKeys = {
  workOrders: (filters: Record<string, unknown>) => ['maintenance', 'work-orders', filters] as const,
  workOrder:  (id: string) => ['maintenance', 'work-order', id] as const,
  assets:     () => ['maintenance', 'assets'] as const,
  asset:      (id: string) => ['maintenance', 'asset', id] as const,
  schedules:  () => ['maintenance', 'schedules'] as const,
  analytics:  () => ['maintenance', 'analytics'] as const,
};

export const pricingKeys = {
  ratePlans:    () => ['pricing', 'rate-plans'] as const,
  ratePlan:     (id: string) => ['pricing', 'rate-plan', id] as const,
  dynamicRules: () => ['pricing', 'dynamic-rules'] as const,
};

export const promotionKeys = {
  list:   () => ['promotions'] as const,
  detail: (id: string) => ['promotions', id] as const,
  usage:  (id: string) => ['promotions', id, 'usage'] as const,
};

export const accessKeys = {
  visitors:      () => ['access', 'visitors'] as const,
  hostSearch:    (type: 'guest' | 'staff', q: string) => ['access', 'hosts', 'search', type, q] as const,
  visitorPolicy: () => ['access', 'visitor-policy'] as const,
};

export const rosterKeys = {
  all:              () => ['roster'] as const,
  roster:           (filters: Record<string, unknown>) => ['roster', filters] as const,
  timeclockEntries: () => ['timeclock', 'entries'] as const,
  labourCost:       () => ['roster', 'labour-cost'] as const,
};

export const hrKeys = {
  profile:          (staffId: string) => ['hr', 'profile', staffId] as const,
  documents:        (staffId: string) => ['hr', 'documents', staffId] as const,
  disciplinary:     (staffId: string) => ['hr', 'disciplinary', staffId] as const,
  performance:      (staffId: string) => ['hr', 'performance', staffId] as const,
  timesheets:       (period: string) => ['hr', 'timesheets', period] as const,
  timesheetExports: () => ['hr', 'timesheet-exports'] as const,
};

export const expenseKeys = {
  list:   () => ['expenses'] as const,
  detail: (id: string) => ['expenses', id] as const,
  floats: () => ['expenses', 'pettycash', 'floats'] as const,
  ledger: (id: string, params: Record<string, unknown>) => ['expenses', 'pettycash', 'floats', id, 'ledger', params] as const,
};

export const procurementKeys = {
  suppliers:       () => ['procurement', 'suppliers'] as const,
  supplier:        (id: string) => ['procurement', 'suppliers', id] as const,
  stockItems:      () => ['procurement', 'stock-items'] as const,
  purchaseOrders:  () => ['procurement', 'purchase-orders'] as const,
  purchaseOrder:   (id: string) => ['procurement', 'purchase-orders', id] as const,
  vendorContracts: () => ['procurement', 'vendor-contracts'] as const,
  vendorContract:  (id: string) => ['procurement', 'vendor-contracts', id] as const,
  restockConfig:   () => ['procurement', 'restock-config'] as const,
};

export const accountingKeys = {
  accounts:      () => ['accounting', 'ledger-accounts'] as const,
  journalList:   (params: Record<string, unknown>) => ['accounting', 'journal-entries', params] as const,
  journalEntry:  (id: string) => ['accounting', 'journal-entries', id] as const,
  trialBalance:  (params: Record<string, unknown>) => ['accounting', 'trial-balance', params] as const,
  nightAudits:   (params: Record<string, unknown>) => ['accounting', 'night-audits', params] as const,
  nightAudit:    (id: string) => ['accounting', 'night-audits', id] as const,
};

export const reportKeys = {
  occupancy:   (params: Record<string, unknown>) => ['reports', 'occupancy', params] as const,
  revenue:     (params: Record<string, unknown>) => ['reports', 'revenue', params] as const,
  revpar:      (params: Record<string, unknown>) => ['reports', 'revpar', params] as const,
  finance:     (params: Record<string, unknown>) => ['reports', 'finance', params] as const,
  bookings:    (params: Record<string, unknown>) => ['reports', 'bookings', params] as const,
  housekeeping:(params: Record<string, unknown>) => ['reports', 'housekeeping', params] as const,
  maintenance: (params: Record<string, unknown>) => ['reports', 'maintenance', params] as const,
  students:    (params: Record<string, unknown>) => ['reports', 'students', params] as const,
  nightAudit:  (date: string) => ['reports', 'night-audit', date] as const,
  // Restaurant / POS module (TAD 23 dashboard §3.6)
  restaurantSalesSummary:        (params: Record<string, unknown>) => ['reports', 'restaurant-sales-summary', params] as const,
  restaurantFoodCost:            (params: Record<string, unknown>) => ['reports', 'restaurant-food-cost', params] as const,
  restaurantShiftReconciliation: (params: Record<string, unknown>) => ['reports', 'restaurant-shift-reconciliation', params] as const,
  restaurantTabAging:            (params: Record<string, unknown>) => ['reports', 'restaurant-tab-aging', params] as const,
  restaurantSalesByStaff:        (params: Record<string, unknown>) => ['reports', 'restaurant-sales-by-staff', params] as const,
};

export const chatKeys = {
  channels:  () => ['staffchat', 'channels'] as const,
  messages:  (channelId: string) => ['staffchat', 'channels', channelId, 'messages'] as const,
  directory: () => ['staffchat', 'directory'] as const,
  members:   (channelId: string) => ['staffchat', 'channels', channelId, 'members'] as const,
};

export const staffKeys = {
  list:   () => ['staff', 'list'] as const,
  detail: (id: string) => ['staff', id] as const,
};

export const channelKeys = {
  ical: () => ['channels', 'ical'] as const,
};

export const supportKeys = {
  tickets: () => ['support', 'tickets'] as const,
  ticket:  (id: string) => ['support', 'ticket', id] as const,
};

export const guestMessagingKeys = {
  threads: (filters?: Record<string, unknown>) => ['messaging', 'threads', filters ?? {}] as const,
  thread:  (threadId: string) => ['messaging', 'threads', threadId] as const,
};

// ── Restaurant / POS module (TAD 23 dashboard §4) ────────────────────────────

export const outletKeys = {
  list:   (params?: Record<string, unknown>) => ['restaurant', 'outlets', params ?? {}] as const,
  detail: (id: string) => ['restaurant', 'outlets', id] as const,
};

export const menuKeys = {
  categories:     (outletId: string) => ['restaurant', 'menu', 'categories', outletId] as const,
  items:          (outletId: string, params?: Record<string, unknown>) =>
    ['restaurant', 'menu', 'items', outletId, params ?? {}] as const,
  itemDetail:     (id: string) => ['restaurant', 'menu', 'items', 'detail', id] as const,
};

export const tableKeys = {
  list: (outletId: string) => ['restaurant', 'tables', outletId] as const,
};

export const tabKeys = {
  list:   (params?: Record<string, unknown>) => ['restaurant', 'tabs', params ?? {}] as const,
  detail: (id: string) => ['restaurant', 'tabs', id] as const,
};

export const shiftKeys = {
  list:   (params?: Record<string, unknown>) => ['restaurant', 'shifts', params ?? {}] as const,
  detail: (id: string) => ['restaurant', 'shifts', id] as const,
};

export const tillKeys = {
  list: (params?: Record<string, unknown>) => ['restaurant', 'tills', params ?? {}] as const,
};
