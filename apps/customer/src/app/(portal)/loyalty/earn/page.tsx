'use client';
import Link from 'next/link';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, Icons } from '@stayos/ui';
import { loyaltyKeys } from '@/lib/query-keys';

export default function LoyaltyEarnPage(): React.ReactElement {
  const session = useSession();
  const { data: programme, isLoading } = useQuery({
    queryKey: loyaltyKeys.programme(),
    queryFn:  () => api.customer.getLoyaltyProgramme(),
    enabled:  !!session,
  });

  if (isLoading) return <div data-page><SkeletonLoader rows={4} /></div>;

  const prog         = programme as Record<string, unknown> | undefined;
  const pointsAbbrev = (prog?.['pointsAbbrev'] as string) ?? 'QP';

  const ways = [
    {
      icon: Icons.Bed, label: 'Stay with us',
      detail: `${(prog?.['pointsPerRandStay'] as number) ?? 0} ${pointsAbbrev} per R${(prog?.['pointsPerRandDivisor'] as number) ?? 100} spent`,
      description: 'Points are credited automatically once your stay is complete — no need to do anything extra.',
    },
    {
      icon: Icons.Star, label: 'Write a review',
      detail: `${(prog?.['reviewBonusPoints'] as number) ?? 0} ${pointsAbbrev} per review`,
      description: 'Share your experience after a stay and earn bonus points for every review you write.',
    },
    {
      icon: Icons.Users, label: 'Refer a friend',
      detail: `${(prog?.['referralBonusPoints'] as number) ?? 0} ${pointsAbbrev} per referral`,
      description: 'Invite friends to StayOS — you both earn points once they complete their first stay.',
    },
    {
      icon: Icons.CheckCircle2, label: 'Complete your profile',
      detail: `${(prog?.['profileCompletionPoints'] as number) ?? 0} ${pointsAbbrev} once off`,
      description: 'Fill in your profile details for a one-time bonus — the fastest points on the board.',
    },
  ];

  return (
    <div data-page>
      <Link href="/loyalty" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: 'var(--space-4)', textDecoration: 'none' }}>
        <Icons.ChevronLeft size={16} /> Back to loyalty
      </Link>
      <h1 data-page-title>Ways to earn</h1>
      <p data-page-subtitle>Every way you can grow your {(prog?.['pointsLabel'] as string) ?? 'Q Points'} balance</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
        {ways.map((w) => (
          <div key={w.label} data-card-padded style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <span style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-pill)', background: 'var(--color-primary-tint)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <w.icon size={22} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14.5px', marginBottom: '2px' }}>{w.label}</div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-primary)', marginBottom: '4px' }}>{w.detail}</div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>{w.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
