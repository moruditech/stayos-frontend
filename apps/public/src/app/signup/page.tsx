'use client';

import React from 'react';
import { Building2, Landmark, ArrowRight } from 'lucide-react';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';

// This is the landing target for every "Create account" link across the
// portals (see apps/property's (auth)/login/page.tsx PUBLIC_SIGNUP_URL).
// It previously 404'd — /signup/property and /signup/agency exist, but
// nothing handled the bare /signup path itself.
export default function SignupPage(): React.ReactElement {
  return (
    <>
      <PublicHeader />

      <section data-section style={{ background: 'var(--color-surface)' }}>
        <div data-container>
          <span data-section-label>GET STARTED</span>
          <h2 data-section-heading>Create your StayOS account</h2>
          <p data-section-intro>
            Choose the account type that matches what you manage.
          </p>

          <div data-services-grid>
            <div data-service-card>
              <div data-service-card-body>
                <div data-service-icon aria-hidden="true"><Building2 size={26} /></div>
                <h3 data-service-card-name>I manage a property</h3>
                <p data-service-card-desc>
                  Hotels, guesthouses, rentals or student housing — set up
                  your own Property Portal.
                </p>
                <ul data-service-card-features>
                  <li data-service-card-feature>Bookings, rates &amp; availability calendar</li>
                  <li data-service-card-feature>Housekeeping &amp; maintenance modules</li>
                  <li data-service-card-feature>Channel sync with Airbnb &amp; Booking.com</li>
                </ul>
                <a href="/signup/property" data-service-card-link>
                  Sign up as a property <ArrowRight size={14} aria-hidden="true" />
                </a>
              </div>
            </div>

            <div data-service-card>
              <div data-service-card-body>
                <div data-service-icon aria-hidden="true"><Landmark size={26} /></div>
                <h3 data-service-card-name>I manage a portfolio</h3>
                <p data-service-card-desc>
                  Agencies managing multiple properties on behalf of owners.
                </p>
                <ul data-service-card-features>
                  <li data-service-card-feature>Centralised portfolio management</li>
                  <li data-service-card-feature>Mandate management across properties</li>
                  <li data-service-card-feature>Portfolio analytics &amp; billing</li>
                </ul>
                <a href="/signup/agency" data-service-card-link>
                  Sign up as an agency <ArrowRight size={14} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </>
  );
}
