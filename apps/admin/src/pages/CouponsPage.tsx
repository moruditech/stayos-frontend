import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { createCouponSchema } from '@stayos/validators';
import type { CreateCouponInput } from '@stayos/validators';
import { PageHeader, Panel, LoadingBlock, EmptyBlock, InlineError, applyServerErrors, useToast, ConfirmDialog, CopyButton, Icons } from '@stayos/ui';
import { platformKeys } from '../lib/query-keys';
import { formatDate, formatPercent, formatZAR } from '../lib/format';

export default function CouponsPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  if (location.pathname === '/coupons/new' || id) return <CouponFormView id={id} />;
  return <CouponListView />;
}

function CouponListView(): React.ReactElement {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useQuery({ queryKey: platformKeys.coupons({ page }), queryFn: () => api.platform.listCoupons({ page, limit: 20 }) });

  return (
    <div>
      <PageHeader
        title="Coupons"
        subtitle="Discount codes available at signup or upgrade."
        actions={
          <button data-btn-primary onClick={() => navigate('/coupons/new')}>
            <Icons.Plus /> New Coupon
          </button>
        }
      />
      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.data.length === 0 ? (
          <EmptyBlock icon={Icons.Gift} title="No coupons yet" />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead><tr><th>Code</th><th>Discount</th><th>Redemptions</th><th>Expires</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {data.data.map((c) => (
                    <tr key={c._id} data-clickable onClick={() => navigate(`/coupons/${c._id}`)}>
                      <td>
                        <div data-cell-entity-name style={{ fontFamily: 'var(--font-mono)' }}>{c.code}</div>
                        <div data-cell-entity-sub>{c.description}</div>
                      </td>
                      <td>{c.discountType === 'percent' ? formatPercent(c.discountValue) : formatZAR(c.discountValue)}</td>
                      <td data-tabular-nums>{c.currentRedemptions}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}</td>
                      <td>{c.expiresAt ? formatDate(c.expiresAt) : 'No expiry'}</td>
                      <td><span data-status-badge data-status={c.isActive ? 'active' : 'suspended'}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td><Icons.ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 ? (
              <div data-pagination>
                <span data-pagination-summary>{data.meta.total} coupons</span>
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

function CouponFormView({ id }: { id?: string | undefined }): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!id;
  const [deactivateOpen, setDeactivateOpen] = React.useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: platformKeys.coupon(id ?? ''),
    queryFn: () => api.platform.getCoupon(id!),
    enabled: isEdit,
  });

  const form = useForm<CreateCouponInput>({
    resolver: zodResolver(createCouponSchema),
    values: existing
      ? { ...existing }
      : {
          code: '', description: '', discountType: 'percent', discountValue: 10,
          maxRedemptionsPerTenant: 1, isActive: true, requiresVerification: false,
        },
  });

  const mutation = useMutation({
    mutationFn: (input: CreateCouponInput) => (isEdit ? api.platform.updateCoupon(id!, input) : api.platform.createCoupon(input)),
    onSuccess: () => {
      toast(isEdit ? 'Coupon updated.' : 'Coupon created.', 'success');
      queryClient.invalidateQueries({ queryKey: platformKeys.coupons({}) });
      navigate('/coupons');
    },
    onError: (err) => {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR') applyServerErrors(form, apiErr);
      else toast(apiErr.message ?? 'Could not save coupon', 'error');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.platform.deactivateCoupon(id!),
    onSuccess: () => {
      toast('Coupon deactivated.', 'success');
      queryClient.invalidateQueries({ queryKey: platformKeys.coupons({}) });
      navigate('/coupons');
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not deactivate coupon', 'error'),
  });

  if (isEdit && isLoading) return <LoadingBlock rows={4} />;

  return (
    <div>
      <div data-breadcrumb>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/coupons'); }}>Coupons</a>
        <Icons.ChevronRight /> <span>{isEdit ? existing?.code ?? '…' : 'New Coupon'}</span>
      </div>
      <PageHeader
        title={isEdit ? 'Edit Coupon' : 'New Coupon'}
        actions={
          isEdit && existing?.isActive ? (
            <button data-btn-danger onClick={() => setDeactivateOpen(true)}>
              <Icons.X /> Deactivate
            </button>
          ) : undefined
        }
      />
      <div style={{ maxWidth: 560 }}>
        <Panel>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <div data-form-group>
              <label>Code</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }} {...form.register('code')} disabled={isEdit} />
                {isEdit && existing ? <CopyButton value={existing.code} /> : null}
              </div>
              {form.formState.errors.code ? <InlineError message={form.formState.errors.code.message} /> : null}
            </div>
            <div data-form-group>
              <label>Description</label>
              <input {...form.register('description')} />
              {form.formState.errors.description ? <InlineError message={form.formState.errors.description.message} /> : null}
            </div>
            <div data-form-grid-2>
              <div data-form-group>
                <label>Discount type</label>
                <select {...form.register('discountType')}>
                  <option value="percent">Percentage</option>
                  <option value="fixed_monthly">Fixed monthly amount</option>
                </select>
              </div>
              <div data-form-group>
                <label>Discount value</label>
                <input type="number" step="0.01" {...form.register('discountValue', { valueAsNumber: true })} />
                {form.formState.errors.discountValue ? <InlineError message={form.formState.errors.discountValue.message} /> : null}
              </div>
            </div>
            <div data-form-grid-2>
              <div data-form-group>
                <label>Duration (months, blank = forever)</label>
                <input
                  type="number"
                  {...form.register('durationMonths', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
                />
              </div>
              <div data-form-group>
                <label>Max total redemptions (blank = unlimited)</label>
                <input
                  type="number"
                  {...form.register('maxRedemptions', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
                />
              </div>
            </div>
            <div data-form-grid-2>
              <div data-form-group>
                <label>Max redemptions per tenant</label>
                <input type="number" {...form.register('maxRedemptionsPerTenant', { valueAsNumber: true })} />
              </div>
              <div data-form-group>
                <label>Expires</label>
                <input type="date" {...form.register('expiresAt', { setValueAs: (v) => (v === '' ? null : new Date(v).toISOString()) })} />
              </div>
            </div>
            <label data-checkbox-label style={{ marginBottom: 'var(--space-3)' }}>
              <input type="checkbox" {...form.register('requiresVerification')} />
              Requires manual verification before applying
            </label>
            <label data-checkbox-label style={{ marginBottom: 'var(--space-5)' }}>
              <input type="checkbox" {...form.register('isActive')} />
              Active
            </label>

            <div data-modal-footer style={{ padding: 0, borderTop: 'none' }}>
              <button type="button" data-btn-secondary onClick={() => navigate('/coupons')}>Cancel</button>
              <button type="submit" data-btn-primary disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Coupon'}
              </button>
            </div>
          </form>
        </Panel>
      </div>

      <ConfirmDialog
        open={deactivateOpen}
        title="Deactivate this coupon?"
        message="It stops working immediately for new redemptions. This doesn't affect tenants already using it."
        confirmLabel="Deactivate"
        destructive
        onCancel={() => setDeactivateOpen(false)}
        onConfirm={() => deactivateMutation.mutate()}
      />
    </div>
  );
}
