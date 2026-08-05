import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { onboardNewPropertySchema } from '@stayos/validators';
import type { OnboardNewPropertyInput } from '@stayos/validators';
import {
  PageHeader,
  StatCard,
  Panel,
  LoadingBlock,
  EmptyBlock,
  AlertList,
  InlineError,
  applyServerErrors,
  useToast,
  Icons,
  type AlertEntry,
} from '@stayos/ui';
import { agencyKeys } from '../lib/query-keys';
import { formatZAR, formatNumber } from '../lib/format';
import { useEnterAgencyProperty } from '../hooks/useEnterAgencyProperty';

const PROPERTY_TYPES: { value: string; label: string }[] = [
  { value: 'guesthouse', label: 'Guesthouse' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'bed_and_breakfast', label: 'Bed & Breakfast' },
  { value: 'boutique_hotel', label: 'Boutique Hotel' },
  { value: 'student_housing', label: 'Student Housing' },
  { value: 'lodge', label: 'Lodge' },
  { value: 'villa', label: 'Villa' },
  { value: 'apartment', label: 'Apartment' },
];
const PROVINCES = ['GP', 'WC', 'KZN', 'EC', 'FS', 'LP', 'MP', 'NW', 'NC'];

export default function PropertiesPage(): React.ReactElement {
  const location = useLocation();
  if (location.pathname === '/properties/onboard') return <OnboardPropertyView />;
  return <PropertiesListView />;
}

