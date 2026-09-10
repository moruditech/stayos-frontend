'use client';

import Link from 'next/link';

/**
 * Night Audit — list + generate. A daily cash-reconciliation record:
 * system-recorded income (bookings, POS, manual "other income") vs cash
 * actually counted, net of that day's expenses (including any auto-logged
 * from procurement). See accounting.service.js for the full calculation.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, useToast, Modal, Icons } from '@stayos/ui';
import { accountingKeys } from '@/lib/query-keys';

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n || 0);
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NightAuditListPage(): React.ReactElement {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showGenerate, setShowGenerate] = useState(false);
  const [auditDate, setAuditDate] = useState(todayIso());

  const { data: audits, isLoading } = useQuery({
    queryKey: accountingKeys.nightAudits({}),
    queryFn: () => api.accounting.listNightAudits({ limit: 100 }),
  });

  const generateMutation = useMutation({
    mutationFn: (date: string) => api.accounting.generateNightAudit(date),
    onSuccess: (audit) => {
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'night-audits'] });
      setShowGenerate(false);
      const a = audit as unknown as Record<string, unknown>;
      router.push(`/accounting/night-audit/${String(a['_id'])}`);
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to generate night audit.', 'error'),
  });

  return (
    <div data-page="night-audit-list">
      <div data-page-header>
        <div>
          <Link href="/accounting" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Accounting</Link>
          <h1>Night Audit</h1>
        </div>
        <button type="button" data-btn-primary onClick={() => setShowGenerate(true)}>+ Run night audit</button>
      </div>

      {isLoading ? <SkeletonLoader rows={5} /> : !audits?.length ? (
        <EmptyState
          title="No night audits yet"
          description="Run a night audit to reconcile today's recorded income against cash counted."
          action={<button type="button" data-btn-primary onClick={() => setShowGenerate(true)}>Run night audit</button>}
        />
      ) : (
        <table data-table>
          <thead>
            <tr><th>Date</th><th>Recorded income</th><th>Expenses</th><th>Expected cash</th><th>Counted</th><th>Variance</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {audits.map((a) => {
              const audit = a as unknown as Record<string, unknown>;
              const id = String(audit['_id']);
              const variance = audit['variance'] as number | null | undefined;
              return (
                <tr key={id}>
                  <td>{fmtDate(String(audit['auditDate']))}</td>
                  <td>{fmtCurrency(Number(audit['grandTotalIncome'] ?? 0))}</td>
                  <td>{fmtCurrency(Number(audit['expenseTotal'] ?? 0))}</td>
                  <td>{fmtCurrency(Number(audit['expectedCash'] ?? 0))}</td>
                  <td>{audit['countedCash'] != null ? fmtCurrency(Number(audit['countedCash'])) : '—'}</td>
                  <td data-variance={variance != null ? (variance === 0 ? 'balanced' : variance > 0 ? 'over' : 'short') : undefined}>
                    {variance != null ? fmtCurrency(variance) : '—'}
                  </td>
                  <td><StatusBadge status={String(audit['status'] ?? 'open')} /></td>
                  <td><Link href={`/accounting/night-audit/${id}`} data-btn-ghost data-btn-sm>View</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal open={showGenerate} onClose={() => setShowGenerate(false)} title="Run night audit">
        <div data-form-group>
          <label htmlFor="na-date">Date</label>
          <input id="na-date" type="date" max={todayIso()} value={auditDate} onChange={(e) => setAuditDate(e.target.value)} />
          <p data-field-hint>
            Calculates recorded income and expenses for this day. If an open audit already
            exists for this date, this recalculates it without losing anything you&apos;ve
            already entered.
          </p>
        </div>
        <div data-modal-actions>
          <button type="button" data-btn-ghost onClick={() => setShowGenerate(false)}>Cancel</button>
          <button type="button" data-btn-primary disabled={generateMutation.isPending} onClick={() => generateMutation.mutate(auditDate)}>
            {generateMutation.isPending ? 'Generating…' : 'Run audit'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
