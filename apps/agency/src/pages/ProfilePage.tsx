import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { updateAgencyProfileSchema } from '@stayos/validators';
import type { UpdateAgencyProfileInput } from '@stayos/validators';
import { PageHeader, Panel, LoadingBlock, InlineError, applyServerErrors, useToast, Icons } from '@stayos/ui';
import { agencyKeys } from '../lib/query-keys';
import { titleCase } from '../lib/format';

export default function ProfilePage(): React.ReactElement {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: agency, isLoading } = useQuery({ queryKey: agencyKeys.profile(), queryFn: api.agency.getMe });

  const form = useForm<UpdateAgencyProfileInput>({
    resolver: zodResolver(updateAgencyProfileSchema),
    ...(agency
      ? {
          values: {
            name: agency.name,
            contactName: agency.contactName,
            contactPhone: agency.contactPhone ?? '',
            settings: agency.settings,
          },
        }
      : {}),
  });

  const mutation = useMutation({
    mutationFn: (input: UpdateAgencyProfileInput) => api.agency.updateMe(input),
    onSuccess: () => {
      toast('Profile updated.', 'success');
      queryClient.invalidateQueries({ queryKey: agencyKeys.profile() });
    },
    onError: (err) => {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR') applyServerErrors(form, apiErr);
      else toast(apiErr.message ?? 'Could not update profile', 'error');
    },
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Agency Profile" />
        <LoadingBlock rows={4} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Agency Profile" subtitle="Your agency's identity and default settings." />

      <div data-grid-2col>
        <Panel title="Details">
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <div data-form-group>
              <label>Agency name</label>
              <input {...form.register('name')} />
              {form.formState.errors.name ? <InlineError message={form.formState.errors.name.message} /> : null}
            </div>
            <div data-form-group>
              <label>Contact name</label>
              <input {...form.register('contactName')} />
              {form.formState.errors.contactName ? <InlineError message={form.formState.errors.contactName.message} /> : null}
            </div>
            <div data-form-group>
              <label>Contact phone</label>
              <input {...form.register('contactPhone')} />
            </div>

            <span data-eyebrow>Default settings for new mandates</span>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <label data-checkbox-label style={{ marginBottom: 'var(--space-3)' }}>
                <input type="checkbox" {...form.register('settings.commissionEnabled')} />
                Charge commission by default
              </label>
              <div data-form-group>
                <label>Default commission (%)</label>
                <input type="number" step="0.1" {...form.register('settings.commissionPercent', { valueAsNumber: true })} />
              </div>
              <label data-checkbox-label>
                <input type="checkbox" {...form.register('settings.ownerReadOnlyDefault')} />
                Give owners read-only access by default while a mandate is active
              </label>
            </div>

            <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-6)' }}>
              <button type="submit" data-btn-primary disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Account">
          <div data-kv-grid>
            <div data-readonly-field>
              <span data-readonly-label>Type</span>
              <span data-readonly-value>{agency ? titleCase(agency.type) : '—'}</span>
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Status</span>
              {agency ? <span data-status-badge data-status={agency.status}>{agency.status}</span> : null}
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Contact email</span>
              <span data-readonly-value>{agency?.contactEmail}</span>
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Managed properties</span>
              <span data-readonly-value>{agency?.managedProperties.length ?? 0}</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icons.Info size={13} /> Email and account status can't be changed here — contact support if either needs to change.
          </p>
        </Panel>
      </div>
    </div>
  );
}
