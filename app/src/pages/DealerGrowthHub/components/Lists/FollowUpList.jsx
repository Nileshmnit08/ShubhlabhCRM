import React from 'react';
import { ArrowLeft, MessageSquare, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FollowUpList({ title, records, onBack }) {
  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <button className="btn-icon" onClick={onBack}><ArrowLeft size={20} /></button>
        <h2 style={{ margin: 0 }}>{title} ({records.length})</h2>
      </div>

      {records.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center' }} className="text-muted">No customers found for this criteria.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Customer Name</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Scheme Name</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Current Progress</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Target Info</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Pace (Monthly)</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr key={`${r.customer_id}-${r.scheme_id}-${idx}`} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
                    <div className="text-secondary" style={{ fontSize: '0.85rem' }}>{r.city} • {r.mobile}</div>
                    <div className="text-secondary" style={{ fontSize: '0.80rem', marginTop: '0.25rem' }}>Owner: {r.owner_name}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>{r.scheme_name}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{Number(r.current_net_bags).toLocaleString()} Bags</div>
                    <div className="text-secondary" style={{ fontSize: '0.85rem' }}>{r.achieved_slab_name ? `Achieved: ${r.achieved_slab_name}` : 'No slab yet'}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {r.next_slab_name ? (
                      <>
                        <div style={{ fontWeight: 500 }}>Next: {r.next_slab_name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--info)' }}>{Number(r.bags_needed).toLocaleString()} bags needed</div>
                        <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Reward: {r.potential_next_reward}</div>
                      </>
                    ) : (
                      <div className="text-muted">Max slab reached</div>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: r.pace_percentage >= 100 ? 'var(--success)' : r.pace_percentage >= 80 ? 'var(--warning)' : r.pace_percentage > 0 ? 'var(--danger)' : 'inherit' }}>
                      {r.pace_percentage}% Target Pace
                    </div>
                    <div className="text-secondary" style={{ fontSize: '0.85rem' }}>Avg: {Number(r.historical_monthly_bags).toLocaleString()}/mo</div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                       <a href={`https://wa.me/91${r.mobile}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" title="WhatsApp Follow-up">
                         <MessageSquare size={16} /> Notify
                       </a>
                       <Link to={`/customers/${r.customer_id}`} className="btn-icon" title="View Profile">
                         <ExternalLink size={18} />
                       </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
