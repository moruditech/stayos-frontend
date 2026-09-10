'use client';

import Link from 'next/link';

/**
 * Expenses — part of the Accounting hub (previously its own top-level page
 * at /expenses; moved here as part of combining Expenses + Petty Cash into
 * one Accounting section).
 *
 * Field names match the backend `submitExpenseSchema` exactly. Submission
 * is multipart/form-data — the backend requires an actual receipt image
 * file (see expenses.routes.js's upload.single('receipt')); this previously
 * silently 422'd every time because the old form sent plain JSON with no
 * file. There is intentionally no vendor/payee field on this form.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader, EmptyState, StatusBadge, useToast, Modal, InlineError,
  Icons, Dropdown, FileUpload, RoleGate,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { expenseKeys } from '@/lib/query-keys';

const CATEGORIES = ['supplies', 'maintenance', 'utilities', 'transport', 'staff_welfare', 'marketing', 'other'] as const;
const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  supplies: 'Supplies', maintenance: 'Maintenance', utilities: 'Utilities',
  transport: 'Transport', staff_welfare: 'Staff Welfare', marketing: 'Marketing', other: 'Other',
};
const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }));

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'reimbursed', label: 'Reimbursed' },
];

const schema = z.object({
  category:         z.enum(CATEGORIES, { errorMap: () => ({ message: 'Category is required' }) }),
  description:      z.string().min(1, 'Description is required'),
  amount:            z.coerce.number().positive('Amount must be a positive number'),
  date:              z.string().min(1, 'Date is required'),
  notes:             z.string().optional(),
  pettyCashFloatId:  z.string().optional(),
});
type FormInput = z.infer<typeof schema>;

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n || 0);
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpensesPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string | undefined>();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: expenses, isLoading } = useQuery({
    queryKey: [...expenseKeys.list(), statusFilter],
    queryFn: () => api.expenses.list(statusFilter ? { status: statusFilter, limit: 100 } : { limit: 100 }),
  });

  const { data: floats } = useQuery({
    queryKey: expenseKeys.floats(),
    queryFn: () => api.expenses.listFloats(),
    staleTime: 120_000,
  });
  const floatOptions = [
    { value: '', label: 'Not drawn from petty cash' },
    ...(floats ?? []).map((f) => {
      const flt = f as unknown as Record<string, unknown>;
      return { value: String(flt['_id']), label: String(flt['name'] ?? 'Float') };
    }),
  ];

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayIso() },
  });

  const submitMutation = useMutation({
    mutationFn: (input: FormInput) => {
      if (!receiptFile) throw new Error('RECEIPT_REQUIRED');
      return api.expenses.submit({ ...input, receipt: receiptFile });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.list() });
      setShowNew(false); form.reset({ date: todayIso() }); setReceiptFile(null);
      toast('Expense submitted.', 'success');
    },
    onError: (err: Error | ApiError) => {
      if (err instanceof Error && err.message === 'RECEIPT_REQUIRED') {
        setReceiptError('A receipt photo is required.');
        return;
      }
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR') {
        for (const f of apiErr.fields ?? []) form.setError(f.field as keyof FormInput, { message: f.message });
      } else toast(apiErr.message ?? 'Failed to submit expense.', 'error');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.expenses.approve(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.list() });
      toast('Expense approved.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.expenses.reject(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.list() });
      setRejectingId(null); setRejectReason('');
      toast('Expense rejected.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  const reimburseMutation = useMutation({
    mutationFn: (id: string) => api.expenses.reimburse(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.list() });
      toast('Expense marked reimbursed.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  return (
    <div data-page="expenses">
      <div data-page-header>
        <div>
          <Link href="/accounting" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Accounting</Link>
          <h1>Expenses</h1>
        </div>
        <button type="button" data-btn-primary onClick={() => setShowNew(true)}>+ Submit expense</button>
      </div>

      <div data-toolbar>
        <Dropdown
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All statuses"
          aria-label="Filter by status"
        />
      </div>

      {isLoading ? <SkeletonLoader rows={5} /> : !expenses?.length ? (
        <EmptyState
          title="No expenses"
          description="Submitted expense claims will appear here."
          action={<button type="button" data-btn-primary onClick={() => setShowNew(true)}>Submit expense</button>}
        />
      ) : (
        <table data-table>
          <thead>
            <tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Submitted by</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {expenses.map((exp) => {
              const e = exp as unknown as Record<string, unknown>;
              const id = String(e['_id']);
              const status = String(e['status'] ?? 'pending');
              const submitter = e['submittedBy'] as Record<string, unknown> | undefined;
              const isProcurement = e['sourceType'] === 'procurement';
              return (
                <tr key={id}>
                  <td>{e['date'] ? fmtDate(String(e['date'])) : '—'}</td>
                  <td>{CATEGORY_LABELS[e['category'] as (typeof CATEGORIES)[number]] ?? String(e['category'])}</td>
                  <td>
                    {String(e['description'] ?? '—')}
                    {isProcurement && <span data-auto-badge title="Auto-logged from a received purchase order"> Procurement</span>}
                  </td>
                  <td>{fmtCurrency(Number(e['amount'] ?? 0))}</td>
                  <td>{submitter ? `${submitter['firstName'] ?? ''} ${submitter['lastName'] ?? ''}`.trim() || '—' : '—'}</td>
                  <td><StatusBadge status={status} /></td>
                  <td>
                    <RoleGate perm={PERMISSIONS.EXPENSE_APPROVE}>
                      <div data-action-cluster>
                        {status === 'pending' && (
                          <>
                            <button type="button" data-btn-ghost data-btn-sm onClick={() => approveMutation.mutate(id)}>Approve</button>
                            <button type="button" data-btn-ghost data-btn-sm data-destructive onClick={() => setRejectingId(id)}>Reject</button>
                          </>
                        )}
                        {status === 'approved' && (
                          <button type="button" data-btn-ghost data-btn-sm onClick={() => reimburseMutation.mutate(id)}>Mark reimbursed</button>
                        )}
                      </div>
                    </RoleGate>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal open={showNew} onClose={() => { setShowNew(false); setReceiptFile(null); }} title="Submit expense">
        <form
          onSubmit={form.handleSubmit((v) => submitMutation.mutate(v))}
          noValidate data-form
        >
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="ex-category">Category</label>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Dropdown id="ex-category" options={CATEGORY_OPTIONS} value={field.value ?? ''} onChange={field.onChange} placeholder="Select…" />
                )}
              />
              <InlineError message={form.formState.errors.category?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="ex-date">Date incurred</label>
              <input id="ex-date" type="date" max={todayIso()} {...form.register('date')} />
              <InlineError message={form.formState.errors.date?.message} />
            </div>
          </div>

          <div data-form-group>
            <label htmlFor="ex-description">Description</label>
            <input id="ex-description" type="text" placeholder="What was this for?" {...form.register('description')} />
            <InlineError message={form.formState.errors.description?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="ex-amount">Amount (ZAR)</label>
            <input id="ex-amount" type="number" min={0} step="0.01" {...form.register('amount')} />
            <InlineError message={form.formState.errors.amount?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="ex-float">Petty cash float <span data-optional>(optional)</span></label>
            <Controller
              control={form.control}
              name="pettyCashFloatId"
              render={({ field }) => (
                <Dropdown id="ex-float" options={floatOptions} value={field.value ?? ''} onChange={field.onChange} />
              )}
            />
            <p data-field-hint>If this was paid out of a float, its balance is deducted immediately.</p>
          </div>

          <div data-form-group>
            <label>Receipt photo</label>
            <FileUpload
              accept="image/*,application/pdf"
              maxSizeMb={10}
              onFiles={(files) => { setReceiptFile(files[0] ?? null); setReceiptError(undefined); }}
            />
            {receiptFile && <p data-field-hint>Selected: {receiptFile.name}</p>}
            <InlineError message={receiptError} />
          </div>

          <div data-form-group>
            <label htmlFor="ex-notes">Notes <span data-optional>(optional)</span></label>
            <textarea id="ex-notes" rows={2} {...form.register('notes')} />
          </div>

          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => { setShowNew(false); setReceiptFile(null); }}>Cancel</button>
            <button type="submit" data-btn-primary disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Submitting…' : 'Submit expense'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!rejectingId} onClose={() => { setRejectingId(null); setRejectReason(''); }} title="Reject this expense?">
        <div data-form-group>
          <label htmlFor="reject-reason">Reason</label>
          <textarea
            id="reject-reason" rows={3} value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Why is this being rejected?"
          />
        </div>
        <div data-modal-actions>
          <button type="button" data-btn-ghost onClick={() => { setRejectingId(null); setRejectReason(''); }}>Cancel</button>
          <button
            type="button" data-btn-primary data-destructive
            disabled={!rejectReason.trim() || rejectMutation.isPending}
            onClick={() => { if (rejectingId && rejectReason.trim()) rejectMutation.mutate({ id: rejectingId, reason: rejectReason.trim() }); }}
          >
            {rejectMutation.isPending ? 'Rejecting…' : 'Reject expense'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
