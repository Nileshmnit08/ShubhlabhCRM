import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Gift, Plus, Save, X, Edit, Trash2, Calendar, ShieldAlert, AlertCircle, Loader } from 'lucide-react';

function buildSlabName(minBags, rewardDescription) {
  const description = rewardDescription?.trim();
  return description ? `${minBags} Bags - ${description}` : `${minBags} Bags`;
}

export default function DealerSchemes() {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  
  const [currentScheme, setCurrentScheme] = useState(null);
  const [currentSlabs, setCurrentSlabs] = useState([]);
  const [deletedSlabs, setDeletedSlabs] = useState([]);
  
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchSchemes();
  }, []);

  async function fetchSchemes() {
    setLoading(true);
    try {
      const { data, error: sErr } = await supabase
        .from('dealer_schemes')
        .select(`
          id, name, start_date, end_date, status, description, overlap_policy, customer_type,
          dealer_scheme_slabs (id, slab_name, min_bags, max_bags, reward_type, reward_value, reward_description)
        `)
        .order('created_at', { ascending: false });

      if (sErr) throw sErr;
      setSchemes(data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load dealer schemes.");
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (scheme) => {
    setCurrentScheme({
      id: scheme.id,
      name: scheme.name,
      start_date: scheme.start_date,
      end_date: scheme.end_date,
      description: scheme.description || '',
      status: scheme.status,
      overlap_policy: scheme.overlap_policy || 'Highest Value',
      customer_type: scheme.customer_type || 'Dealers Only'
    });
    // Sort slabs by min_bags
    const sortedSlabs = (scheme.dealer_scheme_slabs || []).sort((a, b) => a.min_bags - b.min_bags);
    setCurrentSlabs(sortedSlabs.map(s => ({...s}))); // clone
    setDeletedSlabs([]);
    setSaveError(null);
    setValidationErrors({});
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    setCurrentScheme({
      id: null,
      name: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      description: '',
      status: 'Draft',
      overlap_policy: 'Highest Value',
      customer_type: 'Dealers Only'
    });
    setCurrentSlabs([]);
    setDeletedSlabs([]);
    setSaveError(null);
    setValidationErrors({});
    setIsEditing(true);
  };

  const handleAddSlab = () => {
    const lastSlab = currentSlabs[currentSlabs.length - 1];
    const newMin = lastSlab ? Number(lastSlab.min_bags) + 100 : 100;
    setCurrentSlabs([...currentSlabs, {
      tempId: Date.now(),
      min_bags: newMin,
      max_bags: '',
      reward_type: 'Physical Gift',
      reward_value: '',
      reward_description: ''
    }]);
  };

  const handleRemoveSlab = (idx) => {
    const newSlabs = [...currentSlabs];
    const removed = newSlabs.splice(idx, 1)[0];
    setCurrentSlabs(newSlabs);
    if (removed.id) {
      setDeletedSlabs([...deletedSlabs, removed.id]);
    }
  };

  const handleSlabChange = (idx, field, value) => {
    const newSlabs = [...currentSlabs];
    newSlabs[idx][field] = value;
    setCurrentSlabs(newSlabs);
  };

  const validateForm = () => {
    const errors = {};
    if (!currentScheme.name?.trim()) errors.name = "Scheme name is required.";
    if (!currentScheme.start_date) errors.start_date = "Start date is required.";
    if (!currentScheme.end_date) errors.end_date = "End date is required.";
    
    if (currentScheme.start_date && currentScheme.end_date) {
      if (new Date(currentScheme.end_date) < new Date(currentScheme.start_date)) {
        errors.end_date = "End date must be on or after start date.";
      }
    }

    if (currentSlabs.length === 0 && currentScheme.status === 'Active') {
      errors.general = "An active scheme must have at least one reward slab.";
    }

    let slabErrors = false;
    let prevMin = -1;
    let prevRewardVal = -1;

    const sortedSlabs = [...currentSlabs].sort((a, b) => Number(a.min_bags || 0) - Number(b.min_bags || 0));

    sortedSlabs.forEach((s, idx) => {
      const minBags = Number(s.min_bags);
      if (isNaN(minBags) || minBags <= 0) {
        errors[`slab_${idx}_min_bags`] = "Must be a positive number.";
        slabErrors = true;
      }
      if (!s.reward_description?.trim()) {
        errors[`slab_${idx}_desc`] = "Description required.";
        slabErrors = true;
      }
      if (minBags <= prevMin) {
        errors[`slab_${idx}_min_bags`] = "Bag thresholds must be strictly increasing and unique.";
        slabErrors = true;
      }
      prevMin = minBags;

      if (s.reward_type === 'Reward Points') {
        const rVal = Number(s.reward_value);
        if (isNaN(rVal) || rVal <= 0) {
          errors[`slab_${idx}_val`] = "Points must be positive.";
          slabErrors = true;
        } else if (rVal <= prevRewardVal) {
          errors[`slab_${idx}_val`] = "Reward points must increase with bag thresholds.";
          slabErrors = true;
        }
        prevRewardVal = Math.max(prevRewardVal, rVal);
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError(null);
    
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      let schemeId = currentScheme.id;
      
      const schemeData = {
        name: currentScheme.name.trim(),
        start_date: currentScheme.start_date,
        end_date: currentScheme.end_date,
        description: currentScheme.description?.trim(),
        status: currentScheme.status,
        overlap_policy: currentScheme.overlap_policy,
        customer_type: currentScheme.customer_type
      };

      if (!schemeId) {
        // Insert new scheme
        const { data: insData, error: insErr } = await supabase
          .from('dealer_schemes')
          .insert(schemeData)
          .select('id')
          .single();
        if (insErr) throw insErr;
        schemeId = insData.id;
      } else {
        // Update existing scheme
        const { error: updErr } = await supabase
          .from('dealer_schemes')
          .update(schemeData)
          .eq('id', schemeId);
        if (updErr) throw updErr;
      }

      // Handle Deleted Slabs
      if (deletedSlabs.length > 0) {
        const { error: delErr } = await supabase
          .from('dealer_scheme_slabs')
          .delete()
          .in('id', deletedSlabs);
        if (delErr) throw delErr;
      }

      // Upsert Slabs safely (Insert missing, Update existing)
      if (currentSlabs.length > 0) {
        const slabsToUpsert = currentSlabs.map(s => {
          const minBagsNum = Number(s.min_bags);
          return {
            ...(s.id ? { id: s.id } : {}), // only include id if it's already an existing record
            scheme_id: schemeId,
            slab_name: buildSlabName(minBagsNum, s.reward_description),
            min_bags: minBagsNum,
            max_bags: s.max_bags ? Number(s.max_bags) : null,
            reward_type: s.reward_type,
            reward_value: s.reward_value ? Number(s.reward_value) : null,
            reward_description: s.reward_description.trim()
          };
        });
        
        const { error: slabErr } = await supabase
          .from('dealer_scheme_slabs')
          .upsert(slabsToUpsert, { onConflict: 'id' });
        
        if (slabErr) throw slabErr;
      }

      setIsEditing(false);
      fetchSchemes();
      // We can use a standard JS alert here, or just let it close cleanly
      // We'll let it close cleanly, the main screen will reload
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Save scheme error:", err);
      }
      const errorMessage = err.message || 'Unknown error occurred.';
      setSaveError(`Could not save scheme: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Gift size={24} className="text-primary" /> 
            {currentScheme.id ? 'Edit Scheme' : 'Create New Scheme'}
          </h2>
          <button className="btn cv-btn-subtle" onClick={() => setIsEditing(false)} disabled={isSaving}><X size={20} /> Cancel</button>
        </div>

        {saveError && (
          <div style={{ padding: '1rem', background: 'rgba(231,76,60,0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <AlertCircle size={18} /> {saveError}
          </div>
        )}

        {validationErrors.general && (
          <div style={{ padding: '1rem', background: 'rgba(231,76,60,0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <AlertCircle size={18} /> {validationErrors.general}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Basics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label>Scheme Name *</label>
              <input type="text" className={`input ${validationErrors.name ? 'input-error' : ''}`} value={currentScheme.name} onChange={e => setCurrentScheme({...currentScheme, name: e.target.value})} style={{ width: '100%', borderColor: validationErrors.name ? 'var(--danger)' : '' }} />
              {validationErrors.name && <div style={{color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px'}}>{validationErrors.name}</div>}
            </div>
            <div>
              <label>Status</label>
              <select className="input" value={currentScheme.status} onChange={e => setCurrentScheme({...currentScheme, status: e.target.value})} style={{ width: '100%' }}>
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
                <option value="Closed">Closed</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label>Start Date *</label>
              <input type="date" className="input" value={currentScheme.start_date} onChange={e => setCurrentScheme({...currentScheme, start_date: e.target.value})} style={{ width: '100%', borderColor: validationErrors.start_date ? 'var(--danger)' : '' }} />
              {validationErrors.start_date && <div style={{color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px'}}>{validationErrors.start_date}</div>}
            </div>
            <div>
              <label>End Date *</label>
              <input type="date" className="input" value={currentScheme.end_date} onChange={e => setCurrentScheme({...currentScheme, end_date: e.target.value})} style={{ width: '100%', borderColor: validationErrors.end_date ? 'var(--danger)' : '' }} />
              {validationErrors.end_date && <div style={{color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px'}}>{validationErrors.end_date}</div>}
            </div>
          </div>

          <div>
            <label>Description</label>
            <textarea className="input" rows="2" value={currentScheme.description} onChange={e => setCurrentScheme({...currentScheme, description: e.target.value})} style={{ width: '100%' }} />
          </div>

          {/* Overlap & Policies */}
          <div style={{ padding: '1.5rem', background: 'var(--bg-base)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0 }}>Business Rules</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label>Overlap Policy</label>
                <select className="input" value={currentScheme.overlap_policy} onChange={e => setCurrentScheme({...currentScheme, overlap_policy: e.target.value})} style={{ width: '100%' }}>
                  <option value="Highest Value">Highest Value Only (Recommended)</option>
                  <option value="Cumulative">Cumulative (Allow Double Gifting)</option>
                </select>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Determines behavior if multiple active schemes cover the same dates.</span>
              </div>
              <div>
                <label>Target Audience</label>
                <select className="input" value={currentScheme.customer_type} onChange={e => setCurrentScheme({...currentScheme, customer_type: e.target.value})} style={{ width: '100%' }}>
                  <option value="Dealers Only">Dealers Only</option>
                  <option value="Distributors & Dealers">Distributors & Dealers</option>
                  <option value="All Customers">All Customers</option>
                </select>
              </div>
            </div>
          </div>

          {/* Slabs Builder */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Reward Slabs (Bag Thresholds)</h3>
              <button type="button" className="btn btn-secondary" onClick={handleAddSlab} style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }} disabled={isSaving}>
                <Plus size={16} style={{ marginRight: '0.25rem' }}/> Add Slab
              </button>
            </div>
            
            {currentSlabs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                No slabs added yet. Click "Add Slab" to define bag thresholds.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {currentSlabs.map((slab, idx) => (
                  <div key={slab.id || slab.tempId || idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ flex: '1' }}>
                      <label style={{ fontSize: '0.8rem' }}>Min Bags *</label>
                      <input type="number" min="1" className="input" value={slab.min_bags} onChange={e => handleSlabChange(idx, 'min_bags', e.target.value)} style={{ width: '100%', borderColor: validationErrors[`slab_${idx}_min_bags`] ? 'var(--danger)' : '' }} />
                      {validationErrors[`slab_${idx}_min_bags`] && <div style={{color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', lineHeight: '1.2'}}>{validationErrors[`slab_${idx}_min_bags`]}</div>}
                    </div>
                    <div style={{ flex: '1.5' }}>
                      <label style={{ fontSize: '0.8rem' }}>Reward Type</label>
                      <select className="input" value={slab.reward_type} onChange={e => handleSlabChange(idx, 'reward_type', e.target.value)} style={{ width: '100%' }}>
                        <option value="Physical Gift">Physical Gift</option>
                        <option value="Credit Note">Credit Note</option>
                        <option value="Discount">Discount</option>
                        <option value="Reward Points">Reward Points</option>
                      </select>
                    </div>
                    <div style={{ flex: '1' }}>
                      <label style={{ fontSize: '0.8rem' }}>Value (Optional)</label>
                      <input type="number" className="input" placeholder="e.g. 500" value={slab.reward_value || ''} onChange={e => handleSlabChange(idx, 'reward_value', e.target.value)} style={{ width: '100%', borderColor: validationErrors[`slab_${idx}_val`] ? 'var(--danger)' : '' }} />
                      {validationErrors[`slab_${idx}_val`] && <div style={{color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', lineHeight: '1.2'}}>{validationErrors[`slab_${idx}_val`]}</div>}
                    </div>
                    <div style={{ flex: '2' }}>
                      <label style={{ fontSize: '0.8rem' }}>Reward Description *</label>
                      <input type="text" className="input" placeholder="e.g. 500 Points" value={slab.reward_description} onChange={e => handleSlabChange(idx, 'reward_description', e.target.value)} style={{ width: '100%', borderColor: validationErrors[`slab_${idx}_desc`] ? 'var(--danger)' : '' }} />
                      {validationErrors[`slab_${idx}_desc`] && <div style={{color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', lineHeight: '1.2'}}>{validationErrors[`slab_${idx}_desc`]}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', height: '100%', paddingTop: '1.8rem' }}>
                      <button type="button" className="btn cv-btn-subtle" style={{ color: 'var(--danger)' }} onClick={() => handleRemoveSlab(idx)} disabled={isSaving}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn cv-btn-subtle" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <><Loader size={18} className="spin" style={{ marginRight: '0.5rem' }} /> Saving...</> : <><Save size={18} style={{ marginRight: '0.5rem' }} /> Save Scheme</>}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
      <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Gift className="text-primary" size={24} /> Dealer Schemes & Rewards
          </h2>
          <p className="text-secondary" style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
            Configure bag-based rewards and threshold slabs for your dealer network.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateNew}>
          <Plus size={18} style={{ marginRight: '0.25rem' }} /> Create Scheme
        </button>
      </div>

      <div style={{ overflowX: 'auto', padding: '1rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>Loading schemes...</div>
        ) : error ? (
          <div style={{ padding: '1rem', color: 'var(--danger)' }}>{error}</div>
        ) : schemes.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <ShieldAlert size={48} className="text-muted" style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <h3>No schemes configured</h3>
            <p className="text-secondary">Click 'Create Scheme' to set up your first dealer reward program.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {schemes.map(s => (
              <div key={s.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{s.name}</h3>
                  <span className={`badge ${s.status === 'Active' ? 'badge-success' : s.status === 'Draft' ? 'badge-secondary' : 'badge-warning'}`}>
                    {s.status}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <Calendar size={14} /> {new Date(s.start_date).toLocaleDateString()} - {new Date(s.end_date).toLocaleDateString()}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', height: '40px', overflow: 'hidden' }}>
                  {s.description || 'No description provided.'}
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
                    {s.dealer_scheme_slabs?.length || 0} Slabs Defined
                  </div>
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => handleEdit(s)}>
                    <Edit size={14} style={{ marginRight: '0.25rem' }} /> Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
