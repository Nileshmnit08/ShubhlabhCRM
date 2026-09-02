import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { Search, Plus, Filter, X, Edit2, MoreVertical, AlertTriangle, LayoutList, ChevronLeft, ChevronRight, Copy, Power, PowerOff } from 'lucide-react';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import MasterDataSectionHeader from './MasterDataSectionHeader';

export default function QualityParametersTab({ qualityGrades, materials, loading, onRefresh, showMessage }) {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [materialFilter, setMaterialFilter] = useState('All');
  
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
    let result = qualityGrades || [];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(qItem => 
        (qItem.grade_name && qItem.grade_name.toLowerCase().includes(q)) ||
        (qItem.raw_materials?.name_en && qItem.raw_materials.name_en.toLowerCase().includes(q))
      );
    }

    if (materialFilter !== 'All') {
      result = result.filter(qItem => qItem.raw_material_id === materialFilter);
    }

    return result;
  }, [qualityGrades, searchQuery, materialFilter]);

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

  const hasActiveFilters = searchQuery !== '' || materialFilter !== 'All';

  const resetFilters = () => {
    setSearchQuery('');
    setMaterialFilter('All');
    setCurrentPage(1);
  };

  const handleOpenModal = (item = null, duplicate = false) => {
    setFormError('');
    if (item) {
      setFormData({
        id: duplicate ? null : item.id,
        raw_material_id: item.raw_material_id || '',
        grade_name: duplicate ? `${item.grade_name} (Copy)` : item.grade_name || '',
        grade_name_hi: item.grade_name_hi || '',
        parameter_type: item.parameter_type || 'Grade',
        min_value: item.min_value || '',
        max_value: item.max_value || '',
        uom: item.uom || '',
        active: item.active,
        display_order: item.display_order || 99
      });
    } else {
      setFormData({
        id: null,
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
    }
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    
    try {
      if (!formData.raw_material_id) throw new Error("Material is required.");
      if (!formData.grade_name.trim()) throw new Error("Parameter Name is required.");

      const payload = {
        raw_material_id: formData.raw_material_id,
        grade_name: formData.grade_name.trim(),
        grade_name_hi: formData.grade_name_hi.trim(),
        parameter_type: formData.parameter_type.trim(),
        min_value: formData.min_value === '' ? null : Number(formData.min_value),
        max_value: formData.max_value === '' ? null : Number(formData.max_value),
        uom: formData.uom.trim(),
        active: formData.active,
        display_order: Number(formData.display_order)
      };

      if (formData.id) {
        const { error } = await supabase.from('material_quality_grades').update(payload).eq('id', formData.id);
        if (error) throw error;
        showMessage('success', 'Quality parameter updated successfully.');
      } else {
        const { error } = await supabase.from('material_quality_grades').insert(payload);
        if (error) throw error;
        showMessage('success', 'New quality parameter added successfully.');
      }
      
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
      const { error } = await supabase.from('material_quality_grades').update({ active: newStatus }).eq('id', id);
      if (error) throw error;
      showMessage('success', `Parameter ${newStatus ? 'activated' : 'deactivated'} successfully.`);
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
        title="Quality & Grade Master" 
        description="Define specific quality parameters or grades for raw materials." 
        buttonText="Add Parameter" 
        onAdd={() => handleOpenModal()}
      />

      {/* Toolbar */}
      <div className="p-4 bg-slate-50 border-b border-base flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-80 shrink-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text"
            className="input pl-10 pr-4 py-2 w-full text-sm bg-white border-base/80 focus:border-emerald-500 rounded-lg shadow-sm"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted" />
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider hidden md:inline">Material:</span>
            <select className="input py-1.5 px-3 text-sm bg-white border-base/80 rounded-md shadow-sm h-8" value={materialFilter} onChange={e => setMaterialFilter(e.target.value)}>
              <option value="All">All Materials</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name_en}</option>)}
            </select>
          </div>
          
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
           <EmptyState icon={LayoutList} title="No Quality Parameters" description={hasActiveFilters ? "Try adjusting your filters." : "You haven't defined any quality grades or parameters."} actionText="Add Parameter" onAction={() => handleOpenModal()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-base sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Material</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Parameter/Grade</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Limits / UOM</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {paginatedData.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 font-medium text-primary">{q.raw_materials?.name_en}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[15px] text-primary">{q.grade_name}</div>
                      {q.grade_name_hi && <div className="text-[13px] text-secondary mt-0.5">{q.grade_name_hi}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center text-[13px] font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        {q.parameter_type || 'Grade'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[14px] text-secondary">
                      {q.min_value !== null || q.max_value !== null ? (
                        <div className="flex items-center gap-1">
                          {q.min_value !== null && <span className="font-medium text-primary">{q.min_value}</span>}
                          {q.min_value !== null && q.max_value !== null && <span className="text-muted">-</span>}
                          {q.max_value !== null && <span className="font-medium text-primary">{q.max_value}</span>}
                          {q.uom && <span className="text-xs text-muted ml-1">{q.uom}</span>}
                        </div>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge active={q.active} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 relative">
                        <button 
                          className="btn-icon p-1.5 text-secondary hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors tooltip-trigger" 
                          onClick={() => handleOpenModal(q)}
                        >
                          <Edit2 size={16}/>
                        </button>
                        
                        <div className="relative">
                          <button 
                            className={`btn-icon p-1.5 rounded transition-colors ${activeMenuId === q.id ? 'bg-slate-200 text-primary' : 'text-secondary hover:bg-slate-100 hover:text-primary'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === q.id ? null : q.id);
                            }}
                          >
                            <MoreVertical size={16}/>
                          </button>
                          
                          {activeMenuId === q.id && (
                            <div 
                              ref={menuRef}
                              className="absolute right-0 top-full mt-1 w-48 bg-white border border-base rounded-lg shadow-lg py-1 z-50 animate-fade-in"
                            >
                              <button 
                                className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-slate-50 hover:text-primary flex items-center gap-2"
                                onClick={() => handleOpenModal(q, true)}
                              >
                                <Copy size={14} /> Duplicate
                              </button>
                              <button 
                                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${q.active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                onClick={() => handleToggleStatus(q)}
                              >
                                {q.active ? <PowerOff size={14} /> : <Power size={14} />} 
                                {q.active ? 'Deactivate' : 'Activate'}
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
            Showing <span className="text-primary font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-primary font-semibold">{Math.min(currentPage * itemsPerPage, totalRecords)}</span> of <span className="text-primary font-semibold">{totalRecords}</span> parameters
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-base bg-slate-50">
              <h3 className="font-bold text-lg text-primary">{formData.id ? 'Edit Parameter' : 'Add New Parameter'}</h3>
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
              
              <form id="quality-form" onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-secondary mb-1.5">Material <span className="text-red-500">*</span></label>
                  <select 
                    required
                    className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    value={formData.raw_material_id}
                    onChange={e => setFormData({...formData, raw_material_id: e.target.value})}
                  >
                    <option value="" disabled>Select material...</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name_en}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-secondary mb-1.5">Parameter/Grade Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required 
                      className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" 
                      placeholder="e.g. Moisture"
                      value={formData.grade_name}
                      onChange={e => setFormData({...formData, grade_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-secondary mb-1.5">Hindi Name</label>
                    <input 
                      type="text" 
                      className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" 
                      placeholder="e.g. नमी"
                      value={formData.grade_name_hi}
                      onChange={e => setFormData({...formData, grade_name_hi: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-secondary mb-1.5">Parameter Type</label>
                    <input 
                      type="text" 
                      className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="e.g. Grade, Impurity, Protein"
                      value={formData.parameter_type}
                      onChange={e => setFormData({...formData, parameter_type: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-secondary mb-1.5">Unit of Measure</label>
                    <input 
                      type="text" 
                      className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="e.g. %, mm, gm"
                      value={formData.uom}
                      onChange={e => setFormData({...formData, uom: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-secondary mb-1.5">Min Value</label>
                    <input 
                      type="number" 
                      step="any"
                      className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      value={formData.min_value}
                      onChange={e => setFormData({...formData, min_value: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-secondary mb-1.5">Max Value</label>
                    <input 
                      type="number" 
                      step="any"
                      className="input w-full shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      value={formData.max_value}
                      onChange={e => setFormData({...formData, max_value: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-base space-y-4">
                  <label className="flex items-center justify-between cursor-pointer group p-2 hover:bg-slate-50 rounded-lg -mx-2 transition-colors">
                    <div>
                      <span className="font-semibold text-sm text-primary block">Active Status</span>
                      <span className="text-xs text-secondary">Parameter available for data entry</span>
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
                form="quality-form" 
                className="btn btn-primary min-w-[130px] shadow-sm flex items-center justify-center"
                disabled={isSaving}
              >
                {isSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Save Parameter'}
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
            <h3 className="font-bold text-xl text-primary mb-2">Deactivate Parameter?</h3>
            <p className="text-sm text-secondary mb-8 leading-relaxed">
              Are you sure you want to deactivate <span className="font-semibold text-primary">"{itemToDeactivate?.grade_name}"</span>?<br/> It will no longer be available for selection.
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
