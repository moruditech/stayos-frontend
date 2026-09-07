'use client';

import Link from 'next/link';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError, HousekeepingTaskType } from '@stayos/api-client';
import { InlineError, applyServerErrors, useToast, Icons } from '@stayos/ui';
import { roomKeys, staffKeys, housekeepingKeys } from '@/lib/query-keys';

// Housekeeping-relevant roles for the assignee/reviewer pickers.
// TAD 11 §5: backend does NOT validate assignee role — this filter is the
// only safeguard against a misdirected assignment.
const HK_ROLES = ['housekeeper', 'housekeeper_supervisor', 'property_manager', 'property_admin'];

// Matches HousekeepingTask.model.js's real enums exactly.
const TASK_TYPES: { value: HousekeepingTaskType; label: string }[] = [
  { value: 'checkout_clean', label: 'Checkout clean' },
  { value: 'stayover_clean', label: 'Stayover clean' },
  { value: 'deep_clean',     label: 'Deep clean' },
  { value: 'inspection',     label: 'Inspection' },
  { value: 'turndown',       label: 'Turndown service' },
  { value: 'linen_change',   label: 'Linen change' },
];

const schema = z.object({
  roomId:        z.string().min(1, 'Room is required'),
  type:          z.enum(['checkout_clean', 'stayover_clean', 'deep_clean', 'inspection', 'turndown', 'linen_change']),
  priority:      z.enum(['low', 'normal', 'high']).default('normal'),
  assignedTo:    z.string().optional(),
  reviewerId:    z.string().optional(),
  notes:         z.string().optional(),
  scheduledDate: z.string().optional(),
});
type FormInput = z.infer<typeof schema>;

