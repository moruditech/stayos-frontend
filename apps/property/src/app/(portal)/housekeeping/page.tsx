'use client';

import Link from 'next/link';

/**
 * Housekeeping board — Kanban with drag-and-drop, plus a separate
 * reviewer queue view.
 *
 * Columns map to the real HousekeepingTask.status enum (pending/assigned,
 * in_progress, completed, inspected) — the UI's "Pending/In Progress/
 * Done/Verified" labels are just display text, not the wire values.
 * re_clean tasks are folded into the "In Progress" column with a
 * distinct marker, since that's functionally where they belong (rejected,
 * needs more work — not a fresh unstarted task).
 *
 * Visibility is enforced server-side (housekeeping.service.js#listTasks):
 * a base 'housekeeper' account only ever gets back tasks assigned to them
 * or unassigned; everyone else with housekeeping:* sees the full board
 * and can additionally switch to a "My reviews" queue.
 */

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { api } from '@stayos/api-client';
import type { HousekeepingTask, HousekeepingTaskStatus } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, useToast, RoleGate, Icons } from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { useSession, hasPermission } from '@stayos/auth';
import { housekeepingKeys } from '@/lib/query-keys';

type ColumnKey = 'pending' | 'in_progress' | 'done' | 'verified';

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'pending',     label: 'Pending' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'done',        label: 'Done' },
  { key: 'verified',    label: 'Verified' },
];

function columnFor(status: HousekeepingTaskStatus): ColumnKey {
  if (status === 'pending' || status === 'assigned') return 'pending';
  if (status === 'in_progress' || status === 're_clean') return 'in_progress';
  if (status === 'completed') return 'done';
  return 'verified'; // 'inspected'
}

function roomNumberOf(task: HousekeepingTask): string {
  return typeof task.roomId === 'string' ? task.roomId : task.roomId.roomNumber;
}

function checklistProgress(task: HousekeepingTask): string {
  if (!task.checklist.length) return '';
  const done = task.checklist.filter((c) => c.completed).length;
  return `${done}/${task.checklist.length} checked`;
}

interface TaskCardProps {
  task: HousekeepingTask;
  isReviewerForThis: boolean;
  dragging?: boolean;
  onStart: (id: string) => void;
  onMarkDone: (id: string) => void;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  pendingAction: string | null;
}

function TaskCardBody({ task, isReviewerForThis, onStart, onMarkDone, onVerify, onReject, pendingAction }: Omit<TaskCardProps, 'dragging'>): React.ReactElement {
  const col = columnFor(task.status);
  const progress = checklistProgress(task);

  return (
    <>
      <div data-task-card-header>
        <span data-task-type>{task.type.replace(/_/g, ' ')}</span>
        <span data-task-priority>{task.priority}</span>
      </div>
      <span data-task-room>Room {roomNumberOf(task)}</span>
      {task.assignedTo && (
        <span data-task-assignee>
          <Icons.User width={11} height={11} aria-hidden="true" /> {task.assignedTo.firstName} {task.assignedTo.lastName}
        </span>
      )}
      {task.reviewerId && (
        <span data-task-reviewer>
          <Icons.Eye width={11} height={11} aria-hidden="true" />
          {' '}Reviewer: {task.reviewerId.firstName} {task.reviewerId.lastName}
        </span>
      )}
      {progress && col !== 'verified' && <span data-task-assignee>{progress}</span>}
      {task.status === 're_clean' && (
        <span data-reclean-note>Needs re-clean{task.reCleanReason ? `: ${task.reCleanReason}` : ''}</span>
      )}

      <div data-task-actions>
        <Link href={`/housekeeping/tasks/${task._id}`} data-btn-ghost data-btn-sm>View</Link>

        {col === 'pending' && (
          <button
            type="button" data-btn-primary data-btn-sm
            disabled={pendingAction === task._id}
            onClick={(e) => { e.stopPropagation(); onStart(task._id); }}
          >
            Start
          </button>
        )}

        {col === 'in_progress' && (
          <button
            type="button" data-btn-primary data-btn-sm
            disabled={pendingAction === task._id}
            onClick={(e) => { e.stopPropagation(); onMarkDone(task._id); }}
          >
            Mark done
          </button>
        )}

        {col === 'done' && isReviewerForThis && (
          <>
            <button
              type="button" data-btn-primary data-btn-sm
              disabled={pendingAction === task._id}
              onClick={(e) => { e.stopPropagation(); onVerify(task._id); }}
            >
              Verify
            </button>
            <button
              type="button" data-btn-ghost data-btn-sm data-destructive
              disabled={pendingAction === task._id}
              onClick={(e) => { e.stopPropagation(); onReject(task._id); }}
            >
              Reject
            </button>
          </>
        )}
      </div>
    </>
  );
}

function DraggableTaskCard(props: TaskCardProps): React.ReactElement {
  const { task, dragging } = props;
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task._id,
    data: { task },
  });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-task-card
      data-priority={task.priority}
      data-needs-reclean={task.status === 're_clean' || undefined}
      data-dragging={dragging || undefined}
    >
      <TaskCardBody {...props} />
    </div>
  );
}

