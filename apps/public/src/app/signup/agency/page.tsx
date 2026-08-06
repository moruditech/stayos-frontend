'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { InlineError } from '@stayos/ui';
import { Landmark, ClipboardList, Users, Wallet, KeyRound, BarChart3, ArrowRight, type LucideIcon } from 'lucide-react';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';

// Agency registration redirects to the Agency Portal's own onboarding flow.
// This page collects enough to pre-fill it, then hands off.
const agencySignupSchema = z.object({
  firstName:   z.string().min(1, 'Required'),
  lastName:    z.string().min(1, 'Required'),
  email:       z.string().email('Valid email required'),
  password:    z.string().min(8, 'Min 8 characters'),
  phone:       z.string().optional(),
  agencyName:  z.string().min(2, 'Agency name is required'),
  city:        z.string().min(2, 'City is required'),
  portfolioSize: z.enum(['1_5','6_20','21_50','51_plus'], { required_error:'Select portfolio size' }),
  agreeTerms:  z.literal(true, { errorMap: () => ({ message:'You must accept the terms' }) }),
});
type AgencySignupInput = z.infer<typeof agencySignupSchema>;

const AGENCY_BENEFITS: { icon: LucideIcon; text: string }[] = [
  { icon: Landmark,     text:'Centralised portfolio management across all your properties' },
  { icon: ClipboardList, text:'Full mandate management — request, accept, terminate' },
  { icon: Users,        text:'Agency staff management with role-based access per property' },
  { icon: Wallet,       text:'Statements, commissions and billing split tracking' },
  { icon: KeyRound,     text:'Enter any managed property as native staff with one click' },
  { icon: BarChart3,    text:'Portfolio analytics and cross-property reporting' },
];

const PORTFOLIO_OPTIONS = [
  { value:'1_5',    label:'1 – 5 properties' },
  { value:'6_20',   label:'6 – 20 properties' },
  { value:'21_50',  label:'21 – 50 properties' },
  { value:'51_plus',label:'51+ properties' },
];

