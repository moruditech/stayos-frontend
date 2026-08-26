'use client';

/**
 * Staff management — property settings.
 *
 * TAD 11 §2: two separate permission gates:
 *   staff:manage          → create, view, update, delete staff accounts
 *   staff:permissions:manage → per-user permission overrides
 *
 * The two are deliberately distinct: day-to-day staff management does NOT
 * automatically include the authority to alter individual permission grants.
 * Permissions management is reserved for property_admin and property_owner.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader,
  EmptyState,
  StatusBadge,
  RoleGate,
  useToast,
  Modal,
  InlineError,
  applyServerErrors,
  ConfirmDialog,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { staffKeys } from '@/lib/query-keys';

const PROPERTY_ROLES = [
  'property_owner',
  'property_admin',
  'property_manager',
  'front_desk_manager',
  'receptionist',
  'revenue_manager',
  'hr_manager',
  'housekeeper_supervisor',
  'housekeeper',
  'kitchen_staff',
  'maintenance_supervisor',
  'maintenance_technician',
  'property_accountant',
];

const createStaffSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  email:     z.string().email('Valid email required'),
  role:      z.string().min(1, 'Role is required'),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
  phone:     z.string().optional(),
});
type CreateStaffInput = z.infer<typeof createStaffSchema>;

export default function StaffSettingsPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewModal, setShowNewModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: staff, isLoading } = useQuery({
    queryKey: staffKeys.list(),
    queryFn: () => api.staff.list(),
  });

  const form = useForm<CreateStaffInput>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: { role: 'receptionist' },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateStaffInput) =>
      api.staff.create(input as unknown as Parameters<typeof api.staff.create>[0]),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffKeys.list() });
      setShowNewModal(false);
      form.reset();
      toast('Staff account created.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else toast(err.message ?? 'Failed to create staff account.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.staff.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffKeys.list() });
      setDeletingId(null);
      toast('Staff account removed.', 'success');
    },
    onError: (err: ApiError) => {
      setDeletingId(null);
      toast(err.message ?? 'Failed.', 'error');
    },
  });

  if (isLoading) return <SkeletonLoader rows={5} />;

  return (
    <div data-page="staff-settings">
      <div data-page-header>
        <div>
          <a href="/settings/property" data-breadcrumb>← Settings</a>
          <h1>Staff accounts</h1>
        </div>
        <RoleGate perm={PERMISSIONS.STAFF_MANAGE}>
          <button
            type="button"
            data-btn-primary
            onClick={() => setShowNewModal(true)}
          >
            + Add staff member
          </button>
        </RoleGate>
      </div>

      {!staff?.length ? (
        <EmptyState
          title="No staff accounts"
          description="Add staff members to give them access to the portal."
        />
      ) : (
        <table data-table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s._id}>
                <td>{s.firstName} {s.lastName}</td>
                <td>{s.email}</td>
                <td><span data-role-badge>{s.role.replace(/_/g, ' ')}</span></td>
                <td><StatusBadge status={s.status} /></td>
                <td>
                  <div data-action-cluster>
                    <a href={`/settings/staff/${s._id}`} data-btn-ghost data-btn-sm>
                      Edit
                    </a>
                    {/* Permission overrides — separate gate from staff:manage */}
                    <RoleGate perm={PERMISSIONS.STAFF_PERMISSIONS_MANAGE}>
                      <a
                        href={`/settings/staff/${s._id}?tab=permissions`}
                        data-btn-ghost data-btn-sm
                      >
                        Permissions
                      </a>
                    </RoleGate>
                    <RoleGate perm={PERMISSIONS.STAFF_MANAGE}>
                      <button
                        type="button"
                        data-btn-ghost data-btn-sm data-destructive
                        onClick={() => setDeletingId(s._id)}
                      >
                        Remove
                      </button>
                    </RoleGate>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Create staff modal */}
      <Modal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Add staff member"
      >
        <form
          onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
          noValidate
          data-form
        >
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="staffFirst">First name</label>
              <input id="staffFirst" type="text" {...form.register('firstName')} />
              <InlineError message={form.formState.errors.firstName?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="staffLast">Last name</label>
              <input id="staffLast" type="text" {...form.register('lastName')} />
              <InlineError message={form.formState.errors.lastName?.message} />
            </div>
          </div>
          <div data-form-group>
            <label htmlFor="staffEmail">Email</label>
            <input id="staffEmail" type="email" {...form.register('email')} />
            <InlineError message={form.formState.errors.email?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="staffRole">Role</label>
            <select id="staffRole" {...form.register('role')}>
              {PROPERTY_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <InlineError message={form.formState.errors.role?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="staffPhone">Phone <span data-optional>(optional)</span></label>
            <input id="staffPhone" type="tel" {...form.register('phone')} />
          </div>
          <div data-form-group>
            <label htmlFor="staffPass">Temporary password</label>
            <input id="staffPass" type="password" {...form.register('password')} />
            <InlineError message={form.formState.errors.password?.message} />
            <p data-field-hint>The staff member should change this on first login.</p>
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNewModal(false)}>
              Cancel
            </button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Add staff member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm remove dialog */}
      <ConfirmDialog
        open={!!deletingId}
        title="Remove staff member?"
        message="This will revoke their access to the portal. This action cannot be undone."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (deletingId) deleteMutation.mutate(deletingId);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
