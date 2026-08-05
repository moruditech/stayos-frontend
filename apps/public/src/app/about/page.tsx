import React from 'react';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';

export const metadata = {
  title: 'About StayOS — Technology built for every stay',
  description: 'StayOS is South Africa\'s all-in-one accommodation platform connecting guests, students, property owners and agencies.',
};

const STATS = [
  { value: '1,000+',  label: 'Properties',           sub: 'Across South Africa' },
  { value: '200+',    label: 'Cities & Towns',        sub: 'Nationwide coverage' },
  { value: '250K+',   label: 'Bookings',              sub: 'And counting' },
  { value: '150K+',   label: 'Students',              sub: 'Housed and supported' },
  { value: '80+',     label: 'Agencies',              sub: 'Managing properties' },
  { value: '99.9%',   label: 'Platform Uptime',       sub: 'Reliability you can trust' },
];

const AUDIENCE = [
  {
    icon: '👥', title: 'Guests',
    desc: 'Find and book hotels, guesthouses and rentals with confidence.',
    points: ['Best rates', 'Secure bookings', 'Loyalty rewards', '24/7 support'],
  },
  {
    icon: '🎓', title: 'Students',
    desc: 'Apply, manage and pay for accommodation with ease.',
    points: ['Easy applications', 'Transparent fees', 'Digital leases', 'Payment plans'],
  },
  {
    icon: '🏢', title: 'Property Owners',
    desc: 'Run your property smarter and grow your business.',
    points: ['More bookings', 'Streamlined operations', 'Powerful insights', 'Lower costs'],
  },
  {
    icon: '🏛', title: 'Agencies',
    desc: 'Manage multiple properties and drive performance.',
    points: ['Centralised portfolio', 'Mandate management', 'Staff management', 'Clear statements'],
  },
];

const JOURNEY = [
  { year: '2021', label: 'The Idea',            detail: 'Identified challenges in hospitality and student accommodation management.' },
  { year: '2022', label: 'Building StayOS',     detail: 'Platform architecture, core modules and first properties onboarded.' },
  { year: '2023', label: 'Growth & Partnerships',detail: 'Expanded to cities nationwide and launched agency collaboration.' },
  { year: '2024', label: 'One Unified Platform', detail: 'Connected every portal, launched loyalty, reports and advanced operations.' },
  { year: '2025+',label: 'The Future',           detail: 'Continuous innovation, AI-powered insights and global ambitions.' },
];

const FAQS = [
  { q: 'What is StayOS?',                          a: 'StayOS is South Africa\'s all-in-one accommodation platform for guests, students, property owners and agencies.' },
  { q: 'Who can list their property on StayOS?',   a: 'Any property owner or agency can register and list accommodation, subject to our vetting process.' },
  { q: 'How do guests book on StayOS?',            a: 'Guests browse listings, select dates, and complete a booking through the Customer Portal at my.stayos.co.za.' },
  { q: 'How do students apply for accommodation?', a: 'Students browse student housing listings and submit applications directly — no account required to apply.' },
  { q: 'How does the loyalty program work?',       a: 'Guests earn Q Points on every stay and activity, which can be redeemed for discounts and upgrades.' },
  { q: 'Does StayOS integrate with OTAs?',         a: 'Yes — StayOS supports iCal channel sync with Airbnb, Booking.com and other OTA platforms.' },
  { q: 'Is my data safe on StayOS?',               a: 'All data is encrypted and we are fully POPIA-compliant. We never sell or share your data with third parties.' },
  { q: 'What payment methods are supported?',      a: 'We support PayFast, Ozow and Stripe, covering credit/debit cards, EFT and instant EFT.' },
  { q: 'How can I contact support?',               a: 'Via the Contact page, our in-app support tickets, email at hello@stayos.co.za, or WhatsApp at +27 82 123 4567.' },
];

