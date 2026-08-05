import React from 'react';

// The portal picker exists ONLY for genuinely ambiguous entry points:
// the site's header "Log in" link, or someone arriving with no prior context.
//
// It is NOT part of the booking flow (→ my.stayos.co.za/login direct) or the
// application flow (no login required). Document 09 §4/§5 is explicit on this.
//
// This is a server component — no client-side logic needed.

const PORTALS = [
  {
    id: 'customer',
    label: 'Guest & Customer',
    description: 'Book accommodation, manage reservations, payments, applications, leases and loyalty.',
    features: [
      'Book hotels, guesthouses & rentals',
      'Manage bookings and payments',
      'Track applications and leases',
      'Earn and redeem loyalty rewards',
    ],
    cta: 'Continue to Customer Portal',
    href: 'https://my.stayos.co.za/login',
    domain: 'my.stayos.co.za/login',
  },
  {
    id: 'property',
    label: 'Property Operations',
    description:
      'Manage bookings, rooms, housekeeping, maintenance, staff and daily operations.',
    features: [
      'Manage reservations & front desk',
      'Oversee housekeeping & maintenance',
      'Manage staff, roles & schedules',
      'View reports and performance',
    ],
    cta: 'Continue to Property Portal',
    href: 'https://app.stayos.co.za/login',
    domain: 'app.stayos.co.za/login',
  },
  {
    id: 'agency',
    label: 'Agency Portal',
    description:
      'Manage your property portfolio, mandates, agency staff and statements.',
    features: [
      'Manage property portfolio',
      'Oversee mandates & bookings',
      'Manage agency staff',
      'View statements & commissions',
    ],
    cta: 'Continue to Agency Portal',
    href: 'https://agency.stayos.co.za/login',
    domain: 'agency.stayos.co.za/login',
  },
] as const;

export default function LoginPickerPage(): React.ReactElement {
  return (
    <div data-login-picker-page>
      {/* Header */}
      <header data-public-header>
        <a href="/" data-logo>
          <span data-logo-text>StayOS</span>
        </a>
        <nav>
          <a href="/services">Services</a>
          <a href="/pricing">Pricing</a>
          <a href="/search">Search</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </nav>
        {/* No Log in button on the Log in page */}
        <a href="/signup/property" data-btn-primary>List your property</a>
      </header>

      {/* Hero */}
      <section data-picker-hero>
        <h1>Welcome back.</h1>
        <p data-picker-subtitle>Choose where you&apos;d like to sign in.</p>
        <p data-picker-description>
          StayOS provides dedicated portals for guests, property operators, and
          agencies. Select the portal that matches your role to continue.
        </p>
      </section>

      {/* Portal cards */}
      <section data-portal-cards aria-label="Select your portal">
        {PORTALS.map((portal) => (
          <article key={portal.id} data-portal-card data-portal={portal.id}>
            <div data-portal-card-icon aria-hidden="true" />
            <h2 data-portal-card-label>{portal.label}</h2>
            <p data-portal-card-description>{portal.description}</p>
            <ul data-portal-card-features>
              {portal.features.map((f) => (
                <li key={f} data-portal-card-feature>
                  <span data-check-icon aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <a href={portal.href} data-btn-primary data-btn-full data-portal-cta>
              {portal.cta} →
            </a>
            <div data-portal-domain>
              <span data-lock-icon aria-hidden="true" />
              {portal.domain}
            </div>
          </article>
        ))}
      </section>

      {/* Contextual help — booking and application don't need this page */}
      <section data-picker-help>
        <div data-picker-help-item>
          <span data-help-icon aria-hidden="true" />
          <div>
            <h3>Looking to book accommodation?</h3>
            <p>
              If you&apos;re booking a hotel, guesthouse or rental, you don&apos;t
              need this page. Selecting &ldquo;Book now&rdquo; on a property listing
              takes you directly to the Customer Portal with your booking details
              ready.
            </p>
          </div>
        </div>
        <div data-picker-help-item>
          <span data-help-icon aria-hidden="true" />
          <div>
            <h3>Applying for student accommodation?</h3>
            <p>
              Applications never require an account. Simply open the property
              listing and click &ldquo;Apply now&rdquo; to complete the
              application form.
            </p>
          </div>
        </div>
      </section>

      {/* Need help */}
      <section data-picker-support>
        <h2>Need help?</h2>
        <div data-support-links>
          <a href="/contact" data-support-link>Contact Support →</a>
          <a href="/contact#faq" data-support-link>View FAQs →</a>
          <a href="/contact#email" data-support-link>Send us an Email →</a>
        </div>
      </section>

      {/* Footer */}
      <footer data-public-footer>
        <div data-footer-brand>
          <a href="/" data-logo>StayOS</a>
          <p>Built for hospitality. Designed for people.</p>
        </div>
        <nav data-footer-links aria-label="Footer navigation">
          <div data-footer-col>
            <strong>Product</strong>
            <a href="/services">Services</a>
            <a href="/pricing">Pricing</a>
            <a href="/search">Search properties</a>
          </div>
          <div data-footer-col>
            <strong>Company</strong>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </div>
          <div data-footer-col>
            <strong>For Operators</strong>
            <a href="/signup/property">List your property</a>
            <a href="https://app.stayos.co.za/login">Property login</a>
            <a href="https://agency.stayos.co.za/login">Agency login</a>
          </div>
          <div data-footer-col>
            <strong>Legal</strong>
            <a href="/legal/privacy">Privacy Policy</a>
            <a href="/legal/terms">Terms of Service</a>
          </div>
        </nav>
        <p data-footer-copyright>© 2026 StayOS. All rights reserved.</p>
      </footer>
    </div>
  );
}
