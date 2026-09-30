import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { Edit2, MoreVertical, AlertTriangle, Ruler, Copy, Power, PowerOff, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import MasterDataSectionHeader from './MasterDataSectionHeader';

export default function UnitsTab({ units, loading, onRefresh, showMessage }) {
  const navigate = useNavigate();
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

  const handleOpenForm = (item = null, duplicate = false) => {
    if (item) {
      if (duplicate) {
        navigate('/raw-material-prices/configuration/units/new', { state: { duplicateFrom: item } });
      } else {
        navigate(`/raw-material-prices/configuration/units/${item.id}/edit`, { state: { unit: item } });
      }
    } else {
      navigate('/raw-material-prices/configuration/units/new', { state: { nextOrder: (units?.length || 0) + 1 } });
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
      const { error } = await supabase.from('rm_units').update({ active: newStatus }).eq('id', id);
      if (error) throw error;
      showMessage('success', `Unit ${newStatus ? 'activated' : 'deactivated'} successfully.`);
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
        title="Units Master" 
        description="Manage units of measurement (e.g., Kg, Quintal, Ton)." 
        buttonText="Add Unit" 
        onAdd={() => handleOpenForm()}
      />

      <div className="flex-1 bg-white min-h-[400px]">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse border border-base/50"></div>)}
          </div>
        ) : (!units || units.length === 0) ? (
           <EmptyState icon={Ruler} title="No Units" description="Define standard units for your raw materials." actionText="Add Unit" onAction={() => handleOpenForm()} />
        ) : (
          <div className="data-table-container">
            <table className="data-table mobile-cards-table">
              <thead>
                <tr>
                  <th style={{minWidth: '200px'}}>Unit Name</th>
                  <th style={{minWidth: '150px'}}>Symbol</th>
                  <th style={{minWidth: '200px'}}>Description</th>
                  <th style={{width: '100px'}}>Status</th>
                  <th style={{width: '100px', textAlign: 'right'}}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {units.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td data-label="Unit Name" className="font-semibold text-[15px] text-primary">{u.unit_name}</td>
                    <td data-label="Symbol" className="font-medium text-secondary">{u.symbol}</td>
                    <td data-label="Description" className="text-[14px] text-secondary">{u.description || '-'}</td>
                    <td data-label="Status">
                      <StatusBadge active={u.active} />
                    </td>
                    <td data-label="Actions" style={{textAlign: 'right'}}>
                      <div className="flex items-center justify-end gap-1 relative">
                        <button 
                          className="btn-icon p-1.5 text-secondary hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors tooltip-trigger" 
                          onClick={() => handleOpenForm(u)}
                        >
                          <Edit2 size={16}/>
                        </button>
                        
                        <div className="relative">
                          <button 
                            className={`btn-icon p-1.5 rounded transition-colors ${activeMenuId === u.id ? 'bg-slate-200 text-primary' : 'text-secondary hover:bg-slate-100 hover:text-primary'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === u.id ? null : u.id);
                            }}
                          >
                            <MoreVertical size={16}/>
                          </button>
                          
                          {activeMenuId === u.id && (
                            <div 
                              ref={menuRef}
                              className="absolute right-0 top-full mt-1 w-48 bg-white border border-base rounded-lg shadow-lg py-1 z-50 animate-fade-in"
                            >
                              <button 
                                className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-slate-50 hover:text-primary flex items-center gap-2"
                                onClick={() => handleOpenForm(u, true)}
                              >
                                <Copy size={14} /> Duplicate
                              </button>
                              <button 
                                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${u.active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                onClick={() => handleToggleStatus(u)}
                              >
                                {u.active ? <PowerOff size={14} /> : <Power size={14} />} 
                                {u.active ? 'Deactivate' : 'Activate'}
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

      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in p-6 text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertTriangle size={28} />
            </div>
            <h3 className="font-bold text-xl text-primary mb-2">Deactivate Unit?</h3>
            <p className="text-sm text-secondary mb-8 leading-relaxed">
              Are you sure you want to deactivate <span className="font-semibold text-primary">"{itemToDeactivate?.unit_name}"</span>?<br/> It will be hidden from dropdowns.
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
