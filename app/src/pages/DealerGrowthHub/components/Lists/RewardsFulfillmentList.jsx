import React, { useState } from 'react';
import { ArrowLeft, Gift, Save, X } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';

export default function RewardsFulfillmentList({ rewards, onBack, onRefresh }) {
  const [fulfillingId, setFulfillingId] = useState(null);
  const [fulfillmentData, setFulfillmentData] = useState({ date: new Date().toISOString().split('T')[0], notes: '' });

  const handleFulfillSubmit = async (e, id) => {
    e.preventDefault();
    try {
      const updates = { 
        status: 'Fulfilled',
        fulfilled_at: fulfillmentData.date,
        fulfillment_notes: fulfillmentData.notes,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('dealer_reward_eligibility')
        .update(updates)
        .eq('id', id);
        
      if (error) throw error;
      setFulfillingId(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to fulfill reward.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <button className="btn-icon" onClick={onBack}><ArrowLeft size={20} /></button>
        <h2 style={{ margin: 0 }}>Rewards Pending Fulfillment ({rewards.length})</h2>
      </div>

      {rewards.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center' }} className="text-muted">No rewards pending fulfillment.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Customer Name</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Scheme Name</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Achieved Qty</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Reward Name</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Approval Date</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Action</th>
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
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--primary)' }}>{r.dealer_scheme_slabs?.reward_description}</td>
                  <td style={{ padding: '1rem' }}>{r.approved_at ? new Date(r.approved_at).toLocaleDateString() : new Date(r.updated_at).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem' }}>
                    {fulfillingId === r.id ? (
                      <form onSubmit={(e) => handleFulfillSubmit(e, r.id)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                         <input type="date" value={fulfillmentData.date} onChange={e => setFulfillmentData({...fulfillmentData, date: e.target.value})} required style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)' }}/>
                         <input type="text" placeholder="Ref/Notes" value={fulfillmentData.notes} onChange={e => setFulfillmentData({...fulfillmentData, notes: e.target.value})} style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)', width: '120px' }}/>
                         <button type="submit" className="btn btn-primary btn-sm"><Save size={14}/></button>
                         <button type="button" className="btn-icon" onClick={() => setFulfillingId(null)}><X size={14}/></button>
                      </form>
                    ) : (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => {
                          setFulfillingId(r.id);
                          setFulfillmentData({ date: new Date().toISOString().split('T')[0], notes: '' });
                        }}
                      >
                        <Gift size={16} /> Mark Fulfilled
                      </button>
                    )}
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
