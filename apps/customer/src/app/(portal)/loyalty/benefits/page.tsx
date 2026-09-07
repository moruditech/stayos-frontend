'use client';
import Link from 'next/link';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, Icons } from '@stayos/ui';
import { loyaltyKeys } from '@/lib/query-keys';

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'] as const;
const TIER_META: Record<string, { label: string; color: string; icon: typeof Icons.Medal }> = {
  bronze:   { label: 'Bronze',   color: '#B08D57', icon: Icons.Medal },
  silver:   { label: 'Silver',   color: '#9CA3AF', icon: Icons.Medal },
  gold:     { label: 'Gold',     color: '#F59E0B', icon: Icons.Award },
  platinum: { label: 'Platinum', color: '#64748B', icon: Icons.Gem },
};

export default function LoyaltyBenefitsPage(): React.ReactElement {
  const session = useSession();
  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: loyaltyKeys.platformAccount(),
    queryFn:  () => api.customer.getPlatformLoyaltyAccount(),
    enabled:  !!session,
  });
  const { data: programme, isLoading: loadingProgramme } = useQuery({
    queryKey: loyaltyKeys.programme(),
    queryFn:  () => api.customer.getLoyaltyProgramme(),
    enabled:  !!session,
  });

  if (loadingAccount || loadingProgramme) return <div data-page><SkeletonLoader rows={4} /></div>;

  const acc        = account as Record<string, unknown> | undefined;
  const prog       = programme as Record<string, unknown> | undefined;
  const tier       = ((acc?.['tier'] as string) ?? 'bronze').toLowerCase();
  const thresholds = (prog?.['tierThresholds'] as Record<string, number>) ?? { silver: 1000, gold: 5000, platinum: 15000 };
  const benefits   = (prog?.['tierBenefits'] as Record<string, string[]>) ?? {};
  const tierMinFor = (t: string) => t === 'bronze' ? 0 : (thresholds[t] ?? 0);

  return (
    <div data-page>
      <Link href="/loyalty" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: 'var(--space-4)', textDecoration: 'none' }}>
        <Icons.ChevronLeft size={16} /> Back to loyalty
      </Link>
      <h1 data-page-title>Member benefits</h1>
      <p data-page-subtitle>What each tier unlocks — the more you stay, the more you get</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
        {TIER_ORDER.map((t) => {
          const isCurrent = t === tier;
          const meta = TIER_META[t]!;
          const min  = tierMinFor(t);
          const perks = benefits[t] ?? [];
          return (
            <div key={t} data-card-padded style={{ borderColor: isCurrent ? 'var(--color-primary)' : undefined, borderWidth: isCurrent ? 2 : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <span style={{ color: meta.color }}><meta.icon size={26} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{meta.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{min.toLocaleString()}+ lifetime points</div>
                </div>
                {isCurrent && <span data-status-badge data-status="confirmed" style={{ fontSize: '10px' }}>Your tier</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {perks.map((perk) => (
                  <div key={perk} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    <Icons.CheckCircle2 size={15} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 1 }} />
                    {perk}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
