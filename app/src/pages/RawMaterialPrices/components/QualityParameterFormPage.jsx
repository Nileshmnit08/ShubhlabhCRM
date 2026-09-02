import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function QualityParameterFormPage({ materials, onRefresh, showMessage }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEdit = !!id;

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    raw_material_id: '',
    grade_name: '',
    grade_name_hi: '',
    parameter_type: 'Grade',
    min_value: '',
    max_value: '',
    uom: '',
    active: true,
    display_order: 99
  });

  useEffect(() => {
    if (isEdit) {
      if (location.state?.qualityParameter) {
        const item = location.state.qualityParameter;
        setFormData({
          raw_material_id: item.raw_material_id || '',
          grade_name: item.grade_name || '',
          grade_name_hi: item.grade_name_hi || '',
          parameter_type: item.parameter_type || 'Grade',
          min_value: item.min_value || '',
          max_value: item.max_value || '',
          uom: item.uom || '',
          active: item.active,
          display_order: item.display_order || 99
        });
      } else {
        fetchQualityParameter(id);
      }
    } else if (location.state?.duplicateFrom) {
      const item = location.state.duplicateFrom;
      setFormData({
        raw_material_id: item.raw_material_id || '',
        grade_name: `${item.grade_name} (Copy)`,
        grade_name_hi: item.grade_name_hi || '',
        parameter_type: item.parameter_type || 'Grade',
        min_value: item.min_value || '',
        max_value: item.max_value || '',
        uom: item.uom || '',
        active: item.active,
        display_order: item.display_order || 99
      });
    }
  }, [id, location.state]);

  const fetchQualityParameter = async (paramId) => {
    try {
      const { data, error } = await supabase
        .from('material_quality_grades')
        .select('*')
        .eq('id', paramId)
        .single();
      if (error) throw error;
      if (data) {
        setFormData({
          raw_material_id: data.raw_material_id || '',
          grade_name: data.grade_name || '',
          grade_name_hi: data.grade_name_hi || '',
          parameter_type: data.parameter_type || 'Grade',
          min_value: data.min_value || '',
          max_value: data.max_value || '',
          uom: data.uom || '',
          active: data.active,
          display_order: data.display_order || 99
        });
      }
    } catch (err) {
      setFormError('Failed to load quality parameter details.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    
    try {
      if (!formData.raw_material_id) throw new Error("Material is required.");
      if (!formData.grade_name.trim()) throw new Error("Grade/Parameter Name is required.");

      const payload = {
        raw_material_id: formData.raw_material_id,
        grade_name: formData.grade_name.trim(),
        grade_name_hi: formData.grade_name_hi.trim(),
        parameter_type: formData.parameter_type,
        min_value: formData.min_value ? Number(formData.min_value) : null,
        max_value: formData.max_value ? Number(formData.max_value) : null,
        uom: formData.uom.trim(),
        active: formData.active,
        display_order: Number(formData.display_order)
      };

      if (isEdit) {
        const { error } = await supabase.from('material_quality_grades').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('material_quality_grades').insert(payload);
        if (error) throw error;
      }

      showMessage('success', `Quality parameter ${isEdit ? 'updated' : 'added'} successfully.`);
      if (onRefresh) onRefresh();
      navigate('/raw-material-prices/configuration/quality-parameters');
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center text-xs font-medium text-secondary mb-4 uppercase tracking-wider">
        <Link to="/raw-material-prices" className="hover:text-primary transition-colors">Raw Material Prices</Link>
        <ChevronRight size={14} className="mx-1 opacity-50" />
        <Link to="/raw-material-prices/configuration" className="hover:text-primary transition-colors">Configuration</Link>
        <ChevronRight size={14} className="mx-1 opacity-50" />
        <Link to="/raw-material-prices/configuration/quality-parameters" className="hover:text-primary transition-colors">Quality Parameters</Link>
        <ChevronRight size={14} className="mx-1 opacity-50" />
        <span className="text-primary">{isEdit ? 'Edit Parameter' : 'Add Parameter'}</span>
      </div>

      <div className="page-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <Link to="/raw-material-prices/configuration/quality-parameters" className="btn-icon" title="Back to Quality Parameters">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1>{isEdit ? 'Edit Quality Parameter' : 'Add Quality Parameter'}</h1>
            <p className="text-secondary" style={{marginTop: '0.25rem'}}>
              Define quality metrics, parameters, or grades for raw materials.
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
        
        <form id="quality-form" onSubmit={handleSave}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem'}}>
            <div style={{gridColumn: '1 / -1'}}>
              <label>Material *</label>
              <select 
                required
                value={formData.raw_material_id}
                onChange={e => setFormData({...formData, raw_material_id: e.target.value})}
              >
                <option value="" disabled>Select material...</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.name_en}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Parameter/Grade Name (English) *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Moisture, FAQ"
                value={formData.grade_name}
                onChange={e => setFormData({...formData, grade_name: e.target.value})}
              />
            </div>
            <div>
              <label>Name (Hindi)</label>
              <input 
                type="text" 
                placeholder="e.g. नमी"
                value={formData.grade_name_hi}
                onChange={e => setFormData({...formData, grade_name_hi: e.target.value})}
              />
            </div>

            <div>
              <label>Type</label>
              <select 
                value={formData.parameter_type}
                onChange={e => setFormData({...formData, parameter_type: e.target.value})}
              >
                <option value="Grade">Grade/Quality Level</option>
                <option value="Metric">Metric (e.g., % Moisture)</option>
                <option value="Deduction">Deduction Parameter</option>
              </select>
            </div>
            <div>
              <label>Display Order</label>
              <input 
                type="number" 
                placeholder="e.g. 1"
                value={formData.display_order}
                onChange={e => setFormData({...formData, display_order: e.target.value})}
              />
            </div>

            {formData.parameter_type !== 'Grade' && (
              <>
                <div>
                  <label>Min Value / Standard</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="e.g. 12"
                    value={formData.min_value}
                    onChange={e => setFormData({...formData, min_value: e.target.value})}
                  />
                </div>
                <div>
                  <label>Max Value / Rejection</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="e.g. 14"
                    value={formData.max_value}
                    onChange={e => setFormData({...formData, max_value: e.target.value})}
                  />
                </div>
                <div>
                  <label>Unit of Measure</label>
                  <input 
                    type="text" 
                    placeholder="e.g. %, Kg"
                    value={formData.uom}
                    onChange={e => setFormData({...formData, uom: e.target.value})}
                  />
                </div>
              </>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '1rem', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)'}}>
              <div>
                <span style={{fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem'}}>Active Status</span>
                <span style={{fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'block'}}>Make this parameter active for the selected material.</span>
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
            <Link to="/raw-material-prices/configuration/quality-parameters" className="btn btn-secondary">
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
              ) : 'Save Parameter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
