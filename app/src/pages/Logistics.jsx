import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DataTable from '../components/DataTable';
import { Truck, Search, AlertCircle, Phone, MapPin } from 'lucide-react';

export default function Logistics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transporters, setTransporters] = useState([]);
  
  const [searchName, setSearchName] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  useEffect(() => {
    fetchTransporters();
  }, []);

  const fetchTransporters = async () => {
    setLoading(true);
    setError(null);
    try {
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
            id: name, // Using name as unique key
            name: name,
            cities: new Set(),
            mobiles: new Set(),
            trucks: new Set(),
            dispatchCount: 0
          };
        }
        
        if (d.requirements?.crm_parties?.city) {
          map[name].cities.add(d.requirements.crm_parties.city);
        }
        
        if (d.driver_mobile) {
          map[name].mobiles.add(d.driver_mobile);
        }
        
        if (d.truck_number) {
          map[name].trucks.add(d.truck_number);
        }
        
        map[name].dispatchCount += 1;
      });
      
      const aggregated = Object.values(map).map(t => ({
        ...t,
        citiesList: Array.from(t.cities).filter(Boolean).sort(),
        mobilesList: Array.from(t.mobiles).filter(Boolean).sort(),
        trucksList: Array.from(t.trucks).filter(Boolean).sort()
      })).sort((a, b) => a.name.localeCompare(b.name));
      
      setTransporters(aggregated);
    } catch (err) {
      console.error(err);
      setError("Failed to load transporters data.");
    } finally {
      setLoading(false);
    }
  };

  const filteredTransporters = transporters.filter(t => {
    const matchName = t.name.toLowerCase().includes(searchName.toLowerCase());
    const matchLoc = searchLocation 
      ? t.citiesList.some(c => c.toLowerCase().includes(searchLocation.toLowerCase()))
      : true;
    return matchName && matchLoc;
  });

  const columns = [
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
      header: 'Contact Numbers',
      renderCell: (item) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {item.mobilesList.length > 0 ? (
            item.mobilesList.map((m, i) => (
              <span key={i} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={12} className="text-secondary" /> {m}
              </span>
            ))
          ) : (
             <span className="text-muted" style={{fontSize: '0.85rem'}}>N/A</span>
          )}
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

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
        <div>
          <h1 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Truck size={24} className="text-primary" />
            Transporter Master
          </h1>
          <p className="text-secondary">Logistics and transporter directory based on dispatch history.</p>
        </div>
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
            <Truck size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p>No transporters found matching your search.</p>
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={filteredTransporters} 
            theadClassName="bg-slate-50 border-b border-base"
            tbodyClassName="divide-y divide-base"
          />
        )}
      </div>
    </div>
  );
}
