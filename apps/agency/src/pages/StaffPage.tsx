import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { AGENCY_ROLES, UNRESTRICTED_AGENCY_ROLES } from '@stayos/constants';
import { createAgencyStaffSchema, updateAgencyStaffSchema } from '@stayos/validators';
import type { CreateAgencyStaffInput, UpdateAgencyStaffInput } from '@stayos/validators';
import {
  PageHeader,
  Panel,
  LoadingBlock,
  EmptyBlock,
  InlineError,
  applyServerErrors,
  useToast,
  ConfirmDialog,
  Icons,
} from '@stayos/ui';
import { agencyStaffKeys, agencyKeys } from '../lib/query-keys';
import { formatDate, initialsOf } from '../lib/format';

const ROLE_LABELS: Record<string, string> = {
  agency_owner: 'Agency Owner',
  agency_manager: 'Agency Manager',
  agency_supervisor: 'Supervisor',
  agency_reservations: 'Reservations',
  agency_housekeeper: 'Housekeeper',
  agency_maintenance: 'Maintenance',
};

export default function StaffPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  if (location.pathname === '/staff/new') return <NewStaffView />;
  if (id && location.pathname.endsWith('/properties')) return <StaffPropertiesView id={id} />;
  if (id) return <StaffDetailView id={id} />;
  return <StaffListView />;
}

