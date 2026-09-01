import React from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ActiveCustomersList({ records, onBack }) {
  // Group by customer to show unique active customers across schemes
  const uniqueCustomers = [];
  const map = new Map();
  records.forEach(r => {
    if (!map.has(r.customer_id)) {
      map.set(r.customer_id, {
        id: r.customer_id,
        name: r.customer_name,
        mobile: r.mobile,
        city: r.city,
        owner_name: r.owner_name,
        schemes: []
      });
      uniqueCustomers.push(map.get(r.customer_id));
    }
    map.get(r.customer_id).schemes.push(r);
  });

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <button className="btn-icon" onClick={onBack}><ArrowLeft size={20} /></button>
        <h2 style={{ margin: 0 }}>Active Customers ({uniqueCustomers.length})</h2>
      </div>

      {uniqueCustomers.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center' }} className="text-muted">No active customers found for the selected filters.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Customer Name</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Location</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Sales Owner</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Active Schemes Progress</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {uniqueCustomers.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div className="text-secondary" style={{ fontSize: '0.85rem' }}>{c.mobile || 'No Mobile'}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>{c.city || 'N/A'}</td>
                  <td style={{ padding: '1rem' }}>{c.owner_name || 'Unassigned'}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {c.schemes.map((s, idx) => (
                         <div key={idx} style={{ fontSize: '0.85rem', padding: '0.5rem', background: 'var(--bg-base)', borderRadius: '4px' }}>
                           <div style={{ fontWeight: 600 }}>{s.scheme_name}</div>
                           <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                             <span>{s.current_net_bags} bags</span>
                             <span style={{color: s.status === 'eligible' ? 'var(--success)' : 'inherit'}}>
                               {s.achieved_slab_name ? `Achieved: ${s.achieved_slab_name}` : `Next: ${s.next_slab_name} (${s.bags_needed} left)`}
                             </span>
                           </div>
                         </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <Link to={`/customers/${c.id}`} className="btn btn-secondary btn-sm" title="View Profile">
                      <ExternalLink size={16} /> Profile
                    </Link>
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
