import { client } from '../client';

// Matches HousekeepingTask.model.js's real enum exactly. Note: 'completed'
// and 'inspected' — not the more tempting-looking 'done'/'verified' the
// board UI's column labels use. The column labels are just display text;
// these are the real wire values.
export type HousekeepingTaskStatus =
  | 'pending' | 'assigned' | 'in_progress' | 'completed' | 'inspected' | 're_clean';

export type HousekeepingTaskType =
  | 'checkout_clean' | 'stayover_clean' | 'deep_clean' | 'inspection' | 'turndown' | 'linen_change';

export interface ChecklistItem {
  _id: string;
  item: string;
  completed: boolean;
  completedAt: string | null;
}

export interface HousekeepingTask {
  _id: string;
  tenantId: string;
  roomId: { _id: string; roomNumber: string; type: string; floor?: string } | string;
  bookingId?: string | null;
  assignedTo: { _id: string; firstName: string; lastName: string } | null;
  // Who is expected to review this task once marked done. If null and the
  // task has a checklist, the assigned housekeeper self-verifies instead
  // (a separate explicit action — see housekeepingCategoryOf below and
  // inspectTask). A task with no checklist at all skips verification
  // entirely regardless of this field.
  reviewerId: { _id: string; firstName: string; lastName: string } | null;
  scheduledDate: string;
  // Distinct from scheduledDate — optional, not every task has a hard
  // deadline.
  dueDate?: string | null;
  type: HousekeepingTaskType;
  priority: 'low' | 'normal' | 'high';
  status: HousekeepingTaskStatus;
  checklist: ChecklistItem[];
  notes?: string;
  photos: { url: string; caption?: string; uploadedAt: string }[];
  startedAt?: string;
  completedAt?: string;
  inspectedBy?: { _id: string; firstName: string; lastName: string } | null;
  inspectedAt?: string;
  inspectionPassed?: boolean;
  reCleanReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHousekeepingTaskInput {
  roomId: string;
  bookingId?: string;
  type: HousekeepingTaskType;
  priority?: 'low' | 'normal' | 'high';
  assignedTo?: string;
  reviewerId?: string;
  scheduledDate?: string;
  dueDate?: string; // optional — not every task has a hard deadline
  checklist?: string[]; // plain item text — omit to use the resolved template
  notes?: string;
}

export interface HousekeepingTaskFilters {
  status?: HousekeepingTaskStatus;
  assignedTo?: string;
  type?: HousekeepingTaskType;
  date?: string;
  // Independent range filters — a task can be filtered by when it's due,
  // when it was created, both, or neither.
  dueDateFrom?: string;
  dueDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  // Narrows to completed tasks where the caller is the assigned reviewer
  // — see housekeeping.service.js#listTasks. Base 'housekeeper' role
  // accounts are additionally always server-side restricted to their own
  // assigned (or unassigned) tasks regardless of what's passed here.
  view?: 'reviewer';
}

// The four user-facing categories, and the one place that maps the real
// wire statuses onto them. 'completed' is Waiting Verification, not Done —
// a task in 'completed' still needs the reviewer (or, with no reviewer,
// the housekeeper's own self-review) to move it into 'inspected' before
// it's actually finished. 'assigned' folds into Pending (it hasn't been
// started yet) and 're_clean' folds into In Progress (rejected, needs
// more work — not a fresh unstarted task).
export type HousekeepingCategory = 'pending' | 'in_progress' | 'waiting_verification' | 'done';

export const HOUSEKEEPING_CATEGORY_LABELS: Record<HousekeepingCategory, string> = {
  pending:               'Pending',
  in_progress:           'In Progress',
  waiting_verification:  'Waiting Verification',
  done:                  'Done',
};

export function housekeepingCategoryOf(status: HousekeepingTaskStatus): HousekeepingCategory {
  if (status === 'pending' || status === 'assigned') return 'pending';
  if (status === 'in_progress' || status === 're_clean') return 'in_progress';
  if (status === 'completed') return 'waiting_verification';
  return 'done'; // 'inspected'
}

export interface ResolvedChecklist {
  items: string[];
  source: 'room_override' | 'template' | 'default';
}

export const housekeepingApi = {
  // GET /housekeeping/tasks
  listTasks: (filters?: HousekeepingTaskFilters) =>
    client.get<HousekeepingTask[]>('/housekeeping/tasks', {
      params: filters as Record<string, string | undefined>,
    }),

  // POST /housekeeping/tasks
  createTask: (input: CreateHousekeepingTaskInput) =>
    client.post<HousekeepingTask>('/housekeeping/tasks', input),

  // GET /housekeeping/schedule
  getSchedule: (date?: string) =>
    client.get<HousekeepingTask[]>('/housekeeping/schedule', { params: { date } }),

  // GET /housekeeping/tasks/:id
  getTask: (id: string) => client.get<HousekeepingTask>(`/housekeeping/tasks/${id}`),

  // PATCH /housekeeping/tasks/:id — reassign, change priority/reviewer/etc.
  updateTask: (id: string, input: Partial<CreateHousekeepingTaskInput>) =>
    client.patch<HousekeepingTask>(`/housekeeping/tasks/${id}`, input),

  // PATCH /housekeeping/tasks/:id/status — only 'in_progress' | 'completed'.
  // Reaching 'inspected'/'re_clean' goes through inspectTask below instead.
  updateStatus: (id: string, status: 'in_progress' | 'completed') =>
    client.patch<HousekeepingTask>(`/housekeeping/tasks/${id}/status`, { status }),

  // PATCH /housekeeping/tasks/:id/checklist — matched by each item's own
  // _id (see updateChecklistSchema), not array index or item text.
  updateChecklist: (id: string, items: { _id: string; completed: boolean }[]) =>
    client.patch<HousekeepingTask>(`/housekeeping/tasks/${id}/checklist`, { items }),

  // POST /housekeeping/tasks/:id/inspect
  inspectTask: (id: string, passed: boolean, notes?: string) =>
    client.post<HousekeepingTask>(`/housekeeping/tasks/${id}/inspect`, { passed, notes }),

  // POST /housekeeping/tasks/:id/re-clean
  requestReClean: (id: string, reason: string) =>
    client.post<HousekeepingTask>(`/housekeeping/tasks/${id}/re-clean`, { reason }),

  // GET /housekeeping/tasks/:id/checklist — returns the array directly.
  getChecklist: (id: string) => client.get<ChecklistItem[]>(`/housekeeping/tasks/${id}/checklist`),

  // GET /housekeeping/checklist-templates/resolve?taskType=&roomId=
  // Effective checklist for a type (+ optional room): a saved room
  // override, else the tenant's general template for that type, else a
  // built-in default — see housekeeping.service.js#resolveChecklist.
  resolveChecklist: (taskType: HousekeepingTaskType, roomId?: string) =>
    client.get<ResolvedChecklist>('/housekeeping/checklist-templates/resolve', {
      params: { taskType, roomId },
    }),

  // PUT /housekeeping/checklist-templates — omit roomId to save the
  // tenant-wide default for this type; include it to save/overwrite that
  // one room's override.
  saveChecklistTemplate: (input: { taskType: HousekeepingTaskType; roomId?: string; items: string[] }) =>
    client.put<{ _id: string; taskType: string; roomId: string | null; items: string[] }>(
      '/housekeeping/checklist-templates',
      input
    ),

  // GET /housekeeping/lost-found
  getLostFound: (status?: string) =>
    client.get<Record<string, unknown>[]>('/housekeeping/lost-found', { params: { status } }),

  // POST /housekeeping/lost-found
  addLostFound: (taskId: string, itemDescription: string) =>
    client.post<HousekeepingTask>('/housekeeping/lost-found', { taskId, itemDescription }),

  // GET /housekeeping/analytics
  getAnalytics: (from?: string, to?: string) =>
    client.get<Record<string, unknown>>('/housekeeping/analytics', { params: { from, to } }),
};
