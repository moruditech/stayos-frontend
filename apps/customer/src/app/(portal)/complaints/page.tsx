'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, InlineError, useToast } from '@stayos/ui';

// Matches createComplaintSchema exactly — field names and enum values confirmed
// against src/modules/complaints/complaints.validation.js
const newComplaintSchema = z.object({
  tenantId:    z.string().min(1, 'Property is required'),
  bookingId:   z.string().optional(),
  category:    z.enum([
    'cleanliness','noise','safety','billing_error','service',
    'maintenance','staff_conduct','amenities','food','other',
  ], { required_error: 'Category is required' }),
  subject:     z.string().min(3, 'Subject is required').max(200),
  description: z.string().min(10, 'Please describe your complaint in more detail').max(2000),
  priority:    z.enum(['low','medium','high','urgent']).default('medium'),
});
type NewComplaintInput = z.infer<typeof newComplaintSchema>;

const CATEGORY_LABELS: Record<string, string> = {
  cleanliness: 'Cleanliness',   noise: 'Noise',
  safety: 'Safety',             billing_error: 'Billing error',
  service: 'Service',           maintenance: 'Maintenance',
  staff_conduct: 'Staff conduct', amenities: 'Amenities',
  food: 'Food',                 other: 'Other',
};

const COMPLAINT_KEYS = {
  list: () => ['customer','complaints'] as const,
};

