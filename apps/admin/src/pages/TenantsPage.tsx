import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@stayos/api-client';
import type { ApiError, TenantAddonSubscription } from '@stayos/api-client';
import { TENANT_STATUS_TRANSITIONS, ADDON_KEYS, ADDON_PRICES } from '@stayos/constants';
import type { TenantStatus, AddonKeyConstant } from '@stayos/constants';
import {
  changeTenantStatusSchema,
  setFeaturedSchema,
  createAddonSchema,
  cancelAddonSchema,
} from '@stayos/validators';
import type { ChangeTenantStatusInput, CreateAddonInput, UpdateAddonInput, CancelAddonInput } from '@stayos/validators';
import { PageHeader, Panel, LoadingBlock, EmptyBlock, InlineError, useToast, Modal, Icons } from '@stayos/ui';
import { platformKeys } from '../lib/query-keys';
import { formatDate, formatNumber, titleCase } from '../lib/format';

// Local to this page, matching how PlansPage.tsx's own FEATURE_LABELS map
// is scoped — these are addon-subscription labels specifically, distinct
// from that page's plan-tier-feature checkbox labels.
const ADDON_LABELS: Record<AddonKeyConstant, string> = {
  university_module: 'Student Accommodation Module',
  restaurant_module: 'Restaurant / POS Module',
  ai_pricing: 'AI Pricing',
  white_label: 'White Label',
  extra_storage: 'Extra Storage',
};

export default function TenantsPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  if (id) return <TenantDetailView id={id} />;
  return <TenantListView />;
}

