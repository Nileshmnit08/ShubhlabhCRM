import React from 'react';
import { HardHat, PlugZap, ClipboardList, Wallet, Scale } from 'lucide-react';

/**
 * SL-LABOUR-NAV-01: Labour Hisaab destination page (admin only).
 *
 * Deliberately makes NO database calls. Live labour data is not connected yet: the secure
 * schema (proposals 249/250) is awaiting approval and the LabourHisaab app does not sync.
 * The page must never show sample labourers or amounts as if they were real.
 */
const COMING = [
  { icon: ClipboardList, title: 'Daily work', text: 'Work entries by date and work type, with quantity, rate and amount.' },
  { icon: Wallet, title: 'Labour payments', text: 'Payments made to each labourer, by date and method.' },
  { icon: Scale, title: 'Balances', text: 'Earnings, payments, allocated deductions and pending amounts per labourer.' },
];

export default function LabourHisaab() {
  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HardHat size={26} /> Labour Hisaab
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
            Labour work and payment records from the LabourHisaab app.
          </p>
        </div>
      </div>

      <div className="card" role="status" style={{ padding: '2rem', textAlign: 'center', maxWidth: '720px' }}>
        <PlugZap size={40} className="text-warning" style={{ margin: '0 auto 0.75rem' }} aria-hidden="true" />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Labour Hisaab data is not connected yet.
        </h2>
        <p className="text-secondary" style={{ fontSize: '0.95rem', lineHeight: 1.6, margin: '0 auto', maxWidth: '560px' }}>
          This page will show labour work and payment details once the live data connection is available.
          Until then no figures are shown here, so nothing on this page can be mistaken for real labour records.
        </p>
      </div>

      <div style={{ marginTop: '1.5rem', maxWidth: '720px' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          What will appear here
        </h2>
        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {COMING.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                <Icon size={18} aria-hidden="true" /> {title}
              </div>
              <p className="text-secondary" style={{ fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
