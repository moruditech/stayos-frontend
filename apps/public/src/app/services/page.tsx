import React from 'react';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';

const HOSPITALITY_FEATURES = [
  { icon:'📅', title:'Booking management',          desc:'Direct bookings with real-time availability, conflict detection and automated confirmations.' },
  { icon:'🏨', title:'Room & rate management',       desc:'Manage room types, pricing rules, promotions and seasonal rates from one dashboard.' },
  { icon:'🔄', title:'Channel manager & iCal sync', desc:'Sync your calendar with Airbnb, Booking.com and other OTAs to prevent double bookings.' },
  { icon:'👥', title:'Guest management',             desc:'Guest profiles, check-in/out, digital keys, ID verification and communication tools.' },
  { icon:'💳', title:'Payments & invoicing',         desc:'Accept PayFast, Ozow and Stripe. Automated invoicing and folio management.' },
  { icon:'🧹', title:'Housekeeping & maintenance',   desc:'Task boards, staff schedules, work orders and real-time status updates.' },
  { icon:'📊', title:'Reports & analytics',          desc:'Occupancy, revenue, ADR, booking source analysis and financial reporting.' },
  { icon:'🏛', title:'Agency mandates',              desc:'Owner portal with mandate management for properties run by agencies.' },
];

const STUDENT_FEATURES = [
  { icon:'📋', title:'Online applications',       desc:'Customisable application forms with document uploads, closing dates and automated status notifications.' },
  { icon:'🛏', title:'Room & bed management',     desc:'Manage capacity, bed types, room assignments and occupancy at the granular level.' },
  { icon:'🧾', title:'Student billing',           desc:'Invoicing with line items for tuition, accommodation, laundry and admin fees. NSFAS and bursary support.' },
  { icon:'📝', title:'Digital leases',            desc:'Issue, sign and store lease agreements digitally. Every access logged for compliance.' },
  { icon:'📈', title:'Reporting',                  desc:'Financial, occupancy and student status reporting for management and compliance.' },
  { icon:'🎓', title:'Multi-provider support',     desc:'Built for universities, private providers and mixed portfolios.' },
];

