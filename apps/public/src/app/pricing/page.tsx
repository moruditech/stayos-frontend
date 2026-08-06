import React from 'react';
import { Check, Minus, ArrowRight } from 'lucide-react';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';

const PLANS = [
  {
    name: 'Starter', price: 'R349', billing: 'per month, billed annually',
    desc: 'Get started with the essentials.',
    features: ['Up to 5 rooms','Direct bookings','Basic reports','Email support','iCal sync (1 channel)'],
    cta: 'Start free trial', featured: false,
  },
  {
    name: 'Professional', price: 'R799', billing: 'per month, billed annually',
    desc: 'Everything you need to grow.',
    features: ['Up to 30 rooms','All Starter features','Advanced reports','Priority support','iCal sync (5 channels)','Housekeeping module','Loyalty programme','Staff management'],
    cta: 'Start free trial', featured: true,
  },
  {
    name: 'Business', price: 'R1,499', billing: 'per month, billed annually',
    desc: 'Powerful features for serious operators.',
    features: ['Up to 100 rooms','All Professional features','AI pricing','Procurement module','HR module','Webhooks & API access','White-label owner portal','Multiple properties'],
    cta: 'Start free trial', featured: false,
  },
  {
    name: 'Enterprise', price: 'Custom', billing: 'Custom pricing',
    desc: 'Custom solutions for large portfolios.',
    features: ['Unlimited rooms','All Business features','Dedicated account manager','Custom integrations','SLA guarantee','On-site training','Custom reporting'],
    cta: "Let's talk", featured: false,
  },
];

const FAQS = [
  { q:"Is there a free trial?", a:"Yes. All paid plans include a 14-day free trial. No credit card required." },
  { q:"Can I change plans later?", a:"Yes. You can upgrade or downgrade at any time. Charges are prorated automatically." },
  { q:"What happens if I have more rooms than my plan allows?", a:"We'll notify you and give you 30 days to upgrade before bookings are paused." },
  { q:"Is the university/student housing module included?", a:"The university module is available on Business and Enterprise plans, or as an add-on." },
  { q:"Are there setup fees?", a:"No setup fees on any plan. You only pay the monthly or annual subscription." },
  { q:"What payment methods do you accept?", a:"Credit/debit card, EFT and debit orders. All prices exclude VAT." },
];

