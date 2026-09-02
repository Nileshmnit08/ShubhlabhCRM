import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { Search, Filter, X, Edit2, MoreVertical, AlertTriangle, Users, ChevronLeft, ChevronRight, Copy, Power, PowerOff } from 'lucide-react';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import MasterDataSectionHeader from './MasterDataSectionHeader';

export default function BrokersTab({ brokers, materials, loading, onRefresh, showMessage }) {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

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
    broker_name: '',
    firm_name: '',
    mobile: '',
    whatsapp_number: '',
    market_location: '',
    state: '',
    notes: '',
    active: true,
    handled_material_ids: []
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

  // Derived filtered data
  const filteredData = useMemo(() => {
    let result = brokers || [];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => 
        (b.broker_name && b.broker_name.toLowerCase().includes(q)) ||
        (b.firm_name && b.firm_name.toLowerCase().includes(q)) ||
        (b.market_location && b.market_location.toLowerCase().includes(q))
      );
    }

    return result;
  }, [brokers, searchQuery]);

  // Pagination logic
  const totalRecords = filteredData.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (currentPage === 0 && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const hasActiveFilters = searchQuery !== '';

  const resetFilters = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleOpenModal = (item = null, duplicate = false) => {
    setFormError('');
    if (item) {
      // Extract materials handled if available
      const handled = item.broker_materials?.map(bm => bm.raw_material_id) || [];
      
      setFormData({
        id: duplicate ? null : item.id,
        broker_name: duplicate ? `${item.broker_name} (Copy)` : item.broker_name || '',
        firm_name: item.firm_name || '',
        mobile: item.mobile || '',
        whatsapp_number: item.whatsapp_number || '',
        market_location: item.market_location || '',
        state: item.state || '',
        notes: item.notes || '',
        active: item.active,
        handled_material_ids: handled
      });
    } else {
      setFormData({
        id: null,
        broker_name: '',
        firm_name: '',
        mobile: '',
        whatsapp_number: '',
        market_location: '',
        state: '',
        notes: '',
        active: true,
        handled_material_ids: []
      });
    }
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleMaterialToggle = (materialId) => {
    setFormData(prev => {
      const current = prev.handled_material_ids;
      if (current.includes(materialId)) {
        return { ...prev, handled_material_ids: current.filter(id => id !== materialId) };
      } else {
        return { ...prev, handled_material_ids: [...current, materialId] };
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    
    try {
      if (!formData.broker_name.trim()) throw new Error("Broker Name is required.");

      const payload = {
        broker_name: formData.broker_name.trim(),
        firm_name: formData.firm_name.trim(),
        mobile: formData.mobile.trim(),
        whatsapp_number: formData.whatsapp_number.trim(),
        market_location: formData.market_location.trim(),
        state: formData.state.trim(),
        notes: formData.notes.trim(),
        active: formData.active
      };

      let savedBrokerId = formData.id;

      if (formData.id) {
        const { error } = await supabase.from('brokers').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('brokers').insert(payload).select('id').single();
        if (error) throw error;
        savedBrokerId = data.id;
      }

      // Sync broker_materials
      if (savedBrokerId) {
        // First delete existing
        await supabase.from('broker_materials').delete().eq('broker_id', savedBrokerId);
        
        // Then insert new ones
        if (formData.handled_material_ids.length > 0) {
          const bmPayload = formData.handled_material_ids.map(rm_id => ({
            broker_id: savedBrokerId,
            raw_material_id: rm_id
          }));
          const { error: bmError } = await supabase.from('broker_materials').insert(bmPayload);
          if (bmError) throw bmError;
        }
      }
      
      showMessage('success', `Broker ${formData.id ? 'updated' : 'added'} successfully.`);
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving.');
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
      const { error } = await supabase.from('brokers').update({ active: newStatus }).eq('id', id);
      if (error) throw error;
      showMessage('success', `Broker ${newStatus ? 'activated' : 'deactivated'} successfully.`);
      onRefresh();
    } catch (err) {
      showMessage('error', 'Failed to update status.');
    } finally {
      setIsConfirmOpen(false);
      setItemToDeactivate(null);
    }
  };

  return (
    <div className="card bg-white border border-base rounded-xl shadow-sm overflow-hidden flex flex-col">
      <MasterDataSectionHeader 
        title="Broker Master" 
        description="Manage brokers, their contact information, and materials they handle." 
        buttonText="Add Broker" 
        onAdd={() => handleOpenModal()}
      />

      {/* Toolbar */}
      <div className="p-4 bg-slate-50 border-b border-base flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-80 shrink-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text"
            className="input pl-10 pr-4 py-2 w-full text-sm bg-white border-base/80 focus:border-emerald-500 rounded-lg shadow-sm"
            placeholder="Search by name, firm, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1.5 rounded-md transition-colors">
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white min-h-[400px]">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse border border-base/50"></div>)}
          </div>
        ) : filteredData.length === 0 ? (
           <EmptyState icon={Users} title="No Brokers" description={hasActiveFilters ? "Try adjusting your filters." : "Add brokers to start tracking prices from them."} actionText="Add Broker" onAction={() => handleOpenModal()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-base sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Broker / Firm</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Materials Handled</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {paginatedData.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[15px] text-primary">{b.broker_name}</div>
                      {b.firm_name && <div className="text-[13px] text-secondary mt-0.5">{b.firm_name}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-[14px] text-secondary">{b.mobile || '-'}</div>
                      {b.whatsapp_number && b.whatsapp_number !== b.mobile && (
                        <div className="text-[12px] text-emerald-600 mt-0.5 font-medium">WA: {b.whatsapp_number}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-secondary">
                      {b.market_location || '-'}
                      {b.state && b.market_location && `, `}
                      {b.state}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {b.broker_materials && b.broker_materials.length > 0 ? (
                          b.broker_materials.slice(0, 3).map(bm => {
                            const mat = materials.find(m => m.id === bm.raw_material_id);
                            return mat ? (
                              <span key={bm.raw_material_id} className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[11px] rounded font-medium truncate max-w-[120px]" title={mat.name_en}>
                                {mat.name_en}
                              </span>
                            ) : null;
                          })
                        ) : (
                          <span className="text-muted text-sm">-</span>
                        )}
                        {b.broker_materials && b.broker_materials.length > 3 && (
                          <span className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 text-[11px] rounded font-medium">
                            +{b.broker_materials.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge active={b.active} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 relative">
                        <button 
                          className="btn-icon p-1.5 text-secondary hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors tooltip-trigger" 
                          onClick={() => handleOpenModal(b)}
                        >
                          <Edit2 size={16}/>
                        </button>
                        
                        <div className="relative">
                          <button 
                            className={`btn-icon p-1.5 rounded transition-colors ${activeMenuId === b.id ? 'bg-slate-200 text-primary' : 'text-secondary hover:bg-slate-100 hover:text-primary'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === b.id ? null : b.id);
                            }}
                          >
                            <MoreVertical size={16}/>
                          </button>
                          
                          {activeMenuId === b.id && (
                            <div 
                              ref={menuRef}
                              className="absolute right-0 top-full mt-1 w-48 bg-white border border-base rounded-lg shadow-lg py-1 z-50 animate-fade-in"
                            >
                              <button 
                                className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-slate-50 hover:text-primary flex items-center gap-2"
                                onClick={() => handleOpenModal(b, true)}
                              >
                                <Copy size={14} /> Duplicate
                              </button>
                              <button 
                                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${b.active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                onClick={() => handleToggleStatus(b)}
                              >
                                {b.active ? <PowerOff size={14} /> : <Power size={14} />} 
                                {b.active ? 'Deactivate' : 'Activate'}
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

      {/* Pagination Footer */}
      {filteredData.length > 0 && (
        <div className="p-4 border-t border-base bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-secondary font-medium w-full sm:w-auto text-center sm:text-left">
            Showing <span className="text-primary font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-primary font-semibold">{Math.min(currentPage * itemsPerPage, totalRecords)}</span> of <span className="text-primary font-semibold">{totalRecords}</span> brokers
          </div>
          
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
             <div className="flex gap-1.5">
               <button 
                 className={`p-1.5 rounded-md border shadow-sm flex items-center justify-center transition-colors ${currentPage === 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-transparent' : 'bg-white text-secondary border-base hover:bg-slate-50 hover:text-primary'}`}
                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                 disabled={currentPage === 1}
               >
                 <ChevronLeft size={16} />
               </button>
               <button 
                 className={`p-1.5 rounded-md border shadow-sm flex items-center justify-center transition-colors ${currentPage === totalPages || totalPages === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-transparent' : 'bg-white text-secondary border-base hover:bg-slate-50 hover:text-primary'}`}
                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                 disabled={currentPage === totalPages || totalPages === 0}
               >
                 <ChevronRight size={16} />
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-base bg-slate-50 shrink-0">
              <h3 className="font-bold text-lg text-primary">{formData.id ? 'Edit Broker' : 'Add New Broker'}</h3>
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
              
              <form id="broker-form" onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-secondary mb-1.5">Broker Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required 
                      className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" 
                      placeholder="e.g. Ramesh Agarwal"
                      value={formData.broker_name}
                      onChange={e => setFormData({...formData, broker_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-secondary mb-1.5">Firm Name</label>
                    <input 
                      type="text" 
                      className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" 
                      placeholder="e.g. Agarwal Trading Co."
                      value={formData.firm_name}
                      onChange={e => setFormData({...formData, firm_name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-secondary mb-1.5">Mobile Number</label>
                    <input 
                      type="text" 
                      className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="e.g. 9876543210"
                      value={formData.mobile}
                      onChange={e => setFormData({...formData, mobile: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-secondary mb-1.5">WhatsApp Number</label>
                    <input 
                      type="text" 
                      className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="e.g. 9876543210"
                      value={formData.whatsapp_number}
                      onChange={e => setFormData({...formData, whatsapp_number: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-secondary mb-1.5">Market Location</label>
                    <input 
                      type="text" 
                      className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="e.g. Jaipur"
                      value={formData.market_location}
                      onChange={e => setFormData({...formData, market_location: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-secondary mb-1.5">State</label>
                    <input 
                      type="text" 
                      className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="e.g. Rajasthan"
                      value={formData.state}
                      onChange={e => setFormData({...formData, state: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-semibold text-secondary mb-2">Materials Handled</label>
                   <div className="p-3 border border-base/80 bg-slate-50/50 rounded-lg max-h-48 overflow-y-auto">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                       {materials.map(m => (
                         <label key={m.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer transition-colors border border-transparent hover:border-base/50">
                           <input 
                             type="checkbox" 
                             className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                             checked={formData.handled_material_ids.includes(m.id)}
                             onChange={() => handleMaterialToggle(m.id)}
                           />
                           <span className="text-sm text-secondary">{m.name_en} {m.name_hi && <span className="text-muted text-xs">({m.name_hi})</span>}</span>
                         </label>
                       ))}
                     </div>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-semibold text-secondary mb-1.5">Notes</label>
                   <textarea 
                     className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 min-h-[80px]"
                     placeholder="Additional information about the broker..."
                     value={formData.notes}
                     onChange={e => setFormData({...formData, notes: e.target.value})}
                   ></textarea>
                </div>

                <div className="pt-2">
                  <label className="flex items-center justify-between cursor-pointer group p-2 hover:bg-slate-50 rounded-lg -mx-2 transition-colors">
                    <div>
                      <span className="font-semibold text-sm text-primary block">Active Status</span>
                      <span className="text-xs text-secondary">Broker available for data entry</span>
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
                form="broker-form" 
                className="btn btn-primary min-w-[130px] shadow-sm flex items-center justify-center"
                disabled={isSaving}
              >
                {isSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Save Broker'}
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
            <h3 className="font-bold text-xl text-primary mb-2">Deactivate Broker?</h3>
            <p className="text-sm text-secondary mb-8 leading-relaxed">
              Are you sure you want to deactivate <span className="font-semibold text-primary">"{itemToDeactivate?.broker_name}"</span>?<br/> They will no longer be available in the system.
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
