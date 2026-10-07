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
    <div className="p-6">
      <div className="d-flex align-items-center justify-content-between mb-6">
        <h1 className="h3">Customer Updates</h1>
        <Link to="/customer-updates/new" className="btn btn-primary d-flex align-items-center gap-2">
          <Plus size={18} />
          Create Update
        </Link>
      </div>

      <div className="card mb-6 p-4">
        <div className="d-flex flex-wrap gap-4 align-items-end">
          <div className="form-group flex-1" style={{ minWidth: '200px' }}>
            <label className="form-label">Type</label>
            <select className="form-select" value={selectedType} onChange={e => setSelectedType(e.target.value)}>
              {UPDATE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-group flex-1" style={{ minWidth: '200px' }}>
            <label className="form-label">Date Filter</label>
            <select className="form-select" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
              {DATE_FILTERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {dateFilter === 'Custom Range' && (
            <>
              <div className="form-group">
                <label className="form-label">From</label>
                <input type="date" className="form-control" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">To</label>
                <input type="date" className="form-control" value={customTo} onChange={e => setCustomTo(e.target.value)} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-6 text-center text-muted">Loading updates...</div>
        ) : updates.length === 0 ? (
          <div className="p-6 text-center text-muted">No updates found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Recipients</th>
                  <th>Read</th>
                  <th>Actions</th>
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
                        <strong>{u.title}</strong>
                        {u.audience_type === 'ALL' && <span className="badge bg-secondary ms-2">All Customers</span>}
                      </td>
                      <td>{displayType}</td>
                      <td>
                        <span className={`badge ${u.status === 'PUBLISHED' ? 'bg-success' : 'bg-warning'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>{u.audience_type === 'ALL' ? 'All' : recipients.length}</td>
                      <td>{readCount}</td>
                      <td>
                        <Link to={`/customer-updates/${u.id}`} className="btn btn-sm btn-outline-primary">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
