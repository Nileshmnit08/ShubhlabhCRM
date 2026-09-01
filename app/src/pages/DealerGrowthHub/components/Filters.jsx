import React from 'react';
import { Search, Filter, XCircle } from 'lucide-react';

export default function Filters({ 
  searchQuery, setSearchQuery, 
  filterScheme, setFilterScheme, 
  filterStatus, setFilterStatus, 
  schemes,
  dateRange, setDateRange,
  startDate, setStartDate,
  endDate, setEndDate
}) {

  return (
    <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      
      {/* Date Filter */}
      <div>
        <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Date Range</label>
        <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)' }}>
          <option value="Current Scheme Period">Current Scheme Period</option>
          <option value="Today">Today</option>
          <option value="This Week">This Week</option>
          <option value="This Month">This Month</option>
          <option value="Last Month">Last Month</option>
          <option value="Custom">Custom Date Range</option>
        </select>
      </div>

      {dateRange === 'Custom' && (
        <>
          <div>
            <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)' }}
            />
          </div>
          <div>
            <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)' }}
            />
          </div>
        </>
      )}

      {/* Scheme Dropdown */}
      <div style={{flex: 1, minWidth: '200px'}}>
        <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Scheme</label>
        <select value={filterScheme} onChange={e => setFilterScheme(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)' }}>
          <option value="All">All Schemes</option>
          {schemes.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} ({new Date(s.start_date).toLocaleDateString()} - {new Date(s.end_date).toLocaleDateString()}) - {s.status}
            </option>
          ))}
        </select>
      </div>

      {/* Status Dropdown */}
      <div>
        <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Customer Status</label>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)' }}>
          <option value="All">All Statuses</option>
          <option value="eligible">Eligible</option>
          <option value="near_next_slab">Near Next Slab</option>
          <option value="near_monthly_target">Near Monthly Target</option>
          <option value="in_progress">In Progress</option>
          <option value="at_risk">At Risk</option>
          <option value="no_activity">No Activity</option>
        </select>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', flex: '1 1 250px' }}>
        <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Search Customer</label>
        <Search size={18} style={{ position: 'absolute', left: '10px', top: '34px', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          placeholder="Search name, mobile, city, state, code..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.25rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)' }}
        />
      </div>
      
      {(filterScheme !== 'All' || filterStatus !== 'All' || searchQuery !== '' || dateRange !== 'Current Scheme Period') && (
        <button className="btn cv-btn-subtle" onClick={() => { 
          setFilterScheme('All'); 
          setFilterStatus('All'); 
          setSearchQuery(''); 
          setDateRange('Current Scheme Period');
        }} style={{ color: 'var(--danger)', marginBottom: '0.1rem' }}>
          <XCircle size={16} /> Clear
        </button>
      )}
    </div>
  );
}
