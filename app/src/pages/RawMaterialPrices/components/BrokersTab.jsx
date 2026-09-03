import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, X, Edit2, MoreVertical, AlertTriangle, Users, ChevronLeft, ChevronRight, Copy, Power, PowerOff, Phone, MessageCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import MasterDataSectionHeader from './MasterDataSectionHeader';
import { normalizeMobile } from '../../../utils/phoneUtils';
import { generateBrokerEnquiryMessage } from '../../../utils/whatsappUtils';
import DataTable from '../../../components/DataTable';

export default function BrokersTab({ brokers, materials, loading, onRefresh, showMessage }) {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeactivated, setShowDeactivated] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const navigate = useNavigate();

  // Action Menu State
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Confirm Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDeactivate, setItemToDeactivate] = useState(null);

  // WhatsApp Modal State
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waBrokerSelected, setWaBrokerSelected] = useState(null);
  const [waSelectedMatId, setWaSelectedMatId] = useState('');

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

    if (!showDeactivated) {
      result = result.filter(b => b.active);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => 
        (b.broker_name && b.broker_name.toLowerCase().includes(q)) ||
        (b.firm_name && b.firm_name.toLowerCase().includes(q)) ||
        (b.market_location && b.market_location.toLowerCase().includes(q))
      );
    }

    return result;
  }, [brokers, searchQuery, showDeactivated]);

  // Split data into active and deactivated
  const activeBrokers = useMemo(() => filteredData.filter(b => b.active), [filteredData]);
  const deactivatedBrokers = useMemo(() => filteredData.filter(b => !b.active), [filteredData]);

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

  const paginatedActiveBrokers = paginatedData.filter(b => b.active);
  const paginatedDeactivatedBrokers = paginatedData.filter(b => !b.active);

  const hasActiveFilters = searchQuery !== '' || showDeactivated;

  const resetFilters = () => {
    setSearchQuery('');
    setShowDeactivated(false);
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

  const sendWhatsApp = (broker, material) => {
    const msg = generateBrokerEnquiryMessage(broker.broker_name, material?.name_en, material?.name_hi);
    const phone = normalizeMobile(broker.whatsapp_number || broker.mobile);
    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsAppClick = (e, broker) => {
    e.preventDefault();
    if (broker.broker_materials && broker.broker_materials.length === 1) {
      const mat = materials.find(m => m.id === broker.broker_materials[0].raw_material_id);
      sendWhatsApp(broker, mat);
    } else {
      setWaBrokerSelected(broker);
      setIsWaModalOpen(true);
    }
  };

  const brokerColumns = [
    {
      id: 'broker',
      header: 'Broker / Firm',
      renderCell: (b) => (
        <>
          <div className="font-semibold text-[15px] text-primary">{b.broker_name}</div>
          {b.firm_name && <div className="text-[13px] text-secondary mt-0.5">{b.firm_name}</div>}
        </>
      )
    },
    {
      id: 'contact',
      header: 'Contact',
      renderCell: (b) => (
        <>
          <div className="font-medium text-[14px] text-secondary">
            {b.mobile || '-'}
          </div>
          {b.whatsapp_number && b.whatsapp_number !== b.mobile && (
            <div className="text-[12px] text-emerald-600 mt-0.5 font-medium">WA: {b.whatsapp_number}</div>
          )}
        </>
      )
    },
    {
      id: 'location',
      header: 'Location',
      renderCell: (b) => (
        <span className="text-[14px] text-secondary">
          {b.market_location || '-'}
          {b.state && b.market_location && `, `}
          {b.state}
        </span>
      )
    },
    {
      id: 'materials',
      header: 'Materials Handled',
      renderCell: (b) => (
        <div className="flex flex-wrap gap-1.5">
          {b.broker_materials && b.broker_materials.length > 0 ? (
            b.broker_materials.slice(0, 3).map(bm => {
              const mat = materials.find(m => m.id === bm.raw_material_id);
              return mat ? (
                <span key={bm.raw_material_id} className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-[11px] rounded-md font-medium truncate max-w-[120px]" title={mat.name_en}>
                  {mat.name_en}
                </span>
              ) : null;
            })
          ) : (
            <span className="text-muted text-sm">-</span>
          )}
          {b.broker_materials && b.broker_materials.length > 3 && (
            <span className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-500 text-[11px] rounded-md font-medium">
              +{b.broker_materials.length - 3} more
            </span>
          )}
        </div>
      )
    },
    {
      id: 'status',
      header: 'Status',
      renderCell: (b) => <StatusBadge active={b.active} />
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      width: 'w-40', // slightly wider to accommodate nowrapped content securely
      renderCell: (b) => (
        <div className="flex items-center justify-end gap-1 relative flex-nowrap whitespace-nowrap">
          {b.mobile && (
            <>
              <a 
                href={`tel:${normalizeMobile(b.mobile)}`} 
                className="btn-icon p-1.5 text-secondary hover:text-blue-600 hover:bg-blue-50 rounded transition-colors hidden sm:flex"
                title="Call Broker"
              >
                <Phone size={16} />
              </a>
              <button 
                onClick={(e) => handleWhatsAppClick(e, b)}
                className="btn-icon p-1.5 text-secondary hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors hidden sm:flex"
                title="WhatsApp Broker"
              >
                <MessageCircle size={16} />
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1 hidden sm:block"></div>
            </>
          )}

          <button 
            className="btn-icon p-1.5 text-secondary hover:text-primary hover:bg-slate-100 rounded transition-colors tooltip-trigger" 
            onClick={() => handleEditBroker(b)}
            title="Edit Broker"
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
              title="More Options"
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
      )
    }
  ];

  return (
    <div className="card bg-white border border-base rounded-xl shadow-sm overflow-hidden flex flex-col mb-8">
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
          <button 
            onClick={() => {
              setShowDeactivated(!showDeactivated);
              setCurrentPage(1);
            }}
            className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors border ${showDeactivated ? 'bg-slate-100 text-slate-700 border-slate-300 shadow-inner' : 'bg-white text-secondary hover:bg-slate-50 border-base/80 shadow-sm'}`}
          >
            {showDeactivated ? 'Hide Deactivated' : 'Show Deactivated'}
          </button>
          
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1.5 rounded-md transition-colors">
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-slate-50/30 min-h-[400px] flex flex-col p-4 sm:p-6 space-y-8">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white rounded-lg animate-pulse border border-base shadow-sm"></div>)}
          </div>
        ) : filteredData.length === 0 ? (
           <EmptyState icon={Users} title="No Brokers" description={hasActiveFilters ? "Try adjusting your filters." : "Add brokers to start tracking prices from them."} actionText="Add Broker" onAction={handleAddBroker} />
        ) : (
          <>
            {/* Dynamically Rendered Sections */}
            {[
              {
                title: 'Active Brokers',
                data: paginatedActiveBrokers,
                totalCount: activeBrokers.length,
                titleClasses: 'text-primary',
                badgeClasses: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
                tableHeadClasses: 'bg-slate-50',
                wrapperOpacity: '',
                tbodyClass: 'divide-y divide-base'
              },
              {
                title: 'Deactivated Brokers',
                data: paginatedDeactivatedBrokers,
                totalCount: deactivatedBrokers.length,
                titleClasses: 'text-slate-500',
                badgeClasses: 'bg-slate-200 border border-slate-300 text-slate-700',
                tableHeadClasses: 'hidden sm:table-header-group bg-slate-100',
                wrapperOpacity: 'opacity-90',
                tbodyClass: 'divide-y divide-base bg-slate-50/50'
              }
            ].map(section => (
              section.data.length > 0 && (
                <div key={section.title} className={`flex flex-col mb-6 last:mb-0 ${section.wrapperOpacity}`}>
                  <div className={`px-1 py-3 flex items-center justify-between`}>
                    <h3 className={`text-base font-bold flex items-center gap-2 ${section.titleClasses}`}>
                      {section.title}
                    </h3>
                    <span className={`text-xs font-bold tracking-wide px-2.5 py-1 rounded-full ${section.badgeClasses}`}>
                      {section.totalCount} Total
                    </span>
                  </div>
                  <DataTable 
                    columns={brokerColumns} 
                    data={section.data} 
                    theadClassName={section.tableHeadClasses}
                    tbodyClassName={section.tbodyClass}
                    rowClassName={(row) => !row.active ? 'opacity-70' : ''}
                  />
                </div>
              )
            ))}
          </>
        )}
      </div>

      {/* Pagination Footer */}
      {filteredData.length > 0 && (
        <div className="p-4 border-t border-base bg-white flex flex-col sm:flex-row justify-between items-center gap-4 mt-auto">
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

      {/* WhatsApp Material Selection Modal */}
      {isWaModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in p-6 text-center">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <MessageCircle size={28} />
            </div>
            <h3 className="font-bold text-xl text-primary mb-2">Select Material</h3>
            <p className="text-sm text-secondary mb-6 leading-relaxed">
              For which material do you want to enquire today's rate from <span className="font-semibold text-primary">"{waBrokerSelected?.broker_name}"</span>?
            </p>
            
            <div className="mb-6 text-left">
               <label className="block text-sm font-medium text-secondary mb-1">Material</label>
               <select 
                 className="input w-full"
                 value={waSelectedMatId}
                 onChange={(e) => setWaSelectedMatId(e.target.value)}
               >
                 <option value="">-- Select Material --</option>
                 {(waBrokerSelected?.broker_materials && waBrokerSelected.broker_materials.length > 0
                   ? waBrokerSelected.broker_materials
                   : materials.map(m => ({ raw_material_id: m.id }))
                 ).map(bm => {
                   const mat = materials.find(m => m.id === bm.raw_material_id);
                   return mat ? <option key={mat.id} value={mat.id}>{mat.name_en} {mat.name_hi ? `(${mat.name_hi})` : ''}</option> : null;
                 })}
               </select>
            </div>

            <div className="flex gap-3 w-full">
              <button className="btn btn-outline flex-1 shadow-sm" onClick={() => { setIsWaModalOpen(false); setWaBrokerSelected(null); }}>Cancel</button>
              <button 
                className="btn bg-emerald-600 hover:bg-emerald-700 text-white flex-1 shadow-sm" 
                disabled={!waSelectedMatId}
                onClick={() => {
                  const mat = materials.find(m => m.id === waSelectedMatId);
                  sendWhatsApp(waBrokerSelected, mat);
                  setIsWaModalOpen(false);
                  setWaBrokerSelected(null);
                  setWaSelectedMatId('');
                }}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
