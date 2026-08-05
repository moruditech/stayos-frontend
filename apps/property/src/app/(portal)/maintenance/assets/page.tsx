'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, useToast, Modal, InlineError, applyServerErrors } from '@stayos/ui';
import { maintenanceKeys } from '@/lib/query-keys';

const assetSchema = z.object({
  name:          z.string().min(1, 'Name is required'),
  category:      z.string().min(1, 'Category is required'),
  location:      z.string().optional(),
  serialNumber:  z.string().optional(),
  purchaseDate:  z.string().optional(),
  warrantyExpiry:z.string().optional(),
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
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else toast(err.message ?? 'Failed.', 'error');
    },
  });

  return (
    <div data-page="assets">
      <div data-page-header>
        <div>
          <a href="/maintenance/work-orders" data-breadcrumb>← Maintenance</a>
          <h1>Asset register</h1>
        </div>
        <div data-header-actions>
          <a href="/maintenance/schedules" data-btn-ghost>Schedules</a>
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
              <th>Location</th>
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
                <td>{asset.category}</td>
                <td>{asset.location ?? '—'}</td>
                <td>{asset.serialNumber ?? '—'}</td>
                <td>
                  {asset.warrantyExpiry
                    ? new Date(asset.warrantyExpiry).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </td>
                <td><StatusBadge status={asset.status} /></td>
                <td>
                  <a
                    href={`/maintenance/assets/${asset._id}`}
                    data-btn-ghost data-btn-sm
                  >
                    View
                  </a>
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
            <select id="ast-cat" {...form.register('category')}>
              <option value="">Select…</option>
              <option value="hvac">HVAC</option>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="furniture">Furniture</option>
              <option value="appliance">Appliance</option>
              <option value="security">Security</option>
              <option value="elevator">Elevator / Lift</option>
              <option value="other">Other</option>
            </select>
            <InlineError message={form.formState.errors.category?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="ast-loc">Location <span data-optional>(optional)</span></label>
            <input id="ast-loc" type="text" placeholder="e.g. Room 101, Lobby" {...form.register('location')} />
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
