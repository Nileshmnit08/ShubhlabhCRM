import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import { normalizeIdentity } from '../../../utils/normalizer';

const CATEGORIES = ['Grain', 'Bran', 'Oil Cake', 'Protein Source', 'Mineral', 'Additive', 'Other'];

export default function RawMaterialFormPage({ units, priceTypes, onRefresh, showMessage }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEdit = !!id;

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    name_en: '',
    name_hi: '',
    category: '',
    default_unit_id: '',
    default_price_type_id: '',
    notes: '',
    daily_tracking_required: true,
    active: true,
    display_order: 99
  });

  useEffect(() => {
    if (isEdit) {
      if (location.state?.material) {
        const material = location.state.material;
        setFormData({
          code: material.code || '',
          name_en: material.name_en || '',
          name_hi: material.name_hi || '',
          category: material.category || '',
          default_unit_id: material.default_unit_id || '',
          default_price_type_id: material.default_price_type_id || '',
          notes: material.notes || '',
          daily_tracking_required: material.daily_tracking_required,
          active: material.active,
          display_order: material.display_order || 99
        });
      } else {
        fetchMaterial(id);
      }
    } else if (location.state?.duplicateFrom) {
      const material = location.state.duplicateFrom;
      setFormData({
        code: '', // Reset code for duplicate
        name_en: material.name_en || '',
        name_hi: material.name_hi || '',
        category: material.category || '',
        default_unit_id: material.default_unit_id || '',
        default_price_type_id: material.default_price_type_id || '',
        notes: material.notes || '',
        daily_tracking_required: material.daily_tracking_required,
        active: material.active,
        display_order: material.display_order || 99
      });
    }
  }, [id, location.state]);

  const fetchMaterial = async (materialId) => {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('id', materialId)
        .single();
      if (error) throw error;
      if (data) {
        setFormData({
          code: data.code || '',
          name_en: data.name_en || '',
          name_hi: data.name_hi || '',
          category: data.category || '',
          default_unit_id: data.default_unit_id || '',
          default_price_type_id: data.default_price_type_id || '',
          notes: data.notes || '',
          daily_tracking_required: data.daily_tracking_required,
          active: data.active,
          display_order: data.display_order || 99
        });
      }
    } catch (err) {
      setFormError('Failed to load material details.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    
    try {
      // Basic validation
      if (!formData.code.trim()) throw new Error("Material Code is required.");
      if (!formData.name_en.trim()) throw new Error("English Name is required.");
      if (!formData.category.trim()) throw new Error("Category is required.");
      if (!formData.default_unit_id) throw new Error("Default Unit is required.");

      // Check unique code
      const { data: existingCode } = await supabase
        .from('raw_materials')
        .select('id')
        .eq('code', formData.code.trim())
        .neq('id', id || '00000000-0000-0000-0000-000000000000')
        .maybeSingle();
      
      if (existingCode) {
        throw new Error("This Material Code is already in use.");
      }

      // Check unique normalized name among active materials
      const incomingNorm = normalizeIdentity(formData.name_en);
      const { data: activeMaterials } = await supabase
        .from('raw_materials')
        .select('id, name_en')
        .eq('active', true)
        .neq('id', id || '00000000-0000-0000-0000-000000000000');
        
      if (activeMaterials) {
        const isDuplicate = activeMaterials.some(m => normalizeIdentity(m.name_en) === incomingNorm);
        if (isDuplicate) {
          throw new Error("An active material with this name already exists.");
        }
      }

      const payload = {
        code: formData.code.trim(),
        name_en: formData.name_en.trim(),
        name_hi: formData.name_hi.trim(),
        category: formData.category,
        default_unit_id: formData.default_unit_id,
        default_price_type_id: formData.default_price_type_id || null,
        notes: formData.notes || null,
        daily_tracking_required: formData.daily_tracking_required,
        active: formData.active,
        display_order: formData.display_order
      };

      if (isEdit) {
        const { error } = await supabase.from('raw_materials').update(payload).eq('id', id);
        if (error) throw error;
        showMessage('success', 'Material updated successfully.');
      } else {
        const { error } = await supabase.from('raw_materials').insert(payload);
        if (error) throw error;
        showMessage('success', 'Material added successfully.');
      }
      
      onRefresh();
      navigate('/raw-material-prices/configuration/raw-materials');
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center text-xs font-medium text-secondary mb-4 uppercase tracking-wider">
        <Link to="/raw-material-prices" className="hover:text-primary transition-colors">Raw Material Prices</Link>
        <ChevronRight size={14} className="mx-1 opacity-50" />
        <Link to="/raw-material-prices/configuration" className="hover:text-primary transition-colors">Configuration</Link>
        <ChevronRight size={14} className="mx-1 opacity-50" />
        <Link to="/raw-material-prices/configuration/raw-materials" className="hover:text-primary transition-colors">Raw Materials</Link>
        <ChevronRight size={14} className="mx-1 opacity-50" />
        <span className="text-primary">{isEdit ? 'Edit Raw Material' : 'Add Raw Material'}</span>
      </div>

      <div className="page-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <Link to="/raw-material-prices/configuration/raw-materials" className="btn-icon" title="Back to Raw Materials">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1>{isEdit ? 'Edit Raw Material' : 'Add Raw Material'}</h1>
            <p className="text-secondary" style={{marginTop: '0.25rem'}}>
              Create a raw material and define its default tracking settings.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{maxWidth: '800px', padding: '2rem'}}>
        {formError && (
          <div style={{padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem'}}>
            <AlertTriangle size={18} style={{marginTop: '2px'}} />
            <span>{formError}</span>
          </div>
        )}
        
        <form id="material-form" onSubmit={handleSave}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem'}}>
            <div style={{gridColumn: '1 / -1'}}>
              <label>Material Code *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. RM-016"
                value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
              />
              <p className="text-muted" style={{fontSize: '0.8rem', marginTop: '0.25rem'}}>Must be unique.</p>
            </div>
            
            <div>
              <label>English Name *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Maize"
                value={formData.name_en}
                onChange={e => setFormData({...formData, name_en: e.target.value})}
              />
            </div>
            <div>
              <label>Hindi Name</label>
              <input 
                type="text" 
                placeholder="e.g. मक्का"
                value={formData.name_hi}
                onChange={e => setFormData({...formData, name_hi: e.target.value})}
              />
            </div>

            <div>
              <label>Category *</label>
              <select 
                required
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                <option value="" disabled>Select category...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label>Default Unit *</label>
              <select 
                required
                value={formData.default_unit_id}
                onChange={e => setFormData({...formData, default_unit_id: e.target.value})}
              >
                <option value="" disabled>Select unit...</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.unit_name}</option>)}
              </select>
            </div>
            <div>
              <label>Default Supplier/Market</label>
              <select 
                value={formData.default_price_type_id}
                onChange={e => setFormData({...formData, default_price_type_id: e.target.value})}
              >
                <option value="">None</option>
                {priceTypes?.map(pt => <option key={pt.id} value={pt.id}>{pt.type_name}</option>)}
              </select>
            </div>
            
            <div style={{gridColumn: '1 / -1'}}>
              <label>Notes</label>
              <textarea 
                placeholder="Optional notes or context about this material..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                rows={2}
                className="w-full p-2 border border-base rounded-md text-sm"
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '1rem', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)'}}>
              <div>
                <span style={{fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem'}}>Daily Price Tracking</span>
                <span style={{fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'block'}}>Require daily market price logging for this material.</span>
              </div>
              <div style={{position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '1rem', flexShrink: 0}}>
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.daily_tracking_required}
                  onChange={e => setFormData({...formData, daily_tracking_required: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
              </div>
            </label>

            <label style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '1rem', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)'}}>
              <div>
                <span style={{fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem'}}>Active Status</span>
                <span style={{fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'block'}}>Make this material available for selection.</span>
              </div>
              <div style={{position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '1rem', flexShrink: 0}}>
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.active}
                  onChange={e => setFormData({...formData, active: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
              </div>
            </label>
          </div>

          <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem'}}>
            <Link to="/raw-material-prices/configuration/raw-materials" className="btn btn-secondary">
              Cancel
            </Link>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" style={{marginRight: '0.5rem'}}></span>
                  Saving...
                </>
              ) : 'Save Raw Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
