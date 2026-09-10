'use client';

import Link from 'next/link';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, useToast, Modal, InlineError, applyServerErrors, Icons } from '@stayos/ui';
import { maintenanceKeys } from '@/lib/query-keys';

// Must match the backend exactly (src/models/Asset.model.js).
const CATEGORIES = [
  'hvac', 'electrical', 'plumbing', 'appliance', 'lift', 'pool',
  'generator', 'security', 'it', 'furniture', 'fire_safety', 'structural', 'other',
] as const;

const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  hvac: 'HVAC', electrical: 'Electrical', plumbing: 'Plumbing', appliance: 'Appliance',
  lift: 'Elevator / Lift', pool: 'Pool', generator: 'Generator', security: 'Security',
  it: 'IT', furniture: 'Furniture', fire_safety: 'Fire safety', structural: 'Structural', other: 'Other',
};

const assetSchema = z.object({
  name:           z.string().min(1, 'Name is required'),
  category:       z.enum(CATEGORIES, { errorMap: () => ({ message: 'Select a category' }) }),
  area:           z.string().optional(),
  serialNumber:   z.string().optional(),
  purchaseDate:   z.string().optional(),
  warrantyExpiry: z.string().optional(),
});
type AssetInput = z.infer<typeof assetSchema>;

export default function AssetsPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const { data: assets, isLoading } = useQuery({
    queryKey: maintenanceKeys.assets(),
    queryFn: () => api.maintenance.listAssets(),
    staleTime: 120_000,
  });

  const form = useForm<AssetInput>({ resolver: zodResolver(assetSchema) });

  const createMutation = useMutation({
    mutationFn: (input: AssetInput) => api.maintenance.createAsset(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.assets() });
      setShowNew(false);
      form.reset();
      toast('Asset added.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        applyServerErrors(form, err);
        const hasUnattachedError = err.fields?.some((f) => !f.field);
        if (hasUnattachedError || !err.fields?.length) toast(err.message, 'error');
      } else {
        toast(err.message ?? 'Failed to add asset.', 'error');
      }
    },
  });

  return (
    <div data-page="assets">
      <div data-page-header>
        <div>
          <Link href="/maintenance/work-orders" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Maintenance</Link>
          <h1>Asset register</h1>
        </div>
        <div data-header-actions>
          <Link href="/maintenance/schedules" data-btn-ghost>Schedules</Link>
          <button type="button" data-btn-primary onClick={() => setShowNew(true)}>
            + Add asset
          </button>
        </div>
      </div>

      {isLoading ? <SkeletonLoader rows={4} /> : !assets?.length ? (
        <EmptyState
          title="No assets registered"
          description="Track your property assets to manage maintenance and warranties."
          action={<button type="button" data-btn-primary onClick={() => setShowNew(true)}>Add first asset</button>}
        />
      ) : (
        <table data-table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Area</th>
              <th>Serial #</th>
              <th>Warranty expiry</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset._id}>
                <td>{asset.name}</td>
                <td>{CATEGORY_LABELS[asset.category] ?? asset.category}</td>
                <td>{asset.area ?? '—'}</td>
                <td>{asset.serialNumber ?? '—'}</td>
                <td>
                  {asset.warrantyExpiry
                    ? new Date(asset.warrantyExpiry).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </td>
                <td><StatusBadge status={asset.status} /></td>
                <td>
                  <Link href={`/maintenance/assets/${asset._id}`}
                    data-btn-ghost data-btn-sm
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Add asset">
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label htmlFor="ast-name">Asset name</label>
            <input id="ast-name" type="text" placeholder="e.g. Air Conditioning Unit — Room 101" {...form.register('name')} />
            <InlineError message={form.formState.errors.name?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="ast-cat">Category</label>
            <select id="ast-cat" defaultValue="" {...form.register('category')}>
              <option value="" disabled>Select…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
            <InlineError message={form.formState.errors.category?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="ast-area">Area <span data-optional>(optional)</span></label>
            <input id="ast-area" type="text" placeholder="e.g. Room 101, Pump room" {...form.register('area')} />
          </div>
          <div data-form-group>
            <label htmlFor="ast-serial">Serial number <span data-optional>(optional)</span></label>
            <input id="ast-serial" type="text" {...form.register('serialNumber')} />
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="ast-purchase">Purchase date <span data-optional>(optional)</span></label>
              <input id="ast-purchase" type="date" {...form.register('purchaseDate')} />
            </div>
            <div data-form-group>
              <label htmlFor="ast-warranty">Warranty expiry <span data-optional>(optional)</span></label>
              <input id="ast-warranty" type="date" {...form.register('warrantyExpiry')} />
            </div>
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNew(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding…' : 'Add asset'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
