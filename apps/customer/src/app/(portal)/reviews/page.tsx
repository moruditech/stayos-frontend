'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, InlineError, useToast, Icons } from '@stayos/ui';

// Matches createReviewSchema — field names and structure confirmed against
// src/modules/reviews/reviews.validation.js
const newReviewSchema = z.object({
  bookingId: z.string().min(1, 'Please select a booking'),
  ratings: z.object({
    overall:     z.number({ required_error: 'Overall rating is required' }).min(1).max(5),
    cleanliness: z.number().min(1).max(5).optional(),
    service:     z.number().min(1).max(5).optional(),
    value:       z.number().min(1).max(5).optional(),
    location:    z.number().min(1).max(5).optional(),
  }),
  title: z.string().max(200).optional(),
  body:  z.string().min(10, 'Please write at least a few sentences').max(3000),
});
type NewReviewInput = z.infer<typeof newReviewSchema>;

function StarDisplay({ value, size = 16 }: { value: number; size?: number }): React.ReactElement {
  return (
    <span style={{ display: 'inline-flex', gap: '2px', color: '#F59E0B' }}>
      {[1,2,3,4,5].map((n) => (
        <Icons.Star key={n} size={size} fill={n <= value ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

const REVIEW_KEYS = { list: () => ['customer','reviews'] as const };

const RATING_CATEGORIES = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'service',     label: 'Service' },
  { key: 'value',       label: 'Value for money' },
  { key: 'location',    label: 'Location' },
] as const;

function StarRating({
  value, onChange, size = 24,
}: { value: number; onChange: (n: number) => void; size?: number }): React.ReactElement {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display:'flex', gap:'var(--space-1)' }}>
      {[1,2,3,4,5].map((n) => (
        <button key={n} type="button"
          style={{ color: n <= (hover||value) ? '#F59E0B' : 'var(--color-border)', background:'none', border:'none', cursor:'pointer', lineHeight:1, padding:0, display: 'flex' }}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)} aria-label={`${n} star${n!==1?'s':''}`}>
          <Icons.Star size={size} fill={n <= (hover||value) ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

export default function ReviewsPage(): React.ReactElement {
  const session   = useSession();
  const qc        = useQueryClient();
  const { toast } = useToast();
  const [view, setView]       = useState<'list'|'new'>('list');
  const [formError, setFormError] = useState('');

  const { data: reviews, isLoading } = useQuery({
    queryKey: REVIEW_KEYS.list(),
    queryFn:  () => api.customer.listReviews(),
    enabled:  !!session,
  });

  // Past bookings to select which stay to review
  const { data: bookings } = useQuery({
    queryKey: ['customer','bookings','for-review'],
    queryFn:  () => api.customer.listBookings(),
    enabled:  view === 'new' && !!session,
  });

  const form = useForm<NewReviewInput>({
    resolver: zodResolver(newReviewSchema),
    defaultValues: {
      bookingId: '',
      ratings:   { overall: 0 },
      title:     '',
      body:      '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: NewReviewInput) => api.reviews.create(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REVIEW_KEYS.list() });
      toast('Review submitted. Thank you!', 'success');
      setView('list');
      form.reset();
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        err.fields?.forEach((f) => {
          form.setError(f.field as keyof NewReviewInput, { message: f.message });
        });
      } else {
        setFormError(err.message ?? 'Submission failed. Please try again.');
      }
    },
  });

  const bookingList = (bookings as Record<string,unknown>[] | undefined) ?? [];
  // Only show past / checked-out bookings
  const reviewableBookings = bookingList.filter((b) => {
    const bk = b as Record<string,unknown>;
    return ['checked_out','completed'].includes(bk['status'] as string);
  });

  // ── Write review form ───────────────────────────────────────────────────────
  if (view === 'new') {
    const overallRating = form.watch('ratings.overall') ?? 0;

    return (
      <div data-page>
        <button type="button" onClick={() => setView('list')}
          style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', color:'var(--color-text-secondary)', fontSize:'var(--text-sm)', marginBottom:'var(--space-4)', cursor:'pointer' }}>
          <Icons.ChevronLeft size={16} /> Back to reviews
        </button>

        <h1 data-page-title>Write a review</h1>
        <p data-page-subtitle>Share your experience to help other guests.</p>

        <form onSubmit={form.handleSubmit((v) => void createMutation.mutate(v))} noValidate
          style={{ display:'flex', flexDirection:'column', gap:'var(--space-6)', maxWidth:560 }}>

          {/* Booking selector */}
          <div data-form-group>
            <label htmlFor="rv-booking">Which stay are you reviewing? *</label>
            <select id="rv-booking" {...form.register('bookingId')}>
              <option value="">Select a stay…</option>
              {reviewableBookings.map((b) => {
                const bk = b as Record<string,unknown>;
                const date = new Date(bk['checkIn'] as string).toLocaleDateString('en-ZA', { month:'short', year:'numeric' });
                return (
                  <option key={bk['_id'] as string} value={bk['_id'] as string}>
                    {bk['propertyName'] as string} — {date}
                  </option>
                );
              })}
              {reviewableBookings.length === 0 && (
                <option disabled>No completed stays found</option>
              )}
            </select>
            <InlineError message={form.formState.errors.bookingId?.message} />
          </div>

          {/* Overall rating — required */}
          <div>
            <label style={{ display:'block', fontSize:'var(--text-sm)', fontWeight:'var(--font-medium)', marginBottom:'var(--space-3)' }}>
              Overall rating *
            </label>
            <StarRating size={36}
              value={overallRating}
              onChange={(n) => form.setValue('ratings.overall', n)} />
            {overallRating > 0 && (
              <span style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', marginTop:'var(--space-2)', display:'block' }}>
                {['','Poor','Below average','Average','Good','Excellent'][overallRating]}
              </span>
            )}
            <InlineError message={form.formState.errors.ratings?.overall?.message} />
          </div>

          {/* Category ratings — optional */}
          <div data-card-padded>
            <h3 style={{ fontSize:'var(--text-sm)', fontWeight:'var(--font-semibold)', marginBottom:'var(--space-4)' }}>
              Rate specific aspects (optional)
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
              {RATING_CATEGORIES.map((cat) => {
                const val = form.watch(`ratings.${cat.key}` as 'ratings.cleanliness') ?? 0;
                return (
                  <div key={cat.key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)' }}>{cat.label}</span>
                    <StarRating size={20}
                      value={val}
                      onChange={(n) => form.setValue(`ratings.${cat.key}` as 'ratings.cleanliness', n)} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review title */}
          <div data-form-group>
            <label htmlFor="rv-title">Title (optional)</label>
            <input id="rv-title" type="text" maxLength={200} placeholder="Summarise your stay in one line" {...form.register('title')} />
          </div>

          {/* Review body */}
          <div data-form-group>
            <label htmlFor="rv-body">Your review *</label>
            <textarea id="rv-body" rows={6}
              placeholder="What did you love? What could be improved? Other guests appreciate honest, detailed reviews."
              {...form.register('body')} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'var(--text-xs)', color:'var(--color-text-muted)', marginTop:'var(--space-1)' }}>
              <InlineError message={form.formState.errors.body?.message} />
              <span>{(form.watch('body') ?? '').length} / 3000</span>
            </div>
          </div>

          {formError && <span role="alert" data-form-error>{formError}</span>}

          <p style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)' }}>
            Reviews are published publicly and cannot be edited after submission. By submitting, you confirm the review reflects your genuine experience.
          </p>

          <div style={{ display:'flex', gap:'var(--space-3)' }}>
            <button type="button" data-btn-ghost onClick={() => setView('list')}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending} style={{ flex:1 }}>
              {createMutation.isPending ? 'Submitting…' : 'Submit review'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Review list ─────────────────────────────────────────────────────────────
  const all = (reviews as Record<string,unknown>[] | undefined) ?? [];

  return (
    <div data-page>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'var(--space-3)', marginBottom:'var(--space-6)' }}>
        <div>
          <h1 data-page-title>Reviews</h1>
          <p data-page-subtitle>Reviews you have written about your stays</p>
        </div>
        <button type="button" data-btn-primary onClick={() => setView('new')} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Icons.Plus size={16} /> Write a review
        </button>
      </div>

      {isLoading ? <SkeletonLoader rows={4} /> : all.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="After a completed stay, you can write a review to share your experience."
          action={<button type="button" data-btn-primary onClick={() => setView('new')}>Write a review</button>}
        />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
          {all.map((item) => {
            const r       = item as Record<string,unknown>;
            const ratings = r['ratings'] as Record<string,number> | undefined;
            const status  = (r['status'] as string) ?? 'pending';
            const date    = new Date(r['createdAt'] as string).toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' });
            const title   = r['title'] as string | undefined;
            const reply   = r['reply'] as string | undefined;
            return (
              <div key={r['_id'] as string} data-card-padded>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'var(--space-3)', flexWrap:'wrap', gap:'var(--space-2)' }}>
                  <div>
                    <div style={{ fontWeight:'var(--font-bold)', fontSize:'var(--text-base)' }}>
                      {r['propertyName'] as string ?? 'Property'}
                    </div>
                    <div style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)', marginTop:2 }}>{date}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
                    <span style={{ display: 'flex' }}>
                      <StarDisplay value={ratings?.['overall'] ?? 0} size={18} />
                    </span>
                    <span data-status-badge data-status={status==='approved'?'confirmed':status}
                      style={{ fontSize:'var(--text-xs)' }}>
                      {status==='approved'?'Published':status==='pending'?'Under review':'Rejected'}
                    </span>
                  </div>
                </div>

                {title && (
                  <div style={{ fontWeight:'var(--font-semibold)', fontSize:'var(--text-sm)', marginBottom:'var(--space-2)' }}>
                    {title}
                  </div>
                )}

                <p style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', lineHeight:'var(--leading-relaxed)' }}>
                  {r['body'] as string}
                </p>

                {/* Category breakdown */}
                {ratings && Object.keys(ratings).length > 1 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'var(--space-4)', marginTop:'var(--space-4)', paddingTop:'var(--space-4)', borderTop:'1px solid var(--color-border)' }}>
                    {RATING_CATEGORIES.filter((cat) => ratings[cat.key]).map((cat) => (
                      <div key={cat.key} style={{ fontSize:'var(--text-xs)', color:'var(--color-text-secondary)' }}>
                        {cat.label}: <StarDisplay value={ratings[cat.key] ?? 0} size={12} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Property response */}
                {reply && (
                  <div style={{ marginTop:'var(--space-4)', padding:'var(--space-4)', background:'var(--color-surface-muted)', borderRadius:'var(--radius-md)', borderLeft:'3px solid var(--color-primary)' }}>
                    <div style={{ fontSize:'var(--text-xs)', fontWeight:'var(--font-semibold)', color:'var(--color-primary)', marginBottom:'var(--space-2)' }}>
                      Response from the property
                    </div>
                    <p style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', lineHeight:'var(--leading-relaxed)' }}>
                      {reply}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
