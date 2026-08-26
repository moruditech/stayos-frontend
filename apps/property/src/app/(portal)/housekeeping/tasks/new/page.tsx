'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { InlineError, applyServerErrors, useToast } from '@stayos/ui';
import { roomKeys, staffKeys } from '@/lib/query-keys';

// Housekeeping-relevant roles for the assignee picker.
// TAD 11 §5: backend does NOT validate assignee role — this filter is the
// only safeguard against a misdirected assignment.
const HK_ROLES = ['housekeeper', 'housekeeper_supervisor', 'property_manager', 'property_admin'];

const schema = z.object({
  roomId:     z.string().min(1, 'Room is required'),
  type:       z.string().min(1, 'Task type is required'),
  priority:   z.enum(['low', 'medium', 'high']).default('medium'),
  assignedTo: z.string().optional(),
  notes:      z.string().optional(),
  dueDate:    z.string().optional(),
});
type FormInput = z.infer<typeof schema>;

export default function NewHousekeepingTaskPage(): React.ReactElement {
  const router = useRouter();
  const { toast } = useToast();

  const { data: rooms } = useQuery({
    queryKey: roomKeys.list(),
    queryFn: () => api.rooms.list(),
    staleTime: 120_000,
  });

  const { data: allStaff } = useQuery({
    queryKey: staffKeys.list(),
    queryFn: () => api.staff.list(),
    staleTime: 120_000,
  });

  const hkStaff = (allStaff ?? []).filter((s) => HK_ROLES.includes(s.role));

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium' },
  });

  const createMutation = useMutation({
    mutationFn: (input: FormInput) => api.housekeeping.createTask(input as unknown as Parameters<typeof api.housekeeping.createTask>[0]),
    onSuccess: (task) => {
      const t = task as unknown as Record<string, unknown>;
      toast('Task created.', 'success');
      router.replace(`/housekeeping/tasks/${String(t['_id'])}`);
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else toast(err.message ?? 'Failed.', 'error');
    },
  });

  return (
    <div data-page="new-hk-task">
      <div data-page-header>
        <div>
          <a href="/housekeeping" data-breadcrumb>← Housekeeping</a>
          <h1>New housekeeping task</h1>
        </div>
      </div>

      <div data-form-container>
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label htmlFor="hk-room">Room</label>
            <select id="hk-room" {...form.register('roomId')}>
              <option value="">Select a room…</option>
              {(rooms ?? []).map((r) => (
                <option key={r._id} value={r._id}>
                  Room {r.roomNumber} — {r.name ?? r.type}
                </option>
              ))}
            </select>
            <InlineError message={form.formState.errors.roomId?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="hk-type">Task type</label>
            <select id="hk-type" {...form.register('type')}>
              <option value="">Select type…</option>
              <option value="full_clean">Full clean</option>
              <option value="turndown">Turndown service</option>
              <option value="linen_change">Linen change</option>
              <option value="deep_clean">Deep clean</option>
              <option value="inspection">Inspection</option>
              <option value="other">Other</option>
            </select>
            <InlineError message={form.formState.errors.type?.message} />
          </div>

          <div data-form-row>
            <div data-form-group>
              <label htmlFor="hk-priority">Priority</label>
              <select id="hk-priority" {...form.register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div data-form-group>
              <label htmlFor="hk-due">Due date <span data-optional>(optional)</span></label>
              <input id="hk-due" type="date" {...form.register('dueDate')} />
            </div>
          </div>

          <div data-form-group>
            <label htmlFor="hk-assign">
              Assign to <span data-optional>(optional)</span>
            </label>
            <select id="hk-assign" {...form.register('assignedTo')}>
              <option value="">Unassigned</option>
              {hkStaff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName} ({s.role.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
            <p data-field-hint>Only housekeeping-relevant staff are shown.</p>
          </div>

          <div data-form-group>
            <label htmlFor="hk-notes">Notes <span data-optional>(optional)</span></label>
            <textarea id="hk-notes" rows={3} {...form.register('notes')} />
          </div>

          <div data-form-actions>
            <a href="/housekeeping" data-btn-ghost>Cancel</a>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
