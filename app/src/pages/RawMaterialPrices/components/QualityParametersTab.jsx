import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { Search, Plus, Filter, X, Edit2, MoreVertical, AlertTriangle, LayoutList, ChevronLeft, ChevronRight, Copy, Power, PowerOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import MasterDataSectionHeader from './MasterDataSectionHeader';

export default function QualityParametersTab({ qualityGrades, materials, loading, onRefresh, showMessage }) {
  const navigate = useNavigate();
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [materialFilter, setMaterialFilter] = useState('All');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Action Menu State
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Confirmation Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDeactivate, setItemToDeactivate] = useState(null);

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

  const handleOpenForm = (item = null, duplicate = false) => {
    if (item) {
      if (duplicate) {
        navigate('/raw-material-prices/configuration/quality-parameters/new', { state: { duplicateFrom: item } });
      } else {
        navigate(`/raw-material-prices/configuration/quality-parameters/${item.id}/edit`, { state: { qualityParameter: item } });
      }
    } else {
      navigate('/raw-material-prices/configuration/quality-parameters/new');
    }
    setActiveMenuId(null);
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
        onAdd={() => handleOpenForm()}
      />

      {/* Toolbar */}
      <div className="p-4 bg-slate-50 border-b border-base flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-80 shrink-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text"
            className="input pl-10 pr-4 py-2 w-full text-sm bg-white border-base/80 rounded-lg shadow-sm"
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
           <EmptyState icon={LayoutList} title="No Parameters Found" description="Add quality parameters or adjust your filters." actionText="Add Parameter" onAction={() => handleOpenForm()} />
        ) : (
          <div className="data-table-container">
            <table className="data-table mobile-cards-table">
              <thead>
                <tr>
                  <th style={{minWidth: '200px'}}>Material</th>
                  <th style={{minWidth: '200px'}}>Parameter/Grade</th>
                  <th style={{minWidth: '150px'}}>Type</th>
                  <th style={{minWidth: '150px'}}>Limits / UOM</th>
                  <th style={{width: '100px'}}>Status</th>
                  <th style={{width: '100px', textAlign: 'right'}}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {paginatedData.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td data-label="Material" className="font-medium text-primary">{q.raw_materials?.name_en}</td>
                    <td data-label="Parameter/Grade">
                      <div className="font-semibold text-[15px] text-primary">{q.grade_name}</div>
                      {q.grade_name_hi && <div className="text-[13px] text-secondary mt-0.5">{q.grade_name_hi}</div>}
                    </td>
                    <td data-label="Type">
                      <span className="inline-flex items-center text-[13px] font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        {q.parameter_type || 'Grade'}
                      </span>
                    </td>
                    <td data-label="Limits / UOM" className="text-[14px] text-secondary">
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
                    <td data-label="Status">
                      <StatusBadge active={q.active} />
                    </td>
                    <td data-label="Actions" style={{textAlign: 'right'}}>
                      <div className="flex items-center justify-end gap-1 relative">
                        <button 
                          className="btn-icon p-1.5 text-secondary hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors tooltip-trigger" 
                          onClick={() => handleOpenForm(q)}
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
                                onClick={() => handleOpenForm(q, true)}
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
