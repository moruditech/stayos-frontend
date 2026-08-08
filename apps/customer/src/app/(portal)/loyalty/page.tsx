'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, Icons } from '@stayos/ui';
import { loyaltyKeys } from '@/lib/query-keys';

const TIERS = [
  { id: 'silver',   label: 'Silver',   range: '0 – 3,999 QP',     color: '#9CA3AF', icon: Icons.Medal },
  { id: 'gold',     label: 'Gold',     range: '4,000 – 9,999 QP', color: '#F59E0B', icon: Icons.Award },
  { id: 'platinum', label: 'Platinum', range: '10,000+ QP',       color: '#8B5CF6', icon: Icons.Gem },
];

const EARN_WAYS = [
  { icon: Icons.Bed,         label: 'Stay',             detail: '10 QP',  sub: 'Per R100 spent' },
  { icon: Icons.Star,        label: 'Write review',     detail: '50 QP',  sub: 'Per review' },
  { icon: Icons.Users,       label: 'Refer a friend',   detail: '200 QP', sub: 'Per referral' },
  { icon: Icons.CheckCircle2,label: 'Complete profile', detail: '50 QP',  sub: 'Once off' },
];

export default function LoyaltyPage(): React.ReactElement {
  const session = useSession();

  const { data: loyalty, isLoading } = useQuery({
    queryKey: loyaltyKeys.balance(),
    queryFn:  () => api.customer.getLoyalty(),
    enabled:  !!session,
  });

  const { data: history } = useQuery({
    queryKey: loyaltyKeys.history(),
    queryFn:  () => api.customer.getLoyaltyHistory(),
    enabled:  !!session,
  });

  if (isLoading) return <div data-page><SkeletonLoader rows={5} /></div>;

  const lo          = loyalty as Record<string, unknown> | undefined;
  const points      = (lo?.['points'] as number) ?? 0;
  const tier        = (lo?.['tier'] as string)   ?? 'Silver';
  const toNext      = (lo?.['pointsToNextTier'] as number) ?? 0;
  const progress    = Math.min((lo?.['tierProgress'] as number) ?? 0, 100);
  const hist        = (history as Record<string, unknown>[] | undefined) ?? [];

  const currentTier = TIERS.find((t) => t.id === tier.toLowerCase()) ?? TIERS[0]!;

  return (
    <div data-page>
      <h1 data-page-title>Loyalty</h1>
      <p data-page-subtitle>Earn Q Points and unlock amazing rewards</p>

      {/* Points hero card */}
      <div data-loyalty-hero>
        <div style={{ flex: 1 }}>
          <div data-loyalty-label>Q Points balance</div>
          <div data-loyalty-balance>
            {points.toLocaleString()}
            <Icons.Star size={22} style={{ marginLeft: 'var(--space-2)', color: 'var(--color-warning)' }} />
          </div>
          <div data-loyalty-tier>
            {currentTier.label} Member
            {toNext > 0 && ` · ${toNext.toLocaleString()} points to ${TIERS[TIERS.indexOf(currentTier) + 1]?.label ?? 'top tier'}`}
          </div>
          <div data-loyalty-progress-bar>
            <div data-loyalty-progress-fill style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div data-loyalty-badge>
          <div data-loyalty-badge-icon aria-hidden="true"><currentTier.icon size={26} /></div>
          <div data-loyalty-badge-tier>{currentTier.label} Member</div>
          <button type="button" data-loyalty-badge-btn>View benefits</button>
        </div>
      </div>

      {/* Earn ways */}
      <div data-card-padded style={{ marginBottom: 'var(--space-5)' }}>
        <div data-section-header style={{ marginBottom: 'var(--space-4)' }}>
          <span data-section-title>Earn Q Points</span>
          <a href="/loyalty/earn" data-section-link>View all ways to earn →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>
          {EARN_WAYS.map((w) => (
            <div key={w.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
              <span style={{ width: '40px', height: '40px', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-primary)' }}><w.icon size={20} /></span>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{w.label}</div>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', color: 'var(--color-primary)' }}>{w.detail}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{w.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Redeem section */}
      <div data-section-header>
        <span data-section-title>Redeem your points</span>
        <a href="/loyalty/rewards" data-section-link>View all rewards →</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'R100 off your stay', cost: '1,000 QP', popular: true,  image: 'reward-discount' },
          { label: 'Free breakfast',     cost: '1,500 QP', popular: false, image: 'reward-breakfast' },
          { label: 'Room upgrade',       cost: '2,500 QP', popular: false, image: 'reward-upgrade' },
          { label: 'Late checkout',      cost: '500 QP',   popular: false, image: 'reward-checkout' },
        ].map((r) => (
          <div key={r.label} data-card style={{ overflow: 'hidden', cursor: 'pointer' }}>
            <div style={{ aspectRatio: '4/3', background: 'var(--color-surface-muted)', position: 'relative', overflow: 'hidden' }}>
              {/* Image path: /images/loyalty/[reward-image].jpg */}
              <img src={`/images/loyalty/${r.image}.jpg`} alt={r.label} loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              {r.popular && (
                <span style={{ position: 'absolute', top: 'var(--space-2)', left: 'var(--space-2)', background: 'var(--color-primary)', color: 'white', fontSize: '10px', fontWeight: 'var(--font-bold)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>Popular</span>
              )}
            </div>
            <div style={{ padding: 'var(--space-3)' }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-1)' }}>{r.label}</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--color-primary)' }}>{r.cost}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity */}
      <div data-section-header>
        <span data-section-title>Your activity</span>
        <a href="/loyalty/history" data-section-link>View all activity →</a>
      </div>
      <div data-card-padded style={{ padding: '0 var(--space-6)', marginBottom: 'var(--space-6)' }}>
        {hist.length === 0 ? (
          <p style={{ padding: 'var(--space-5) 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>No activity yet.</p>
        ) : hist.slice(0, 4).map((h) => (
          <div key={h['_id'] as string} data-transaction-item>
            <span data-transaction-icon style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
              {(h['type'] as string) === 'earned' ? <Icons.Bed size={16} /> : <Icons.Gift size={16} />}
            </span>
            <div data-transaction-info>
              <div data-transaction-name>{(h['description'] as string) ?? '—'}</div>
              <div data-transaction-meta>
                {(h['reference'] as string) ?? ''} · {new Date(h['createdAt'] as string).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <div data-transaction-amount>
              <div data-transaction-amount-value data-positive="">
                +{(h['points'] as number ?? 0).toLocaleString()} QP
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Referral callout */}
      <div data-support-callout style={{ background: 'var(--color-primary-light)', borderColor: 'var(--color-primary)', marginBottom: 'var(--space-6)' }}>
        <div data-support-callout-text>
          <span style={{ color: 'var(--color-primary)' }}><Icons.Gift size={32} /></span>
          <div>
            <strong>Invite friends &amp; earn more</strong>
            <p>You both get 200 Q Points when they complete their first stay.</p>
          </div>
        </div>
        <button type="button" data-btn-secondary style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          Invite friends <Icons.Share2 size={16} />
        </button>
      </div>

      {/* Tier overview */}
      <div data-section-header>
        <span data-section-title>Member tiers</span>
        <a href="/loyalty/tiers" data-section-link>View all tiers →</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
        {TIERS.map((t) => {
          const isCurrent = t.id === tier.toLowerCase();
          return (
            <div key={t.id} data-card-padded style={{ textAlign: 'center', borderColor: isCurrent ? 'var(--color-primary)' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'center', color: t.color, marginBottom: 'var(--space-2)' }}><t.icon size={26} /></div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)' }}>{t.label}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 'var(--space-1) 0' }}>{t.range}</div>
              {isCurrent ? (
                <span data-status-badge data-status="confirmed" style={{ fontSize: '10px' }}>Current</span>
              ) : toNext > 0 && t.id !== 'silver' ? (
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{toNext.toLocaleString()} QP to go</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
