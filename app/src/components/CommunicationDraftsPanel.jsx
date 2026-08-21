import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link } from 'react-router-dom';
import { MessageCircle, CheckCircle, Trash2, Send } from 'lucide-react';
import { logActivity } from '../lib/activityLogger';

export default function CommunicationDraftsPanel() {
  const { userProfile } = useContext(AuthContext);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  useEffect(() => {
    fetchDrafts();
  }, [userProfile]);

  async function fetchDrafts() {
    if (!userProfile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_communication_drafts')
        .select('*, party:party_id(display_name, whatsapp)')
        .eq('status', 'Pending')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      setDrafts(data || []);
    } catch (err) {
      console.error('Error fetching communication drafts:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDiscard(draftId) {
    setResolvingId(draftId);
    try {
      const { error } = await supabase
        .from('crm_communication_drafts')
        .update({ 
          status: 'Discarded', 
          acted_upon_by: userProfile.id,
          acted_upon_at: new Date().toISOString()
        })
        .eq('id', draftId);

      if (error) throw error;
      setDrafts(prev => prev.filter(d => d.id !== draftId));
    } catch (err) {
      console.error('Error discarding draft:', err);
      alert('Failed to discard draft.');
    } finally {
      setResolvingId(null);
    }
  }

  async function handleSend(draft) {
    if (!draft.party.whatsapp) {
      alert("No WhatsApp number on file for this customer.");
      return;
    }

    setResolvingId(draft.id);
    try {
      // 1. Mark Sent
      const { error } = await supabase
        .from('crm_communication_drafts')
        .update({ 
          status: 'Sent', 
          acted_upon_by: userProfile.id,
          acted_upon_at: new Date().toISOString()
        })
        .eq('id', draft.id);

      if (error) throw error;
      
      // 2. Log Activity
      await logActivity(draft.party_id, 'Interaction', draft.suggested_message, userProfile.id);

      // 3. Open WhatsApp Web Intent
      const text = encodeURIComponent(draft.suggested_message);
      window.open(`https://wa.me/${draft.party.whatsapp}?text=${text}`, '_blank');

      setDrafts(prev => prev.filter(d => d.id !== draft.id));
    } catch (err) {
      console.error('Error sending draft:', err);
      alert('Failed to send message.');
    } finally {
      setResolvingId(null);
    }
  }

  if (loading) return null;
  if (drafts.length === 0) return null; 

  return (
    <div className="cv-panel" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--success)' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: 'rgba(16, 185, 129, 0.05)' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
          <MessageCircle size={18} /> Suggested Communications
        </h3>
        <p className="text-secondary" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
          Please review and approve these prepared messages. They have not been sent yet.
        </p>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {drafts.map(draft => (
          <div key={draft.id} style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className="badge badge-success">
                  {draft.template_name || draft.channel}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Reason: {draft.reason}
                </span>
              </div>
              <Link to={`/customers/${draft.party_id}`} style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--primary)', textDecoration: 'none', display: 'block', marginBottom: '0.25rem' }}>
                To: {draft.party.display_name} {draft.party.whatsapp ? `(${draft.party.whatsapp})` : '(No WA #)'}
              </Link>
              <div style={{ background: 'var(--bg-main)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--text-primary)', fontStyle: 'italic', borderLeft: '2px solid var(--border)' }}>
                "{draft.suggested_message}"
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-success" 
                onClick={() => handleSend(draft)}
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                disabled={resolvingId === draft.id || !draft.party.whatsapp}
              >
                <Send size={14} style={{ marginRight: '0.25rem' }} /> Send
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => handleDiscard(draft.id)}
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                disabled={resolvingId === draft.id}
              >
                <Trash2 size={14} style={{ marginRight: '0.25rem' }} /> Discard
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
