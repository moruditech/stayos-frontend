'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, Icons } from '@stayos/ui';
import { bookingKeys, loyaltyKeys, accommodationKeys, profileKeys } from '@/lib/query-keys';

// ── Search widget state ───────────────────────────────────────────────────
type SearchTab = 'stays' | 'student';

export default function DashboardPage(): React.ReactElement {
  const session   = useSession();
  const router    = useRouter();
  const [tab, setTab]           = useState<SearchTab>('stays');
  const [destination, setDest]  = useState('');
  const [checkIn, setCheckIn]   = useState('');
  const [checkOut, setCheckOut] = useState('');

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
    router.push(`/accommodation?${params.toString()}`);
  }

  const firstName = (profile as Record<string, unknown> | undefined)?.['firstName'] as string ?? '';

  const quickActions = [
    { label: 'My bookings',  icon: Icons.Calendar,   tint: 'success', path: '/bookings' },
    { label: 'Make payment', icon: Icons.CreditCard, tint: 'info',    path: '/payments' },
    { label: 'My invoices',  icon: Icons.FileText,   tint: 'warning', path: '/invoices' },
    { label: 'Saved places', icon: Icons.Heart,      tint: 'purple',  path: '/wishlist' },
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
            <input
              id="dest"
              type="text"
              placeholder="City, neighbourhood or property"
              value={destination}
              onChange={(e) => setDest(e.target.value)}
            />
          </div>
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
        </div>

        <button
          type="button"
          data-btn-primary
          data-btn-full
          onClick={handleSearch}
          style={{ marginTop: 'var(--space-4)' }}
        >
          Search accommodation
        </button>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      <div data-section-header>
        <span data-section-title>Quick actions</span>
        <a href="/accommodation" data-section-link>View all →</a>
      </div>
      <div data-quick-actions>
        {quickActions.map((a) => (
          <a key={a.label} href={a.path} data-quick-action>
            <span data-quick-action-icon data-tint={a.tint} aria-hidden="true"><a.icon size={20} /></span>
            <span>{a.label}</span>
          </a>
        ))}
      </div>

      {/* ── Upcoming stay ─────────────────────────────────────────────── */}
      <div data-section-header>
        <span data-section-title>Upcoming stay</span>
        <a href="/bookings" data-section-link>View all bookings →</a>
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
            <a href="/accommodation" data-btn-primary>Find accommodation</a>
          }
        />
      )}

      {/* ── Loyalty summary ───────────────────────────────────────────── */}
      {loyalty && (
        <a href="/loyalty" style={{ display: 'block', textDecoration: 'none', margin: 'var(--space-6) 0' }}>
          <div data-loyalty-hero>
            <div>
              <div data-loyalty-label>Q Points balance</div>
              <div data-loyalty-balance>
                {((loyalty as Record<string, unknown>)['points'] as number ?? 0).toLocaleString()}
                <Icons.Star size={22} style={{ marginLeft: 'var(--space-2)', color: 'var(--color-warning)' }} />
              </div>
              <div data-loyalty-tier>
                {(loyalty as Record<string, unknown>)['tier'] as string ?? 'Member'} •{' '}
                {(loyalty as Record<string, unknown>)['pointsToNextTier'] as number ?? 0} points to next tier
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
            <div data-loyalty-badge>
              <div data-loyalty-badge-icon aria-hidden="true"><Icons.Medal size={22} /></div>
              <div data-loyalty-badge-tier>
                {(loyalty as Record<string, unknown>)['tier'] as string ?? 'Member'}
              </div>
              <button type="button" data-loyalty-badge-btn>View loyalty →</button>
            </div>
          </div>
        </a>
      )}

      {/* ── Recommended properties ────────────────────────────────────── */}
      {(featured as unknown[])?.length ? (
        <>
          <div data-section-header>
            <span data-section-title>Recommended for you</span>
            <a href="/accommodation" data-section-link>View all →</a>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            {(featured as Record<string, unknown>[]).slice(0, 3).map((p) => (
              <PropertyCard key={p['_id'] as string} property={p} />
            ))}
          </div>
        </>
      ) : null}

      {/* Member deals callout */}
      <div
        data-support-callout
        style={{ marginTop: 'var(--space-6)', background: 'var(--color-primary-light)' }}
      >
        <div data-support-callout-text>
          <span data-support-callout-icon aria-hidden="true"><Icons.Tag size={20} /></span>
          <div>
            <strong>Exclusive member deals</strong>
            <p>Unlock special rates and save more on your next stay.</p>
          </div>
        </div>
        <a href="/accommodation?deals=true" data-btn-secondary>Explore deals →</a>
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
    <a
      href={`/bookings/${booking['_id'] as string}`}
      data-booking-card
      style={{ display: 'grid', marginBottom: 'var(--space-4)', textDecoration: 'none', color: 'inherit' }}
    >
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
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-lg)' }}>›</span>
        </div>
        <div data-booking-card-meta>
          <Icons.MapPin size={14} />
          {(booking['propertyCity'] as string) ?? '—'}
        </div>
        <div data-booking-card-meta>
          <Icons.Calendar size={14} /> Booking #{booking['confirmationNumber'] as string ?? '—'}
        </div>

        <div data-booking-card-footer>
          {daysUntil > 0 && (
            <span data-checkin-countdown>Check-in in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</span>
          )}
          <div data-booking-total>
            <div data-booking-total-label>Total</div>
            <div data-booking-total-amount>
              R{((booking['totalAmount'] as number) ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}

function PropertyCard({ property }: { property: Record<string, unknown> }): React.ReactElement {
  return (
    <a href={`/accommodation/${property['slug'] as string}`} data-property-card style={{ textDecoration: 'none' }}>
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
            </span>
          ) : null}
        </div>
        <div data-property-card-location>
          <Icons.MapPin size={14} /> {property['city'] as string ?? '—'}
        </div>
        <div data-property-card-pricing>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>From</div>
            <span data-property-rate>R{(property['baseRate'] as number ?? 0).toLocaleString()}</span>
            <span data-property-rate-label> / night</span>
          </div>
        </div>
      </div>
    </a>
  );
}
