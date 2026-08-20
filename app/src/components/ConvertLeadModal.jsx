import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';
import { X, Search, CheckCircle2, UserPlus, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ConvertLeadModal({ lead, onClose, onComplete }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    findMatches();
  }, []);

  async function findMatches() {
    setLoading(true);
    try {
      // Find possible matches based on mobile or display name
      // Must not be a Lead
      let query = supabase.from('crm_parties')
        .select('id, display_name, mobile, city, crm_status')
        .neq('crm_status', 'Lead');
      
      const orConditions = [];
      if (lead.mobile) {
        orConditions.push(`mobile.ilike.%${lead.mobile}%`);
      }
      if (lead.display_name) {
        orConditions.push(`display_name.ilike.%${lead.display_name}%`);
      }
      
      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
      } else {
         setMatches([]);
         setLoading(false);
         return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setMatches(data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to search for existing customers");
    } finally {
      setLoading(false);
    }
  }

  const handleCreateNew = async () => {
    if (!window.confirm("Create a new Customer from this Lead?")) return;
    setConverting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      const { error } = await supabase.from('crm_parties').update({
        crm_status: 'Active'
      }).eq('id', lead.id);

      if (error) throw error;

      await logActivity({
        module: 'Customers',
        actionType: 'UPDATED',
        entityType: 'crm_parties',
        entityId: lead.id,
        summary: `Lead converted to New Customer by User`
      });

      await supabase.from('interactions').insert({
        party_id: lead.id,
        user_id: userId || null,
        channel: 'System',
        interaction_type: 'Lead Converted',
        outcome: 'New Customer Created',
        note: 'Lead was successfully converted into a new Customer profile.'
      });

      alert("Lead converted successfully!");
      onComplete();
    } catch (err) {
      console.error(err);
      alert("Conversion failed.");
    } finally {
      setConverting(false);
    }
  };

  const handleLinkExisting = async (targetId) => {
    if (!window.confirm("Link this Lead to the selected Existing Customer? The Lead record will be marked as Converted.")) return;
    setConverting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      const { error } = await supabase.from('crm_parties').update({
        crm_status: 'Converted',
        converted_to_party_id: targetId
      }).eq('id', lead.id);

      if (error) throw error;

      await logActivity({
        module: 'Customers',
        actionType: 'UPDATED',
        entityType: 'crm_parties',
        entityId: lead.id,
        summary: `Lead linked and converted to Customer ${targetId}`
      });

      await supabase.from('interactions').insert({
        party_id: lead.id,
        user_id: userId || null,
        channel: 'System',
        interaction_type: 'Lead Converted',
        outcome: 'Linked to Existing Customer',
        note: `Lead was successfully linked to existing Customer ID: ${targetId}`
      });

      alert("Lead linked successfully!");
      navigate(`/customers/${targetId}`);
    } catch (err) {
      console.error(err);
      alert("Linking failed.");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="cv-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--bg-base)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Convert Lead to Customer
          </h2>
          <button onClick={onClose} className="btn-icon text-muted"><X size={20} /></button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Before creating a new Customer identity, we search for existing customers that match this Lead's details to prevent duplicates.
          </p>

          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '2rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Converting Lead</div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{lead.display_name}</div>
            {lead.mobile && <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{lead.mobile}</div>}
          </div>

          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={16} className="text-secondary" /> 
            Possible Matches ({matches.length})
          </h3>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Searching existing customers...</div>
          ) : matches.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <div className="badge badge-warning" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                <AlertTriangle size={14} /> We found existing customers that might match this Lead.
              </div>
              
              {matches.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.display_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{m.mobile || 'No mobile'} {m.city ? `• ${m.city}` : ''}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>Status: {m.crm_status}</div>
                  </div>
                  <button 
                    onClick={() => handleLinkExisting(m.id)} 
                    disabled={converting}
                    className="btn btn-secondary" 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                  >
                    <LinkIcon size={14} /> Link to this
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '2rem' }}>
              <CheckCircle2 size={32} className="text-success" style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
              <div style={{ fontWeight: 500 }}>No duplicates found</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>It looks safe to create a new customer.</div>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>If none of the matches are correct, you can create a new identity.</span>
            <button 
              onClick={handleCreateNew} 
              disabled={converting}
              className="btn btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <UserPlus size={16} /> Create New Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
