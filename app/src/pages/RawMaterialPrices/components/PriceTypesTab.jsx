import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { Edit2, MoreVertical, AlertTriangle, IndianRupee, Copy, Power, PowerOff, X } from 'lucide-react';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import MasterDataSectionHeader from './MasterDataSectionHeader';

export default function PriceTypesTab({ priceTypes, loading, onRefresh, showMessage }) {
  // Action Menu State
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDeactivate, setItemToDeactivate] = useState(null);
  
  // Form State
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    id: null,
    type_name: '',
    display_order: 0,
    notes: '',
    active: true
  });

  const menuRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const handleOpenModal = (item = null, duplicate = false) => {
    setFormError('');
    if (item) {
      setFormData({
        id: duplicate ? null : item.id,
        type_name: duplicate ? `${item.type_name} (Copy)` : item.type_name || '',
        display_order: item.display_order || 0,
        notes: item.notes || '',
        active: item.active
      });
    } else {
      setFormData({
        id: null,
        type_name: '',
        display_order: (priceTypes?.length || 0) + 1,
        notes: '',
        active: true
      });
    }
    setIsModalOpen(true);
    setActiveMenuId(null);
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

      if (formData.id) {
        const { error } = await supabase.from('rm_price_types').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rm_price_types').insert(payload);
        if (error) throw error;
      }

      showMessage('success', `Price Type ${formData.id ? 'updated' : 'added'} successfully.`);
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving. Type name may already exist.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = (item) => {
    if (item.active) {
      setItemToDeactivate(item);
      setIsConfirmOpen(true);
    } else {
      performStatusUpdate(item.id, true);
    }
    setActiveMenuId(null);
  };

  const performStatusUpdate = async (id, newStatus) => {
    try {
      const { error } = await supabase.from('rm_price_types').update({ active: newStatus }).eq('id', id);
      if (error) throw error;
      showMessage('success', `Price Type ${newStatus ? 'activated' : 'deactivated'} successfully.`);
      onRefresh();
    } catch (err) {
      showMessage('error', 'Failed to update status.');
    } finally {
      setIsConfirmOpen(false);
      setItemToDeactivate(null);
    }
  };

  return (
    <div className="card bg-white border border-base rounded-xl shadow-sm overflow-hidden flex flex-col max-w-4xl mx-auto">
      <MasterDataSectionHeader 
        title="Price Types Master" 
        description="Create and manage price classifications used in daily market entries." 
        buttonText="Add Price Type" 
        onAdd={() => handleOpenModal()}
      />

      <div className="flex-1 bg-white min-h-[400px]">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse border border-base/50"></div>)}
          </div>
        ) : (!priceTypes || priceTypes.length === 0) ? (
           <EmptyState icon={IndianRupee} title="No Price Types" description="Define types of prices you receive from brokers (e.g., Factory Delivery, Ex-Mill)." actionText="Add Price Type" onAction={() => handleOpenModal()} />
        ) : (
          <div className="data-table-container">
            <table className="data-table mobile-cards-table">
              <thead>
                <tr>
                  <th style={{minWidth: '200px'}}>Price Type</th>
                  <th style={{minWidth: '150px'}}>Code</th>
                  <th style={{minWidth: '200px'}}>Description</th>
                  <th style={{width: '100px'}}>Status</th>
                  <th style={{width: '100px', textAlign: 'right'}}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {priceTypes.map(pt => (
                  <tr key={pt.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td data-label="Price Type" className="font-semibold text-[15px] text-primary">{pt.type_name}</td>
                    <td data-label="Code" className="font-medium text-secondary">{pt.code || '-'}</td>
                    <td data-label="Description" className="text-[14px] text-secondary">{pt.description || '-'}</td>
                    <td data-label="Status">
                      <StatusBadge active={pt.active} />
                    </td>
                    <td data-label="Actions" style={{textAlign: 'right'}}>
                      <div className="flex items-center justify-end gap-1 relative">
                        <button 
                          className="btn-icon p-1.5 text-secondary hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors tooltip-trigger" 
                          onClick={() => handleOpenModal(pt)}
                        >
                          <Edit2 size={16}/>
                        </button>
                        
                        <div className="relative">
                          <button 
                            className={`btn-icon p-1.5 rounded transition-colors ${activeMenuId === pt.id ? 'bg-slate-200 text-primary' : 'text-secondary hover:bg-slate-100 hover:text-primary'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === pt.id ? null : pt.id);
                            }}
                          >
                            <MoreVertical size={16}/>
                          </button>
                          
                          {activeMenuId === pt.id && (
                            <div 
                              ref={menuRef}
                              className="absolute right-0 top-full mt-1 w-48 bg-white border border-base rounded-lg shadow-lg py-1 z-50 animate-fade-in"
                            >
                              <button 
                                className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-slate-50 hover:text-primary flex items-center gap-2"
                                onClick={() => handleOpenModal(pt, true)}
                              >
                                <Copy size={14} /> Duplicate
                              </button>
                              <button 
                                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${pt.active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                onClick={() => handleToggleStatus(pt)}
                              >
                                {pt.active ? <PowerOff size={14} /> : <Power size={14} />} 
                                {pt.active ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-base bg-slate-50 shrink-0">
              <h3 className="font-bold text-lg text-primary">{formData.id ? 'Edit Price Type' : 'Add New Price Type'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-secondary hover:bg-slate-200 p-1.5 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {formError && (
                <div className="mb-5 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              
              <form id="pt-form" onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-secondary mb-1.5">Type Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    className="input w-full shadow-sm" 
                    placeholder="e.g. Delivered, Ex-mandi"
                    value={formData.type_name}
                    onChange={e => setFormData({...formData, type_name: e.target.value})}
                  />
                  <p className="text-xs text-muted mt-1">Must be unique.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-secondary mb-1.5">Display Order</label>
                  <input 
                    type="number" 
                    className="input w-full shadow-sm"
                    placeholder="e.g. 1"
                    value={formData.display_order}
                    onChange={e => setFormData({...formData, display_order: e.target.value})}
                  />
                </div>

                <div>
                   <label className="block text-sm font-semibold text-secondary mb-1.5">Notes</label>
                   <textarea 
                     className="input w-full shadow-sm min-h-[60px]"
                     placeholder="Optional notes..."
                     value={formData.notes}
                     onChange={e => setFormData({...formData, notes: e.target.value})}
                   ></textarea>
                </div>

                <div className="pt-2">
                  <label className="flex items-center justify-between cursor-pointer group p-2 hover:bg-slate-50 rounded-lg -mx-2 transition-colors">
                    <div>
                      <span className="font-semibold text-sm text-primary block">Active Status</span>
                      <span className="text-xs text-secondary">Available for selection in prices</span>
                    </div>
                    <div className="relative inline-flex items-center shrink-0 ml-4">
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
              </form>
            </div>
            
            <div className="p-5 border-t border-base bg-slate-50 flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                className="btn btn-outline bg-white shadow-sm px-6"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="pt-form" 
                className="btn btn-primary min-w-[140px] shadow-sm flex items-center justify-center"
                disabled={isSaving}
              >
                {isSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Save Price Type'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in p-6 text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertTriangle size={28} />
            </div>
            <h3 className="font-bold text-xl text-primary mb-2">Deactivate Price Type?</h3>
            <p className="text-sm text-secondary mb-8 leading-relaxed">
              Are you sure you want to deactivate <span className="font-semibold text-primary">"{itemToDeactivate?.type_name}"</span>?<br/> It will be hidden from dropdowns.
            </p>
            <div className="flex gap-3 w-full">
              <button className="btn btn-outline flex-1 shadow-sm" onClick={() => { setIsConfirmOpen(false); setItemToDeactivate(null); }}>Cancel</button>
              <button className="btn bg-red-600 hover:bg-red-700 text-white flex-1 shadow-sm" onClick={() => performStatusUpdate(itemToDeactivate.id, false)}>Yes, Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
