import { client } from '../client';

export interface WorkOrder {
  _id: string;
  tenantId: string;
  title: string;
  description: string;
  location?: string;
  roomId?: { _id: string; roomNumber: string } | string | null;
  priority: 'low' | 'medium' | 'high';
  status: string;
  assignedTo?: { _id: string; firstName: string; lastName: string } | null;
  notes: { text: string; createdBy: string; createdAt: string }[];
  photos: string[];
  dueDate?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  _id: string;
  tenantId: string;
  name: string;
  category: string;
  location?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  status: string;
  lastServiced?: string;
  nextService?: string;
  createdAt: string;
}

export interface MaintenanceSchedule {
  _id: string;
  tenantId: string;
  title: string;
  description?: string;
  frequency: string;
  nextRun: string;
  lastRun?: string;
  assetId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface MaintenanceAnalytics {
  openWorkOrders: number;
  inProgress: number;
  highPriority: number;
  completedToday: number;
  overdue: number;
  totalAssets: number;
  avgResponseHours: number;
  completionRate: number;
}

export const maintenanceApi = {
  // GET /maintenance/work-orders
  listWorkOrders: (params?: Record<string, unknown>) =>
    client.get<WorkOrder[]>('/maintenance/work-orders', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  // POST /maintenance/work-orders — any authenticated staff
  createWorkOrder: (input: {
    title: string;
    description: string;
    location?: string;
    roomId?: string;
    priority?: string;
  }) => client.post<WorkOrder>('/maintenance/work-orders', input),

  // GET /maintenance/work-orders/:id
  getWorkOrder: (id: string) => client.get<WorkOrder>(`/maintenance/work-orders/${id}`),

  // PATCH /maintenance/work-orders/:id
  updateWorkOrder: (id: string, input: Partial<WorkOrder>) =>
    client.patch<WorkOrder>(`/maintenance/work-orders/${id}`, input),

  // PATCH /maintenance/work-orders/:id/status
  updateStatus: (id: string, status: string) =>
    client.patch<WorkOrder>(`/maintenance/work-orders/${id}/status`, { status }),

  // PATCH /maintenance/work-orders/:id/assign
  assignWorkOrder: (id: string, assignedTo: string) =>
    client.patch<WorkOrder>(`/maintenance/work-orders/${id}/assign`, { assignedTo }),

  // POST /maintenance/work-orders/:id/note
  addNote: (id: string, text: string) =>
    client.post<WorkOrder>(`/maintenance/work-orders/${id}/note`, { text }),

  // POST /maintenance/work-orders/:id/close
  closeWorkOrder: (id: string, resolution?: string) =>
    client.post<WorkOrder>(`/maintenance/work-orders/${id}/close`, { resolution }),

  // GET /maintenance/assets
  listAssets: () => client.get<Asset[]>('/maintenance/assets'),

  // POST /maintenance/assets
  createAsset: (input: Partial<Asset>) => client.post<Asset>('/maintenance/assets', input),

  // GET /maintenance/assets/:id
  getAsset: (id: string) => client.get<Asset>(`/maintenance/assets/${id}`),

  // PATCH /maintenance/assets/:id
  updateAsset: (id: string, input: Partial<Asset>) =>
    client.patch<Asset>(`/maintenance/assets/${id}`, input),

  // DELETE /maintenance/assets/:id
  deleteAsset: (id: string) => client.delete<{ message: string }>(`/maintenance/assets/${id}`),

  // GET /maintenance/assets/:id/service-history
  getServiceHistory: (id: string) =>
    client.get<Record<string, unknown>[]>(`/maintenance/assets/${id}/service-history`),

  // GET /maintenance/schedules
  listSchedules: () => client.get<MaintenanceSchedule[]>('/maintenance/schedules'),

  // POST /maintenance/schedules
  createSchedule: (input: Partial<MaintenanceSchedule>) =>
    client.post<MaintenanceSchedule>('/maintenance/schedules', input),

  // GET /maintenance/schedules/:id
  getSchedule: (id: string) => client.get<MaintenanceSchedule>(`/maintenance/schedules/${id}`),

  // PATCH /maintenance/schedules/:id
  updateSchedule: (id: string, input: Partial<MaintenanceSchedule>) =>
    client.patch<MaintenanceSchedule>(`/maintenance/schedules/${id}`, input),

  // DELETE /maintenance/schedules/:id
  deleteSchedule: (id: string) =>
    client.delete<{ message: string }>(`/maintenance/schedules/${id}`),

  // POST /maintenance/schedules/:id/run-now
  runScheduleNow: (id: string) =>
    client.post<{ message: string }>(`/maintenance/schedules/${id}/run-now`),

  // GET /maintenance/analytics
  getAnalytics: () => client.get<MaintenanceAnalytics>('/maintenance/analytics'),
};
