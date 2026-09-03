import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, X, Edit2, MoreVertical, AlertTriangle, Users, ChevronLeft, ChevronRight, Copy, Power, PowerOff, Phone, MessageCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import MasterDataSectionHeader from './MasterDataSectionHeader';
import { normalizeMobile } from '../../../utils/phoneUtils';

export default function BrokersTab({ brokers, materials, loading, onRefresh, showMessage }) {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const navigate = useNavigate();

  // Action Menu State
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Confirm Modal State
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

  // Split data into active and deactivated
  const activeBrokers = useMemo(() => filteredData.filter(b => b.active), [filteredData]);
  const deactivatedBrokers = useMemo(() => filteredData.filter(b => !b.active), [filteredData]);

  // Pagination logic (applied to active brokers primarily, or a combined view? Let's just paginate the combined filteredData but render active first, then deactivated).
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

  const paginatedActiveBrokers = paginatedData.filter(b => b.active);
  const paginatedDeactivatedBrokers = paginatedData.filter(b => !b.active);

  const hasActiveFilters = searchQuery !== '';

  const resetFilters = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleAddBroker = () => {
    navigate('/raw-material-prices/configuration/brokers/new');
  };

  const handleEditBroker = (item, duplicate = false) => {
    if (duplicate) {
      navigate('/raw-material-prices/configuration/brokers/new', { state: { duplicateFrom: item } });
    } else {
      navigate(`/raw-material-prices/configuration/brokers/${item.id}/edit`, { state: { broker: item } });
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

  const renderBrokerRow = (b) => (
    <tr key={b.id} className={`hover:bg-slate-50/80 transition-colors group ${!b.active ? 'opacity-70' : ''}`}>
      <td data-label="Broker / Firm">
        <div className="font-semibold text-[15px] text-primary">{b.broker_name}</div>
        {b.firm_name && <div className="text-[13px] text-secondary mt-0.5">{b.firm_name}</div>}
      </td>
      <td data-label="Contact">
        <div className="font-medium text-[14px] text-secondary flex items-center gap-2">
          {b.mobile || '-'}
          {b.mobile && (
            <div className="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
               <a 
                 href={`tel:${normalizeMobile(b.mobile)}`} 
                 className="p-1 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 transition-colors"
                 title="Call Broker"
               >
                 <Phone size={14} />
               </a>
               <a 
                 href={`https://wa.me/91${normalizeMobile(b.whatsapp_number || b.mobile)}`}
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="p-1 rounded-full bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 transition-colors"
                 title="WhatsApp Broker"
               >
                 <MessageCircle size={14} />
               </a>
            </div>
          )}
        </div>
        {b.whatsapp_number && b.whatsapp_number !== b.mobile && (
          <div className="text-[12px] text-emerald-600 mt-0.5 font-medium">WA: {b.whatsapp_number}</div>
        )}
      </td>
      <td data-label="Location" className="text-[14px] text-secondary">
        {b.market_location || '-'}
        {b.state && b.market_location && `, `}
        {b.state}
      </td>
      <td data-label="Materials Handled">
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
      <td data-label="Status">
        <StatusBadge active={b.active} />
      </td>
      <td data-label="Actions" style={{textAlign: 'right'}}>
        <div className="flex items-center justify-end gap-1 relative">
          <button 
            className="btn-icon p-1.5 text-secondary hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors tooltip-trigger" 
            onClick={() => handleEditBroker(b)}
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
                  onClick={() => handleEditBroker(b, true)}
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
  );

  return (
    <div className="card bg-white border border-base rounded-xl shadow-sm overflow-hidden flex flex-col">
      <MasterDataSectionHeader 
        title="Broker Master" 
        description="Manage brokers, their contact information, and materials they handle." 
        buttonText="Add Broker" 
        onAdd={handleAddBroker}
      />

      {/* Toolbar */}
      <div className="p-4 bg-slate-50 border-b border-base flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-80 shrink-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text"
            className="input pl-10 pr-4 py-2 w-full text-sm bg-white border-base/80 rounded-lg shadow-sm"
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

      <div className="flex-1 bg-white min-h-[400px] flex flex-col">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse border border-base/50"></div>)}
          </div>
        ) : filteredData.length === 0 ? (
           <EmptyState icon={Users} title="No Brokers" description={hasActiveFilters ? "Try adjusting your filters." : "Add brokers to start tracking prices from them."} actionText="Add Broker" onAction={handleAddBroker} />
        ) : (
          <div className="flex flex-col">
            {/* Active Brokers Section */}
            {paginatedActiveBrokers.length > 0 && (
              <div className="data-table-container border-0 rounded-none border-b border-base">
                <div className="px-5 py-3 bg-white border-b border-base flex items-center justify-between">
                  <h3 className="font-semibold text-primary">Active Brokers</h3>
                  <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{activeBrokers.length} Total</span>
                </div>
                <table className="data-table mobile-cards-table w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th style={{minWidth: '200px'}}>Broker / Firm</th>
                      <th style={{minWidth: '150px'}}>Contact</th>
                      <th style={{minWidth: '150px'}}>Location</th>
                      <th style={{minWidth: '250px'}}>Materials Handled</th>
                      <th style={{width: '100px'}}>Status</th>
                      <th style={{width: '100px', textAlign: 'right'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base">
                    {paginatedActiveBrokers.map(renderBrokerRow)}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Deactivated Brokers Section */}
            {paginatedDeactivatedBrokers.length > 0 && (
              <div className="data-table-container border-0 rounded-none">
                <div className="px-5 py-3 bg-slate-50 border-b border-base flex items-center justify-between">
                  <h3 className="font-semibold text-slate-500">Deactivated Brokers</h3>
                  <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{deactivatedBrokers.length} Total</span>
                </div>
                <table className="data-table mobile-cards-table w-full">
                  <thead className="hidden sm:table-header-group bg-white">
                    <tr>
                      <th style={{minWidth: '200px'}}>Broker / Firm</th>
                      <th style={{minWidth: '150px'}}>Contact</th>
                      <th style={{minWidth: '150px'}}>Location</th>
                      <th style={{minWidth: '250px'}}>Materials Handled</th>
                      <th style={{width: '100px'}}>Status</th>
                      <th style={{width: '100px', textAlign: 'right'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base bg-slate-50/30">
                    {paginatedDeactivatedBrokers.map(renderBrokerRow)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {filteredData.length > 0 && (
        <div className="p-4 border-t border-base bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4 mt-auto">
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



      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in p-6 text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertTriangle size={28} />
            </div>
            <h3 className="font-bold text-xl text-primary mb-2">Deactivate Broker?</h3>
            <p className="text-sm text-secondary mb-8 leading-relaxed">
              Are you sure you want to deactivate <span className="font-semibold text-primary">"{itemToDeactivate?.broker_name}"</span>?<br/> They will be moved to the deactivated list.
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
