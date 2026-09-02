import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft, AlertTriangle } from 'lucide-react';

const CATEGORIES = ['Grain', 'Bran', 'Oil Cake', 'Protein Source', 'Mineral', 'Additive', 'Other'];

export default function RawMaterialFormPage({ units, onRefresh, showMessage }) {
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
      const { data: existing } = await supabase
        .from('raw_materials')
        .select('id')
        .eq('code', formData.code.trim())
        .neq('id', id || '00000000-0000-0000-0000-000000000000')
        .maybeSingle();
      
      if (existing) {
        throw new Error("This Material Code is already in use.");
      }

      const payload = {
        code: formData.code.trim(),
        name_en: formData.name_en.trim(),
        name_hi: formData.name_hi.trim(),
        category: formData.category,
        default_unit_id: formData.default_unit_id,
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
    <div className="max-w-3xl mx-auto pb-12 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center text-xs font-medium text-secondary mb-4 uppercase tracking-wider">
        <Link to="/raw-material-prices" className="hover:text-primary transition-colors">Raw Material Prices</Link>
        <ChevronRight size={14} className="mx-1 opacity-50" />
        <Link to="/raw-material-prices/configuration" className="hover:text-primary transition-colors">Configuration</Link>
        <ChevronRight size={14} className="mx-1 opacity-50" />
        <Link to="/raw-material-prices/configuration/raw-materials" className="hover:text-primary transition-colors">Raw Materials</Link>
        <ChevronRight size={14} className="mx-1 opacity-50" />
        <span className="text-primary">{isEdit ? 'Edit Material' : 'Add Material'}</span>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/raw-material-prices/configuration/raw-materials')}
          className="btn-icon bg-white border border-base shadow-sm text-secondary hover:text-primary hover:bg-slate-50"
          title="Back to Raw Materials"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-primary m-0 tracking-tight">{isEdit ? 'Edit Material' : 'Add New Material'}</h1>
          <p className="text-sm text-secondary mt-1">Create a raw material and define its default tracking settings.</p>
        </div>
      </div>

      <div className="glass-panel p-6 sm:p-8">
        {formError && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        
        <form id="material-form" onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-secondary mb-1.5">Material Code <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              required 
              className="input w-full uppercase font-mono shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" 
              placeholder="e.g. RM-016"
              value={formData.code}
              onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
            />
            <p className="text-xs text-muted mt-1">Must be unique.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5">English Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required 
                className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" 
                placeholder="e.g. Maize"
                value={formData.name_en}
                onChange={e => setFormData({...formData, name_en: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5">Hindi Name</label>
              <input 
                type="text" 
                className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" 
                placeholder="e.g. मक्का"
                value={formData.name_hi}
                onChange={e => setFormData({...formData, name_hi: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5">Category <span className="text-red-500">*</span></label>
              <select 
                required
                className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                <option value="" disabled>Select category...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5">Default Unit <span className="text-red-500">*</span></label>
              <select 
                required
                className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                value={formData.default_unit_id}
                onChange={e => setFormData({...formData, default_unit_id: e.target.value})}
              >
                <option value="" disabled>Select unit...</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.unit_name}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-base mt-6">
            <label className="flex items-center justify-between cursor-pointer group py-4 hover:bg-slate-50 rounded-lg -mx-4 px-4 transition-colors">
              <div>
                <span className="font-semibold text-sm text-primary block mb-0.5">Daily Price Tracking</span>
                <span className="text-sm text-secondary block">Require daily market price logging for this material</span>
              </div>
              <div className="relative inline-flex items-center shrink-0 ml-4">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.daily_tracking_required}
                  onChange={e => setFormData({...formData, daily_tracking_required: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group py-4 hover:bg-slate-50 rounded-lg -mx-4 px-4 transition-colors">
              <div>
                <span className="font-semibold text-sm text-primary block mb-0.5">Active Status</span>
                <span className="text-sm text-secondary block">Make this material available for selection</span>
              </div>
              <div className="relative inline-flex items-center shrink-0 ml-4">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.active}
                  onChange={e => setFormData({...formData, active: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 shadow-inner"></div>
              </div>
            </label>
          </div>

          <div className="pt-6 border-t border-base flex flex-col sm:flex-row justify-end gap-3 mt-6">
            <button 
              type="button" 
              className="btn btn-outline bg-white shadow-sm px-6 py-2.5 order-2 sm:order-1 w-full sm:w-auto"
              onClick={() => navigate('/raw-material-prices/configuration/raw-materials')}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary min-w-[140px] shadow-sm flex items-center justify-center px-6 py-2.5 order-1 sm:order-2 w-full sm:w-auto text-[15px]"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                  Saving...
                </>
              ) : 'Save Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