export default function ComplaintsPage(): React.ReactElement {
  const session    = useSession();
  const qc         = useQueryClient();
  const { toast }  = useToast();
  const [view, setView] = useState<'list'|'new'>('list');
  const [formError, setFormError] = useState('');

  // GET /customers/me/complaints
  const { data: complaints, isLoading } = useQuery({
    queryKey: COMPLAINT_KEYS.list(),
    queryFn:  () => api.customer.listComplaints(),
    enabled:  !!session,
  });

  // Get customer's bookings to populate tenantId/bookingId selectors
  const { data: bookings } = useQuery({
    queryKey: ['customer','bookings','for-complaint'],
    queryFn:  () => api.customer.listBookings(),
    enabled:  view === 'new' && !!session,
  });

  const form = useForm<NewComplaintInput>({
    resolver: zodResolver(newComplaintSchema),
    defaultValues: { tenantId:'', bookingId:'', category:'other', subject:'', description:'', priority:'medium' },
  });

  const createMutation = useMutation({
    // POST /complaints — tenantId is required in the body (customer scope has no req.tenantId)
    mutationFn: (values: NewComplaintInput) => api.customer.createComplaint(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COMPLAINT_KEYS.list() });
      toast('Complaint submitted successfully.', 'success');
      setView('list');
      form.reset();
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        err.fields?.forEach((f) => {
          form.setError(f.field as keyof NewComplaintInput, { message: f.message });
        });
      } else {
        setFormError(err.message ?? 'Submission failed. Please try again.');
      }
    },
  });

  const bookingList = (bookings as Record<string,unknown>[] | undefined) ?? [];
  const all         = (complaints as Record<string,unknown>[] | undefined) ?? [];

  // Populate tenantId from selected booking
  function handleBookingChange(bookingId: string): void {
    form.setValue('bookingId', bookingId);
    const booking = bookingList.find((b) => (b as Record<string,unknown>)['_id'] === bookingId) as Record<string,unknown> | undefined;
    if (booking?.['tenantId']) {
      form.setValue('tenantId', booking['tenantId'] as string);
    }
  }

  // ── New complaint form ──────────────────────────────────────────────────────
  if (view === 'new') {
    return (
      <div data-page>
        <button type="button" onClick={() => setView('list')}
          style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', color:'var(--color-text-secondary)', fontSize:'var(--text-sm)', marginBottom:'var(--space-4)', cursor:'pointer' }}>
          ← Back to complaints
        </button>

        <h1 data-page-title>Submit a complaint</h1>
        <p data-page-subtitle>Complaints are reviewed by the property team and our platform support.</p>

        <form onSubmit={form.handleSubmit((v) => void createMutation.mutate(v))} noValidate
          style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)', maxWidth:560 }}>

          {/* Booking selector — pre-fills tenantId automatically */}
          {bookingList.length > 0 && (
            <div data-form-group>
              <label htmlFor="cp-booking">Related booking (optional)</label>
              <select id="cp-booking" onChange={(e) => handleBookingChange(e.target.value)}>
                <option value="">No specific booking</option>
                {bookingList.map((b) => {
                  const bk = b as Record<string,unknown>;
                  return (
                    <option key={bk['_id'] as string} value={bk['_id'] as string}>
                      {bk['propertyName'] as string} — #{bk['confirmationNumber'] as string ?? bk['_id'] as string}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* tenantId — required when no booking selected */}
          {!form.watch('bookingId') && (
            <div data-form-group>
              <label htmlFor="cp-tenant">Property *</label>
              <input id="cp-tenant" type="text" placeholder="Property ID or name" {...form.register('tenantId')} />
              <InlineError message={form.formState.errors.tenantId?.message} />
              <span style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)' }}>
                Select a related booking above to fill this automatically.
              </span>
            </div>
          )}

          <div data-form-group>
            <label htmlFor="cp-cat">Category *</label>
            <select id="cp-cat" {...form.register('category')}>
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <InlineError message={form.formState.errors.category?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="cp-priority">Priority</label>
            <select id="cp-priority" {...form.register('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div data-form-group>
            <label htmlFor="cp-subj">Subject *</label>
            <input id="cp-subj" type="text" placeholder="Brief description of your complaint" {...form.register('subject')} />
            <InlineError message={form.formState.errors.subject?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="cp-desc">Description *</label>
            <textarea id="cp-desc" rows={6}
              placeholder="Describe what happened, when it occurred, and what outcome you are seeking."
              {...form.register('description')} />
            <InlineError message={form.formState.errors.description?.message} />
          </div>

          {formError && <span role="alert" data-form-error>{formError}</span>}

          <div style={{ display:'flex', gap:'var(--space-3)' }}>
            <button type="button" data-btn-ghost onClick={() => setView('list')}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending} style={{ flex:1 }}>
              {createMutation.isPending ? 'Submitting…' : 'Submit complaint'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Complaint list ──────────────────────────────────────────────────────────
  return (
    <div data-page>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'var(--space-3)', marginBottom:'var(--space-6)' }}>
        <div>
          <h1 data-page-title>Complaints</h1>
          <p data-page-subtitle>Complaints you have submitted about your stays</p>
        </div>
        <button type="button" data-btn-primary onClick={() => setView('new')}>+ New complaint</button>
      </div>

      {isLoading ? <SkeletonLoader rows={4} /> : all.length === 0 ? (
        <EmptyState
          title="No complaints submitted"
          description="If you experienced an issue during your stay, you can submit a complaint here."
          action={<button type="button" data-btn-primary onClick={() => setView('new')}>Submit a complaint</button>}
        />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
          {all.map((item) => {
            const c       = item as Record<string,unknown>;
            const status  = c['status'] as string;
            const created = new Date(c['createdAt'] as string).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' });
            const propertyName = c['propertyName'] as string | undefined;
            const resolution = c['resolution'] as string | undefined;
            return (
              <div key={c['_id'] as string} data-card-padded style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'var(--space-4)', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:'var(--font-semibold)', fontSize:'var(--text-sm)', marginBottom:'var(--space-1)' }}>
                    {c['subject'] as string}
                  </div>
                  <div style={{ fontSize:'var(--text-xs)', color:'var(--color-text-secondary)', display:'flex', gap:'var(--space-4)', flexWrap:'wrap' }}>
                    <span>{CATEGORY_LABELS[(c['category'] as string)] ?? c['category'] as string}</span>
                    <span>{created}</span>
                    {propertyName && <span>{propertyName}</span>}
                  </div>
                  {resolution && (
                    <div style={{ marginTop:'var(--space-3)', padding:'var(--space-3)', background:'var(--color-success-bg)', borderRadius:'var(--radius-md)', fontSize:'var(--text-xs)', color:'var(--color-success)' }}>
                      <strong>Resolution:</strong> {resolution}
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'var(--space-2)' }}>
                  <StatusBadge status={status} />
                  {status === 'resolved' || status === 'closed' ? null : (
                    <button type="button" data-btn-ghost
                      style={{ fontSize:'var(--text-xs)', padding:'var(--space-1) var(--space-3)' }}
                      onClick={() => void api.customer.createComplaint({ ...c, escalate: true } as unknown as Record<string,unknown>)}>
                      Escalate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div data-support-callout style={{ marginTop:'var(--space-8)' }}>
        <div data-support-callout-text>
          <span data-support-callout-icon>💬</span>
          <div>
            <strong>Need further assistance?</strong>
            <p>If your complaint is not being resolved, our support team can help.</p>
          </div>
        </div>
        <a href="/support" data-btn-secondary>Contact support →</a>
      </div>
    </div>
  );
}
