import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { X, Send, Phone, Edit2, AlertCircle, FileText } from 'lucide-react';

export default function WhatsAppPreviewModal({ alert, onClose, onSave }) {
  const { userProfile } = useContext(AuthContext);
  const [template, setTemplate] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchTemplate();
  }, []);

  async function fetchTemplate() {
    setLoading(true);
    try {
      // Find the appropriate template based on alert_type
      let templateName = 'Target At Risk';
      if (alert.alert_type === 'Near Target') templateName = 'Near Target';
      if (alert.alert_type === 'One Slab Away') templateName = 'One Slab Away';
      if (alert.alert_type === 'Target Achieved') templateName = 'Target Achieved';
      if (alert.alert_type === 'No Recent Activity') templateName = 'No Recent Activity';

      const { data, error: tErr } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('name', templateName)
        .single();
      
      if (tErr && tErr.code !== 'PGRST116') throw tErr; // Ignore no rows error briefly
      
      const t = data || {
        content: `नमस्ते {{dealer_name}} जी,\n\nलक्ष्य: ₹{{target_value}}\nउपलब्धि: ₹{{achievement_value}}\n\nसंपर्क: {{salesperson_name}} ({{salesperson_phone}})\nधन्यवाद,\n{{company_name}}`
      };
      
      setTemplate(t);
      
      // Compute template replacements
      let msg = t.content;
      msg = msg.replace('{{dealer_name}}', alert.display_name || 'Dealer');
      msg = msg.replace('{{target_period}}', alert.target_period || 'Current Period');
      msg = msg.replace('{{target_value}}', alert.target_value ? Number(alert.target_value).toLocaleString('en-IN') : '0');
      msg = msg.replace('{{achievement_value}}', alert.achievement_value ? Number(alert.achievement_value).toLocaleString('en-IN') : '0');
      
      const pct = alert.target_value > 0 ? ((alert.achievement_value / alert.target_value) * 100).toFixed(1) : 0;
      msg = msg.replace('{{achievement_percentage}}', pct);
      
      const balance = Math.max(0, (alert.target_value || 0) - (alert.achievement_value || 0));
      msg = msg.replace('{{balance_needed}}', balance.toLocaleString('en-IN'));
      
      const endDate = alert.target_end_date ? new Date(alert.target_end_date).toLocaleDateString() : 'TBD';
      msg = msg.replace('{{target_end_date}}', endDate);
      
      const daysLeft = alert.target_end_date ? Math.max(0, Math.ceil((new Date(alert.target_end_date) - new Date()) / (1000 * 3600 * 24))) : 0;
      msg = msg.replace('{{days_left}}', daysLeft);
      
      msg = msg.replace('{{scheme_name}}', alert.scheme_name || 'Dealer Scheme');
      msg = msg.replace('{{next_reward}}', alert.next_reward || 'Bonus Points');
      msg = msg.replace('{{salesperson_name}}', alert.owner_name || 'Your Sales Exec');
      msg = msg.replace('{{salesperson_phone}}', '9999999999'); // Fallback, could fetch from users
      msg = msg.replace('{{company_name}}', 'Shubh Labh');
      
      setMessageText(msg);

    } catch (err) {
      console.error(err);
      setError("Failed to load template.");
    } finally {
      setLoading(false);
    }
  }

  const handleSend = async () => {
    setSending(true);
    try {
      if (!alert.mobile) {
        throw new Error("Dealer does not have a registered mobile number.");
      }

      // Log the communication in CRM
      const { error: insertErr } = await supabase.from('dealer_communications').insert({
        customer_id: alert.customer_id,
        channel: 'WhatsApp',
        template_id: template?.id || null,
        final_message: messageText,
        status: 'Sent',
        linked_target_id: alert.target_id || null,
        linked_alert_id: alert.alert_id || null,
        sent_by: userProfile.id
      });
      
      if (insertErr) throw insertErr;

      // Update alert status if linked
      if (alert.alert_id) {
        await supabase.from('dealer_target_alerts').update({ status: 'Reviewed' }).eq('id', alert.alert_id);
      }

      // Trigger wa.me link fallback
      const waLink = `https://wa.me/91${alert.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(messageText)}`;
      window.open(waLink, '_blank');
      
      if (onSave) onSave();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to send WhatsApp message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 1000, 
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="animate-fade-in" style={{
        background: 'var(--bg-surface)', width: '100%', maxWidth: '500px',
        maxHeight: '90vh', borderRadius: '12px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 12px 32px rgba(0,0,0,0.2)'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Phone size={20} className="text-success" /> Send WhatsApp Update
          </h2>
          <button className="btn cv-btn-subtle" style={{ padding: '0.25rem' }} onClick={onClose}><X size={20} /></button>
        </div>
        
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          {error && (
            <div style={{ padding: '1rem', background: 'rgba(231,76,60,0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}
          
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading template...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>To</div>
                <div style={{ fontWeight: 600 }}>{alert.display_name}</div>
                <div style={{ fontSize: '0.85rem' }}>{alert.mobile || <span className="text-danger">No Mobile Found</span>}</div>
              </div>
              
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Message Preview (Hindi)</span>
                  <Edit2 size={14} className="text-muted" />
                </label>
                <textarea 
                  className="input" 
                  rows="12" 
                  style={{ width: '100%', fontSize: '0.9rem', lineHeight: '1.5' }}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                />
              </div>
              
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <FileText size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                Clicking send will securely log this communication and open WhatsApp Web/App for final delivery.
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="btn cv-btn-subtle" onClick={onClose} disabled={sending}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSend} disabled={loading || sending || !alert.mobile} style={{ background: 'var(--success)' }}>
            {sending ? 'Sending...' : <><Send size={16} style={{ marginRight: '0.5rem' }} /> Send WhatsApp</>}
          </button>
        </div>
      </div>
    </div>
  );
}
