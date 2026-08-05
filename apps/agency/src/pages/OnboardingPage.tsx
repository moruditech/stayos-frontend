import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { PageHeader, Panel, LoadingBlock, useToast, Icons } from '@stayos/ui';
import { agencyKeys } from '../lib/query-keys';

const STEP_META: Record<string, { title: string; description: string; path: string; cta: string }> = {
  agency_profile: {
    title: 'Complete your agency profile',
    description: 'Add your agency name, contact details, and commission settings.',
    path: '/profile',
    cta: 'Go to profile',
  },
  billing: {
    title: 'Set up billing',
    description: "Confirm your agency's own subscription with StayOS.",
    path: '/billing',
    cta: 'Go to billing',
  },
  first_property: {
    title: 'Add your first property',
    description: 'Onboard a new property or request a mandate on an existing one.',
    path: '/properties',
    cta: 'Go to properties',
  },
  staff_accounts: {
    title: 'Invite your team',
    description: 'Add staff members and set what they can access.',
    path: '/staff',
    cta: 'Go to staff',
  },
};

export default function OnboardingPage(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: agencyKeys.onboarding(), queryFn: api.agency.getOnboarding });

  const mutation = useMutation({
    mutationFn: (stepName: string) => api.agency.updateOnboardingStep(stepName, { isComplete: true }),
    onSuccess: () => {
      toast('Step marked complete.', 'success');
      queryClient.invalidateQueries({ queryKey: agencyKeys.onboarding() });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not update this step', 'error'),
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Onboarding" />
        <LoadingBlock rows={4} />
      </div>
    );
  }

  const steps = data?.steps ?? [];
  const completedCount = steps.filter((s) => s.isComplete).length;
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <div>
      <PageHeader title="Onboarding" subtitle="A few steps to get your agency fully set up on StayOS." />

      <Panel>
        <div data-progress-label>
          <span>{completedCount} of {steps.length} steps complete</span>
          <span>{progress}%</span>
        </div>
        <div data-progress-track>
          <div data-progress-fill style={{ width: `${progress}%` }} />
        </div>
      </Panel>

      <div data-stack style={{ marginTop: 'var(--space-4)' }}>
        {steps.map((step) => {
          const meta = STEP_META[step.stepName] ?? {
            title: step.stepName.replace(/_/g, ' '),
            description: '',
            path: '/dashboard',
            cta: 'Go',
          };
          return (
            <Panel key={step.stepNumber}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div
                  data-checklist-icon
                  style={{
                    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: step.isComplete ? 'var(--color-success-bg)' : 'var(--color-bg-sunk)',
                    color: step.isComplete ? 'var(--color-success)' : 'var(--color-text-muted)',
                  }}
                >
                  {step.isComplete ? <Icons.Check size={18} /> : <span style={{ fontWeight: 700 }}>{step.stepNumber}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{meta.title}</div>
                  {meta.description ? <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginTop: 2 }}>{meta.description}</div> : null}
                </div>
                <button data-btn-secondary data-btn-sm onClick={() => navigate(meta.path)}>{meta.cta}</button>
                {!step.isComplete ? (
                  <button data-btn-ghost data-btn-sm onClick={() => mutation.mutate(step.stepName)} disabled={mutation.isPending}>
                    Mark complete
                  </button>
                ) : null}
              </div>
            </Panel>
          );
        })}
      </div>

      {data?.status === 'completed' ? (
        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--color-success)' }}>
            <Icons.CheckCircle2 />
            <span style={{ fontWeight: 600 }}>Your agency is fully set up.</span>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
