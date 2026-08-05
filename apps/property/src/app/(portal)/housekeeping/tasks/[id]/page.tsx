'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader, StatusBadge, ReadOnlyField, RoleGate, useToast, ConfirmDialog,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { housekeepingKeys, staffKeys } from '@/lib/query-keys';

const HK_ROLES = ['housekeeper', 'housekeeper_supervisor', 'property_manager', 'property_admin'];

export default function HousekeepingTaskDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reassignId, setReassignId] = useState('');
  const [confirmInspect, setConfirmInspect] = useState<boolean | null>(null);

  const { data: task, isLoading } = useQuery({
    queryKey: housekeepingKeys.task(id),
    queryFn: () => api.housekeeping.getTask(id),
    staleTime: 30_000,
  });

  const { data: allStaff } = useQuery({
    queryKey: staffKeys.list(),
    queryFn: () => api.staff.list(),
    staleTime: 120_000,
    enabled: !!task,
  });

  const hkStaff = (allStaff ?? []).filter((s) => HK_ROLES.includes(s.role));

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.housekeeping.updateStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: housekeepingKeys.task(id) });
      void queryClient.invalidateQueries({ queryKey: housekeepingKeys.tasks() });
      toast('Status updated.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  const reassignMutation = useMutation({
    mutationFn: (assignedTo: string) => api.housekeeping.updateTask(id, { assignedTo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: housekeepingKeys.task(id) });
      toast('Reassigned.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  const inspectMutation = useMutation({
    mutationFn: (passed: boolean) => api.housekeeping.inspectTask(id, passed),
    onSuccess: (_, passed) => {
      void queryClient.invalidateQueries({ queryKey: housekeepingKeys.task(id) });
      void queryClient.invalidateQueries({ queryKey: housekeepingKeys.tasks() });
      setConfirmInspect(null);
      toast(passed ? 'Inspection passed.' : 'Re-clean requested.', 'success');
    },
    onError: (err: ApiError) => { setConfirmInspect(null); toast(err.message ?? 'Failed.', 'error'); },
  });

  const checklistMutation = useMutation({
    mutationFn: (checklist: { item: string; done: boolean }[]) =>
      api.housekeeping.updateChecklist(id, checklist),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: housekeepingKeys.task(id) });
    },
  });

  if (isLoading) return <SkeletonLoader rows={5} />;
  if (!task) return <p>Task not found.</p>;

  const roomLabel = typeof task.roomId === 'object' && task.roomId !== null
    ? `Room ${task.roomId.roomNumber}`
    : 'Room —';
  const assigneeName = task.assignedTo && typeof task.assignedTo === 'object'
    ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
    : 'Unassigned';

  const nextStatus: Record<string, string> = {
    pending: 'in_progress', in_progress: 'done',
  };

  return (
    <div data-page="hk-task-detail">
      <div data-page-header>
        <div>
          <a href="/housekeeping" data-breadcrumb>← Housekeeping</a>
          <h1>{task.type.replace(/_/g, ' ')}</h1>
        </div>
        <StatusBadge status={task.status} />
      </div>

      <div data-detail-grid>
        <section data-detail-section>
          <h2>Task details</h2>
          <div data-field-list>
            <ReadOnlyField label="Room" value={roomLabel} />
            <ReadOnlyField label="Type" value={task.type.replace(/_/g, ' ')} />
            <ReadOnlyField label="Priority" value={task.priority} />
            <ReadOnlyField label="Assigned to" value={assigneeName} />
            {task.dueDate && (
              <ReadOnlyField label="Due" value={new Date(task.dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} />
            )}
            {task.notes && <ReadOnlyField label="Notes" value={task.notes} />}
          </div>
        </section>

        <section data-detail-section>
          <h2>Checklist</h2>
          {!task.checklist.length ? (
            <p data-empty-note>No checklist items.</p>
          ) : (
            <div data-checklist>
              {task.checklist.map((item, idx) => (
                <label key={idx} data-checklist-item>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(e) => {
                      const updated = task.checklist.map((c, i) =>
                        i === idx ? { ...c, done: e.target.checked } : c
                      );
                      checklistMutation.mutate(updated);
                    }}
                  />
                  <span data-item-label>{item.item}</span>
                </label>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Actions */}
      <div data-action-bar>
        {nextStatus[task.status] && (
          <button type="button" data-btn-primary
            disabled={statusMutation.isPending}
            onClick={() => statusMutation.mutate(nextStatus[task.status])}>
            {task.status === 'pending' ? 'Start task' : 'Mark done'}
          </button>
        )}

        {task.status === 'done' && (
          <RoleGate perm={PERMISSIONS.HOUSEKEEPING_ALL}>
            <button type="button" data-btn-primary
              onClick={() => setConfirmInspect(true)}>
              Inspect
            </button>
          </RoleGate>
        )}

        <RoleGate perm={PERMISSIONS.HOUSEKEEPING_ALL}>
          <div data-reassign-row>
            <select value={reassignId} onChange={(e) => setReassignId(e.target.value)} data-reassign-select>
              <option value="">Reassign to…</option>
              {hkStaff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
            <button type="button" data-btn-ghost
              disabled={!reassignId || reassignMutation.isPending}
              onClick={() => { if (reassignId) reassignMutation.mutate(reassignId); }}>
              Reassign
            </button>
          </div>
        </RoleGate>
      </div>

      <ConfirmDialog
        open={confirmInspect !== null}
        title="Inspection result"
        message="Did the room pass inspection?"
        confirmLabel="Passed"
        cancelLabel="Failed — request re-clean"
        onConfirm={() => inspectMutation.mutate(true)}
        onCancel={() => inspectMutation.mutate(false)}
      />
    </div>
  );
}
