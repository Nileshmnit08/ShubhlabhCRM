import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export default function FieldMobilityDashboard() {
  const [loading, setLoading] = useState(true);
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
    try {
      // Fetch staff names
      const { data: staffData } = await supabase.from('app_users').select('id, name');
      const staffMap = {};
      staffData?.forEach(s => { staffMap[s.id] = s.name; });
      setStaffUsers(staffMap);

      const startStr = dateRange.start.toISOString().split('T')[0];
      const endStr = dateRange.end.toISOString().split('T')[0];

      // Fetch Session Reconciliation
      const { data: sessionData } = await supabase
        .from('vw_field_session_reconciliation')
        .select('*')
        .gte('business_date', startStr)
        .lte('business_date', endStr);
      setSessions(sessionData || []);

      // Fetch Expense Reconciliation
      const { data: expenseData } = await supabase
        .from('vw_field_expense_reconciliation')
        .select('*')
        .gte('expense_date', startStr)
        .lte('expense_date', endStr);
      setExpenses(expenseData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Aggregations
  const uniqueDays = new Set(sessions.map(s => s.business_date)).size;
  const totalSessions = sessions.length;
  const verifiedKm = sessions.reduce((acc, s) => acc + (s.verified_distance_meters / 1000 || 0), 0).toFixed(2);
  const totalVisits = sessions.reduce((acc, s) => acc + (s.linked_visit_count || 0), 0);
  const totalExpenseCount = expenses.length;
  const totalExpenseAmount = expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0).toFixed(2);
  const completeEvidenceCount = sessions.filter(s => s.mobility_evidence_status === 'SUPPORTED').length;
  const partialEvidenceCount = sessions.filter(s => s.mobility_evidence_status === 'PARTIAL').length;

  const requiresReview = expenses.filter(e => e.evidence_status === 'NO_MOBILITY_EVIDENCE' || e.evidence_status === 'PARTIALLY_SUPPORTED');

  // Staff Summary Table Data
  const staffSummary = {};
  sessions.forEach(s => {
    if (!staffSummary[s.staff_id]) {
      staffSummary[s.staff_id] = { 
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
        name: staffUsers[e.staff_id] || 'Unknown', 
        sessions: 0, days: new Set(), km: 0, visits: 0, 
        expenses: 0, expenseTotal: 0, complete: 0, partial: 0 
      };
    }
    staffSummary[e.staff_id].expenses++;
    staffSummary[e.staff_id].expenseTotal += parseFloat(e.amount || 0);
  });

  return (
    <div className="animate-fade-in p-6 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Field Mobility & Expenses</h1>
          <p className="text-secondary text-sm">Operational reporting and evidence reconciliation</p>
        </div>
        <div className="flex gap-2 text-sm text-secondary bg-surface p-2 rounded-md border border-[var(--border)]">
          Current Month: {format(dateRange.start, 'MMM yyyy')}
        </div>
      </div>

      {loading ? (
        <div>Loading dashboard...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
            <KpiCard title="Field Days" value={uniqueDays} />
            <KpiCard title="Sessions" value={totalSessions} />
            <KpiCard title="Verified KM" value={verifiedKm} />
            <KpiCard title="CRM Visits" value={totalVisits} />
            <KpiCard title="Expenses" value={totalExpenseCount} />
            <KpiCard title="Exp. Total" value={`₹${totalExpenseAmount}`} />
            <KpiCard title="Complete Evidence" value={completeEvidenceCount} color="var(--primary)" />
            <KpiCard title="Partial Evidence" value={partialEvidenceCount} color="#ed6c02" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Staff Summary */}
            <div className="glass-panel p-4 col-span-2 overflow-x-auto">
              <h2 className="text-lg font-bold mb-4">Staff Field Summary</h2>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-sm text-secondary">
                    <th className="pb-2">Staff</th>
                    <th className="pb-2">Sessions</th>
                    <th className="pb-2">Days</th>
                    <th className="pb-2">Verif. KM</th>
                    <th className="pb-2">Visits</th>
                    <th className="pb-2">Exp. Total</th>
                    <th className="pb-2">Complete</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {Object.values(staffSummary).length === 0 ? (
                    <tr><td colSpan="7" className="py-4 text-center text-secondary">No field activity recorded for this period.</td></tr>
                  ) : Object.values(staffSummary).map((s, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-base)]">
                      <td className="py-3 font-medium">{s.name}</td>
                      <td className="py-3">{s.sessions}</td>
                      <td className="py-3">{s.days.size}</td>
                      <td className="py-3">{s.km.toFixed(1)}</td>
                      <td className="py-3">{s.visits}</td>
                      <td className="py-3">₹{s.expenseTotal.toFixed(2)}</td>
                      <td className="py-3">{s.complete}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Requires Review */}
            <div className="glass-panel p-4">
              <h2 className="text-lg font-bold mb-4 text-[#ed6c02]">Requires Review</h2>
              <div className="space-y-3">
                {requiresReview.length === 0 ? (
                  <p className="text-sm text-secondary">No exceptions require review.</p>
                ) : (
                  requiresReview.slice(0, 10).map((r, idx) => (
                    <div key={idx} className="bg-base p-3 rounded border border-[var(--border)] text-sm">
                      <div className="font-bold mb-1">Expense: ₹{r.amount} - {r.category}</div>
                      <div className="text-secondary text-xs">Date: {r.expense_date} | Staff: {staffUsers[r.staff_id]}</div>
                      <div className="text-[#ed6c02] text-xs font-semibold mt-1">Reason: {r.evidence_status.replace(/_/g, ' ')}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          <div className="glass-panel p-4 text-xs text-secondary">
            <h3 className="font-bold mb-1">Data Definitions</h3>
            <p><strong>VERIFIED KM:</strong> FM-03 authoritative verified distance.</p>
            <p><strong>EXPENSE TOTAL:</strong> Sum of recorded expenses within selected scope. Does not imply approval or reimbursement.</p>
            <p><strong>COMPLETE EVIDENCE:</strong> Session distance is > 0 and contains supported expenses/visits. (FM-07 standard)</p>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ title, value, color }) {
  return (
    <div className="glass-panel p-4 flex flex-col justify-center items-center text-center">
      <div className="text-xs text-secondary font-bold uppercase mb-2">{title}</div>
      <div className="text-2xl font-black" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}
