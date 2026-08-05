import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { useSession } from '@stayos/auth';
import { PERMISSIONS } from '@stayos/constants';
import { PageHeader, Panel, LoadingBlock, EmptyBlock, RoleGate, Icons } from '@stayos/ui';
import { agencyKeys } from '../lib/query-keys';
import { formatZAR, formatDate, formatNumber, titleCase } from '../lib/format';

export default function BillingPage(): React.ReactElement {
  const session = useSession();

  return (
    <RoleGate
      perm={[PERMISSIONS.BILLING_MANAGE]}
      fallback={
        <div>
          <PageHeader title="Billing" />
          <EmptyBlock
            icon={Icons.Lock}
            title="Only the agency owner can view billing"
            description="Ask your agency owner for access if you need this information."
          />
        </div>
      }
    >
      {session ? <BillingContent /> : null}
    </RoleGate>
  );
}

function BillingContent(): React.ReactElement {
  const { data: billing, isLoading } = useQuery({ queryKey: agencyKeys.billing(), queryFn: api.agency.getBilling });
  const { data: invoicesResp } = useQuery({ queryKey: agencyKeys.billingInvoices(), queryFn: api.agency.getBillingInvoices });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Billing" subtitle="Your agency's own subscription with StayOS." />
        <LoadingBlock rows={4} />
      </div>
    );
  }

  if (!billing) {
    return (
      <div>
        <PageHeader title="Billing" subtitle="Your agency's own subscription with StayOS." />
        <EmptyBlock icon={Icons.CreditCard} title="No billing information yet" />
      </div>
    );
  }

  const invoices = invoicesResp?.invoices;

  return (
    <div>
      <PageHeader title="Billing" subtitle="Your agency's own subscription with StayOS — distinct from the statements you issue to property owners." />

      <div data-grid-2col>
        <Panel title="Current plan">
          <div data-kv-grid>
            <div data-readonly-field>
              <span data-readonly-label>Plan</span>
              <span data-readonly-value>{titleCase(billing.planType)}</span>
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Status</span>
              <span data-status-badge data-status={billing.status}>{billing.status.replace('_', ' ')}</span>
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Billing cycle</span>
              <span data-readonly-value>{titleCase(billing.billingCycle)}</span>
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Next billing date</span>
              <span data-readonly-value>{billing.nextBillingDate ? formatDate(billing.nextBillingDate) : '—'}</span>
            </div>
          </div>
        </Panel>

        <Panel title="This period">
          <div data-kv-grid>
            <div data-readonly-field>
              <span data-readonly-label>Base seat fee</span>
              <span data-readonly-value data-tabular-nums>{formatZAR(billing.baseSeatFee)}</span>
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Managed properties</span>
              <span data-readonly-value data-tabular-nums>
                {formatNumber(billing.managedPropertyCount)} × {formatZAR(billing.perPropertyFee)}
              </span>
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Staff seats</span>
              <span data-readonly-value data-tabular-nums>
                {formatNumber(billing.totalActiveStaff)} active ({billing.includedStaffSeats} included)
              </span>
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Additional staff fee</span>
              <span data-readonly-value data-tabular-nums>
                {formatNumber(billing.additionalStaffCount)} × {formatZAR(billing.additionalStaffFee)}
              </span>
            </div>
          </div>
        </Panel>
      </div>

      {billing.failedPaymentCount > 0 ? (
        <Panel title="Payment issue">
          <p style={{ fontSize: 13.5, color: 'var(--color-danger)' }}>
            {billing.failedPaymentCount} failed payment{billing.failedPaymentCount > 1 ? 's' : ''} on this account. Update your payment method to avoid suspension.
          </p>
        </Panel>
      ) : null}

      <Panel title="Invoices">
        {Array.isArray(invoices) && invoices.length > 0 ? (
          <div data-data-table>
            <table>
              <thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={i}>
                    <td>{formatDate(inv['date'] as string)}</td>
                    <td data-tabular-nums>{formatZAR(inv['amount'] as number)}</td>
                    <td>{String(inv['status'] ?? '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyBlock
            icon={Icons.Receipt}
            title="Invoice history isn't available yet"
            description={billing.lastPaymentAt ? `Last payment: ${formatZAR(billing.lastPaymentAmount ?? 0)} on ${formatDate(billing.lastPaymentAt)}.` : undefined}
          />
        )}
      </Panel>
    </div>
  );
}
