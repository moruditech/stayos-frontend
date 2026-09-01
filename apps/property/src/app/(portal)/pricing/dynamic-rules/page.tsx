'use client';

import Link from 'next/link';

/**
 * Dynamic pricing rules — Pricing & Revenue.
 *
 * GET /pricing/dynamic-rules returns every active rate plan with its
 * pricingRules array (plus floorPrice/ceilingPrice, read-only here).
 * PATCH /pricing/dynamic-rules takes { planId, rules } and replaces that
 * one plan's pricingRules wholesale — see pricing.service.js#updateDynamicRules.
 * Floor/ceiling prices are not part of that PATCH payload, so they're
 * shown for context only and aren't editable from this screen.
 */

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, ReadOnlyField, useToast, Icons } from '@stayos/ui';
import { pricingKeys } from '@/lib/query-keys';

const CONDITIONS = ['occupancy_above', 'occupancy_below', 'lead_time_within', 'lead_time_beyond'] as const;
const ADJUSTMENTS = ['percent', 'fixed'] as const;
const DIRECTIONS = ['increase', 'decrease'] as const;

const CONDITION_LABELS: Record<(typeof CONDITIONS)[number], string> = {
  occupancy_above: 'Occupancy above threshold',
  occupancy_below: 'Occupancy below threshold',
  lead_time_within: 'Booking lead time within (days)',
  lead_time_beyond: 'Booking lead time beyond (days)',
};

interface RatePlanWithRules {
  _id: string;
  name: string;
  code: string;
  type: string;
  pricingRules?: {
    condition?: string;
    threshold?: number;
    adjustment?: string;
    value?: number;
    direction?: string;
  }[];
  floorPrice?: number;
  ceilingPrice?: number;
}

interface RuleInput {
  condition: (typeof CONDITIONS)[number];
  threshold: number;
  adjustment: (typeof ADJUSTMENTS)[number];
  value: number;
  direction: (typeof DIRECTIONS)[number];
}

interface FormInput {
  rules: RuleInput[];
}

function RulesEditor({ plan }: { plan: RatePlanWithRules }): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormInput>({
    defaultValues: {
      rules: (plan.pricingRules ?? []).map((r) => ({
        condition: (r.condition as RuleInput['condition']) ?? 'occupancy_above',
        threshold: r.threshold ?? 0,
        adjustment: (r.adjustment as RuleInput['adjustment']) ?? 'percent',
        value: r.value ?? 0,
        direction: (r.direction as RuleInput['direction']) ?? 'increase',
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'rules' });

  const updateMutation = useMutation({
    mutationFn: (input: FormInput) =>
      api.pricing.updateDynamicRules({ planId: plan._id, rules: input.rules }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pricingKeys.dynamicRules() });
      toast(`Dynamic rules updated for ${plan.name}.`, 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to update rules.', 'error'),
  });

  return (
    <section data-report-section data-dynamic-rules-plan>
      <div data-section-header>
        <h2>{plan.name} <span data-plan-code>({plan.code})</span></h2>
      </div>

      <div data-stat-grid>
        <ReadOnlyField label="Floor price" value={plan.floorPrice != null ? `R${plan.floorPrice}` : '—'} />
        <ReadOnlyField label="Ceiling price" value={plan.ceilingPrice != null ? `R${plan.ceilingPrice}` : '—'} />
      </div>

      <form onSubmit={form.handleSubmit((v) => updateMutation.mutate(v))} noValidate data-form>
        {fields.length === 0 && (
          <p data-field-hint>No dynamic pricing rules yet for this plan.</p>
        )}

        {fields.map((field, index) => (
          <div key={field.id} data-form-row data-dynamic-rule-row>
            <div data-form-group>
              <label htmlFor={`rule-${index}-condition`}>Condition</label>
              <select id={`rule-${index}-condition`} {...form.register(`rules.${index}.condition` as const)}>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div data-form-group>
              <label htmlFor={`rule-${index}-threshold`}>Threshold</label>
              <input
                id={`rule-${index}-threshold`}
                type="number"
                {...form.register(`rules.${index}.threshold` as const, { valueAsNumber: true })}
              />
            </div>
            <div data-form-group>
              <label htmlFor={`rule-${index}-direction`}>Direction</label>
              <select id={`rule-${index}-direction`} {...form.register(`rules.${index}.direction` as const)}>
                {DIRECTIONS.map((d) => (
                  <option key={d} value={d}>{d === 'increase' ? 'Increase rate' : 'Decrease rate'}</option>
                ))}
              </select>
            </div>
            <div data-form-group>
              <label htmlFor={`rule-${index}-adjustment`}>Adjustment type</label>
              <select id={`rule-${index}-adjustment`} {...form.register(`rules.${index}.adjustment` as const)}>
                {ADJUSTMENTS.map((a) => (
                  <option key={a} value={a}>{a === 'percent' ? 'Percent' : 'Fixed amount'}</option>
                ))}
              </select>
            </div>
            <div data-form-group>
              <label htmlFor={`rule-${index}-value`}>Value</label>
              <input
                id={`rule-${index}-value`}
                type="number"
                step="0.01"
                {...form.register(`rules.${index}.value` as const, { valueAsNumber: true })}
              />
            </div>
            <div data-form-group>
              <button type="button" data-btn-ghost data-btn-sm data-destructive onClick={() => remove(index)}>
                Remove
              </button>
            </div>
          </div>
        ))}

        <div data-form-actions data-form-actions-inline>
          <button
            type="button"
            data-btn-ghost
            onClick={() => append({
              condition: 'occupancy_above', threshold: 0, adjustment: 'percent', value: 0, direction: 'increase',
            })}
          >
            + Add rule
          </button>
          <button type="submit" data-btn-primary disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save rules'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function DynamicRulesPage(): React.ReactElement {
  const { data: plans, isLoading } = useQuery({
    queryKey: pricingKeys.dynamicRules(),
    queryFn: () => api.pricing.getDynamicRules() as unknown as Promise<RatePlanWithRules[]>,
  });

  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  useEffect(() => {
    if (!activePlanId && plans && plans.length > 0) {
      setActivePlanId(plans[0]!._id);
    }
  }, [plans, activePlanId]);

  const activePlan = (plans ?? []).find((p) => p._id === activePlanId);

  return (
    <div data-page="dynamic-rules">
      <div data-page-header>
        <div>
          <Link href="/pricing/rate-plans" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Pricing &amp; Revenue</Link>
          <h1>Dynamic rules</h1>
          <p data-page-subtitle>
            Automatically adjust rates based on occupancy or booking lead time.
          </p>
        </div>
      </div>

      {isLoading ? (
        <SkeletonLoader rows={6} />
      ) : !plans?.length ? (
        <EmptyState
          title="No rate plans"
          description="Create a rate plan first, then configure its dynamic pricing rules here."
          action={<Link href="/pricing/rate-plans" data-btn-primary>Go to rate plans</Link>}
        />
      ) : (
        <>
          <div data-tab-bar role="tablist">
            {plans.map((plan) => (
              <button
                key={plan._id}
                type="button"
                role="tab"
                aria-selected={activePlanId === plan._id}
                data-tab
                data-active={activePlanId === plan._id || undefined}
                onClick={() => setActivePlanId(plan._id)}
              >
                {plan.name}
              </button>
            ))}
          </div>

          {activePlan && <RulesEditor key={activePlan._id} plan={activePlan} />}
        </>
      )}
    </div>
  );
}
