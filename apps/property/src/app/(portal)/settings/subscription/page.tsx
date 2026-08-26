'use client';

import Link from 'next/link';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, ReadOnlyField, RoleGate, useToast, ConfirmDialog, Icons } from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
}

export default function SubscriptionPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['settings', 'subscription'],
    queryFn: () => api.tenants.getSubscription(),
    staleTime: 120_000,
  });

  const cancelMutation = useMutation({
    // cancelSubscription not yet in api-client — redirect to contact until added
    mutationFn: (): Promise<void> => {
      window.location.href = 'https://stayos.co.za/contact?subject=cancel-subscription';
      return Promise.resolve();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'subscription'] });
      setConfirmCancel(false);
      toast('Subscription cancellation requested.', 'success');
    },
    onError: (err: ApiError) => {
      setConfirmCancel(false);
      toast(err.message ?? 'Failed.', 'error');
    },
  });

  if (isLoading) return <SkeletonLoader rows={4} />;

  const sub = subscription as unknown as Record<string, unknown> ?? {};
  const planName    = String(sub['planName'] ?? '—');
  const tier        = String(sub['tier'] ?? '—');
  const price       = sub['monthlyPrice'] != null ? fmtCurrency(Number(sub['monthlyPrice'])) : '—';
  const status      = String(sub['status'] ?? '—');
  const renewalDate = sub['renewalDate']
    ? new Date(String(sub['renewalDate'])).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  const features = Array.isArray(sub['features']) ? (sub['features'] as string[]) : [];

  return (
    <div data-page="subscription">
      <div data-page-header>
        <div>
          <Link href="/settings/property" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Settings</Link>
          <h1>Subscription</h1>
        </div>
      </div>

      <section data-detail-section>
        <h2>Current plan</h2>
        <div data-field-list>
          <ReadOnlyField label="Plan" value={planName} />
          <ReadOnlyField label="Tier" value={tier} />
          <ReadOnlyField label="Monthly fee" value={`${price} / month (excl. VAT)`} />
          <ReadOnlyField label="Status" value={status} />
          <ReadOnlyField label="Next renewal" value={renewalDate} />
        </div>

        {features.length > 0 && (
          <div data-feature-list-section>
            <h3>Included features</h3>
            <ul data-feature-list>
              {features.map((f) => (
                <li key={f}><Icons.Check data-check aria-hidden="true" /> {f.replace(/_/g, ' ')}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <RoleGate perm={PERMISSIONS.PROPERTY_MANAGE}>
        <div data-subscription-actions>
          <a href="https://stayos.co.za/pricing" target="_blank" rel="noopener noreferrer" data-btn-primary>
            Upgrade plan
          </a>
          <button type="button" data-btn-ghost data-destructive onClick={() => setConfirmCancel(true)}>
            Cancel subscription
          </button>
        </div>
      </RoleGate>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel subscription?"
        message="Your property will remain active until the current billing period ends. After that, access will be restricted to the free tier."
        confirmLabel="Request cancellation"
        cancelLabel="Keep subscription"
        destructive
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
