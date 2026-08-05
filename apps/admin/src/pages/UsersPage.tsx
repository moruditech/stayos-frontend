import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { PLATFORM_ROLES } from '@stayos/constants';
import { createPlatformUserSchema, updatePlatformUserSchema } from '@stayos/validators';
import type { CreatePlatformUserInput, UpdatePlatformUserInput } from '@stayos/validators';
import { PageHeader, Panel, LoadingBlock, EmptyBlock, InlineError, applyServerErrors, useToast, ConfirmDialog, Icons } from '@stayos/ui';
import { platformKeys } from '../lib/query-keys';
import { formatDate, initialsOf, titleCase } from '../lib/format';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  accountant: 'Accountant',
  support: 'Support',
  marketing: 'Marketing',
  vetting_officer: 'Vetting Officer',
};

export default function UsersPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  if (location.pathname === '/users/new') return <NewUserView />;
  if (id) return <UserDetailView id={id} />;
  return <UserListView />;
}

function UserListView(): React.ReactElement {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useQuery({ queryKey: platformKeys.users({ page }), queryFn: () => api.platform.listUsers({ page, limit: 20 }) });

  return (
    <div>
      <PageHeader
        title="Platform Users"
        subtitle="Internal StayOS staff with access to this portal."
        actions={
          <button data-btn-primary onClick={() => navigate('/users/new')}>
            <Icons.UserPlus /> Add User
          </button>
        }
      />
      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.data.length === 0 ? (
          <EmptyBlock icon={Icons.UserCog} title="No platform users yet" />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead><tr><th>Name</th><th>Role</th><th>MFA</th><th>Status</th><th>Last login</th></tr></thead>
                <tbody>
                  {data.data.map((u) => (
                    <tr key={u._id} data-clickable onClick={() => navigate(`/users/${u._id}`)}>
                      <td>
                        <div data-cell-entity>
                          <span data-avatar style={{ width: 32, height: 32, fontSize: 11 }}>{initialsOf(u.firstName, u.lastName)}</span>
                          <div>
                            <div data-cell-entity-name>{u.firstName} {u.lastName}</div>
                            <div data-cell-entity-sub>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{ROLE_LABELS[u.role] ?? u.role}</td>
                      <td>{u.mfaEnabled ? <Icons.ShieldCheck size={15} style={{ color: 'var(--color-success)' }} /> : '—'}</td>
                      <td><span data-status-badge data-status={u.isActive ? 'active' : 'suspended'}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td>{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 ? (
              <div data-pagination>
                <span data-pagination-summary>{data.meta.total} users</span>
                <button data-pagination-prev disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>
                <span data-pagination-current>{page} / {data.meta.totalPages}</span>
                <button data-pagination-next disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
              </div>
            ) : null}
          </div>
        )}
      </Panel>
    </div>
  );
}

function NewUserView(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<CreatePlatformUserInput>({
    resolver: zodResolver(createPlatformUserSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', role: PLATFORM_ROLES.SUPPORT },
  });

  const mutation = useMutation({
    mutationFn: (input: CreatePlatformUserInput) => api.platform.createUser(input),
    onSuccess: () => {
      toast('Platform user created.', 'success');
      queryClient.invalidateQueries({ queryKey: platformKeys.users({}) });
      navigate('/users');
    },
    onError: (err) => {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR') applyServerErrors(form, apiErr);
      else toast(apiErr.message ?? 'Could not create user', 'error');
    },
  });

  return (
    <div>
      <PageHeader title="Add Platform User" subtitle="Give a StayOS team member access to this portal." />
      <div style={{ maxWidth: 480 }}>
        <Panel>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <div data-form-grid-2>
              <div data-form-group>
                <label>First name</label>
                <input {...form.register('firstName')} />
                {form.formState.errors.firstName ? <InlineError message={form.formState.errors.firstName.message} /> : null}
              </div>
              <div data-form-group>
                <label>Last name</label>
                <input {...form.register('lastName')} />
                {form.formState.errors.lastName ? <InlineError message={form.formState.errors.lastName.message} /> : null}
              </div>
            </div>
            <div data-form-group>
              <label>Email</label>
              <input type="email" {...form.register('email')} />
              {form.formState.errors.email ? <InlineError message={form.formState.errors.email.message} /> : null}
            </div>
            <div data-form-group>
              <label>Temporary password</label>
              <input type="password" {...form.register('password')} />
              {form.formState.errors.password ? <InlineError message={form.formState.errors.password.message} /> : null}
              <span data-field-hint>Share this with them securely — they should change it on first login.</span>
            </div>
            <div data-form-group>
              <label>Role</label>
              <select {...form.register('role')}>
                {Object.values(PLATFORM_ROLES).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                ))}
              </select>
            </div>
            <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-6)' }}>
              <button type="button" data-btn-secondary onClick={() => navigate('/users')}>Cancel</button>
              <button type="submit" data-btn-primary disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}

function UserDetailView({ id }: { id: string }): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const { data: user, isLoading } = useQuery({ queryKey: platformKeys.user(id), queryFn: () => api.platform.getUser(id) });
  const form = useForm<UpdatePlatformUserInput>({
    resolver: zodResolver(updatePlatformUserSchema),
    ...(user
      ? { values: { firstName: user.firstName, lastName: user.lastName, role: user.role, isActive: user.isActive } }
      : {}),
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdatePlatformUserInput) => api.platform.updateUser(id, input),
    onSuccess: () => {
      toast('User updated.', 'success');
      queryClient.invalidateQueries({ queryKey: platformKeys.user(id) });
      queryClient.invalidateQueries({ queryKey: platformKeys.users({}) });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not update user', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.platform.deleteUser(id),
    onSuccess: () => {
      toast('User removed.', 'success');
      queryClient.invalidateQueries({ queryKey: platformKeys.users({}) });
      navigate('/users');
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not remove user', 'error'),
  });

  if (isLoading) return <LoadingBlock rows={4} />;
  if (!user) return <EmptyBlock icon={Icons.UserCog} title="User not found" />;

  return (
    <div>
      <div data-breadcrumb>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/users'); }}>Users</a>
        <Icons.ChevronRight /> <span>{user.firstName} {user.lastName}</span>
      </div>
      <PageHeader title={`${user.firstName} ${user.lastName}`} subtitle={user.email} />

      <Panel title="Details">
        <form onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
          <div data-form-grid-2>
            <div data-form-group>
              <label>First name</label>
              <input {...form.register('firstName')} />
            </div>
            <div data-form-group>
              <label>Last name</label>
              <input {...form.register('lastName')} />
            </div>
          </div>
          <div data-form-group>
            <label>Role</label>
            <select {...form.register('role')}>
              {Object.values(PLATFORM_ROLES).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
              ))}
            </select>
          </div>
          <label data-checkbox-label style={{ marginBottom: 'var(--space-4)' }}>
            <input type="checkbox" {...form.register('isActive')} />
            Active — can sign in
          </label>
          <div data-kv-grid style={{ marginBottom: 'var(--space-5)' }}>
            <div data-readonly-field><span data-readonly-label>MFA</span><span data-readonly-value>{user.mfaEnabled ? 'Enabled' : 'Not enabled'}</span></div>
            <div data-readonly-field><span data-readonly-label>Last login</span><span data-readonly-value>{user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}</span></div>
          </div>
          <div data-modal-footer style={{ padding: 0, borderTop: 'none' }}>
            <button type="button" data-btn-danger onClick={() => setDeleteOpen(true)}>
              <Icons.Trash2 /> Remove
            </button>
            <button type="submit" data-btn-primary disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Panel>

      <ConfirmDialog
        open={deleteOpen}
        title="Remove this platform user?"
        message={`${user.firstName} ${user.lastName} will immediately lose access to the admin portal.`}
        confirmLabel="Remove"
        destructive
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
