'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';

// ── Search tab type ───────────────────────────────────────────────────────────
type SearchTab = 'all' | 'student' | 'hotels' | 'guesthouses' | 'rentals';

const SEARCH_TABS: { id: SearchTab; label: string; icon: string }[] = [
  { id: 'all',         label: 'All',             icon: '⊞' },
  { id: 'student',     label: 'Student Housing',  icon: '🎓' },
  { id: 'hotels',      label: 'Hotels',           icon: '🏨' },
  { id: 'guesthouses', label: 'Guesthouses',      icon: '🏡' },
  { id: 'rentals',     label: 'Rentals',          icon: '🏢' },
];

const PLANS = [
  { name: 'Starter',      desc: 'Get started with the essentials.',   price: 'R349',   billing: 'Billed annually', featured: false },
  { name: 'Professional', desc: 'Everything you need to grow.',       price: 'R799',   billing: 'Billed annually', featured: true  },
  { name: 'Business',     desc: 'Powerful features for serious operators.', price: 'R1,499', billing: 'Billed annually', featured: false },
  { name: 'Enterprise',   desc: 'Custom solutions for large portfolios.', price: 'Custom', billing: 'Custom pricing', featured: false },
];

export default function HomePage(): React.ReactElement {
  const router = useRouter();
  const [searchTab, setSearchTab] = useState<SearchTab>('all');
  const [destination, setDest]    = useState('');
  const [checkIn, setCheckIn]     = useState('');
  const [checkOut, setCheckOut]   = useState('');
  const [guests, setGuests]       = useState('1 guest');

  function handleSearch(): void {
    const p = new URLSearchParams();
    if (destination) p.set('city', destination);
    if (checkIn)     p.set('checkIn', checkIn);
    if (checkOut)    p.set('checkOut', checkOut);
    if (searchTab !== 'all') p.set('type', searchTab);
    router.push(`/search?${p.toString()}`);
  }

  return (
    <>
      <PublicHeader activePage="/" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section data-public-hero>
        <div data-hero-content>
          <h1 data-hero-headline>
            One platform.<br />Every stay.
          </h1>
          <p data-hero-sub>
            StayOS connects people to the right place to stay and helps property
            operators run their business smarter, every day.
          </p>
          <div data-hero-actions>
            <a href="/search" data-btn-primary>Find a place to stay →</a>
            <a href="/signup/property" data-btn-secondary>List your property 🏢</a>
          </div>
          <div data-hero-stats>
            <div data-hero-stat>
              <span data-hero-stat-icon aria-hidden="true">🏢</span>
              <div data-hero-stat-text>
                <strong>2,000+</strong>
                <small>Verified properties</small>
              </div>
            </div>
            <div data-hero-stat>
              <span data-hero-stat-icon aria-hidden="true">👥</span>
              <div data-hero-stat-text>
                <strong>10,000+</strong>
                <small>Happy guests</small>
              </div>
            </div>
            <div data-hero-stat>
              <span data-hero-stat-icon aria-hidden="true">🛡</span>
              <div data-hero-stat-text>
                <strong>Secure &amp; trusted</strong>
                <small>Always</small>
              </div>
            </div>
          </div>
        </div>

        <div data-hero-right>
          {/* Hero background image — /images/public/hero-bg.jpg */}
          <img
            data-hero-image
            src="/images/public/hero-bg.jpg"
            alt="Luxury accommodation"
            loading="eager"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />

          {/* Floating search widget */}
          <div data-hero-search>
            <div data-hero-search-title>Find your next stay</div>
            <div data-hero-search-tabs>
              {SEARCH_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  data-hero-search-tab
                  data-active={searchTab === t.id ? '' : undefined}
                  onClick={() => setSearchTab(t.id)}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div data-form-group>
                <input
                  type="text"
                  placeholder="📍 Where are you going?"
                  value={destination}
                  onChange={(e) => setDest(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <div data-form-group>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Check-in</label>
                  <input type="date" value={checkIn}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCheckIn(e.target.value)}
                    placeholder="Select date" />
                </div>
                <div data-form-group>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Check-out</label>
                  <input type="date" value={checkOut}
                    min={checkIn || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCheckOut(e.target.value)}
                    placeholder="Select date" />
                </div>
              </div>
              <div data-form-group>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Guests</label>
                <select value={guests} onChange={(e) => setGuests(e.target.value)}>
                  {['1 guest','2 guests','3 guests','4+ guests'].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
              <button type="button" data-btn-primary data-btn-full onClick={handleSearch}>
                Search properties →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ─────────────────────────────────────────────────────── */}
      <div data-trust-bar>
        <span data-trust-bar-label>Trusted by operators and guests across South Africa</span>
        <div data-trust-logos>
          {['Damelin', 'Varsity College', 'Stadio', 'Rosebank College', 'Vega School'].map((name) => (
            <span key={name} data-trust-logo>{name}</span>
          ))}
        </div>
      </div>

      {/* ── Services ──────────────────────────────────────────────────────── */}
      <section data-section style={{ background: 'var(--color-surface)' }}>
        <div data-container>
          <span data-section-label>BUILT FOR TWO AUDIENCES</span>
          <h2 data-section-heading>Solutions that work for you</h2>

          <div data-services-grid>
            {/* Student housing */}
            <div data-service-card>
              <div data-service-card-body>
                <div data-service-icon aria-hidden="true">🎓</div>
                <h3 data-service-card-name>Student Housing Operators</h3>
                <p data-service-card-desc>
                  Manage varsity accommodation, applications, occupancies and billing
                  — all in one place.
                </p>
                <ul data-service-card-features>
                  <li data-service-card-feature>Online applications that are easy for students</li>
                  <li data-service-card-feature>Room &amp; bed management made simple</li>
                  <li data-service-card-feature>Automated billing and reporting</li>
                  <li data-service-card-feature>Built for universities and private providers</li>
                </ul>
                <a href="/services#student" data-service-card-link>
                  Explore student housing solutions →
                </a>
              </div>
              <div data-service-card-image>
                {/* Image: /images/public/services-student.jpg */}
                <img src="/images/public/services-student.jpg" alt="Student accommodation"
                  loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            </div>

            {/* Hospitality */}
            <div data-service-card>
              <div data-service-card-body>
                <div data-service-icon aria-hidden="true">🏨</div>
                <h3 data-service-card-name>Hospitality Operators</h3>
                <p data-service-card-desc>
                  For hotels, guesthouses and rentals that want more bookings and
                  less admin.
                </p>
                <ul data-service-card-features>
                  <li data-service-card-feature>Direct bookings, fewer commissions</li>
                  <li data-service-card-feature>Channel manager &amp; calendar sync</li>
                  <li data-service-card-feature>Guest management &amp; payments</li>
                  <li data-service-card-feature>Insights to grow your business</li>
                </ul>
                <a href="/services#hospitality" data-service-card-link>
                  Explore hospitality solutions →
                </a>
              </div>
              <div data-service-card-image>
                {/* Image: /images/public/services-hospitality.jpg */}
                <img src="/images/public/services-hospitality.jpg" alt="Hotel operations"
                  loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats band ────────────────────────────────────────────────────── */}
      <div data-stats-band>
        <div data-stats-grid>
          {[
            { icon: '⭐', value: '4.8/5',   label: 'Average guest rating' },
            { icon: '📅', value: '25,000+', label: 'Stays booked' },
            { icon: '🏢', value: '3,000+',  label: 'Properties on the platform' },
            { icon: '🛡', value: '99.9%',   label: 'Uptime you can count on' },
          ].map((s) => (
            <div key={s.label} data-stat-item>
              <span data-stat-icon aria-hidden="true">{s.icon}</span>
              <div data-stat-text>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section data-section>
        <div data-container>
          <span data-section-label>FAIR PRICING, REAL VALUE</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-12)', alignItems: 'start' }}>
            <div>
              <h2 data-section-heading>Plans that grow with your business</h2>
              <p data-section-intro style={{ fontSize: 'var(--text-base)' }}>
                Choose the plan that fits you today, with the flexibility to scale tomorrow.
              </p>
              <a href="/pricing" data-section-link style={{ marginTop: 'var(--space-4)', display: 'inline-flex' }}>
                View pricing plans →
              </a>
            </div>
            <div data-pricing-grid>
              {PLANS.map((plan) => (
                <div key={plan.name} data-pricing-card data-featured={plan.featured ? '' : undefined}>
                  {plan.featured && (
                    <span data-pricing-featured-badge>Most popular</span>
                  )}
                  <div data-plan-name>{plan.name}</div>
                  <div data-plan-desc>{plan.desc}</div>
                  <div data-plan-price-label>From</div>
                  <div data-plan-price>{plan.price}<span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-normal)', color: 'var(--color-text-muted)' }}>{plan.price !== 'Custom' ? '/mo' : ''}</span></div>
                  <div data-plan-billing>{plan.billing}</div>
                  <a href="/pricing" data-btn-primary={plan.featured ? '' : undefined}
                    data-btn-secondary={!plan.featured ? '' : undefined}
                    style={{ width: '100%', justifyContent: 'center' }}>
                    {plan.name === 'Enterprise' ? "Let's talk" : 'Get started →'}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <div data-cta-section>
        <div data-container style={{ textAlign: 'center' }}>
          <div data-cta-image>
            {/* Image: /images/public/cta-chair.jpg */}
            <img src="/images/public/cta-chair.jpg" alt="" loading="lazy"
              style={{ width: '100%', borderRadius: 'var(--radius-xl)' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <h2 data-section-heading>Ready to simplify how you host or stay?</h2>
          <p data-section-intro style={{ margin: '0 auto' }}>
            Join thousands of operators and guests who trust StayOS.
          </p>
          <div data-cta-actions>
            <a href="/signup/property" data-btn-primary>List your property 🏢</a>
            <a href="/search" data-btn-secondary>Find a place to stay →</a>
          </div>
        </div>
      </div>

      <PublicFooter />
    </>
  );
}
