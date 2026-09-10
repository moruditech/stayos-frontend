import { client } from '../client';

// Matches MaintenanceWorkOrder.model.js's real fields.
export interface WorkOrder {
  _id: string;
  tenantId: string;
  title: string;
  description: string;
  location?: string | null;
  roomId?: { _id: string; roomNumber: string } | string | null;
  assetId?: { _id: string; name: string; category: string } | string | null;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'pest' | 'cosmetic' | 'it' | 'pool' | 'other';
  priority: 'critical' | 'high' | 'normal' | 'low';
  status: 'submitted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'verified' | 'closed';
  assignedTo?: { _id: string; firstName: string; lastName: string } | null;
  notes: { text: string; addedBy: string; addedAt: string; isInternal: boolean }[];
  photos: { url: string; caption?: string }[];
  slaTarget?: string;
  slaBreach: boolean;
  resolution?: string;
  partsCost: number;
  labourHours: number;
  totalCost: number;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Matches Asset.model.js's real fields.
export interface Asset {
  _id: string;
  tenantId: string;
  name: string;
  category: 'hvac' | 'electrical' | 'plumbing' | 'appliance' | 'lift' | 'pool' | 'generator' | 'security' | 'it' | 'furniture' | 'fire_safety' | 'structural' | 'other';
  area?: string;
  serialNumber?: string;
  manufacturer?: string;
  modelNumber?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyExpiry?: string;
  serviceIntervalDays?: number;
  lastServicedAt?: string;
  nextServiceDue?: string;
  condition: 'good' | 'fair' | 'poor' | 'out_of_order';
  status: 'operational' | 'faulty' | 'under_repair' | 'decommissioned';
  isActive: boolean;
  createdAt: string;
}

// Matches MaintenanceSchedule.model.js's real fields.
export interface MaintenanceSchedule {
  _id: string;
  tenantId: string;
  assetId?: string;
  roomId?: string;
  title: string;
  description?: string;
  category: 'inspection' | 'servicing' | 'cleaning' | 'testing' | 'replacement' | 'other';
  frequency: 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'bi_annual' | 'annual' | 'custom';
  intervalDays?: number;
  nextRunDate: string;
  lastRunDate?: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  isActive: boolean;
  createdAt: string;
}

export interface MaintenanceAnalytics {
  byStatus: { _id: string; count: number }[];
  byCategory: { _id: string; count: number }[];
  slaBreaches: number;
  avgResolutionHours: number;
}

export const maintenanceApi = {
  // GET /maintenance/work-orders
  listWorkOrders: (params?: Record<string, unknown>) =>
    client.get<WorkOrder[]>('/maintenance/work-orders', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  // POST /maintenance/work-orders — any authenticated staff
  createWorkOrder: (input: Record<string, unknown>) =>
    client.post<WorkOrder>('/maintenance/work-orders', input),

  // GET /maintenance/work-orders/:id
  getWorkOrder: (id: string) => client.get<WorkOrder>(`/maintenance/work-orders/${id}`),

  // PATCH /maintenance/work-orders/:id
  updateWorkOrder: (id: string, input: Partial<WorkOrder>) =>
    client.patch<WorkOrder>(`/maintenance/work-orders/${id}`, input),

  // PATCH /maintenance/work-orders/:id/status
  updateStatus: (id: string, status: WorkOrder['status']) =>
    client.patch<WorkOrder>(`/maintenance/work-orders/${id}/status`, { status }),

  // PATCH /maintenance/work-orders/:id/assign — controller reads req.body.assigneeId
  assignWorkOrder: (id: string, assigneeId: string) =>
    client.patch<WorkOrder>(`/maintenance/work-orders/${id}/assign`, { assigneeId }),

  // POST /maintenance/work-orders/:id/note
  addNote: (id: string, text: string, isInternal?: boolean) =>
    client.post<WorkOrder>(`/maintenance/work-orders/${id}/note`, { text, isInternal }),

  // POST /maintenance/work-orders/:id/close
  closeWorkOrder: (id: string, input: { resolution?: string | undefined; partsCost?: number | undefined; labourHours?: number | undefined }) =>
    client.post<WorkOrder>(`/maintenance/work-orders/${id}/close`, input),

  // GET /maintenance/assets
  listAssets: (params?: Record<string, unknown>) =>
    client.get<Asset[]>('/maintenance/assets', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  // POST /maintenance/assets
  createAsset: (input: Record<string, unknown>) => client.post<Asset>('/maintenance/assets', input),

  // GET /maintenance/assets/:id
  getAsset: (id: string) => client.get<Asset>(`/maintenance/assets/${id}`),

  // PATCH /maintenance/assets/:id
  updateAsset: (id: string, input: Partial<Asset>) =>
    client.patch<Asset>(`/maintenance/assets/${id}`, input),

  // DELETE /maintenance/assets/:id
  deleteAsset: (id: string) => client.delete<{ message: string }>(`/maintenance/assets/${id}`),

  // GET /maintenance/assets/:id/service-history
  getServiceHistory: (id: string) =>
    client.get<{ workOrderId?: { title: string; status: string; closedAt?: string }; date: string; notes?: string; cost?: number }[]>(
      `/maintenance/assets/${id}/service-history`
    ),

  // GET /maintenance/schedules
  listSchedules: (params?: Record<string, unknown>) =>
    client.get<MaintenanceSchedule[]>('/maintenance/schedules', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  // POST /maintenance/schedules
  createSchedule: (input: Record<string, unknown>) =>
    client.post<MaintenanceSchedule>('/maintenance/schedules', input),

  // GET /maintenance/schedules/:id
  getSchedule: (id: string) => client.get<MaintenanceSchedule>(`/maintenance/schedules/${id}`),

  // PATCH /maintenance/schedules/:id
  updateSchedule: (id: string, input: Partial<MaintenanceSchedule>) =>
    client.patch<MaintenanceSchedule>(`/maintenance/schedules/${id}`, input),

  // DELETE /maintenance/schedules/:id
  deleteSchedule: (id: string) =>
    client.delete<{ message: string }>(`/maintenance/schedules/${id}`),

  // POST /maintenance/schedules/:id/run-now — controller returns the created work order
  runScheduleNow: (id: string) =>
    client.post<WorkOrder>(`/maintenance/schedules/${id}/run-now`),

  // GET /maintenance/analytics
  getAnalytics: (params?: Record<string, unknown>) =>
    client.get<MaintenanceAnalytics>('/maintenance/analytics', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
};
