'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, ConfirmDialog, useToast, Icons, type LucideIcon } from '@stayos/ui';
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
          { label: 'Contact property', icon: Icons.MessageCircle, tint: 'sand',    path: '/support' },
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

// ─── Booking card ─────────────────────────────────────────────────────────────

function BookingCard({ booking }: { booking: Record<string, unknown> }): React.ReactElement {
  const qc          = useQueryClient();
  const { toast }   = useToast();
  const [menuOpen, setMenuOpen]     = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [menuPos, setMenuPos]       = useState<{ top: number; left: number; visible: boolean }>({ top: 0, left: 0, visible: false });
  const moreRef   = useRef<HTMLButtonElement>(null);
  const menuRef   = useRef<HTMLDivElement>(null);

  const bookingId = booking['_id'] as string;
  const status    = booking['status'] as string;

  // Backend populates tenantId → { name, slug, coverImage, address: { city } }
  // and roomId → { roomNumber, type }
  const tenant     = (typeof booking['tenantId'] === 'object' && booking['tenantId'] !== null
    ? booking['tenantId'] : {}) as Record<string, unknown>;
  const room       = (typeof booking['roomId'] === 'object' && booking['roomId'] !== null
    ? booking['roomId'] : {}) as Record<string, unknown>;
  const address    = (typeof tenant['address'] === 'object' && tenant['address'] !== null
    ? tenant['address'] : {}) as Record<string, unknown>;

  const propertyName  = (tenant['name']        as string)  ?? 'Property';
  const propertyCity  = (address['city']        as string)  ?? null;
  const coverImage    = (tenant['coverImage']   as string)  ?? null;
  const slug          = (tenant['slug']         as string)  ?? null;
  const roomType      = formatRoomType(room['type'] as string | undefined);

  const checkIn   = new Date(booking['checkIn'] as string);
  const checkOut  = new Date(booking['checkOut'] as string);
  const day       = checkIn.getDate();
  const month     = checkIn.toLocaleString('default', { month: 'short' }).toUpperCase();
  const daysUntil = Math.ceil((checkIn.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isUpcoming = ['confirmed', 'pending_confirmation'].includes(status) && daysUntil > 0;

  const cancelMutation = useMutation({
    mutationFn: () => api.customer.cancelBooking(bookingId, 'Cancelled by guest via app'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.list() });
      toast('Booking cancelled.', 'success');
      setCancelOpen(false);
    },
    onError: (err: ApiError) => {
      toast(err.message ?? 'Cancellation failed.', 'error');
      setCancelOpen(false);
    },
  });

  // Portal menu positioning — same pattern as FilterDropdown
  useEffect(() => {
    if (!menuOpen) { setMenuPos((p) => ({ ...p, visible: false })); return; }
    const place = (clamp: boolean) => {
      const rect = moreRef.current?.getBoundingClientRect();
      if (!rect) return;
      const margin = 12;
      let left = rect.right;
      if (clamp) {
        const w = menuRef.current?.offsetWidth ?? 180;
        if (left + w > window.innerWidth - margin) left = Math.max(margin, rect.left - w);
      }
      setMenuPos({ top: rect.bottom + 6, left, visible: clamp });
    };
    place(false);
    const raf = requestAnimationFrame(() => place(true));
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (moreRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key); };
  }, [menuOpen]);

  const MENU_ITEMS = [
    { label: 'View details',     icon: Icons.Eye,            action: 'view' },
    ...(isUpcoming ? [{ label: 'Cancel booking', icon: Icons.X, action: 'cancel' }] : []),
    { label: 'Contact property', icon: Icons.MessageCircle,  action: 'contact' },
    { label: 'View invoice',     icon: Icons.FileText,       action: 'invoice' },
  ];

  return (
    <>
      <div data-booking-card style={{ position: 'relative' }}>
        <Link href={`/bookings/${bookingId}`} data-booking-card-top style={{ textDecoration: 'none', color: 'inherit' }}>
          <div data-booking-card-image>
            {coverImage ? (
              <img src={coverImage} alt={propertyName} loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : slug ? (
              <img src={`/images/properties/${slug}-thumb.jpg`} alt={propertyName} loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : null}
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
              {propertyName}
            </div>
            {propertyCity && (
              <div data-booking-card-meta><Icons.MapPin size={14} />{propertyCity}</div>
            )}
            <div data-booking-card-meta>
              <Icons.Calendar size={14} />
              {checkIn.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
              {' – '}
              {checkOut.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}{(booking['adults'] as number) ?? 1} Adult{(booking['adults'] as number) !== 1 ? 's' : ''}
            </div>
            {roomType && (
              <div data-booking-card-meta><Icons.Bed size={14} />{roomType}</div>
            )}
            <div data-booking-card-meta style={{ fontFamily: 'monospace', fontSize: '12px' }}>
              Booking #{(booking['confirmationNumber'] as string) ?? '—'}
            </div>
          </div>
        </Link>

        {/* ••• action button */}
        <button
          type="button"
          ref={moreRef}
          data-btn-icon-square
          aria-label="More options"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          data-booking-card-more
          onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
        >
          <Icons.MoreHorizontal size={16} />
        </button>

        <div data-booking-card-footer>
          {daysUntil > 0 && status === 'confirmed' && (
            <span data-checkin-countdown>Check-in in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</span>
          )}
          <div data-booking-total-group>
            <div data-booking-total>
              <div data-booking-total-label>Total</div>
              <div data-booking-total-amount>R{((booking['totalAmount'] as number) ?? 0).toLocaleString()}</div>
            </div>
            <Icons.ChevronRight size={18} data-booking-total-chevron />
          </div>
        </div>
      </div>

      {/* Portaled action menu */}
      {menuOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            opacity: menuPos.visible ? 1 : 0,
            minWidth: '180px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-raised)',
            zIndex: 300,
            overflow: 'hidden',
          }}
        >
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const base: React.CSSProperties = {
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '10px 16px', fontSize: '13px',
              color: item.action === 'cancel' ? 'var(--color-danger)' : 'var(--color-text)',
              background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none',
            };
            if (item.action === 'view') return (
              <Link key={item.action} href={`/bookings/${bookingId}`} role="menuitem" style={base}
                onClick={() => setMenuOpen(false)}>
                <Icon size={15} /> {item.label}
              </Link>
            );
            if (item.action === 'contact') return (
              <Link key={item.action} href={`/support/new?ref=${bookingId}`} role="menuitem" style={base}
                onClick={() => setMenuOpen(false)}>
                <Icon size={15} /> {item.label}
              </Link>
            );
            if (item.action === 'invoice') return (
              <Link key={item.action} href={`/bookings/${bookingId}/folio`} role="menuitem" style={base}
                onClick={() => setMenuOpen(false)}>
                <Icon size={15} /> {item.label}
              </Link>
            );
            return (
              <button key={item.action} type="button" role="menuitem" style={base}
                onClick={() => { setMenuOpen(false); setCancelOpen(true); }}>
                <Icon size={15} /> {item.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel this booking?"
        message="This action cannot be undone. Cancellation fees may apply depending on the property's policy."
        confirmLabel={cancelMutation.isPending ? 'Cancelling…' : 'Yes, cancel booking'}
        cancelLabel="Keep booking"
        destructive
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setCancelOpen(false)}
      />
    </>
  );
}

// Room types come back from the API as lowercase enum values (e.g. 'single',
// 'deluxe') — display them Title Case, with a trailing "Room" if the value
// doesn't already read as a full room name.
function formatRoomType(type: string | undefined): string | null {
  if (!type) return null;
  const words = type.replace(/_/g, ' ').trim().split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return /room$/i.test(words) ? words : `${words} Room`;
}
