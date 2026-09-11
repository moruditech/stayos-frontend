'use client';

import Link from 'next/link';

/**
 * Dynamic pricing rules — Pricing & Revenue.
 *
 * GET /pricing/dynamic-rules returns every active rate plan with its
 * pricingRules array (plus floorPrice/ceilingPrice, read-only here).
 * PATCH /pricing/dynamic-rules takes { planId, rules } and replaces that
 * one plan's pricingRules wholesale — see pricing.service.js#updateDynamicRules.
 * Floor/ceiling prices are edited from the rate plan itself (Pricing &
 * Revenue → Edit), not here — this screen is rules only.
 *
 * Rule types, grounded in standard hotel revenue-management practice
 * (occupancy thresholds, booking lead time, length-of-stay incentives,
 * and day-of-week demand patterns are the levers a small property can
 * actually act on without market-data feeds):
 *   - Occupancy above/below a threshold  → the only one that reads live
 *     data (see pricing.service.js#getOccupancyPercentForNight).
 *   - Booking lead time within/beyond N days
 *   - Length of stay above/below N nights
 *   - Specific day(s) of the week
 */

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, RULE_CONDITIONS } from '@stayos/api-client';
import type { ApiError, PricingRule } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, ReadOnlyField, useToast, Icons, Dropdown } from '@stayos/ui';
import { pricingKeys } from '@/lib/query-keys';

const ADJUSTMENTS = ['percent', 'fixed'] as const;
const DIRECTIONS = ['increase', 'decrease'] as const;
const WEEKDAYS = [
  { value: 0, label: 'Sun' }, { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
];

const CONDITION_LABELS: Record<(typeof RULE_CONDITIONS)[number], string> = {
  occupancy_above: 'Occupancy is above',
  occupancy_below: 'Occupancy is below',
  lead_time_within: 'Booking made within (days of check-in)',
  lead_time_beyond: 'Booking made more than (days before check-in)',
  length_of_stay_above: 'Stay is longer than (nights)',
  length_of_stay_below: 'Stay is shorter than (nights)',
  day_of_week: 'Night falls on',
};
const CONDITION_OPTIONS = RULE_CONDITIONS.map((c) => ({ value: c, label: CONDITION_LABELS[c] }));
const ADJUSTMENT_OPTIONS = ADJUSTMENTS.map((a) => ({ value: a, label: a === 'percent' ? 'Percent' : 'Fixed amount' }));
const DIRECTION_OPTIONS = DIRECTIONS.map((d) => ({ value: d, label: d === 'increase' ? 'Increase rate' : 'Decrease rate' }));

function thresholdLabel(condition: (typeof RULE_CONDITIONS)[number]): string {
  if (condition.startsWith('occupancy')) return 'Occupancy % ';
  if (condition.startsWith('lead_time')) return 'Days';
  if (condition.startsWith('length_of_stay')) return 'Nights';
  return 'Threshold';
}

interface RatePlanWithRules {
  _id: string;
  name: string;
  code: string;
  type: string;
  pricingRules?: PricingRule[];
  floorPrice?: number;
  ceilingPrice?: number;
}

interface FormInput {
  rules: PricingRule[];
}

function RulesEditor({ plan }: { plan: RatePlanWithRules }): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormInput>({
    defaultValues: {
      rules: (plan.pricingRules ?? []).map((r) => ({
        condition: r.condition ?? 'occupancy_above',
        threshold: r.threshold ?? 0,
        daysOfWeek: r.daysOfWeek ?? [],
        adjustment: r.adjustment ?? 'percent',
        value: r.value ?? 0,
        direction: r.direction ?? 'increase',
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'rules' });
  const watchedRules = form.watch('rules');

  const updateMutation = useMutation({
    mutationFn: (input: FormInput) =>
      api.pricing.updateDynamicRules({ planId: plan._id, rules: input.rules }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pricingKeys.dynamicRules() });
      toast(`Dynamic rules updated for ${plan.name}.`, 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        toast(err.fields?.[0]?.message ?? 'Some rules are incomplete — check each row.', 'error');
      } else toast(err.message ?? 'Failed to update rules.', 'error');
    },
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

        {fields.map((field, index) => {
          const condition = watchedRules[index]?.condition ?? 'occupancy_above';
          const isDayOfWeek = condition === 'day_of_week';
          return (
            <div key={field.id} data-dynamic-rule-card>
              <div data-form-row>
                <div data-form-group>
                  <label htmlFor={`rule-${index}-condition`}>Condition</label>
                  <Controller
                    control={form.control}
                    name={`rules.${index}.condition`}
                    render={({ field: f }) => (
                      <Dropdown id={`rule-${index}-condition`} options={CONDITION_OPTIONS} value={f.value} onChange={f.onChange} />
                    )}
                  />
                </div>

                {isDayOfWeek ? (
                  <div data-form-group>
                    <label>Days</label>
                    <div data-weekday-picker>
                      {WEEKDAYS.map((d) => {
                        const selected = (watchedRules[index]?.daysOfWeek ?? []).includes(d.value);
                        return (
                          <button
                            key={d.value}
                            type="button"
                            data-weekday-chip
                            data-selected={selected || undefined}
                            onClick={() => {
                              const current = form.getValues(`rules.${index}.daysOfWeek`) ?? [];
                              form.setValue(
                                `rules.${index}.daysOfWeek`,
                                selected ? current.filter((v) => v !== d.value) : [...current, d.value]
                              );
                            }}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div data-form-group>
                    <label htmlFor={`rule-${index}-threshold`}>{thresholdLabel(condition)}</label>
                    <input
                      id={`rule-${index}-threshold`}
                      type="number"
                      {...form.register(`rules.${index}.threshold`, { valueAsNumber: true })}
                    />
                  </div>
                )}

                <div data-form-group>
                  <label htmlFor={`rule-${index}-direction`}>Direction</label>
                  <Controller
                    control={form.control}
                    name={`rules.${index}.direction`}
                    render={({ field: f }) => (
                      <Dropdown id={`rule-${index}-direction`} options={DIRECTION_OPTIONS} value={f.value} onChange={f.onChange} />
                    )}
                  />
                </div>
                <div data-form-group>
                  <label htmlFor={`rule-${index}-adjustment`}>Adjustment type</label>
                  <Controller
                    control={form.control}
                    name={`rules.${index}.adjustment`}
                    render={({ field: f }) => (
                      <Dropdown id={`rule-${index}-adjustment`} options={ADJUSTMENT_OPTIONS} value={f.value} onChange={f.onChange} />
                    )}
                  />
                </div>
                <div data-form-group>
                  <label htmlFor={`rule-${index}-value`}>Value</label>
                  <input
                    id={`rule-${index}-value`}
                    type="number"
                    step="0.01"
                    {...form.register(`rules.${index}.value`, { valueAsNumber: true })}
                  />
                </div>
                <div data-form-group>
                  <button type="button" data-btn-ghost data-btn-sm data-destructive onClick={() => remove(index)}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <div data-form-actions data-form-actions-inline>
          <button
            type="button"
            data-btn-ghost
            onClick={() => append({
              condition: 'occupancy_above', threshold: 0, daysOfWeek: [], adjustment: 'percent', value: 0, direction: 'increase',
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
            Automatically adjust rates based on occupancy, booking lead time, length of stay, or day of week.
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
