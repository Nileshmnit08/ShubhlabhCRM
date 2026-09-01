import React, { useState } from 'react';
import { ArrowLeft, CheckSquare } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';

export default function EligibleRewardsList({ rewards, onBack, onRefresh }) {
  const [loadingId, setLoadingId] = useState(null);

  const handleSendForApproval = async (id) => {
    setLoadingId(id);
    try {
      const { error } = await supabase
        .from('dealer_reward_eligibility')
        .update({ status: 'Pending Approval' })
        .eq('id', id);
        
      if (error) throw error;
      onRefresh(); // Refresh parent data
    } catch (err) {
      console.error(err);
      alert('Failed to send for approval.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <button className="btn-icon" onClick={onBack}><ArrowLeft size={20} /></button>
        <h2 style={{ margin: 0 }}>Eligible for Rewards ({rewards.length})</h2>
      </div>

      {rewards.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center' }} className="text-muted">No eligible rewards pending action.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Customer Name</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Scheme Name</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Achieved Qty</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Eligible Slab / Target</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Reward Name</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Eligibility Date</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{r.crm_parties?.display_name}</div>
                    <div className="text-secondary" style={{ fontSize: '0.85rem' }}>{r.crm_parties?.city} • {r.crm_parties?.mobile}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>{r.dealer_schemes?.name}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--success)' }}>{r.qualifying_bags} Bags</td>
                  <td style={{ padding: '1rem' }}>{r.dealer_scheme_slabs?.slab_name}</td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{r.dealer_scheme_slabs?.reward_description}</td>
                  <td style={{ padding: '1rem' }}>{new Date(r.updated_at).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={() => handleSendForApproval(r.id)}
                      disabled={loadingId === r.id}
                    >
                      <CheckSquare size={16} /> {loadingId === r.id ? 'Sending...' : 'Send for Approval'}
                    </button>
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
