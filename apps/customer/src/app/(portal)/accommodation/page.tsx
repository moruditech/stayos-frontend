'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, Icons, type LucideIcon } from '@stayos/ui';
import { accommodationKeys } from '@/lib/query-keys';
import { GuestsRoomsField, type GuestsRoomsValue } from '@/components/GuestsRoomsField';
import { FilterDropdown } from '@/components/FilterDropdown';
import { useWishlist } from '@/lib/useWishlist';

type StayMode = 'stays' | 'student' | 'long_term';
const STAY_MODES: { id: StayMode; label: string; icon: LucideIcon }[] = [
  { id: 'stays',      label: 'Stays',            icon: Icons.Bed },
  { id: 'student',    label: 'Student Housing',  icon: Icons.GraduationCap },
  { id: 'long_term',  label: 'Long Term',        icon: Icons.Building2 },
];

// These map to the *real* Tenant.type enum on the backend
// ('guesthouse' | 'hotel' | 'rental' | 'student_housing') — there is no
// 'boutique_hotel' / 'bed_and_breakfast' / 'apartment' / 'villa' sub-type on
// the server, so the category chips can only ever narrow to these four.
type CategoryTab = 'all' | 'hotels' | 'guesthouses' | 'apartments';
const CATS: { id: CategoryTab; label: string; icon: LucideIcon }[] = [
  { id: 'all',         label: 'All',         icon: Icons.LayoutGrid },
  { id: 'hotels',      label: 'Hotels',      icon: Icons.Bed },
  { id: 'guesthouses', label: 'Guesthouses', icon: Icons.Home },
  { id: 'apartments',  label: 'Apartments',  icon: Icons.Building2 },
];
const TYPE_MAP: Record<CategoryTab, string[]> = {
  all:         [],
  hotels:      ['hotel'],
  guesthouses: ['guesthouse'],
  apartments:  ['rental'],
};
const MODE_TYPE_MAP: Record<StayMode, string[]> = {
  stays:      [],
  student:    ['student_housing'],
  long_term:  [], // Long-term (lease-based) stays are not yet implemented — see "Coming soon" state below.
};

// Extra chips revealed by "More" — these filter on amenity tags (a filter
// the backend genuinely supports via `amenities`) rather than invented
// property types, since the server has no concept of e.g. "Airbnb" as a type.
const MORE_FILTERS: { id: string; label: string; icon: LucideIcon; amenity: string }[] = [
  { id: 'pet_friendly', label: 'Pet Friendly',  icon: Icons.PawPrint,  amenity: 'pet_friendly' },
  { id: 'family',       label: 'Family',        icon: Icons.Users,     amenity: 'family_friendly' },
  { id: 'business',     label: 'Business',      icon: Icons.Briefcase, amenity: 'business_centre' },
  { id: 'self_catering',label: 'Self-catering', icon: Icons.Coffee,    amenity: 'self_catering' },
];

const SORT_OPTIONS: { id: string; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'rating',      label: 'Top rated' },
  { id: 'price_low',   label: 'Price: low to high' },
  { id: 'price_high',  label: 'Price: high to low' },
];

const AMENITY_OPTIONS: { id: string; label: string }[] = [
  { id: 'wifi',            label: 'Wifi' },
  { id: 'pool',            label: 'Pool' },
  { id: 'parking',         label: 'Parking' },
  { id: 'breakfast',       label: 'Breakfast included' },
  { id: 'air_conditioning',label: 'Air conditioning' },
  { id: 'pet_friendly',    label: 'Pet friendly' },
];

const PROPERTY_TYPE_OPTIONS: { id: string; label: string }[] = [
  { id: 'hotel',           label: 'Hotel' },
  { id: 'guesthouse',      label: 'Guesthouse' },
  { id: 'rental',          label: 'Apartment / rental' },
  { id: 'student_housing', label: 'Student housing' },
];

const EXPLORE_TILES: { label: string; icon: LucideIcon; amenity: string }[] = [
  { label: 'Beachfront',      icon: Icons.Palmtree, amenity: 'beachfront' },
  { label: 'Pet Friendly',    icon: Icons.PawPrint, amenity: 'pet_friendly' },
  { label: 'Family Friendly', icon: Icons.Users,    amenity: 'family_friendly' },
  { label: 'Business Stay',   icon: Icons.Briefcase,amenity: 'business_centre' },
];

