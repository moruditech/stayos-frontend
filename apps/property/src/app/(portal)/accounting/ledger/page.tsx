'use client';

import Link from 'next/link';

/**
 * Chart of accounts — General Ledger setup. A starter set of accounts is
 * seeded automatically the first time this loads (see
 * accounting.service.js#seedDefaultAccounts) so Night Audit has somewhere
 * to post to immediately; accounts can be freely added, edited, or
 * deactivated afterwards (requirement 4a).
 */

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError, LedgerAccount } from '@stayos/api-client';
import { SkeletonLoader, useToast, Modal, InlineError, Icons, Dropdown } from '@stayos/ui';
import { accountingKeys } from '@/lib/query-keys';

const TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;
const TYPE_LABELS: Record<(typeof TYPES)[number], string> = {
  asset: 'Asset', liability: 'Liability', equity: 'Equity', revenue: 'Revenue', expense: 'Expense',
};
const TYPE_OPTIONS = TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }));

const schema = z.object({
  code: z.string().min(1, 'Code is required').max(20),
  name: z.string().min(1, 'Name is required').max(120),
  type: z.enum(TYPES, { errorMap: () => ({ message: 'Type is required' }) }),
});
type FormInput = z.infer<typeof schema>;

export default function ChartOfAccountsPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [editingAccount, setEditingAccount] = useState<LedgerAccount | null>(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: accountingKeys.accounts(),
    queryFn: () => api.accounting.listAccounts(),
  });

  const form = useForm<FormInput>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (editingAccount) form.reset({ code: editingAccount.code, name: editingAccount.name, type: editingAccount.type });
  }, [editingAccount]);

  const createMutation = useMutation({
    mutationFn: (input: FormInput) => api.accounting.createAccount(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountingKeys.accounts() });
      setShowNew(false); form.reset();
      toast('Account created.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR' || err.code === 'CONFLICT') {
        for (const f of err.fields ?? []) form.setError(f.field as keyof FormInput, { message: f.message });
        if (!err.fields?.length) form.setError('code', { message: err.message });
      } else toast(err.message ?? 'Failed.', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: FormInput }) => api.accounting.updateAccount(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountingKeys.accounts() });
      setEditingAccount(null); form.reset();
      toast('Account updated.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR' || err.code === 'CONFLICT') {
        for (const f of err.fields ?? []) form.setError(f.field as keyof FormInput, { message: f.message });
        if (!err.fields?.length) form.setError('code', { message: err.message });
      } else toast(err.message ?? 'Failed.', 'error');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.accounting.updateAccount(id, { isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountingKeys.accounts() });
      toast('Account updated.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.accounting.deleteAccount(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountingKeys.accounts() });
      toast('Account deleted.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to delete.', 'error'),
  });

  const grouped = TYPES.map((type) => ({
    type,
    accounts: (accounts ?? []).filter((a) => a.type === type),
  })).filter((g) => g.accounts.length);

  return (
    <div data-page="chart-of-accounts">
      <div data-page-header>
        <div>
          <Link href="/accounting" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Accounting</Link>
          <h1>Chart of accounts</h1>
        </div>
        <button type="button" data-btn-primary onClick={() => { form.reset({ code: '', name: '' }); setShowNew(true); }}>
          + Add account
        </button>
      </div>

      {isLoading ? <SkeletonLoader rows={6} /> : (
        grouped.map((group) => (
          <section key={group.type} data-report-section>
            <h2>{TYPE_LABELS[group.type]}s</h2>
            <table data-table>
              <thead><tr><th>Code</th><th>Name</th><th>Normal balance</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {group.accounts.map((acc) => (
                  <tr key={acc._id}>
                    <td>{acc.code}</td>
                    <td>{acc.name}{acc.isSystem && <span data-auto-badge> Default</span>}</td>
                    <td style={{ textTransform: 'capitalize' }}>{acc.normalBalance}</td>
                    <td>{acc.isActive ? 'Active' : 'Inactive'}</td>
                    <td>
                      <div data-action-cluster>
                        <button type="button" data-btn-ghost data-btn-sm onClick={() => setEditingAccount(acc)}>Edit</button>
                        <button type="button" data-btn-ghost data-btn-sm onClick={() => toggleActiveMutation.mutate({ id: acc._id, isActive: !acc.isActive })}>
                          {acc.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        {!acc.isSystem && (
                          <button type="button" data-btn-ghost data-btn-sm data-destructive onClick={() => deleteMutation.mutate(acc._id)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}

      <Modal open={showNew || !!editingAccount} onClose={() => { setShowNew(false); setEditingAccount(null); }} title={editingAccount ? 'Edit account' : 'Add account'}>
        <form
          onSubmit={form.handleSubmit((v) => {
            if (editingAccount) updateMutation.mutate({ id: editingAccount._id, input: v });
            else createMutation.mutate(v);
          })}
          noValidate data-form
        >
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="acc-code">Code</label>
              <input id="acc-code" type="text" placeholder="e.g. 101" {...form.register('code')} />
              <InlineError message={form.formState.errors.code?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="acc-type">Type</label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Dropdown id="acc-type" options={TYPE_OPTIONS} value={field.value ?? ''} onChange={field.onChange} placeholder="Select…" />
                )}
              />
              <InlineError message={form.formState.errors.type?.message} />
            </div>
          </div>
          <div data-form-group>
            <label htmlFor="acc-name">Name</label>
            <input id="acc-name" type="text" placeholder="e.g. Cash Assets" {...form.register('name')} />
            <InlineError message={form.formState.errors.name?.message} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => { setShowNew(false); setEditingAccount(null); }}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving…' : editingAccount ? 'Save changes' : 'Add account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
