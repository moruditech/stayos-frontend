'use client';

/**
 * Individual staff member edit page.
 * TAD 11 §2: two separate permission gates enforced at the action level:
 *   staff:manage          → edit name, role, status
 *   staff:permissions:manage → add/remove per-user permission overrides
 *
 * ?tab=permissions links here directly from the staff list.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader,
  ReadOnlyField,
  StatusBadge,
  RoleGate,
  InlineError,
  applyServerErrors,
  useToast,
} from '@stayos/ui';
import { PERMISSIONS, PROPERTY_ROLES } from '@stayos/constants';
import { staffKeys } from '@/lib/query-keys';

const PROPERTY_ROLE_LIST = Object.values(PROPERTY_ROLES);

const editSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  role:      z.string().min(1, 'Role is required'),
  status:    z.enum(['active', 'suspended']),
});
type EditInput = z.infer<typeof editSchema>;

export default function StaffDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'profile' | 'permissions'>(
    searchParams.get('tab') === 'permissions' ? 'permissions' : 'profile'
  );
  const [editing, setEditing] = useState(false);
  const [grantInput, setGrantInput] = useState('');
  const [denyInput, setDenyInput] = useState('');

  const { data: staff, isLoading } = useQuery({
    queryKey: staffKeys.detail(id),
    queryFn: () => api.staff.get(id),
    staleTime: 60_000,
  });

  const form = useForm<EditInput>({ resolver: zodResolver(editSchema) });

  function startEditing(): void {
    const s = staff!;
    form.reset({
      firstName: s.firstName,
      lastName:  s.lastName,
      role:      s.role,
      status:    s.status as 'active' | 'suspended',
    });
    setEditing(true);
  }

  const updateMutation = useMutation({
    mutationFn: (input: EditInput) => api.staff.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffKeys.list() });
      void queryClient.invalidateQueries({ queryKey: staffKeys.detail(id) });
      setEditing(false);
      toast('Staff member updated.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else toast(err.message ?? 'Update failed.', 'error');
    },
  });

  const permMutation = useMutation({
    mutationFn: (input: { grantedPermissions: string[]; deniedPermissions: string[] }) =>
      api.staff.updatePermissions(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffKeys.detail(id) });
      toast('Permissions updated.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  if (isLoading) return <SkeletonLoader rows={5} />;
  if (!staff) return <p>Staff member not found.</p>;

  const grantedPerms: string[] = staff.grantedPermissions ?? [];
  const deniedPerms: string[]  = staff.deniedPermissions  ?? [];

  function addGrant(): void {
    const val = grantInput.trim();
    if (!val || grantedPerms.includes(val)) return;
    permMutation.mutate({ grantedPermissions: [...grantedPerms, val], deniedPermissions: deniedPerms });
    setGrantInput('');
  }

  function removeGrant(perm: string): void {
    permMutation.mutate({ grantedPermissions: grantedPerms.filter((p) => p !== perm), deniedPermissions: deniedPerms });
  }

  function addDeny(): void {
    const val = denyInput.trim();
    if (!val || deniedPerms.includes(val)) return;
    permMutation.mutate({ grantedPermissions: grantedPerms, deniedPermissions: [...deniedPerms, val] });
    setDenyInput('');
  }

  function removeDeny(perm: string): void {
    permMutation.mutate({ grantedPermissions: grantedPerms, deniedPermissions: deniedPerms.filter((p) => p !== perm) });
  }

  return (
    <div data-page="staff-detail">
      <div data-page-header>
        <div>
          <a href="/settings/staff" data-breadcrumb>← Staff accounts</a>
          <h1>{staff.firstName} {staff.lastName}</h1>
        </div>
        <StatusBadge status={staff.status} />
      </div>

      <div data-tab-bar role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'profile'} data-tab
          data-active={tab === 'profile' || undefined} onClick={() => setTab('profile')}>
          Profile
        </button>
        <RoleGate perm={PERMISSIONS.STAFF_PERMISSIONS_MANAGE}>
          <button type="button" role="tab" aria-selected={tab === 'permissions'} data-tab
            data-active={tab === 'permissions' || undefined} onClick={() => setTab('permissions')}>
            Permission overrides
          </button>
        </RoleGate>
      </div>

      {tab === 'profile' && (
        <section data-detail-section>
          <div data-section-header>
            <h2>Staff details</h2>
            <RoleGate perm={PERMISSIONS.STAFF_MANAGE}>
              {!editing && (
                <button type="button" data-btn-ghost onClick={startEditing}>Edit</button>
              )}
            </RoleGate>
          </div>

          {editing ? (
            <form onSubmit={form.handleSubmit((v) => updateMutation.mutate(v))} noValidate data-form data-form-contained>
              <div data-form-row>
                <div data-form-group>
                  <label htmlFor="sf-first">First name</label>
                  <input id="sf-first" type="text" {...form.register('firstName')} />
                  <InlineError message={form.formState.errors.firstName?.message} />
                </div>
                <div data-form-group>
                  <label htmlFor="sf-last">Last name</label>
                  <input id="sf-last" type="text" {...form.register('lastName')} />
                  <InlineError message={form.formState.errors.lastName?.message} />
                </div>
              </div>
              <div data-form-group>
                <label htmlFor="sf-role">Role</label>
                <select id="sf-role" {...form.register('role')}>
                  {PROPERTY_ROLE_LIST.map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <InlineError message={form.formState.errors.role?.message} />
              </div>
              <div data-form-group>
                <label htmlFor="sf-status">Status</label>
                <select id="sf-status" {...form.register('status')}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div data-form-actions>
                <button type="button" data-btn-ghost onClick={() => setEditing(false)}
                  disabled={updateMutation.isPending}>Cancel</button>
                <button type="submit" data-btn-primary disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          ) : (
            <div data-field-list>
              <ReadOnlyField label="Name" value={`${staff.firstName} ${staff.lastName}`} />
              <ReadOnlyField label="Email" value={staff.email} />
              <ReadOnlyField label="Role" value={staff.role.replace(/_/g, ' ')} />
              <ReadOnlyField label="Status" value={<StatusBadge status={staff.status} />} />
            </div>
          )}
        </section>
      )}

      {tab === 'permissions' && (
        <RoleGate perm={PERMISSIONS.STAFF_PERMISSIONS_MANAGE}>
          <section data-detail-section>
            <h2>Permission overrides</h2>
            <p data-field-hint>
              Granted permissions are added on top of this staff member's role permissions.
              Denied permissions are removed from them, even if the role normally grants them.
              Role permissions themselves are not shown here — only the overrides.
            </p>

            <div data-permission-col>
              <h3>Granted permissions</h3>
              <div data-perm-tags>
                {grantedPerms.map((p) => (
                  <span key={p} data-perm-tag data-perm-grant>
                    {p}
                    <button type="button" aria-label={`Remove ${p}`} onClick={() => removeGrant(p)}>×</button>
                  </span>
                ))}
                {!grantedPerms.length && <p data-empty-note>No extra grants.</p>}
              </div>
              <div data-perm-add-row>
                <input
                  type="text"
                  value={grantInput}
                  onChange={(e) => setGrantInput(e.target.value)}
                  placeholder="e.g. booking:manage"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGrant(); } }}
                />
                <button type="button" data-btn-ghost data-btn-sm onClick={addGrant}>Add</button>
              </div>
            </div>

            <div data-permission-col>
              <h3>Denied permissions</h3>
              <div data-perm-tags>
                {deniedPerms.map((p) => (
                  <span key={p} data-perm-tag data-perm-deny>
                    {p}
                    <button type="button" aria-label={`Remove ${p}`} onClick={() => removeDeny(p)}>×</button>
                  </span>
                ))}
                {!deniedPerms.length && <p data-empty-note>No explicit denials.</p>}
              </div>
              <div data-perm-add-row>
                <input
                  type="text"
                  value={denyInput}
                  onChange={(e) => setDenyInput(e.target.value)}
                  placeholder="e.g. report:finance:read"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDeny(); } }}
                />
                <button type="button" data-btn-ghost data-btn-sm onClick={addDeny}>Add</button>
              </div>
            </div>
          </section>
        </RoleGate>
      )}
    </div>
  );
}
