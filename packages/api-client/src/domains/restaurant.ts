import { client } from '../client';

// =============================================================================
// TYPES
// =============================================================================
// Co-located with their API functions here rather than in packages/types,
// matching the convention used by folios.ts, property-ops.ts (procurement,
// HR, roster, chat, guest register, staff) — every recently-added domain puts
// its rich response shapes in the api-client domain file itself.
// packages/types is reserved for the smaller set of types genuinely consumed
// outside api-client (session, api envelope) by @stayos/ui / @stayos/auth
// directly. Field names below are verified against stayos-api's actual
// Mongoose schemas and Zod validation, not inferred from the TAD prose.

export interface OutletSettings {
  serviceChargeEnabled: boolean;
  serviceChargeThreshold: number;
  serviceChargePercent: number;
  tabIdleAlertMinutes: number;
  tipPoolingEnabled: boolean;
  cashVarianceTolerance: number;
  discountApprovalThreshold: number;
}

export interface Outlet {
  _id: string;
  tenantId: string;
  name: string;
  type: 'restaurant' | 'bar' | 'cafe' | 'other';
  isActive: boolean;
  settings: OutletSettings;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  _id: string;
  tenantId: string;
  outletId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModifierOption {
  _id?: string;
  name: string;
  priceDelta: number;
}

export interface ModifierGroup {
  _id?: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  options: ModifierOption[];
}

export interface RecipeIngredient {
  stockItemId: string;
  quantity: number;
  unit: string;
}

// Populated shape returned when a StockItem is looked up for the recipe
// editor's searchable picker — matches procurement's listStockItems() item shape
export interface StockItemOption {
  _id: string;
  name: string;
  unit: string;
  category: string;
  currentQty: number;
  costPerUnit: number;
}

export interface MenuItem {
  _id: string;
  tenantId: string;
  outletId: string;
  categoryId: string | { _id: string; name: string };
  name: string;
  description?: string;
  imageUrl?: string;
  price: number; // excl. VAT
  vatApplicable: boolean;
  station: 'kitchen' | 'bar';
  modifierGroups: ModifierGroup[];
  recipe: RecipeIngredient[];
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantTable {
  _id: string;
  tenantId: string;
  outletId: string;
  label: string;
  section?: string;
  position: { x: number; y: number };
  capacity: number;
  status: 'available' | 'seated' | 'ordered' | 'bill_requested' | 'needs_cleaning';
  currentTabId: string | { _id: string; label: string; coverCount: number; status: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PosDiscount {
  applied: boolean;
  type?: 'percent' | 'fixed';
  value: number;
  amount: number;
  reason?: string;
  approvedBy: string | null;
  appliedBy?: string;
  appliedAt?: string;
  shiftId?: string;
}

export interface PosServiceCharge {
  applied: boolean;
  percent: number;
  amount: number;
}

export interface PosTab {
  _id: string;
  tenantId: string;
  outletId: string;
  tableId: string | { _id: string; label: string; section?: string; status?: string } | null;
  label: string;
  coverCount: number;
  status: 'open' | 'settled' | 'void';
  openedBy: string | { _id: string; firstName: string; lastName: string };
  openedAt: string;
  lastActivityAt: string;
  subtotal: number;
  vatTotal: number;
  serviceCharge: PosServiceCharge;
  discount: PosDiscount;
  total: number;
  paidTotal: number;
  mergedInto: string | null;
  mergedFrom: string[];
  settledAt?: string;
  settledBy?: string;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SelectedModifier {
  groupName: string;
  optionName: string;
  priceDelta: number;
}

export interface PosOrderItem {
  _id: string;
  menuItemId: string;
  snapshot: {
    name: string;
    price: number;
    vatApplicable: boolean;
    station: 'kitchen' | 'bar';
  };
  quantity: number;
  modifiers: SelectedModifier[];
  notes?: string;
  lineTotal: number;
  fulfillmentStatus: 'received' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  prepStartedAt?: string;
  readyAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

export interface PosOrder {
  _id: string;
  tenantId: string;
  outletId: string;
  tabId: string | { _id: string; label: string; coverCount?: number };
  tableId: string | null;
  placedBy: string | { _id: string; firstName: string; lastName: string };
  shiftId: string;
  items: PosOrderItem[];
  status: 'open' | 'fired' | 'ready' | 'completed' | 'cancelled';
  subtotal: number;
  vatTotal: number;
  total: number;
  firedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PosPayment {
  _id: string;
  tenantId: string;
  outletId: string;
  tabId: string | { _id: string; label: string; coverCount?: number; total?: number };
  method: 'cash' | 'card_yoco' | 'room_charge';
  amount: number;
  tipAmount: number;
  cardMachineRef?: string;
  roomChargeBookingId?: string;
  roomChargeFolioId?: string;
  splitGroupId?: string;
  shiftId: string;
  processedBy: string | { _id: string; firstName: string; lastName: string };
  receiptSent: { printed: boolean; emailedTo?: string; emailedAt?: string };
  status: 'completed' | 'refunded' | 'voided';
  refundedAt?: string;
  refundedBy?: string;
  refundReason?: string;
  createdAt: string;
}

export interface CashierShiftSalesSummary {
  totalSales: number;
  cashSales: number;
  cardSales: number;
  roomChargeSales: number;
  tipsTotal: number;
  refundsTotal: number;
  voidsCount: number;
  discountsTotal: number;
}

export interface CashierShift {
  _id: string;
  tenantId: string;
  outletId: string | { _id: string; name: string; type?: string };
  tillId: string | { _id: string; name: string; printerMac?: string };
  staffId: string | { _id: string; firstName: string; lastName: string; role?: string };
  openingFloat: number;
  openedAt: string;
  closedAt?: string;
  countedCash?: number;
  expectedCash?: number;
  variance?: number;
  varianceNote?: string;
  status: 'open' | 'closed';
  salesSummary: CashierShiftSalesSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface PosTill {
  _id: string;
  tenantId: string;
  outletId: string | { _id: string; name: string; type?: string };
  name: string;
  deviceId?: string;
  printerMac?: string;
  cardMachineMac?: string;
  isActive: boolean;
  lastSeenAt?: string;
  status: 'online' | 'offline' | 'maintenance';
  createdAt: string;
  updatedAt: string;
}

// ── Report response shapes (packages/api-client, mirrors reports.service.js) ──

export interface RestaurantSalesSummary {
  outletId: string | null;
  from: string | null;
  to: string | null;
  totalSales: number;
  totalTips: number;
  totalRefunds: number;
  discountsGiven: number;
  voidCount: number;
  byMethod: { method: string; amount: number; tips: number; count: number }[];
}

export interface RestaurantFoodCost {
  outletId: string | null;
  from: string | null;
  to: string | null;
  theoreticalCost: number;
  actualCost: number;
  revenue: number;
  theoreticalFoodCostPercent: number;
  actualFoodCostPercent: number;
  variance: number;
  varianceAsPercentOfRevenue: number;
}

export interface RestaurantShiftReconciliation {
  outletId: string | null;
  from: string | null;
  to: string | null;
  totalShifts: number;
  totalVariance: number;
  shiftsOverTolerance: number;
  byStaff: { staffId: string | null; staffName: string; shiftCount: number; totalVariance: number; totalSales: number }[];
}

export interface RestaurantTabAgingEntry {
  tabId: string;
  outletId: string;
  tableLabel: string | null;
  label: string;
  total: number;
  ageMinutes: number;
  idleMinutes: number;
  isIdle: boolean;
}

export interface RestaurantSalesByStaff {
  outletId: string | null;
  from: string | null;
  to: string | null;
  byStaff: {
    staffId: string | null;
    staffName: string;
    role: string | null;
    shiftCount: number;
    totalSales: number;
    tipsTotal: number;
    discountsTotal: number;
    voidsCount: number;
  }[];
}

// =============================================================================
// OUTLETS — /restaurant/outlets — pos:outlet:manage
// =============================================================================

export const outletsApi = {
  list: (params?: Record<string, unknown>) =>
    client.getPaginated<Outlet>('/restaurant/outlets', { params: params as Record<string, string | number | boolean | undefined> }),

  get: (id: string) => client.get<Outlet>(`/restaurant/outlets/${id}`),

  create: (data: { name: string; type: string; isActive?: boolean; settings?: Partial<OutletSettings> }) =>
    client.post<Outlet>('/restaurant/outlets', data),

  update: (id: string, data: Partial<{ name: string; type: string; isActive: boolean; settings: Partial<OutletSettings> }>) =>
    client.patch<Outlet>(`/restaurant/outlets/${id}`, data),

  remove: (id: string) => client.delete<null>(`/restaurant/outlets/${id}`),
};

// =============================================================================
// MENU — /restaurant/menu — pos:menu:manage
// =============================================================================

export const menuApi = {
  listCategories: (outletId: string) =>
    client.getPaginated<MenuCategory>('/restaurant/menu/categories', { params: { outletId, limit: 100 } }),

  createCategory: (data: { outletId: string; name: string; sortOrder?: number; isActive?: boolean }) =>
    client.post<MenuCategory>('/restaurant/menu/categories', data),

  updateCategory: (id: string, data: Partial<{ name: string; sortOrder: number; isActive: boolean }>) =>
    client.patch<MenuCategory>(`/restaurant/menu/categories/${id}`, data),

  removeCategory: (id: string) => client.delete<null>(`/restaurant/menu/categories/${id}`),

  listItems: (outletId: string, params?: Record<string, unknown>) =>
    client.getPaginated<MenuItem>('/restaurant/menu/items', {
      params: { outletId, limit: 200, ...(params as Record<string, string | number | boolean | undefined>) },
    }),

  getItem: (id: string) => client.get<MenuItem>(`/restaurant/menu/items/${id}`),

  createItem: (data: {
    outletId: string;
    categoryId: string;
    name: string;
    description?: string;
    imageUrl?: string;
    price: number;
    vatApplicable?: boolean;
    station: 'kitchen' | 'bar';
    modifierGroups?: ModifierGroup[];
    recipe?: RecipeIngredient[];
    isAvailable?: boolean;
    sortOrder?: number;
  }) => client.post<MenuItem>('/restaurant/menu/items', data),

  updateItem: (id: string, data: Partial<{
    categoryId: string; name: string; description: string; imageUrl: string;
    price: number; vatApplicable: boolean; station: 'kitchen' | 'bar';
    modifierGroups: ModifierGroup[]; recipe: RecipeIngredient[];
    isAvailable: boolean; sortOrder: number;
  }>) => client.patch<MenuItem>(`/restaurant/menu/items/${id}`, data),

  removeItem: (id: string) => client.delete<null>(`/restaurant/menu/items/${id}`),

  toggleAvailability: (id: string, isAvailable: boolean) =>
    client.patch<MenuItem>(`/restaurant/menu/items/${id}/availability`, { isAvailable }),

  // Reuses procurement's existing stock item list — the recipe editor's
  // searchable ingredient picker, per TAD dashboard §3.2. Response shape
  // confirmed against procurementApi.listStockItems in property-ops.ts:
  // plain array, not paginated, despite most other list endpoints being so.
  listStockItemOptions: () =>
    client.get<StockItemOption[]>('/procurement/stock-items'),
};

// =============================================================================
// TABLES — /restaurant/tables — pos:table:manage (CRUD), pos:tab:manage (status)
// =============================================================================

export const tablesApi = {
  list: (outletId: string) =>
    client.getPaginated<RestaurantTable>('/restaurant/tables', { params: { outletId, limit: 200 } }),

  get: (id: string) => client.get<RestaurantTable>(`/restaurant/tables/${id}`),

  create: (data: { outletId: string; label: string; section?: string; position?: { x: number; y: number }; capacity: number }) =>
    client.post<RestaurantTable>('/restaurant/tables', data),

  update: (id: string, data: Partial<{ label: string; section: string; position: { x: number; y: number }; capacity: number }>) =>
    client.patch<RestaurantTable>(`/restaurant/tables/${id}`, data),

  updateStatus: (id: string, status: RestaurantTable['status']) =>
    client.patch<RestaurantTable>(`/restaurant/tables/${id}/status`, { status }),

  remove: (id: string) => client.delete<null>(`/restaurant/tables/${id}`),
};

// =============================================================================
// TABS — /restaurant/tabs — dashboard side is read + manager-override only;
// normal open/order/pay happens on the POS till app (out of scope here).
// =============================================================================

export const tabsApi = {
  list: (params?: Record<string, unknown>) =>
    client.getPaginated<PosTab>('/restaurant/tabs', { params: params as Record<string, string | number | boolean | undefined> }),

  get: (id: string) => client.get<PosTab>(`/restaurant/tabs/${id}`),

  // Manager-triggered force-close — requires pos:void:approve, distinct from
  // the till's own void path per stayos-api's split voidTabManager controller.
  voidManager: (id: string, data: { voidReason: string }) =>
    client.patch<null>(`/restaurant/tabs/${id}/void/manager`, data),

  // "Void a line" (TAD dashboard §3.4) is done via the orders endpoint, not
  // a tabs endpoint — a tab has no line-void route of its own.
  listOrders: (params?: Record<string, unknown>) =>
    client.getPaginated<PosOrder>('/restaurant/orders', { params: params as Record<string, string | number | boolean | undefined> }),

  getOrder: (id: string) => client.get<PosOrder>(`/restaurant/orders/${id}`),

  cancelOrderItem: (orderId: string, itemId: string) =>
    client.patch<PosOrder>(`/restaurant/orders/${orderId}/items/${itemId}/status`, { fulfillmentStatus: 'cancelled' }),

  listPayments: (params?: Record<string, unknown>) =>
    client.getPaginated<PosPayment>('/restaurant/payments', { params: params as Record<string, string | number | boolean | undefined> }),
};

// =============================================================================
// SHIFTS — /restaurant/shifts — read-only from the dashboard (pos:shift:read:all);
// shift start/end only happens at the till via PIN.
// =============================================================================

export const shiftsApi = {
  list: (params?: Record<string, unknown>) =>
    client.getPaginated<CashierShift>('/restaurant/shifts', { params: params as Record<string, string | number | boolean | undefined> }),

  get: (id: string) => client.get<CashierShift>(`/restaurant/shifts/${id}`),
};

// =============================================================================
// TILLS — /restaurant/tills — pos:outlet:manage (registration is outlet-level
// setup, not its own TAD nav item — surfaced from the outlet detail view)
// =============================================================================

export const tillsApi = {
  list: (params?: Record<string, unknown>) =>
    client.getPaginated<PosTill>('/restaurant/tills', { params: params as Record<string, string | number | boolean | undefined> }),

  get: (id: string) => client.get<PosTill>(`/restaurant/tills/${id}`),

  // rawKey is returned exactly once at creation — stayos-api never stores or
  // re-serves it. The caller must capture and hand it to whoever configures
  // the physical till device.
  create: (data: { outletId: string; name: string; deviceId?: string; printerMac?: string; cardMachineMac?: string }) =>
    client.post<{ till: PosTill; apiKey: string }>('/restaurant/tills', data),

  update: (id: string, data: Partial<{ name: string; printerMac: string; cardMachineMac: string; isActive: boolean }>) =>
    client.patch<PosTill>(`/restaurant/tills/${id}`, data),

  remove: (id: string) => client.delete<null>(`/restaurant/tills/${id}`),
};

// =============================================================================
// STAFF PIN — /restaurant/staff — self-service set (no perm gate beyond auth),
// manager reset (pos:staff_pin:reset)
// =============================================================================

export const posStaffApi = {
  setOwnPin: (pin: string) => client.post<null>('/restaurant/staff/pin', { pin }),

  resetPin: (staffId: string) => client.post<null>('/restaurant/staff/pin/reset', { staffId }),
};

// =============================================================================
// RESTAURANT REPORTS — /reports/restaurant/* — pos:reports:read + restaurant_module
// =============================================================================

export const restaurantReportsApi = {
  getSalesSummary: (params?: Record<string, unknown>) =>
    client.get<RestaurantSalesSummary>('/reports/restaurant/sales-summary', { params: params as Record<string, string | number | boolean | undefined> }),

  getFoodCost: (params?: Record<string, unknown>) =>
    client.get<RestaurantFoodCost>('/reports/restaurant/food-cost', { params: params as Record<string, string | number | boolean | undefined> }),

  getShiftReconciliation: (params?: Record<string, unknown>) =>
    client.get<RestaurantShiftReconciliation>('/reports/restaurant/shift-reconciliation', { params: params as Record<string, string | number | boolean | undefined> }),

  getTabAging: (params?: Record<string, unknown>) =>
    client.get<RestaurantTabAgingEntry[]>('/reports/restaurant/tab-aging', { params: params as Record<string, string | number | boolean | undefined> }),

  getSalesByStaff: (params?: Record<string, unknown>) =>
    client.get<RestaurantSalesByStaff>('/reports/restaurant/sales-by-staff', { params: params as Record<string, string | number | boolean | undefined> }),
};
