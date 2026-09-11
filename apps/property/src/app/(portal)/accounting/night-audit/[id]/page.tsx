'use client';

import Link from 'next/link';

/**
 * Night Audit detail — the actual cash-up screen. While status is 'open',
 * the opening float, counted cash, "other income" entries, and notes are
 * editable; recorded income and expenses are system-calculated (use
 * "Recalculate" to refresh them if bookings/expenses changed since this
 * was generated). Finalizing posts a balanced journal entry to the
 * General Ledger and locks the record.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader, StatusBadge, ReadOnlyField, useToast, ConfirmDialog,
  DownloadButton, Icons,
} from '@stayos/ui';
import { accountingKeys } from '@/lib/query-keys';

interface FormInput {
  openingCashFloat: number;
  countedCash?: number | undefined;
  varianceNote?: string | undefined;
  notes?: string | undefined;
  otherIncomeEntries: { description: string; amount: number; isCash: boolean }[];
}

function fmtCurrency(n: number | null | undefined): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n || 0);
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NightAuditDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const auditId = params.id;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  const { data: audit, isLoading } = useQuery({
    queryKey: accountingKeys.nightAudit(auditId),
    queryFn: () => api.accounting.getNightAudit(auditId),
    enabled: !!auditId,
  });

  const form = useForm<FormInput>({ defaultValues: { otherIncomeEntries: [] } });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'otherIncomeEntries' });

  useEffect(() => {
    if (!audit) return;
    const a = audit as unknown as Record<string, unknown>;
    form.reset({
      openingCashFloat: Number(a['openingCashFloat'] ?? 0),
      countedCash: a['countedCash'] != null ? Number(a['countedCash']) : undefined,
      varianceNote: String(a['varianceNote'] ?? ''),
      notes: String(a['notes'] ?? ''),
      otherIncomeEntries: (a['otherIncomeEntries'] as { description: string; amount: number; isCash: boolean }[]) ?? [],
    });
  }, [audit]);

  const isOpen = (audit as unknown as Record<string, unknown> | undefined)?.['status'] === 'open';

  const saveMutation = useMutation({
    mutationFn: (input: FormInput) => api.accounting.updateNightAudit(auditId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountingKeys.nightAudit(auditId) });
      toast('Night audit saved.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to save.', 'error'),
  });

  const recalculateMutation = useMutation({
    mutationFn: () => {
      const a = audit as unknown as Record<string, unknown>;
      return api.accounting.generateNightAudit(String(a['auditDate']));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountingKeys.nightAudit(auditId) });
      toast('Recalculated with the latest figures.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to recalculate.', 'error'),
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      await api.accounting.updateNightAudit(auditId, form.getValues());
      return api.accounting.finalizeNightAudit(auditId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountingKeys.nightAudit(auditId) });
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'night-audits'] });
      setConfirmFinalize(false);
      toast('Night audit finalized and posted to the General Ledger.', 'success');
    },
    onError: (err: ApiError) => { setConfirmFinalize(false); toast(err.message ?? 'Failed to finalize.', 'error'); },
  });

  if (isLoading || !audit) {
    return (
      <div data-page="night-audit-detail">
        <div data-page-header>
          <div>
            <Link href="/accounting/night-audit" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Night Audit</Link>
            <h1>Night audit</h1>
          </div>
        </div>
        <SkeletonLoader rows={8} />
      </div>
    );
  }

  const a = audit as unknown as Record<string, unknown>;
  const bookingRevenue = a['bookingRevenue'] as Record<string, number>;
  const posRevenue = a['posRevenue'] as Record<string, number | boolean>;
  const expenseByCategory = (a['expenseByCategory'] as Record<string, number>) ?? {};
  const variance = a['variance'] as number | null | undefined;

  return (
    <div data-page="night-audit-detail">
      <div data-page-header>
        <div>
          <Link href="/accounting/night-audit" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Night Audit</Link>
          <h1>Night audit — {fmtDate(String(a['auditDate']))}</h1>
        </div>
        <div data-header-actions>
          <DownloadButton
            href={api.accounting.getNightAuditPdfUrl(auditId)}
            filename={`night-audit-${String(a['auditDate']).slice(0, 10)}.pdf`}
            label="Download PDF"
          />
          {isOpen && (
            <>
              <button type="button" data-btn-ghost disabled={recalculateMutation.isPending} onClick={() => recalculateMutation.mutate()}>
                {recalculateMutation.isPending ? 'Recalculating…' : 'Recalculate'}
              </button>
              <button
                type="button" data-btn-primary
                onClick={() => {
                  if (form.getValues('countedCash') == null) {
                    toast('Enter the counted cash amount before finalizing.', 'error');
                    return;
                  }
                  setConfirmFinalize(true);
                }}
              >
                Finalize
              </button>
            </>
          )}
        </div>
      </div>

      <div data-form-container>
        <div data-stat-grid>
          <ReadOnlyField label="Status" value={<StatusBadge status={String(a['status'] ?? 'open')} />} />
          <ReadOnlyField label="Recorded income (all methods)" value={fmtCurrency(Number(a['grandTotalIncome']))} />
          <ReadOnlyField label="Total expenses" value={fmtCurrency(Number(a['expenseTotal']))} />
        </div>

        <section data-report-section>
          <h2>Recorded income</h2>
          <table data-table>
            <thead><tr><th>Source</th><th>Cash</th><th>Card / EFT / other</th><th>Total</th></tr></thead>
            <tbody>
              <tr>
                <td>Booking payments</td>
                <td>{fmtCurrency(bookingRevenue?.cash)}</td>
                <td>{fmtCurrency(bookingRevenue?.other)}</td>
                <td>{fmtCurrency(bookingRevenue?.total)}</td>
              </tr>
              <tr>
                <td>POS {posRevenue?.connected === false && <span data-field-hint>(not connected)</span>}</td>
                <td>{fmtCurrency(posRevenue?.cash as number)}</td>
                <td>{fmtCurrency(posRevenue?.other as number)}</td>
                <td>{fmtCurrency(posRevenue?.total as number)}</td>
              </tr>
              <tr>
                <td colSpan={3}>Other income (manual)</td>
                <td>{fmtCurrency(Number(a['otherIncomeTotal']))}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {isOpen && (
          <section data-report-section>
            <h3>Other income entries</h3>
            {fields.map((field, index) => (
              <div key={field.id} data-form-row data-po-item-row>
                <div data-form-group>
                  <label htmlFor={`oi-desc-${index}`}>Description</label>
                  <input id={`oi-desc-${index}`} type="text" {...form.register(`otherIncomeEntries.${index}.description`)} />
                </div>
                <div data-form-group>
                  <label htmlFor={`oi-amt-${index}`}>Amount</label>
                  <input id={`oi-amt-${index}`} type="number" min={0} step="0.01" {...form.register(`otherIncomeEntries.${index}.amount`, { valueAsNumber: true })} />
                </div>
                <div data-form-group data-checkbox-group>
                  <label data-checkbox-label>
                    <input type="checkbox" {...form.register(`otherIncomeEntries.${index}.isCash`)} />
                    Cash
                  </label>
                </div>
                <button type="button" data-btn-ghost data-btn-sm data-destructive onClick={() => remove(index)}>Remove</button>
              </div>
            ))}
            <button type="button" data-btn-ghost data-btn-sm onClick={() => append({ description: '', amount: 0, isCash: true })}>
              + Add other income
            </button>
          </section>
        )}

        <section data-report-section>
          <h2>Expenses</h2>
          {Object.keys(expenseByCategory).length ? (
            <table data-table>
              <thead><tr><th>Category</th><th>Amount</th></tr></thead>
              <tbody>
                {Object.entries(expenseByCategory).map(([cat, amt]) => (
                  <tr key={cat}><td>{cat}</td><td>{fmtCurrency(amt)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p data-field-hint>No expenses recorded for this day.</p>}
        </section>

        <section data-report-section>
          <h2>Cash reconciliation</h2>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="na-opening">Opening cash float</label>
              <input id="na-opening" type="number" min={0} step="0.01" disabled={!isOpen} {...form.register('openingCashFloat', { valueAsNumber: true })} />
              <p data-field-hint>Defaults to the previous audit&apos;s counted cash.</p>
            </div>
            <div data-form-group>
              <label>Expected cash</label>
              <input type="text" disabled value={fmtCurrency(Number(a['expectedCash']))} />
            </div>
            <div data-form-group>
              <label htmlFor="na-counted">Cash counted</label>
              <input id="na-counted" type="number" min={0} step="0.01" disabled={!isOpen} placeholder="Enter counted amount" {...form.register('countedCash', { valueAsNumber: true })} />
            </div>
          </div>
          {variance != null && (
            <ReadOnlyField
              label={variance === 0 ? 'Variance (balanced)' : variance > 0 ? 'Variance (over)' : 'Variance (short)'}
              value={fmtCurrency(variance)}
            />
          )}
          <div data-form-group>
            <label htmlFor="na-variance-note">Variance note <span data-optional>(optional)</span></label>
            <textarea id="na-variance-note" rows={2} disabled={!isOpen} {...form.register('varianceNote')} />
          </div>
          <div data-form-group>
            <label htmlFor="na-notes">Notes <span data-optional>(optional)</span></label>
            <textarea id="na-notes" rows={2} disabled={!isOpen} {...form.register('notes')} />
          </div>
        </section>

        {isOpen && (
          <div data-form-actions>
            <button type="button" data-btn-primary disabled={saveMutation.isPending} onClick={form.handleSubmit((v) => saveMutation.mutate(v))}>
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmFinalize}
        title="Finalize this night audit?"
        message="This locks the day's figures and posts a balanced journal entry to the General Ledger. It can't be edited afterwards — correct any mistakes with a manual adjusting journal entry instead."
        confirmLabel="Finalize"
        cancelLabel="Cancel"
        onConfirm={() => finalizeMutation.mutate()}
        onCancel={() => setConfirmFinalize(false)}
      />
    </div>
  );
}
