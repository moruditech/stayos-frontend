import { client } from '../client';

export interface HousekeepingTask {
  _id: string;
  tenantId: string;
  roomId: { _id: string; roomNumber: string; name: string } | string;
  type: string;
  status: string;
  priority: string;
  assignedTo?: { _id: string; firstName: string; lastName: string } | null;
  checklist: { item: string; done: boolean }[];
  photos: string[];
  notes?: string;
  inspectedBy?: string;
  inspectedAt?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LostFoundItem {
  _id: string;
  tenantId: string;
  description: string;
  location: string;
  foundBy?: string;
  claimedBy?: string;
  status: string;
  createdAt: string;
}

export interface HousekeepingAnalytics {
  totalTasks: number;
  completedToday: number;
  avgCompletionMinutes: number;
  byStatus: Record<string, number>;
}

export const housekeepingApi = {
  // GET /housekeeping/tasks
  listTasks: (params?: Record<string, unknown>) =>
    client.get<HousekeepingTask[]>('/housekeeping/tasks', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  // POST /housekeeping/tasks
  createTask: (input: {
    roomId: string;
    type: string;
    priority?: string;
    assignedTo?: string;
    checklist?: { item: string }[];
    notes?: string;
    dueDate?: string;
  }) => client.post<HousekeepingTask>('/housekeeping/tasks', input),

  // GET /housekeeping/schedule
  getSchedule: () => client.get<Record<string, unknown>>('/housekeeping/schedule'),

  // GET /housekeeping/tasks/:id
  getTask: (id: string) => client.get<HousekeepingTask>(`/housekeeping/tasks/${id}`),

  // PATCH /housekeeping/tasks/:id
  updateTask: (id: string, input: Partial<HousekeepingTask>) =>
    client.patch<HousekeepingTask>(`/housekeeping/tasks/${id}`, input),

  // PATCH /housekeeping/tasks/:id/status
  updateStatus: (id: string, status: string) =>
    client.patch<HousekeepingTask>(`/housekeeping/tasks/${id}/status`, { status }),

  // GET /housekeeping/tasks/:id/checklist
  getChecklist: (id: string) =>
    client.get<{ checklist: { item: string; done: boolean }[] }>(`/housekeeping/tasks/${id}/checklist`),

  // PATCH /housekeeping/tasks/:id/checklist
  updateChecklist: (id: string, checklist: { item: string; done: boolean }[]) =>
    client.patch<HousekeepingTask>(`/housekeeping/tasks/${id}/checklist`, { checklist }),

  // POST /housekeeping/tasks/:id/inspect
  inspectTask: (id: string, passed: boolean, notes?: string) =>
    client.post<HousekeepingTask>(`/housekeeping/tasks/${id}/inspect`, { passed, notes }),

  // POST /housekeeping/tasks/:id/re-clean
  requestReClean: (id: string, notes?: string) =>
    client.post<HousekeepingTask>(`/housekeeping/tasks/${id}/re-clean`, { notes }),

  // GET /housekeeping/lost-found
  getLostFound: () => client.get<LostFoundItem[]>('/housekeeping/lost-found'),

  // POST /housekeeping/lost-found
  addLostFound: (input: { description: string; location: string; foundBy?: string }) =>
    client.post<LostFoundItem>('/housekeeping/lost-found', input),

  // PATCH /housekeeping/lost-found/:itemId
  updateLostFound: (itemId: string, input: Partial<LostFoundItem>) =>
    client.patch<LostFoundItem>(`/housekeeping/lost-found/${itemId}`, input),

  // GET /housekeeping/analytics
  getAnalytics: () => client.get<HousekeepingAnalytics>('/housekeeping/analytics'),
};
