'use client';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, useToast, StatusBadge } from '@stayos/ui';
import { applicationKeys } from '@/lib/query-keys';

interface Props { params: { id: string } }

const STATUS_STEPS = ['submitted', 'under_review', 'docs_requested', 'approved'];

export default function ApplicationDetailPage({ params }: Props): React.ReactElement {
  const session = useSession();
  const router  = useRouter();
  const qc      = useQueryClient();
  const { toast } = useToast();

  const { data: application, isLoading } = useQuery({
    queryKey: applicationKeys.detail(params.id),
    queryFn:  () => api.customer.getApplication(params.id),
    enabled:  !!session,
  });

  const withdrawMutation = useMutation({
    mutationFn: () => api.customer.getApplication(params.id), // withdrawal endpoint TBD
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: applicationKeys.list() });
      toast('Application withdrawn.', 'success');
      router.push('/applications');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to withdraw.', 'error'),
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
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
        ← Back to applications
      </button>

      <h1 data-page-title>Application details</h1>

      {/* Property summary */}
      <div data-card>
        <div style={{ aspectRatio: '16/5', background: 'var(--color-surface-muted)', overflow: 'hidden' }}>
          <img src={`/images/properties/${app['propertySlug'] as string}-banner.jpg`} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
        <div style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>{app['propertyName'] as string}</h2>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
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
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress tracker */}
      {currentStep >= 0 && (
        <div data-card-padded>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-5)' }}>Application progress</h3>
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
                    color: done ? 'white' : 'transparent', fontSize: 'var(--text-xs)',
                  }}>
                    {done ? '✓' : ''}
                  </div>
                  <span style={{ fontSize: '10px', textAlign: 'center', color: done ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: done ? 'var(--font-semibold)' : 'normal', textTransform: 'capitalize' }}>
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
          <strong style={{ color: 'var(--color-warning)', fontSize: 'var(--text-sm)' }}>⚠ Documents required</strong>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            The property has requested additional documents. Please upload them to continue.
          </p>
          <a href={`/documents?ref=${params.id}`} data-btn-primary>Upload documents →</a>
        </div>
      )}

      {/* Answers summary */}
      {(app['answers'] as Record<string, unknown>) && (
        <div data-card-padded>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-4)' }}>Your responses</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {Object.entries(app['answers'] as Record<string, unknown>).map(([key, val]) => (
              <div key={key}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: 'var(--text-sm)' }}>{String(val)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {(status === 'submitted' || status === 'under_review') && (
        <button type="button" data-btn-ghost data-btn-full
          style={{ color: 'var(--color-error)', marginTop: 'var(--space-4)' }}
          onClick={() => withdrawMutation.mutate()}>
          Withdraw application
        </button>
      )}

      <div data-support-callout style={{ marginTop: 'var(--space-5)' }}>
        <div data-support-callout-text>
          <span data-support-callout-icon>🎧</span>
          <div>
            <strong>Need help with your application?</strong>
            <p>Our support team is here to help you.</p>
          </div>
        </div>
        <a href="/support" data-btn-secondary>Contact support →</a>
      </div>
    </div>
  );
}
