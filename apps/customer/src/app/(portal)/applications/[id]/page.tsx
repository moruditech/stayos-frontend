'use client';
import Link from 'next/link';
import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, useToast, StatusBadge, Icons } from '@stayos/ui';
import { applicationKeys } from '@/lib/query-keys';

interface Props { params: { id: string } }

const STATUS_STEPS = ['submitted', 'under_review', 'docs_requested', 'approved'];

export default function ApplicationDetailPage({ params }: Props): React.ReactElement {
  const session = useSession();
  const router  = useRouter();
  const { toast } = useToast();

  const { data: application, isLoading } = useQuery({
    queryKey: applicationKeys.detail(params.id),
    queryFn:  () => api.customer.getApplication(params.id),
    enabled:  !!session,
  });

  // No withdrawal endpoint exists yet — the button below is disabled rather
  // than firing a fake mutation that would misleadingly report success.
  const withdrawMutation = useMutation({
    mutationFn: () => Promise.reject(new Error('Withdrawal is not yet available.')),
    onError: (err: ApiError) => toast(err.message ?? 'Withdrawal is not yet available.', 'error'),
  });

  if (isLoading) return <div data-page><SkeletonLoader rows={5} /></div>;
  const app = application as Record<string, unknown> | undefined;
  if (!app) return <div data-page><p>Application not found.</p></div>;

  const status    = app['status'] as string;
  const appliedAt = new Date(app['createdAt'] as string);
  const currentStep = STATUS_STEPS.indexOf(status);

  return (
    <div data-page>
      <button type="button" onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
        <Icons.ChevronLeft size={16} /> Back to applications
      </button>

      <h1 data-page-title>Application details</h1>

      {/* Property summary */}
      <div data-card>
        <div style={{ aspectRatio: '16/5', background: 'var(--color-bg-sunk)', overflow: 'hidden' }}>
          <img src={`/images/properties/${app['propertySlug'] as string}-banner.jpg`} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
        <div style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div>
              <h2 style={{ fontSize: '19px', fontWeight: '700' }}>{app['propertyName'] as string}</h2>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                Application ID: {app['applicationId'] as string ?? params.id}
              </div>
            </div>
            <StatusBadge status={status} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-4)' }}>
            {[
              { label: 'Applied on', value: appliedAt.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) },
              { label: 'Type', value: (app['type'] as string)?.replace(/_/g, ' ') ?? '—' },
              app['academicYear'] ? { label: 'Academic year', value: app['academicYear'] as string } : null,
              app['moveInDate'] ? { label: 'Move-in date', value: new Date(app['moveInDate'] as string).toLocaleDateString('en-ZA') } : null,
            ].filter(Boolean).map((item) => item && (
              <div key={item.label}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress tracker */}
      {currentStep >= 0 && (
        <div data-card-padded>
          <h3 style={{ fontSize: '14.5px', fontWeight: '700', marginBottom: 'var(--space-5)' }}>Application progress</h3>
          <div style={{ display: 'flex', gap: 0 }}>
            {STATUS_STEPS.map((step, i) => {
              const done    = i <= currentStep;
              const current = i === currentStep;
              return (
                <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', position: 'relative' }}>
                  {i < STATUS_STEPS.length - 1 && (
                    <div style={{ position: 'absolute', top: '14px', left: '50%', width: '100%', height: '2px', background: i < currentStep ? 'var(--color-primary)' : 'var(--color-border)', zIndex: 0 }} />
                  )}
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', zIndex: 1,
                    background: done ? 'var(--color-primary)' : 'var(--color-border)',
                    border: current ? '3px solid var(--color-primary)' : '3px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: done ? 'white' : 'transparent', fontSize: '12px',
                  }}>
                    {done ? <Icons.Check size={14} /> : ''}
                  </div>
                  <span style={{ fontSize: '10px', textAlign: 'center', color: done ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: done ? '600' : 'normal', textTransform: 'capitalize' }}>
                    {step.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Docs requested action */}
      {status === 'docs_requested' && (
        <div data-card-padded style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning)' }}>
          <strong style={{ color: 'var(--color-warning)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Icons.AlertTriangle size={16} /> Documents required
          </strong>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            The property has requested additional documents. Please upload them to continue.
          </p>
          <Link href={`/documents?ref=${params.id}`} data-btn-primary style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            Upload documents <Icons.ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* Answers summary */}
      {(app['answers'] as Record<string, unknown>) && (
        <div data-card-padded>
          <h3 style={{ fontSize: '14.5px', fontWeight: '700', marginBottom: 'var(--space-4)' }}>Your responses</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {Object.entries(app['answers'] as Record<string, unknown>).map(([key, val]) => (
              <div key={key}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: '13px' }}>{String(val)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
        <Link href={`/applications/${params.id}/chat`} data-btn-ghost style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
          <Icons.MessageCircle size={16} /> Contact property
        </Link>
        {(status === 'submitted' || status === 'under_review') && (
          <button type="button" data-btn-ghost style={{ flex: 1, color: 'var(--color-danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}
            disabled={withdrawMutation.isPending}
            onClick={() => withdrawMutation.mutate()}>
            Withdraw application
            <span data-badge-soon>Coming soon</span>
          </button>
        )}
      </div>

      <div data-support-callout style={{ marginTop: 'var(--space-5)' }}>
        <div data-support-callout-text>
          <span data-support-callout-icon><Icons.Headphones size={20} /></span>
          <div>
            <strong>Need help with your application?</strong>
            <p>Our support team is here to help you.</p>
          </div>
        </div>
        <Link href="/support" data-btn-secondary style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          Contact support <Icons.ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
