'use client';
import Link from 'next/link';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, ConfirmDialog, useToast, Icons } from '@stayos/ui';
import { loyaltyKeys } from '@/lib/query-keys';

export default function LoyaltyRewardsPage(): React.ReactElement {
  const session   = useSession();
  const qc        = useQueryClient();
  const { toast } = useToast();
  const [confirmReward, setConfirmReward] = useState<Record<string, unknown> | null>(null);

  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: loyaltyKeys.platformAccount(),
    queryFn:  () => api.customer.getPlatformLoyaltyAccount(),
    enabled:  !!session,
  });
  const { data: programme } = useQuery({
    queryKey: loyaltyKeys.programme(),
    queryFn:  () => api.customer.getLoyaltyProgramme(),
    enabled:  !!session,
  });
  const { data: rewards, isLoading: loadingRewards } = useQuery({
    queryKey: loyaltyKeys.rewards(),
    queryFn:  () => api.customer.getLoyaltyRewards(),
    enabled:  !!session,
  });
  const { data: redemptions } = useQuery({
    queryKey: loyaltyKeys.redemptions(),
    queryFn:  () => api.customer.getLoyaltyRedemptions(),
    enabled:  !!session,
  });

  const redeemMutation = useMutation({
    mutationFn: (rewardId: string) => api.customer.redeemLoyaltyReward(rewardId),
    onSuccess: (result) => {
      const redemption = (result as Record<string, unknown>)['redemption'] as Record<string, unknown> | undefined;
      toast(`Redeemed! Your code: ${redemption?.['code'] as string ?? ''}`, 'success');
      qc.invalidateQueries({ queryKey: loyaltyKeys.platformAccount() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.redemptions() });
      setConfirmReward(null);
    },
    onError: (err: ApiError) => {
      toast(err.message ?? 'Could not redeem this reward.', 'error');
      setConfirmReward(null);
    },
  });

  const acc          = account as Record<string, unknown> | undefined;
  const points       = (acc?.['pointsBalance'] as number) ?? 0;
  const termsAccepted = Boolean(acc?.['termsAccepted']);
  const pointsAbbrev = ((programme as Record<string, unknown> | undefined)?.['pointsAbbrev'] as string) ?? 'QP';
  const rewardList   = (rewards as Record<string, unknown>[] | undefined) ?? [];
  const activeVouchers = ((redemptions as Record<string, unknown>[] | undefined) ?? []).filter((r) => r['status'] === 'active');

  const handleRedeemClick = (reward: Record<string, unknown>) => {
    if (!termsAccepted) { toast('Please review and accept the programme terms first.', 'info'); return; }
    setConfirmReward(reward);
  };

  return (
    <div data-page>
      <Link href="/loyalty" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: 'var(--space-4)', textDecoration: 'none' }}>
        <Icons.ChevronLeft size={16} /> Back to loyalty
      </Link>
      <h1 data-page-title>Rewards</h1>
      <p data-page-subtitle>You have {points.toLocaleString()} {pointsAbbrev} to spend</p>

      {activeVouchers.length > 0 && (
        <div data-card-padded style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          <h3 style={{ fontWeight: 700, fontSize: '14px', marginBottom: 'var(--space-3)' }}>Your active vouchers</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {activeVouchers.map((v) => (
              <div key={v['_id'] as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', background: 'var(--color-bg-sunk)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{v['rewardName'] as string}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    Expires {new Date(v['expiresAt'] as string).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <code style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-surface)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
                  {v['code'] as string}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}

      {loadingAccount || loadingRewards ? (
        <SkeletonLoader rows={4} />
      ) : rewardList.length === 0 ? (
        <EmptyState title="No rewards yet" description="Check back soon — new rewards are added regularly." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>
          {rewardList.map((r) => {
            const cost       = r['pointsCost'] as number;
            const affordable = points >= cost;
            const discountText = r['discountType'] === 'percent'
              ? `${r['discountValue']}% off`
              : `R${r['discountValue']} off`;
            return (
              <div key={r['_id'] as string} data-card style={{ overflow: 'hidden', opacity: affordable ? 1 : 0.65 }}>
                <div style={{ aspectRatio: '4/3', background: 'var(--color-primary-tint)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icons.Gift size={32} style={{ color: 'var(--color-primary)' }} />
                  {r['isPopular'] === true && (
                    <span style={{ position: 'absolute', top: 'var(--space-2)', left: 'var(--space-2)', background: 'var(--color-primary)', color: 'white', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>Popular</span>
                  )}
                </div>
                <div style={{ padding: 'var(--space-3)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{r['name'] as string}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', margin: '2px 0 var(--space-2)' }}>{discountText}{r['description'] ? ` — ${r['description']}` : ''}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>{cost.toLocaleString()} {pointsAbbrev}</span>
                    <button type="button" data-btn-secondary style={{ padding: 'var(--space-1) var(--space-3)', fontSize: '12px' }}
                      disabled={!affordable} onClick={() => handleRedeemClick(r)}>
                      {affordable ? 'Redeem' : 'Not enough'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmReward !== null}
        title={`Redeem "${confirmReward?.['name'] as string ?? ''}"?`}
        message={`This will use ${(confirmReward?.['pointsCost'] as number ?? 0).toLocaleString()} ${pointsAbbrev} from your balance. You'll get a code to apply at checkout on your next booking.`}
        confirmLabel={redeemMutation.isPending ? 'Redeeming…' : 'Redeem'}
        cancelLabel="Cancel"
        onConfirm={() => confirmReward && redeemMutation.mutate(confirmReward['_id'] as string)}
        onCancel={() => setConfirmReward(null)}
      />
    </div>
  );
}
