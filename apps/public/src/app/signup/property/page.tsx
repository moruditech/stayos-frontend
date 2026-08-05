'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { InlineError } from '@stayos/ui';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';

// Tenant.type is intentionally kept as a free text select pending the backend
// enum fix (ticket filed — Mongoose model vs Zod schema disagreement).
// We offer the Mongoose-confirmed 4 values only: guesthouse, hotel, rental, student_housing.
const propertySignupSchema = z.object({
  firstName:   z.string().min(1, 'Required'),
  lastName:    z.string().min(1, 'Required'),
  email:       z.string().email('Valid email required'),
  password:    z.string().min(8, 'Min 8 characters'),
  phone:       z.string().optional(),
  companyName: z.string().optional(),
  vatNumber:   z.string().optional(),
  propertyName:z.string().min(2, 'Property name is required'),
  propertyType:z.enum(['guesthouse','hotel','rental','student_housing'], { required_error:'Select a property type' }),
  city:        z.string().min(2, 'City is required'),
  roomCount:   z.number({ invalid_type_error:'Enter a number' }).int().min(1,'At least 1 room'),
  agreeTerms:  z.literal(true, { errorMap: () => ({ message:'You must accept the terms' }) }),
});
type PropertySignupInput = z.infer<typeof propertySignupSchema>;

const PROPERTY_TYPES = [
  { value:'guesthouse',     label:'Guesthouse / B&B' },
  { value:'hotel',          label:'Hotel / Boutique Hotel' },
  { value:'rental',         label:'Rental / Self-catering' },
  { value:'student_housing',label:'Student Housing / Residence' },
];

const PLAN_FEATURES = [
  { icon:'📅', text:'Direct bookings & availability calendar' },
  { icon:'💳', text:'Integrated payments (PayFast, Ozow, Stripe)' },
  { icon:'🧹', text:'Housekeeping & maintenance modules' },
  { icon:'📊', text:'Reports and performance analytics' },
  { icon:'🔄', text:'Channel sync with Airbnb & Booking.com' },
  { icon:'👥', text:'Staff management & role permissions' },
];