export default function AboutPage(): React.ReactElement {
  return (
    <>
      <PublicHeader activePage="/about" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '480px', display: 'flex', alignItems: 'center' }}>
        {/* Image: /images/public/about-hero.jpg — Cape Town aerial */}
        <img src="/images/public/about-hero.jpg" alt="South African hospitality"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1 }} />
        <div data-container style={{ position: 'relative', zIndex: 2, color: 'white', padding: 'var(--space-20) var(--page-padding-x)' }}>
          <span data-section-label style={{ color: 'rgba(255,255,255,0.7)' }}>ABOUT STAYOS</span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 'var(--font-bold)', lineHeight: 'var(--leading-tight)', marginBottom: 'var(--space-6)', maxWidth: '640px' }}>
            Technology built for every stay.
          </h1>
          <p style={{ fontSize: 'var(--text-lg)', opacity: 0.9, maxWidth: '520px', lineHeight: 'var(--leading-relaxed)', marginBottom: 'var(--space-8)' }}>
            StayOS is South Africa&apos;s all-in-one accommodation platform connecting guests, students, property owners and agencies with seamless technology, trusted data and real human support.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <a href="/search" data-btn-primary>Explore our platform</a>
            <button type="button" style={{ padding: 'var(--space-3) var(--space-6)', background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 'var(--radius-md)', color: 'white', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              ▶ Watch overview
            </button>
          </div>
        </div>
      </section>

      {/* ── Our Story ─────────────────────────────────────────────────────── */}
      <section data-section style={{ background: 'var(--color-surface)' }}>
        <div data-container>
          <span data-section-label>OUR STORY</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-12)', alignItems: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
              <div>
                <h2 data-section-heading>Solving real challenges. Together.</h2>
                <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)', marginBottom: 'var(--space-4)' }}>
                  StayOS was created by LekkerQ (Pty) Ltd, a South African tech company born from experience in the hospitality and student accommodation industries.
                </p>
                <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                  We saw property owners juggling multiple disconnected systems. Guests struggled to find reliable places to stay. Students faced confusing application and payment processes.
                </p>
              </div>
              <div>
                <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)', marginBottom: 'var(--space-4)' }}>
                  So we built one intelligent platform that brings everything together — search, book, apply, manage, pay and grow.
                </p>
                <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                  From day one, our goal has been simple: build reliable, easy-to-use tools that help accommodation businesses run better, and give every guest and student a smoother experience from search to stay.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Platform overview ─────────────────────────────────────────────── */}
      <section data-section>
        <div data-container>
          <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: 'var(--space-10)' }}>
            ONE PLATFORM. FOUR EXPERIENCES.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-6)', textAlign: 'center' }}>
            {[
              { icon: '🌐', title: 'Public Website',     desc: 'Discover properties, compare options and find the perfect stay or student accommodation.' },
              { icon: '👤', title: 'Customer Portal',    desc: 'Guests and students book, apply, pay, manage stays, loyalty and support.' },
              { icon: '🏢', title: 'Property Portal',    desc: 'Property teams manage bookings, operations, staff, finances and reports.' },
              { icon: '🏛', title: 'Agency Portal',      desc: 'Agencies manage multiple properties, mandates, billing and staff.' },
              { icon: '⚙️', title: 'Platform Admin',    desc: 'StayOS platform operations, vetting, support, billing and insights.' },
            ].map((p) => (
              <div key={p.title} data-card-padded style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-3)' }}>{p.icon}</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>{p.title}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who we serve ──────────────────────────────────────────────────── */}
      <section data-section style={{ background: 'var(--color-surface)' }}>
        <div data-container>
          <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-12)' }}>
            WHO WE SERVE
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-6)' }}>
            {AUDIENCE.map((a) => (
              <div key={a.title} data-card-padded>
                <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>{a.icon}</div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>{a.title}</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 'var(--leading-relaxed)' }}>{a.desc}</p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {a.points.map((pt) => (
                    <li key={pt} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', display: 'flex', gap: 'var(--space-2)' }}>
                      <span style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-bold)' }}>✓</span>{pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div data-stats-band>
        <div data-stats-grid style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {STATS.map((s) => (
            <div key={s.label} data-stat-item style={{ flexDirection: 'column', gap: 'var(--space-1)', textAlign: 'center' }}>
              <strong style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)' }}>{s.value}</strong>
              <span data-stat-label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', opacity: 0.9 }}>{s.label}</span>
              <span style={{ fontSize: 'var(--text-xs)', opacity: 0.7 }}>{s.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── South Africa section ──────────────────────────────────────────── */}
      <section data-section style={{ background: 'var(--color-surface)' }}>
        <div data-container>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)', alignItems: 'center' }}>
            <div>
              <span data-section-label>BUILT IN SOUTH AFRICA</span>
              <h2 data-section-heading>For South Africa. By South Africans.</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)', lineHeight: 'var(--leading-relaxed)', marginBottom: 'var(--space-6)' }}>
                StayOS is proudly South African. We understand our market, our challenges and our opportunities.
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[
                  'Support for ZAR and local payment methods',
                  'Built to handle loadshedding, connectivity and real-world challenges',
                  'Designed for hotels, guesthouses, rentals and student housing',
                  'Compliant with South African laws and POPIA',
                ].map((pt) => (
                  <li key={pt} style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    <span style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-bold)', flexShrink: 0 }}>✓</span>{pt}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>OUR JOURNEY</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {JOURNEY.map((j) => (
                  <div key={j.year} style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--color-primary)', paddingTop: '2px' }}>{j.year}</div>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: '2px' }}>{j.label}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>{j.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section data-section>
        <div data-container>
          <h2 data-section-heading style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>Frequently asked questions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            {FAQS.map((faq) => (
              <details key={faq.q} data-card-padded style={{ cursor: 'pointer' }}>
                <summary style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
                  {faq.q} <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>↓</span>
                </summary>
                <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--color-primary)', color: 'white', padding: 'var(--space-16) var(--page-padding-x)', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-4)' }}>
          Let&apos;s build better stays, together.
        </h2>
        <p style={{ opacity: 0.85, marginBottom: 'var(--space-8)' }}>
          Join thousands of property owners, agencies, guests and students who trust StayOS every day.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/search" style={{ padding: 'var(--space-3) var(--space-6)', background: 'white', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
            🏠 Explore Properties
          </a>
          <a href="/signup/property" style={{ padding: 'var(--space-3) var(--space-6)', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 'var(--radius-md)', fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
            🏢 For Property Owners
          </a>
          <a href="/contact" style={{ padding: 'var(--space-3) var(--space-6)', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 'var(--radius-md)', fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
            👥 Contact Sales
          </a>
        </div>
      </div>

      <PublicFooter />
    </>
  );
}
