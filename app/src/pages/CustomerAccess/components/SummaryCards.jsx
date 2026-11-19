import React from 'react';
import { Users, CheckCircle2, Clock, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function SummaryCards({ metrics, loading, onFilterSelect, activeFilter }) {
  const cards = [
    {
      id: 'ALL',
      title: 'Total Customers',
      hindi: 'कुल ग्राहक',
      count: metrics.totalCustomers,
      icon: Users,
      color: 'blue',
      borderColor: '#3b82f6',
      bgLight: 'rgba(59, 130, 246, 0.08)',
      textClass: 'text-blue-600',
    },
    {
      id: 'CREATED',
      title: 'Accounts Created',
      hindi: 'खाता बना हुआ',
      count: metrics.accountsCreated,
      icon: CheckCircle2,
      color: 'emerald',
      borderColor: '#10b981',
      bgLight: 'rgba(16, 185, 129, 0.08)',
      textClass: 'text-emerald-600',
    },
    {
      id: 'PENDING',
      title: 'Accounts Pending',
      hindi: 'खाता बाकी',
      count: metrics.accountsPending,
      icon: Clock,
      color: 'amber',
      borderColor: '#f59e0b',
      bgLight: 'rgba(245, 158, 11, 0.08)',
      textClass: 'text-amber-600',
    },
    {
      id: 'ACTIVE',
      title: 'Active Accounts',
      hindi: 'सक्रिय खाते',
      count: metrics.activeAccounts,
      icon: ShieldCheck,
      color: 'green',
      borderColor: '#16a34a',
      bgLight: 'rgba(22, 163, 74, 0.08)',
      textClass: 'text-green-600',
    },
    {
      id: 'DISABLED',
      title: 'Disabled Accounts',
      hindi: 'निष्क्रिय खाते',
      count: metrics.disabledAccounts,
      icon: ShieldAlert,
      color: 'rose',
      borderColor: '#e11d48',
      bgLight: 'rgba(225, 29, 72, 0.08)',
      textClass: 'text-rose-600',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
      gap: '1rem',
      marginBottom: '1.5rem',
    }}>
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = activeFilter === c.id;

        return (
          <div
            key={c.id}
            onClick={() => onFilterSelect && onFilterSelect(c.id)}
            style={{
              cursor: onFilterSelect ? 'pointer' : 'default',
              padding: '1.15rem 1.25rem',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-surface, #ffffff)',
              border: isSelected ? `2px solid ${c.borderColor}` : '1px solid var(--border, #e2e8f0)',
              boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.18s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
            className="hover:shadow-md"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
                {c.title}
              </span>
              <div style={{
                padding: '0.4rem',
                borderRadius: '8px',
                backgroundColor: c.bgLight,
                color: c.borderColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon size={18} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--text-primary, #0f172a)',
                lineHeight: 1.1,
              }}>
                {loading ? '...' : c.count}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                {c.hindi}
              </span>
            </div>

            {isSelected && (
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: c.borderColor,
              }}>
                ● Filter Active
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