export default function PropertySignupPage(): React.ReactElement {
  const [step, setStep]         = useState<1|2>(1);
  const [done, setDone]         = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PropertySignupInput>({
    resolver: zodResolver(propertySignupSchema),
    defaultValues: { firstName:'', lastName:'', email:'', password:'', propertyName:'', city:'', roomCount: 1 },
  });

  async function handleSubmit(values: PropertySignupInput): Promise<void> {
    setSubmitting(true);
    setFormError('');
    try {
      await api.owner.register({
        firstName:   values.firstName,
        lastName:    values.lastName,
        email:       values.email,
        password:    values.password,
        phone:       values.phone,
        companyName: values.companyName,
        vatNumber:   values.vatNumber,
      });
      setDone(true);
    } catch (err) {
      const apiErr = err as ApiError;
      setFormError(apiErr.message ?? 'Registration failed. Please try again.');
      setStep(1);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <>
        <PublicHeader />
        <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'var(--space-12) var(--page-padding-x)' }}>
          <div style={{ maxWidth:480, textAlign:'center' }}>
            <div style={{ fontSize:'var(--text-5xl)', marginBottom:'var(--space-5)' }}>✅</div>
            <h1 style={{ fontSize:'var(--text-2xl)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-3)' }}>Account created!</h1>
            <p style={{ color:'var(--color-text-secondary)', marginBottom:'var(--space-6)', lineHeight:'var(--leading-relaxed)' }}>
              We&apos;ve sent a verification email. Once verified, sign in to the Owner Portal to complete your property setup.
            </p>
            <a href="https://owners.stayos.co.za/login" data-btn-primary style={{ display:'inline-flex' }}>
              Go to Owner Portal →
            </a>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <PublicHeader />
      <section style={{ background:'var(--color-primary)', padding:'var(--space-12) var(--page-padding-x)', color:'white' }}>
        <div data-container>
          <h1 style={{ fontSize:'clamp(1.75rem,4vw,2.5rem)', fontWeight:'var(--font-bold)', lineHeight:'var(--leading-tight)', marginBottom:'var(--space-3)' }}>
            List your property on StayOS
          </h1>
          <p style={{ fontSize:'var(--text-lg)', opacity:0.9, maxWidth:520 }}>
            Join 3,000+ properties across South Africa and start getting direct bookings today.
          </p>
        </div>
      </section>

      <div data-container style={{ padding:'var(--space-12) var(--page-padding-x)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:'var(--space-12)', alignItems:'flex-start' }}>

          {/* Left — benefits */}
          <div>
            <h2 style={{ fontSize:'var(--text-xl)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-6)' }}>
              Everything you need to run your property
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)', marginBottom:'var(--space-8)' }}>
              {PLAN_FEATURES.map((f) => (
                <div key={f.text} style={{ display:'flex', alignItems:'center', gap:'var(--space-4)' }}>
                  <span style={{ fontSize:'var(--text-xl)', width:40, height:40, background:'var(--color-primary-light)', borderRadius:'var(--radius-md)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{f.icon}</span>
                  <span style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)' }}>{f.text}</span>
                </div>
              ))}
            </div>
            <div data-card-padded style={{ background:'var(--color-primary-light)' }}>
              <p style={{ fontSize:'var(--text-sm)', color:'var(--color-primary)', fontWeight:'var(--font-medium)' }}>
                🎁 Start with a <strong>14-day free trial</strong> — no credit card required.
              </p>
            </div>
          </div>

          {/* Right — form */}
          <div>
            {/* Step indicator */}
            <div style={{ display:'flex', gap:'var(--space-2)', marginBottom:'var(--space-6)', alignItems:'center' }}>
              {[1,2].map((s) => (
                <React.Fragment key={s}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background: s<=step ? 'var(--color-primary)' : 'var(--color-surface-muted)', color: s<=step ? 'white' : 'var(--color-text-muted)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'var(--text-xs)', fontWeight:'var(--font-bold)' }}>
                    {s<step ? '✓' : s}
                  </div>
                  <span style={{ fontSize:'var(--text-sm)', color: s===step ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontWeight: s===step ? 'var(--font-semibold)' : 'normal' }}>
                    {s===1 ? 'Your details' : 'Property details'}
                  </span>
                  {s < 2 && <div style={{ flex:1, height:2, background:'var(--color-border)', borderRadius:2 }} />}
                </React.Fragment>
              ))}
            </div>

            <form onSubmit={form.handleSubmit((v) => void handleSubmit(v))} noValidate>
              {/* Step 1 — account details */}
              {step === 1 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--space-4)' }}>
                    <div data-form-group>
                      <label htmlFor="os-fn">First name *</label>
                      <input id="os-fn" type="text" autoComplete="given-name" {...form.register('firstName')} />
                      <InlineError message={form.formState.errors.firstName?.message} />
                    </div>
                    <div data-form-group>
                      <label htmlFor="os-ln">Last name *</label>
                      <input id="os-ln" type="text" autoComplete="family-name" {...form.register('lastName')} />
                      <InlineError message={form.formState.errors.lastName?.message} />
                    </div>
                  </div>
                  <div data-form-group>
                    <label htmlFor="os-em">Email address *</label>
                    <input id="os-em" type="email" autoComplete="email" {...form.register('email')} />
                    <InlineError message={form.formState.errors.email?.message} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="os-pw">Password *</label>
                    <input id="os-pw" type="password" autoComplete="new-password" {...form.register('password')} />
                    <InlineError message={form.formState.errors.password?.message} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="os-ph">Phone <span style={{ color:'var(--color-text-muted)' }}>(optional)</span></label>
                    <input id="os-ph" type="tel" autoComplete="tel" {...form.register('phone')} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="os-co">Company name <span style={{ color:'var(--color-text-muted)' }}>(optional)</span></label>
                    <input id="os-co" type="text" {...form.register('companyName')} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="os-vat">VAT number <span style={{ color:'var(--color-text-muted)' }}>(optional)</span></label>
                    <input id="os-vat" type="text" {...form.register('vatNumber')} />
                  </div>
                  {formError && <span role="alert" data-form-error>{formError}</span>}
                  <button type="button" data-btn-primary data-btn-full
                    onClick={() => void form.trigger(['firstName','lastName','email','password']).then((ok) => { if (ok) setStep(2); })}>
                    Continue →
                  </button>
                  <p style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)', textAlign:'center' }}>
                    Already have an account?{' '}
                    <a href="https://owners.stayos.co.za/login" data-link>Sign in →</a>
                  </p>
                </div>
              )}

              {/* Step 2 — property details */}
              {step === 2 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
                  <div data-form-group>
                    <label htmlFor="os-pn">Property name *</label>
                    <input id="os-pn" type="text" placeholder="e.g. The Blyde Guesthouse" {...form.register('propertyName')} />
                    <InlineError message={form.formState.errors.propertyName?.message} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="os-pt">Property type *</label>
                    <select id="os-pt" {...form.register('propertyType')}>
                      <option value="">Select type…</option>
                      {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <InlineError message={form.formState.errors.propertyType?.message} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="os-city">City *</label>
                    <input id="os-city" type="text" placeholder="e.g. Cape Town" {...form.register('city')} />
                    <InlineError message={form.formState.errors.city?.message} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="os-rc">Number of rooms *</label>
                    <input id="os-rc" type="number" min={1} {...form.register('roomCount', { valueAsNumber:true })} />
                    <InlineError message={form.formState.errors.roomCount?.message} />
                  </div>
                  <label data-checkbox-label style={{ alignItems:'flex-start', gap:'var(--space-3)' }}>
                    <input type="checkbox" {...form.register('agreeTerms')} style={{ marginTop:3 }} />
                    <span style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)' }}>
                      I agree to the{' '}
                      <a href="/legal/terms" data-link target="_blank" rel="noopener noreferrer">Terms of Service</a>{' '}
                      and{' '}
                      <a href="/legal/privacy" data-link target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                    </span>
                  </label>
                  <InlineError message={form.formState.errors.agreeTerms?.message} />
                  {formError && <span role="alert" data-form-error>{formError}</span>}
                  <div style={{ display:'flex', gap:'var(--space-3)' }}>
                    <button type="button" data-btn-ghost onClick={() => setStep(1)}>← Back</button>
                    <button type="submit" disabled={submitting} data-btn-primary style={{ flex:1 }}>
                      {submitting ? 'Creating account…' : 'Create account & list property'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
