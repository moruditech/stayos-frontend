import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { PLAN_FEATURES, PLAN_TIERS_BY_TARGET } from '@stayos/constants';
import { createPlanSchema } from '@stayos/validators';
import type { CreatePlanInput } from '@stayos/validators';
import { PageHeader, Panel, LoadingBlock, EmptyBlock, InlineError, applyServerErrors, useToast, Icons } from '@stayos/ui';
import { platformKeys } from '../lib/query-keys';
import { formatZAR, titleCase } from '../lib/format';

const FEATURE_LABELS: Record<string, string> = {
  university_module: 'University / Student Housing Module',
  outbound_webhooks: 'Outbound Webhooks',
  advanced_reporting: 'Advanced Reporting',
  ai_pricing: 'AI Pricing',
  white_label: 'White Label',
  open_api: 'Open API',
  multi_property: 'Multi-Property',
};

export default function PlansPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  if (location.pathname === '/plans/new' || id) return <PlanFormView id={id} />;
  return <PlanListView />;
}

function PlanListView(): React.ReactElement {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: platformKeys.plans(), queryFn: api.platform.listPlans });

  const grouped = (data ?? []).reduce<Record<string, typeof data>>((acc, p) => {
    (acc[p.targetType] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Plans"
        subtitle="Subscription plans across every target type."
        actions={
          <button data-btn-primary onClick={() => navigate('/plans/new')}>
            <Icons.Plus /> New Plan
          </button>
        }
      />
      {isLoading ? (
        <LoadingBlock rows={5} />
      ) : !data || data.length === 0 ? (
        <EmptyBlock icon={Icons.Tag} title="No plans yet" />
      ) : (
        Object.entries(grouped).map(([targetType, plans]) => (
          <Panel key={targetType} title={titleCase(targetType)}>
            <div data-data-table>
              <div data-data-table-scroll>
                <table>
                  <thead><tr><th>Plan</th><th>Tier</th><th>Monthly Price</th><th>Trial</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {(plans ?? []).sort((a, b) => a.sortOrder - b.sortOrder).map((p) => (
                      <tr key={p._id} data-clickable onClick={() => navigate(`/plans/${p._id}`)}>
                        <td>
                          <div data-cell-entity-name>{p.name}</div>
                          {p.isDefault ? <div data-cell-entity-sub>Default</div> : null}
                        </td>
                        <td><span data-plan-badge>{p.tier}</span></td>
                        <td data-tabular-nums>{formatZAR(p.monthlyPrice)}</td>
                        <td>{p.trialDays} days</td>
                        <td><span data-status-badge data-status={p.isActive ? 'active' : 'suspended'}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td><Icons.ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
        ))
      )}
    </div>
  );
}

function PlanFormView({ id }: { id?: string | undefined }): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!id;

  const { data: plans } = useQuery({ queryKey: platformKeys.plans(), queryFn: api.platform.listPlans, enabled: isEdit });
  const existing = plans?.find((p) => p._id === id);

  const form = useForm<CreatePlanInput>({
    resolver: zodResolver(createPlanSchema),
    ...(existing
      ? {
          values: {
            name: existing.name,
            slug: existing.slug,
            tier: existing.tier,
            targetType: existing.targetType,
            description: existing.description ?? '',
            monthlyPrice: existing.monthlyPrice,
            annualMonthlyPrice: existing.annualMonthlyPrice ?? 0,
            sixMonthMonthlyPrice: existing.sixMonthMonthlyPrice ?? 0,
            currency: existing.currency,
            roomLimit: existing.roomLimit ?? null,
            propertyStaffLimit: existing.propertyStaffLimit ?? null,
            bedLimit: existing.bedLimit ?? null,
            isAddon: existing.isAddon,
            addonBaseBeds: existing.addonBaseBeds ?? null,
            addonPerBedBlock: existing.addonPerBedBlock ?? null,
            addonBedBlockSize: existing.addonBedBlockSize ?? 30,
            isAgencyPlan: existing.isAgencyPlan,
            agencyBaseSeats: existing.agencyBaseSeats ?? null,
            perPropertyPrice: existing.perPropertyPrice ?? null,
            additionalStaffPrice: existing.additionalStaffPrice ?? null,
            bundleDiscounts: existing.bundleDiscounts ?? [],
            features: existing.features,
            onboardingFee: existing.onboardingFee,
            isActive: existing.isActive,
            isDefault: existing.isDefault,
            sortOrder: existing.sortOrder,
            trialDays: existing.trialDays,
          },
        }
      : {
          values: {
            name: '', slug: '', tier: 'starter' as const, targetType: 'property' as const, monthlyPrice: 0, currency: 'ZAR',
            isAddon: false, isAgencyPlan: false, addonBedBlockSize: 30, onboardingFee: 0, isActive: true,
            isDefault: false, sortOrder: 0, trialDays: 14, features: [],
          },
        }),
  });

  const targetType = form.watch('targetType');
  const availableTiers = PLAN_TIERS_BY_TARGET[targetType] ?? [];

  const mutation = useMutation({
    mutationFn: (input: CreatePlanInput) => (isEdit ? api.platform.updatePlan(id!, input) : api.platform.createPlan(input)),
    onSuccess: () => {
      toast(isEdit ? 'Plan updated.' : 'Plan created.', 'success');
      queryClient.invalidateQueries({ queryKey: platformKeys.plans() });
      navigate('/plans');
    },
    onError: (err) => {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR') applyServerErrors(form, apiErr);
      else toast(apiErr.message ?? 'Could not save plan', 'error');
    },
  });

  const selectedFeatures = form.watch('features') ?? [];

  return (
    <div>
      <div data-breadcrumb>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/plans'); }}>Plans</a>
        <Icons.ChevronRight /> <span>{isEdit ? existing?.name ?? '…' : 'New Plan'}</span>
      </div>
      <PageHeader title={isEdit ? 'Edit Plan' : 'New Plan'} />
      <div style={{ maxWidth: 640 }}>
        <Panel>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <div data-form-grid-2>
              <div data-form-group>
                <label>Name</label>
                <input {...form.register('name')} />
                {form.formState.errors.name ? <InlineError message={form.formState.errors.name.message} /> : null}
              </div>
              <div data-form-group>
                <label>Slug</label>
                <input {...form.register('slug')} />
                {form.formState.errors.slug ? <InlineError message={form.formState.errors.slug.message} /> : null}
              </div>
            </div>
            <div data-form-grid-2>
              <div data-form-group>
                <label>Target type</label>
                <select {...form.register('targetType')}>
                  <option value="property">Property</option>
                  <option value="pbsa">Student Housing (PBSA)</option>
                  <option value="agency">Agency</option>
                  <option value="addon">Add-on</option>
                </select>
              </div>
              <div data-form-group>
                <label>Tier</label>
                <select {...form.register('tier')}>
                  {availableTiers.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div data-form-group>
              <label>Description</label>
              <textarea rows={2} {...form.register('description')} />
            </div>
            <div data-form-grid-2>
              <div data-form-group>
                <label>Monthly price (ZAR)</label>
                <input type="number" step="0.01" {...form.register('monthlyPrice', { valueAsNumber: true })} />
                {form.formState.errors.monthlyPrice ? <InlineError message={form.formState.errors.monthlyPrice.message} /> : null}
              </div>
              <div data-form-group>
                <label>Trial days</label>
                <input type="number" {...form.register('trialDays', { valueAsNumber: true })} />
              </div>
            </div>

            <div data-form-group>
              <label>Features</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.values(PLAN_FEATURES).map((f) => (
                  <label key={f} data-checkbox-label>
                    <input
                      type="checkbox"
                      checked={selectedFeatures.includes(f)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selectedFeatures, f]
                          : selectedFeatures.filter((x) => x !== f);
                        form.setValue('features', next);
                      }}
                    />
                    {FEATURE_LABELS[f] ?? f}
                  </label>
                ))}
              </div>
              <span data-field-hint>Constrained to the confirmed plan-feature set — nothing else can be attached to a plan.</span>
            </div>

            <label data-checkbox-label style={{ marginBottom: 'var(--space-3)' }}>
              <input type="checkbox" {...form.register('isActive')} />
              Active — selectable for new subscriptions
            </label>
            <label data-checkbox-label style={{ marginBottom: 'var(--space-5)' }}>
              <input type="checkbox" {...form.register('isDefault')} />
              Default plan for this target type
            </label>

            <div data-modal-footer style={{ padding: 0, borderTop: 'none' }}>
              <button type="button" data-btn-secondary onClick={() => navigate('/plans')}>Cancel</button>
              <button type="submit" data-btn-primary disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Plan'}
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
