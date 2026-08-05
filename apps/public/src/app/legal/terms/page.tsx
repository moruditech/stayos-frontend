import React from 'react';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';

export const metadata = {
  title: 'Terms of Service — StayOS',
  description: 'Terms and conditions governing use of the StayOS platform.',
};

const LAST_UPDATED = '1 August 2026';

const SECTIONS = [
  {
    title: '1. About StayOS and these terms',
    body: `StayOS is a platform operated by LekkerQ (Pty) Ltd ("we", "us", "StayOS"). These Terms of Service govern your use of stayos.co.za and all associated portals (my.stayos.co.za, app.stayos.co.za, owners.stayos.co.za, agency.stayos.co.za, admin.stayos.co.za). By creating an account or using the platform, you agree to be bound by these terms. If you do not agree, do not use StayOS.`,
  },
  {
    title: '2. Eligibility',
    body: `You must be at least 18 years old to create an account on StayOS. By registering, you confirm that the information you provide is accurate and that you have the legal capacity to enter into binding contracts under South African law.`,
  },
  {
    title: '3. Guest and customer accounts',
    body: `Guests and customers may create accounts to make bookings, submit accommodation applications, manage payments and access the loyalty programme. You are responsible for keeping your account credentials secure. You must not share your account with others. You are liable for all activity that occurs under your account.`,
  },
  {
    title: '4. Bookings and applications',
    body: `Bookings made through StayOS constitute a direct contract between you and the property operator. StayOS facilitates the transaction but is not a party to the accommodation contract. Pricing, availability, cancellation policies and check-in requirements are set by each property operator. Student accommodation applications are submitted directly to the property operator and are subject to their admissions criteria and intake decisions. StayOS does not guarantee acceptance of any application.`,
  },
  {
    title: '5. Payments',
    body: `All payments are processed by our payment processors (PayFast, Ozow, Stripe). By making a payment, you agree to the relevant processor's terms of service. StayOS does not store full card details. Refunds are subject to the property operator's cancellation policy. Disputes must be raised within 30 days of the transaction by contacting support.`,
  },
  {
    title: '6. Property operator obligations',
    body: `Property operators who list on StayOS must: (a) ensure their property descriptions, photos and pricing are accurate and not misleading; (b) honour confirmed bookings; (c) comply with all applicable laws, including health and safety, consumer protection and accommodation licensing requirements; (d) hold all required licences and permits; (e) not discriminate against guests on any ground prohibited by South African law.`,
  },
  {
    title: '7. Agency obligations',
    body: `Agencies that use StayOS to manage properties on behalf of owners must hold valid mandates for each property they manage on the platform. Agencies must comply with the Estate Agency Affairs Act and all other applicable regulations. StayOS mandate records are not a substitute for formal management agreements between agencies and property owners.`,
  },
  {
    title: '8. Prohibited conduct',
    body: `You may not use StayOS to: (a) submit false, misleading or fraudulent information; (b) circumvent the platform to arrange transactions off-platform and avoid fees; (c) harass, threaten or abuse other users or StayOS staff; (d) upload or distribute malware, spam or any harmful content; (e) attempt to gain unauthorised access to any account, system or data; (f) violate any applicable law or regulation.`,
  },
  {
    title: '9. Content and reviews',
    body: `By submitting reviews, photos or other content to StayOS, you grant us a non-exclusive, royalty-free, perpetual licence to display, reproduce and distribute that content on the platform. You represent that you own or have the rights to the content you submit, and that it does not infringe any third-party rights. We reserve the right to remove content that violates these terms or our community guidelines.`,
  },
  {
    title: '10. Intellectual property',
    body: `All platform software, design, trademarks and content produced by StayOS are the intellectual property of LekkerQ (Pty) Ltd. You may not copy, reproduce, distribute or create derivative works from StayOS content without our written permission.`,
  },
  {
    title: '11. Limitation of liability',
    body: `To the maximum extent permitted by South African law, StayOS is not liable for: (a) any loss or damage arising from the acts or omissions of property operators, agencies or other users; (b) indirect, consequential or incidental losses; (c) loss of data, revenue or business opportunity. Our total liability to you for any claim arising from use of the platform shall not exceed the amount you paid to StayOS (not to the property) in the 12 months preceding the claim.`,
  },
  {
    title: '12. Termination',
    body: `We may suspend or terminate your account at any time for breach of these terms, fraudulent activity or conduct that harms other users or the platform. You may delete your account at any time from your profile settings. Termination does not affect obligations that arose before termination (including outstanding payments).`,
  },
  {
    title: '13. Changes to these terms',
    body: `We may update these terms from time to time. Material changes will be communicated at least 30 days in advance by email and a notice on the platform. Continued use of StayOS after the effective date of the change constitutes acceptance of the updated terms.`,
  },
  {
    title: '14. Governing law',
    body: `These terms are governed by the laws of the Republic of South Africa. Any disputes shall be subject to the exclusive jurisdiction of the courts of South Africa. We will attempt to resolve disputes through good-faith negotiation before initiating legal proceedings.`,
  },
  {
    title: '15. Contact',
    body: `For questions about these terms, contact us at legal@stayos.co.za or LekkerQ (Pty) Ltd, The Foundry, Level 3, 16 Ebenezer Road, Salt River, Cape Town, 7925.`,
  },
];

export default function TermsPage(): React.ReactElement {
  return (
    <>
      <PublicHeader />

      <div data-container style={{ padding: 'var(--space-12) var(--page-padding-x)', maxWidth: 800 }}>
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', fontSize: 'var(--text-base)', lineHeight: 'var(--leading-relaxed)', color: 'var(--color-text-secondary)' }}>
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)' }}>
                {section.title}
              </h2>
              <p>{section.body}</p>
            </section>
          ))}

          <div style={{ padding: 'var(--space-6)', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)' }}>
            <p>
              These Terms of Service apply to all users of the StayOS platform operated by LekkerQ (Pty) Ltd, Registration No. [●], South Africa. For questions contact{' '}
              <a href="mailto:legal@stayos.co.za" data-link>legal@stayos.co.za</a>.
            </p>
          </div>
        </div>
      </div>

      <PublicFooter />
    </>
  );
}
