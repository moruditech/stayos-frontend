'use client';

import Link from 'next/link';

/**
 * Auto-restock configuration — Procurement.
 * One row per active stock supplier. Field names match the backend
 * `restockConfigSchema` exactly (src/modules/procurement/procurement.validation.js).
 */

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, useToast, Modal, InlineError, Icons, Dropdown } from '@stayos/ui';

const MODES = ['off', 'individual', 'group'] as const;
const MODE_LABELS: Record<(typeof MODES)[number], string> = {
  off: 'Off — never auto-restock',
  individual: 'Individual — restock as soon as any one item is low',
  group: 'Group — only restock once several items are low together',
};
const MODE_OPTIONS = MODES.map((m) => ({ value: m, label: MODE_LABELS[m] }));

const schema = z.object({
  mode:             z.enum(MODES),
  groupMinItemsLow: z.coerce.number().int().min(2).default(2),
  autoSend:         z.boolean().default(false),
});
type FormInput = z.infer<typeof schema>;

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function RestockConfigPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  const { data: configs, isLoading } = useQuery({
    queryKey: ['procurement', 'restock-config'],
    queryFn: () => api.procurement.listRestockConfigs(),
  });

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { mode: 'off', groupMinItemsLow: 2, autoSend: false },
  });
  const mode = form.watch('mode');

  const editingConfig = (configs ?? []).find(
    (c) => String((c as unknown as Record<string, unknown>)['supplierId']) === editingSupplierId
  ) as unknown as Record<string, unknown> | undefined;

  useEffect(() => {
    if (!editingConfig) return;
    form.reset({
      mode: (editingConfig['mode'] as FormInput['mode']) ?? 'off',
      groupMinItemsLow: Number(editingConfig['groupMinItemsLow'] ?? 2),
      autoSend: Boolean(editingConfig['autoSend']),
    });
  }, [editingConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMutation = useMutation({
    mutationFn: ({ supplierId, input }: { supplierId: string; input: FormInput }) =>
      api.procurement.updateRestockConfig(supplierId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['procurement', 'restock-config'] });
      setEditingSupplierId(null);
      toast('Auto-restock settings saved.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        for (const f of err.fields ?? []) form.setError(f.field as keyof FormInput, { message: f.message });
      } else toast(err.message ?? 'Failed to save.', 'error');
    },
  });

  return (
    <div data-page="restock-config">
      <div data-page-header>
        <div>
          <Link href="/procurement/suppliers" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Procurement</Link>
          <h1>Auto-restock configuration</h1>
        </div>
      </div>

      <p data-field-hint>
        Choose, per supplier, whether purchase orders should be generated automatically when stock runs low
        — either as soon as a single item is low, or only once several of that supplier&apos;s items are low
        at the same time. You can also choose whether generated orders are sent automatically or left as a
        draft to review first. Individual items can be excluded from auto-restock on the Stock items page.
      </p>

      {isLoading ? <SkeletonLoader rows={4} /> : !configs?.length ? (
        <EmptyState
          title="No stock suppliers yet"
          description="Add a supplier marked as a stock supplier to configure auto-restock for them."
        />
      ) : (
        <table data-table>
          <thead>
            <tr><th>Supplier</th><th>Mode</th><th>Group threshold</th><th>Auto-send</th><th>Last triggered</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {configs.map((c) => {
              const cfg = c as unknown as Record<string, unknown>;
              const supplierId = String(cfg['supplierId']);
              const cfgMode = String(cfg['mode'] ?? 'off') as (typeof MODES)[number];
              return (
                <tr key={supplierId}>
                  <td>{String(cfg['supplierName'] ?? '—')}</td>
                  <td>{MODE_LABELS[cfgMode]?.split(' — ')[0] ?? 'Off'}</td>
                  <td>{cfgMode === 'group' ? `${cfg['groupMinItemsLow'] ?? 2}+ items` : '—'}</td>
                  <td>{cfg['autoSend'] ? 'Yes — emails supplier automatically' : 'No — creates a draft to review'}</td>
                  <td>{cfg['lastTriggeredAt'] ? fmtDateTime(String(cfg['lastTriggeredAt'])) : 'Never'}</td>
                  <td>
                    <button type="button" data-btn-ghost data-btn-sm onClick={() => setEditingSupplierId(supplierId)}>
                      Configure
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal
        open={!!editingSupplierId}
        onClose={() => setEditingSupplierId(null)}
        title={`Auto-restock — ${String(editingConfig?.['supplierName'] ?? 'supplier')}`}
      >
        <form
          onSubmit={form.handleSubmit((v) => {
            if (editingSupplierId) saveMutation.mutate({ supplierId: editingSupplierId, input: v });
          })}
          noValidate data-form
        >
          <div data-form-group>
            <label htmlFor="rc-mode">Mode</label>
            <Controller
              control={form.control}
              name="mode"
              render={({ field }) => (
                <Dropdown id="rc-mode" options={MODE_OPTIONS} value={field.value ?? 'off'} onChange={field.onChange} />
              )}
            />
            <InlineError message={form.formState.errors.mode?.message} />
          </div>

          {mode === 'group' && (
            <div data-form-group>
              <label htmlFor="rc-group-min">Minimum items low at once</label>
              <input id="rc-group-min" type="number" min={2} {...form.register('groupMinItemsLow')} />
              <p data-field-hint>
                E.g. 2 means: only auto-restock this supplier once two or more of their items are at or
                below par level at the same time.
              </p>
              <InlineError message={form.formState.errors.groupMinItemsLow?.message} />
            </div>
          )}

          {mode !== 'off' && (
            <div data-form-group data-checkbox-group>
              <label data-checkbox-label>
                <input type="checkbox" {...form.register('autoSend')} />
                Automatically send generated orders to the supplier
              </label>
              <p data-field-hint>
                Off by default — a draft purchase order is created for staff to review and place manually
                from the Purchase Orders screen.
              </p>
            </div>
          )}

          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setEditingSupplierId(null)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
