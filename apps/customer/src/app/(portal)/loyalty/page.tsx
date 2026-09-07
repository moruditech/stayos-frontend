'use client';
import Link from 'next/link';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, ConfirmDialog, useToast, Icons } from '@stayos/ui';
import { loyaltyKeys } from '@/lib/query-keys';

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'] as const;
const TIER_META: Record<string, { label: string; color: string; icon: typeof Icons.Medal }> = {
  bronze:   { label: 'Bronze',   color: '#B08D57', icon: Icons.Medal },
  silver:   { label: 'Silver',   color: '#9CA3AF', icon: Icons.Medal },
  gold:     { label: 'Gold',     color: '#F59E0B', icon: Icons.Award },
  platinum: { label: 'Platinum', color: '#64748B', icon: Icons.Gem },
};

export default function LoyaltyPage(): React.ReactElement {
  const session   = useSession();
  const qc        = useQueryClient();
  const { toast } = useToast();
  const [confirmReward, setConfirmReward] = useState<Record<string, unknown> | null>(null);

  const { data: account, isLoading } = useQuery({
    queryKey: loyaltyKeys.platformAccount(),
    queryFn:  () => api.customer.getPlatformLoyaltyAccount(),
    enabled:  !!session,
  });
  const { data: programme } = useQuery({
    queryKey: loyaltyKeys.programme(),
    queryFn:  () => api.customer.getLoyaltyProgramme(),
    enabled:  !!session,
  });
  const { data: rewards } = useQuery({
    queryKey: loyaltyKeys.rewards(),
    queryFn:  () => api.customer.getLoyaltyRewards(),
    enabled:  !!session,
  });
  const { data: history } = useQuery({
    queryKey: loyaltyKeys.history(),
    queryFn:  () => api.customer.getLoyaltyHistory(),
    enabled:  !!session,
  });

  const redeemMutation = useMutation({
    mutationFn: (rewardId: string) => api.customer.redeemLoyaltyReward(rewardId),
    onSuccess: (result) => {
      const redemption = (result as Record<string, unknown>)['redemption'] as Record<string, unknown> | undefined;
      toast(`Redeemed! Your code: ${redemption?.['code'] as string ?? ''}`, 'success');
      qc.invalidateQueries({ queryKey: loyaltyKeys.platformAccount() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.history() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.redemptions() });
      setConfirmReward(null);
    },
    onError: (err: ApiError) => {
      toast(err.message ?? 'Could not redeem this reward.', 'error');
      setConfirmReward(null);
    },
  });

  if (isLoading) return <div data-page><SkeletonLoader rows={5} /></div>;

  const acc          = account as Record<string, unknown> | undefined;
  const prog         = programme as Record<string, unknown> | undefined;
  const points       = (acc?.['pointsBalance'] as number) ?? 0;
  const lifetime     = (acc?.['lifetimePoints'] as number) ?? 0;
  const tier         = ((acc?.['tier'] as string) ?? 'bronze').toLowerCase();
  const termsAccepted = Boolean(acc?.['termsAccepted']);

  const pointsLabel  = (prog?.['pointsLabel'] as string) ?? 'Q Points';
  const pointsAbbrev = (prog?.['pointsAbbrev'] as string) ?? 'QP';
  const thresholds   = (prog?.['tierThresholds'] as Record<string, number>) ?? { silver: 1000, gold: 5000, platinum: 15000 };
  const tierMinFor   = (t: string) => t === 'bronze' ? 0 : (thresholds[t] ?? 0);

  const currentIdx = Math.max(0, TIER_ORDER.indexOf(tier as typeof TIER_ORDER[number]));
  const nextTier   = TIER_ORDER[currentIdx + 1];
  const nextMin    = nextTier ? tierMinFor(nextTier) : null;
  const prevMin    = tierMinFor(tier);
  const progress   = nextMin ? Math.min(100, Math.round(((lifetime - prevMin) / (nextMin - prevMin)) * 100)) : 100;
  const currentMeta = TIER_META[tier] ?? TIER_META['bronze']!;

  const earnWays = [
    { icon: Icons.Bed,          label: 'Stay',             detail: `${(prog?.['pointsPerRandStay'] as number) ?? 0} ${pointsAbbrev}`, sub: `Per R${(prog?.['pointsPerRandDivisor'] as number) ?? 100} spent` },
    { icon: Icons.Star,         label: 'Write review',     detail: `${(prog?.['reviewBonusPoints'] as number) ?? 0} ${pointsAbbrev}`, sub: 'Per review' },
    { icon: Icons.Users,        label: 'Refer a friend',   detail: `${(prog?.['referralBonusPoints'] as number) ?? 0} ${pointsAbbrev}`, sub: 'Per referral' },
    { icon: Icons.CheckCircle2, label: 'Complete profile', detail: `${(prog?.['profileCompletionPoints'] as number) ?? 0} ${pointsAbbrev}`, sub: 'Once off' },
  ];

  const rewardList = ((rewards as Record<string, unknown>[] | undefined) ?? []);
  const hist       = (history as Record<string, unknown>[] | undefined) ?? [];

  const handleInvite = async () => {
    const shareData = {
      title: 'Join me on StayOS',
      text: `Join me on StayOS — we both earn ${(prog?.['referralBonusPoints'] as number) ?? 200} ${pointsAbbrev} once you complete your first stay!`,
    };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share(shareData); return; } catch { /* user cancelled — fine */ }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.text);
      toast('Invite message copied — paste it anywhere!', 'success');
    }
  };

  const handleRedeemClick = (reward: Record<string, unknown>) => {
    if (!termsAccepted) { toast('Please review and accept the programme terms first.', 'info'); return; }
    if (points < (reward['pointsCost'] as number)) { toast('You don\u2019t have enough points for this reward yet.', 'info'); return; }
    setConfirmReward(reward);
  };

  return (
    <div data-page>
      <h1 data-page-title>Loyalty</h1>
      <p data-page-subtitle>Earn {pointsLabel} and unlock amazing rewards</p>

      {!termsAccepted && (
        <div data-support-callout style={{ marginBottom: 'var(--space-5)', background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning)' }}>
          <div data-support-callout-text>
            <span style={{ color: 'var(--color-warning)' }}><Icons.FileText size={24} /></span>
            <div>
              <strong>Join the rewards programme</strong>
              <p>Review the terms and opt in to start redeeming points for rewards.</p>
            </div>
          </div>
          <Link href="/loyalty/terms" data-btn-secondary>Review &amp; join</Link>
        </div>
      )}

      {/* Points hero card */}
      <div data-loyalty-hero>
        <div style={{ flex: 1 }}>
          <div data-loyalty-label>{pointsLabel} balance</div>
          <div data-loyalty-balance>
            {points.toLocaleString()}
            <Icons.Star size={22} style={{ marginLeft: 'var(--space-2)', color: 'var(--color-warning)' }} />
          </div>
          <div data-loyalty-tier>
            {currentMeta.label} Member
            {nextTier && ` · ${(nextMin! - lifetime).toLocaleString()} points to ${TIER_META[nextTier]?.label}`}
          </div>
          <div data-loyalty-progress-bar>
            <div data-loyalty-progress-fill style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div data-loyalty-badge>
          <div data-loyalty-badge-icon aria-hidden="true"><currentMeta.icon size={26} /></div>
          <div data-loyalty-badge-tier>{currentMeta.label} Member</div>
          <Link href="/loyalty/benefits" data-loyalty-badge-btn>View benefits</Link>
        </div>
      </div>

      {/* Earn ways */}
      <div data-card-padded style={{ marginBottom: 'var(--space-5)' }}>
        <div data-section-header style={{ marginBottom: 'var(--space-4)' }}>
          <span data-section-title>Earn {pointsLabel}</span>
          <Link href="/loyalty/earn" data-section-link>View all ways to earn →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>
          {earnWays.map((w) => (
            <div key={w.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
              <span style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}><w.icon size={20} /></span>
              <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--color-text)' }}>{w.label}</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-primary)' }}>{w.detail}</div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{w.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Redeem section */}
      <div data-section-header>
        <span data-section-title>Redeem your points</span>
        <Link href="/loyalty/rewards" data-section-link>View all rewards →</Link>
      </div>
      {rewardList.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>No rewards available yet — check back soon.</p>
      ) : (
        <div data-horizontal-scroll style={{ marginBottom: 'var(--space-6)' }}>
          {rewardList.slice(0, 6).map((r) => {
            const id = r['_id'] as string;
            const affordable = points >= (r['pointsCost'] as number);
            return (
              <div key={id} data-card data-horizontal-scroll-item
                style={{ overflow: 'hidden', cursor: affordable ? 'pointer' : 'default', opacity: affordable ? 1 : 0.6 }}
                onClick={() => handleRedeemClick(r)}>
                <div style={{ aspectRatio: '4/3', background: 'var(--color-primary-tint)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icons.Gift size={32} style={{ color: 'var(--color-primary)' }} />
                  {r['isPopular'] === true && (
                    <span style={{ position: 'absolute', top: 'var(--space-2)', left: 'var(--space-2)', background: 'var(--color-primary)', color: 'white', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>Popular</span>
                  )}
                </div>
                <div style={{ padding: 'var(--space-3)' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: 'var(--space-1)' }}>{r['name'] as string}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-primary)' }}>{(r['pointsCost'] as number).toLocaleString()} {pointsAbbrev}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity */}
      <div data-section-header>
        <span data-section-title>Your activity</span>
      </div>
      <div data-card-padded style={{ padding: '0 var(--space-6)', marginBottom: 'var(--space-6)' }}>
        {hist.length === 0 ? (
          <p style={{ padding: 'var(--space-5) 0', color: 'var(--color-text-secondary)', fontSize: '13px' }}>No activity yet.</p>
        ) : hist.slice(0, 6).map((h) => {
          const desc = ((h['description'] as string) ?? '').toLowerCase();
          const pts  = (h['points'] as number) ?? 0;
          let ActivityIcon = Icons.Gift;
          let tint = 'success';
          if (desc.includes('review')) { ActivityIcon = Icons.Star; tint = 'warning'; }
          else if (desc.includes('refer')) { ActivityIcon = Icons.Users; tint = 'sand'; }
          else if (desc.includes('stay') || desc.includes('booking')) { ActivityIcon = Icons.Bed; tint = 'success'; }
          const bg = tint === 'warning' ? 'var(--color-warning-bg)' : tint === 'sand' ? 'var(--color-bg-sunk)' : 'var(--color-primary-tint)';
          const fg = tint === 'warning' ? 'var(--color-warning)' : tint === 'sand' ? 'var(--color-text-secondary)' : 'var(--color-primary)';
          return (
          <div key={h['_id'] as string} data-transaction-item>
            <span data-transaction-icon style={{ background: bg, color: fg }}>
              <ActivityIcon size={16} />
            </span>
            <div data-transaction-info>
              <div data-transaction-name>{(h['description'] as string) ?? '—'}</div>
              <div data-transaction-meta>
                {new Date(h['createdAt'] as string).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <div data-transaction-amount>
              <div data-transaction-amount-value data-positive={pts >= 0 ? '' : undefined}>
                {pts >= 0 ? '+' : ''}{pts.toLocaleString()} {pointsAbbrev}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Referral callout */}
      <div data-support-callout style={{ background: 'var(--color-primary-tint)', borderColor: 'var(--color-primary)', marginBottom: 'var(--space-6)' }}>
        <div data-support-callout-text>
          <span style={{ color: 'var(--color-primary)' }}><Icons.Gift size={32} /></span>
          <div>
            <strong>Invite friends &amp; earn more</strong>
            <p>You both get {(prog?.['referralBonusPoints'] as number) ?? 200} {pointsAbbrev} when they complete their first stay.</p>
          </div>
        </div>
        <button type="button" data-btn-secondary style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }} onClick={() => void handleInvite()}>
          Invite friends <Icons.Share2 size={16} />
        </button>
      </div>

      {/* Tier overview */}
      <div data-section-header>
        <span data-section-title>Member tiers</span>
        <Link href="/loyalty/benefits" data-section-link>View all tiers →</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>
        {TIER_ORDER.map((t) => {
          const isCurrent = t === tier;
          const meta = TIER_META[t]!;
          const min  = tierMinFor(t);
          return (
            <div key={t} data-card-padded style={{ textAlign: 'center', borderColor: isCurrent ? 'var(--color-primary)' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'center', color: meta.color, marginBottom: 'var(--space-2)' }}><meta.icon size={26} /></div>
              <div style={{ fontSize: '13px', fontWeight: '700' }}>{meta.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 'var(--space-1) 0' }}>{min.toLocaleString()}+ {pointsAbbrev}</div>
              {isCurrent && <span data-status-badge data-status="confirmed" style={{ fontSize: '10px' }}>Current</span>}
            </div>
          );
        })}
      </div>

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
