'use client';

import Link from 'next/link';

/**
 * Accounting hub — combines what were previously separate Expenses and
 * Petty Cash pages, plus the new Night Audit and General Ledger modules.
 * Sub-sections are gated individually (RoleGate) since Expenses is open
 * to all staff (anyone can submit a reimbursement claim) while Petty Cash,
 * Night Audit, and the General Ledger are supervisory/financial functions.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { RoleGate, Icons } from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { expenseKeys, accountingKeys } from '@/lib/query-keys';

export default function AccountingHubPage(): React.ReactElement {
  const { data: pendingExpenses } = useQuery({
    queryKey: [...expenseKeys.list(), 'pending'],
    queryFn: () => api.expenses.list({ status: 'pending', limit: 100 }),
    staleTime: 60_000,
  });

  const { data: openAudits } = useQuery({
    queryKey: accountingKeys.nightAudits({ status: 'open' }),
    queryFn: () => api.accounting.listNightAudits({ status: 'open', limit: 100 }),
    staleTime: 60_000,
  });

  const pendingCount = pendingExpenses?.length ?? 0;
  const openAuditCount = openAudits?.length ?? 0;

  return (
    <div data-page="accounting-hub">
      <div data-page-header>
        <h1>Accounting</h1>
      </div>

      {pendingCount > 0 && (
        <div role="alert" data-alert data-alert-warning>
          <strong>{pendingCount} expense{pendingCount !== 1 ? 's' : ''} awaiting approval.</strong>{' '}
          <Link href="/accounting/expenses" data-alert-link>
            Review <Icons.ArrowRight data-alert-link-icon aria-hidden="true" />
          </Link>
        </div>
      )}

      <div data-hub-grid>
        <Link href="/accounting/expenses" data-hub-card>
          <Icons.Receipt data-hub-card-icon aria-hidden="true" />
          <h2>Expenses</h2>
          <p>Submit and approve staff expense claims.</p>
          {pendingCount > 0 && <span data-hub-card-badge>{pendingCount} pending</span>}
        </Link>

        <RoleGate perm={PERMISSIONS.PETTYCASH_MANAGE}>
          <Link href="/accounting/pettycash" data-hub-card>
            <Icons.Coins data-hub-card-icon aria-hidden="true" />
            <h2>Petty Cash</h2>
            <p>Manage cash floats and reconcile balances.</p>
          </Link>
        </RoleGate>

        <RoleGate perm={PERMISSIONS.ACCOUNTING_MANAGE}>
          <Link href="/accounting/night-audit" data-hub-card>
            <Icons.Calculator data-hub-card-icon aria-hidden="true" />
            <h2>Night Audit</h2>
            <p>Reconcile recorded income against cash counted, daily.</p>
            {openAuditCount > 0 && <span data-hub-card-badge>{openAuditCount} open</span>}
          </Link>
        </RoleGate>

        <RoleGate perm={PERMISSIONS.ACCOUNTING_MANAGE}>
          <Link href="/accounting/ledger" data-hub-card>
            <Icons.BookOpen data-hub-card-icon aria-hidden="true" />
            <h2>Chart of Accounts</h2>
            <p>Manage general ledger account codes.</p>
          </Link>
        </RoleGate>

        <RoleGate perm={PERMISSIONS.ACCOUNTING_MANAGE}>
          <Link href="/accounting/journal" data-hub-card>
            <Icons.FileText data-hub-card-icon aria-hidden="true" />
            <h2>Journal &amp; Trial Balance</h2>
            <p>View postings, adjust descriptions, export reports.</p>
          </Link>
        </RoleGate>
      </div>
    </div>
  );
}