export default function AccommodationPage(): React.ReactElement {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isSaved, toggle: toggleWishlist } = useWishlist();

  const [stayMode, setStayMode]   = useState<StayMode>('stays');
  const [category, setCategory]   = useState<CategoryTab>('all');
  const [showMore, setShowMore]   = useState(false);
  const [moreAmenities, setMoreAmenities] = useState<Set<string>>(new Set());
  const [city, setCity]         = useState(searchParams.get('city') ?? '');
  const [checkIn, setCheckIn]   = useState(searchParams.get('checkIn') ?? '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') ?? '');
  const [guestsRooms, setGuestsRooms] = useState<GuestsRoomsValue>({
    guests: Number(searchParams.get('guests')) || 1,
    rooms:  Number(searchParams.get('rooms')) || 1,
  });
  const [editingSearch, setEditingSearch] = useState(false);

  // Advanced filters
  const [sortBy, setSortBy]               = useState('recommended');
  const [priceMin, setPriceMin]           = useState('');
  const [priceMax, setPriceMax]           = useState('');
  const [advancedTypes, setAdvancedTypes] = useState<Set<string>>(new Set());
  const [amenities, setAmenities]         = useState<Set<string>>(new Set());

  // Long-term (lease-based) stays aren't built yet — don't hit the search
  // API for a mode that has no real backing data; show "Coming soon" instead.
  const isLongTermMode = stayMode === 'long_term';

  const activeAmenities = new Set([...amenities, ...moreAmenities]);
  const hasAdvancedFilters = sortBy !== 'recommended' || !!priceMin || !!priceMax
    || advancedTypes.size > 0 || activeAmenities.size > 0;

  function clearAdvancedFilters(): void {
    setSortBy('recommended');
    setPriceMin('');
    setPriceMax('');
    setAdvancedTypes(new Set());
    setAmenities(new Set());
    setMoreAmenities(new Set());
  }

  const filters: Record<string, string> = {};
  filters['guests'] = String(guestsRooms.guests);
  filters['rooms']  = String(guestsRooms.rooms);
  if (city)     filters['city']    = city;
  if (checkIn)  filters['checkIn'] = checkIn;
  if (checkOut) filters['checkOut']= checkOut;
  if (sortBy !== 'recommended') filters['sort'] = sortBy;
  if (priceMin) filters['minRate'] = priceMin;
  if (priceMax) filters['maxRate'] = priceMax;
  if (activeAmenities.size > 0) filters['amenities'] = Array.from(activeAmenities).join(',');

  // The "Stays / Student Housing / Long Term" tabs set the broad market
  // segment; the category chips below further narrow "Stays" results by
  // property type, and the "Property type" dropdown can narrow further
  // still (it wins over the category chip when it's been used).
  if (stayMode === 'student') {
    filters['type'] = MODE_TYPE_MAP.student.join(',');
  } else if (advancedTypes.size > 0) {
    filters['type'] = Array.from(advancedTypes).join(',');
  } else if (stayMode === 'stays' && category !== 'all') {
    filters['type'] = TYPE_MAP[category].join(',');
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

  function toggleSet(set: Set<string>, setter: (next: Set<string>) => void, value: string): void {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    setter(next);
  }

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
          <span style={{ color: 'var(--color-primary)', fontSize: '13px', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
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

      {/* Category chips — only relevant to "Stays" mode. These are filters,
          so they (and the "explore" tiles below) live above the results,
          not after them. */}
      {stayMode === 'stays' && (
        <div data-filter-bar>
          {CATS.map((c) => (
            <button key={c.id} type="button" data-filter-chip
              data-active={category === c.id ? '' : undefined}
              onClick={() => setCategory(c.id)}>
              <c.icon size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />{c.label}
            </button>
          ))}
          {showMore && MORE_FILTERS.map((f) => (
            <button key={f.id} type="button" data-filter-chip
              data-active={moreAmenities.has(f.amenity) ? '' : undefined}
              onClick={() => toggleSet(moreAmenities, setMoreAmenities, f.amenity)}>
              <f.icon size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />{f.label}
            </button>
          ))}
          <button type="button" data-filter-chip onClick={() => setShowMore((v) => !v)}>
            <Icons.MoreHorizontal size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
            {showMore ? 'Less' : 'More'}
          </button>
        </div>
      )}

      {/* Explore by category — also filters (by amenity), so it stays
          above the accommodation results rather than after them. */}
      {stayMode === 'stays' && !isLongTermMode && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
            <div data-section-header>
              <span data-section-title>Explore by category</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
              {EXPLORE_TILES.map((c) => (
                <button key={c.label} type="button" data-explore-tile
                  data-active={amenities.has(c.amenity) ? '' : undefined}
                  onClick={() => toggleSet(amenities, setAmenities, c.amenity)}>
                  <c.icon size={28} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
        </div>
      )}

      {isLongTermMode ? (
        <div data-explore-tile style={{ cursor: 'default', textAlign: 'center', padding: 'var(--space-10) var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            <Icons.Building2 size={40} />
          </div>
          <h2 style={{ fontSize: '17px', fontWeight: '700', marginBottom: 'var(--space-2)' }}>
            Long Term stays — coming soon
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '28rem', margin: '0 auto' }}>
            Lease-based long-term accommodation isn&apos;t available yet. Check back soon, or browse short-stay Hotels, Guesthouses and Apartments under the Stays tab.
          </p>
        </div>
      ) : (
        <>
          {/* Filter + sort row */}
          <div data-filter-bar style={{ marginBottom: 0 }}>
            <button type="button" data-filter-chip disabled={!hasAdvancedFilters}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', opacity: hasAdvancedFilters ? 1 : 0.5, cursor: hasAdvancedFilters ? 'pointer' : 'default' }}
              onClick={clearAdvancedFilters}>
              <Icons.SlidersHorizontal size={14} /> {hasAdvancedFilters ? 'Clear filters' : 'Filters'}
            </button>

            <FilterDropdown label="Sort" active={sortBy !== 'recommended'}>
              {(close) => (
                <>
                  <span data-filter-panel-title>Sort by</span>
                  {SORT_OPTIONS.map((o) => (
                    <label key={o.id} data-filter-option>
                      <input type="radio" name="sort" checked={sortBy === o.id}
                        onChange={() => { setSortBy(o.id); close(); }} />
                      {o.label}
                    </label>
                  ))}
                </>
              )}
            </FilterDropdown>

            <FilterDropdown label="Price" active={!!priceMin || !!priceMax}>
              {(close) => (
                <>
                  <span data-filter-panel-title>Price per night (ZAR)</span>
                  <div data-filter-price-row>
                    <input type="number" min={0} placeholder="Min" value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)} />
                    <span>–</span>
                    <input type="number" min={0} placeholder="Max" value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)} />
                  </div>
                  <div data-filter-panel-actions>
                    <span data-filter-clear-btn onClick={() => { setPriceMin(''); setPriceMax(''); }}>Clear</span>
                    <button type="button" data-btn-primary style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '12.5px' }} onClick={close}>Apply</button>
                  </div>
                </>
              )}
            </FilterDropdown>

            <FilterDropdown label="Property type" active={advancedTypes.size > 0}>
              {(close) => (
                <>
                  <span data-filter-panel-title>Property type</span>
                  {PROPERTY_TYPE_OPTIONS.map((o) => (
                    <label key={o.id} data-filter-option>
                      <input type="checkbox" checked={advancedTypes.has(o.id)}
                        onChange={() => toggleSet(advancedTypes, setAdvancedTypes, o.id)} />
                      {o.label}
                    </label>
                  ))}
                  <div data-filter-panel-actions>
                    <span data-filter-clear-btn onClick={() => setAdvancedTypes(new Set())}>Clear</span>
                    <button type="button" data-btn-primary style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '12.5px' }} onClick={close}>Apply</button>
                  </div>
                </>
              )}
            </FilterDropdown>

            <FilterDropdown label="Amenities" active={amenities.size > 0}>
              {(close) => (
                <>
                  <span data-filter-panel-title>Amenities</span>
                  {AMENITY_OPTIONS.map((o) => (
                    <label key={o.id} data-filter-option>
                      <input type="checkbox" checked={amenities.has(o.id)}
                        onChange={() => toggleSet(amenities, setAmenities, o.id)} />
                      {o.label}
                    </label>
                  ))}
                  <div data-filter-panel-actions>
                    <span data-filter-clear-btn onClick={() => setAmenities(new Set())}>Clear</span>
                    <button type="button" data-btn-primary style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '12.5px' }} onClick={close}>Apply</button>
                  </div>
                </>
              )}
            </FilterDropdown>
          </div>

          {/* Results count */}
          <div data-results-header>
            <span data-results-count>
              <strong>{properties.length}</strong> properties found
            </span>
            <button type="button" data-section-link
              style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => router.push('/accommodation?mapview=true')}>
              <Icons.Map size={14} /> Map view
            </button>
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
                <PropertySearchCard key={p['_id'] as string} property={p}
                  isSaved={isSaved(p['_id'] as string)}
                  onToggleWishlist={() => toggleWishlist(p['_id'] as string)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PropertySearchCard({
  property: p, isSaved, onToggleWishlist,
}: {
  property: Record<string, unknown>;
  isSaved: boolean;
  onToggleWishlist: () => void;
}): React.ReactElement {
  const router = useRouter();
  const rating = p['rating'] as number | undefined;
  const reviews = p['reviewCount'] as number | undefined;
  const rate = p['baseRate'] as number | null | undefined;
  const discountPercent = p['discountPercent'] as number | undefined;
  const freeCancellation = p['freeCancellation'] as boolean | undefined;
  const breakfastIncluded = p['breakfastIncluded'] as boolean | undefined;

  return (
    <div data-property-card data-property-list-item
      onClick={() => router.push(`/accommodation/${p['slug'] as string}`)}
      role="link" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/accommodation/${p['slug'] as string}`); }}>
      <div data-property-card-image>
        {/* Image path: /images/properties/[slug]-main.jpg */}
        <img src={`/images/properties/${p['slug'] as string}-main.jpg`} alt={p['name'] as string}
          loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span data-property-type-badge>{(p['type'] as string)?.replace(/_/g, ' ')}</span>
        <button type="button" data-property-card-wishlist data-saved={isSaved ? '' : undefined} aria-label="Save"
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(); }}>
          <Icons.Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
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
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>From</div>
            <span data-property-rate>{typeof rate === 'number' ? `R${rate.toLocaleString()}` : 'Contact for rate'}</span>
            {typeof rate === 'number' && <span data-property-rate-label> / night</span>}
          </div>
          <button type="button" data-btn-primary style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '13px' }}
            onClick={(e) => { e.stopPropagation(); router.push(`/accommodation/${p['slug'] as string}`); }}>
            View details
          </button>
        </div>
      </div>
    </div>
  );
}