function StaffListView(): React.ReactElement {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useQuery({
    queryKey: agencyStaffKeys.list({ page, limit: 20 }),
    queryFn: () => api.agency.listStaff({ page, limit: 20 }),
  });

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Manage who on your team can access which properties."
        actions={
          <button data-btn-primary onClick={() => navigate('/staff/new')}>
            <Icons.UserPlus /> Add Staff Member
          </button>
        }
      />
      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.data.length === 0 ? (
          <EmptyBlock icon={Icons.Users} title="No staff members yet" description="Invite your team to start delegating work." />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Properties</th>
                    <th>Status</th>
                    <th>Added</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((s) => (
                    <tr key={s._id} data-clickable onClick={() => navigate(`/staff/${s._id}`)}>
                      <td>
                        <div data-cell-entity>
                          <span data-avatar style={{ width: 32, height: 32, fontSize: 11 }}>{initialsOf(s.firstName, s.lastName)}</span>
                          <div>
                            <div data-cell-entity-name>{s.firstName} {s.lastName}</div>
                            <div data-cell-entity-sub>{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{ROLE_LABELS[s.role] ?? s.role}</td>
                      <td>
                        {UNRESTRICTED_AGENCY_ROLES.includes(s.role as typeof UNRESTRICTED_AGENCY_ROLES[number])
                          ? 'All properties'
                          : `${s.assignedProperties.length} assigned`}
                      </td>
                      <td>
                        <span data-status-badge data-status={s.isActive ? 'active' : 'suspended'}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {!s.inviteAccepted ? <span data-status-badge data-status="pending" style={{ marginLeft: 6 }}>Invite pending</span> : null}
                      </td>
                      <td>{formatDate(s.createdAt)}</td>
                      <td><Icons.ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 ? (
              <div data-pagination>
                <span data-pagination-summary>{data.meta.total} staff members</span>
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

function NewStaffView(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<CreateAgencyStaffInput>({
    resolver: zodResolver(createAgencyStaffSchema),
    defaultValues: { firstName: '', lastName: '', email: '', role: AGENCY_ROLES.AGENCY_RESERVATIONS, assignedProperties: [] },
  });
  const role = form.watch('role');
  const isUnrestricted = UNRESTRICTED_AGENCY_ROLES.includes(role as typeof UNRESTRICTED_AGENCY_ROLES[number]);

  const { data: portfolio } = useQuery({ queryKey: agencyKeys.portfolio(), queryFn: api.agency.getPortfolio });

  const mutation = useMutation({
    mutationFn: (input: CreateAgencyStaffInput) => api.agency.createStaff(input),
    onSuccess: () => {
      toast('Invitation sent — they can set a password from the link we emailed them.', 'success');
      queryClient.invalidateQueries({ queryKey: agencyStaffKeys.list() });
      navigate('/staff');
    },
    onError: (err) => {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR') applyServerErrors(form, apiErr);
      else toast(apiErr.message ?? 'Could not create staff member', 'error');
    },
  });

  return (
    <div>
      <PageHeader title="Add Staff Member" subtitle="We'll email them a link to set their own password." />
      <div style={{ maxWidth: 560 }}>
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
              <label>Role</label>
              <select {...form.register('role')}>
                {Object.values(AGENCY_ROLES).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                ))}
              </select>
              <span data-field-hint>
                {isUnrestricted ? 'This role has access to every property in the portfolio.' : 'This role only sees properties you assign below.'}
              </span>
            </div>

            {!isUnrestricted ? (
              <div data-form-group>
                <label>Assigned properties</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(portfolio?.properties ?? []).filter((p) => p.property).map((p) => (
                    <label key={p.mandateId} data-checkbox-label>
                      <input
                        type="checkbox"
                        value={p.property!._id}
                        {...form.register('assignedProperties')}
                      />
                      {p.property!.name}
                    </label>
                  ))}
                  {(portfolio?.properties ?? []).length === 0 ? (
                    <span data-field-hint>No properties in your portfolio yet.</span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-6)' }}>
              <button type="button" data-btn-secondary onClick={() => navigate('/staff')}>Cancel</button>
              <button type="submit" data-btn-primary disabled={mutation.isPending}>
                {mutation.isPending ? 'Sending invite…' : 'Send Invite'}
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}

function StaffDetailView({ id }: { id: string }): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const { data: staff, isLoading } = useQuery({ queryKey: agencyStaffKeys.detail(id), queryFn: () => api.agency.getStaff(id) });

  const form = useForm<UpdateAgencyStaffInput>({
    resolver: zodResolver(updateAgencyStaffSchema),
    ...(staff
      ? { values: { firstName: staff.firstName, lastName: staff.lastName, role: staff.role, isActive: staff.isActive } }
      : {}),
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateAgencyStaffInput) => api.agency.updateStaff(id, input),
    onSuccess: () => {
      toast('Staff member updated.', 'success');
      queryClient.invalidateQueries({ queryKey: agencyStaffKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: agencyStaffKeys.list() });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not update staff member', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.agency.deleteStaff(id),
    onSuccess: () => {
      toast('Staff member removed.', 'success');
      queryClient.invalidateQueries({ queryKey: agencyStaffKeys.list() });
      navigate('/staff');
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not remove staff member', 'error'),
  });

  if (isLoading) return <LoadingBlock rows={4} />;
  if (!staff) return <EmptyBlock icon={Icons.Users} title="Staff member not found" />;

  const isUnrestricted = UNRESTRICTED_AGENCY_ROLES.includes(staff.role as typeof UNRESTRICTED_AGENCY_ROLES[number]);

  return (
    <div>
      <div data-breadcrumb>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/staff'); }}>Staff</a>
        <Icons.ChevronRight /> <span>{staff.firstName} {staff.lastName}</span>
      </div>
      <PageHeader
        title={`${staff.firstName} ${staff.lastName}`}
        subtitle={staff.email}
        actions={
          !isUnrestricted ? (
            <button data-btn-secondary onClick={() => navigate(`/staff/${id}/properties`)}>
              <Icons.Building2 /> Manage Properties
            </button>
          ) : undefined
        }
      />

      <div data-grid-2col>
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
                {Object.values(AGENCY_ROLES).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                ))}
              </select>
            </div>
            <label data-checkbox-label style={{ marginBottom: 'var(--space-4)' }}>
              <input type="checkbox" {...form.register('isActive')} />
              Active — can sign in and access assigned properties
            </label>
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

        <Panel title="Access">
          <div data-kv-grid>
            <div data-readonly-field>
              <span data-readonly-label>Invite status</span>
              <span data-readonly-value>{staff.inviteAccepted ? 'Accepted' : 'Pending'}</span>
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Last login</span>
              <span data-readonly-value>{staff.lastLoginAt ? formatDate(staff.lastLoginAt) : 'Never'}</span>
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Property scope</span>
              <span data-readonly-value>{isUnrestricted ? 'Entire portfolio' : `${staff.assignedProperties.length} assigned`}</span>
            </div>
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Remove this staff member?"
        message={`${staff.firstName} ${staff.lastName} will immediately lose access to every property they can currently enter.`}
        confirmLabel="Remove"
        destructive
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}

function StaffPropertiesView({ id }: { id: string }): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: staff } = useQuery({ queryKey: agencyStaffKeys.detail(id), queryFn: () => api.agency.getStaff(id) });
  const { data: assignment, isLoading } = useQuery({
    queryKey: agencyStaffKeys.properties(id),
    queryFn: () => api.agency.getStaffProperties(id),
  });
  const { data: portfolio } = useQuery({ queryKey: agencyKeys.portfolio(), queryFn: api.agency.getPortfolio });

  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (assignment) setSelected(new Set(assignment.assignedProperties.map((p) => p._id)));
  }, [assignment]);

  const mutation = useMutation({
    mutationFn: (propertyIds: string[]) => api.agency.updateStaffProperties(id, propertyIds),
    onSuccess: () => {
      toast('Property access updated.', 'success');
      queryClient.invalidateQueries({ queryKey: agencyStaffKeys.properties(id) });
      queryClient.invalidateQueries({ queryKey: agencyStaffKeys.detail(id) });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not update property access', 'error'),
  });

  if (isLoading) return <LoadingBlock rows={4} />;

  return (
    <div>
      <div data-breadcrumb>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/staff'); }}>Staff</a>
        <Icons.ChevronRight />
        <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/staff/${id}`); }}>{staff ? `${staff.firstName} ${staff.lastName}` : '…'}</a>
        <Icons.ChevronRight /> <span>Properties</span>
      </div>
      <PageHeader title="Manage Property Access" subtitle="Choose which properties this team member can enter." />
      <Panel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(portfolio?.properties ?? []).filter((p) => p.property).map((p) => {
            const checked = selected.has(p.property!._id);
            return (
              <label key={p.mandateId} data-checkbox-tile>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(p.property!._id);
                    else next.delete(p.property!._id);
                    setSelected(next);
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.property!.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {(p.property?.address as { city?: string } | undefined)?.city}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-6)' }}>
          <button data-btn-secondary onClick={() => navigate(`/staff/${id}`)}>Cancel</button>
          <button data-btn-primary disabled={mutation.isPending} onClick={() => mutation.mutate(Array.from(selected))}>
            {mutation.isPending ? 'Saving…' : 'Save Property Access'}
          </button>
        </div>
      </Panel>
    </div>
  );
}
