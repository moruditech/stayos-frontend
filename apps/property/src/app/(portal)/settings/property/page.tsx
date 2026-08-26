'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader,
  ReadOnlyField,
  InlineError,
  useToast,
  RoleGate,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';

const propertyKeys = { me: () => ['properties', 'me'] as const };

export default function PropertySettingsPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: property, isLoading } = useQuery({
    queryKey: propertyKeys.me(),
    queryFn: () => api.tenants.getMe(),
  });

  const form = useForm<Record<string, string>>();

  function startEditing(): void {
    const p = property as unknown as Record<string, unknown>;
    form.reset({
      name:        String(p['name'] ?? ''),
      phone:       String(p['phone'] ?? ''),
      email:       String(p['email'] ?? ''),
      website:     String(p['website'] ?? ''),
      description: String(p['description'] ?? ''),
    });
    setEditing(true);
  }

  const updateMutation = useMutation({
    mutationFn: (input: Record<string, string>) => api.tenants.updateMe(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: propertyKeys.me() });
      setEditing(false);
      toast('Property settings saved.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        for (const f of err.fields ?? []) {
          form.setError(f.field, { message: f.message });
        }
      } else if (err.code === 'READ_ONLY_ACCESS') {
        toast('Changes are not available in view-only mode.', 'error');
      } else {
        toast(err.message ?? 'Failed.', 'error');
      }
    },
  });

  if (isLoading) return <SkeletonLoader rows={5} />;

  const p = property as unknown as Record<string, unknown>;

  return (
    <div data-page="property-settings">
      <div data-page-header>
        <div>
          <a href="/settings" data-breadcrumb>← Settings</a>
          <h1>Property settings</h1>
        </div>
        <div data-header-actions>
          <a href="/settings/staff" data-btn-ghost>Staff accounts</a>
          <a href="/settings/subscription" data-btn-ghost>Subscription</a>
          <RoleGate perm={PERMISSIONS.PROPERTY_MANAGE}>
            {!editing && (
              <button type="button" data-btn-ghost onClick={startEditing}>
                Edit
              </button>
            )}
          </RoleGate>
        </div>
      </div>

      {editing ? (
        <form
          onSubmit={form.handleSubmit((v) => updateMutation.mutate(v))}
          noValidate
          data-form
          data-form-contained
        >
          {(['name', 'phone', 'email', 'website'] as const).map((field) => (
            <div key={field} data-form-group>
              <label htmlFor={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
              <input
                id={field}
                type={field === 'email' ? 'email' : 'text'}
                {...form.register(field)}
              />
              <InlineError message={form.formState.errors[field]?.message} />
            </div>
          ))}
          <div data-form-group>
            <label htmlFor="description">Description</label>
            <textarea id="description" rows={3} {...form.register('description')} />
          </div>
          <div data-form-actions>
            <button
              type="button"
              data-btn-ghost
              onClick={() => setEditing(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </button>
            <button type="submit" data-btn-primary disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      ) : (
        <div data-field-list>
          <ReadOnlyField label="Property name" value={String(p['name'] ?? '—')} />
          <ReadOnlyField label="Type" value={String(p['type'] ?? '—')} />
          <ReadOnlyField label="Phone" value={String(p['phone'] ?? '—')} />
          <ReadOnlyField label="Email" value={String(p['email'] ?? '—')} />
          <ReadOnlyField label="Website" value={String(p['website'] ?? '—')} />
          {Boolean(p['description']) && (
            <ReadOnlyField label="Description" value={String(p['description'])} />
          )}
        </div>
      )}

      <div data-settings-links>
        <a href="/settings/staff" data-settings-nav-item>
          <span data-settings-nav-label>Staff accounts</span>
          <span data-settings-nav-arrow>→</span>
        </a>
        <a href="/settings/subscription" data-settings-nav-item>
          <span data-settings-nav-label>Subscription &amp; billing</span>
          <span data-settings-nav-arrow>→</span>
        </a>
        <a href="/settings/agency-requests" data-settings-nav-item>
          <span data-settings-nav-label>Agency management requests</span>
          <span data-settings-nav-arrow>→</span>
        </a>
        <a href="/channels" data-settings-nav-item>
          <span data-settings-nav-label>Channel management (iCal)</span>
          <span data-settings-nav-arrow>→</span>
        </a>
        <a href="/onboarding" data-settings-nav-item>
          <span data-settings-nav-label>Onboarding wizard</span>
          <span data-settings-nav-arrow>→</span>
        </a>
      </div>
    </div>
  );
}
