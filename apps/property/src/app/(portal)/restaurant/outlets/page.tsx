'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError, Outlet } from '@stayos/api-client';
import { PERMISSIONS, PLAN_FEATURES } from '@stayos/constants';
import {
  RoleGate,
  PlanGate,
  Modal,
  ConfirmDialog,
  SkeletonLoader,
  EmptyState,
  StatusBadge,
  InlineError,
  useToast,
  applyServerErrors,
  Icons,
} from '@stayos/ui';
import { outletKeys } from '@/lib/query-keys';

const OUTLET_TYPES = ['restaurant', 'bar', 'cafe', 'other'] as const;

// Field names and defaults mirror stayos-api's Outlet.model.js settings block
// exactly — verified against the schema, not the TAD prose.
const outletSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(OUTLET_TYPES),
  isActive: z.boolean(),
  settings: z.object({
    serviceChargeEnabled: z.boolean(),
    serviceChargeThreshold: z.coerce.number().int().min(1),
    serviceChargePercent: z.coerce.number().min(0).max(100),
    tabIdleAlertMinutes: z.coerce.number().int().min(1),
    tipPoolingEnabled: z.boolean(),
    cashVarianceTolerance: z.coerce.number().min(0),
    discountApprovalThreshold: z.coerce.number().min(0),
  }),
});

type OutletFormValues = z.infer<typeof outletSchema>;

const DEFAULT_VALUES: OutletFormValues = {
  name: '',
  type: 'restaurant',
  isActive: true,
  settings: {
    serviceChargeEnabled: false,
    serviceChargeThreshold: 6,
    serviceChargePercent: 10,
    tabIdleAlertMinutes: 180,
    tipPoolingEnabled: false,
    cashVarianceTolerance: 50,
    discountApprovalThreshold: 100,
  },
};

export default function OutletsPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.POS_OUTLET_MANAGE}
      fallback={<EmptyState title="You don't have access to outlet management" />}
    >
      <PlanGate feature={PLAN_FEATURES.RESTAURANT_MODULE}>
        <OutletsPageContent />
      </PlanGate>
    </RoleGate>
  );
}

