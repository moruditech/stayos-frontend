'use client';

import Link from 'next/link';

/**
 * Housekeeping board — Kanban with drag-and-drop, plus a separate
 * reviewer queue view.
 *
 * The four columns are the canonical categories from
 * housekeepingCategoryOf/HOUSEKEEPING_CATEGORY_LABELS (@stayos/api-client):
 * Pending, In Progress, Waiting Verification, Done. Those map onto the
 * real HousekeepingTask.status enum (pending/assigned, in_progress,
 * completed, inspected) — see that helper for exactly how, and don't
 * duplicate the mapping here; the task detail page relies on the same one
 * so the two can't drift apart on what "Waiting Verification" means.
 * re_clean tasks are folded into In Progress with a distinct marker,
 * since that's functionally where they belong (rejected, needs more work
 * — not a fresh unstarted task).
 *
 * Waiting Verification -> Done always requires an explicit verify action
 * (never a drag alone — see canVerify) from whoever owns that step: the
 * assigned reviewer if one is set, or the housekeeper themselves
 * (self-review) if not. A task with no checklist at all has nothing to
 * verify, so it skips Waiting Verification entirely and lands straight in
 * Done the moment it's marked done.
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
import { api, HOUSEKEEPING_CATEGORY_LABELS, housekeepingCategoryOf } from '@stayos/api-client';
import type { HousekeepingTask, HousekeepingCategory, ApiError } from '@stayos/api-client';
import { SkeletonLoader, useToast, RoleGate, Icons } from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { useSession, hasPermission } from '@stayos/auth';
import { housekeepingKeys } from '@/lib/query-keys';

type ColumnKey = HousekeepingCategory;

const COLUMN_ORDER: ColumnKey[] = ['pending', 'in_progress', 'waiting_verification', 'done'];

function roomNumberOf(task: HousekeepingTask): string {
  return typeof task.roomId === 'string' ? task.roomId : task.roomId.roomNumber;
}

function checklistProgress(task: HousekeepingTask): string {
  if (!task.checklist.length) return '';
  const done = task.checklist.filter((c) => c.completed).length;
  return `${done}/${task.checklist.length} checked`;
}

function fullName(p: { firstName: string; lastName: string } | null | undefined): string {
  return p ? `${p.firstName} ${p.lastName}` : '';
}

function isOverdue(task: HousekeepingTask): boolean {
  return !!task.dueDate && housekeepingCategoryOf(task.status) !== 'done' && new Date(task.dueDate) < new Date();
}

function dueLabel(task: HousekeepingTask): string {
  return task.dueDate
    ? new Date(task.dueDate).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';
}

// Who's allowed to move this task out of Waiting Verification: the
// assigned reviewer if one is set, otherwise the housekeeper themselves
// (self-review) — matches housekeeping.service.js#inspectTask exactly.
function canVerify(task: HousekeepingTask, userId?: string): boolean {
  if (!userId) return false;
  return task.reviewerId ? task.reviewerId._id === userId : task.assignedTo?._id === userId;
}

interface TaskCardProps {
  task: HousekeepingTask;
  canVerifyThis: boolean;
  dragging?: boolean;
  onStart: (id: string) => void;
  onMarkDone: (id: string) => void;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  pendingAction: string | null;
}

function TaskCardBody({ task, canVerifyThis, onStart, onMarkDone, onVerify, onReject, pendingAction }: Omit<TaskCardProps, 'dragging'>): React.ReactElement {
  const col = housekeepingCategoryOf(task.status);
  const progress = checklistProgress(task);
  const overdue = isOverdue(task);

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
      {task.dueDate && (
        <span data-task-due data-overdue={overdue || undefined}>
          <Icons.Clock width={11} height={11} aria-hidden="true" />
          {' '}{overdue ? 'Overdue — ' : 'Due '}{dueLabel(task)}
        </span>
      )}
      {progress && col !== 'done' && <span data-task-assignee>{progress}</span>}
      {col === 'done' && task.inspectedBy && (
        <span data-task-assignee>
          {task.inspectedBy._id === task.assignedTo?._id ? 'Self-verified by' : 'Reviewed by'} {fullName(task.inspectedBy)}
        </span>
      )}
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

        {col === 'waiting_verification' && canVerifyThis && (
          <>
            <button
              type="button" data-btn-primary data-btn-sm
              disabled={pendingAction === task._id}
              onClick={(e) => { e.stopPropagation(); onVerify(task._id); }}
            >
              Verify
            </button>
            {/* Rejecting back for a re-clean only makes sense when someone
                else did the work — a self-review has no one to reject to. */}
            {task.reviewerId && (
              <button
                type="button" data-btn-ghost data-btn-sm data-destructive
                disabled={pendingAction === task._id}
                onClick={(e) => { e.stopPropagation(); onReject(task._id); }}
              >
                Reject
              </button>
            )}
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
  column, tasks, userId, ...cardProps
}: {
  column: ColumnKey;
  tasks: HousekeepingTask[];
  userId?: string;
} & Omit<TaskCardProps, 'task' | 'dragging' | 'canVerifyThis'>): React.ReactElement {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  const label = HOUSEKEEPING_CATEGORY_LABELS[column];

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
              canVerifyThis={canVerify(task, userId)}
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

  // Filter by creation date or due date — independent of the board/reviews
  // toggle above, and only meaningful in the board view (the reviews queue
  // is already narrowed server-side to a specific small set).
  const [dateField, setDateField] = useState<'' | 'createdAt' | 'dueDate'>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const dateRangeFilters = useMemo(() => {
    if (view !== 'board' || !dateField) return {};
    const from = dateField === 'createdAt' ? { createdFrom: dateFrom } : { dueDateFrom: dateFrom };
    const to   = dateField === 'createdAt' ? { createdTo: dateTo } : { dueDateTo: dateTo };
    return {
      ...(dateFrom ? from : {}),
      ...(dateTo ? to : {}),
    };
  }, [view, dateField, dateFrom, dateTo]);

  const filters = view === 'reviews' ? { view: 'reviewer' as const } : dateRangeFilters;
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
    const map: Record<ColumnKey, HousekeepingTask[]> = { pending: [], in_progress: [], waiting_verification: [], done: [] };
    for (const t of tasks ?? []) map[housekeepingCategoryOf(t.status)].push(t);
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

    const from = housekeepingCategoryOf(task.status);
    const to = over.id as ColumnKey;
    if (from === to) return;

    if (from === 'pending' && to === 'in_progress') {
      statusMutation.mutate({ id: task._id, status: 'in_progress' });
    } else if (from === 'in_progress' && to === 'waiting_verification') {
      statusMutation.mutate({ id: task._id, status: 'completed' });
    } else if (from === 'waiting_verification' && to === 'done') {
      if (!canVerify(task, session?.userId)) {
        toast('Only the assigned reviewer, or the housekeeper if none is set, can verify this task.', 'error');
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

      {view === 'board' && (
        <div data-filter-bar>
          <select
            value={dateField}
            onChange={(e) => setDateField(e.target.value as typeof dateField)}
            data-filter-input
            aria-label="Filter tasks by date"
          >
            <option value="">All tasks</option>
            <option value="createdAt">Created date</option>
            <option value="dueDate">Due date</option>
          </select>
          {dateField && (
            <>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} data-filter-input placeholder="From" aria-label="From" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} data-filter-input placeholder="To" aria-label="To" />
            </>
          )}
        </div>
      )}

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
                  canVerifyThis
                  {...cardHandlers}
                />
              </div>
            ))}
          </div>
        )
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div data-kanban>
            {COLUMN_ORDER.map((key) => (
              <KanbanColumn
                key={key}
                column={key}
                tasks={grouped[key]}
                {...(session?.userId ? { userId: session.userId } : {})}
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
                  canVerifyThis={canVerify(activeTask, session?.userId)}
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
