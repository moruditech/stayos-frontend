'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, useToast, Modal, InlineError } from '@stayos/ui';
import { expenseKeys } from '@/lib/query-keys';

const floatSchema = z.object({
  name:         z.string().min(1, 'Float name is required'),
  openingBalance: z.coerce.number().min(0, 'Opening balance required'),
  currency:     z.string().default('ZAR'),
});
type FloatInput = z.infer<typeof floatSchema>;

const reconcileSchema = z.object({
  actualBalance: z.coerce.number().min(0, 'Actual balance required'),
  notes:         z.string().optional(),
});
type ReconcileInput = z.infer<typeof reconcileSchema>;

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
}

export default function PettyCashFloatsPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const { data: floats, isLoading } = useQuery({
    queryKey: expenseKeys.floats(),
    queryFn: () => api.expenses.listFloats(),
    staleTime: 120_000,
  });

  const form = useForm<FloatInput>({ resolver: zodResolver(floatSchema), defaultValues: { currency: 'ZAR' } });
  const reconForm = useForm<ReconcileInput>({ resolver: zodResolver(reconcileSchema) });

  const createMutation = useMutation({
    mutationFn: (input: FloatInput) => api.expenses.createFloat(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.floats() });
      setShowNew(false); form.reset();
      toast('Petty cash float created.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        for (const f of err.fields ?? []) form.setError(f.field as keyof FloatInput, { message: f.message });
      } else toast(err.message ?? 'Failed.', 'error');
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReconcileInput }) =>
      api.expenses.reconcileFloat(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.floats() });
      setReconcilingId(null); reconForm.reset();
      toast('Float reconciled.', 'success');
    },
    onError: (err: ApiError) => {
      setReconcilingId(null);
      toast(err.message ?? 'Failed.', 'error');
    },
  });

  return (
    <div data-page="pettycash-floats">
      <div data-page-header>
        <div>
          <a href="/expenses" data-breadcrumb>← Expenses</a>
          <h1>Petty cash floats</h1>
        </div>
        <button type="button" data-btn-primary onClick={() => setShowNew(true)}>
          + New float
        </button>
      </div>

      {isLoading ? <SkeletonLoader rows={3} /> : !floats?.length ? (
        <EmptyState
          title="No petty cash floats"
          description="Create a float to track petty cash transactions."
          action={<button type="button" data-btn-primary onClick={() => setShowNew(true)}>Create float</button>}
        />
      ) : (
        <div data-float-list>
          {floats.map((float) => {
            const f = float as Record<string, unknown>;
            const id = String(f['_id']);
            return (
              <div key={id} data-float-card>
                <div data-float-header>
                  <h2 data-float-name>{String(f['name'] ?? '—')}</h2>
                </div>
                <div data-float-balances>
                  <div data-float-stat>
                    <span data-stat-label>Opening balance</span>
                    <span data-stat-value>{f['openingBalance'] != null ? fmtCurrency(Number(f['openingBalance'])) : '—'}</span>
                  </div>
                  <div data-float-stat>
                    <span data-stat-label>Current balance</span>
                    <span data-stat-value data-balance>{f['currentBalance'] != null ? fmtCurrency(Number(f['currentBalance'])) : '—'}</span>
                  </div>
                </div>
                <div data-float-actions>
                  <a href={`/pettycash/floats/${id}/ledger`} data-btn-ghost data-btn-sm>View ledger</a>
                  <button type="button" data-btn-ghost data-btn-sm
                    onClick={() => { setReconcilingId(id); reconForm.reset(); }}>
                    Reconcile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New float modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New petty cash float">
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label htmlFor="fl-name">Float name</label>
            <input id="fl-name" type="text" placeholder="e.g. Front Desk Float" {...form.register('name')} />
            <InlineError message={form.formState.errors.name?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="fl-balance">Opening balance (ZAR)</label>
            <input id="fl-balance" type="number" min={0} step="0.01" {...form.register('openingBalance')} />
            <InlineError message={form.formState.errors.openingBalance?.message} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNew(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create float'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reconcile modal */}
      <Modal open={!!reconcilingId} onClose={() => setReconcilingId(null)} title="Reconcile float">
        <form
          onSubmit={reconForm.handleSubmit((v) =>
            reconcileMutation.mutate({ id: reconcilingId!, input: v })
          )}
          noValidate data-form
        >
          <div data-form-group>
            <label htmlFor="rc-balance">Actual cash counted (ZAR)</label>
            <input id="rc-balance" type="number" min={0} step="0.01" {...reconForm.register('actualBalance')} />
            <InlineError message={reconForm.formState.errors.actualBalance?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="rc-notes">Notes <span data-optional>(optional)</span></label>
            <textarea id="rc-notes" rows={2} {...reconForm.register('notes')} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setReconcilingId(null)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={reconcileMutation.isPending}>
              {reconcileMutation.isPending ? 'Reconciling…' : 'Reconcile'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
