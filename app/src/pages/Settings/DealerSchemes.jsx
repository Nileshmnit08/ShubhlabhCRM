import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Gift, Plus, Save, X, Edit, Trash2, Calendar, ShieldAlert } from 'lucide-react';

export default function DealerSchemes() {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [currentScheme, setCurrentScheme] = useState(null);
  const [currentSlabs, setCurrentSlabs] = useState([]);

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
          dealer_scheme_slabs (id, min_bags, max_bags, reward_type, reward_value, reward_description)
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
    setCurrentSlabs(sortedSlabs);
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
      reward_description: ''
    }]);
  };

  const handleRemoveSlab = (idx) => {
    const newSlabs = [...currentSlabs];
    newSlabs.splice(idx, 1);
    setCurrentSlabs(newSlabs);
  };

  const handleSlabChange = (idx, field, value) => {
    const newSlabs = [...currentSlabs];
    newSlabs[idx][field] = value;
    setCurrentSlabs(newSlabs);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (currentSlabs.length === 0 && currentScheme.status === 'Active') {
      alert("An active scheme must have at least one reward slab.");
      return;
    }

    // Validate strictly increasing min_bags
    const sorted = [...currentSlabs].sort((a, b) => a.min_bags - b.min_bags);
    for (let i = 1; i < sorted.length; i++) {
      if (Number(sorted[i].min_bags) <= Number(sorted[i-1].min_bags)) {
        alert("Slab thresholds must be strictly increasing and unique.");
        return;
      }
    }

    try {
      let schemeId = currentScheme.id;
      
      const schemeData = {
        name: currentScheme.name,
        start_date: currentScheme.start_date,
        end_date: currentScheme.end_date,
        description: currentScheme.description,
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

      // Handle slabs (simple approach: delete existing, insert new for this MVP)
      if (currentScheme.id) {
        const { error: delErr } = await supabase.from('dealer_scheme_slabs').delete().eq('scheme_id', schemeId);
        if (delErr) throw delErr;
      }

      if (currentSlabs.length > 0) {
        const slabsToInsert = currentSlabs.map(s => ({
          scheme_id: schemeId,
          min_bags: Number(s.min_bags),
          max_bags: s.max_bags ? Number(s.max_bags) : null,
          reward_type: s.reward_type,
          reward_description: s.reward_description || 'Reward'
        }));
        const { error: slabErr } = await supabase.from('dealer_scheme_slabs').insert(slabsToInsert);
        if (slabErr) throw slabErr;
      }

      alert("Scheme saved successfully.");
      setIsEditing(false);
      fetchSchemes();
    } catch (err) {
      console.error("Save scheme error:", err);
      const errorMessage = err.message 
        + (err.details ? `\nDetails: ${err.details}` : '') 
        + (err.hint ? `\nHint: ${err.hint}` : '')
        + (err.code ? `\nCode: ${err.code}` : '');
      alert("Failed to save scheme:\n" + errorMessage);
    }
  };

  if (isEditing) {
    return (
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Gift size={24} className="text-primary" /> 
            {currentScheme.id ? 'Edit Scheme' : 'Create New Scheme'}
          </h2>
          <button className="btn cv-btn-subtle" onClick={() => setIsEditing(false)}><X size={20} /> Cancel</button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Basics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label>Scheme Name *</label>
              <input required type="text" className="input" value={currentScheme.name} onChange={e => setCurrentScheme({...currentScheme, name: e.target.value})} style={{ width: '100%' }} />
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
              <input required type="date" className="input" value={currentScheme.start_date} onChange={e => setCurrentScheme({...currentScheme, start_date: e.target.value})} style={{ width: '100%' }} />
            </div>
            <div>
              <label>End Date *</label>
              <input required type="date" className="input" value={currentScheme.end_date} onChange={e => setCurrentScheme({...currentScheme, end_date: e.target.value})} style={{ width: '100%' }} />
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
              <button type="button" className="btn btn-secondary" onClick={handleAddSlab} style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
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
                  <div key={slab.tempId || slab.id || idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem' }}>Min Qualifying Bags *</label>
                      <input required type="number" min="1" className="input" value={slab.min_bags} onChange={e => handleSlabChange(idx, 'min_bags', e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem' }}>Reward Type</label>
                      <select className="input" value={slab.reward_type} onChange={e => handleSlabChange(idx, 'reward_type', e.target.value)} style={{ width: '100%' }}>
                        <option value="Physical Gift">Physical Gift</option>
                        <option value="Credit Note">Credit Note</option>
                        <option value="Discount">Discount</option>
                        <option value="Reward Points">Reward Points</option>
                      </select>
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={{ fontSize: '0.8rem' }}>Reward Description / Name *</label>
                      <input required type="text" className="input" placeholder="e.g. Mixer Grinder" value={slab.reward_description} onChange={e => handleSlabChange(idx, 'reward_description', e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '65px' }}>
                      <button type="button" className="btn cv-btn-subtle" style={{ color: 'var(--danger)' }} onClick={() => handleRemoveSlab(idx)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn cv-btn-subtle" onClick={() => setIsEditing(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              <Save size={18} style={{ marginRight: '0.5rem' }} /> Save Scheme
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
