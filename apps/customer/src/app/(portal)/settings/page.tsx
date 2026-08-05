'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@stayos/auth';

const SETTING_SECTIONS = [
  {
    title: 'Account',
    items: [
      { label:'Personal information',      desc:'Update your name, email and other details.',   path:'/profile',                          icon:'👤' },
      { label:'Change password',           desc:'Update your account password.',                path:'/profile/password',                 icon:'🔒' },
      { label:'Connected accounts',        desc:'Manage your Google OAuth connection.',         path:'/profile#security',                 icon:'🔗' },
    ],
  },
  {
    title: 'Privacy & data',
    items: [
      { label:'Communication preferences', desc:'Manage how we contact you.',                  path:'/profile/communication-prefs',      icon:'🔔' },
      { label:'Export my data',            desc:'Download a copy of your personal data (POPIA DSAR).', path:'/profile/data-export',     icon:'📥' },
      { label:'Delete account',            desc:'Permanently deactivate your account.',        path:'/profile/delete-account',           icon:'🗑' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label:'Help Centre',               desc:'Guides, FAQs and troubleshooting.',           path:'https://stayos.co.za/help',         icon:'📖', external: true },
      { label:'Contact support',           desc:'Open a support ticket with our team.',        path:'/support',                          icon:'🎧' },
      { label:'Privacy Policy',            desc:'How we handle your personal information.',    path:'https://stayos.co.za/legal/privacy',icon:'🛡', external: true },
      { label:'Terms of Service',          desc:'The rules governing use of StayOS.',         path:'https://stayos.co.za/legal/terms',  icon:'📋', external: true },
    ],
  },
];

export default function SettingsPage(): React.ReactElement {
  const session = useSession();
  const router  = useRouter();

  if (!session) return <></>;

  return (
    <div data-page>
      <h1 data-page-title>Settings</h1>
      <p data-page-subtitle>Manage your account, privacy and support options</p>

      <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-8)', maxWidth:600 }}>
        {SETTING_SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 style={{ fontSize:'var(--text-sm)', fontWeight:'var(--font-bold)', color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'var(--space-3)' }}>
              {section.title}
            </h2>
            <div data-card style={{ overflow:'hidden' }}>
              {section.items.map((item, i) => (
                <button key={item.label} type="button"
                  onClick={() => {
                    if (item.external) window.open(item.path, '_blank', 'noopener noreferrer');
                    else router.push(item.path);
                  }}
                  style={{
                    display:'flex', alignItems:'center', gap:'var(--space-4)',
                    padding:'var(--space-4) var(--space-5)', width:'100%', textAlign:'left',
                    background:'var(--color-surface)', border:'none', cursor:'pointer',
                    borderBottom: i < section.items.length-1 ? '1px solid var(--color-border)' : 'none',
                    transition:'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-muted)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface)'; }}>
                  <span style={{ fontSize:'var(--text-xl)', width:40, height:40, background:'var(--color-surface-muted)', borderRadius:'var(--radius-md)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {item.icon}
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'var(--text-sm)', fontWeight:'var(--font-medium)', marginBottom:2 }}>{item.label}</div>
                    <div style={{ fontSize:'var(--text-xs)', color:'var(--color-text-secondary)' }}>{item.desc}</div>
                  </div>
                  <span style={{ color:'var(--color-text-muted)', flexShrink:0 }}>
                    {item.external ? '↗' : '›'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Account info footer */}
        <div style={{ padding:'var(--space-5)', background:'var(--color-surface-muted)', borderRadius:'var(--radius-lg)', fontSize:'var(--text-xs)', color:'var(--color-text-muted)' }}>
          <div>Account ID: <span style={{ fontFamily:'monospace' }}>{session.userId}</span></div>
          <div style={{ marginTop:'var(--space-1)' }}>Role: <span style={{ textTransform:'capitalize' }}>{session.role.replace(/_/g,' ')}</span></div>
        </div>
      </div>
    </div>
  );
}
