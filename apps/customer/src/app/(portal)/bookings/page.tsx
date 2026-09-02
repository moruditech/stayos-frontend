'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, Icons, type LucideIcon } from '@stayos/ui';
import { bookingKeys } from '@/lib/query-keys';

type Tab = 'upcoming' | 'past' | 'cancelled' | 'all';
const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'upcoming' as Tab,  label: 'Upcoming',  icon: Icons.CalendarCheck2 },
  { id: 'past' as Tab,      label: 'Past',      icon: Icons.Clock },
  { id: 'cancelled' as Tab, label: 'Cancelled', icon: Icons.XCircle },
  { id: 'all' as Tab,       label: 'All',       icon: Icons.List },
];
const STATUS_MAP: Record<Tab, string[]> = {
  upcoming:  ['confirmed', 'pending_confirmation'],
  past:      ['checked_out', 'completed'],
  cancelled: ['cancelled', 'no_show'],
  all:       [],
};

export default function BookingsPage(): React.ReactElement {
  const session = useSession();
  const [tab, setTab] = useState<Tab>('upcoming');

  const { data: bookings, isLoading } = useQuery({
    queryKey: bookingKeys.list(),
    queryFn:  () => api.customer.listBookings(),
    enabled:  !!session,
  });

  const all      = (bookings as Record<string, unknown>[] | undefined) ?? [];
  const filtered = tab === 'all' ? all : all.filter((b) => STATUS_MAP[tab].includes(b['status'] as string));
  const upcomingCount = all.filter((b) => STATUS_MAP.upcoming.includes(b['status'] as string)).length;

  return (
    <div data-page>
      <h1 data-page-title>My Bookings</h1>
      <p data-page-subtitle>View and manage all your stays</p>

      <div data-filter-tabs role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
            data-filter-tab data-active={tab === t.id ? '' : undefined} onClick={() => setTab(t.id)}>
            <t.icon size={16} aria-hidden="true" /> {t.label}
            {t.id === 'upcoming' && upcomingCount > 0 && (
              <span data-filter-tab-count>{upcomingCount}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? <SkeletonLoader rows={4} /> : filtered.length === 0 ? (
        <EmptyState title={`No ${tab} bookings`} description="When you make a booking it will appear here."
          action={tab === 'upcoming' ? <Link href="/accommodation" data-btn-primary>Find accommodation</Link> : undefined} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {filtered.map((b) => <BookingCard key={b['_id'] as string} booking={b} />)}
        </div>
      )}

      {tab === 'upcoming' && filtered.length > 0 && (
        <div data-support-callout style={{ marginTop: 'var(--space-6)' }}>
          <div data-support-callout-text>
            <span data-support-callout-icon aria-hidden="true"><Icons.Calendar size={20} /></span>
            <div>
              <strong>Need to make changes?</strong>
              <p>You can modify or cancel your booking before check-in.</p>
            </div>
          </div>
          <Link href="/bookings" data-btn-secondary style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            Manage booking <Icons.ArrowRight size={16} />
          </Link>
        </div>
      )}

      <div data-section-header style={{ marginTop: 'var(--space-6)' }}>
        <span data-section-title>Quick actions</span>
      </div>
      <div data-quick-actions>
        {[
          { label: 'Modify booking',   icon: Icons.CalendarClock, tint: 'success', path: '/bookings' },
          { label: 'Cancel booking',   icon: Icons.X,             tint: 'warning', path: '/bookings' },
          { label: 'Get invoice',      icon: Icons.FileText,      tint: 'info',    path: '/invoices' },
          { label: 'Contact property', icon: Icons.MessageCircle, tint: 'sand',  path: '/support' },
          { label: 'Add to calendar',  icon: Icons.Calendar,      tint: 'success', path: '/bookings' },
        ].map((a) => (
          <Link key={a.label} href={a.path} data-quick-action>
            <span data-quick-action-icon data-tint={a.tint} aria-hidden="true"><a.icon size={20} /></span>
            <span>{a.label}</span>
          </Link>
        ))}
      </div>

      <div data-support-callout style={{ marginTop: 'var(--space-6)', borderColor: 'var(--color-primary)' }}>
        <div data-support-callout-text>
          <span data-support-callout-icon style={{ background: 'var(--color-primary-tint)', color: 'var(--color-primary)' }} aria-hidden="true"><Icons.Crown size={20} /></span>
          <div>
            <strong style={{ color: 'var(--color-primary)' }}>Member benefit</strong>
            <p>As a Silver Member, you get free cancellation on most stays.</p>
          </div>
        </div>
        <Link href="/loyalty" data-btn-secondary style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          View benefits <Icons.ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: Record<string, unknown> }): React.ReactElement {
  const checkIn   = new Date(booking['checkIn'] as string);
  const checkOut  = new Date(booking['checkOut'] as string);
  const day       = checkIn.getDate();
  const month     = checkIn.toLocaleString('default', { month: 'short' }).toUpperCase();
  const daysUntil = Math.ceil((checkIn.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const status    = booking['status'] as string;

  return (
    <div data-booking-card style={{ position: 'relative' }}>
      <Link href={`/bookings/${booking['_id'] as string}`} data-booking-card-top style={{ textDecoration: 'none', color: 'inherit' }}>
        <div data-booking-card-image>
          {/* Image path: /images/properties/[tenantId]-thumb.jpg */}
          <img src={`/images/properties/${booking['tenantId'] as string}-thumb.jpg`} alt="" loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span data-booking-status-badge>
            <span data-status-badge data-status={status}>{status.replace(/_/g, ' ')}</span>
          </span>
          <div data-booking-date-badge>
            <span data-booking-date-day>{day}</span>
            <span data-booking-date-month>{month}</span>
          </div>
        </div>
        <div data-booking-card-body>
          <div data-booking-card-name>
            {(booking['propertyName'] as string) ?? 'Property'}
            <Icons.ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <div data-booking-card-meta><Icons.MapPin size={14} />{(booking['propertyCity'] as string) ?? '—'}</div>
          <div data-booking-card-meta>
            <Icons.Calendar size={14} />
            {checkIn.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
            {' – '}
            {checkOut.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' · '}{(booking['guests'] as number) ?? 1} Adult{(booking['guests'] as number) !== 1 ? 's' : ''}
          </div>
          <div data-booking-card-meta><Icons.Bed size={14} />{(booking['roomType'] as string) ?? '—'}</div>
          <div data-booking-card-meta style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            Booking #{(booking['confirmationNumber'] as string) ?? '—'}
          </div>
        </div>
      </Link>

      <button type="button" data-btn-icon-square aria-label="More options" data-booking-card-more>
        <Icons.MoreHorizontal size={16} />
      </button>

      <div data-booking-card-footer>
        {daysUntil > 0 && status === 'confirmed' && (
          <span data-checkin-countdown>Check-in in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</span>
        )}
        <div data-booking-total>
          <div data-booking-total-label>Total</div>
          <div data-booking-total-amount>R{((booking['totalAmount'] as number) ?? 0).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
