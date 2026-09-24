import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Map, MapPin, Search, AlertCircle, CheckCircle2, X } from 'lucide-react';
import DataTable from '../../components/DataTable';

// Reusable KPI Card (mimics Today.jsx)
function KpiCard({ title, value, colorClass = 'primary', icon: Icon }) {
  return (
    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: `3px solid var(--${colorClass})` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{title}</span>
        {Icon && <Icon size={16} className={`text-${colorClass}`} style={{ opacity: 0.8 }} />}
      </div>
      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

export default function FieldMobilityDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [staffUsers, setStaffUsers] = useState({});
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch staff names
      const { data: staffData, error: staffErr } = await supabase.from('app_users').select('id, display_name');
      if (staffErr) throw staffErr;
      const staffMap = {};
      staffData?.forEach(s => { staffMap[s.id] = s.display_name; });
      setStaffUsers(staffMap);

      const startStr = dateRange.start.toISOString().split('T')[0];
      const endStr = dateRange.end.toISOString().split('T')[0];

      // Fetch Session Reconciliation
      const { data: sessionData, error: sessionErr } = await supabase
        .from('vw_field_session_reconciliation')
        .select('*')
        .gte('business_date', startStr)
        .lte('business_date', endStr);
      if (sessionErr) throw sessionErr;
      setSessions(sessionData || []);

      // Fetch Expense Reconciliation
      const { data: expenseData, error: expenseErr } = await supabase
        .from('vw_field_expense_reconciliation')
        .select('*')
        .gte('expense_date', startStr)
        .lte('expense_date', endStr);
      if (expenseErr) throw expenseErr;
      setExpenses(expenseData || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load field mobility data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Aggregations
  const uniqueDays = new Set(sessions.map(s => s.business_date)).size;
  const totalSessions = sessions.length;
  const verifiedKm = sessions.reduce((acc, s) => acc + (s.verified_distance_meters / 1000 || 0), 0).toFixed(1);
  const totalVisits = sessions.reduce((acc, s) => acc + (s.linked_visit_count || 0), 0);
  const totalExpenseCount = expenses.length;
  const totalExpenseAmount = expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const completeEvidenceCount = sessions.filter(s => s.mobility_evidence_status === 'SUPPORTED').length;
  const partialEvidenceCount = sessions.filter(s => s.mobility_evidence_status === 'PARTIAL').length;

  const requiresReview = expenses.filter(e => e.evidence_status === 'NO_MOBILITY_EVIDENCE' || e.evidence_status === 'PARTIALLY_SUPPORTED');

  // Staff Summary Table Data
  const staffSummary = {};
  sessions.forEach(s => {
    if (!staffSummary[s.staff_id]) {
      staffSummary[s.staff_id] = { 
        id: s.staff_id,
        name: staffUsers[s.staff_id] || 'Unknown', 
        sessions: 0, days: new Set(), km: 0, visits: 0, 
        expenses: 0, expenseTotal: 0, complete: 0, partial: 0 
      };
    }
    const sum = staffSummary[s.staff_id];
    sum.sessions++;
    sum.days.add(s.business_date);
    sum.km += (s.verified_distance_meters / 1000 || 0);
    sum.visits += (s.linked_visit_count || 0);
    if (s.mobility_evidence_status === 'SUPPORTED') sum.complete++;
    if (s.mobility_evidence_status === 'PARTIAL') sum.partial++;
  });
  
  expenses.forEach(e => {
    if (!staffSummary[e.staff_id]) {
      staffSummary[e.staff_id] = { 
        id: e.staff_id,
        name: staffUsers[e.staff_id] || 'Unknown', 
        sessions: 0, days: new Set(), km: 0, visits: 0, 
        expenses: 0, expenseTotal: 0, complete: 0, partial: 0 
      };
    }
    staffSummary[e.staff_id].expenses++;
    staffSummary[e.staff_id].expenseTotal += parseFloat(e.amount || 0);
  });

  const staffArray = Object.values(staffSummary);

  const staffColumns = [
    { id: 'staff', header: 'Staff Member', renderCell: row => <div className="font-medium">{row.name}</div> },
    { id: 'sessions', header: 'Sessions', renderCell: row => row.sessions },
    { id: 'days', header: 'Days Active', renderCell: row => row.days.size },
    { id: 'km', header: 'Verif. KM', renderCell: row => row.km.toFixed(1) },
    { id: 'visits', header: 'CRM Visits', renderCell: row => row.visits },
    { id: 'expenses', header: 'Expenses', renderCell: row => `₹${row.expenseTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { id: 'complete', header: 'Evidence (Complete)', renderCell: row => (
        <span className={row.complete > 0 ? "text-primary font-medium" : "text-muted"}>{row.complete}</span>
    )},
  ];

  return (
    <div className="animate-fade-in">
      {/* 1. Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Field Mobility & Expenses</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Track field activity, verified movement, visits and expenses.
          </p>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
          <div>
            <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', fontWeight: 500}}>Filter Month</label>
            <input 
              type="month" 
              value={format(dateRange.start, 'yyyy-MM')} 
              onChange={(e) => {
                if (!e.target.value) return;
                const newDate = new Date(e.target.value);
                setDateRange({ start: startOfMonth(newDate), end: endOfMonth(newDate) });
              }} 
              style={{width: '100%', height: '38px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-base)', padding: '0 0.75rem', fontSize: '0.85rem', color: 'var(--text-primary)'}} 
            />
          </div>
        </div>
      </div>

      {error ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <AlertCircle size={48} className="text-danger" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
          <h3>{error}</h3>
          <button className="btn btn-primary" onClick={fetchData}>Retry</button>
        </div>
      ) : loading ? (
        <div style={{textAlign: 'center', padding: '4rem 2rem'}} className="text-muted">Loading mobility data...</div>
      ) : (
        <>
          {/* 3. Primary KPI Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
            <KpiCard title="Field Days" value={uniqueDays} colorClass="primary" />
            <KpiCard title="Sessions" value={totalSessions} colorClass="primary" />
            <KpiCard title="Verified KM" value={verifiedKm} colorClass="primary" />
            <KpiCard title="Visits" value={totalVisits} colorClass="success" />
            <KpiCard title="Exp. Total" value={`₹${totalExpenseAmount}`} colorClass="danger" />
            <KpiCard title="Evd. Complete" value={completeEvidenceCount} colorClass="success" />
            <KpiCard title="Evd. Partial" value={partialEvidenceCount} colorClass="warning" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            {/* 4. Staff Summary Table */}
            <div style={{ flex: 1, minWidth: '0' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>Staff Field Summary</h2>
              <div className="glass-panel" style={{ padding: '0' }}>
                {staffArray.length === 0 ? (
                  <div style={{ padding: '4rem 2rem', textAlign: 'center' }} className="text-muted">
                    <Map size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                    <p>No field mobility activity found for the selected period.</p>
                  </div>
                ) : (
                  <DataTable 
                    columns={staffColumns} 
                    data={staffArray} 
                    theadClassName="bg-slate-50 border-b border-base"
                    tbodyClassName="divide-y divide-base"
                  />
                )}
              </div>
            </div>
            
            {/* 5. Requires Review */}
            <div style={{ minWidth: '350px', flexShrink: 0 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>Requires Review</h2>
              <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
                {requiresReview.length === 0 ? (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <CheckCircle2 size={32} className="text-success" style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                    <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>All caught up. No missing evidence exceptions.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {requiresReview.slice(0, 10).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: idx === (Math.min(requiresReview.length, 10) - 1) ? 'none' : '1px solid var(--border)', background: 'var(--bg-base)', borderRadius: '4px', marginBottom: '0.5rem' }}>
                        <div style={{ flex: '1 1 0', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                              {staffUsers[item.staff_id]}
                            </strong>
                            <span className="badge badge-danger" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>{item.evidence_status.replace(/_/g, ' ')}</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Expense: <span style={{color: 'var(--danger)', fontWeight: 500}}>₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> - {item.category}
                            <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>&bull; {item.expense_date}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {requiresReview.length > 10 && (
                      <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        + {requiresReview.length - 10} more exceptions
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