function PropertiesListView(): React.ReactElement {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: agencyKeys.properties(), queryFn: api.agency.listProperties });
  const { enterProperty, loading: entering } = useEnterAgencyProperty();
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Properties" />
        <LoadingBlock rows={6} />
      </div>
    );
  }

  const properties = data?.properties ?? [];
  const active = properties.filter((p) => p.mandateStatus === 'active').length;
  const pending = properties.filter((p) => p.mandateStatus === 'pending').length;
  const terminationNotice = properties.filter((p) => p.mandateStatus === 'termination_notice').length;
  const noRevenue = properties.filter((p) => p.property && !(p.currentMonthFeeRecord?.grossRevenue));

  const filtered = properties.filter((p) => {
    if (search && !(p.property?.name ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && p.mandateStatus !== statusFilter) return false;
    return true;
  });

  const awaitingAction: AlertEntry[] = [
    ...properties
      .filter((p) => p.mandateStatus === 'pending')
      .slice(0, 3)
      .map((p) => ({
        tone: 'warning' as const,
        icon: Icons.Clock,
        title: p.property?.name ?? 'Property',
        meta: 'Awaiting signature',
        action: (
          <button data-btn-secondary data-btn-sm onClick={() => navigate(`/mandates/${p.mandateId}`)}>
            View mandate
          </button>
        ),
      })),
    ...noRevenue.slice(0, 2).map((p) => ({
      tone: 'info' as const,
      icon: Icons.TrendingUp,
      title: p.property?.name ?? 'Property',
      meta: 'No revenue recorded this month',
      action: (
        <button data-btn-secondary data-btn-sm disabled={entering} onClick={() => p.property && enterProperty(p.property._id)}>
          Enter property
        </button>
      ),
    })),
  ].slice(0, 4);

  return (
    <div>
      <PageHeader
        title="Properties"
        subtitle="Manage properties, onboard new clients, request mandates, and enter property operations."
        actions={
          <>
            <button data-btn-primary onClick={() => navigate('/properties/onboard')}>
              <Icons.Plus /> Onboard New Property
            </button>
            <button data-btn-secondary onClick={() => navigate('/mandates/new')}>
              <Icons.FileText /> Request Existing Property Mandate
            </button>
          </>
        }
      />

      <div data-stat-grid>
        <StatCard icon={Icons.Building2} tone="green" label="Total Properties" value={formatNumber(properties.length)} sublabel="Managed" />
        <StatCard icon={Icons.CheckCircle2} tone="teal" label="Active" value={formatNumber(active)} sublabel="Currently operating" />
        <StatCard icon={Icons.Clock} tone="amber" label="Pending Mandates" value={formatNumber(pending)} sublabel="Waiting for signature" />
        <StatCard icon={Icons.CalendarClock} tone="rose" label="Termination Notice" value={formatNumber(terminationNotice)} sublabel="Notice period running" />
        <StatCard icon={Icons.TrendingUp} tone="purple" label="No Revenue (MTD)" value={formatNumber(noRevenue.length)} sublabel="Needs attention" />
      </div>

      <div data-grid-2-1>
        <div>
          <div data-filter-bar>
            <label data-filter-search>
              <Icons.Search />
              <input placeholder="Search properties..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <label data-filter-select>
              <span>Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="termination_notice">Termination notice</option>
              </select>
            </label>
          </div>

          <Panel>
            {filtered.length === 0 ? (
              <EmptyBlock icon={Icons.Building2} title="No properties found" />
            ) : (
              <div data-data-table>
                <div data-data-table-scroll>
                  <table>
                    <thead>
                      <tr>
                        <th>Property</th>
                        <th>City</th>
                        <th>Mandate</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => (
                        <tr key={p.mandateId}>
                          <td>
                            <div data-cell-entity-name>{p.property?.name ?? 'Pending owner claim'}</div>
                            <div data-cell-entity-sub>{p.property?.type?.replace(/_/g, ' ') ?? '—'}</div>
                          </td>
                          <td>{(p.property?.address as { city?: string } | undefined)?.city ?? '—'}</td>
                          <td><span data-status-badge data-status={p.mandateStatus}>{p.mandateStatus.replace('_', ' ')}</span></td>
                          <td>
                            {p.mandateStatus === 'pending' ? (
                              <button data-btn-secondary data-btn-sm onClick={() => navigate(`/mandates/${p.mandateId}`)}>
                                Continue <Icons.ArrowRight />
                              </button>
                            ) : (
                              <button
                                data-btn-primary
                                data-btn-sm
                                disabled={!p.property || entering}
                                onClick={() => p.property && enterProperty(p.property._id)}
                              >
                                Enter Property <Icons.ArrowRight />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Properties Awaiting Action">
          <AlertList items={awaitingAction} emptyLabel="Nothing needs action right now" />
        </Panel>
      </div>
    </div>
  );
}

function OnboardPropertyView(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<OnboardNewPropertyInput>({
    resolver: zodResolver(onboardNewPropertySchema),
    defaultValues: {
      ownerEmail: '',
      ownerFirstName: '',
      ownerLastName: '',
      name: '',
      type: 'guesthouse',
      feeType: 'percentage',
      feeValue: 10,
      noticeDays: 30,
      address: { street: '', city: '', province: 'WC', postalCode: '', country: 'ZA' },
    },
  });

  const mutation = useMutation({
    mutationFn: (input: OnboardNewPropertyInput) =>
      api.agency.onboardProperty({
        ownerEmail: input.ownerEmail,
        feeType: input.feeType,
        feeValue: input.feeValue,
        noticeDays: input.noticeDays,
        propertyDetails: {
          name: input.name,
          type: input.type,
          ownerFirstName: input.ownerFirstName,
          ownerLastName: input.ownerLastName,
          address: input.address,
        },
      }),
    onSuccess: () => {
      toast('Property onboarded — the owner has been invited to claim it.', 'success');
      queryClient.invalidateQueries({ queryKey: agencyKeys.properties() });
      queryClient.invalidateQueries({ queryKey: agencyKeys.portfolio() });
      navigate('/properties');
    },
    onError: (err) => {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR') applyServerErrors(form, apiErr);
      else toast(apiErr.message ?? 'Could not onboard property', 'error');
    },
  });

  return (
    <div>
      <PageHeader
        title="Onboard a New Property"
        subtitle="For a client who doesn't have a StayOS account yet. This creates the property and a management mandate together, then invites the owner to claim it."
      />
      <div style={{ maxWidth: 640 }}>
        <Panel>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <span data-eyebrow>Property details</span>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div data-form-group>
                <label>Property name</label>
                <input placeholder="e.g. Lakeside Boutique Hotel" {...form.register('name')} />
                {form.formState.errors.name ? <InlineError message={form.formState.errors.name.message} /> : null}
              </div>
              <div data-form-group>
                <label>Property type</label>
                <select {...form.register('type')}>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div data-form-group>
                <label>Street address</label>
                <input placeholder="123 Main Road" {...form.register('address.street')} />
                {form.formState.errors.address?.street ? <InlineError message={form.formState.errors.address.street.message} /> : null}
              </div>
              <div data-form-grid-2>
                <div data-form-group>
                  <label>City</label>
                  <input {...form.register('address.city')} />
                  {form.formState.errors.address?.city ? <InlineError message={form.formState.errors.address.city.message} /> : null}
                </div>
                <div data-form-group>
                  <label>Province</label>
                  <select {...form.register('address.province')}>
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div data-form-group>
                <label>Postal code</label>
                <input {...form.register('address.postalCode')} />
              </div>
            </div>

            <span data-eyebrow>Owner details</span>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div data-form-grid-2>
                <div data-form-group>
                  <label>Owner's first name</label>
                  <input {...form.register('ownerFirstName')} />
                  {form.formState.errors.ownerFirstName ? <InlineError message={form.formState.errors.ownerFirstName.message} /> : null}
                </div>
                <div data-form-group>
                  <label>Owner's last name</label>
                  <input {...form.register('ownerLastName')} />
                  {form.formState.errors.ownerLastName ? <InlineError message={form.formState.errors.ownerLastName.message} /> : null}
                </div>
              </div>
              <div data-form-group>
                <label>Owner's email</label>
                <input type="email" placeholder="owner@example.com" {...form.register('ownerEmail')} />
                {form.formState.errors.ownerEmail ? <InlineError message={form.formState.errors.ownerEmail.message} /> : null}
                <span data-field-hint>The owner is invited to claim this property with this email.</span>
              </div>
            </div>

            <span data-eyebrow>Management fee</span>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div data-form-grid-2>
                <div data-form-group>
                  <label>Fee type</label>
                  <select {...form.register('feeType')}>
                    <option value="percentage">Percentage of revenue</option>
                    <option value="fixed">Fixed monthly fee</option>
                  </select>
                </div>
                <div data-form-group>
                  <label>Fee value</label>
                  <input type="number" step="0.01" {...form.register('feeValue', { valueAsNumber: true })} />
                  {form.formState.errors.feeValue ? <InlineError message={form.formState.errors.feeValue.message} /> : null}
                </div>
              </div>
              <div data-form-group>
                <label>Notice period (days)</label>
                <input type="number" {...form.register('noticeDays', { valueAsNumber: true })} />
              </div>
            </div>

            <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-6)' }}>
              <button type="button" data-btn-secondary onClick={() => navigate('/properties')}>Cancel</button>
              <button type="submit" data-btn-primary disabled={mutation.isPending}>
                {mutation.isPending ? 'Onboarding…' : 'Onboard Property'}
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
