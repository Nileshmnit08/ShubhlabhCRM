import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

export default function RewardsApprovalList({ rewards, onBack, onRefresh }) {
  const [loadingId, setLoadingId] = useState(null);

  const handleAction = async (id, action) => {
    let reason = null;
    if (action === 'Reversed') {
      reason = prompt('Please enter the reason for rejection:');
      if (!reason) return; // User cancelled prompt
    }

    setLoadingId(id);
    try {
      const updates = { 
        status: action,
        updated_at: new Date().toISOString()
      };
      
      // Ideally we would record the approver_id from session, but for this demo we just update status
      if (action === 'Approved') {
         updates.approved_at = new Date().toISOString();
      } else if (action === 'Reversed') {
         updates.fulfillment_notes = reason; // Storing rejection reason here for now
      }

      const { error } = await supabase
        .from('dealer_reward_eligibility')
        .update(updates)
        .eq('id', id);
        
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error(err);
      alert(`Failed to ${action.toLowerCase()} reward.`);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <button className="btn-icon" onClick={onBack}><ArrowLeft size={20} /></button>
        <h2 style={{ margin: 0 }}>Rewards Pending Approval ({rewards.length})</h2>
      </div>

      {rewards.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center' }} className="text-muted">No rewards pending approval.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Customer Name</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Scheme Name</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Achieved Qty</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Eligible Slab</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Reward Name</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Reward Value</th>
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
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{r.qualifying_bags} Bags</td>
                  <td style={{ padding: '1rem' }}>{r.dealer_scheme_slabs?.slab_name}</td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{r.dealer_scheme_slabs?.reward_description}</td>
                  <td style={{ padding: '1rem' }}>{r.dealer_scheme_slabs?.reward_value ? `₹${r.dealer_scheme_slabs.reward_value}` : 'N/A'}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button 
                        className="btn btn-success btn-sm" 
                        onClick={() => handleAction(r.id, 'Approved')}
                        disabled={loadingId === r.id}
                        title="Approve"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => handleAction(r.id, 'Reversed')}
                        disabled={loadingId === r.id}
                        title="Reject"
                      >
                        <XCircle size={16} />
                      </button>
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
