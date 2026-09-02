import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { Search, Plus, Filter, X, Edit2, MoreVertical, AlertTriangle, PackageOpen, ChevronLeft, ChevronRight, Copy, Power, PowerOff, ArrowUp, ArrowDown } from 'lucide-react';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';

const CATEGORIES = ['Grain', 'Bran', 'Oil Cake', 'Protein Source', 'Mineral', 'Additive', 'Other'];

export default function RawMaterialsTab({ materials, units, loading, onRefresh, showMessage }) {
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [materialToDeactivate, setMaterialToDeactivate] = useState(null);
  
  // Form State
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    id: null,
    code: '',
    name_en: '',
    name_hi: '',
    category: '',
    default_unit_id: '',
    daily_tracking_required: true,
    active: true,
    display_order: 99
  });

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

  const handleOpenModal = (material = null, duplicate = false) => {
    setFormError('');
    if (material) {
      setFormData({
        id: duplicate ? null : material.id,
        code: duplicate ? '' : material.code || '',
        name_en: material.name_en || '',
        name_hi: material.name_hi || '',
        category: material.category || '',
        default_unit_id: material.default_unit_id || '',
        daily_tracking_required: material.daily_tracking_required,
        active: material.active,
        display_order: material.display_order || 99
      });
    } else {
      setFormData({
        id: null,
        code: '',
        name_en: '',
        name_hi: '',
        category: '',
        default_unit_id: '',
        daily_tracking_required: true,
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
        .neq('id', formData.id || '00000000-0000-0000-0000-000000000000')
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

      if (formData.id) {
        const { error } = await supabase.from('raw_materials').update(payload).eq('id', formData.id);
        if (error) throw error;
        showMessage('success', 'Material updated successfully.');
      } else {
        const { error } = await supabase.from('raw_materials').insert(payload);
        if (error) throw error;
        showMessage('success', 'New material added successfully.');
      }
      
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
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
            onClick={() => handleOpenModal()}
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
            className="input pl-10 pr-4 py-2 w-full text-sm bg-white border-base/80 focus:border-emerald-500 rounded-lg shadow-sm"
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
              <button className="btn btn-primary shadow-sm flex items-center" onClick={() => handleOpenModal()}>
                <Plus size={16} className="mr-1" /> Add Material
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table (Hidden on Mobile) */}
            <table className="w-full text-left hidden md:table border-collapse">
              <thead className="bg-slate-50 border-b border-base sticky top-0 z-10">
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
                    <td className="px-6 py-4">
                      <span className="font-mono text-[13px] font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">{m.code || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[15px] text-primary">{m.name_en}</div>
                      <div className="text-[13px] text-secondary mt-0.5">{m.name_hi || <span className="opacity-0">-</span>}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center text-[13px] font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        {m.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[14px] font-medium text-secondary">
                      {m.default_unit?.unit_name || m.default_unit_id || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {m.daily_tracking_required 
                        ? <span className="inline-flex items-center justify-center px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-bold uppercase tracking-wide">Tracked</span>
                        : <span className="inline-flex items-center justify-center px-2 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded text-[11px] font-bold uppercase tracking-wide">No</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge active={m.active} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 relative">
                        <button 
                          className="btn-icon p-1.5 text-secondary hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors tooltip-trigger" 
                          onClick={() => handleOpenModal(m)}
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
                                onClick={() => handleOpenModal(m, true)}
                              >
                                <Copy size={14} /> Duplicate
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

            {/* Mobile Cards (Visible only on small screens) */}
            <div className="md:hidden flex flex-col divide-y divide-base bg-slate-50/30">
              {paginatedData.map(m => (
                <div key={m.id} className="p-5 bg-white relative">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-mono text-[12px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{m.code}</span>
                      <StatusBadge active={m.active} />
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 text-secondary hover:bg-slate-100 rounded text-emerald-600" onClick={() => handleOpenModal(m)}><Edit2 size={16}/></button>
                      <div className="relative">
                        <button className="p-1.5 text-secondary hover:bg-slate-100 rounded" onClick={() => setActiveMenuId(activeMenuId === m.id ? null : m.id)}>
                          <MoreVertical size={16}/>
                        </button>
                        {activeMenuId === m.id && (
                          <div ref={menuRef} className="absolute right-0 top-full mt-1 w-44 bg-white border border-base rounded-lg shadow-lg py-1 z-50">
                            <button className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-slate-50 flex items-center gap-2" onClick={() => handleOpenModal(m, true)}><Copy size={14}/> Duplicate</button>
                            <button className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${m.active ? 'text-red-600' : 'text-emerald-600'}`} onClick={() => handleToggleStatus(m)}>
                              {m.active ? <PowerOff size={14}/> : <Power size={14}/>} {m.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="font-bold text-primary text-[17px]">{m.name_en}</div>
                    {m.name_hi && <div className="text-sm text-secondary mt-0.5">{m.name_hi}</div>}
                  </div>
                  
                  <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-0.5">Category</span>
                      <span className="font-medium text-secondary">{m.category}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-0.5">Unit</span>
                      <span className="font-medium text-secondary">{m.default_unit?.unit_name || m.default_unit_id}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-0.5">Daily Track</span>
                      {m.daily_tracking_required 
                        ? <span className="font-semibold text-blue-600">Yes</span>
                        : <span className="font-medium text-secondary">No</span>
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                className="input py-1 px-2 h-8 text-xs bg-white border-base rounded shadow-sm focus:border-emerald-500" 
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-base bg-slate-50">
              <h3 className="font-bold text-lg text-primary">{formData.id ? 'Edit Material' : 'Add New Material'}</h3>
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
              
              <form id="material-form" onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-secondary mb-1.5">Material Code <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    className="input w-full uppercase font-mono shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" 
                    placeholder="e.g. RM-001"
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  />
                  <p className="text-xs text-muted mt-1">Must be unique.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="pt-4 border-t border-base space-y-4">
                  <label className="flex items-center justify-between cursor-pointer group p-2 hover:bg-slate-50 rounded-lg -mx-2 transition-colors">
                    <div>
                      <span className="font-semibold text-sm text-primary block">Daily Price Tracking</span>
                      <span className="text-xs text-secondary">Require daily market price logging</span>
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

                  <label className="flex items-center justify-between cursor-pointer group p-2 hover:bg-slate-50 rounded-lg -mx-2 transition-colors">
                    <div>
                      <span className="font-semibold text-sm text-primary block">Active Status</span>
                      <span className="text-xs text-secondary">Material available for selection</span>
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
                form="material-form" 
                className="btn btn-primary min-w-[130px] shadow-sm flex items-center justify-center"
                disabled={isSaving}
              >
                {isSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Save Material'}
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
