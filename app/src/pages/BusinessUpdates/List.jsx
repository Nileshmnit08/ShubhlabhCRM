import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Filter, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const UPDATE_TYPES = [
  'All', 'Price Update', 'Raw Material Update', 'Scheme', 'Reward',
  'Offer', 'Product Update', 'Announcement', 'Supply Update', 'Important Notice', 'Other'
];

const DATE_FILTERS = [
  'Today', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Custom Range'
];

export default function BusinessUpdatesList() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('All');
  const [dateFilter, setDateFilter] = useState('Last 30 Days');

  // Custom range
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    fetchUpdates();
  }, [selectedType, dateFilter, customFrom, customTo]);

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let fromDate = null;
      let toDate = null;

      if (dateFilter === 'Today') {
        fromDate = new Date(now.setHours(0,0,0,0));
      } else if (dateFilter === 'Last 7 Days') {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 7);
      } else if (dateFilter === 'Last 30 Days') {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30);
      } else if (dateFilter === 'This Month') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateFilter === 'Last Month') {
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        toDate = new Date(now.getFullYear(), now.getMonth(), 0);
      } else if (dateFilter === 'Custom Range') {
        if (customFrom) fromDate = new Date(customFrom);
        if (customTo) toDate = new Date(customTo);
      }

      let query = supabase.from('business_updates')
        .select(`
          *,
          business_update_recipients ( id, read_at )
        `)
        .order('created_at', { ascending: false });

      if (selectedType !== 'All') {
        query = query.eq('type', selectedType.toUpperCase().replace(/ /g, '_'));
      }

      if (fromDate) query = query.gte('created_at', fromDate.toISOString());
      if (toDate) query = query.lte('created_at', toDate.toISOString());

      const { data, error } = await query;
      if (error) throw error;
      setUpdates(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{paddingBottom: '4rem'}}>
      <div className="page-header" style={{flexWrap: 'wrap', gap: '1rem', position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-base)', padding: '1rem 0', borderBottom: '1px solid var(--border)'}}>
        <div>
          <h1 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>Customer Updates</h1>
          <p className="text-secondary" style={{marginTop: '0.25rem'}}>Create and manage business communications sent to customers.</p>
        </div>
        <div style={{display: 'flex', gap: '0.75rem', alignItems: 'center'}}>
          <Link to="/customer-updates/new" className="btn btn-primary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Plus size={18} /> Create Update
          </Link>
        </div>
      </div>

      <div className="glass-panel" style={{margin: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', backgroundColor: 'var(--bg-surface)'}}>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end'}}>
          <div style={{flex: '1 1 200px'}}>
            <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', fontWeight: 500}}>Type</label>
            <select style={{width: '100%', height: '38px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-base)', padding: '0 0.75rem', fontSize: '0.85rem', color: 'var(--text-primary)'}} value={selectedType} onChange={e => setSelectedType(e.target.value)}>
              {UPDATE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{flex: '1 1 200px'}}>
            <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', fontWeight: 500}}>Date Filter</label>
            <select style={{width: '100%', height: '38px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-base)', padding: '0 0.75rem', fontSize: '0.85rem', color: 'var(--text-primary)'}} value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
              {DATE_FILTERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {dateFilter === 'Custom Range' && (
            <>
              <div style={{flex: '1 1 150px'}}>
                <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', fontWeight: 500}}>From</label>
                <input type="date" style={{width: '100%', height: '38px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-base)', padding: '0 0.75rem', fontSize: '0.85rem', color: 'var(--text-primary)'}} value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              </div>
              <div style={{flex: '1 1 150px'}}>
                <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', fontWeight: 500}}>To</label>
                <input type="date" style={{width: '100%', height: '38px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-base)', padding: '0 0.75rem', fontSize: '0.85rem', color: 'var(--text-primary)'}} value={customTo} onChange={e => setCustomTo(e.target.value)} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="data-table-container">
        {loading ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>Loading updates...</div>
        ) : updates.length === 0 ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
            <h3>No customer updates found.</h3>
            <p>Try adjusting your filters or create a new update.</p>
          </div>
        ) : (
          <table className="data-table mobile-cards-table" style={{minWidth: '1000px'}}>
            <thead>
              <tr>
                <th style={{width: '30%'}}>Update</th>
                <th style={{width: '15%'}}>Type</th>
                <th style={{width: '15%'}}>Audience</th>
                <th style={{width: '15%'}}>Published</th>
                <th style={{width: '10%'}}>Read</th>
                <th style={{width: '15%', textAlign: 'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {updates.map(u => {
                const recipients = u.business_update_recipients || [];
                const readCount = recipients.filter(r => r.read_at).length;
                const displayType = u.type.replace(/_/g, ' ');

                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px'}}>{u.title}</div>
                      {u.status === 'DRAFT' && <span className="badge badge-warning" style={{fontSize: '0.7rem'}}>Draft</span>}
                      {u.status === 'PUBLISHED' && <span className="badge badge-success" style={{fontSize: '0.7rem'}}>Published</span>}
                    </td>
                    <td>{displayType}</td>
                    <td>{u.audience_type === 'ALL' ? 'All Customers' : `${recipients.length} Customers`}</td>
                    <td>{u.published_at ? new Date(u.published_at).toLocaleDateString() : '-'}</td>
                    <td>{readCount}</td>
                    <td style={{textAlign: 'right'}}>
                      <Link to={`/customer-updates/${u.id}`} className="btn btn-secondary" style={{padding: '0.25rem 0.75rem', fontSize: '0.8rem'}}>
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
