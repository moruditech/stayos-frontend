'use client';

import Link from 'next/link';

/**
 * Housekeeping task board — kanban layout per the design specification.
 * Columns: pending → in_progress → done → verified
 *
 * TAD 11 §5:
 *  - Task creation/assignment restricted to property_admin, property_manager,
 *    housekeeper_supervisor (housekeeping:*).
 *  - A plain housekeeper (housekeeping:task:read/update) can view and update
 *    status of assigned tasks but cannot assign.
 *  - Assignee picker filtered client-side to housekeeping-relevant roles since
 *    the backend does NOT validate the assignee's role — the filter is the
 *    only safeguard against misdirected assignments.
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader,
  EmptyState,
  RoleGate,
  useToast,
  useSocketEvent,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { housekeepingKeys } from '@/lib/query-keys';

interface HousekeepingTask {
  _id: string;
  type: string;
  status: string;
  priority: string;
  roomId: string | { roomNumber: string } | null;
  assignedTo?: string | { firstName: string; lastName: string } | null;
  checklist: { item: string; done: boolean }[];
  notes?: string;
  dueDate?: string;
}

const COLUMNS: { key: string; label: string }[] = [
  { key: 'pending',     label: 'Pending' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'done',        label: 'Done' },
  { key: 'verified',    label: 'Verified' },
];

export default function HousekeepingPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: housekeepingKeys.tasks(),
    queryFn: () => api.housekeeping.listTasks(),
  });

  // Real-time
  useSocketEvent('housekeeping:task:updated', () => {
    void queryClient.invalidateQueries({ queryKey: housekeepingKeys.tasks() });
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.housekeeping.updateStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: housekeepingKeys.tasks() });
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  if (isLoading) return <SkeletonLoader rows={4} />;

  const tasksByStatus = COLUMNS.reduce<Record<string, HousekeepingTask[]>>((acc, col) => {
    acc[col.key] = (tasks ?? []).filter((t) => t.status === col.key);
    return acc;
  }, {});

  return (
    <div data-page="housekeeping">
      <div data-page-header>
        <h1>Housekeeping</h1>
        <RoleGate perm={PERMISSIONS.HOUSEKEEPING_ALL}>
          <Link href="/housekeeping/tasks/new" data-btn-primary>+ New task</Link>
        </RoleGate>
      </div>

      {!tasks?.length ? (
        <EmptyState
          title="No tasks"
          description="All rooms are clean or no tasks have been created yet."
          action={
            <RoleGate perm={PERMISSIONS.HOUSEKEEPING_ALL}>
              <Link href="/housekeeping/tasks/new" data-btn-primary>Create task</Link>
            </RoleGate>
          }
        />
      ) : (
        <div data-kanban>
          {COLUMNS.map((col) => (
            <div key={col.key} data-kanban-column>
              <div data-kanban-column-header>
                <span data-column-label>{col.label}</span>
                <span data-column-count>{tasksByStatus[col.key]?.length ?? 0}</span>
              </div>
              <div data-kanban-cards>
                {(tasksByStatus[col.key] ?? []).map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onStatusChange={(status) =>
                      updateStatusMutation.mutate({ id: task._id, status })
                    }
                  />
                ))}
                {!tasksByStatus[col.key]?.length && (
                  <p data-kanban-empty>No tasks</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  onStatusChange,
}: {
  task: HousekeepingTask;
  onStatusChange: (status: string) => void;
}): React.ReactElement {
  const roomLabel =
    typeof task.roomId === 'object' && task.roomId !== null
      ? `Room ${task.roomId.roomNumber}`
      : 'Room —';

  const assigneeName =
    task.assignedTo && typeof task.assignedTo === 'object'
      ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
      : null;

  const nextStatuses: Record<string, string | null> = {
    pending:     'in_progress',
    in_progress: 'done',
    done:        'verified',
    verified:    null,
  };

  return (
    <div data-task-card data-priority={task.priority}>
      <div data-task-card-header>
        <span data-task-type>{task.type}</span>
        <span data-task-priority data-priority={task.priority}>
          {task.priority}
        </span>
      </div>
      <span data-task-room>{roomLabel}</span>
      {assigneeName && <span data-task-assignee>{assigneeName}</span>}

      <div data-task-actions>
        <Link href={`/housekeeping/tasks/${task._id}`} data-btn-ghost data-btn-sm>
          View
        </Link>
        {nextStatuses[task.status] && (
          <RoleGate
            perm={[PERMISSIONS.HOUSEKEEPING_TASK_UPDATE, PERMISSIONS.HOUSEKEEPING_ALL]}
          >
            <button
              type="button"
              data-btn-primary data-btn-sm
              onClick={() => onStatusChange(nextStatuses[task.status]!)}
            >
              {task.status === 'pending'
                ? 'Start'
                : task.status === 'in_progress'
                ? 'Mark done'
                : 'Verify'}
            </button>
          </RoleGate>
        )}
      </div>
    </div>
  );
}