function sourceLabel(source: 'room_override' | 'template' | 'default' | null, roomLabel: string): string {
  if (source === 'room_override') return `Using ${roomLabel}'s saved checklist for this task type.`;
  if (source === 'template') return 'Using your saved default checklist for this task type.';
  if (source === 'default') return 'Using the built-in default checklist — customize and save it below if you like.';
  return '';
}

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
    defaultValues: { priority: 'normal' },
  });
  const watchedRoomId = form.watch('roomId');
  const watchedType = form.watch('type');
  const selectedRoom = (rooms ?? []).find((r) => r._id === watchedRoomId);
  const roomLabel = selectedRoom ? `Room ${selectedRoom.roomNumber}` : 'this room';

  // Checklist — a locally-editable copy, auto-filled from the resolved
  // template/override whenever type or room changes, but only until the
  // user actually edits it (checklistTouched) so their own changes are
  // never silently discarded by a later room/type tweak.
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [checklistTouched, setChecklistTouched] = useState(false);
  const [checklistSource, setChecklistSource] = useState<'room_override' | 'template' | 'default' | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [saveAsGeneralTemplate, setSaveAsGeneralTemplate] = useState(false);
  const [saveAsRoomOverride, setSaveAsRoomOverride] = useState(false);

  const { data: resolved } = useQuery({
    queryKey: housekeepingKeys.checklist(watchedType, watchedRoomId),
    queryFn: () => api.housekeeping.resolveChecklist(watchedType, watchedRoomId || undefined),
    enabled: !!watchedType,
  });

  useEffect(() => {
    if (resolved && !checklistTouched) {
      setChecklistItems(resolved.items);
      setChecklistSource(resolved.source);
    }
  }, [resolved, checklistTouched]);

  function updateItem(index: number, text: string) {
    setChecklistItems((prev) => prev.map((it, i) => (i === index ? text : it)));
    setChecklistTouched(true);
  }
  function removeItem(index: number) {
    setChecklistItems((prev) => prev.filter((_, i) => i !== index));
    setChecklistTouched(true);
  }
  function addItem() {
    const text = newItemText.trim();
    if (!text) return;
    setChecklistItems((prev) => [...prev, text]);
    setNewItemText('');
    setChecklistTouched(true);
  }

  const createMutation = useMutation({
    mutationFn: async (input: FormInput) => {
      const { roomId, type, priority, assignedTo, reviewerId, notes, scheduledDate } = input;
      const task = await api.housekeeping.createTask({
        roomId,
        type,
        priority,
        ...(assignedTo ? { assignedTo } : {}),
        ...(reviewerId ? { reviewerId } : {}),
        ...(notes ? { notes } : {}),
        ...(scheduledDate ? { scheduledDate } : {}),
        checklist: checklistItems.filter((it) => it.trim().length > 0),
      });

      // Saved separately from task creation — these are reusable for
      // every future task of this type (and/or this room), not just this
      // one, so they're their own explicit action rather than bundled
      // silently into "create task".
      if (saveAsGeneralTemplate) {
        await api.housekeeping.saveChecklistTemplate({ taskType: input.type, items: checklistItems });
      }
      if (saveAsRoomOverride && input.roomId) {
        await api.housekeeping.saveChecklistTemplate({ taskType: input.type, roomId: input.roomId, items: checklistItems });
      }

      return task;
    },
    onSuccess: (task) => {
      toast('Task created.', 'success');
      router.replace(`/housekeeping/tasks/${task._id}`);
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else toast(err.message ?? 'Failed to create task.', 'error');
    },
  });

  return (
    <div data-page="new-hk-task">
      <div data-page-header>
        <div>
          <Link href="/housekeeping" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Housekeeping</Link>
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
              {TASK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <InlineError message={form.formState.errors.type?.message} />
          </div>

          <div data-form-row>
            <div data-form-group>
              <label htmlFor="hk-priority">Priority</label>
              <select id="hk-priority" {...form.register('priority')}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
            <div data-form-group>
              <label htmlFor="hk-scheduled">Scheduled date <span data-optional>(optional)</span></label>
              <input id="hk-scheduled" type="date" {...form.register('scheduledDate')} />
            </div>
          </div>

          <div data-form-row>
            <div data-form-group>
              <label htmlFor="hk-assign">Assign to <span data-optional>(optional)</span></label>
              <select id="hk-assign" {...form.register('assignedTo')}>
                <option value="">Unassigned</option>
                {hkStaff.map((s) => (
                  <option key={s._id} value={s._id}>{s.firstName} {s.lastName} ({s.role.replace(/_/g, ' ')})</option>
                ))}
              </select>
            </div>
            <div data-form-group>
              <label htmlFor="hk-reviewer">Reviewer <span data-optional>(optional)</span></label>
              <select id="hk-reviewer" {...form.register('reviewerId')}>
                <option value="">None — housekeeper self-verifies</option>
                {hkStaff.map((s) => (
                  <option key={s._id} value={s._id}>{s.firstName} {s.lastName} ({s.role.replace(/_/g, ' ')})</option>
                ))}
              </select>
            </div>
          </div>
          <p data-field-hint>
            Leave reviewer blank and the housekeeper&apos;s own &quot;mark done&quot; is the verification.
            Set one and the task waits for that person to check it off before it&apos;s considered verified.
          </p>

          <div data-form-group>
            <label htmlFor="hk-notes">Notes <span data-optional>(optional)</span></label>
            <textarea id="hk-notes" rows={3} {...form.register('notes')} />
          </div>

          {watchedType && (
            <div data-form-group>
              <label>Checklist</label>
              {checklistSource && <p data-field-hint>{sourceLabel(checklistSource, roomLabel)}</p>}

              <div data-checklist>
                {checklistItems.map((item, i) => (
                  <div key={i} data-checklist-edit-row>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateItem(i, e.target.value)}
                      aria-label={`Checklist item ${i + 1}`}
                    />
                    <button type="button" data-btn-ghost data-btn-sm onClick={() => removeItem(i)} aria-label="Remove item">
                      <Icons.X width={14} height={14} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              <div data-checklist-edit-row>
                <input
                  type="text"
                  placeholder="Add a checklist item…"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
                />
                <button type="button" data-btn-ghost data-btn-sm onClick={addItem}>Add</button>
              </div>

              <div data-checkbox-group>
                <label htmlFor="hk-save-general">
                  <input
                    id="hk-save-general" type="checkbox"
                    checked={saveAsGeneralTemplate}
                    onChange={(e) => setSaveAsGeneralTemplate(e.target.checked)}
                  />
                  {' '}Save as the default checklist for {TASK_TYPES.find((t) => t.value === watchedType)?.label}
                </label>
                <label htmlFor="hk-save-room">
                  <input
                    id="hk-save-room" type="checkbox"
                    checked={saveAsRoomOverride}
                    disabled={!watchedRoomId}
                    onChange={(e) => setSaveAsRoomOverride(e.target.checked)}
                  />
                  {' '}Save as {roomLabel}&apos;s custom checklist for this task type
                </label>
              </div>
            </div>
          )}

          <div data-form-actions>
            <Link href="/housekeeping" data-btn-ghost>Cancel</Link>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