function KanbanColumn({
  column, tasks, ...cardProps
}: {
  column: ColumnKey;
  tasks: HousekeepingTask[];
} & Omit<TaskCardProps, 'task' | 'dragging' | 'isReviewerForThis'> & { reviewerId?: string }): React.ReactElement {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  const label = COLUMNS.find((c) => c.key === column)!.label;

  return (
    <div ref={setNodeRef} data-kanban-column data-drop-active={isOver || undefined}>
      <div data-kanban-column-header>
        <span data-column-label>{label}</span>
        <span data-column-count>{tasks.length}</span>
      </div>
      <div data-kanban-cards>
        {tasks.length === 0 ? (
          <p data-kanban-empty>No tasks</p>
        ) : (
          tasks.map((task) => (
            <DraggableTaskCard
              key={task._id}
              task={task}
              isReviewerForThis={!!cardProps.reviewerId && task.reviewerId?._id === cardProps.reviewerId}
              onStart={cardProps.onStart}
              onMarkDone={cardProps.onMarkDone}
              onVerify={cardProps.onVerify}
              onReject={cardProps.onReject}
              pendingAction={cardProps.pendingAction}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function HousekeepingBoardPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const session = useSession();
  const canReview = !!session && hasPermission(session.permissions, PERMISSIONS.HOUSEKEEPING_ALL);

  const [view, setView] = useState<'board' | 'reviews'>('board');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const filters = view === 'reviews' ? { view: 'reviewer' as const } : {};
  const { data: tasks, isLoading } = useQuery({
    queryKey: housekeepingKeys.tasks(filters),
    queryFn: () => api.housekeeping.listTasks(filters),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['housekeeping', 'tasks'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'in_progress' | 'completed' }) =>
      api.housekeeping.updateStatus(id, status),
    onMutate: ({ id }) => setPendingAction(id),
    onSettled: () => setPendingAction(null),
    onSuccess: invalidate,
    onError: (err: ApiError) => toast(err.message ?? 'Could not update the task.', 'error'),
  });

  const inspectMutation = useMutation({
    mutationFn: ({ id, passed, notes }: { id: string; passed: boolean; notes?: string }) =>
      api.housekeeping.inspectTask(id, passed, notes),
    onMutate: ({ id }) => setPendingAction(id),
    onSettled: () => setPendingAction(null),
    onSuccess: (_data, vars) => {
      invalidate();
      toast(vars.passed ? 'Task verified.' : 'Sent back for re-clean.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Could not submit the review.', 'error'),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const grouped = useMemo(() => {
    const map: Record<ColumnKey, HousekeepingTask[]> = { pending: [], in_progress: [], done: [], verified: [] };
    for (const t of tasks ?? []) map[columnFor(t.status)].push(t);
    return map;
  }, [tasks]);

  const activeTask = useMemo(() => (tasks ?? []).find((t) => t._id === activeTaskId) ?? null, [tasks, activeTaskId]);

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTaskId(null);
    if (!over) return;

    const task = active.data.current?.task as HousekeepingTask | undefined;
    if (!task) return;

    const from = columnFor(task.status);
    const to = over.id as ColumnKey;
    if (from === to) return;

    if (from === 'pending' && to === 'in_progress') {
      statusMutation.mutate({ id: task._id, status: 'in_progress' });
    } else if (from === 'in_progress' && to === 'done') {
      statusMutation.mutate({ id: task._id, status: 'completed' });
    } else if (from === 'done' && to === 'verified') {
      if (task.reviewerId?._id !== session?.userId) {
        toast('Only the assigned reviewer can verify this task.', 'error');
        return;
      }
      inspectMutation.mutate({ id: task._id, passed: true });
    }
    // Any other move (backward, or skipping a column) is just ignored —
    // the card naturally stays put since nothing changed server-side.
  }

  const cardHandlers = {
    onStart: (id: string) => statusMutation.mutate({ id, status: 'in_progress' }),
    onMarkDone: (id: string) => statusMutation.mutate({ id, status: 'completed' }),
    onVerify: (id: string) => inspectMutation.mutate({ id, passed: true }),
    onReject: (id: string) => {
      const reason = window.prompt('What needs to be redone?');
      if (reason === null) return;
      inspectMutation.mutate({ id, passed: false, ...(reason ? { notes: reason } : {}) });
    },
    pendingAction,
  };

  return (
    <div data-page="housekeeping">
      <div data-page-header>
        <div>
          <h1>Housekeeping</h1>
          <p data-page-subtitle>{view === 'reviews' ? 'Tasks awaiting your review' : 'Task board'}</p>
        </div>
        <div data-header-actions>
          {canReview && (
            <div data-segmented role="tablist" aria-label="Housekeeping view">
              <button type="button" data-segmented-option data-active={view === 'board' || undefined} onClick={() => setView('board')}>
                Board
              </button>
              <button type="button" data-segmented-option data-active={view === 'reviews' || undefined} onClick={() => setView('reviews')}>
                My reviews
              </button>
            </div>
          )}
          <RoleGate perm={PERMISSIONS.HOUSEKEEPING_ALL}>
            <Link href="/housekeeping/tasks/new" data-btn-primary>+ New task</Link>
          </RoleGate>
        </div>
      </div>

      {isLoading ? (
        <SkeletonLoader rows={6} />
      ) : view === 'reviews' ? (
        (tasks ?? []).length === 0 ? (
          <p data-empty-note>Nothing waiting on your review right now.</p>
        ) : (
          <div data-kanban-cards>
            {(tasks ?? []).map((task) => (
              <div key={task._id} data-task-card data-priority={task.priority}>
                <TaskCardBody
                  task={task}
                  isReviewerForThis
                  {...cardHandlers}
                />
              </div>
            ))}
          </div>
        )
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div data-kanban>
            {COLUMNS.map((c) => (
              <KanbanColumn
                key={c.key}
                column={c.key}
                tasks={grouped[c.key]}
                {...(session?.userId ? { reviewerId: session.userId } : {})}
                {...cardHandlers}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <div
                data-task-card
                data-priority={activeTask.priority}
                data-needs-reclean={activeTask.status === 're_clean' || undefined}
                data-drag-overlay="true"
              >
                <TaskCardBody
                  task={activeTask}
                  isReviewerForThis={activeTask.reviewerId?._id === session?.userId}
                  {...cardHandlers}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
