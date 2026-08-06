'use client';
import React from 'react';
import { User, Building, Briefcase, Check, Lock, Compass, FileText, MessageCircle, HelpCircle, Send, ArrowRight, type LucideIcon } from 'lucide-react';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';

// The portal picker exists ONLY for genuinely ambiguous entry points:
// the site's header "Log in" link, or someone arriving with no prior context.
//
// It is NOT part of the booking flow (goes to my.stayos.co.za/login direct) or the
// application flow (no login required). Document 09 §4/§5 is explicit on this.

const PORTALS: {
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  domain: string;
}[] = [
  {
    id: 'customer',
    icon: User,
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
    icon: Building,
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
    icon: Briefcase,
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
];

export default function LoginPickerPage(): React.ReactElement {
  return (
    <div data-login-picker-page>
      <PublicHeader activePage="/login" />

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
            <div data-portal-card-icon aria-hidden="true"><portal.icon size={24} /></div>
            <h2 data-portal-card-label>{portal.label}</h2>
            <p data-portal-card-description>{portal.description}</p>
            <ul data-portal-card-features>
              {portal.features.map((f) => (
                <li key={f} data-portal-card-feature>
                  <span data-check-icon aria-hidden="true"><Check size={16} /></span>
                  {f}
                </li>
              ))}
            </ul>
            <a href={portal.href} data-btn-primary data-btn-full data-portal-cta>
              {portal.cta} <ArrowRight size={16} aria-hidden="true" />
            </a>
            <div data-portal-domain>
              <span data-lock-icon aria-hidden="true"><Lock size={13} /></span>
              {portal.domain}
            </div>
          </article>
        ))}
      </section>

      {/* Contextual help — booking and application don't need this page */}
      <section data-picker-help>
        <div data-picker-help-item>
          <span data-help-icon aria-hidden="true"><Compass size={18} /></span>
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
          <span data-help-icon aria-hidden="true"><FileText size={18} /></span>
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
          <a href="/contact" data-support-link><MessageCircle size={16} aria-hidden="true" /> Contact Support <ArrowRight size={14} aria-hidden="true" /></a>
          <a href="/contact#faq" data-support-link><HelpCircle size={16} aria-hidden="true" /> View FAQs <ArrowRight size={14} aria-hidden="true" /></a>
          <a href="/contact#email" data-support-link><Send size={16} aria-hidden="true" /> Send us an Email <ArrowRight size={14} aria-hidden="true" /></a>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
