'use client';

import Link from 'next/link';

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@stayos/api-client';
import type { ApiError, ChecklistItem } from '@stayos/api-client';
import {
  SkeletonLoader, StatusBadge, ReadOnlyField, RoleGate, useToast, InlineError, Icons,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { useSession } from '@stayos/auth';
import { housekeepingKeys, staffKeys } from '@/lib/query-keys';

const HK_ROLES = ['housekeeper', 'housekeeper_supervisor', 'property_manager', 'property_admin'];

function fullName(p: { firstName: string; lastName: string } | null | undefined): string {
  return p ? `${p.firstName} ${p.lastName}` : 'Unassigned';
}

export default function HousekeepingTaskDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = useSession();

  const [reassignId, setReassignId] = useState('');
  const [reviewerSelectId, setReviewerSelectId] = useState('');
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState<string | undefined>();

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

  // Local editable copy of the checklist — toggling a box only updates
  // this; nothing hits the network until "Save checklist" is pressed.
  const [localChecklist, setLocalChecklist] = useState<ChecklistItem[]>([]);
  const [checklistDirty, setChecklistDirty] = useState(false);
  useEffect(() => {
    if (task && !checklistDirty) setLocalChecklist(task.checklist);
  }, [task, checklistDirty]);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: housekeepingKeys.task(id) });
    void queryClient.invalidateQueries({ queryKey: ['housekeeping', 'tasks'] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: 'in_progress' | 'completed') => api.housekeeping.updateStatus(id, status),
    onSuccess: (updated) => {
      invalidateAll();
      toast(
        updated.status === 'inspected'
          ? 'Marked done — no reviewer assigned, so this is self-verified.'
          : 'Status updated.',
        'success'
      );
    },
    onError: (err: ApiError) => toast(err.message ?? 'Could not update status.', 'error'),
  });

  const checklistMutation = useMutation({
    mutationFn: (items: { _id: string; completed: boolean }[]) => api.housekeeping.updateChecklist(id, items),
    onSuccess: () => {
      setChecklistDirty(false);
      invalidateAll();
      toast('Checklist saved.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Could not save the checklist.', 'error'),
  });

  const inspectMutation = useMutation({
    mutationFn: ({ passed, notes }: { passed: boolean; notes?: string }) =>
      api.housekeeping.inspectTask(id, passed, notes),
    onSuccess: (_data, vars) => {
      invalidateAll();
      setShowRejectReason(false);
      setRejectReason('');
      toast(vars.passed ? 'Task verified.' : 'Sent back for re-clean.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Could not submit the review.', 'error'),
  });

  const reassignMutation = useMutation({
    mutationFn: (assignedTo: string) => api.housekeeping.updateTask(id, { assignedTo }),
    onSuccess: () => { invalidateAll(); setReassignId(''); toast('Reassigned.', 'success'); },
    onError: (err: ApiError) => toast(err.message ?? 'Could not reassign.', 'error'),
  });

  const reviewerMutation = useMutation({
    mutationFn: (reviewerId: string) => api.housekeeping.updateTask(id, { reviewerId }),
    onSuccess: () => { invalidateAll(); setReviewerSelectId(''); toast('Reviewer set.', 'success'); },
    onError: (err: ApiError) => toast(err.message ?? 'Could not set reviewer.', 'error'),
  });

  if (isLoading) return <SkeletonLoader rows={5} />;
  if (!task) return <p>Task not found.</p>;

  const roomLabel = typeof task.roomId === 'object' ? `Room ${task.roomId.roomNumber}` : 'Room —';
  const isReviewer = !!session && task.reviewerId?._id === session.userId;
  const allChecked = localChecklist.length > 0 && localChecklist.every((c) => c.completed);
  const checklistEditable =
    task.status === 'in_progress' || task.status === 're_clean' || (task.status === 'completed' && isReviewer);

  function toggleItem(itemId: string) {
    setLocalChecklist((prev) => prev.map((c) => (c._id === itemId ? { ...c, completed: !c.completed } : c)));
    setChecklistDirty(true);
  }

  function saveChecklist() {
    checklistMutation.mutate(localChecklist.map((c) => ({ _id: c._id, completed: c.completed })));
  }

  return (
    <div data-page="hk-task-detail">
      <div data-page-header>
        <div>
          <Link href="/housekeeping" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Housekeeping</Link>
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
            <ReadOnlyField label="Assigned to" value={fullName(task.assignedTo)} />
            <ReadOnlyField
              label="Reviewer"
              value={task.reviewerId ? fullName(task.reviewerId) : 'None — housekeeper self-verifies'}
            />
            <ReadOnlyField
              label="Scheduled"
              value={new Date(task.scheduledDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
            />
            {task.notes && <ReadOnlyField label="Notes" value={task.notes} />}
            {task.status === 're_clean' && task.reCleanReason && (
              <ReadOnlyField label="Re-clean reason" value={task.reCleanReason} />
            )}
            {task.status === 'inspected' && task.inspectedBy && (
              <ReadOnlyField
                label={task.inspectedBy._id === task.assignedTo?._id ? 'Self-verified by' : 'Verified by'}
                value={`${fullName(task.inspectedBy)}${task.inspectedAt ? ' — ' + new Date(task.inspectedAt).toLocaleDateString('en-ZA') : ''}`}
              />
            )}
          </div>

          <RoleGate perm={PERMISSIONS.HOUSEKEEPING_ALL}>
            <div data-reassign-row>
              <select value={reassignId} onChange={(e) => setReassignId(e.target.value)} data-reassign-select>
                <option value="">Reassign to…</option>
                {hkStaff.map((s) => (
                  <option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
              <button
                type="button" data-btn-ghost
                disabled={!reassignId || reassignMutation.isPending}
                onClick={() => { if (reassignId) reassignMutation.mutate(reassignId); }}
              >
                Reassign
              </button>
            </div>
            <div data-reassign-row>
              <select value={reviewerSelectId} onChange={(e) => setReviewerSelectId(e.target.value)} data-reassign-select>
                <option value="">Set reviewer…</option>
                {hkStaff.map((s) => (
                  <option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
              <button
                type="button" data-btn-ghost
                disabled={!reviewerSelectId || reviewerMutation.isPending}
                onClick={() => { if (reviewerSelectId) reviewerMutation.mutate(reviewerSelectId); }}
              >
                Set reviewer
              </button>
            </div>
          </RoleGate>
        </section>

        <section data-detail-section>
          <h2>Checklist</h2>
          {localChecklist.length === 0 ? (
            <p data-empty-note>No checklist items.</p>
          ) : (
            <>
              <div data-checklist>
                {localChecklist.map((item) => (
                  <label key={item._id} data-checklist-item data-disabled={!checklistEditable || undefined}>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      disabled={!checklistEditable}
                      onChange={() => toggleItem(item._id)}
                    />
                    <span data-item-label>{item.item}</span>
                  </label>
                ))}
              </div>
              {checklistEditable && (
                <button
                  type="button" data-btn-primary data-btn-sm
                  disabled={!checklistDirty || checklistMutation.isPending}
                  onClick={saveChecklist}
                >
                  {checklistMutation.isPending ? 'Saving…' : 'Save checklist'}
                </button>
              )}
            </>
          )}
        </section>
      </div>

      {/* Actions */}
      <div data-action-bar>
        {(task.status === 'pending' || task.status === 'assigned') && (
          <button
            type="button" data-btn-primary
            disabled={statusMutation.isPending}
            onClick={() => statusMutation.mutate('in_progress')}
          >
            Start task
          </button>
        )}

        {(task.status === 'in_progress' || task.status === 're_clean') && (
          <button
            type="button" data-btn-primary
            disabled={statusMutation.isPending || !allChecked}
            title={!allChecked ? 'Complete every checklist item first' : undefined}
            onClick={() => statusMutation.mutate('completed')}
          >
            Mark done
          </button>
        )}
        {(task.status === 'in_progress' || task.status === 're_clean') && !allChecked && (
          <span data-form-note>Complete the checklist to mark this task done.</span>
        )}

        {task.status === 'completed' && isReviewer && !showRejectReason && (
          <>
            <button
              type="button" data-btn-primary
              disabled={inspectMutation.isPending}
              onClick={() => inspectMutation.mutate({ passed: true })}
            >
              Verify
            </button>
            <button
              type="button" data-btn-ghost data-destructive
              disabled={inspectMutation.isPending}
              onClick={() => setShowRejectReason(true)}
            >
              Reject — needs re-clean
            </button>
          </>
        )}

        {task.status === 'completed' && !isReviewer && task.reviewerId && (
          <span data-form-note>Awaiting review by {fullName(task.reviewerId)}.</span>
        )}
      </div>

      {showRejectReason && (
        <div data-detail-section>
          <label htmlFor="rejectReason">What needs to be redone?</label>
          <textarea
            id="rejectReason"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            maxLength={1000}
          />
          <InlineError message={rejectReasonError} />
          <div data-form-actions>
            <button type="button" data-btn-ghost onClick={() => { setShowRejectReason(false); setRejectReason(''); setRejectReasonError(undefined); }}>
              Cancel
            </button>
            <button
              type="button" data-btn-primary data-destructive
              disabled={inspectMutation.isPending}
              onClick={() => {
                const reason = rejectReason.trim();
                if (!reason) { setRejectReasonError('A reason is required.'); return; }
                inspectMutation.mutate({ passed: false, notes: reason });
              }}
            >
              {inspectMutation.isPending ? 'Sending…' : 'Send back for re-clean'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
