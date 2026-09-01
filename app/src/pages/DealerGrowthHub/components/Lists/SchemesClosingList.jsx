import React from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SchemesClosingList({ schemes, onBack }) {
  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <button className="btn-icon" onClick={onBack}><ArrowLeft size={20} /></button>
        <h2 style={{ margin: 0 }}>Schemes Closing Soon ({schemes.length})</h2>
      </div>

      {schemes.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center' }} className="text-muted">No schemes closing within 15 days.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Scheme Name</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Start Date</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>End Date</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Days Remaining</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {schemes.map(s => {
                const remaining = Math.max(0, Math.ceil((new Date(s.end_date) - new Date()) / (1000 * 60 * 60 * 24)));
                let badgeClass = 'badge-primary';
                if (remaining <= 3) badgeClass = 'badge-danger';
                else if (remaining <= 7) badgeClass = 'badge-warning';
                
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{s.name}</td>
                    <td style={{ padding: '1rem' }}>{new Date(s.start_date).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem' }}>{new Date(s.end_date).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${badgeClass}`}>
                        <Clock size={12} style={{marginRight: '4px'}}/> {remaining} Days
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <Link to="/settings?tab=dealer_schemes" className="btn btn-secondary btn-sm" title="View Scheme">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
