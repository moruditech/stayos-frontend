'use client';
import Link from 'next/link';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, Icons, type LucideIcon } from '@stayos/ui';
import { accommodationKeys } from '@/lib/query-keys';
import { GuestsRoomsField, type GuestsRoomsValue } from '@/components/GuestsRoomsField';

type StayMode = 'stays' | 'student' | 'long_term';
const STAY_MODES: { id: StayMode; label: string; icon: LucideIcon }[] = [
  { id: 'stays',      label: 'Stays',            icon: Icons.Bed },
  { id: 'student',    label: 'Student Housing',  icon: Icons.GraduationCap },
  { id: 'long_term',  label: 'Long Term',        icon: Icons.Building2 },
];

type CategoryTab = 'all' | 'hotels' | 'guesthouses' | 'apartments';
const CATS: { id: CategoryTab; label: string; icon: LucideIcon }[] = [
  { id: 'all',         label: 'All',         icon: Icons.LayoutGrid },
  { id: 'hotels',      label: 'Hotels',      icon: Icons.Bed },
  { id: 'guesthouses', label: 'Guesthouses', icon: Icons.Home },
  { id: 'apartments',  label: 'Apartments',  icon: Icons.Building2 },
];

const TYPE_MAP: Record<CategoryTab, string[]> = {
  all:         [],
  hotels:      ['hotel', 'boutique_hotel'],
  guesthouses: ['guesthouse', 'bed_and_breakfast'],
  apartments:  ['apartment', 'villa', 'rental'],
};
const MODE_TYPE_MAP: Record<StayMode, string[]> = {
  stays:      [],
  student:    ['student_housing'],
  long_term:  [], // Long-term (lease-based) stays are not yet implemented — see "Coming soon" state below.
};

