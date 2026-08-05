'use client';

/**
 * Add property page — Owner Portal.
 *
 * TAD 12 §4 notes: the backend's Mongoose schema and the Zod request-validation
 * schema disagree on the set of valid property types. Building against either
 * today risks missing valid types or shipping types that fail at the Mongoose
 * save step. The type field is therefore rendered as a disabled placeholder
 * with an inline explanation, pending the backend fix that settles on one enum
 * and adds TENANT_TYPE to @stayos/constants.
 *
 * FEATURE_NOT_IN_PLAN for multi_property is surfaced with the specific
 * "upgrade your existing property first" message (TAD 12 §4).
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { InlineError, applyServerErrors, useToast } from '@stayos/ui';

// Minimal schema — type field omitted because the backend enum is unsettled.
// Once the backend fix lands and TENANT_TYPE is added to @stayos/constants,
// add type as a z.enum(TENANT_TYPE_VALUES) field here.
const addPropertySchema = z.object({
  name:    z.string().min(1, 'Property name is required'),
  address: z.string().min(1, 'Address is required'),
  city:    z.string().min(1, 'City is required'),
  // type is intentionally absent — see module-level comment above
});

type AddPropertyInput = z.infer<typeof addPropertySchema>;

export default function AddPropertyPage(): React.ReactElement {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [existingPropertyId, setExistingPropertyId] = useState<string | null>(null);

  const form = useForm<AddPropertyInput>({
    resolver: zodResolver(addPropertySchema),
    defaultValues: { name: '', address: '', city: '' },
  });

  async function handleSubmit(values: AddPropertyInput): Promise<void> {
    setSubmitting(true);
    setFormError('');
    setUpgradeRequired(false);

    try {
      await api.owner.addProperty({ ...values, type: 'guesthouse' } as Record<string, unknown>);
      toast('Property added successfully.', 'success');
      router.replace('/properties');
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'FEATURE_NOT_IN_PLAN') {
        // TAD 12 §4: upgrade the *existing* property's plan first.
        // Attempt to find the owner's first active property to link to.
        setUpgradeRequired(true);
        try {
          const existing = await api.owner.listProperties();
          const active = existing.find((p) => p.status === 'active');
          setExistingPropertyId(active?._id ?? null);
        } catch {
          // non-fatal
        }
      } else if (apiErr.code === 'VALIDATION_ERROR') {
        applyServerErrors(form, apiErr);
      } else {
        setFormError(apiErr.message ?? 'Failed to add property. Please try again.');
      }
      setSubmitting(false);
    }
  }

  if (upgradeRequired) {
    return (
      <div data-page="add-property">
        <div data-upgrade-required>
          <h1>Plan upgrade required</h1>
          <p>
            Adding a second property requires your existing property to be on a Pro or
            Enterprise plan, or have the multi-property feature enabled. Please upgrade
            your existing property's subscription first — not the new one, since it
            doesn't have a subscription yet.
          </p>
          {existingPropertyId ? (
            <a href={`/properties/${existingPropertyId}`} data-btn-primary>
              Manage existing property subscription
            </a>
          ) : (
            <a href="/properties" data-btn-primary>
              Back to properties
            </a>
          )}
          <button
            type="button"
            data-btn-ghost
            onClick={() => { setUpgradeRequired(false); setSubmitting(false); }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-page="add-property">
      <div data-page-header>
        <div>
          <a href="/properties" data-breadcrumb>← Back to properties</a>
          <h1>Add a property</h1>
        </div>
      </div>

      <div data-form-container>
        <form
          onSubmit={form.handleSubmit((v) => void handleSubmit(v))}
          noValidate
          data-form
        >
          <div data-form-group>
            <label htmlFor="name">Property name</label>
            <input
              id="name"
              type="text"
              placeholder="e.g. Lakeside Boutique Hotel"
              {...form.register('name')}
            />
            <InlineError message={form.formState.errors.name?.message} />
          </div>

          {/* Property type — disabled pending backend enum fix (TAD 12 §0) */}
          <div data-form-group>
            <label htmlFor="type">
              Property type
              <span data-field-note> — type selection coming soon</span>
            </label>
            <input
              id="type"
              type="text"
              disabled
              value="Will be selectable once the platform type list is finalised"
              data-field-disabled
            />
            <p data-field-hint>
              Property type selection will be available once the platform finalises its
              full property-type list. Your property will be created as a guesthouse by
              default and can be updated before going live.
            </p>
          </div>

          <div data-form-group>
            <label htmlFor="address">Street address</label>
            <input
              id="address"
              type="text"
              placeholder="e.g. 12 Waterfront Drive"
              {...form.register('address')}
            />
            <InlineError message={form.formState.errors.address?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="city">City</label>
            <input
              id="city"
              type="text"
              placeholder="e.g. Cape Town"
              {...form.register('city')}
            />
            <InlineError message={form.formState.errors.city?.message} />
          </div>

          {formError && (
            <span role="alert" data-form-error>
              {formError}
            </span>
          )}

          <div data-form-actions>
            <a href="/properties" data-btn-ghost>
              Cancel
            </a>
            <button type="submit" disabled={submitting} data-btn-primary>
              {submitting ? 'Adding property…' : 'Add property'}
            </button>
          </div>
        </form>

        <div data-form-aside>
          <h3>What happens next</h3>
          <ol data-steps>
            <li>Your property is created with <strong>pending</strong> status.</li>
            <li>The StayOS team will review and verify your submission.</li>
            <li>Once approved, you can open and operate the property through this portal.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
