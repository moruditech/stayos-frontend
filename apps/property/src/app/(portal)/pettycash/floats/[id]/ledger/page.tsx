'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, Pagination, ReadOnlyField, Icons } from '@stayos/ui';
import type { Pagination as PaginationMeta } from '@stayos/types';
import { expenseKeys } from '@/lib/query-keys';

interface LedgerExpense {
  _id: string;
  description: string;
  amount: number;
  status: string;
  createdAt: string;
  submittedBy?: { firstName?: string; lastName?: string };
}

interface FloatLedgerResponse {
  float: Record<string, unknown>;
  expenses: LedgerExpense[];
  meta: PaginationMeta;
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n || 0);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PettyCashLedgerPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: expenseKeys.ledger(id, { page, limit }),
    queryFn: () => api.expenses.getFloatLedger(id, { page, limit }) as unknown as Promise<FloatLedgerResponse>,
  });

  const floatName = data?.float ? String((data.float as Record<string, unknown>)['name'] ?? '—') : '—';
  const currentBalance = data?.float ? Number((data.float as Record<string, unknown>)['currentBalance'] ?? 0) : 0;
  const openingBalance = data?.float ? Number((data.float as Record<string, unknown>)['openingBalance'] ?? 0) : 0;

  return (
    <div data-page="pettycash-ledger">
      <div data-page-header>
        <div>
          <Link href="/pettycash/floats" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Petty cash floats</Link>
          <h1>{isLoading ? 'Loading…' : `${floatName} — Ledger`}</h1>
        </div>
      </div>

      {isLoading ? (
        <SkeletonLoader rows={6} />
      ) : (
        <>
          <div data-stat-grid>
            <ReadOnlyField label="Opening balance" value={fmtCurrency(openingBalance)} />
            <ReadOnlyField label="Current balance" value={fmtCurrency(currentBalance)} />
          </div>

          {!data?.expenses?.length ? (
            <EmptyState
              title="No transactions yet"
              description="Expenses drawn from this float will appear here."
            />
          ) : (
            <>
              <table data-table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Submitted by</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.map((exp) => (
                    <tr key={exp._id}>
                      <td>{fmtDate(exp.createdAt)}</td>
                      <td>{exp.description}</td>
                      <td>{[exp.submittedBy?.firstName, exp.submittedBy?.lastName].filter(Boolean).join(' ') || '—'}</td>
                      <td><StatusBadge status={exp.status} /></td>
                      <td>{fmtCurrency(exp.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data.meta && (
                <Pagination meta={data.meta} onPageChange={setPage} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