export default function AccommodationPage(): React.ReactElement {
  const searchParams = useSearchParams();
  const [stayMode, setStayMode]   = useState<StayMode>('stays');
  const [category, setCategory] = useState<CategoryTab>('all');
  const [city, setCity]         = useState(searchParams.get('city') ?? '');
  const [checkIn, setCheckIn]   = useState(searchParams.get('checkIn') ?? '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') ?? '');
  const [guestsRooms, setGuestsRooms] = useState<GuestsRoomsValue>({
    guests: Number(searchParams.get('guests')) || 1,
    rooms:  Number(searchParams.get('rooms')) || 1,
  });
  const [editingSearch, setEditingSearch] = useState(false);

  // Long-term (lease-based) stays aren't built yet — don't hit the search
  // API for a mode that has no real backing data; show "Coming soon" instead.
  const isLongTermMode = stayMode === 'long_term';

  const filters: Record<string, string> = {};
  filters['guests'] = String(guestsRooms.guests);
  filters['rooms']  = String(guestsRooms.rooms);
  if (city)    filters['city']     = city;
  if (checkIn) filters['checkIn']  = checkIn;
  if (checkOut)filters['checkOut'] = checkOut;
  // The "Stays / Student Housing / Long Term" tabs set the broad market
  // segment; the category chips below further narrow "Stays" results by
  // property type. Student Housing bypasses the chip row entirely.
  if (stayMode === 'student') {
    filters['types'] = MODE_TYPE_MAP.student.join(',');
  } else if (stayMode === 'stays' && category !== 'all') {
    filters['types'] = TYPE_MAP[category].join(',');
  }

  const { data: results, isLoading } = useQuery({
    queryKey: accommodationKeys.list(filters),
    queryFn:  () => api.discovery.searchProperties(filters),
    enabled:  !isLongTermMode,
  });

  const { data: featured } = useQuery({
    queryKey: accommodationKeys.list({}),
    queryFn:  () => api.discovery.getFeatured(),
    enabled:  !city && !isLongTermMode,
  });

  const properties = (results as Record<string, unknown>[] | undefined) ?? (featured as Record<string, unknown>[] | undefined) ?? [];

  return (
    <div data-search-page>
      <h1 data-page-title>Accommodation</h1>
      <p data-page-subtitle>Find the perfect place to stay</p>

      {/* Search summary / edit bar */}
      {city ? (
        <div data-search-summary onClick={() => setEditingSearch(true)}>
          <div data-search-summary-text>
            <span data-search-summary-location><Icons.MapPin size={14} /> {city}</span>
            <span data-search-summary-dates>
              {checkIn && checkOut ? `${checkIn} – ${checkOut} · ` : ''}{guestsRooms.guests} Guest{guestsRooms.guests !== 1 ? 's' : ''}, {guestsRooms.rooms} Room{guestsRooms.rooms !== 1 ? 's' : ''}
            </span>
          </div>
          <span style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            Edit <Icons.Pencil size={14} />
          </span>
        </div>
      ) : null}

      {/* Inline search (shown when editing or no city) */}
      {(!city || editingSearch) && (
        <div data-search-widget style={{ marginBottom: 'var(--space-4)' }}>
          <div data-stay-mode-tabs>
            {STAY_MODES.map((m) => (
              <button key={m.id} type="button"
                data-stay-mode-tab
                data-active={stayMode === m.id ? '' : undefined}
                onClick={() => setStayMode(m.id)}>
                <m.icon size={16} /> {m.label}
                {m.id === 'long_term' && <span data-badge-soon>Soon</span>}
              </button>
            ))}
          </div>
          <div data-search-fields>
            <div data-search-field data-search-location>
              <label htmlFor="city">Where are you going?</label>
              <div data-search-location-input>
                <Icons.MapPin size={16} aria-hidden="true" />
                <input id="city" type="text" placeholder="City or neighbourhood" value={city}
                  onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>
            <div data-search-fields-row>
              <div data-search-field>
                <label htmlFor="ci">Check-in</label>
                <input id="ci" type="date" value={checkIn}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div data-search-field>
                <label htmlFor="co">Check-out</label>
                <input id="co" type="date" value={checkOut}
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCheckOut(e.target.value)} />
              </div>
              <GuestsRoomsField value={guestsRooms} onChange={setGuestsRooms} />
            </div>
          </div>
          <button type="button" data-btn-primary data-btn-full style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}
            onClick={() => setEditingSearch(false)}>
            Search accommodation <Icons.Search size={18} />
          </button>
        </div>
      )}

      {/* Category chips — only relevant to "Stays" mode */}
      {stayMode === 'stays' && (
        <div data-filter-bar>
          {CATS.map((c) => (
            <button key={c.id} type="button" data-filter-chip
              data-active={category === c.id ? '' : undefined}
              onClick={() => setCategory(c.id)}>
              <c.icon size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />{c.label}
            </button>
          ))}
          <button type="button" data-filter-chip>
            <Icons.MoreHorizontal size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />More
          </button>
        </div>
      )}

      {isLongTermMode ? (
        <div data-card-padded style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            <Icons.Building2 size={40} />
          </div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
            Long Term stays — coming soon
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', maxWidth: '28rem', margin: '0 auto' }}>
            Lease-based long-term accommodation isn&apos;t available yet. Check back soon, or browse short-stay Hotels, Guesthouses and Apartments under the Stays tab.
          </p>
        </div>
      ) : (
        <>
          {/* Filter + sort row */}
          <div data-filter-bar style={{ marginBottom: 0 }}>
            <button type="button" data-filter-chip style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <Icons.SlidersHorizontal size={14} /> Filters {properties.length > 0 ? '1' : ''}
            </button>
            <button type="button" data-filter-chip>
              Sort <Icons.ChevronDown size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />
            </button>
            <button type="button" data-filter-chip>
              Price <Icons.ChevronDown size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />
            </button>
            <button type="button" data-filter-chip>
              Property type <Icons.ChevronDown size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />
            </button>
            <button type="button" data-filter-chip>
              Amenities <Icons.ChevronDown size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />
            </button>
          </div>

          {/* Results count */}
          <div data-results-header>
            <span data-results-count>
              <strong>{properties.length}</strong> properties found
            </span>
            <Link href="/accommodation?mapview=true" data-section-link style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <Icons.Map size={14} /> Map view
            </Link>
          </div>

          {/* Results */}
          {isLoading ? (
            <SkeletonLoader rows={4} />
          ) : properties.length === 0 ? (
            <EmptyState title="No properties found"
              description="Try a different location, date range, or remove some filters." />
          ) : (
            <div data-property-list>
              {properties.map((p) => (
                <PropertySearchCard key={p['_id'] as string} property={p} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Member CTA */}
      <div data-support-callout style={{ marginTop: 'var(--space-6)' }}>
        <div data-support-callout-text>
          <span data-support-callout-icon aria-hidden="true"><Icons.Tag size={20} /></span>
          <div>
            <strong>Unlock member rates</strong>
            <p>Sign in to access exclusive deals and save more on your next stay.</p>
          </div>
        </div>
        <Link href="/login" data-btn-primary style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Icons.User size={16} /> Sign in / Register
        </Link>
      </div>

      {/* Explore by category */}
      <div data-section-header style={{ marginTop: 'var(--space-6)' }}>
        <span data-section-title>Explore by category</span>
        <Link href="/accommodation" data-section-link>View all →</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
        {[
          { label: 'Beachfront',      icon: Icons.Palmtree, type: 'beachfront' },
          { label: 'Pet Friendly',    icon: Icons.PawPrint, type: 'pet_friendly' },
          { label: 'Family Friendly', icon: Icons.Users,    type: 'family' },
          { label: 'Business Stay',   icon: Icons.Briefcase,type: 'business' },
        ].map((c) => (
          <Link key={c.label} href={`/accommodation?amenity=${c.type}`} data-card
            style={{ padding: 'var(--space-4)', textAlign: 'center', textDecoration: 'none', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--color-primary)', marginBottom: 'var(--space-2)' }}><c.icon size={28} /></div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{c.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PropertySearchCard({ property: p }: { property: Record<string, unknown> }): React.ReactElement {
  const rating = p['rating'] as number | undefined;
  const reviews = p['reviewCount'] as number | undefined;
  const rate = p['baseRate'] as number | undefined;
  const discountPercent = p['discountPercent'] as number | undefined;
  const freeCancellation = p['freeCancellation'] as boolean | undefined;
  const breakfastIncluded = p['breakfastIncluded'] as boolean | undefined;

  return (
    <Link href={`/accommodation/${p['slug'] as string}`} data-property-card data-property-list-item
      style={{ textDecoration: 'none' }}>
      <div data-property-card-image>
        {/* Image path: /images/properties/[slug]-main.jpg */}
        <img src={`/images/properties/${p['slug'] as string}-main.jpg`} alt={p['name'] as string}
          loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span data-property-type-badge>{(p['type'] as string)?.replace(/_/g, ' ')}</span>
        <button type="button" data-property-card-wishlist aria-label="Save" onClick={(e) => e.preventDefault()}><Icons.Heart size={16} /></button>
        {discountPercent && (
          <span data-property-card-discount>{discountPercent}% OFF</span>
        )}
      </div>
      <div data-property-card-body>
        <div data-property-card-header>
          <span data-property-card-name>{p['name'] as string}</span>
          {rating && (
            <span data-property-card-rating><Icons.Star size={14} fill="currentColor" /> {rating.toFixed(1)} ({reviews})</span>
          )}
        </div>
        <div data-property-card-location>
          <Icons.MapPin size={14} /> {p['city'] as string} · {p['distanceFromCentre'] as string ?? '—'} km from centre
        </div>
        <div data-property-card-amenities>
          {((p['amenities'] as string[]) ?? []).slice(0, 3).map((a) => (
            <span key={a} data-amenity-tag><Icons.Wifi size={12} /> {a}</span>
          ))}
        </div>
        {freeCancellation && (
          <span data-property-tag="free_cancellation">Free cancellation</span>
        )}
        {breakfastIncluded && (
          <span data-property-tag="breakfast">Breakfast included</span>
        )}
        <div data-property-card-pricing>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>From</div>
            <span data-property-rate>R{(rate ?? 0).toLocaleString()}</span>
            <span data-property-rate-label> / night</span>
          </div>
          <button type="button" data-btn-primary style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}>
            View details
          </button>
        </div>
      </div>
    </Link>
  );
}