export default function ServicesPage(): React.ReactElement {
  return (
    <>
      <PublicHeader activePage="/services" />

      {/* Hero */}
      <section style={{ background:'var(--color-primary)', color:'white', padding:'var(--space-20) var(--page-padding-x)', textAlign:'center' }}>
        <div data-container>
          <span style={{ fontSize:'var(--text-xs)', fontWeight:'var(--font-bold)', letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.7, display:'block', marginBottom:'var(--space-4)' }}>
            BUILT FOR TWO AUDIENCES
          </span>
          <h1 style={{ fontSize:'clamp(2rem,5vw,3.5rem)', fontWeight:'var(--font-bold)', lineHeight:'var(--leading-tight)', marginBottom:'var(--space-6)' }}>
            Solutions that work for you
          </h1>
          <p style={{ fontSize:'var(--text-lg)', opacity:0.9, maxWidth:560, margin:'0 auto var(--space-8)', lineHeight:'var(--leading-relaxed)' }}>
            Whether you run a guesthouse, hotel, student residence or agency portfolio — StayOS has the tools to help you operate smarter.
          </p>
          <div style={{ display:'flex', gap:'var(--space-4)', justifyContent:'center', flexWrap:'wrap' }}>
            <a href="#hospitality" style={{ padding:'var(--space-3) var(--space-6)', background:'white', color:'var(--color-primary)', borderRadius:'var(--radius-md)', fontWeight:'var(--font-semibold)', fontSize:'var(--text-sm)', textDecoration:'none' }}>
              Hospitality operators
            </a>
            <a href="#student" style={{ padding:'var(--space-3) var(--space-6)', background:'rgba(255,255,255,0.15)', color:'white', border:'1.5px solid rgba(255,255,255,0.4)', borderRadius:'var(--radius-md)', fontWeight:'var(--font-semibold)', fontSize:'var(--text-sm)', textDecoration:'none' }}>
              Student housing
            </a>
          </div>
        </div>
      </section>

      {/* Hospitality */}
      <section id="hospitality" data-section>
        <div data-container>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--space-12)', alignItems:'center', marginBottom:'var(--space-12)' }}>
            <div>
              <span data-section-label>FOR HOSPITALITY OPERATORS</span>
              <h2 data-section-heading>More bookings, less admin.</h2>
              <p data-section-intro style={{ fontSize:'var(--text-base)' }}>
                Direct bookings, real-time availability, automated payments and staff coordination — all in one platform built for South African hospitality businesses.
              </p>
              <div style={{ display:'flex', gap:'var(--space-4)', marginTop:'var(--space-8)', flexWrap:'wrap' }}>
                <a href="/signup/property" data-btn-primary>List your property →</a>
                <a href="/pricing" data-btn-secondary>View pricing</a>
              </div>
            </div>
            <div style={{ aspectRatio:'4/3', background:'var(--color-surface-muted)', borderRadius:'var(--radius-xl)', overflow:'hidden' }}>
              {/* /images/public/services-hospitality-detail.jpg */}
              <img
                src="/images/public/services-hospitality-detail.jpg"
                alt="Hotel management"
                style={{ width:'100%', height:'100%', objectFit:'cover' }}
                loading="lazy"
              />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'var(--space-5)' }}>
            {HOSPITALITY_FEATURES.map((f) => (
              <div key={f.title} data-card-padded>
                <div style={{ fontSize:'var(--text-2xl)', marginBottom:'var(--space-3)' }}>{f.icon}</div>
                <h3 style={{ fontSize:'var(--text-base)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-2)' }}>{f.title}</h3>
                <p style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', lineHeight:'var(--leading-relaxed)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Student housing */}
      <section id="student" data-section style={{ background:'var(--color-surface)' }}>
        <div data-container>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--space-12)', alignItems:'center', marginBottom:'var(--space-12)' }}>
            <div style={{ aspectRatio:'4/3', background:'var(--color-surface-muted)', borderRadius:'var(--radius-xl)', overflow:'hidden' }}>
              {/* /images/public/services-student-detail.jpg */}
              <img
                src="/images/public/services-student-detail.jpg"
                alt="Student accommodation"
                style={{ width:'100%', height:'100%', objectFit:'cover' }}
                loading="lazy"
              />
            </div>
            <div>
              <span data-section-label>FOR STUDENT HOUSING OPERATORS</span>
              <h2 data-section-heading>Built for universities and private providers.</h2>
              <p data-section-intro style={{ fontSize:'var(--text-base)' }}>
                Manage applications, leases, billing and occupancy for student accommodation — with tools for self-paying students, NSFAS and bursary recipients.
              </p>
              <div style={{ display:'flex', gap:'var(--space-4)', marginTop:'var(--space-8)', flexWrap:'wrap' }}>
                <a href="/signup/property" data-btn-primary>Get started →</a>
                <a href="/contact" data-btn-secondary>Talk to sales</a>
              </div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'var(--space-5)' }}>
            {STUDENT_FEATURES.map((f) => (
              <div key={f.title} data-card-padded>
                <div style={{ fontSize:'var(--text-2xl)', marginBottom:'var(--space-3)' }}>{f.icon}</div>
                <h3 style={{ fontSize:'var(--text-base)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-2)' }}>{f.title}</h3>
                <p style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', lineHeight:'var(--leading-relaxed)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div data-cta-section>
        <div data-container style={{ textAlign:'center' }}>
          <h2 data-section-heading>Ready to get started?</h2>
          <p data-section-intro style={{ margin:'0 auto' }}>Join thousands of operators across South Africa on StayOS.</p>
          <div data-cta-actions>
            <a href="/signup/property" data-btn-primary>List your property</a>
            <a href="/contact" data-btn-secondary>Talk to our team</a>
          </div>
        </div>
      </div>

      <PublicFooter />
    </>
  );
}
