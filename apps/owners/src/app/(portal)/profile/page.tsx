'use client';

/**
 * Owner profile page.
 *
 * TAD 12 §3 confirmed constraints:
 *   - email, passwordHash, status are NOT self-service editable via PATCH /owner/me —
 *     the backend strips them. Do not render input fields for these.
 *   - phone is encrypted at rest with a blind index — treat it the same as
 *     customer PII (masked by default, revealed on demand, per TAD 07's pattern).
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader,
  InlineError,
  applyServerErrors,
  ReadOnlyField,
  PiiField,
  useToast,
} from '@stayos/ui';

const ownerProfileKeys = {
  me: () => ['owner', 'profile'] as const,
};

const updateProfileSchema = z.object({
  firstName:   z.string().min(1, 'First name is required'),
  lastName:    z.string().min(1, 'Last name is required'),
  companyName: z.string().optional(),
  vatNumber:   z.string().optional(),
});

type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export default function ProfilePage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ownerProfileKeys.me(),
    queryFn: () => api.owner.getProfile(),
  });

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
  });

  function startEditing(): void {
    const p = profile as Record<string, unknown>;
    form.reset({
      firstName:   (p['firstName'] as string) ?? '',
      lastName:    (p['lastName'] as string) ?? '',
      companyName: (p['companyName'] as string) ?? '',
      vatNumber:   (p['vatNumber'] as string) ?? '',
    });
    setEditing(true);
  }

  const updateMutation = useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      api.owner.updateProfile(input as Record<string, unknown>),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ownerProfileKeys.me() });
      setEditing(false);
      toast('Profile updated.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else toast(err.message ?? 'Update failed.', 'error');
    },
  });

  if (isLoading) return <SkeletonLoader rows={4} />;

  const p = profile as Record<string, unknown>;

  return (
    <div data-page="profile">
      <div data-page-header>
        <h1>Profile</h1>
        {!editing && (
          <button type="button" data-btn-ghost onClick={startEditing}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form
          onSubmit={form.handleSubmit((v) => updateMutation.mutate(v))}
          noValidate
          data-form
          data-form-contained
        >
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="firstName">First name</label>
              <input id="firstName" type="text" {...form.register('firstName')} />
              <InlineError message={form.formState.errors.firstName?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="lastName">Last name</label>
              <input id="lastName" type="text" {...form.register('lastName')} />
              <InlineError message={form.formState.errors.lastName?.message} />
            </div>
          </div>

          <div data-form-group>
            <label htmlFor="companyName">Company name <span data-optional>(optional)</span></label>
            <input id="companyName" type="text" {...form.register('companyName')} />
          </div>

          <div data-form-group>
            <label htmlFor="vatNumber">VAT number <span data-optional>(optional)</span></label>
            <input id="vatNumber" type="text" {...form.register('vatNumber')} />
          </div>

          <div data-form-hint-note>
            Email address and account status cannot be changed here. To update your
            email, contact support.
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
          <ReadOnlyField
            label="Name"
            value={`${String(p['firstName'] ?? '')} ${String(p['lastName'] ?? '')}`.trim()}
          />
          {/* email is shown read-only — not editable, not masked */}
          <ReadOnlyField label="Email" value={String(p['email'] ?? '—')} />

          {/* phone is encrypted PII — masked by default, reveal on demand */}
          {p['phone'] ? (
            <div data-field-item>
              <span data-readonly-label>Phone</span>
              <PiiField
                label="Phone"
                value={String(p['phone'])}
              />
            </div>
          ) : (
            <ReadOnlyField label="Phone" value="Not provided" />
          )}

          {p['companyName'] && (
            <ReadOnlyField label="Company" value={String(p['companyName'])} />
          )}
          {p['vatNumber'] && (
            <ReadOnlyField label="VAT number" value={String(p['vatNumber'])} />
          )}
        </div>
      )}
    </div>
  );
}
