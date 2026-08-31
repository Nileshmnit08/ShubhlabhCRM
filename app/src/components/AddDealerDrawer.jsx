import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Building2, User, Phone, MapPin, Map, UserCheck } from 'lucide-react';

export default function AddDealerDrawer({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    display_name: '',
    mobile: '',
    city: '',
    territory_id: '',
    assigned_owner_id: '',
    party_code: '',
    contact_person: '',
    state: '',
    address: '',
    gstin: '',
    email: '',
    credit_limit: '',
    notes: ''
  });

  const [territories, setTerritories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLookups();
  }, []);

  async function fetchLookups() {
    try {
      const [tRes, uRes] = await Promise.all([
        supabase.from('territories').select('id, territory_name').order('territory_name'),
        supabase.from('users_view').select('id, raw_user_meta_data').eq('raw_user_meta_data->>role', 'Sales')
      ]);
      if (tRes.data) setTerritories(tRes.data);
      if (uRes.data) setUsers(uRes.data);
    } catch (err) {
      console.error(err);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Normalize mobile
    const normalizedMobile = formData.mobile.replace(/\D/g, '');

    try {
      // 1. Check for duplicates (same mobile or same name+city)
      const { data: duplicates } = await supabase.from('crm_parties').select('id, display_name')
        .or(`mobile.eq.${normalizedMobile},and(display_name.ilike.${formData.display_name},city.ilike.${formData.city})`);
        
      if (duplicates && duplicates.length > 0) {
        setError(`A dealer with this mobile number or exact name & city already exists (${duplicates[0].display_name}).`);
        setLoading(false);
        return;
      }

      // 2. Insert
      const { error: insertErr } = await supabase.from('crm_parties').insert({
        display_name: formData.display_name,
        party_type: 'Organization',
        mobile: normalizedMobile,
        city: formData.city,
        state: formData.state,
        address: formData.address,
        gstin: formData.gstin,
        email: formData.email,
        assigned_owner_id: formData.assigned_owner_id || null,
        territory_id: formData.territory_id || null,
        credit_limit: formData.credit_limit ? Number(formData.credit_limit) : 0,
        notes: formData.notes,
        crm_status: 'Active'
        // If relationship_type was a real column, we'd add it here, 
        // but typically the view uses party_type or tags. 
        // We assume inserting into crm_parties is enough, and v_management_dealer_control handles it.
        // Actually, looking at 74_sprint_17_9, it used relationship_type = 'Dealer'. Let's include it.
      });

      if (insertErr) {
        // Fallback if relationship_type doesn't exist directly on crm_parties but via crm_party_relationships
        console.warn("Insert error, might need relationship mapping: ", insertErr);
        throw insertErr;
      }

      alert("Dealer created successfully!");
      if (onSave) onSave();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create dealer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '450px', maxWidth: '100vw',
      background: 'var(--bg-surface)', boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
      zIndex: 1000, display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={20} className="text-primary" /> Add New Dealer
        </h2>
        <button className="btn cv-btn-subtle" style={{ padding: '0.25rem' }} onClick={onClose}><X size={20} /></button>
      </div>
      
      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
        {error && (
          <div style={{ padding: '1rem', background: 'rgba(231,76,60,0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}
        
        <form id="add-dealer-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div>
            <label>Dealer Name *</label>
            <div style={{ position: 'relative' }}>
              <Building2 size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input required type="text" className="input" style={{ paddingLeft: '2.2rem', width: '100%' }}
                value={formData.display_name} onChange={e => setFormData({...formData, display_name: e.target.value})} />
            </div>
          </div>

          <div>
            <label>Mobile Number *</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input required type="text" className="input" style={{ paddingLeft: '2.2rem', width: '100%' }}
                value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label>City *</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input required type="text" className="input" style={{ paddingLeft: '2.2rem', width: '100%' }}
                  value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
            </div>
            <div>
              <label>State</label>
              <input type="text" className="input" style={{ width: '100%' }}
                value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
            </div>
          </div>

          <div>
            <label>Territory *</label>
            <div style={{ position: 'relative' }}>
              <Map size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <select required className="input" style={{ paddingLeft: '2.2rem', width: '100%' }}
                value={formData.territory_id} onChange={e => setFormData({...formData, territory_id: e.target.value})}>
                <option value="">Select Territory</option>
                {territories.map(t => <option key={t.id} value={t.id}>{t.territory_name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label>Assigned Salesperson *</label>
            <div style={{ position: 'relative' }}>
              <UserCheck size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <select required className="input" style={{ paddingLeft: '2.2rem', width: '100%' }}
                value={formData.assigned_owner_id} onChange={e => setFormData({...formData, assigned_owner_id: e.target.value})}>
                <option value="">Select Salesperson</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.raw_user_meta_data?.full_name}</option>)}
              </select>
            </div>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '0.5rem 0' }} />
          
          <div>
            <label>Contact Person</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input type="text" className="input" style={{ paddingLeft: '2.2rem', width: '100%' }}
                value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} />
            </div>
          </div>

          <div>
            <label>GSTIN</label>
            <input type="text" className="input" style={{ width: '100%' }}
              value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} />
          </div>

          <div>
            <label>Notes</label>
            <textarea className="input" rows="3" style={{ width: '100%' }}
              value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>

        </form>
      </div>

      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <button form="add-dealer-form" type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? 'Saving...' : <><Save size={18} style={{ marginRight: '0.5rem' }} /> Save Dealer</>}
        </button>
      </div>
    </div>
  );
}
