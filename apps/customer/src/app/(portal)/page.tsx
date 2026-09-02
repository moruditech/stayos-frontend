'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, Icons } from '@stayos/ui';
import { bookingKeys, loyaltyKeys, accommodationKeys, profileKeys } from '@/lib/query-keys';
import { GuestsRoomsField, type GuestsRoomsValue } from '@/components/GuestsRoomsField';

const LOYALTY_TIERS = [
  { id: 'silver',   label: 'Silver' },
  { id: 'gold',     label: 'Gold' },
  { id: 'platinum', label: 'Platinum' },
];

// ── Search widget state ───────────────────────────────────────────────────
type SearchTab = 'stays' | 'student';

export default function DashboardPage(): React.ReactElement {
  const session   = useSession();
  const router    = useRouter();
  const [tab, setTab]           = useState<SearchTab>('stays');
  const [destination, setDest]  = useState('');
  const [checkIn, setCheckIn]   = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestsRooms, setGuestsRooms] = useState<GuestsRoomsValue>({ guests: 1, rooms: 1 });

  // Upcoming bookings
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: bookingKeys.list(),
    queryFn:  () => api.customer.listBookings(),
    enabled:  !!session,
  });

  // Loyalty balance
  const { data: loyalty } = useQuery({
    queryKey: loyaltyKeys.balance(),
    queryFn:  () => api.customer.getLoyalty(),
    enabled:  !!session,
  });

  // Featured recommendations
  const { data: featured } = useQuery({
    queryKey: accommodationKeys.list({ featured: true }),
    queryFn:  () => api.discovery.getFeatured(),
  });

  // Profile — for the "Welcome back, {name}" greeting
  const { data: profile } = useQuery({
    queryKey: profileKeys.me(),
    queryFn:  () => api.customer.getMe(),
    enabled:  !!session,
  });

  const upcomingBooking = (bookings as Record<string, unknown>[] | undefined)
    ?.find((b) => (b['status'] as string) === 'confirmed');

  function handleSearch(): void {
    const params = new URLSearchParams();
    if (destination) params.set('city', destination);
    if (checkIn)     params.set('checkIn', checkIn);
    if (checkOut)    params.set('checkOut', checkOut);
    params.set('guests', String(guestsRooms.guests));
    params.set('rooms', String(guestsRooms.rooms));
    router.push(`/accommodation?${params.toString()}`);
  }

  const firstName = (profile as Record<string, unknown> | undefined)?.['firstName'] as string ?? '';

  const quickActions = [
    { label: 'My bookings',  icon: Icons.Calendar,   tint: 'success', path: '/bookings' },
    { label: 'Make payment', icon: Icons.CreditCard, tint: 'info',    path: '/payments' },
    { label: 'My invoices',  icon: Icons.FileText,   tint: 'warning', path: '/invoices' },
    { label: 'Saved places', icon: Icons.Heart,      tint: 'sand',  path: '/wishlist' },
    { label: 'Support',      icon: Icons.Headphones, tint: undefined, path: '/support' },
  ];

  return (
    <div data-page>
      {/* ── Hero welcome + search ─────────────────────────────────────── */}
      <div data-dashboard-hero>
        <div data-dashboard-hero-text>
          <h1 data-welcome-heading>
            Welcome back{firstName ? ',' : '.'}<br />
            {firstName && <span data-name-accent>{firstName}.</span>}
          </h1>
          <p data-welcome-tagline>
            Plan your next stay, manage bookings and more — all in one place.
          </p>
        </div>
        {/* Image placeholder — add /images/customer-dashboard-hero.jpg */}
        <div data-dashboard-hero-image aria-hidden="true">
          <img
            src="/images/customer-dashboard-hero.jpg"
            alt=""
            loading="eager"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      </div>

      {/* ── Search widget ─────────────────────────────────────────────── */}
      <div data-search-widget>
        <div data-search-tabs role="tablist">
          {(['stays', 'student'] as SearchTab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              data-search-tab
              data-active={tab === t ? '' : undefined}
              onClick={() => setTab(t)}
            >
              {t === 'stays' ? 'Find a place to stay' : 'Continue your search'}
            </button>
          ))}
        </div>

        <div data-search-fields>
          <div data-search-field data-search-location>
            <label htmlFor="dest">Where are you going?</label>
            <div data-search-location-input>
              <Icons.MapPin size={16} aria-hidden="true" />
              <input
                id="dest"
                type="text"
                placeholder="City, neighbourhood or property"
                value={destination}
                onChange={(e) => setDest(e.target.value)}
              />
            </div>
          </div>
          <div data-search-fields-row>
            <div data-search-field>
              <label htmlFor="checkin">Check-in</label>
              <input
                id="checkin"
                type="date"
                value={checkIn}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </div>
            <div data-search-field>
              <label htmlFor="checkout">Check-out</label>
              <input
                id="checkout"
                type="date"
                value={checkOut}
                min={checkIn || new Date().toISOString().split('T')[0]}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </div>
            <GuestsRoomsField value={guestsRooms} onChange={setGuestsRooms} />
          </div>
        </div>

        <button
          type="button"
          data-btn-primary
          data-btn-full
          onClick={handleSearch}
          style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}
        >
          Search accommodation <Icons.Search size={18} />
        </button>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      <div data-section-header>
        <span data-section-title>Quick actions</span>
        <Link href="/accommodation" data-section-link>View all →</Link>
      </div>
      <div data-quick-actions>
        {quickActions.map((a) => (
          <Link key={a.label} href={a.path} data-quick-action>
            <span data-quick-action-icon data-tint={a.tint} aria-hidden="true"><a.icon size={20} /></span>
            <span>{a.label}</span>
          </Link>
        ))}
      </div>

      {/* ── Upcoming stay ─────────────────────────────────────────────── */}
      <div data-section-header>
        <span data-section-title>Upcoming stay</span>
        <Link href="/bookings" data-section-link>View all bookings →</Link>
      </div>

      {bookingsLoading ? (
        <SkeletonLoader rows={3} />
      ) : upcomingBooking ? (
        <UpcomingBookingCard booking={upcomingBooking as Record<string, unknown>} />
      ) : (
        <EmptyState
          title="No upcoming stays"
          description="Find your next accommodation and make a booking."
          action={
            <Link href="/accommodation" data-btn-primary>Find accommodation</Link>
          }
        />
      )}

      {/* ── Loyalty summary ───────────────────────────────────────────── */}
      {loyalty && (
        <Link href="/loyalty" style={{ display: 'block', textDecoration: 'none', margin: 'var(--space-6) 0' }}>
          <div data-loyalty-summary-card>
            <Icons.ShieldCheck size={140} aria-hidden="true" data-loyalty-watermark />
            <div data-loyalty-hero-header>
              <span data-loyalty-member-badge>
                <Icons.Medal size={14} aria-hidden="true" />
                {(loyalty as Record<string, unknown>)['tier'] as string ?? 'Member'} Member
              </span>
              <span data-loyalty-view-link>View loyalty <Icons.ArrowRight size={14} /></span>
            </div>
            <div data-loyalty-label>Q Points balance</div>
            <div data-loyalty-balance>
              {((loyalty as Record<string, unknown>)['points'] as number ?? 0).toLocaleString()}
              <Icons.Star size={22} style={{ marginLeft: 'var(--space-2)', color: 'var(--color-warning)' }} />
              <span data-loyalty-balance-label>Q Points</span>
            </div>
            <div data-loyalty-tier>
              {(loyalty as Record<string, unknown>)['pointsToNextTier'] as number ?? 0} points to{' '}
              {(() => {
                const tierId = ((loyalty as Record<string, unknown>)['tier'] as string ?? 'silver').toLowerCase();
                const idx = LOYALTY_TIERS.findIndex((t) => t.id === tierId);
                return LOYALTY_TIERS[idx + 1]?.label ?? 'top tier';
              })()}
            </div>
            <div data-loyalty-progress-bar>
              <div
                data-loyalty-progress-fill
                style={{
                  width: `${Math.min(((loyalty as Record<string, unknown>)['tierProgress'] as number ?? 0), 100)}%`,
                }}
              />
            </div>
          </div>
        </Link>
      )}

      {/* ── Recommended properties ────────────────────────────────────── */}
      {(featured as unknown[])?.length ? (
        <>
          <div data-section-header>
            <span data-section-title>Recommended for you</span>
            <Link href="/accommodation" data-section-link>View all →</Link>
          </div>
          <div data-horizontal-scroll>
            {(featured as Record<string, unknown>[]).slice(0, 6).map((p) => (
              <div key={p['_id'] as string} data-horizontal-scroll-item>
                <PropertyCard property={p} />
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* Member deals callout */}
      <div
        data-support-callout
        style={{ marginTop: 'var(--space-6)', background: 'var(--color-primary-tint)', position: 'relative', overflow: 'hidden' }}
      >
        <Icons.Tag size={90} aria-hidden="true" style={{ position: 'absolute', right: '-16px', bottom: '-16px', color: 'var(--color-primary)', opacity: 0.08, pointerEvents: 'none' }} />
        <div data-support-callout-text>
          <span data-support-callout-icon aria-hidden="true"><Icons.Tag size={20} /></span>
          <div>
            <strong>Exclusive member deals</strong>
            <p>Unlock special rates and save more on your next stay.</p>
          </div>
        </div>
        <Link href="/accommodation?deals=true" data-btn-secondary style={{ position: 'relative' }}>Explore deals →</Link>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function UpcomingBookingCard({ booking }: { booking: Record<string, unknown> }): React.ReactElement {
  const checkIn = new Date(booking['checkIn'] as string);
  const day     = checkIn.getDate();
  const month   = checkIn.toLocaleString('default', { month: 'short' }).toUpperCase();

  const daysUntil = Math.ceil(
    (checkIn.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div data-booking-card style={{ marginBottom: 'var(--space-4)' }}>
      <Link href={`/bookings/${booking['_id'] as string}`} data-booking-card-top>
        <div data-booking-card-image>
          {/* Property image — /images/properties/[propertyId].jpg */}
          <img
            src={`/images/properties/${booking['tenantId'] as string}.jpg`}
            alt=""
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span data-booking-status-badge>
            <span data-status-badge data-status="confirmed">Confirmed</span>
          </span>
          <div data-booking-date-badge>
            <span data-booking-date-day>{day}</span>
            <span data-booking-date-month>{month}</span>
          </div>
        </div>

        <div data-booking-card-body>
          <div data-booking-card-name>
            {(booking['propertyName'] as string) ?? 'Property'}
          </div>
          <div data-booking-card-meta>
            <Icons.MapPin size={14} />
            {(booking['propertyCity'] as string) ?? '—'}
          </div>
          <div data-booking-card-meta>
            <Icons.Calendar size={14} /> Booking #{booking['confirmationNumber'] as string ?? '—'}
          </div>
        </div>
      </Link>

      <div data-booking-card-footer data-stacked>
        {daysUntil > 0 && (
          <span data-checkin-countdown>Check-in in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</span>
        )}
        <div data-booking-card-actions>
          <div data-booking-card-actions-left>
            <Link href={`/bookings/${booking['_id'] as string}`} data-btn-secondary>View booking</Link>
            <button type="button" data-btn-icon-square aria-label="More options">
              <Icons.MoreHorizontal size={16} />
            </button>
          </div>
          <div data-booking-total>
            <div data-booking-total-label>Total</div>
            <div data-booking-total-amount>
              R{((booking['totalAmount'] as number) ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PropertyCard({ property }: { property: Record<string, unknown> }): React.ReactElement {
  return (
    <Link href={`/accommodation/${property['slug'] as string}`} data-property-card style={{ textDecoration: 'none' }}>
      <div data-property-card-image>
        {/* /images/properties/[slug]-thumb.jpg */}
        <img
          src={`/images/properties/${property['slug'] as string}-thumb.jpg`}
          alt={property['name'] as string}
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <span data-property-type-badge>{(property['type'] as string)?.replace('_', ' ')}</span>
        <button
          type="button"
          data-property-card-wishlist
          aria-label={`Save ${property['name'] as string}`}
          onClick={(e) => e.preventDefault()}
        >
          <Icons.Heart size={16} />
        </button>
      </div>
      <div data-property-card-body>
        <div data-property-card-header>
          <span data-property-card-name>{property['name'] as string}</span>
          {(property['rating'] as number) ? (
            <span data-property-card-rating>
              <Icons.Star size={14} fill="currentColor" /> {(property['rating'] as number).toFixed(1)}
              {(property['reviewCount'] as number) ? ` (${property['reviewCount'] as number})` : ''}
            </span>
          ) : null}
        </div>
        <div data-property-card-location>
          <Icons.MapPin size={14} /> {property['city'] as string ?? '—'}
        </div>
        <div data-property-card-pricing>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>From</div>
            <span data-property-rate>R{(property['baseRate'] as number ?? 0).toLocaleString()}</span>
            <span data-property-rate-label> / night</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
