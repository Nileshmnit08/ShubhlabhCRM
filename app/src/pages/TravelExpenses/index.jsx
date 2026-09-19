import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../AuthContext';
import { MapPin, Clock, CheckCircle, Activity, Map, ArrowRight, Settings, Plus, X, ChevronLeft, ChevronRight, User, Calendar, AlertTriangle, Download } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths, addDays, subDays } from 'date-fns';
import { generateTravelExpensePDF } from '../../utils/pdfGenerator';

export default function TravelExpenses() {
  const { userProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Navigation
  const [activeTab, setActiveTab] = useState('expenses'); // expenses | sessions | rates
  
  // Filters
  const [periodType, setPeriodType] = useState('month'); // day | week | month | custom
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [selectedStaff, setSelectedStaff] = useState('ALL');
  const [staffList, setStaffList] = useState([]);

  // Data
  const [rates, setRates] = useState([]);
  const [dailyExpenses, setDailyExpenses] = useState([]);
  const [sessions, setSessions] = useState([]);
  
  // Drill Down State
  const [expandedDay, setExpandedDay] = useState(null);
  const [dayDetails, setDayDetails] = useState(null);
  const [loadingDay, setLoadingDay] = useState(false);

  // Rate Modal
  const [showRateModal, setShowRateModal] = useState(false);
  const [newRateValue, setNewRateValue] = useState('');
  const [newRateEffective, setNewRateEffective] = useState('');
  const [savingRate, setSavingRate] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Expanded row state for Weekly/Monthly (All Staff)
  const [expandedStaff, setExpandedStaff] = useState({});

  // Workflow State
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditData, setAuditData] = useState([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (userProfile?.role === 'Admin') {
      fetchStaffList();
      fetchRates();
    }
  }, [userProfile]);

  useEffect(() => {
    // When Field Assistant logs in, lock to their ID
    if (userProfile && userProfile.role !== 'Admin') {
      setSelectedStaff(userProfile.id);
    }
  }, [userProfile]);

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    } else if (activeTab === 'expenses') {
      fetchAggregatedExpenses();
    }
  }, [activeTab, selectedDate, periodType, customStart, customEnd, selectedStaff, userProfile]);

  const getPeriodBounds = () => {
    if (activeTab === 'sessions') return { start: selectedDate, end: selectedDate };
    
    if (periodType === 'day') return { start: selectedDate, end: selectedDate };
    if (periodType === 'week') return { start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) };
    if (periodType === 'month') return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
    if (periodType === 'custom') return { start: parseISO(customStart) || new Date(), end: parseISO(customEnd) || new Date() };
    return { start: selectedDate, end: selectedDate };
  };

  const periodBounds = getPeriodBounds();
  const startStr = format(periodBounds.start, 'yyyy-MM-dd');
  const endStr = format(periodBounds.end, 'yyyy-MM-dd');

  const fetchStaffList = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, display_name')
        .eq('is_active', true)
        .neq('role', 'Admin')
        .order('display_name');
      if (error) throw error;
      setStaffList(data || []);
    } catch (err) {
      console.error('Error fetching staff list:', err);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const query = supabase
        .from('staff_tracking_sessions')
        .select(`*, app_users:staff_id ( display_name ), staff_travel_segments ( * )`)
        .eq('business_date', startStr)
        .order('started_at', { ascending: false });

      if (userProfile?.role !== 'Admin') query.eq('staff_id', userProfile?.id);
      else if (selectedStaff !== 'ALL') query.eq('staff_id', selectedStaff);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching travel sessions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAggregatedExpenses = async () => {
    try {
      setLoading(true);
      const query = supabase
        .from('daily_travel_expenses')
        .select(`*, app_users:staff_id ( display_name )`)
        .gte('business_date', startStr)
        .lte('business_date', endStr)
        .order('business_date', { ascending: false });
        
      if (userProfile?.role !== 'Admin') {
        query.eq('staff_id', userProfile?.id);
      } else if (selectedStaff !== 'ALL') {
        query.eq('staff_id', selectedStaff);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDailyExpenses(data || []);
      setExpandedStaff({});
      setExpandedDay(null);
      setDayDetails(null);
    } catch (err) {
      console.error('Error fetching daily expenses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDayExpand = async (dayRecord) => {
    if (expandedDay === dayRecord.business_date) {
      setExpandedDay(null);
      setDayDetails(null);
      return;
    }
    setExpandedDay(dayRecord.business_date);
    setLoadingDay(true);
    try {
      const { data: sessionData, error: sessionErr } = await supabase
        .from('staff_tracking_sessions')
        .select('*')
        .eq('business_date', dayRecord.business_date)
        .eq('staff_id', dayRecord.staff_id)
        .single();
      
      let segments = [];
      let visits = [];
      
      if (sessionData && !sessionErr) {
        const { data: segData } = await supabase
          .from('staff_travel_segments')
          .select('*')
          .eq('tracking_session_id', sessionData.id)
          .order('from_timestamp', { ascending: true });
        
        if (segData) segments = segData;
        
        const visitIds = [...new Set([
          ...segments.filter(s => s.to_type === 'VISIT' && s.to_reference_id).map(s => s.to_reference_id),
          ...segments.filter(s => s.from_type === 'VISIT' && s.from_reference_id).map(s => s.from_reference_id)
        ])];
        
        if (visitIds.length > 0) {
          const { data: visitData } = await supabase
            .from('crm_visits')
            .select(`id, crm_parties(company_name), purpose`)
            .in('id', visitIds);
          if (visitData) visits = visitData;
        }
      }
      
      setDayDetails({
        session: sessionData || null,
        segments,
        visits
      });
    } catch (err) {
      console.error('Error loading day details:', err);
    } finally {
      setLoadingDay(false);
    }
  };

  const fetchRates = async () => {
    try {
      const { data, error } = await supabase
        .from('travel_expense_rates')
        .select(`*, app_users:created_by ( display_name )`)
        .order('effective_from', { ascending: false });
      if (error) throw error;
      setRates(data || []);
    } catch (err) {
      console.error('Error fetching rates:', err);
    }
  };

  const handleCreateRate = async (e) => {
    e.preventDefault();
    if (!newRateValue || !newRateEffective) return;
    try {
      setSavingRate(true);
      const effectiveTz = new Date(newRateEffective).toISOString();
      const { error } = await supabase.rpc('set_travel_rate', {
        p_rate_per_km: parseFloat(newRateValue),
        p_effective_from: effectiveTz
      });
      if (error) throw error;
      setShowRateModal(false);
      setNewRateValue('');
      setNewRateEffective('');
      fetchRates();
    } catch (err) {
      alert(err.message || 'Failed to set travel rate');
    } finally {
      setSavingRate(false);
    }
  };

  const handleTransition = async (expenseId, newStatus, reason = null) => {
    try {
      setTransitioning(true);
      const { data, error } = await supabase.rpc('transition_travel_expense_status', {
        p_expense_id: expenseId,
        p_new_status: newStatus,
        p_reason: reason
      });
      if (error) throw error;
      
      // Update local state
      setDailyExpenses(prev => prev.map(exp => 
        exp.id === expenseId ? { ...exp, workflow_status: newStatus } : exp
      ));
      
      if (newStatus === 'REJECTED') {
        setShowRejectModal(false);
        setRejectReason('');
        setRejectTargetId(null);
      }
    } catch (err) {
      alert(err.message || `Failed to transition expense to ${newStatus}`);
    } finally {
      setTransitioning(false);
    }
  };

  const loadAudits = async (expenseId) => {
    try {
      setLoadingAudits(true);
      setShowAuditModal(true);
      const { data, error } = await supabase
        .from('daily_travel_expense_audits')
        .select(`*, app_users:actor_id (display_name)`)
        .eq('expense_id', expenseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAuditData(data || []);
    } catch (err) {
      console.error('Error fetching audits:', err);
    } finally {
      setLoadingAudits(false);
    }
  };

  const changePeriod = (direction) => {
    if (periodType === 'custom') return; // use custom inputs
    const base = selectedDate;
    if (activeTab === 'sessions' || periodType === 'day') {
      setSelectedDate(direction === 'next' ? addDays(base, 1) : subDays(base, 1));
    } else if (periodType === 'week') {
      setSelectedDate(direction === 'next' ? addWeeks(base, 1) : subWeeks(base, 1));
    } else if (periodType === 'month') {
      setSelectedDate(direction === 'next' ? addMonths(base, 1) : subMonths(base, 1));
    }
  };

  const getStatusColor = (status) => {
    if (status === 'CALCULATED' || status === 'ALL_CALCULATED') return '#2e7d32';
    if (status === 'PENDING' || status === 'OPEN') return '#ed6c02';
    if (status === 'REVIEW_REQUIRED' || status === 'RATE_ALLOCATION_REQUIRES_REVIEW' || status === 'DISTANCE_UNAVAILABLE') return '#d32f2f';
    return '#9e9e9e'; 
  };

  // ----------------------------------------------------
  // Aggregation Logic (Client Side)
  // ----------------------------------------------------
  const aggregatedData = {};
  let summaryTotalKm = 0;
  let summaryTotalAmount = 0;
  let summaryTotalDays = 0;
  let overallStatus = 'ALL_CALCULATED';

  dailyExpenses.forEach(exp => {
    const sId = exp.staff_id;
    if (!aggregatedData[sId]) {
      aggregatedData[sId] = {
        staff_id: sId,
        display_name: exp.app_users?.display_name || 'Unknown',
        total_km: 0,
        total_amount: 0,
        expense_days: 0,
        records: [],
        status: 'ALL_CALCULATED'
      };
    }
    
    const agg = aggregatedData[sId];
    agg.records.push(exp);
    agg.expense_days += 1;
    summaryTotalDays += 1;
    
    if (exp.total_distance_km != null) {
      agg.total_km += Number(exp.total_distance_km);
      summaryTotalKm += Number(exp.total_distance_km);
    }
    if (exp.calculated_amount != null) {
      agg.total_amount += Number(exp.calculated_amount);
      summaryTotalAmount += Number(exp.calculated_amount);
    }
    if (exp.status !== 'CALCULATED') {
      agg.status = 'REVIEW_REQUIRED';
      overallStatus = 'REVIEW_REQUIRED';
    }
  });

  const aggregatedArray = Object.values(aggregatedData).sort((a, b) => a.display_name.localeCompare(b.display_name));
  
  // If specific staff selected, their summary is just the total of their records
  const staffSummary = selectedStaff !== 'ALL' ? aggregatedData[selectedStaff] || { total_km: 0, total_amount: 0, expense_days: 0, status: 'ALL_CALCULATED', records: [] } : null;

  const handleDownloadPDF = async () => {
    if (selectedStaff === 'ALL' || !staffSummary) return;
    
    setGeneratingPDF(true);
    try {
      const emp = staffList.find(s => s.id === selectedStaff);
      const empName = emp ? emp.display_name : 'Employee';
      const pString = (periodType === 'day' || activeTab === 'sessions') 
        ? format(periodBounds.start, 'MMM d, yyyy') 
        : periodType === 'week' 
        ? `${format(periodBounds.start, 'MMM d')} - ${format(periodBounds.end, 'MMM d, yyyy')}` 
        : periodType === 'month' 
        ? format(periodBounds.start, 'MMMM yyyy')
        : `${format(periodBounds.start, 'MMM d, yyyy')} - ${format(periodBounds.end, 'MMM d, yyyy')}`;
      
      const pdfBlob = generateTravelExpensePDF(staffSummary, pString, empName);
      const filename = `ShubhLabh_TravelExpense_${empName.replace(/[^a-zA-Z0-9]/g, '_')}_${startStr}_${endStr}.pdf`;
      
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      
      // Native Sharing if supported
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Travel Expense Report',
            text: `Travel Expense Report for ${empName}`
          });
          setGeneratingPDF(false);
          return;
        } catch (shareError) {
          console.log('Share API failed or user cancelled, falling back to download', shareError);
        }
      }
      
      // Fallback Download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF report.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={28} style={{ color: 'var(--primary)' }} />
            Travel Expenses
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {activeTab === 'rates' ? 'Manage Travel Reimbursement Rates' : 'Authoritative GPS Travel Expense Financials'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {userProfile?.role === 'Admin' && (
            <div style={{ display: 'flex', background: 'var(--bg-surface)', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
              {['expenses', 'sessions', 'rates'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    background: activeTab === tab ? 'var(--bg-base-hover)' : 'transparent', 
                    border: 'none', 
                    borderRight: tab !== 'rates' ? '1px solid var(--border)' : 'none',
                    fontWeight: activeTab === tab ? 'bold' : 'normal', 
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab === 'sessions' ? 'Tracking' : tab}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} />
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* FILTER BAR for Reports */}
      {activeTab !== 'rates' && (
        <div className="glass-panel" style={{ padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
          
          {userProfile?.role === 'Admin' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} style={{ color: 'var(--text-secondary)' }} />
              <select 
                className="form-control" 
                value={selectedStaff} 
                onChange={(e) => setSelectedStaff(e.target.value)}
                style={{ padding: '0.5rem', width: '200px' }}
                disabled={loading}
              >
                <option value="ALL">All Staff</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
              </select>
            </div>
          )}

          {activeTab === 'expenses' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
              <select 
                className="form-control" 
                value={periodType} 
                onChange={(e) => setPeriodType(e.target.value)}
                style={{ padding: '0.5rem', width: '150px' }}
                disabled={loading}
              >
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          )}

          {periodType === 'custom' && activeTab === 'expenses' ? (
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <input type="date" className="form-control" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ padding: '0.5rem' }} disabled={loading} />
               <span>to</span>
               <input type="date" className="form-control" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ padding: '0.5rem' }} disabled={loading} />
             </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => changePeriod('prev')} disabled={loading}>
                <ChevronLeft size={18} />
              </button>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', minWidth: '150px', textAlign: 'center' }}>
                {activeTab === 'sessions' || periodType === 'day' ? format(periodBounds.start, 'MMM d, yyyy') :
                 periodType === 'week' ? `${format(periodBounds.start, 'MMM d')} - ${format(periodBounds.end, 'MMM d, yyyy')}` :
                 format(periodBounds.start, 'MMMM yyyy')}
              </div>
              <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => changePeriod('next')} disabled={loading}>
                <ChevronRight size={18} />
              </button>
            </div>
          )}

            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
            {loading && <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading...</span>}
            
            {activeTab === 'expenses' && selectedStaff !== 'ALL' && (
              <button 
                className="btn btn-primary" 
                onClick={handleDownloadPDF}
                disabled={generatingPDF || loading || staffSummary?.records?.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Download size={18} />
                {generatingPDF ? 'Generating...' : 'Export PDF'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <>
          {/* SUMMARY CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>TOTAL GPS DISTANCE</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {selectedStaff === 'ALL' ? summaryTotalKm.toFixed(2) : staffSummary?.total_km.toFixed(2)} KM
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>TOTAL EXPENSE</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                ₹{selectedStaff === 'ALL' ? summaryTotalAmount.toFixed(2) : staffSummary?.total_amount.toFixed(2)}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>EXPENSE DAYS</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {selectedStaff === 'ALL' ? summaryTotalDays : staffSummary?.expense_days}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>STATUS</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: getStatusColor(selectedStaff === 'ALL' ? overallStatus : staffSummary?.status) }}>
                {selectedStaff === 'ALL' ? overallStatus : staffSummary?.status}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                {selectedStaff === 'ALL' ? 'Staff Breakdown' : 'Daily Expenses'}
              </h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  {selectedStaff === 'ALL' ? (
                    <tr style={{ backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Staff</th>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Working Days</th>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Total GPS KM</th>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Total Expense</th>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Status</th>
                    </tr>
                  ) : (
                    <tr style={{ backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Date</th>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>GPS KM</th>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Applicable Rate</th>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Daily Expense</th>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Calc Status</th>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Workflow</th>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {selectedStaff === 'ALL' ? (
                    aggregatedArray.length === 0 ? (
                      <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No expenses for this period.</td></tr>
                    ) : aggregatedArray.map(agg => (
                      <tr key={agg.staff_id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{agg.display_name}</td>
                        <td style={{ padding: '1rem' }}>{agg.expense_days} Days</td>
                        <td style={{ padding: '1rem', fontWeight: '500' }}>{agg.total_km.toFixed(2)} KM</td>
                        <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>₹{agg.total_amount.toFixed(2)}</td>
                        <td colSpan="3" style={{ padding: '1rem', color: getStatusColor(agg.status), fontWeight: 'bold', fontSize: '0.75rem' }}>{agg.status}</td>
                      </tr>
                    ))
                  ) : (
                    dailyExpenses.length === 0 ? (
                      <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No daily expenses found.</td></tr>
                    ) : dailyExpenses.map(exp => {
                      const isExpanded = expandedDay === exp.business_date;
                      const statusColor = getStatusColor(exp.status);
                      return (
                        <React.Fragment key={exp.id}>
                          <tr 
                            style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)', cursor: 'pointer', backgroundColor: isExpanded ? 'var(--bg-base)' : 'transparent' }}
                            onClick={() => handleDayExpand(exp)}
                          >
                            <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {isExpanded ? <ChevronRight style={{ transform: 'rotate(90deg)' }} size={16} /> : <ChevronRight size={16} />}
                              {format(parseISO(exp.business_date), 'EEE, MMM d, yyyy')}
                            </td>
                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{exp.total_distance_km != null ? `${Number(exp.total_distance_km).toFixed(2)} KM` : '-'}</td>
                            <td style={{ padding: '1rem' }}>{exp.applicable_rate_per_km != null ? `₹${Number(exp.applicable_rate_per_km).toFixed(2)}/KM` : '-'}</td>
                            <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>{exp.calculated_amount != null ? `₹${Number(exp.calculated_amount).toFixed(2)}` : '-'}</td>
                            <td style={{ padding: '1rem', color: statusColor, fontWeight: 'bold', fontSize: '0.75rem' }}>{exp.status}</td>
                            <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                              <span style={{ 
                                padding: '0.25rem 0.5rem', 
                                borderRadius: '0.25rem',
                                border: '1px solid currentColor',
                                color: exp.workflow_status === 'APPROVED' || exp.workflow_status === 'PAID' ? '#2e7d32' :
                                       exp.workflow_status === 'REJECTED' ? '#d32f2f' :
                                       exp.workflow_status === 'UNDER_REVIEW' ? '#1976d2' : '#ed6c02'
                              }}>
                                {exp.workflow_status || 'DRAFT'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                              <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => loadAudits(exp.id)}>
                                History
                              </button>
                            </td>
                          </tr>
                          
                          {/* DRILL DOWN PANEL */}
                          {isExpanded && (
                            <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-base)' }}>
                              <td colSpan="7" style={{ padding: '0 1rem 1.5rem 2.5rem' }}>
                                <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                                  
                                  {/* WORKFLOW ACTION BAR */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Workflow Actions</h4>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      {(exp.workflow_status === 'DRAFT' || exp.workflow_status === 'REJECTED') && (userProfile?.role === 'Admin' || userProfile?.id === exp.staff_id) && exp.status === 'CALCULATED' && (
                                        <button className="btn btn-primary" onClick={() => handleTransition(exp.id, 'SUBMITTED')} disabled={transitioning}>Submit Expense</button>
                                      )}
                                      {exp.workflow_status === 'SUBMITTED' && userProfile?.role === 'Admin' && (
                                        <button className="btn btn-secondary" onClick={() => handleTransition(exp.id, 'UNDER_REVIEW')} disabled={transitioning}>Start Review</button>
                                      )}
                                      {exp.workflow_status === 'UNDER_REVIEW' && userProfile?.role === 'Admin' && (
                                        <>
                                          <button className="btn btn-primary" style={{ backgroundColor: '#2e7d32', borderColor: '#2e7d32' }} onClick={() => handleTransition(exp.id, 'APPROVED')} disabled={transitioning}>Approve</button>
                                          <button className="btn btn-outline" style={{ color: '#d32f2f', borderColor: '#d32f2f' }} onClick={() => { setRejectTargetId(exp.id); setShowRejectModal(true); }} disabled={transitioning}>Reject</button>
                                        </>
                                      )}
                                      {exp.workflow_status === 'APPROVED' && userProfile?.role === 'Admin' && (
                                        <button className="btn btn-primary" onClick={() => handleTransition(exp.id, 'PAID')} disabled={transitioning}>Mark Paid</button>
                                      )}
                                    </div>
                                  </div>

                                  <h4 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Activity size={18} style={{ color: 'var(--primary)' }}/> Tracking Session & Segment Details
                                  </h4>
                                  {loadingDay ? (
                                    <div style={{ color: 'var(--text-secondary)' }}>Loading session details...</div>
                                  ) : !dayDetails?.session ? (
                                    <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No tracking session data found for this business date.</div>
                                  ) : (
                                    <div>
                                      {/* SESSION SUMMARY */}
                                      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                        <div>
                                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>START</span>
                                          <strong>{format(parseISO(dayDetails.session.started_at), 'HH:mm:ss')}</strong>
                                        </div>
                                        <div>
                                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>END</span>
                                          <strong>{dayDetails.session.ended_at ? format(parseISO(dayDetails.session.ended_at), 'HH:mm:ss') : 'Active/Open'}</strong>
                                        </div>
                                        <div>
                                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>VALIDATED GPS KM</span>
                                          <strong>{dayDetails.session.total_distance_km != null ? `${Number(dayDetails.session.total_distance_km).toFixed(2)} KM` : '-'}</strong>
                                        </div>
                                        <div>
                                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>SEGMENT COUNT</span>
                                          <strong>{dayDetails.segments.length} segments</strong>
                                        </div>
                                      </div>

                                      {/* SEGMENTS TABLE */}
                                      {dayDetails.segments.length > 0 && (
                                        <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                                          <thead>
                                            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                                              <th style={{ padding: '0.5rem' }}>Time</th>
                                              <th style={{ padding: '0.5rem' }}>From</th>
                                              <th style={{ padding: '0.5rem' }}>To</th>
                                              <th style={{ padding: '0.5rem' }}>Distance</th>
                                              <th style={{ padding: '0.5rem' }}>Status</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {dayDetails.segments.map(seg => {
                                              const findCustomer = (type, refId) => {
                                                if (type === 'VISIT' && refId) {
                                                  const visit = dayDetails.visits.find(v => v.id === refId);
                                                  return visit?.crm_parties?.company_name ? `Visit: ${visit.crm_parties.company_name}` : 'Visit (Unknown)';
                                                }
                                                return type;
                                              };
                                              return (
                                                <tr key={seg.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                  <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>
                                                    {format(parseISO(seg.from_timestamp), 'HH:mm')} - {format(parseISO(seg.to_timestamp), 'HH:mm')}
                                                  </td>
                                                  <td style={{ padding: '0.5rem' }}>{findCustomer(seg.from_type, seg.from_reference_id)}</td>
                                                  <td style={{ padding: '0.5rem' }}>{findCustomer(seg.to_type, seg.to_reference_id)}</td>
                                                  <td style={{ padding: '0.5rem', fontWeight: '500' }}>{Number(seg.distance_km).toFixed(2)} KM</td>
                                                  <td style={{ padding: '0.5rem' }}>{seg.status}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SESSIONS TAB */}
      {activeTab === 'sessions' && (
        <div className="glass-panel" style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Daily Tracking Sessions</h2>
          </div>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No tracking sessions found for {startStr}.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Staff</th>
                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Start</th>
                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>End</th>
                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>GPS Distance</th>
                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => (
                    <tr key={session.id} style={{ borderBottom: '1px solid var(--border)', ':hover': { backgroundColor: 'var(--bg-base)' } }}>
                      <td style={{ padding: '1rem', fontWeight: '500' }}>{session.app_users?.display_name}</td>
                      <td style={{ padding: '1rem' }}>{format(parseISO(session.started_at), 'HH:mm:ss')}</td>
                      <td style={{ padding: '1rem' }}>{session.ended_at ? format(parseISO(session.ended_at), 'HH:mm:ss') : '--'}</td>
                      <td style={{ padding: '1rem', fontWeight: '500' }}>{session.total_distance_km != null ? `${Number(session.total_distance_km).toFixed(2)} KM` : '-'}</td>
                      <td style={{ padding: '1rem' }}>{session.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RATES TAB */}
      {activeTab === 'rates' && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={24} style={{ color: 'var(--primary)' }} /> Travel Reimbursement Rates
            </h2>
            <button className="btn btn-primary" onClick={() => setShowRateModal(true)}>
              <Plus size={18} /> Add Rate
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Rate (₹ / KM)</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Effective From</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Effective To</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Created By</th>
                </tr>
              </thead>
              <tbody>
                {rates.map(rate => {
                  const now = new Date();
                  const ef = new Date(rate.effective_from);
                  const et = rate.effective_to ? new Date(rate.effective_to) : null;
                  let st = 'Historical'; let stC = '#9e9e9e';
                  if (rate.status === 'CANCELLED') { st = 'Cancelled'; stC = '#d32f2f'; }
                  else if (ef > now) { st = 'Upcoming'; stC = '#1976d2'; }
                  else if (!et || et > now) { st = 'Current'; stC = '#2e7d32'; }
                  return (
                    <tr key={rate.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem' }}><span style={{ padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${stC}`, color: stC }}>{st}</span></td>
                      <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>₹{Number(rate.rate_per_km).toFixed(2)}</td>
                      <td style={{ padding: '1rem' }}>{format(ef, 'PP pp')}</td>
                      <td style={{ padding: '1rem' }}>{et ? format(et, 'PP pp') : '-'}</td>
                      <td style={{ padding: '1rem' }}>{rate.app_users?.display_name || 'Admin'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showRateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', borderRadius: '0.75rem', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Configure Rate</h3>
              <button onClick={() => setShowRateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-secondary)" /></button>
            </div>
            <form onSubmit={handleCreateRate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.85rem' }}>Rate (₹ / KM)</label>
                <input type="number" step="0.01" min="0.01" className="form-control" style={{ width: '100%', padding: '0.75rem' }} value={newRateValue} onChange={e => setNewRateValue(e.target.value)} required />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.85rem' }}>Effective From</label>
                <input type="datetime-local" className="form-control" style={{ width: '100%', padding: '0.75rem' }} value={newRateEffective} onChange={e => setNewRateEffective(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingRate}>{savingRate ? 'Saving...' : 'Confirm Rate'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', borderRadius: '0.75rem', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#d32f2f' }}>Reject Expense</h3>
              <button onClick={() => setShowRejectModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-secondary)" /></button>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.85rem' }}>Reason for Rejection *</label>
              <textarea 
                className="form-control" 
                style={{ width: '100%', padding: '0.75rem', minHeight: '100px' }} 
                value={rejectReason} 
                onChange={e => setRejectReason(e.target.value)} 
                placeholder="Required..."
                required 
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" style={{ backgroundColor: '#d32f2f', borderColor: '#d32f2f' }} onClick={() => handleTransition(rejectTargetId, 'REJECTED', rejectReason)} disabled={transitioning || !rejectReason.trim()}>
                {transitioning ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Modal */}
      {showAuditModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '1.5rem', borderRadius: '0.75rem', backgroundColor: 'var(--bg-surface)', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'sticky', top: 0, backgroundColor: 'var(--bg-surface)', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Expense Audit History</h3>
              <button onClick={() => setShowAuditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-secondary)" /></button>
            </div>
            {loadingAudits ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading history...</div>
            ) : auditData.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No audit history found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {auditData.map(audit => (
                  <div key={audit.id} style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-base)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold' }}>{audit.new_status}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{format(parseISO(audit.created_at), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <div><strong>From:</strong> {audit.previous_status}</div>
                      <div><strong>By:</strong> {audit.app_users?.display_name || 'System'}</div>
                      {audit.reason && <div style={{ marginTop: '0.5rem', color: 'var(--text-primary)' }}><strong>Reason:</strong> {audit.reason}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
