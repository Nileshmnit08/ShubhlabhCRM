import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/activityLogger';
import { ArrowLeft, Save } from 'lucide-react';
import { State, City } from 'country-state-city';
import { AuthContext } from '../../AuthContext';

export default function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const { userProfile } = React.useContext(AuthContext);
  const isAdmin = userProfile?.role === 'Admin';

  const [loading, setLoading] = useState(false);
  const [pincode, setPincode] = useState('');
  const [fetchingPincode, setFetchingPincode] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [formData, setFormData] = useState({
    display_name: '',
    legal_or_core_name: '',
    relationship_type: 'Customer',
    city: '',
    state: '',
    mobile: '',
    whatsapp: '',
    communication_preference: 'WhatsApp',
    crm_status: 'Active',
    notes: '',
    assigned_owner_id: ''
  });
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    // If not editing and not admin, default to self
    if (!isEditing && userProfile?.id && !isAdmin && formData.assigned_owner_id === '') {
      setFormData(prev => ({ ...prev, assigned_owner_id: userProfile.id }));
    }
  }, [userProfile, isEditing]);

  useEffect(() => {
    fetchTeamMembers();
    if (isEditing) {
      fetchCustomer();
    }
  }, [id]);

  async function fetchTeamMembers() {
    try {
      const { data } = await supabase.from('app_users').select('id, display_name').eq('is_active', true);
      if (data) setTeamMembers(data);
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  }

  async function fetchCustomer() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_parties')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      if (data) {
        setFormData({
          display_name: data.display_name || '',
          legal_or_core_name: data.legal_or_core_name || '',
          relationship_type: data.relationship_type || 'Customer',
          city: data.city || '',
          state: data.state || '',
          mobile: data.mobile || '',
          whatsapp: data.whatsapp || '',
          communication_preference: data.communication_preference || 'WhatsApp',
          crm_status: data.crm_status || 'Active',
          notes: data.notes || '',
          assigned_owner_id: data.assigned_owner_id || ''
        });
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      alert('Error loading customer data.');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePincodeChange = async (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setPincode(val);
    
    if (val.length === 6) {
      setFetchingPincode(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${val}`);
        const data = await response.json();
        
        if (data && data[0] && data[0].Status === 'Success') {
          const postOffice = data[0].PostOffice[0];
          setFormData(prev => ({
            ...prev,
            city: postOffice.District || postOffice.Block || prev.city,
            state: postOffice.State || prev.state
          }));
        }
      } catch (err) {
        console.error("Failed to fetch pincode data:", err);
      } finally {
        setFetchingPincode(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic Validation
    if (!formData.display_name.trim()) {
      alert('Display Name is required');
      return;
    }

    const phoneRegex = /^(?:\+91|0)?\s?[0-9]{10}$/;
    if (formData.mobile && !phoneRegex.test(formData.mobile.replace(/[-\s]/g, ''))) {
      alert('Invalid Mobile format. Ensure it contains a legitimate 10-digit Indian number.');
      return;
    }
    if (formData.whatsapp && !phoneRegex.test(formData.whatsapp.replace(/[-\s]/g, ''))) {
      alert('Invalid WhatsApp format. Ensure it contains a legitimate 10-digit Indian number.');
      return;
    }

    // Check for Duplicates
    if (!duplicateWarning) {
      setLoading(true);
      try {
        let query = supabase.from('crm_parties')
          .select('id, display_name')
          .ilike('display_name', `%${formData.display_name.trim()}%`);
          
        if (isEditing) {
           query = query.neq('id', id);
        }
        
        const { data: matches } = await query;
          
        const validMatches = matches || [];
        if (validMatches.length > 0) {
          // Deduplicate the UI payload so we only show distinct names
          const uniqueNamesMap = new Map();
          validMatches.forEach(m => {
            const lowerName = m.display_name.trim().toLowerCase();
            if (!uniqueNamesMap.has(lowerName)) {
              uniqueNamesMap.set(lowerName, m);
            }
          });
          
          setLoading(false);
          setDuplicateWarning(Array.from(uniqueNamesMap.values()));
          return;
        }
      } catch (err) {
        console.error('Error checking duplicates:', err);
      }
    }

    await proceedWithSave();
  };

  const proceedWithSave = async () => {
    setDuplicateWarning(null);
    setLoading(true);
    try {
      if (isEditing) {
        const { error } = await supabase.from('crm_parties').update(formData).eq('id', id);
        if (error) throw error;
        
        logActivity({
          module: 'Customers',
          actionType: 'UPDATED',
          entityType: 'crm_parties',
          entityId: id,
          summary: `Updated customer profile: ${formData.display_name}`,
          metadata: { updated_fields: Object.keys(formData) }
        });
        
        alert('Customer updated successfully!');
        navigate(`/customers/${id}`);
      } else {
        const { error, data } = await supabase.from('crm_parties').insert([formData]).select();
        if (error) throw error;
        
        logActivity({
          module: 'Customers',
          actionType: 'CREATED',
          entityType: 'crm_parties',
          entityId: data[0].id,
          summary: `Created new customer: ${formData.display_name}`
        });

        alert('Customer created successfully!');
        navigate(`/customers/${data[0].id}`);
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Error saving customer.');
    } finally {
      setLoading(false);
    }
  };

  const allStates = State.getStatesOfCountry('IN');
  const selectedStateObj = allStates.find(s => s.name === formData.state);
  const citiesInState = selectedStateObj ? City.getCitiesOfState('IN', selectedStateObj.isoCode) : [];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <Link to={isEditing ? `/customers/${id}` : '/customers'} className="btn-icon">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1>{isEditing ? 'Edit Customer' : 'New Customer'}</h1>
            <p className="text-secondary" style={{marginTop: '0.25rem'}}>
              {isEditing ? 'Update party details and preferences.' : 'Create a new CRM party profile.'}
            </p>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{maxWidth: '800px', padding: '2rem'}}>
        {loading && isEditing ? (
          <p>Loading...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem'}}>
              
              <div style={{gridColumn: '1 / -1'}}>
                <label>Display Name *</label>
                <input 
                  type="text" 
                  name="display_name" 
                  value={formData.display_name} 
                  onChange={handleChange} 
                  placeholder="Business or Party Name"
                  required
                />
              </div>

              <div style={{gridColumn: '1 / -1'}}>
                <label>Legal/Core Name</label>
                <input 
                  type="text" 
                  name="legal_or_core_name" 
                  value={formData.legal_or_core_name} 
                  onChange={handleChange} 
                  placeholder="Official registered name if different"
                />
              </div>

              <div style={{gridColumn: '1 / -1'}}>
                <label>Relationship Type</label>
                <select name="relationship_type" value={formData.relationship_type} onChange={handleChange}>
                  <option value="Customer">Customer</option>
                  <option value="Supplier">Supplier</option>
                  <option value="Customer + Supplier">Customer + Supplier</option>
                  <option value="Other">Other</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>

              <div style={{gridColumn: '1 / -1', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '0.5rem'}}>
                <h4 style={{marginBottom: '1rem'}}>Location Information</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem'}}>
                  <div>
                    <label>Pincode (Auto-fill)</label>
                    <div style={{position: 'relative'}}>
                      <input 
                        type="text" 
                        value={pincode} 
                        onChange={handlePincodeChange} 
                        placeholder="6-digit Pincode"
                        maxLength={6}
                      />
                      {fetchingPincode && <span style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--primary)'}}>Fetching...</span>}
                    </div>
                  </div>
                  <div>
                    <label>State</label>
                    <select 
                      name="state" 
                      value={formData.state} 
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, state: e.target.value, city: '' }));
                      }}
                    >
                      <option value="">-- Select State --</option>
                      {allStates.map(s => (
                        <option key={s.isoCode} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>City</label>
                    <select 
                      name="city" 
                      value={formData.city} 
                      onChange={handleChange} 
                      disabled={!selectedStateObj && citiesInState.length === 0}
                    >
                      <option value="">-- Select City --</option>
                      {citiesInState.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                      {/* Allow custom existing city if not in list */}
                      {formData.city && !citiesInState.find(c => c.name === formData.city) && (
                        <option value={formData.city}>{formData.city}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label>Mobile Number</label>
                <input 
                  type="tel" 
                  name="mobile" 
                  value={formData.mobile} 
                  onChange={handleChange} 
                  placeholder="+91..."
                />
              </div>

              <div>
                <label>WhatsApp Number</label>
                <input 
                  type="tel" 
                  name="whatsapp" 
                  value={formData.whatsapp} 
                  onChange={handleChange} 
                  placeholder="+91..."
                />
              </div>

              <div>
                <label>Communication Preference</label>
                <select name="communication_preference" value={formData.communication_preference} onChange={handleChange}>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Call">Call</option>
                  <option value="WhatsApp + Call">WhatsApp + Call</option>
                  <option value="No WhatsApp">No WhatsApp</option>
                  <option value="Do Not Contact">Do Not Contact</option>
                </select>
              </div>

              <div>
                <label>CRM Status</label>
                <select name="crm_status" value={formData.crm_status} onChange={handleChange}>
                  <option value="Active">Active</option>
                  <option value="Dormant">Dormant</option>
                  <option value="At Risk">At Risk</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>

              <div style={{gridColumn: '1 / -1'}}>
                <label>Notes</label>
                <textarea 
                  name="notes" 
                  value={formData.notes} 
                  onChange={handleChange} 
                  rows="4" 
                  placeholder="Internal notes about this party..."
                />
              </div>

              <div>
                <label>Assigned To</label>
                <select 
                  name="assigned_owner_id" 
                  value={formData.assigned_owner_id} 
                  onChange={handleChange}
                  disabled={!isAdmin}
                >
                  <option value="">-- Unassigned --</option>
                  {teamMembers.map(t => (
                    <option key={t.id} value={t.id}>{t.display_name}</option>
                  ))}
                </select>
                {!isAdmin && <small className="text-secondary" style={{display: 'block', marginTop: '0.25rem'}}>Only Admins can reassign ownership.</small>}
              </div>

            </div>
            
            {duplicateWarning && duplicateWarning.length > 0 && (
              <div style={{padding: '1rem', background: 'rgba(239, 172, 68, 0.1)', borderLeft: '4px solid var(--warning)', borderRadius: 'var(--radius-sm)', marginTop: '2rem'}}>
                <h4 style={{color: 'var(--warning)', marginBottom: '0.5rem'}}>Possible Duplicate Detected!</h4>
                <p style={{fontSize: '0.9rem', marginBottom: '1rem'}}>The following similar parties already exist:</p>
                <ul style={{marginBottom: '1rem', paddingLeft: '1.5rem', fontSize: '0.9rem'}}>
                  {duplicateWarning.map(d => (
                    <li key={d.id}>{d.display_name}</li>
                  ))}
                </ul>
                <div style={{display: 'flex', gap: '1rem'}}>
                  <button type="button" className="btn btn-secondary" onClick={() => setDuplicateWarning(null)}>Fix Name</button>
                  <button type="button" className="btn" style={{background: 'var(--warning)', color: '#000'}} onClick={proceedWithSave}>Proceed Anyway (Merge into Current)</button>
                </div>
              </div>
            )}

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem'}}>
              <Link to={isEditing ? `/customers/${id}` : '/customers'} className="btn btn-secondary">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={loading || !!duplicateWarning}>
                <Save size={18} />
                {loading ? 'Saving...' : 'Save Customer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