function TenantListView(): React.ReactElement {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const [type, setType] = React.useState('all');

  const { data, isLoading } = useQuery({
    queryKey: platformKeys.tenants({ page, search, status, type }),
    queryFn: () =>
      api.platform.listTenants({
        page,
        limit: 20,
        search: search || undefined,
        status: status === 'all' ? undefined : status,
        type: type === 'all' ? undefined : type,
      }),
  });

  return (
    <div>
      <PageHeader title="Tenants" subtitle="Every property tenant on the platform." />

      <div data-filter-bar>
        <label data-filter-search>
          <Icons.Search />
          <input placeholder="Search tenants..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </label>
        <label data-filter-select>
          <span>Status</span>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All</option>
            <option value="pending_vetting">Pending vetting</option>
            <option value="pending_setup">Pending setup</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label data-filter-select>
          <span>Type</span>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="all">All</option>
            <option value="hotel">Hotel</option>
            <option value="guesthouse">Guesthouse</option>
            <option value="bed_and_breakfast">B&B</option>
            <option value="boutique_hotel">Boutique Hotel</option>
            <option value="student_housing">Student Housing</option>
            <option value="lodge">Lodge</option>
            <option value="villa">Villa</option>
            <option value="apartment">Apartment</option>
          </select>
        </label>
      </div>

      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.data.length === 0 ? (
          <EmptyBlock icon={Icons.Building2} title="No tenants match these filters" />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead>
                  <tr><th>Tenant</th><th>Type</th><th>Plan</th><th>Featured</th><th>Status</th><th>Created</th></tr>
                </thead>
                <tbody>
                  {data.data.map((t) => (
                    <tr key={t._id} data-clickable onClick={() => navigate(`/tenants/${t._id}`)}>
                      <td><div data-cell-entity-name>{t.name}</div></td>
                      <td>{titleCase(t.type)}</td>
                      <td>{t.planId ? <span data-plan-badge>{t.planId.tier}</span> : '—'}</td>
                      <td>{t.isFeatured ? <Icons.Star size={15} style={{ color: 'var(--color-warning)' }} /> : '—'}</td>
                      <td><span data-status-badge data-status={t.status}>{t.status.replace(/_/g, ' ')}</span></td>
                      <td>{formatDate(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 ? (
              <div data-pagination>
                <span data-pagination-summary>{formatNumber(data.meta.total)} tenants</span>
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

function TenantDetailView({ id }: { id: string }): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);
  const [grantModalKey, setGrantModalKey] = React.useState<AddonKeyConstant | null>(null);
  const [editingAddon, setEditingAddon] = React.useState<TenantAddonSubscription | null>(null);
  const [cancellingAddonId, setCancellingAddonId] = React.useState<string | null>(null);

  const { data: tenant, isLoading } = useQuery({ queryKey: platformKeys.tenant(id), queryFn: () => api.platform.getTenant(id) });

  const { data: addons, isLoading: addonsLoading } = useQuery({
    queryKey: platformKeys.tenantAddons(id),
    queryFn: () => api.platform.listTenantAddons(id),
  });

  const statusForm = useForm<ChangeTenantStatusInput>({ resolver: zodResolver(changeTenantStatusSchema) });

  const statusMutation = useMutation({
    mutationFn: (input: ChangeTenantStatusInput) => api.platform.updateTenantStatus(id, input.status, input.reason),
    onSuccess: () => {
      toast('Tenant status updated.', 'success');
      setStatusModalOpen(false);
      queryClient.invalidateQueries({ queryKey: platformKeys.tenant(id) });
      queryClient.invalidateQueries({ queryKey: platformKeys.tenants({}) });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not update status', 'error'),
  });

  const featuredMutation = useMutation({
    mutationFn: (featured: boolean) => {
      setFeaturedSchema.parse({ featured });
      return api.platform.setTenantFeatured(id, featured);
    },
    onSuccess: () => {
      toast('Featured status updated.', 'success');
      queryClient.invalidateQueries({ queryKey: platformKeys.tenant(id) });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not update featured status', 'error'),
  });

  const grantForm = useForm<CreateAddonInput>({ resolver: zodResolver(createAddonSchema) });
  const cancelForm = useForm<CancelAddonInput>({ resolver: zodResolver(cancelAddonSchema) });

  const grantMutation = useMutation({
    mutationFn: (input: CreateAddonInput) => api.platform.createTenantAddon(id, input),
    onSuccess: () => {
      toast('Add-on granted.', 'success');
      setGrantModalKey(null);
      grantForm.reset();
      queryClient.invalidateQueries({ queryKey: platformKeys.tenantAddons(id) });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not grant add-on', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateAddonInput) => api.platform.updateTenantAddon(id, editingAddon!._id, input),
    onSuccess: () => {
      toast('Add-on updated.', 'success');
      setEditingAddon(null);
      queryClient.invalidateQueries({ queryKey: platformKeys.tenantAddons(id) });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not update add-on', 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: (input: CancelAddonInput) => api.platform.cancelTenantAddon(id, cancellingAddonId!, input.cancellationReason),
    onSuccess: () => {
      toast('Add-on cancelled.', 'success');
      setCancellingAddonId(null);
      cancelForm.reset();
      queryClient.invalidateQueries({ queryKey: platformKeys.tenantAddons(id) });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not cancel add-on', 'error'),
  });

  const openGrantModal = (key: AddonKeyConstant) => {
    grantForm.reset({
      addonKey: key,
      monthlyPrice: ADDON_PRICES[key].base,
      currency: 'ZAR',
      billingCycle: 'monthly',
    });
    setGrantModalKey(key);
  };

  const openEditModal = (addon: TenantAddonSubscription) => {
    grantForm.reset({
      addonKey: addon.addonKey,
      monthlyPrice: addon.monthlyPrice,
      currency: addon.currency,
      billingCycle: addon.billingCycle,
      extraBedBlocks: addon.extraBedBlocks,
      storageGBBlocks: addon.storageGBBlocks,
    });
    setEditingAddon(addon);
  };

  if (isLoading) return <LoadingBlock rows={5} />;
  if (!tenant) return <EmptyBlock icon={Icons.Building2} title="Tenant not found" />;

  const transitions = TENANT_STATUS_TRANSITIONS[tenant.status as TenantStatus] ?? [];

  return (
    <div>
      <div data-breadcrumb>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/tenants'); }}>Tenants</a>
        <Icons.ChevronRight /> <span>{tenant.name}</span>
      </div>

      <div data-detail-header>
        <div data-detail-heading>
          <div data-detail-thumb style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icons.Building2 style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <div>
            <h1 data-page-title style={{ fontSize: 24 }}>{tenant.name}</h1>
            <div data-detail-meta-row>
              <span data-status-badge data-status={tenant.status}>{tenant.status.replace(/_/g, ' ')}</span>
              <span>{titleCase(tenant.type)}</span>
              {tenant.isFeatured ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icons.Star size={13} style={{ color: 'var(--color-warning)' }} /> Featured</span> : null}
            </div>
          </div>
        </div>
        <div data-page-header-actions>
          <button data-btn-secondary onClick={() => featuredMutation.mutate(!tenant.isFeatured)} disabled={featuredMutation.isPending}>
            <Icons.Star /> {tenant.isFeatured ? 'Remove from Featured' : 'Feature on Public Site'}
          </button>
          {transitions.length > 0 ? (
            <button data-btn-primary onClick={() => setStatusModalOpen(true)}>
              <Icons.RefreshCcw /> Change Status
            </button>
          ) : null}
        </div>
      </div>

      <div data-grid-2col>
        <Panel title="Details">
          <div data-kv-grid>
            <div data-readonly-field><span data-readonly-label>Slug</span><span data-readonly-value>{tenant.slug}</span></div>
            <div data-readonly-field><span data-readonly-label>Contact email</span><span data-readonly-value>{tenant.contactEmail ?? '—'}</span></div>
            <div data-readonly-field><span data-readonly-label>Agency-managed</span><span data-readonly-value>{tenant.activeMandateId ? 'Yes' : 'No'}</span></div>
            <div data-readonly-field><span data-readonly-label>Created</span><span data-readonly-value>{formatDate(tenant.createdAt)}</span></div>
          </div>
        </Panel>

        <Panel title="Plan">
          {tenant.planId ? (
            <div data-kv-grid>
              <div data-readonly-field><span data-readonly-label>Plan</span><span data-readonly-value>{tenant.planId.name}</span></div>
              <div data-readonly-field><span data-readonly-label>Tier</span><span data-plan-badge>{tenant.planId.tier}</span></div>
              <div data-readonly-field><span data-readonly-label>Monthly price</span><span data-readonly-value>R{tenant.planId.monthlyPrice}</span></div>
            </div>
          ) : (
            <EmptyBlock icon={Icons.Tag} title="No plan assigned" />
          )}
        </Panel>
      </div>

      <Panel
        title="Modules & Add-ons"
        description="Paid features this tenant has beyond their base plan — student accommodation, restaurant/POS, and the rest."
      >
        {addonsLoading ? (
          <LoadingBlock rows={3} />
        ) : (
          <table data-table>
            <thead>
              <tr><th>Module</th><th>Status</th><th>Price</th><th>Billing</th><th></th></tr>
            </thead>
            <tbody>
              {(Object.values(ADDON_KEYS) as AddonKeyConstant[]).map((key) => {
                const active = addons?.find((a) => a.addonKey === key && a.status === 'active');
                return (
                  <tr key={key}>
                    <td>{ADDON_LABELS[key]}</td>
                    <td>
                      <span data-status-badge data-status={active ? 'active' : 'inactive'}>
                        {active ? 'Active' : 'Not granted'}
                      </span>
                    </td>
                    <td>{active ? `R${formatNumber(active.monthlyPrice)}/mo` : '—'}</td>
                    <td>{active ? titleCase(active.billingCycle) : '—'}</td>
                    <td>
                      {active ? (
                        <>
                          <button type="button" data-btn-ghost onClick={() => openEditModal(active)}>
                            Edit price
                          </button>
                          <button
                            type="button"
                            data-btn-ghost
                            onClick={() => { cancelForm.reset(); setCancellingAddonId(active._id); }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button type="button" data-btn-secondary onClick={() => openGrantModal(key)}>
                          + Grant
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      <Modal open={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Change tenant status">
        <form onSubmit={statusForm.handleSubmit((values) => statusMutation.mutate(values))}>
          <div data-form-group>
            <label>New status</label>
            <select {...statusForm.register('status')}>
              <option value="">Select a status</option>
              {transitions.map((s) => (
                <option key={s} value={s}>{titleCase(s)}</option>
              ))}
            </select>
            {statusForm.formState.errors.status ? <InlineError message={statusForm.formState.errors.status.message} /> : null}
          </div>
          <div data-form-group>
            <label>Reason (optional)</label>
            <textarea rows={3} {...statusForm.register('reason')} />
          </div>
          <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-6)' }}>
            <button type="button" data-btn-secondary onClick={() => setStatusModalOpen(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={statusMutation.isPending}>
              {statusMutation.isPending ? 'Saving…' : 'Update Status'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!grantModalKey || !!editingAddon}
        onClose={() => { setGrantModalKey(null); setEditingAddon(null); }}
        title={
          editingAddon
            ? `Edit ${ADDON_LABELS[editingAddon.addonKey]} price`
            : grantModalKey
              ? `Grant ${ADDON_LABELS[grantModalKey]}`
              : 'Add-on'
        }
      >
        <form
          onSubmit={grantForm.handleSubmit((values) => {
            if (editingAddon) {
              const { addonKey: _addonKey, ...updatePayload } = values;
              updateMutation.mutate(updatePayload as UpdateAddonInput);
            } else {
              grantMutation.mutate(values);
            }
          })}
        >
          <input type="hidden" {...grantForm.register('addonKey')} />
          <div data-form-group>
            <label>Monthly price (R)</label>
            <input type="number" step={0.01} min={0} {...grantForm.register('monthlyPrice', { valueAsNumber: true })} />
            {!editingAddon && grantModalKey && ADDON_PRICES[grantModalKey].note ? (
              <p data-field-hint>{ADDON_PRICES[grantModalKey].note}</p>
            ) : null}
            {grantForm.formState.errors.monthlyPrice ? <InlineError message={grantForm.formState.errors.monthlyPrice.message} /> : null}
          </div>
          <div data-form-group>
            <label>Billing cycle</label>
            <select {...grantForm.register('billingCycle')}>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          {(editingAddon?.addonKey ?? grantModalKey) === 'university_module' ? (
            <div data-form-group>
              <label>Extra 30-bed blocks beyond the included 30</label>
              <input type="number" min={0} {...grantForm.register('extraBedBlocks', { valueAsNumber: true })} />
            </div>
          ) : null}
          {(editingAddon?.addonKey ?? grantModalKey) === 'extra_storage' ? (
            <div data-form-group>
              <label>10GB blocks</label>
              <input type="number" min={0} {...grantForm.register('storageGBBlocks', { valueAsNumber: true })} />
            </div>
          ) : null}
          <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-6)' }}>
            <button type="button" data-btn-secondary onClick={() => { setGrantModalKey(null); setEditingAddon(null); }}>Cancel</button>
            <button type="submit" data-btn-primary disabled={grantMutation.isPending || updateMutation.isPending}>
              {editingAddon
                ? (updateMutation.isPending ? 'Saving…' : 'Save Price')
                : (grantMutation.isPending ? 'Granting…' : 'Grant Add-on')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!cancellingAddonId} onClose={() => setCancellingAddonId(null)} title="Cancel add-on">
        <form onSubmit={cancelForm.handleSubmit((values) => cancelMutation.mutate(values))}>
          <div data-form-group>
            <label>Reason</label>
            <textarea rows={3} {...cancelForm.register('cancellationReason')} />
            {cancelForm.formState.errors.cancellationReason ? (
              <InlineError message={cancelForm.formState.errors.cancellationReason.message} />
            ) : null}
          </div>
          <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-6)' }}>
            <button type="button" data-btn-secondary onClick={() => setCancellingAddonId(null)}>Back</button>
            <button type="submit" data-btn-primary disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Add-on'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
