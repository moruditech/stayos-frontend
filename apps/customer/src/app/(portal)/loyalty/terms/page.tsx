'use client';
import Link from 'next/link';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, useToast, Icons } from '@stayos/ui';
import { loyaltyKeys } from '@/lib/query-keys';

export default function LoyaltyTermsPage(): React.ReactElement {
  const session   = useSession();
  const router    = useRouter();
  const qc        = useQueryClient();
  const { toast } = useToast();

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

  const acceptMutation = useMutation({
    mutationFn: () => api.customer.acceptLoyaltyTerms(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: loyaltyKeys.platformAccount() });
      toast('You\u2019re in! Welcome to the programme.', 'success');
      router.push('/loyalty');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Could not save your acceptance. Please try again.', 'error'),
  });

  const acc  = account   as Record<string, unknown> | undefined;
  const prog = programme as Record<string, unknown> | undefined;
  const alreadyAccepted = Boolean(acc?.['termsAccepted']) && acc?.['termsAcceptedVersion'] === prog?.['termsVersion'];
  const programmeName = (prog?.['programmeName'] as string) ?? 'StayOS Rewards';
  const terms = (prog?.['termsAndConditions'] as string) ?? '';

  return (
    <div data-page>
      <Link href="/loyalty" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: 'var(--space-4)', textDecoration: 'none' }}>
        <Icons.ChevronLeft size={16} /> Back to loyalty
      </Link>
      <h1 data-page-title>{programmeName} — Terms &amp; Conditions</h1>
      <p data-page-subtitle>Please review before joining the programme</p>

      {loadingAccount || loadingProgramme ? (
        <SkeletonLoader rows={6} />
      ) : (
        <>
          <div data-card-padded style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {terms}
            </div>
          </div>

          {alreadyAccepted ? (
            <div data-support-callout style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-success)' }}>
              <div data-support-callout-text>
                <span style={{ color: 'var(--color-success)' }}><Icons.CheckCircle2 size={24} /></span>
                <div>
                  <strong>You&apos;re already in the programme</strong>
                  <p>You accepted these terms already — no action needed.</p>
                </div>
              </div>
              <Link href="/loyalty" data-btn-secondary>Back to loyalty</Link>
            </div>
          ) : (
            <button type="button" data-btn-primary data-btn-full
              disabled={acceptMutation.isPending}
              onClick={() => acceptMutation.mutate()}>
              {acceptMutation.isPending ? 'Joining…' : 'I agree — join the programme'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
