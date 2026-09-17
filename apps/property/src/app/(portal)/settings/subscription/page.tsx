'use client';

import Link from 'next/link';

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError, TenantAddonSubscription } from '@stayos/api-client';
import { SkeletonLoader, ReadOnlyField, RoleGate, useToast, ConfirmDialog, Modal, Icons } from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import type { AddonKeyConstant } from '@stayos/constants';
import { useSessionRefresh } from '@stayos/auth';

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
}

// Local to this page — same convention as apps/admin's own addon labels
// (each app keeps its own display copy rather than sharing one).
const ADDON_LABELS: Record<AddonKeyConstant, string> = {
  university_module: 'Student Accommodation Module',
  restaurant_module: 'Restaurant / POS Module',
  ai_pricing: 'AI Pricing',
  white_label: 'White Label',
  extra_storage: 'Extra Storage',
};

export default function SubscriptionPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const refreshSession = useSessionRefresh();
  const [confirmCancelSub, setConfirmCancelSub] = useState(false);
  const [cancellingAddon, setCancellingAddon] = useState<TenantAddonSubscription | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);

  // The whole reason this page exists is to show current entitlements —
  // if a platform admin granted an add-on while this person was already
  // logged in, session.features (and this page, since it queries the same
  // underlying resolver) would otherwise stay stale until a full re-login.
  useEffect(() => {
    void refreshSession();
  }, []);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['settings', 'subscription'],
    queryFn: () => api.tenants.getSubscription(),
    staleTime: 30_000,
  });

  const { data: addons, isLoading: addonsLoading } = useQuery({
    queryKey: ['settings', 'subscription', 'addons'],
    queryFn: () => api.tenants.listMyAddons(),
  });

  const { data: availablePlans } = useQuery({
    queryKey: ['settings', 'subscription', 'available-plans'],
    queryFn: () => api.tenants.listAvailablePlans(),
    enabled: showUpgrade,
  });

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['settings', 'subscription'] });
  };

  const upgradeMutation = useMutation({
    mutationFn: (planId: string) => api.tenants.upgradeSubscription(planId),
    onSuccess: () => {
      invalidateAll();
      void refreshSession();
      setShowUpgrade(false);
      toast('Plan upgraded.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Could not upgrade plan.', 'error'),
  });

  const cancelSubMutation = useMutation({
    mutationFn: (reason: string) => api.tenants.cancelSubscription(reason),
    onSuccess: () => {
      invalidateAll();
      setConfirmCancelSub(false);
      toast('Subscription cancellation scheduled.', 'success');
    },
    onError: (err: ApiError) => {
      setConfirmCancelSub(false);
      toast(err.message ?? 'Could not cancel subscription.', 'error');
    },
  });

  const cancelAddonMutation = useMutation({
    mutationFn: () => api.tenants.cancelMyAddon(cancellingAddon!._id, cancelReason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'subscription', 'addons'] });
      void refreshSession();
      setCancellingAddon(null);
      setCancelReason('');
      toast('Add-on cancelled.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Could not cancel add-on.', 'error'),
  });

  if (isLoading) return <SkeletonLoader rows={4} />;

  const sub = (subscription as unknown as Record<string, unknown>) ?? {};
  const planId = sub['planId'] as Record<string, unknown> | undefined;
  const planName = String(planId?.['name'] ?? sub['planName'] ?? '—');
  const tier = String(planId?.['tier'] ?? sub['tier'] ?? '—');
  const priceValue = (planId?.['monthlyPrice'] ?? sub['monthlyPrice']) as number | undefined;
  const price = priceValue != null ? fmtCurrency(Number(priceValue)) : '—';
  const status = String(sub['status'] ?? '—');
  const renewalDate = sub['currentPeriodEnd'] ?? sub['renewalDate'];
  const renewalDisplay = renewalDate
    ? new Date(String(renewalDate)).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

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
          <ReadOnlyField label="Next renewal" value={renewalDisplay} />
        </div>
      </section>

      <section data-detail-section>
        <h2>Modules &amp; Add-ons</h2>
        <p data-field-hint>Paid features beyond your base plan — student accommodation, restaurant/POS, and the rest.</p>
        {addonsLoading ? (
          <SkeletonLoader rows={2} />
        ) : !addons || addons.length === 0 ? (
          <p data-field-hint>No add-ons active. Contact your account manager to add one.</p>
        ) : (
          <table data-table>
            <thead><tr><th>Module</th><th>Price</th><th>Billing</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {addons.map((addon) => (
                <tr key={addon._id}>
                  <td>{ADDON_LABELS[addon.addonKey] ?? addon.addonKey}</td>
                  <td>{fmtCurrency(addon.monthlyPrice)}/mo</td>
                  <td style={{ textTransform: 'capitalize' }}>{addon.billingCycle}</td>
                  <td><span data-status-badge data-status={addon.status}>{addon.status}</span></td>
                  <td>
                    {addon.status === 'active' && (
                      <RoleGate perm={PERMISSIONS.BILLING_MANAGE}>
                        <button
                          type="button"
                          data-btn-ghost
                          data-btn-sm
                          onClick={() => { setCancelReason(''); setCancellingAddon(addon); }}
                        >
                          Cancel
                        </button>
                      </RoleGate>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <RoleGate perm={PERMISSIONS.BILLING_MANAGE}>
        <div data-subscription-actions>
          <button type="button" data-btn-primary onClick={() => setShowUpgrade(true)}>
            Upgrade plan
          </button>
          <button type="button" data-btn-ghost data-destructive onClick={() => setConfirmCancelSub(true)}>
            Cancel subscription
          </button>
        </div>
      </RoleGate>

      <Modal open={showUpgrade} onClose={() => setShowUpgrade(false)} title="Upgrade plan">
        {!availablePlans ? (
          <SkeletonLoader rows={3} />
        ) : (
          <div data-form>
            {availablePlans.map((p) => {
              const id = String(p['_id']);
              const name = String(p['name']);
              const planTier = String(p['tier'] ?? '');
              const monthly = p['monthlyPrice'] as number | undefined;
              return (
                <div key={id} data-panel data-panel-padded style={{ marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{name}</strong>
                    <p data-field-hint style={{ margin: 0 }}>{planTier} · {monthly != null ? `${fmtCurrency(monthly)}/mo` : '—'}</p>
                  </div>
                  <button type="button" data-btn-secondary disabled={upgradeMutation.isPending} onClick={() => upgradeMutation.mutate(id)}>
                    {upgradeMutation.isPending ? 'Switching…' : 'Switch to this plan'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      <Modal open={!!cancellingAddon} onClose={() => setCancellingAddon(null)} title={`Cancel ${cancellingAddon ? ADDON_LABELS[cancellingAddon.addonKey] : 'add-on'}`}>
        <div data-form>
          <div data-form-group>
            <label>Reason</label>
            <textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
          <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-6)' }}>
            <button type="button" data-btn-secondary onClick={() => setCancellingAddon(null)}>Back</button>
            <button
              type="button"
              data-btn-primary
              disabled={!cancelReason || cancelAddonMutation.isPending}
              onClick={() => cancelAddonMutation.mutate()}
            >
              {cancelAddonMutation.isPending ? 'Cancelling…' : 'Cancel Add-on'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmCancelSub}
        title="Cancel subscription?"
        message="Your property will remain active until the current billing period ends. After that, access will be restricted to the free tier."
        confirmLabel="Request cancellation"
        cancelLabel="Keep subscription"
        destructive
        onConfirm={() => cancelSubMutation.mutate('Requested by property owner from subscription settings')}
        onCancel={() => setConfirmCancelSub(false)}
      />
    </div>
  );
}
