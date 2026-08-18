import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, UserPlus, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ReviewQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingBulk, setProcessingBulk] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, []);

  async function fetchQueue() {
    setLoading(true);
    try {
      // Need to join with tally_raw_parties and candidate CRM party
      const { data, error } = await supabase
        .from('identity_review_queue')
        .select(`
          id, match_reason, confidence, status,
          tally_raw_party_id, candidate_crm_party_id,
          tally_raw_parties ( tally_ledger_name, tally_status, raw_location ),
          crm_parties ( display_name, crm_status, city, state )
        `)
        .eq('status', 'Pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQueue(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAction = async (item, action) => {
    try {
      if (action === 'Confirm') {
        // Create link
        await supabase.from('party_identity_links').insert({
          crm_party_id: item.candidate_crm_party_id,
          tally_raw_party_id: item.tally_raw_party_id,
          match_type: 'Manual',
          confidence: 1.0,
          resolution_status: 'Resolved',
          reason: 'Manually confirmed in review queue'
        });
      } else if (action === 'New') {
        // Create new CRM party
        const { data: newParty, error: partyErr } = await supabase.from('crm_parties').insert({
          display_name: item.tally_raw_parties.tally_ledger_name.replace(/\(OLD\)/gi, '').trim(),
          crm_status: 'Active',
          notes: 'Auto-created from Tally Import'
        }).select().single();
        
        if (partyErr) throw partyErr;

        // Create link
        await supabase.from('party_identity_links').insert({
          crm_party_id: newParty.id,
          tally_raw_party_id: item.tally_raw_party_id,
          match_type: 'Manual',
          confidence: 1.0,
          resolution_status: 'Resolved',
          reason: 'New party explicitly created'
        });
      }
      
      // Update queue status
      await supabase.from('identity_review_queue')
        .update({ status: action === 'Reject' ? 'Rejected' : 'Approved' })
        .eq('id', item.id);
        
      // Remove from local state
      setQueue(prev => prev.filter(q => q.id !== item.id));
      
    } catch (err) {
      console.error("Action error:", err);
      alert("Failed to process resolution");
    }
  };

  const handleCreateAllAsNew = async () => {
    if (!window.confirm(`Are you sure you want to create ${queue.length} new parties? This will ignore any potential matches.`)) {
      return;
    }

    setProcessingBulk(true);
    try {
      const newParties = queue.map(item => ({
        display_name: item.tally_raw_parties.tally_ledger_name.replace(/\(OLD\)/gi, '').trim(),
        crm_status: 'Active',
        notes: 'Auto-created from Tally Import (Bulk)'
      }));

      // Insert all new parties
      const { data: insertedParties, error: partyErr } = await supabase.from('crm_parties').insert(newParties).select();
      if (partyErr) throw partyErr;

      const linksToInsert = [];
      const queueIdsToUpdate = [];

      queue.forEach((item, index) => {
        linksToInsert.push({
          crm_party_id: insertedParties[index].id,
          tally_raw_party_id: item.tally_raw_party_id,
          match_type: 'Manual',
          confidence: 1.0,
          resolution_status: 'Resolved',
          reason: 'Bulk created as new party'
        });
        queueIdsToUpdate.push(item.id);
      });

      // Insert links in chunks
      const chunkSize = 500;
      for (let i = 0; i < linksToInsert.length; i += chunkSize) {
        const chunk = linksToInsert.slice(i, i + chunkSize);
        const { error: linkErr } = await supabase.from('party_identity_links').insert(chunk);
        if (linkErr) throw linkErr;
      }

      // Update queue status in chunks
      for (let i = 0; i < queueIdsToUpdate.length; i += chunkSize) {
        const chunk = queueIdsToUpdate.slice(i, i + chunkSize);
        const { error: qErr } = await supabase.from('identity_review_queue')
          .update({ status: 'Approved' })
          .in('id', chunk);
        if (qErr) throw qErr;
      }

      // Clear the queue
      setQueue([]);
      alert(`Successfully created ${queue.length} new parties!`);
    } catch (err) {
      console.error("Bulk action error:", err);
      alert("Failed to process bulk creation.");
    } finally {
      setProcessingBulk(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Identity Review Queue</h1>
          <p className="text-secondary" style={{marginTop: '0.25rem'}}>
            Manually resolve ambiguous parties from recent Tally imports.
          </p>
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          {queue.length > 0 && (
            <button 
              className="btn btn-primary" 
              onClick={handleCreateAllAsNew} 
              disabled={processingBulk}
            >
              {processingBulk ? 'Processing...' : `Create All as New (${queue.length})`}
            </button>
          )}
          <Link to="/data/import" className="btn btn-secondary">Back to Import</Link>
        </div>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
        {loading ? (
          <div style={{padding: '3rem', textAlign: 'center'}}>Loading queue...</div>
        ) : queue.length === 0 ? (
          <div className="glass-panel" style={{padding: '4rem', textAlign: 'center'}}>
            <Check size={48} className="text-success" style={{margin: '0 auto 1rem'}} />
            <h3>All Caught Up!</h3>
            <p className="text-secondary">There are no pending identities to review.</p>
          </div>
        ) : (
          queue.map(item => {
            const isPossibleMatch = item.candidate_crm_party_id !== null;
            
            return (
              <div key={item.id} className="glass-panel" style={{display: 'flex', padding: 0, overflow: 'hidden'}}>
                {/* Left: Raw Tally Data */}
                <div style={{flex: 1, padding: '1.5rem', borderRight: '1px solid var(--border)'}}>
                  <div style={{fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600}}>
                    Incoming Tally Record
                  </div>
                  <h3 style={{color: item.tally_raw_parties.tally_status === 'OLD' ? 'var(--warning)' : 'inherit'}}>
                    {item.tally_raw_parties.tally_ledger_name}
                  </h3>
                  <div className="text-secondary" style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>
                    Location: {item.tally_raw_parties.raw_location || '-'}
                  </div>
                </div>

                {/* Middle: CRM Candidate */}
                <div style={{flex: 1, padding: '1.5rem', backgroundColor: 'rgba(0,0,0,0.1)'}}>
                  <div style={{fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600}}>
                    {isPossibleMatch ? 'Candidate CRM Party' : 'No Candidate Found'}
                  </div>
                  
                  {isPossibleMatch ? (
                    <>
                      <h3>{item.crm_parties?.display_name}</h3>
                      <div className="text-secondary" style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>
                        Location: {[item.crm_parties?.city, item.crm_parties?.state].filter(Boolean).join(', ') || '-'}
                      </div>
                      <div style={{marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                        <AlertCircle size={14} /> Match Confidence: {Math.round(item.confidence * 100)}%
                      </div>
                    </>
                  ) : (
                    <div className="text-muted" style={{fontStyle: 'italic', marginTop: '1rem'}}>
                      The system could not find a similar CRM party.
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div style={{width: '200px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center', borderLeft: '1px solid var(--border)'}}>
                  {isPossibleMatch && (
                    <>
                      <button className="btn btn-primary" onClick={() => handleAction(item, 'Confirm')} style={{width: '100%', fontSize: '0.85rem'}}>
                        <Check size={16} /> Confirm Merge
                      </button>
                      <button className="btn btn-secondary" onClick={() => handleAction(item, 'Reject')} style={{width: '100%', fontSize: '0.85rem'}}>
                        <X size={16} /> Not a Match
                      </button>
                    </>
                  )}
                  
                  <button className="btn btn-secondary" onClick={() => handleAction(item, 'New')} style={{width: '100%', fontSize: '0.85rem', marginTop: isPossibleMatch ? '0.5rem' : 0}}>
                    <UserPlus size={16} /> Create New Party
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
