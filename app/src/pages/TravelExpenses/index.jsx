import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../AuthContext';
import { MapPin, Clock, CheckCircle, Activity, Map, ArrowRight, Settings, Plus, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function TravelExpenses() {
  const { userProfile } = useContext(AuthContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('sessions'); // sessions | daily | rates
  const [rates, setRates] = useState([]);
  const [dailyExpenses, setDailyExpenses] = useState([]);
  
  // New Rate Form State
  const [showRateModal, setShowRateModal] = useState(false);
  const [newRateValue, setNewRateValue] = useState('');
  const [newRateEffective, setNewRateEffective] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  // This sprint shows Today's period and All Staff (or current staff if restricted by RLS)
  const today = format(new Date(), 'yyyy-MM-dd');
  
  useEffect(() => {
    fetchSessions();
    fetchDailyExpenses();
    if (userProfile?.role === 'Admin') {
      fetchRates();
    }
  }, [userProfile]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      // Fetch sessions for today
      // RLS handles the filtering if it's a staff member. Admins see all.
      // We also join with app_users to get the staff name.
      const { data, error: fetchError } = await supabase
        .from('staff_tracking_sessions')
        .select(`
          *,
          app_users:staff_id ( display_name ),
          staff_travel_segments ( * )
        `)
        .eq('business_date', today)
        .order('started_at', { ascending: false });

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

  const fetchDailyExpenses = async () => {
    try {
      // For Admins fetch all, for staff fetch their own
      const query = supabase
        .from('daily_travel_expenses')
        .select(`*, app_users:staff_id ( display_name )`)
        .eq('business_date', today)
        .order('created_at', { ascending: false });
        
      if (userProfile?.role !== 'Admin') {
        query.eq('staff_id', userProfile?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDailyExpenses(data || []);
    } catch (err) {
      console.error('Error fetching daily expenses:', err);
    }
  };

  const handleCreateRate = async (e) => {
    e.preventDefault();
    if (!newRateValue || !newRateEffective) return;
    
    try {
      setSavingRate(true);
      const effectiveTz = new Date(newRateEffective).toISOString();
      const { data, error } = await supabase.rpc('set_travel_rate', {
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

  const totalSessions = sessions.length;
  const openSessions = sessions.filter(s => s.status === 'OPEN').length;
  const closedSessions = sessions.filter(s => s.status === 'CLOSED').length;

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={28} style={{ color: 'var(--primary)' }} />
            Travel Expenses
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {activeTab === 'rates' ? 'Manage Travel Reimbursement Rates' : `Period: Today (${today}) • Staff: All Staff`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {userProfile?.role === 'Admin' && (
            <div style={{ display: 'flex', background: 'var(--bg-surface)', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <button 
                onClick={() => setActiveTab('sessions')}
                style={{ padding: '0.5rem 1rem', background: activeTab === 'sessions' ? 'var(--bg-base-hover)' : 'transparent', border: 'none', fontWeight: activeTab === 'sessions' ? 'bold' : 'normal', cursor: 'pointer' }}
              >
                Tracking Sessions
              </button>
              <button 
                onClick={() => setActiveTab('daily')}
                style={{ padding: '0.5rem 1rem', background: activeTab === 'daily' ? 'var(--bg-base-hover)' : 'transparent', border: 'none', fontWeight: activeTab === 'daily' ? 'bold' : 'normal', cursor: 'pointer' }}
              >
                Daily Expenses
              </button>
              <button 
                onClick={() => setActiveTab('rates')}
                style={{ padding: '0.5rem 1rem', background: activeTab === 'rates' ? 'var(--bg-base-hover)' : 'transparent', border: 'none', fontWeight: activeTab === 'rates' ? 'bold' : 'normal', cursor: 'pointer' }}
              >
                Rate Settings
              </button>
            </div>
          )}
          {activeTab === 'sessions' && (
            <button className="btn btn-secondary" onClick={fetchSessions} disabled={loading}>
              <Activity size={18} /> Refresh
            </button>
          )}
          {activeTab === 'daily' && (
            <button className="btn btn-secondary" onClick={fetchDailyExpenses} disabled={loading}>
              <Activity size={18} /> Refresh
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

        </div>
      )}

      {activeTab === 'sessions' ? (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>TRACKING SESSIONS</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalSessions}</div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>OPEN SESSIONS</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {openSessions}
                <Clock size={20} />
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>CLOSED SESSIONS</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {closedSessions}
                <CheckCircle size={20} />
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="glass-panel" style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Daily Tracking Sessions</h2>
            </div>
            
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No travel tracking sessions found for this period.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Staff</th>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Start</th>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>End</th>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>GPS Distance KM</th>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Status</th>
                      <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Location Overview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(session => {
                      const segments = session.staff_travel_segments || [];
                      segments.sort((a, b) => new Date(a.from_timestamp) - new Date(b.from_timestamp));
                      const sumSegmentDist = segments.reduce((sum, seg) => sum + Number(seg.distance_km || 0), 0);
                      const needsReconciliation = session.status === 'CLOSED' && Math.abs(sumSegmentDist - Number(session.total_distance_km || 0)) > 0.05;

                      return (
                        <React.Fragment key={session.id}>
                          <tr style={{ borderBottom: segments.length === 0 ? '1px solid var(--border)' : 'none', ':hover': { backgroundColor: 'var(--bg-base)' } }}>
                            <td style={{ padding: '1rem' }}>
                              <div style={{ fontWeight: '500' }}>{session.app_users?.display_name || 'Unknown Staff'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{session.staff_id.substring(0,8)}...</div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <div>{format(parseISO(session.started_at), 'HH:mm:ss')}</div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <div>{session.ended_at ? format(parseISO(session.ended_at), 'HH:mm:ss') : '--:--:--'}</div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <div style={{ fontWeight: '500' }}>
                                {session.total_distance_km != null ? `${Number(session.total_distance_km).toFixed(2)} KM` : <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Distance unavailable</span>}
                              </div>
                              {needsReconciliation && (
                                <div style={{ fontSize: '0.7rem', color: '#d32f2f', marginTop: '0.25rem', fontWeight: 'bold' }}>
                                  Distance reconciliation requires review.
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '1rem',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                backgroundColor: session.status === 'OPEN' ? '#fff3e0' : '#e8f5e9',
                                color: session.status === 'OPEN' ? '#e65100' : '#2e7d32'
                              }}>
                                {session.status}
                              </span>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                <Map size={14} style={{ color: 'var(--text-secondary)' }} />
                                <span title={`Lat: ${session.started_latitude}, Lng: ${session.started_longitude}`}>
                                  {session.started_latitude ? `${Number(session.started_latitude).toFixed(4)}, ${Number(session.started_longitude).toFixed(4)}` : 'Unknown'}
                                </span>
                                {session.ended_latitude && (
                                  <>
                                    <ArrowRight size={14} style={{ color: 'var(--text-secondary)' }} />
                                    <span title={`Lat: ${session.ended_latitude}, Lng: ${session.ended_longitude}`}>
                                      {`${Number(session.ended_latitude).toFixed(4)}, ${Number(session.ended_longitude).toFixed(4)}`}
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {segments.length > 0 && (
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                              <td colSpan="6" style={{ padding: '0 1rem 1rem 1rem' }}>
                                <div style={{ backgroundColor: 'var(--bg-base)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                                  <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Travel Segments</h4>
                                  <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '0.5rem' }}>From</th>
                                        <th style={{ padding: '0.5rem' }}>To</th>
                                        <th style={{ padding: '0.5rem' }}>Start Time</th>
                                        <th style={{ padding: '0.5rem' }}>End Time</th>
                                        <th style={{ padding: '0.5rem' }}>GPS KM</th>
                                        <th style={{ padding: '0.5rem' }}>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {segments.map(seg => (
                                        <tr key={seg.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                          <td style={{ padding: '0.5rem' }}>{seg.from_type}</td>
                                          <td style={{ padding: '0.5rem' }}>{seg.to_type}</td>
                                          <td style={{ padding: '0.5rem' }}>{format(parseISO(seg.from_timestamp), 'HH:mm:ss')}</td>
                                          <td style={{ padding: '0.5rem' }}>{format(parseISO(seg.to_timestamp), 'HH:mm:ss')}</td>
                                          <td style={{ padding: '0.5rem', fontWeight: '500' }}>{Number(seg.distance_km).toFixed(2)} KM</td>
                                          <td style={{ padding: '0.5rem' }}>
                                            <span style={{ color: seg.status === 'COMPLETED' ? '#2e7d32' : 'inherit' }}>{seg.status}</span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr>
                                        <td colSpan="4" style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>SUM:</td>
                                        <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{sumSegmentDist.toFixed(2)} KM</td>
                                        <td></td>
                                      </tr>
                                    </tfoot>
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
            )}
          </div>
        </>
      ) : activeTab === 'daily' ? (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Daily Travel Expenses
            </h2>
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
                {dailyExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No daily expenses generated for this period.
                    </td>
                  </tr>
                ) : dailyExpenses.map(expense => {
                  let statusColor = '#9e9e9e';
                  if (expense.status === 'CALCULATED') statusColor = '#2e7d32';
                  if (expense.status === 'PENDING' || expense.status === 'OPEN') statusColor = '#ed6c02';
                  if (expense.status === 'REVIEW_REQUIRED' || expense.status === 'RATE_ALLOCATION_REQUIRES_REVIEW') statusColor = '#d32f2f';

                  return (
                    <tr key={expense.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem', fontWeight: '500' }}>
                        {expense.app_users?.display_name || 'Unknown Staff'}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                        {expense.total_distance_km != null ? `${Number(expense.total_distance_km).toFixed(2)} KM` : '-'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {expense.applicable_rate_per_km != null ? `₹${Number(expense.applicable_rate_per_km).toFixed(2)}/KM` : '-'}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.1rem', color: expense.calculated_amount != null ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {expense.calculated_amount != null ? `₹${Number(expense.calculated_amount).toFixed(2)}` : '-'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${statusColor}`, color: statusColor, display: 'inline-block' }}>
                          {expense.status}
                        </span>
                        {expense.snapshot_data && expense.status === 'REVIEW_REQUIRED' && (
                           <div style={{ fontSize: '0.7rem', color: '#d32f2f', marginTop: '0.25rem', maxWidth: '200px' }}>
                             Distance mismatch: Session {Number(expense.snapshot_data.session_km).toFixed(2)} vs Segments {Number(expense.snapshot_data.segment_km).toFixed(2)}
                           </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
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
                {rates.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No rates configured.
                    </td>
                  </tr>
                ) : rates.map(rate => {
                  const now = new Date();
                  const effectiveFrom = new Date(rate.effective_from);
                  const effectiveTo = rate.effective_to ? new Date(rate.effective_to) : null;
                  
                  let displayStatus = 'Historical';
                  let statusColor = '#9e9e9e';
                  if (rate.status === 'CANCELLED') {
                    displayStatus = 'Cancelled';
                    statusColor = '#d32f2f';
                  } else if (effectiveFrom > now) {
                    displayStatus = 'Upcoming';
                    statusColor = '#1976d2';
                  } else if (!effectiveTo || effectiveTo > now) {
                    displayStatus = 'Current';
                    statusColor = '#2e7d32';
                  }

                  return (
                    <tr key={rate.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${statusColor}`, color: statusColor }}>
                          {displayStatus}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                        ₹{Number(rate.rate_per_km).toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {format(effectiveFrom, 'PP pp')}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {effectiveTo ? format(effectiveTo, 'PP pp') : '-'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {rate.app_users?.display_name || 'Admin'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {displayStatus === 'Upcoming' && (
                          <button onClick={() => handleCancelFutureRate(rate.id)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#d32f2f', borderColor: '#d32f2f' }}>
                            Cancel
                          </button>
                        )}
                      </td>
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
              <button onClick={() => setShowRateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>
            
            <form onSubmit={handleCreateRate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.85rem' }}>Rate (₹ / KM)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0.01"
                  className="form-control" 
                  style={{ width: '100%', padding: '0.75rem' }}
                  value={newRateValue} 
                  onChange={e => setNewRateValue(e.target.value)} 
                  required 
                />
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.85rem' }}>Effective From</label>
                <input 
                  type="datetime-local" 
                  className="form-control" 
                  style={{ width: '100%', padding: '0.75rem' }}
                  value={newRateEffective} 
                  onChange={e => setNewRateEffective(e.target.value)} 
                  required 
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  If future dated, the current rate will apply until this time.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingRate}>
                  {savingRate ? 'Saving...' : 'Confirm Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