function OutletsPageContent(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [deletingOutlet, setDeletingOutlet] = useState<Outlet | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: outletKeys.list(),
    queryFn: () => api.restaurantOutlets.list({ limit: 100 }),
    staleTime: 60_000,
  });
  const outlets = data?.data ?? [];

  const editForm = useForm<OutletFormValues>({ resolver: zodResolver(outletSchema), defaultValues: DEFAULT_VALUES });
  const createForm = useForm<OutletFormValues>({ resolver: zodResolver(outletSchema), defaultValues: DEFAULT_VALUES });

  const openEdit = (outlet: Outlet) => {
    editForm.reset({ name: outlet.name, type: outlet.type, isActive: outlet.isActive, settings: outlet.settings });
    setEditingOutlet(outlet);
  };

  const updateMutation = useMutation({
    mutationFn: (values: OutletFormValues) => api.restaurantOutlets.update(editingOutlet!._id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: outletKeys.list() });
      setEditingOutlet(null);
      toast('Outlet updated.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(editForm, err);
      else toast(err.message ?? 'Failed to update outlet.', 'error');
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: OutletFormValues) => api.restaurantOutlets.create(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: outletKeys.list() });
      setShowNew(false);
      createForm.reset(DEFAULT_VALUES);
      toast('Outlet created.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(createForm, err);
      else toast(err.message ?? 'Failed to create outlet.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.restaurantOutlets.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: outletKeys.list() });
      setDeletingOutlet(null);
      toast('Outlet deactivated.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to deactivate outlet.', 'error'),
  });

  const renderSettingsFields = (form: typeof editForm | typeof createForm) => (
    <>
      <div data-form-row>
        <div data-form-group>
          <label>Name</label>
          <input type="text" placeholder="e.g. Main Restaurant" {...form.register('name')} />
          <InlineError message={form.formState.errors.name?.message} />
        </div>
        <div data-form-group>
          <label>Type</label>
          <select {...form.register('type')}>
            {OUTLET_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div data-form-group data-checkbox-group>
        <label data-checkbox-label>
          <input type="checkbox" {...form.register('isActive')} />
          Active
        </label>
      </div>

      <h3 data-section-heading>Service charge</h3>
      <div data-form-group data-checkbox-group>
        <label data-checkbox-label>
          <input type="checkbox" {...form.register('settings.serviceChargeEnabled')} />
          Automatically add a service charge for large parties
        </label>
      </div>
      <div data-form-row>
        <div data-form-group>
          <label>Party size threshold</label>
          <input type="number" min={1} {...form.register('settings.serviceChargeThreshold')} />
        </div>
        <div data-form-group>
          <label>Percent</label>
          <input type="number" min={0} max={100} step={0.5} {...form.register('settings.serviceChargePercent')} />
        </div>
      </div>

      <h3 data-section-heading>Tabs &amp; cash management</h3>
      <div data-form-row>
        <div data-form-group>
          <label>Tab idle alert (minutes)</label>
          <input type="number" min={1} {...form.register('settings.tabIdleAlertMinutes')} />
          <p data-field-hint>A tab with no order or payment past this many minutes is flagged for a manager.</p>
        </div>
        <div data-form-group>
          <label>Cash variance tolerance (R)</label>
          <input type="number" min={0} step={0.01} {...form.register('settings.cashVarianceTolerance')} />
        </div>
      </div>
      <div data-form-group>
        <label>Discount approval threshold (R)</label>
        <input type="number" min={0} step={0.01} {...form.register('settings.discountApprovalThreshold')} />
        <p data-field-hint>Discounts above this amount require a manager PIN at the till.</p>
      </div>
      <div data-form-group data-checkbox-group>
        <label data-checkbox-label>
          <input type="checkbox" {...form.register('settings.tipPoolingEnabled')} />
          Pool tips across staff, rather than per-server
        </label>
      </div>
    </>
  );

  return (
    <div data-page="restaurant-outlets">
      <div data-page-header>
        <div>
          <h1>Outlets</h1>
        </div>
        <button type="button" data-btn-primary onClick={() => { createForm.reset(DEFAULT_VALUES); setShowNew(true); }}>
          + New outlet
        </button>
      </div>

      {isLoading ? <SkeletonLoader rows={3} /> : outlets.length === 0 ? (
        <EmptyState
          title="No outlets yet"
          description="Add your first outlet to start building a menu and table map."
          action={<button type="button" data-btn-primary onClick={() => setShowNew(true)}>Add first outlet</button>}
        />
      ) : (
        <table data-table>
          <thead>
            <tr><th>Name</th><th>Type</th><th>Status</th><th>Service charge</th><th>Tab idle alert</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {outlets.map((outlet) => (
              <tr key={outlet._id}>
                <td>{outlet.name}</td>
                <td>{outlet.type}</td>
                <td><StatusBadge status={outlet.isActive ? 'active' : 'inactive'} /></td>
                <td>
                  {outlet.settings.serviceChargeEnabled
                    ? `${outlet.settings.serviceChargePercent}% at ${outlet.settings.serviceChargeThreshold}+ covers`
                    : '—'}
                </td>
                <td>{outlet.settings.tabIdleAlertMinutes} min</td>
                <td>
                  <button type="button" data-btn-ghost data-btn-sm onClick={() => openEdit(outlet)}>Edit</button>
                  {outlet.isActive && (
                    <button type="button" data-btn-ghost data-btn-sm onClick={() => setDeletingOutlet(outlet)}>Deactivate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New outlet">
        <form onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))} noValidate data-form>
          {renderSettingsFields(createForm)}
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNew(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create outlet'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingOutlet} onClose={() => setEditingOutlet(null)} title={`Edit ${editingOutlet?.name ?? 'outlet'}`}>
        <form onSubmit={editForm.handleSubmit((v) => updateMutation.mutate(v))} noValidate data-form>
          {renderSettingsFields(editForm)}
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setEditingOutlet(null)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deletingOutlet}
        title="Deactivate outlet?"
        message={`"${deletingOutlet?.name}" will stop appearing for new tabs and orders. Existing history is kept.`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={() => deletingOutlet && deleteMutation.mutate(deletingOutlet._id)}
        onCancel={() => setDeletingOutlet(null)}
      />
    </div>
  );
}