export default function AgencySignupPage(): React.ReactElement {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');

  const form = useForm<AgencySignupInput>({
    resolver: zodResolver(agencySignupSchema),
    defaultValues: { firstName:'', lastName:'', email:'', password:'', agencyName:'', city:'' },
  });

  async function handleSubmit(values: AgencySignupInput): Promise<void> {
    setSubmitting(true);
    setFormError('');
    try {
      // Agency registration goes through the Agency Portal's own onboarding endpoint.
      // Build a prefill URL and redirect — the Agency Portal handles the actual account creation
      // and onboarding wizard from that point, keeping all agency-scope logic in agency.stayos.co.za.
      const prefill = new URLSearchParams({
        firstName:   values.firstName,
        lastName:    values.lastName,
        email:       values.email,
        agencyName:  values.agencyName,
        city:        values.city,
        portfolioSize: values.portfolioSize,
      });
      // Short delay for UX, then hand off
      await new Promise((r) => setTimeout(r, 400));
      window.location.href = `https://agency.stayos.co.za/register?${prefill.toString()}`;
    } catch {
      setFormError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <PublicHeader />

      <section style={{ background:'var(--color-primary)', padding:'var(--space-12) var(--page-padding-x)', color:'white' }}>
        <div data-container>
          <h1 style={{ fontSize:'clamp(1.75rem,4vw,2.5rem)', fontWeight:'var(--font-bold)', lineHeight:'var(--leading-tight)', marginBottom:'var(--space-3)' }}>
            Register your agency on StayOS
          </h1>
          <p style={{ fontSize:'var(--text-lg)', opacity:0.9, maxWidth:520 }}>
            Manage your entire property portfolio from one place. Mandates, staff, statements and more.
          </p>
        </div>
      </section>

      <div data-container style={{ padding:'var(--space-12) var(--page-padding-x)' }}>
        <div data-cols-uneven style={{ gap:'var(--space-12)', alignItems:'flex-start' }}>

          {/* Benefits */}
          <div>
            <h2 style={{ fontSize:'var(--text-xl)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-6)' }}>
              Why agencies choose StayOS
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)', marginBottom:'var(--space-8)' }}>
              {AGENCY_BENEFITS.map((b) => (
                <div key={b.text} style={{ display:'flex', alignItems:'center', gap:'var(--space-4)' }}>
                  <span style={{ color:'var(--color-primary)', width:40, height:40, background:'var(--color-primary-light)', borderRadius:'var(--radius-md)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><b.icon size={20} /></span>
                  <span style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)' }}>{b.text}</span>
                </div>
              ))}
            </div>
            <div data-card-padded style={{ background:'var(--color-surface-muted)' }}>
              <p style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', lineHeight:'var(--leading-relaxed)' }}>
                <strong>Questions?</strong> Our team is ready to help you get started.{' '}
                <a href="/contact?subject=agency" data-link>Talk to sales <ArrowRight size={12} aria-hidden="true" /></a>
              </p>
            </div>
          </div>

          {/* Form */}
          <div>
            <h2 style={{ fontSize:'var(--text-xl)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-6)' }}>
              Create your agency account
            </h2>
            <form onSubmit={form.handleSubmit((v) => void handleSubmit(v))} noValidate
              style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
              <div data-cols-2 style={{ gap:'var(--space-4)' }}>
                <div data-form-group>
                  <label htmlFor="ag-fn">First name *</label>
                  <input id="ag-fn" type="text" autoComplete="given-name" {...form.register('firstName')} />
                  <InlineError message={form.formState.errors.firstName?.message} />
                </div>
                <div data-form-group>
                  <label htmlFor="ag-ln">Last name *</label>
                  <input id="ag-ln" type="text" autoComplete="family-name" {...form.register('lastName')} />
                  <InlineError message={form.formState.errors.lastName?.message} />
                </div>
              </div>
              <div data-form-group>
                <label htmlFor="ag-em">Email address *</label>
                <input id="ag-em" type="email" autoComplete="email" {...form.register('email')} />
                <InlineError message={form.formState.errors.email?.message} />
              </div>
              <div data-form-group>
                <label htmlFor="ag-pw">Password *</label>
                <input id="ag-pw" type="password" autoComplete="new-password" {...form.register('password')} />
                <InlineError message={form.formState.errors.password?.message} />
              </div>
              <div data-form-group>
                <label htmlFor="ag-ph">Phone <span style={{ color:'var(--color-text-muted)' }}>(optional)</span></label>
                <input id="ag-ph" type="tel" autoComplete="tel" {...form.register('phone')} />
              </div>
              <div data-form-group>
                <label htmlFor="ag-an">Agency / company name *</label>
                <input id="ag-an" type="text" placeholder="e.g. Prestige Property Management" {...form.register('agencyName')} />
                <InlineError message={form.formState.errors.agencyName?.message} />
              </div>
              <div data-form-group>
                <label htmlFor="ag-city">Primary city *</label>
                <input id="ag-city" type="text" placeholder="e.g. Johannesburg" {...form.register('city')} />
                <InlineError message={form.formState.errors.city?.message} />
              </div>
              <div data-form-group>
                <label htmlFor="ag-ps">Portfolio size *</label>
                <select id="ag-ps" {...form.register('portfolioSize')}>
                  <option value="">Select…</option>
                  {PORTFOLIO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <InlineError message={form.formState.errors.portfolioSize?.message} />
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
              <button type="submit" disabled={submitting} data-btn-primary data-btn-full>
                {submitting ? 'Setting up your account…' : <>Create agency account <ArrowRight size={16} aria-hidden="true" /></>}
              </button>
              <p style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)', textAlign:'center' }}>
                Already have an account?{' '}
                <a href="https://agency.stayos.co.za/login" data-link>Sign in <ArrowRight size={12} aria-hidden="true" /></a>
              </p>
            </form>
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}