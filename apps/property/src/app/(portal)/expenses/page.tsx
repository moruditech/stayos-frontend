'use client';

/**
 * Expenses — TAD 11 §13.
 * Any staff member can submit an expense.
 * Approval/rejection requires expense:approve.
 * Reimbursement requires expense:manage.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader,
  EmptyState,
  StatusBadge,
  RoleGate,
  useToast,
  Modal,
  InlineError,
  applyServerErrors,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { expenseKeys } from '@/lib/query-keys';

const expenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount:      z.coerce.number().min(0.01, 'Amount must be positive'),
  category:    z.string().min(1, 'Category is required'),
  date:        z.string().min(1, 'Date is required'),
  notes:       z.string().optional(),
});
type ExpenseInput = z.infer<typeof expenseSchema>;

export default function ExpensesPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewModal, setShowNewModal] = useState(false);

  const { data: expenses, isLoading } = useQuery({
    queryKey: expenseKeys.list(),
    queryFn: () => api.expenses.list(),
  });

  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { date: new Date().toISOString().slice(0, 10) },
  });

  const createMutation = useMutation({
    mutationFn: (input: ExpenseInput) => api.expenses.submit(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.list() });
      setShowNewModal(false);
      form.reset();
      toast('Expense submitted.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else toast(err.message ?? 'Failed.', 'error');
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
    mutationFn: (id: string) => api.expenses.reject(id, 'Rejected by manager'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.list() });
      toast('Expense rejected.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  const reimburseMutation = useMutation({
    mutationFn: (id: string) => api.expenses.reimburse(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.list() });
      toast('Marked as reimbursed.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  return (
    <div data-page="expenses">
      <div data-page-header>
        <h1>Expenses</h1>
        {/* Any staff member can submit */}
        <button type="button" data-btn-primary onClick={() => setShowNewModal(true)}>
          + Submit expense
        </button>
      </div>

      {isLoading ? (
        <SkeletonLoader rows={5} />
      ) : !expenses?.length ? (
        <EmptyState title="No expenses" description="Submit an expense to get started." />
      ) : (
        <table data-table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => {
              const exp = e as Record<string, unknown>;
              const id = String(exp['_id']);
              const status = String(exp['status'] ?? 'pending');
              return (
                <tr key={id}>
                  <td>{exp['date'] ? new Date(String(exp['date'])).toLocaleDateString('en-ZA') : '—'}</td>
                  <td>{String(exp['description'] ?? '—')}</td>
                  <td>{String(exp['category'] ?? '—')}</td>
                  <td>
                    {exp['amount'] != null
                      ? new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(exp['amount']))
                      : '—'}
                  </td>
                  <td><StatusBadge status={status} /></td>
                  <td>
                    <div data-action-cluster>
                      {status === 'pending' && (
                        <RoleGate perm={PERMISSIONS.EXPENSE_APPROVE}>
                          <button
                            type="button" data-btn-ghost data-btn-sm
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate(id)}
                          >Approve</button>
                          <button
                            type="button" data-btn-ghost data-btn-sm data-destructive
                            disabled={rejectMutation.isPending}
                            onClick={() => rejectMutation.mutate(id)}
                          >Reject</button>
                        </RoleGate>
                      )}
                      {status === 'approved' && (
                        <RoleGate perm={PERMISSIONS.EXPENSE_MANAGE}>
                          <button
                            type="button" data-btn-ghost data-btn-sm
                            disabled={reimburseMutation.isPending}
                            onClick={() => reimburseMutation.mutate(id)}
                          >Reimburse</button>
                        </RoleGate>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="Submit expense">
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label htmlFor="expDesc">Description</label>
            <input id="expDesc" type="text" {...form.register('description')} />
            <InlineError message={form.formState.errors.description?.message} />
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="expAmount">Amount (ZAR)</label>
              <input id="expAmount" type="number" step="0.01" min={0} {...form.register('amount')} />
              <InlineError message={form.formState.errors.amount?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="expDate">Date</label>
              <input id="expDate" type="date" {...form.register('date')} />
            </div>
          </div>
          <div data-form-group>
            <label htmlFor="expCategory">Category</label>
            <select id="expCategory" {...form.register('category')}>
              <option value="">Select…</option>
              <option value="supplies">Supplies</option>
              <option value="travel">Travel</option>
              <option value="meals">Meals</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
            </select>
            <InlineError message={form.formState.errors.category?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="expNotes">Notes <span data-optional>(optional)</span></label>
            <textarea id="expNotes" rows={2} {...form.register('notes')} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNewModal(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Submitting…' : 'Submit expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
