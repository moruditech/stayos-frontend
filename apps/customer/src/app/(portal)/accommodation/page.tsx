'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState } from '@stayos/ui';
import { accommodationKeys } from '@/lib/query-keys';

type CategoryTab = 'all' | 'hotels' | 'guesthouses' | 'apartments' | 'student';
const CATS: { id: CategoryTab; label: string }[] = [
  { id: 'all',         label: 'All' },
  { id: 'hotels',      label: 'Hotels' },
  { id: 'guesthouses', label: 'Guesthouses' },
  { id: 'apartments',  label: 'Apartments' },
  { id: 'student',     label: 'Student Housing' },
];

const TYPE_MAP: Record<CategoryTab, string[]> = {
  all:         [],
  hotels:      ['hotel', 'boutique_hotel'],
  guesthouses: ['guesthouse', 'bed_and_breakfast'],
  apartments:  ['apartment', 'villa', 'rental'],
  student:     ['student_housing'],
};

export default function AccommodationPage(): React.ReactElement {
  const searchParams = useSearchParams();
  const [category, setCategory] = useState<CategoryTab>('all');
  const [city, setCity]         = useState(searchParams.get('city') ?? '');
  const [checkIn, setCheckIn]   = useState(searchParams.get('checkIn') ?? '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') ?? '');
  const [editingSearch, setEditingSearch] = useState(false);

  const filters: Record<string, string> = {};
  if (city)    filters['city']     = city;
  if (checkIn) filters['checkIn']  = checkIn;
  if (checkOut)filters['checkOut'] = checkOut;
  if (category !== 'all') filters['types'] = TYPE_MAP[category].join(',');

  const { data: results, isLoading } = useQuery({
    queryKey: accommodationKeys.list(filters),
    queryFn:  () => api.discovery.searchProperties(filters),
  });

  const { data: featured } = useQuery({
    queryKey: accommodationKeys.list({}),
    queryFn:  () => api.discovery.getFeatured(),
    enabled:  !city,
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
            <span data-search-summary-location>📍 {city}</span>
            <span data-search-summary-dates>
              {checkIn && checkOut ? `${checkIn} – ${checkOut} · ` : ''}2 Guests, 1 Room
            </span>
          </div>
          <span style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
            Edit ✏
          </span>
        </div>
      ) : null}

      {/* Inline search (shown when editing or no city) */}
      {(!city || editingSearch) && (
        <div data-search-widget style={{ marginBottom: 'var(--space-4)' }}>
          <div data-search-fields>
            <div data-search-field data-search-location>
              <label htmlFor="city">Where are you going?</label>
              <input id="city" type="text" placeholder="City or neighbourhood" value={city}
                onChange={(e) => setCity(e.target.value)} />
            </div>
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
          </div>
          <button type="button" data-btn-primary data-btn-full style={{ marginTop: 'var(--space-4)' }}
            onClick={() => setEditingSearch(false)}>
            Search accommodation 🔍
          </button>
        </div>
      )}

      {/* Category chips */}
      <div data-filter-bar>
        {CATS.map((c) => (
          <button key={c.id} type="button" data-filter-chip
            data-active={category === c.id ? '' : undefined}
            onClick={() => setCategory(c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Filter + sort row */}
      <div data-filter-bar style={{ marginBottom: 0 }}>
        <button type="button" data-filter-chip>
          🎛 Filters {properties.length > 0 ? '1' : ''}
        </button>
        <button type="button" data-filter-chip>
          Sort ↓
        </button>
        <button type="button" data-filter-chip>
          Price ↓
        </button>
        <button type="button" data-filter-chip>
          Property type ↓
        </button>
        <button type="button" data-filter-chip>
          Amenities ↓
        </button>
      </div>

      {/* Results count */}
      <div data-results-header>
        <span data-results-count>
          <strong>{properties.length}</strong> properties found
        </span>
        <a href="/accommodation?mapview=true" data-section-link>🗺 Map view</a>
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

      {/* Member CTA */}
      <div data-support-callout style={{ marginTop: 'var(--space-6)' }}>
        <div data-support-callout-text>
          <span data-support-callout-icon aria-hidden="true">🏷️</span>
          <div>
            <strong>Unlock member rates</strong>
            <p>Sign in to access exclusive deals and save more on your next stay.</p>
          </div>
        </div>
        <a href="/login" data-btn-primary>Sign in / Register</a>
      </div>

      {/* Explore by category */}
      <div data-section-header style={{ marginTop: 'var(--space-6)' }}>
        <span data-section-title>Explore by category</span>
        <a href="/accommodation" data-section-link>View all →</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
        {[
          { label: 'Beachfront',     icon: '🏖', type: 'beachfront' },
          { label: 'Pet Friendly',   icon: '🐕', type: 'pet_friendly' },
          { label: 'Family Friendly',icon: '👨‍👩‍👧‍👦',type: 'family' },
          { label: 'Business Stay',  icon: '💼', type: 'business' },
        ].map((c) => (
          <a key={c.label} href={`/accommodation?amenity=${c.type}`} data-card
            style={{ padding: 'var(--space-4)', textAlign: 'center', textDecoration: 'none', cursor: 'pointer' }}>
            <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>{c.icon}</div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{c.label}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

function PropertySearchCard({ property: p }: { property: Record<string, unknown> }): React.ReactElement {
  const rating = p['rating'] as number | undefined;
  const reviews = p['reviewCount'] as number | undefined;
  const rate = p['baseRate'] as number | undefined;

  return (
    <a href={`/accommodation/${p['slug'] as string}`} data-property-card data-property-list-item
      style={{ textDecoration: 'none' }}>
      <div data-property-card-image>
        {/* Image path: /images/properties/[slug]-main.jpg */}
        <img src={`/images/properties/${p['slug'] as string}-main.jpg`} alt={p['name'] as string}
          loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span data-property-type-badge>{(p['type'] as string)?.replace(/_/g, ' ')}</span>
        <button type="button" data-property-card-wishlist aria-label="Save" onClick={(e) => e.preventDefault()}>♡</button>
        {p['discountPercent'] && (
          <span data-property-card-discount>{p['discountPercent'] as number}% OFF</span>
        )}
      </div>
      <div data-property-card-body>
        <div data-property-card-header>
          <span data-property-card-name>{p['name'] as string}</span>
          {rating && (
            <span data-property-card-rating>★ {rating.toFixed(1)} ({reviews})</span>
          )}
        </div>
        <div data-property-card-location>
          📍 {p['city'] as string} · {p['distanceFromCentre'] as string ?? '—'} km from centre
        </div>
        <div data-property-card-amenities>
          {((p['amenities'] as string[]) ?? []).slice(0, 3).map((a) => (
            <span key={a} data-amenity-tag>📶 {a}</span>
          ))}
        </div>
        {p['freeCancellation'] && (
          <span data-property-tag="free_cancellation">Free cancellation</span>
        )}
        {p['breakfastIncluded'] && (
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
    </a>
  );
}
