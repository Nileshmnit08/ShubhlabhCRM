import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, Download, Eye, ExternalLink } from 'lucide-react';

export default function DispatchList() {
  const [searchParams] = useSearchParams();
  const reqIdParam = searchParams.get('requirement_id');

  const [loading, setLoading] = useState(true);
  const [dispatches, setDispatches] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Status filter
  const [statusFilter, setStatusFilter] = useState('All');
  
  useEffect(() => {
    fetchDispatches();
  }, [reqIdParam]);

  const fetchDispatches = async () => {
    setLoading(true);
    try {
      let query = supabase.from('requirement_dispatches').select(`
        *,
        requirements (
          id, quantity, unit,
          crm_parties (id, display_name, city, territory_name)
        ),
        created_user:created_by (email)
      `).order('dispatch_date', { ascending: false });

      if (reqIdParam) {
        query = query.eq('requirement_id', reqIdParam);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setDispatches(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDispatches = dispatches.filter(d => {
    if (statusFilter !== 'All' && d.status !== statusFilter) return false;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        d.truck_number?.toLowerCase().includes(term) ||
        d.driver_mobile?.includes(term) ||
        d.invoice_number?.toLowerCase().includes(term) ||
        d.requirements?.crm_parties?.display_name?.toLowerCase().includes(term) ||
        d.id.includes(term)
      );
    }
    return true;
  });

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'Dispatched': return 'badge-active';
      case 'Delivered': return 'badge-success';
      case 'Cancelled': return 'badge-danger';
      case 'Returned': return 'badge-warning';
      case 'Delayed': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <h1 style={{margin: 0}}>Dispatch List</h1>
          {reqIdParam && <p className="text-secondary">Showing dispatches for Requirement #{reqIdParam.substring(0,8)}</p>}
        </div>
      </div>

      <div className="glass-panel" style={{marginBottom: '2rem'}}>
        <div style={{padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between'}}>
          <div style={{display: 'flex', gap: '1rem', flex: '1 1 300px'}}>
            <div style={{position: 'relative', flex: 1}}>
              <Search size={18} style={{position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'}} />
              <input 
                type="text" 
                placeholder="Search truck, invoice, dealer..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.25rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
              />
            </div>
            <select 
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
            >
              <option value="All">All Statuses</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Delivered">Delivered</option>
              <option value="Delayed">Delayed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Returned">Returned</option>
            </select>
          </div>
          
          <button className="btn btn-secondary">
            <Download size={16} /> Export CSV
          </button>
        </div>

        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
            <thead>
              <tr style={{borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)'}}>
                <th style={{padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)'}}>Date</th>
                <th style={{padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)'}}>Dealer</th>
                <th style={{padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)'}}>Qty</th>
                <th style={{padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)'}}>Vehicle</th>
                <th style={{padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)'}}>Invoice/LR</th>
                <th style={{padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)'}}>Status</th>
                <th style={{padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{padding: '2rem', textAlign: 'center'}} className="text-muted">Loading...</td></tr>
              ) : filteredDispatches.length === 0 ? (
                <tr><td colSpan="7" style={{padding: '2rem', textAlign: 'center'}} className="text-muted">No dispatches found</td></tr>
              ) : (
                filteredDispatches.map(d => (
                  <tr key={d.id} style={{borderBottom: '1px solid var(--border)'}}>
                    <td style={{padding: '1rem'}}>{new Date(d.dispatch_date).toLocaleDateString()}</td>
                    <td style={{padding: '1rem'}}>
                      {d.requirements?.crm_parties?.display_name || 'Unknown'}
                      <div className="text-secondary" style={{fontSize: '0.8rem'}}>{d.requirements?.crm_parties?.territory_name}</div>
                    </td>
                    <td style={{padding: '1rem', fontWeight: 600}}>{d.quantity} {d.unit}</td>
                    <td style={{padding: '1rem'}}>
                      {d.truck_number}
                      <div className="text-secondary" style={{fontSize: '0.8rem'}}>{d.driver_mobile}</div>
                    </td>
                    <td style={{padding: '1rem'}}>
                      <div>{d.invoice_number || 'No Inv'}</div>
                      <div className="text-secondary" style={{fontSize: '0.8rem'}}>{d.lr_bilty_number || 'No LR'}</div>
                    </td>
                    <td style={{padding: '1rem'}}>
                      <span className={`badge ${getStatusBadgeClass(d.status)}`}>{d.status}</span>
                    </td>
                    <td style={{padding: '1rem'}}>
                       <Link to={`/dispatches/${d.id}`} className="btn-icon" title="View Details">
                         <Eye size={18} />
                       </Link>
                       <Link to={`/requirements/${d.requirement_id}`} className="btn-icon" title="View Linked Requirement">
                         <ExternalLink size={18} />
                       </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
