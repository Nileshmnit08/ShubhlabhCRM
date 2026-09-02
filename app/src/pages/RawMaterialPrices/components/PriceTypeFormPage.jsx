import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function PriceTypeFormPage({ onRefresh, showMessage }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEdit = !!id;

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    type_name: '',
    display_order: 0,
    notes: '',
    active: true
  });

  useEffect(() => {
    if (isEdit) {
      if (location.state?.priceType) {
        const item = location.state.priceType;
        setFormData({
          type_name: item.type_name || '',
          display_order: item.display_order || 0,
          notes: item.notes || '',
          active: item.active
        });
      } else {
        fetchPriceType(id);
      }
    } else if (location.state?.duplicateFrom) {
      const item = location.state.duplicateFrom;
      setFormData({
        type_name: `${item.type_name} (Copy)`,
        display_order: item.display_order || 0,
        notes: item.notes || '',
        active: item.active
      });
    } else if (location.state?.nextOrder) {
      setFormData(prev => ({ ...prev, display_order: location.state.nextOrder }));
    }
  }, [id, location.state]);

  const fetchPriceType = async (typeId) => {
    try {
      const { data, error } = await supabase
        .from('rm_price_types')
        .select('*')
        .eq('id', typeId)
        .single();
      if (error) throw error;
      if (data) {
        setFormData({
          type_name: data.type_name || '',
          display_order: data.display_order || 0,
          notes: data.notes || '',
          active: data.active
        });
      }
    } catch (err) {
      setFormError('Failed to load price type details.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    
    try {
      if (!formData.type_name.trim()) throw new Error("Type Name is required.");

      const payload = {
        type_name: formData.type_name.trim(),
        display_order: Number(formData.display_order),
        notes: formData.notes.trim(),
        active: formData.active
      };

      if (isEdit) {
        const { error } = await supabase.from('rm_price_types').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rm_price_types').insert(payload);
        if (error) throw error;
      }

      showMessage('success', `Price Type ${isEdit ? 'updated' : 'added'} successfully.`);
      if (onRefresh) onRefresh();
      navigate('/raw-material-prices/configuration/price-types');
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving. Type name may already exist.');
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
        <Link to="/raw-material-prices/configuration/price-types" className="hover:text-primary transition-colors">Price Types</Link>
        <ChevronRight size={14} className="mx-1 opacity-50" />
        <span className="text-primary">{isEdit ? 'Edit Price Type' : 'Add Price Type'}</span>
      </div>

      <div className="page-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <Link to="/raw-material-prices/configuration/price-types" className="btn-icon" title="Back to Price Types">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1>{isEdit ? 'Edit Price Type' : 'Add Price Type'}</h1>
            <p className="text-secondary" style={{marginTop: '0.25rem'}}>
              Configure price types like Ex-Mandi, Delivered, or Plant Delivery.
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
        
        <form id="price-type-form" onSubmit={handleSave}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem'}}>
            <div>
              <label>Price Type Name *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Ex-Mandi, Delivered"
                value={formData.type_name}
                onChange={e => setFormData({...formData, type_name: e.target.value})}
              />
              <p className="text-muted" style={{fontSize: '0.8rem', marginTop: '0.25rem'}}>Must be unique.</p>
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

            <div style={{gridColumn: '1 / -1'}}>
              <label>Notes</label>
              <textarea 
                rows="3"
                placeholder="Optional notes..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              ></textarea>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '1rem', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)'}}>
              <div>
                <span style={{fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem'}}>Active Status</span>
                <span style={{fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'block'}}>Make this price type available for selection.</span>
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
            <Link to="/raw-material-prices/configuration/price-types" className="btn btn-secondary">
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
              ) : 'Save Price Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
