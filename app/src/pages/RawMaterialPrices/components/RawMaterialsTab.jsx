import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, X, Edit2, MoreVertical, AlertTriangle, PackageOpen, ChevronLeft, ChevronRight, Copy, Power, PowerOff, ArrowUp, ArrowDown, History } from 'lucide-react';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';

const CATEGORIES = ['Grain', 'Bran', 'Oil Cake', 'Protein Source', 'Mineral', 'Additive', 'Other'];

export default function RawMaterialsTab({ materials, units, loading, onRefresh, showMessage }) {
  const navigate = useNavigate();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [trackFilter, setTrackFilter] = useState('All');
  
  // Sort
  const [sortConfig, setSortConfig] = useState({ key: 'code', direction: 'asc' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Action Menu State
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Confirm Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [materialToDeactivate, setMaterialToDeactivate] = useState(null);

  // Handle outside click for menus
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
    let result = materials || [];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => 
        (m.code && m.code.toLowerCase().includes(q)) ||
        (m.name_en && m.name_en.toLowerCase().includes(q)) ||
        (m.name_hi && m.name_hi.toLowerCase().includes(q))
      );
    }

    // Filters
    if (categoryFilter !== 'All') {
      result = result.filter(m => m.category === categoryFilter);
    }
    if (statusFilter !== 'All') {
      const isActive = statusFilter === 'Active';
      result = result.filter(m => m.active === isActive);
    }
    if (trackFilter !== 'All') {
      const isTracked = trackFilter === 'Tracked';
      result = result.filter(m => m.daily_tracking_required === isTracked);
    }

    // Sort
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        // Handle nested unit sorting
        if (sortConfig.key === 'unit') {
          valA = a.default_unit?.unit_name || a.default_unit_id || '';
          valB = b.default_unit?.unit_name || b.default_unit_id || '';
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [materials, searchQuery, categoryFilter, statusFilter, trackFilter, sortConfig]);

  // Pagination logic
  const totalRecords = filteredData.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  
  // Ensure current page is valid after filtering
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

  const hasActiveFilters = searchQuery !== '' || categoryFilter !== 'All' || statusFilter !== 'All' || trackFilter !== 'All';

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setStatusFilter('All');
    setTrackFilter('All');
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={12} className="ml-1 text-emerald-600 inline" />
      : <ArrowDown size={12} className="ml-1 text-emerald-600 inline" />;
  };

  const handleAddMaterial = () => {
    navigate('/raw-material-prices/configuration/raw-materials/new');
  };

  const handleEditMaterial = (item, duplicate = false) => {
    if (duplicate) {
      navigate('/raw-material-prices/configuration/raw-materials/new', { state: { duplicateFrom: item } });
    } else {
      navigate(`/raw-material-prices/configuration/raw-materials/${item.id}/edit`, { state: { material: item } });
    }
    setActiveMenuId(null);
  };

  const handleToggleStatus = (material) => {
    if (material.active) {
      setMaterialToDeactivate(material);
      setIsConfirmOpen(true);
    } else {
      // Instantly activate
      performStatusUpdate(material.id, true);
    }
    setActiveMenuId(null);
  };

  const performStatusUpdate = async (id, newStatus) => {
    try {
      const { error } = await supabase.from('raw_materials').update({ active: newStatus }).eq('id', id);
      if (error) throw error;
      showMessage('success', `Material ${newStatus ? 'activated' : 'deactivated'} successfully.`);
      onRefresh();
    } catch (err) {
      showMessage('error', 'Failed to update status.');
    } finally {
      setIsConfirmOpen(false);
      setMaterialToDeactivate(null);
    }
  };

  return (
    <div className="card bg-white border border-base rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-base bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary">Raw Material Master</h2>
          <p className="text-sm text-secondary mt-1">Manage all cattle-feed raw materials and their default properties.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-sm font-medium text-secondary tabular-nums">
            {materials?.length || 0} materials
          </div>
          <button 
            className="btn btn-primary shadow-sm py-2 px-4 whitespace-nowrap w-full sm:w-auto flex items-center justify-center"
            onClick={handleAddMaterial}
          >
            <Plus size={16} className="mr-1.5" />
            Add Material
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 bg-slate-50 border-b border-base flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="relative w-full xl:w-80 shrink-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text"
            className="input pl-10 pr-4 py-2 w-full text-sm bg-white border-base/80 rounded-lg shadow-sm"
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted" />
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider hidden sm:inline">Category:</span>
            <select className="input py-1.5 px-3 text-sm bg-white border-base/80 rounded-md shadow-sm h-8" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="All">All</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider hidden sm:inline">Status:</span>
            <select className="input py-1.5 px-3 text-sm bg-white border-base/80 rounded-md shadow-sm h-8" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider hidden sm:inline">Track:</span>
            <select className="input py-1.5 px-3 text-sm bg-white border-base/80 rounded-md shadow-sm h-8" value={trackFilter} onChange={e => setTrackFilter(e.target.value)}>
              <option value="All">All</option>
              <option value="Tracked">Tracked</option>
              <option value="Not Tracked">Not Tracked</option>
            </select>
          </div>
          
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1.5 rounded-md transition-colors ml-auto xl:ml-0">
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white min-h-[400px]">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse border border-base/50"></div>
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 border border-base flex items-center justify-center text-muted mb-4">
              <PackageOpen size={32} />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-1">
              {hasActiveFilters ? "No matching materials" : "No Raw Materials"}
            </h3>
            <p className="text-sm text-secondary mb-5 max-w-sm">
              {hasActiveFilters 
                ? "Try adjusting your search or filter settings to find what you're looking for." 
                : "Get started by adding your first raw material to the master list."}
            </p>
            {hasActiveFilters ? (
              <button className="btn btn-outline shadow-sm" onClick={resetFilters}>Clear Filters</button>
            ) : (
              <button className="btn btn-primary shadow-sm flex items-center" onClick={handleAddMaterial}>
                <Plus size={16} className="mr-1" /> Add Material
              </button>
            )}
          </div>
        ) : (
            <div className="data-table-container">
            <table className="data-table mobile-cards-table w-full">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors w-28 group" onClick={() => handleSort('code')}>
                    Code <SortIcon columnKey="code" />
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('name_en')}>
                    Material Name <SortIcon columnKey="name_en" />
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('category')}>
                    Category <SortIcon columnKey="category" />
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('unit')}>
                    Default Unit <SortIcon columnKey="unit" />
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">
                    Daily Track
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('active')}>
                    Status <SortIcon columnKey="active" />
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {paginatedData.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td data-label="Code">
                      <span className="font-mono text-[13px] font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">{m.code || 'N/A'}</span>
                    </td>
                    <td data-label="Material Name">
                      <div className="font-semibold text-[15px] text-primary">{m.name_en}</div>
                      <div className="text-[13px] text-secondary mt-0.5">{m.name_hi || <span className="opacity-0">-</span>}</div>
                    </td>
                    <td data-label="Category">
                      <span className="inline-flex items-center text-[13px] font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        {m.category}
                      </span>
                    </td>
                    <td data-label="Default Unit" className="text-[14px] font-medium text-secondary">
                      {m.default_unit?.unit_name || m.default_unit_id || '-'}
                    </td>
                    <td data-label="Daily Track">
                      {m.daily_tracking_required 
                        ? <span className="inline-flex items-center justify-center px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-bold uppercase tracking-wide">Tracked</span>
                        : <span className="inline-flex items-center justify-center px-2 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded text-[11px] font-bold uppercase tracking-wide">No</span>
                      }
                    </td>
                    <td data-label="Status">
                      <StatusBadge active={m.active} />
                    </td>
                    <td data-label="Actions" style={{textAlign: 'right'}}>
                      <div className="flex items-center justify-end gap-1 relative">
                        <button 
                          className="btn-icon p-1.5 text-secondary hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors tooltip-trigger" 
                          onClick={() => handleEditMaterial(m)}
                          title="Edit material"
                        >
                          <Edit2 size={16}/>
                        </button>
                        
                        <div className="relative">
                          <button 
                            className={`btn-icon p-1.5 rounded transition-colors ${activeMenuId === m.id ? 'bg-slate-200 text-primary' : 'text-secondary hover:bg-slate-100 hover:text-primary'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === m.id ? null : m.id);
                            }}
                          >
                            <MoreVertical size={16}/>
                          </button>
                          
                          {activeMenuId === m.id && (
                            <div 
                              ref={menuRef}
                              className="absolute right-0 top-full mt-1 w-48 bg-white border border-base rounded-lg shadow-lg py-1 z-50 animate-fade-in"
                            >
                              <button 
                                className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-slate-50 hover:text-primary flex items-center gap-2"
                                onClick={() => handleEditMaterial(m, true)}
                              >
                                <Copy size={14} /> Duplicate
                              </button>
                              <button 
                                className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-slate-50 hover:text-primary flex items-center gap-2"
                                onClick={() => navigate(`/raw-material-prices/history?material=${m.id}`)}
                              >
                                <History size={14} /> Price History
                              </button>
                              <button 
                                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${m.active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                onClick={() => handleToggleStatus(m)}
                              >
                                {m.active ? <PowerOff size={14} /> : <Power size={14} />} 
                                {m.active ? 'Deactivate' : 'Activate'}
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
          <div className="text-sm text-secondary font-medium text-center sm:text-left w-full sm:w-auto">
            Showing <span className="text-primary font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-primary font-semibold">{Math.min(currentPage * itemsPerPage, totalRecords)}</span> of <span className="text-primary font-semibold">{totalRecords}</span> materials
          </div>
          
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary font-medium">Rows:</span>
              <select 
                className="input py-1 px-2 h-8 text-xs bg-white border-base rounded shadow-sm" 
                value={itemsPerPage} 
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={50}>50</option>
              </select>
            </div>
            
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
            <h3 className="font-bold text-xl text-primary mb-2">Deactivate Material?</h3>
            <p className="text-sm text-secondary mb-8 leading-relaxed">
              Are you sure you want to deactivate <span className="font-semibold text-primary">"{materialToDeactivate?.name_en}"</span>?<br/> It will no longer be available for daily price entry.
            </p>
            <div className="flex gap-3 w-full">
              <button className="btn btn-outline flex-1 shadow-sm" onClick={() => { setIsConfirmOpen(false); setMaterialToDeactivate(null); }}>Cancel</button>
              <button className="btn bg-red-600 hover:bg-red-700 text-white flex-1 shadow-sm" onClick={() => performStatusUpdate(materialToDeactivate.id, false)}>Yes, Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
