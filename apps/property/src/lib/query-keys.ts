/**
 * Cache-key factory for the Property Operations Portal.
 * Every query key used in this app is defined here.
 * Real-time invalidation (useSocketEvent) references these same builders.
 */

export const dashboardKeys = {
  summary: () => ['dashboard', 'summary'] as const,
};

export const bookingKeys = {
  all:    ['bookings'] as const,
  list:   (filters: Record<string, unknown>) => ['bookings', 'list', filters] as const,
  detail: (id: string) => ['bookings', 'detail', id] as const,
  folio:  (id: string) => ['bookings', id, 'folio'] as const,
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
  tasks:    () => ['housekeeping', 'tasks'] as const,
  task:     (id: string) => ['housekeeping', 'task', id] as const,
  lostFound: () => ['housekeeping', 'lost-found'] as const,
  analytics: () => ['housekeeping', 'analytics'] as const,
};

export const folioKeys = {
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
};

export const accessKeys = {
  visitors: () => ['access', 'visitors'] as const,
};

export const rosterKeys = {
  roster:          () => ['roster'] as const,
  timeclockEntries: () => ['timeclock', 'entries'] as const,
  labourCost:      () => ['roster', 'labour-cost'] as const,
};

export const hrKeys = {
  profile:       (staffId: string) => ['hr', 'profile', staffId] as const,
  documents:     (staffId: string) => ['hr', 'documents', staffId] as const,
  disciplinary:  (staffId: string) => ['hr', 'disciplinary', staffId] as const,
  timesheets:    () => ['hr', 'timesheets'] as const,
};

export const expenseKeys = {
  list:   () => ['expenses'] as const,
  detail: (id: string) => ['expenses', id] as const,
  floats: () => ['expenses', 'pettycash', 'floats'] as const,
};

export const procurementKeys = {
  suppliers:       () => ['procurement', 'suppliers'] as const,
  stockItems:      () => ['procurement', 'stock-items'] as const,
  purchaseOrders:  () => ['procurement', 'purchase-orders'] as const,
  vendorContracts: () => ['procurement', 'vendor-contracts'] as const,
};

export const reportKeys = {
  occupancy:   (params: Record<string, unknown>) => ['reports', 'occupancy', params] as const,
  revenue:     (params: Record<string, unknown>) => ['reports', 'revenue', params] as const,
  finance:     (params: Record<string, unknown>) => ['reports', 'finance', params] as const,
  bookings:    (params: Record<string, unknown>) => ['reports', 'bookings', params] as const,
  housekeeping:(params: Record<string, unknown>) => ['reports', 'housekeeping', params] as const,
  maintenance: (params: Record<string, unknown>) => ['reports', 'maintenance', params] as const,
  students:    (params: Record<string, unknown>) => ['reports', 'students', params] as const,
  nightAudit:  (date: string) => ['reports', 'night-audit', date] as const,
};

export const chatKeys = {
  channels: () => ['staffchat', 'channels'] as const,
  messages: (channelId: string) => ['staffchat', 'channels', channelId, 'messages'] as const,
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