export default function PricingPage(): React.ReactElement {
  return (
    <>
      <PublicHeader activePage="/pricing" />

      {/* Hero */}
      <section style={{ background:'var(--color-surface)', padding:'var(--space-20) var(--page-padding-x)', textAlign:'center', borderBottom:'1px solid var(--color-border)' }}>
        <div data-container>
          <span data-section-label>FAIR PRICING, REAL VALUE</span>
          <h1 data-section-heading style={{ textAlign:'center' }}>Plans that grow with your business</h1>
          <p data-section-intro style={{ margin:'0 auto' }}>
            Choose the plan that fits you today, with the flexibility to scale tomorrow. All prices in ZAR, excl. VAT.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section data-section>
        <div data-container>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'var(--space-5)', alignItems:'flex-start', marginBottom:'var(--space-16)' }}>
            {PLANS.map((plan) => (
              <div key={plan.name} data-pricing-card data-featured={plan.featured?'':undefined}
                style={{ position:'relative', display:'flex', flexDirection:'column' }}>
                {plan.featured && <span data-pricing-featured-badge>Most popular</span>}
                <div data-plan-name>{plan.name}</div>
                <div data-plan-desc>{plan.desc}</div>
                <div data-plan-price-label>From</div>
                <div data-plan-price>
                  {plan.price}
                  {plan.price!=='Custom' && <span style={{ fontSize:'var(--text-sm)', fontWeight:'var(--font-normal)', color:'var(--color-text-muted)' }}>/mo</span>}
                </div>
                <div data-plan-billing>{plan.billing}</div>
                <ul style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)', margin:'var(--space-5) 0', flex:1 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display:'flex', gap:'var(--space-2)', fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', alignItems:'flex-start' }}>
                      <Check size={15} aria-hidden="true" style={{ color:'var(--color-primary)', flexShrink:0, marginTop:2 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={plan.name==='Enterprise' ? '/contact' : '/signup/property'}
                  data-btn-primary={plan.featured?'':undefined}
                  data-btn-secondary={!plan.featured?'':undefined}
                  style={{ width:'100%', justifyContent:'center', display:'flex' }}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>

          {/* Comparison note */}
          <div data-card-padded style={{ background:'var(--color-primary-light)', borderColor:'var(--color-primary)', textAlign:'center', marginBottom:'var(--space-12)' }}>
            <p style={{ fontSize:'var(--text-sm)', color:'var(--color-primary)' }}>
              All plans include a <strong>14-day free trial</strong> with no credit card required.
              Questions? <a href="/contact" data-link>Talk to our team <ArrowRight size={12} aria-hidden="true" /></a>
            </p>
          </div>

          {/* Feature comparison table */}
          <h2 style={{ fontSize:'var(--text-2xl)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-8)', textAlign:'center' }}>Full feature comparison</h2>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom:'2px solid var(--color-border)' }}>
                  <th style={{ textAlign:'left', padding:'var(--space-3) var(--space-4)', fontWeight:'var(--font-bold)', color:'var(--color-text-secondary)', width:'40%' }}>Feature</th>
                  {PLANS.map((p) => (
                    <th key={p.name} style={{ padding:'var(--space-3) var(--space-4)', textAlign:'center', fontWeight:'var(--font-bold)', color: p.featured ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Rooms included',         '5','30','100','Unlimited'],
                  ['Direct bookings',        '✓','✓','✓','✓'],
                  ['Channel sync (iCal)',     '1','5','Unlimited','Unlimited'],
                  ['Housekeeping module',     '—','✓','✓','✓'],
                  ['Maintenance module',      '—','✓','✓','✓'],
                  ['Staff management',        '—','✓','✓','✓'],
                  ['Advanced reports',        '—','✓','✓','✓'],
                  ['Loyalty programme',       '—','✓','✓','✓'],
                  ['AI pricing',              '—','—','✓','✓'],
                  ['University module',       '—','—','✓','✓'],
                  ['API & webhooks',          '—','—','✓','✓'],
                  ['Multiple properties',     '—','—','✓','✓'],
                  ['Dedicated manager',       '—','—','—','✓'],
                  ['Custom integrations',     '—','—','—','✓'],
                  ['Support',                 'Email','Priority','Priority','Dedicated'],
                ].map(([feat, ...vals]) => (
                  <tr key={feat} style={{ borderBottom:'1px solid var(--color-border)' }}>
                    <td style={{ padding:'var(--space-3) var(--space-4)', color:'var(--color-text-secondary)' }}>{feat}</td>
                    {vals.map((v, i) => (
                      <td key={i} style={{ padding:'var(--space-3) var(--space-4)', textAlign:'center', color: v==='✓' ? 'var(--color-success)' : v==='—' ? 'var(--color-text-muted)' : 'var(--color-text-primary)', fontWeight: v!=='✓'&&v!=='—' ? 'var(--font-semibold)' : 'normal' }}>
                        {v==='✓' ? <Check size={16} aria-hidden="true" style={{ display:'inline-block' }} /> : v==='—' ? <Minus size={14} aria-hidden="true" style={{ display:'inline-block' }} /> : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section data-section style={{ background:'var(--color-surface)', paddingTop:'var(--space-10)', paddingBottom:'var(--space-16)' }}>
        <div data-container>
          <h2 data-section-heading style={{ textAlign:'center', marginBottom:'var(--space-10)' }}>Frequently asked questions</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'var(--space-4)', maxWidth:900, margin:'0 auto' }}>
            {FAQS.map((f) => (
              <div key={f.q} data-card-padded>
                <h3 style={{ fontSize:'var(--text-sm)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-2)' }}>{f.q}</h3>
                <p style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', lineHeight:'var(--leading-relaxed)' }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div style={{ background:'var(--color-primary)', color:'white', padding:'var(--space-16) var(--page-padding-x)', textAlign:'center' }}>
        <div data-container>
          <h2 style={{ fontSize:'var(--text-3xl)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-4)' }}>Ready to get started?</h2>
          <p style={{ opacity:0.9, marginBottom:'var(--space-8)', fontSize:'var(--text-lg)' }}>Start your 14-day free trial — no credit card required.</p>
          <div style={{ display:'flex', gap:'var(--space-4)', justifyContent:'center', flexWrap:'wrap' }}>
            <a href="/signup/property" style={{ padding:'var(--space-4) var(--space-8)', background:'white', color:'var(--color-primary)', borderRadius:'var(--radius-md)', fontWeight:'var(--font-bold)', fontSize:'var(--text-base)', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'var(--space-2)' }}>
              Start free trial <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="/contact" style={{ padding:'var(--space-4) var(--space-8)', background:'rgba(255,255,255,0.15)', color:'white', border:'1.5px solid rgba(255,255,255,0.4)', borderRadius:'var(--radius-md)', fontWeight:'var(--font-semibold)', fontSize:'var(--text-base)', textDecoration:'none' }}>
              Talk to sales
            </a>
          </div>
        </div>
      </div>

      <PublicFooter />
    </>
  );
}
