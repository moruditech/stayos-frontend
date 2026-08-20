'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, useToast } from '@stayos/ui';

export default function OnboardingPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: onboarding, isLoading } = useQuery({
    queryKey: ['onboarding'],
    queryFn: () => api.tenants.getOnboarding(),
    staleTime: 60_000,
  });

  const stepMutation = useMutation({
    mutationFn: (step: string) => api.tenants.completeOnboardingStep(step),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      toast('Step saved.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  if (isLoading) return <SkeletonLoader rows={5} />;

  const ob = onboarding as unknown as Record<string, unknown> ?? {};
  const steps = Array.isArray(ob['steps']) ? (ob['steps'] as unknown as Record<string, unknown>[]) : [];
  const completedCount = steps.filter((s) => Boolean(s['completed'])).length;
  const totalCount = steps.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div data-page="onboarding">
      <div data-page-header>
        <h1>Onboarding</h1>
        <p data-page-subtitle>Get your property ready to go live</p>
      </div>

      <div data-onboarding-progress>
        <div data-progress-info>
          <span>{completedCount} of {totalCount} steps complete</span>
          <span data-pct>{pct}%</span>
        </div>
        <div data-progress-bar>
          <div data-progress-fill style={{ width: `${pct}%` }} role="progressbar"
            aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />
        </div>
      </div>

      <div data-onboarding-steps>
        {steps.map((step) => {
          const key  = String(step['key'] ?? step['id'] ?? '');
          const name = String(step['name'] ?? key);
          const desc = String(step['description'] ?? '');
          const done = Boolean(step['completed']);

          return (
            <div key={key} data-onboarding-step data-complete={done || undefined}>
              <div data-step-check aria-hidden="true">{done ? '✓' : '○'}</div>
              <div data-step-info>
                <h2 data-step-name>{name}</h2>
                {desc && <p data-step-desc>{desc}</p>}
              </div>
              {!done && (
                <button
                  type="button"
                  data-btn-primary data-btn-sm
                  disabled={stepMutation.isPending}
                  onClick={() => stepMutation.mutate(key)}
                >
                  {step['actionLabel'] ? String(step['actionLabel']) : 'Complete'}
                </button>
              )}
            </div>
          );
        })}
        {!steps.length && (
          <p data-empty-note>No onboarding steps found. Your property may already be fully set up.</p>
        )}
      </div>

      {pct === 100 && (
        <div data-onboarding-complete role="status">
          <h2>Setup complete</h2>
          <p>Your property is fully configured and ready to accept bookings.</p>
          <a href="/dashboard" data-btn-primary>Go to dashboard</a>
        </div>
      )}
    </div>
  );
}
