import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DataTable from '../components/DataTable';
import { Truck, Search, AlertCircle, Phone, MapPin, Edit2, ShieldAlert, X, Plus, Trash2, ShieldOff, CheckCircle2, UserPlus } from 'lucide-react';

export default function Logistics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState('Active'); // 'Active' or 'Fraud'
  
  // Data State
  const [activeTransporters, setActiveTransporters] = useState([]);
  const [fraudTransporters, setFraudTransporters] = useState([]);
  
  // Search State
  const [searchName, setSearchName] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  // Add / Edit Modal State
  const [modalMode, setModalMode] = useState(null); // 'ADD' or 'EDIT'
  const [selectedTransporter, setSelectedTransporter] = useState(null);
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [tempLocations, setTempLocations] = useState([]); // Array of strings currently visible
  const [addedLocations, setAddedLocations] = useState([]);
  const [removedLocations, setRemovedLocations] = useState([]);

  useEffect(() => {
    fetchTransporters();
  }, []);

  const fetchTransporters = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch metadata first
      const { data: metaData, error: metaErr } = await supabase
        .from('transporter_metadata')
        .select('*');
        
      if (metaErr && metaErr.code !== '42P01') { 
        console.error("Metadata fetch error:", metaErr);
      }
      
      const metaMap = {};
      if (metaData) {
        metaData.forEach(m => {
          metaMap[m.transporter_name] = m;
        });
      }

      // 2. Fetch dispatch data
      const { data, error: fetchErr } = await supabase
        .from('requirement_dispatches')
        .select(`
          transporter_name,
          driver_mobile,
          truck_number,
          requirements (
            crm_parties (
              city
            )
          )
        `)
        .not('status', 'in', '("Cancelled","Voided","Deleted","Reversed")')
        .neq('transporter_name', null)
        .neq('transporter_name', '');
        
      if (fetchErr) throw fetchErr;
      
      const map = {};
      
      (data || []).forEach(d => {
        const name = d.transporter_name?.trim();
        if (!name) return;
        
        if (!map[name]) {
          map[name] = {
            id: name,
            name: name,
            dynamicCities: new Set(),
            mobiles: new Set(),
            trucks: new Set(),
            dispatchCount: 0
          };
        }
        
        if (d.requirements?.crm_parties?.city) {
          map[name].dynamicCities.add(d.requirements.crm_parties.city);
        }
        
        if (d.driver_mobile) {
          map[name].mobiles.add(d.driver_mobile);
        }
        
        if (d.truck_number) {
          map[name].trucks.add(d.truck_number);
        }
        
        map[name].dispatchCount += 1;
      });

      // Include purely manual transporters from metadata
      Object.keys(metaMap).forEach(name => {
        if (!map[name]) {
          map[name] = {
            id: name,
            name: name,
            dynamicCities: new Set(),
            mobiles: new Set(),
            trucks: new Set(),
            dispatchCount: 0
          };
        }
      });
      
      // 3. Merge metadata and dispatch data
      const activeList = [];
      const fraudList = [];
      
      Object.values(map).forEach(t => {
        const meta = metaMap[t.name] || {};
        
        const added = meta.added_locations || [];
        const removed = meta.removed_locations || [];
        
        // Final cities = (Dynamic + Added) - Removed
        const finalCitiesSet = new Set(t.dynamicCities);
        added.forEach(loc => finalCitiesSet.add(loc));
        removed.forEach(loc => finalCitiesSet.delete(loc));
        
        const mergedObj = {
          ...t,
          citiesList: Array.from(finalCitiesSet).filter(Boolean).sort(),
          mobilesList: Array.from(t.mobiles).filter(Boolean).sort(),
          trucksList: Array.from(t.trucks).filter(Boolean).sort(),
          isFraud: meta.is_fraud === true,
          addedLocations: added,
          removedLocations: removed,
          contactNumber: meta.contact_number || ''
        };
        
        if (mergedObj.isFraud) {
          fraudList.push(mergedObj);
        } else {
          activeList.push(mergedObj);
        }
      });
      
      activeList.sort((a, b) => a.name.localeCompare(b.name));
      fraudList.sort((a, b) => a.name.localeCompare(b.name));
      
      setActiveTransporters(activeList);
      setFraudTransporters(fraudList);
      
    } catch (err) {
      console.error(err);
      setError("Failed to load transporters data. Ensure SQL migrations are applied.");
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---

  const handleMarkFraud = async (transporter, fraudStatus) => {
    const actionText = fraudStatus ? 'mark as Fraud' : 'restore as Active';
    if (!window.confirm(`Are you sure you want to ${actionText} transporter "${transporter.name}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('transporter_metadata')
        .upsert({ 
          transporter_name: transporter.name, 
          is_fraud: fraudStatus 
        }, { onConflict: 'transporter_name' });
        
      if (error) throw error;
      await fetchTransporters();
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    }
  };

  const openAddModal = () => {
    setModalMode('ADD');
    setFormName('');
    setFormContact('');
    setTempLocations([]);
    setAddedLocations([]);
    setRemovedLocations([]);
    setNewLocation('');
  };

  const openEditModal = (transporter) => {
    setSelectedTransporter(transporter);
    setModalMode('EDIT');
    setFormName(transporter.name);
    setFormContact(transporter.contactNumber || '');
    setTempLocations([...transporter.citiesList]);
    setAddedLocations([...transporter.addedLocations]);
    setRemovedLocations([...transporter.removedLocations]);
    setNewLocation('');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedTransporter(null);
  };

  const handleAddLocation = () => {
    const loc = newLocation.trim();
    if (!loc) return;
    if (tempLocations.includes(loc)) return; // Already there
    
    setTempLocations([...tempLocations, loc].sort());
    setAddedLocations([...addedLocations, loc]);
    setRemovedLocations(removedLocations.filter(r => r !== loc));
    
    setNewLocation('');
  };

  const handleRemoveLocation = (loc) => {
    setTempLocations(tempLocations.filter(l => l !== loc));
    setRemovedLocations([...removedLocations, loc]);
    setAddedLocations(addedLocations.filter(a => a !== loc));
  };

  const handleSaveTransporter = async () => {
    if (!formName.trim()) {
      alert("Transporter Name is required.");
      return;
    }

    try {
      const payload = {
        transporter_name: formName.trim(),
        contact_number: formContact.trim() || null,
        added_locations: addedLocations,
        removed_locations: removedLocations
      };

      const { error } = await supabase
        .from('transporter_metadata')
        .upsert(payload, { onConflict: 'transporter_name' });
        
      if (error) throw error;
      closeModal();
      await fetchTransporters();
    } catch (err) {
      console.error(err);
      alert("Failed to save transporter. Ensure the DB migration was run.");
    }
  };

  // --- Filtering ---
  
  const currentList = activeTab === 'Active' ? activeTransporters : fraudTransporters;
  
  const filteredTransporters = currentList.filter(t => {
    const matchName = t.name.toLowerCase().includes(searchName.toLowerCase());
    const matchLoc = searchLocation 
      ? t.citiesList.some(c => c.toLowerCase().includes(searchLocation.toLowerCase()))
      : true;
    return matchName && matchLoc;
  });

  // --- Columns ---

  const baseColumns = [
    {
      id: 'name',
      header: 'Transporter Name',
      renderCell: (item) => (
        <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
          {item.name}
        </div>
      )
    },
    {
      id: 'contact',
      header: 'Contact Info',
      renderCell: (item) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {item.contactNumber && (
            <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)' }} title="Primary Contact">
              <Phone size={12} /> {item.contactNumber}
            </span>
          )}
          {item.mobilesList.length > 0 ? (
            item.mobilesList.map((m, i) => (
              <span key={i} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }} title="Driver Mobile from Dispatch">
                <Truck size={10} /> {m}
              </span>
            ))
          ) : !item.contactNumber ? (
             <span className="text-muted" style={{fontSize: '0.85rem'}}>N/A</span>
          ) : null}
        </div>
      )
    },
    {
      id: 'locations',
      header: 'Service Locations',
      renderCell: (item) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {item.citiesList.length > 0 ? (
             item.citiesList.map((c, i) => (
               <span key={i} className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '2px 6px' }}>
                 <MapPin size={10} /> {c}
               </span>
             ))
          ) : (
             <span className="text-muted" style={{fontSize: '0.85rem'}}>Unknown</span>
          )}
        </div>
      )
    },
    {
      id: 'fleet',
      header: 'Fleet / Vehicles',
      renderCell: (item) => (
        <div className="text-secondary" style={{ fontSize: '0.85rem', maxWidth: '200px', whiteSpace: 'normal' }}>
          {item.trucksList.length > 0 ? item.trucksList.join(', ') : '-'}
        </div>
      )
    },
    {
      id: 'dispatches',
      header: 'Total Dispatches',
      renderCell: (item) => (
        <div style={{ fontWeight: 500 }}>
          {item.dispatchCount}
        </div>
      )
    }
  ];

  const activeColumns = [
    ...baseColumns,
    {
      id: 'actions',
      header: 'Actions',
      renderCell: (item) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-icon" style={{color: 'var(--primary)'}} onClick={() => openEditModal(item)} title="Edit Transporter Details">
            <Edit2 size={16} />
          </button>
          <button className="btn-icon" style={{color: 'var(--danger)'}} onClick={() => handleMarkFraud(item, true)} title="Mark as Fraud">
            <ShieldAlert size={16} />
          </button>
        </div>
      )
    }
  ];
  
  const fraudColumns = [
    ...baseColumns,
    {
      id: 'status',
      header: 'Status',
      renderCell: (item) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span className="badge badge-danger" style={{display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
            <ShieldAlert size={12}/> Fraud
          </span>
          <button className="btn btn-sm btn-secondary" onClick={() => handleMarkFraud(item, false)} style={{fontSize: '0.7rem', padding: '2px 6px'}}>
            <CheckCircle2 size={12} style={{marginRight: '2px'}}/> Restore
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
        <div>
          <h1 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Truck size={24} className="text-primary" />
            Transporter Master
          </h1>
          <p className="text-secondary">Manage logistics, contact details, service locations, and fraud flags.</p>
        </div>
        
        {activeTab === 'Active' && (
          <button className="btn btn-primary" onClick={openAddModal}>
            <UserPlus size={18} style={{marginRight: '8px'}}/>
            Add Transporter
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto'}}>
        {['Active', 'Fraud'].map(tab => (
          <button 
            key={tab}
            className={`nav-item ${activeTab === tab ? 'active' : ''}`} 
            style={{
              borderRadius: 0, 
              padding: '0.75rem 1rem', 
              whiteSpace: 'nowrap', 
              border: 'none', 
              background: 'transparent', 
              cursor: 'pointer', 
              fontWeight: activeTab === tab ? 600 : 500, 
              color: activeTab === tab ? (tab === 'Fraud' ? 'var(--danger)' : 'var(--primary)') : 'var(--text-secondary)', 
              borderBottom: activeTab === tab ? `2px solid ${tab === 'Fraud' ? 'var(--danger)' : 'var(--primary)'}` : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }} 
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'Fraud' ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
            {tab} Transporters
            <span className="badge badge-secondary" style={{marginLeft: '4px', fontSize: '0.7rem'}}>{tab === 'Active' ? activeTransporters.length : fraudTransporters.length}</span>
          </button>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by Transporter Name..." 
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)' }}
            />
          </div>
          <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
            <MapPin size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Filter by City / Location..." 
              value={searchLocation}
              onChange={e => setSearchLocation(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)' }}
            />
          </div>
        </div>

        {error ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <AlertCircle size={48} className="text-danger" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
            <h3>{error}</h3>
            <button className="btn btn-primary" onClick={fetchTransporters}>Retry</button>
          </div>
        ) : loading ? (
          <div style={{textAlign: 'center', padding: '3rem'}} className="text-muted">Loading transporters...</div>
        ) : filteredTransporters.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }} className="text-muted">
            {activeTab === 'Fraud' ? (
              <>
                <ShieldOff size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                <p>No fraud transporters found.</p>
              </>
            ) : (
              <>
                <Truck size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                <p>No transporters found matching your search.</p>
              </>
            )}
          </div>
        ) : (
          <DataTable 
            columns={activeTab === 'Active' ? activeColumns : fraudColumns} 
            data={filteredTransporters} 
            theadClassName="bg-slate-50 border-b border-base"
            tbodyClassName="divide-y divide-base"
          />
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalMode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '500px', background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {modalMode === 'ADD' ? <UserPlus size={20} className="text-primary"/> : <Edit2 size={20} className="text-primary"/>}
                {modalMode === 'ADD' ? 'Add New Transporter' : 'Edit Transporter Details'}
              </h3>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500 }} className="text-muted">
                Transporter Name <span className="text-danger">*</span>
              </label>
              <input 
                type="text" 
                value={formName} 
                onChange={e => setFormName(e.target.value)} 
                placeholder="E.g., Reliable Transport Co."
                disabled={modalMode === 'EDIT'}
                style={{ 
                  width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', 
                  background: modalMode === 'EDIT' ? 'var(--bg-base)' : 'var(--bg-surface)',
                  color: modalMode === 'EDIT' ? 'var(--text-muted)' : 'inherit',
                  cursor: modalMode === 'EDIT' ? 'not-allowed' : 'text'
                }}
              />
              {modalMode === 'EDIT' && <div style={{fontSize: '0.75rem', marginTop: '4px'}} className="text-muted">Name cannot be changed for existing records to preserve history.</div>}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500 }} className="text-muted">
                Primary Contact Number
              </label>
              <input 
                type="text" 
                value={formContact} 
                onChange={e => setFormContact(e.target.value)} 
                placeholder="10-digit mobile number"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500 }} className="text-muted">Service Locations</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-base)', minHeight: '80px', marginBottom: '0.5rem' }}>
                {tempLocations.length === 0 ? (
                  <span className="text-muted" style={{fontSize: '0.85rem'}}>No locations associated yet.</span>
                ) : (
                  tempLocations.map((loc, i) => (
                    <div key={i} className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}>
                      <MapPin size={12} /> {loc}
                      <button onClick={() => handleRemoveLocation(loc)} style={{background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', color: 'var(--text-muted)'}} title="Remove">
                        <X size={14} className="hover:text-danger transition-colors"/>
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={newLocation} 
                  onChange={e => setNewLocation(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleAddLocation()}
                  placeholder="Enter city or location name..."
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                />
                <button className="btn btn-secondary" onClick={handleAddLocation}>
                  <Plus size={16} /> Add Location
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveTransporter}>Save Transporter</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
