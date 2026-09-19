import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../AuthContext';
import { MapPin, Clock, CheckCircle, Activity, Map, ArrowRight, Settings, Plus, X, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths, addDays, subDays } from 'date-fns';

export default function TravelExpenses() {
  const { userProfile } = useContext(AuthContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Navigation
  const [activeTab, setActiveTab] = useState('sessions'); // sessions | daily | weekly | monthly | rates
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState('ALL');
  const [staffList, setStaffList] = useState([]);

  // Data
  const [rates, setRates] = useState([]);
  const [dailyExpenses, setDailyExpenses] = useState([]);
  
  // Rate Modal
  const [showRateModal, setShowRateModal] = useState(false);
  const [newRateValue, setNewRateValue] = useState('');
  const [newRateEffective, setNewRateEffective] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  // Expanded row state for Weekly/Monthly
  const [expandedStaff, setExpandedStaff] = useState({});

  useEffect(() => {
    if (userProfile?.role === 'Admin') {
      fetchStaffList();
      fetchRates();
    }
  }, [userProfile]);

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    } else if (activeTab === 'daily' || activeTab === 'weekly' || activeTab === 'monthly') {
      fetchAggregatedExpenses();
    }
  }, [activeTab, selectedDate, selectedStaff, userProfile]);

  const getPeriodBounds = () => {
    if (activeTab === 'daily' || activeTab === 'sessions') {
      return { start: selectedDate, end: selectedDate };
    }
    if (activeTab === 'weekly') {
      return { start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) };
    }
    if (activeTab === 'monthly') {
      return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
    }
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
        .eq('role', 'Field Assistant')
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
      setExpandedStaff({}); // reset expansions on period change
    } catch (err) {
      console.error('Error fetching daily expenses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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

  const handleCancelFutureRate = async (rateId) => {
    if (!window.confirm('Cancel this future scheduled rate?')) return;
    try {
      const { error } = await supabase
        .from('travel_expense_rates')
        .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
        .eq('id', rateId);
      if (error) throw error;
      fetchRates();
    } catch (err) {
      alert(err.message);
    }
  };

  const changePeriod = (direction) => {
    if (activeTab === 'daily' || activeTab === 'sessions') {
      setSelectedDate(direction === 'next' ? addDays(selectedDate, 1) : subDays(selectedDate, 1));
    } else if (activeTab === 'weekly') {
      setSelectedDate(direction === 'next' ? addWeeks(selectedDate, 1) : subWeeks(selectedDate, 1));
    } else if (activeTab === 'monthly') {
      setSelectedDate(direction === 'next' ? addMonths(selectedDate, 1) : subMonths(selectedDate, 1));
    }
  };

  const getStatusColor = (status) => {
    if (status === 'CALCULATED' || status === 'ALL_CALCULATED') return '#2e7d32';
    if (status === 'PENDING' || status === 'OPEN') return '#ed6c02';
    if (status === 'REVIEW_REQUIRED' || status === 'RATE_ALLOCATION_REQUIRES_REVIEW') return '#d32f2f';
    return '#9e9e9e'; // Unavailable etc
  };

  const toggleExpand = (staffId) => {
    setExpandedStaff(prev => ({ ...prev, [staffId]: !prev[staffId] }));
  };

  // Aggregation Logic for Weekly / Monthly
  const aggregatedData = {};
  if (activeTab === 'weekly' || activeTab === 'monthly') {
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
      
      if (exp.total_distance_km != null) {
        agg.total_km += Number(exp.total_distance_km);
      }
      if (exp.calculated_amount != null) {
        agg.total_amount += Number(exp.calculated_amount);
      }
      if (exp.status !== 'CALCULATED') {
        agg.status = 'REVIEW_REQUIRED';
      }
    });
  }

  const aggregatedArray = Object.values(aggregatedData).sort((a, b) => a.display_name.localeCompare(b.display_name));
  
  // Calculate Totals for Summary Cards
  let summaryTotalKm = 0;
  let summaryTotalAmount = 0;
  let summaryTotalDays = 0;
  
  if (activeTab === 'weekly' || activeTab === 'monthly') {
    aggregatedArray.forEach(agg => {
      summaryTotalKm += agg.total_km;
      summaryTotalAmount += agg.total_amount;
      summaryTotalDays += agg.expense_days;
    });
  } else if (activeTab === 'daily') {
    dailyExpenses.forEach(exp => {
      if (exp.total_distance_km != null) summaryTotalKm += Number(exp.total_distance_km);
      if (exp.calculated_amount != null) summaryTotalAmount += Number(exp.calculated_amount);
      summaryTotalDays += 1;
    });
  }

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
              {['sessions', 'daily', 'weekly', 'monthly', 'rates'].map(tab => (
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
        <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* FILTER BAR for Reports */}
      {activeTab !== 'rates' && (
        <div className="glass-panel" style={{ padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => changePeriod('prev')} disabled={loading}>
              <ChevronLeft size={18} />
            </button>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', minWidth: '150px', textAlign: 'center' }}>
              {activeTab === 'monthly' ? format(periodBounds.start, 'MMMM yyyy') : 
               activeTab === 'weekly' ? `${format(periodBounds.start, 'MMM d')} - ${format(periodBounds.end, 'MMM d, yyyy')}` :
               format(periodBounds.start, 'MMM d, yyyy')}
            </div>
            <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => changePeriod('next')} disabled={loading}>
              <ChevronRight size={18} />
            </button>
          </div>

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

          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            {loading && <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading...</span>}
          </div>
        </div>
      )}

      {/* SUMMARY CARDS */}
      {(activeTab === 'daily' || activeTab === 'weekly' || activeTab === 'monthly') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>TOTAL GPS DISTANCE</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{summaryTotalKm.toFixed(2)} KM</div>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>TOTAL CALCULATED EXPENSE</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>₹{summaryTotalAmount.toFixed(2)}</div>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>EXPENSE DAYS</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{summaryTotalDays}</div>
          </div>
          {activeTab === 'monthly' && (
             <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
               <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>AVG EXPENSE / DAY</div>
               <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>₹{summaryTotalDays ? (summaryTotalAmount / summaryTotalDays).toFixed(2) : '0.00'}</div>
             </div>
          )}
        </div>
      )}

      {/* RENDER ACTIVE TAB */}
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

      {activeTab === 'daily' && (
        <div className="glass-panel" style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Daily Expenses</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Staff</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Distance (KM)</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Applicable Rate</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Amount</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {dailyExpenses.length === 0 && !loading ? (
                  <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No expenses for this period.</td></tr>
                ) : dailyExpenses.map(expense => {
                  const statusColor = getStatusColor(expense.status);
                  return (
                    <tr key={expense.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem', fontWeight: '500' }}>{expense.app_users?.display_name || 'Unknown'}</td>
                      <td style={{ padding: '1rem', fontWeight: 'bold' }}>{expense.total_distance_km != null ? `${Number(expense.total_distance_km).toFixed(2)} KM` : '-'}</td>
                      <td style={{ padding: '1rem' }}>{expense.applicable_rate_per_km != null ? `₹${Number(expense.applicable_rate_per_km).toFixed(2)}/KM` : '-'}</td>
                      <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.1rem', color: expense.calculated_amount != null ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {expense.calculated_amount != null ? `₹${Number(expense.calculated_amount).toFixed(2)}` : '-'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${statusColor}`, color: statusColor, display: 'inline-block' }}>
                          {expense.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(activeTab === 'weekly' || activeTab === 'monthly') && (
        <div className="glass-panel" style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', textTransform: 'capitalize' }}>{activeTab} Aggregation</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Staff</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Working Days</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Total GPS KM</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Total Expense</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Aggregation Status</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedArray.length === 0 && !loading ? (
                  <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No aggregated expenses for this period.</td></tr>
                ) : aggregatedArray.map(agg => {
                  const statusColor = getStatusColor(agg.status);
                  const isExpanded = expandedStaff[agg.staff_id];
                  return (
                    <React.Fragment key={agg.staff_id}>
                      <tr 
                        style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)', cursor: 'pointer', backgroundColor: isExpanded ? 'var(--bg-base)' : 'transparent' }}
                        onClick={() => toggleExpand(agg.staff_id)}
                      >
                        <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {isExpanded ? <ChevronRight style={{ transform: 'rotate(90deg)', transition: '0.2s' }} size={16} /> : <ChevronRight size={16} style={{ transition: '0.2s' }} />}
                            {agg.display_name}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>{agg.expense_days} Days</td>
                        <td style={{ padding: '1rem', fontWeight: '500' }}>{agg.total_km.toFixed(2)} KM</td>
                        <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>₹{agg.total_amount.toFixed(2)}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${statusColor}`, color: statusColor, display: 'inline-block' }}>
                            {agg.status}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-base)' }}>
                          <td colSpan="5" style={{ padding: '0 1rem 1.5rem 2.5rem' }}>
                            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                              <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Daily Breakdown</h4>
                              <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '0.5rem' }}>Date</th>
                                    <th style={{ padding: '0.5rem' }}>GPS KM</th>
                                    <th style={{ padding: '0.5rem' }}>Rate</th>
                                    <th style={{ padding: '0.5rem' }}>Amount</th>
                                    <th style={{ padding: '0.5rem' }}>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {agg.records.sort((a,b) => a.business_date.localeCompare(b.business_date)).map(exp => (
                                    <tr key={exp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                      <td style={{ padding: '0.5rem', fontWeight: '500' }}>{format(parseISO(exp.business_date), 'EEE, MMM d')}</td>
                                      <td style={{ padding: '0.5rem' }}>{exp.total_distance_km != null ? `${Number(exp.total_distance_km).toFixed(2)} KM` : '-'}</td>
                                      <td style={{ padding: '0.5rem' }}>{exp.applicable_rate_per_km != null ? `₹${Number(exp.applicable_rate_per_km).toFixed(2)}/KM` : '-'}</td>
                                      <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{exp.calculated_amount != null ? `₹${Number(exp.calculated_amount).toFixed(2)}` : '-'}</td>
                                      <td style={{ padding: '0.5rem', color: getStatusColor(exp.status) }}>{exp.status}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                  <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Action</th>
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
                      <td style={{ padding: '1rem' }}>{st === 'Upcoming' && <button onClick={() => handleCancelFutureRate(rate.id)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#d32f2f', borderColor: '#d32f2f' }}>Cancel</button>}</td>
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
    </div>
  );
}
