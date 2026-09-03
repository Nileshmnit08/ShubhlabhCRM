import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar, Clock, AlertCircle, CheckCircle2, Phone, MessageSquare, RefreshCw, User, X } from 'lucide-react';
import { LanguageContext } from '../../LanguageContext';
import { logActivity } from '../../lib/activityLogger';
import FollowUpReport from './FollowUpReport';

export default function FollowUpList() {
  const [followUps, setFollowUps] = useState([]);
  const [financials, setFinancials] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Today'); // Today, Overdue, Upcoming, Completed
  
  // Sticky Filters
  const [filterType, setFilterType] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Call Queue State
  const [isCalling, setIsCalling] = useState(false);
  const [callQueue, setCallQueue] = useState([]);
  const [currentCallIndex, setCurrentCallIndex] = useState(0);
  const [callOutcome, setCallOutcome] = useState('');
  const [callRescheduleDate, setCallRescheduleDate] = useState('');
  
  // Summary Stats
  const [summary, setSummary] = useState({ dueToday: 0, overdue: 0, tomorrow: 0, thisWeek: 0, highPriority: 0, completedToday: 0 });

  const { t } = useContext(LanguageContext);

  useEffect(() => {
    fetchFollowUps();
    fetchSummary();
  }, [activeTab]);

  const fetchSummary = async () => {
    // Quick separate query for summary stats just to be accurate across tabs
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    
    const nextWeek = new Date(todayStart);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data } = await supabase.from('follow_ups').select('id, due_at, status, priority, completed_at').neq('status', 'Cancelled');
    
    if (data) {
        let s = { dueToday: 0, overdue: 0, tomorrow: 0, thisWeek: 0, highPriority: 0, completedToday: 0 };
        data.forEach(item => {
            if (item.status === 'Completed') {
                if (item.completed_at && new Date(item.completed_at) >= todayStart) {
                    s.completedToday++;
                }
                return;
            }
            
            const due = new Date(item.due_at);
            if (due < todayStart) s.overdue++;
            if (due >= todayStart && due < todayEnd) s.dueToday++;
            if (due >= todayEnd && due < tomorrowEnd) s.tomorrow++;
            if (due >= todayStart && due < nextWeek) s.thisWeek++;
            if (item.priority === 'High') s.highPriority++;
        });
        setSummary(s);
    }
  };

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      let query = supabase.from('follow_ups')
        .select(`*, crm_parties ( id, display_name, mobile, crm_status, city )`)
        .order('due_at', { ascending: true, nullsFirst: false });

      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      if (activeTab === 'Completed') {
        query = query.eq('status', 'Completed').order('completed_at', { ascending: false });
      } else if (activeTab === 'Report') {
        setLoading(false);
        return;
      } else {
        query = query.neq('status', 'Completed').neq('status', 'Cancelled');
        
        if (activeTab === 'Overdue') {
          query = query.lt('due_at', todayStart.toISOString());
        } else if (activeTab === 'Today') {
          query = query.lt('due_at', todayEnd.toISOString());
        } else if (activeTab === 'Upcoming') {
          // All future ones including tomorrow, next week etc.
          // Wait, "Today" tab should only show overdue and today.
          // So "Upcoming" is all open follow-ups >= todayEnd
          query = query.gte('due_at', todayEnd.toISOString());
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let items = data || [];
      
      if (activeTab === 'Today') {
          items.sort((a, b) => {
              const aDue = new Date(a.due_at);
              const bDue = new Date(b.due_at);
              const aOverdue = aDue < todayStart;
              const bOverdue = bDue < todayStart;
              if (aOverdue && !bOverdue) return -1;
              if (!aOverdue && bOverdue) return 1;
              return aDue - bDue;
          });
      }
      
      // Also in Upcoming tab, fetch items where reminder is today but due is future.
      if (activeTab === 'Upcoming') {
          const { data: reminderData } = await supabase.from('follow_ups')
            .select(`*, crm_parties ( id, display_name, mobile, crm_status, city )`)
            .neq('status', 'Completed')
            .neq('status', 'Cancelled')
            .gte('due_at', todayEnd.toISOString())
            .gte('reminder_at', todayStart.toISOString())
            .lt('reminder_at', todayEnd.toISOString());
            
          if (reminderData && reminderData.length > 0) {
              // Ensure we don't duplicate
              const existingIds = new Set(items.map(i => i.id));
              reminderData.forEach(r => {
                  if (!existingIds.has(r.id)) {
                      items.push(r);
                  }
              });
              items.sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
          }
      }
      
      setFollowUps(items);
      
      const paymentParties = items.filter(i => i.follow_up_type === 'Payment').map(i => i.party_id);
      const uniqueParties = [...new Set(paymentParties)];
      
      if (uniqueParties.length > 0) {
        const { data: finData } = await supabase.from('v_customer_master')
          .select('id, outstanding_balance')
          .in('id', uniqueParties);
          
        if (finData) {
            const finMap = {};
            finData.forEach(f => { finMap[f.id] = f.outstanding_balance; });
            setFinancials(finMap);
        }
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status, type, manualNextDate = null) => {
    try {
      if (status === 'Completed' && !manualNextDate && (type === 'Payment' || type === 'Lead')) {
        alert(`${type} tasks require a structured outcome. You will be redirected to the task form.`);
        window.location.href = `/follow-ups/${id}/edit`;
        return;
      }

      const updates = { status };
      const { data: session } = await supabase.auth.getSession();
      
      if (status === 'Completed') {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = session?.session?.user?.id || null;
      }
      
      if (manualNextDate) {
          // If rescheduled
          updates.due_at = new Date(manualNextDate).toISOString();
          updates.status = 'Pending';
      }
      
      const { error } = await supabase.from('follow_ups').update(updates).eq('id', id);
      if (error) throw error;
      
      logActivity({
        module: 'FollowUps',
        actionType: manualNextDate ? 'UPDATED' : (status === 'Completed' ? 'COMPLETED' : 'REOPENED'),
        entityType: 'follow_ups',
        entityId: id,
        summary: manualNextDate ? 'Rescheduled follow-up' : `Marked follow-up as ${status}`
      });

      fetchFollowUps();
      fetchSummary();
    } catch (err) {
      console.error(err);
      alert(t('msg.error'));
    }
  };

  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  
  const filteredItems = followUps.filter(f => {
    if (filterType !== 'All' && f.follow_up_type !== filterType) return false;
    if (filterPriority !== 'All' && f.priority !== filterPriority) return false;
    if (filterStatus !== 'All' && f.status !== filterStatus) return false;
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = (
          f.reason?.toLowerCase().includes(q) ||
          f.notes?.toLowerCase().includes(q) ||
          f.crm_parties?.display_name?.toLowerCase().includes(q) ||
          f.crm_parties?.mobile?.includes(q) ||
          f.crm_parties?.city?.toLowerCase().includes(q)
        );
        if (!matches) return false;
    }
    return true;
  });

  const groupedUpcoming = {};
  if (activeTab === 'Upcoming') {
      filteredItems.forEach(item => {
          const d = new Date(item.due_at);
          d.setHours(0,0,0,0);
          const key = d.toISOString();
          if (!groupedUpcoming[key]) groupedUpcoming[key] = [];
          groupedUpcoming[key].push(item);
      });
  }
  
  const formatGroupHeader = (isoString) => {
      const d = new Date(isoString);
      const tomorrow = new Date(todayStart);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (d.getTime() === tomorrow.getTime()) return `Tomorrow — ${d.toLocaleDateString('en-GB', {day:'numeric', month:'short'})}`;
      return `${d.toLocaleDateString('en-GB', {weekday:'long'})} — ${d.toLocaleDateString('en-GB', {day:'numeric', month:'short'})}`;
  };

  const startCalling = () => {
      if (filteredItems.length === 0) return;
      
      // Sort: High priority -> amount pending -> due time
      const queue = [...filteredItems].sort((a, b) => {
          if (a.priority === 'High' && b.priority !== 'High') return -1;
          if (b.priority === 'High' && a.priority !== 'High') return 1;
          
          const aAmount = financials[a.party_id] || 0;
          const bAmount = financials[b.party_id] || 0;
          if (bAmount !== aAmount) return bAmount - aAmount;
          
          return new Date(a.due_at) - new Date(b.due_at);
      });
      
      setCallQueue(queue);
      setCurrentCallIndex(0);
      setIsCalling(true);
      setCallOutcome('');
      setCallRescheduleDate('');
  };
  
  const handleCallNext = async () => {
      const current = callQueue[currentCallIndex];
      
      if (callOutcome === 'Completed') {
          // If payment or lead, force to use standard form, else just mark complete.
          if (current.follow_up_type === 'Payment' || current.follow_up_type === 'Lead') {
              window.open(`/follow-ups/${current.id}/edit`, '_blank');
              // We won't automatically complete it here, user has to do it in the form.
          } else {
              await updateStatus(current.id, 'Completed', current.follow_up_type);
          }
      } else if (callOutcome === 'Callback Later Today') {
          const d = new Date();
          d.setHours(18, 0, 0, 0); // 6 PM
          await updateStatus(current.id, 'Pending', current.follow_up_type, d.toISOString());
      } else if (callOutcome === 'Rescheduled' && callRescheduleDate) {
          await updateStatus(current.id, 'Pending', current.follow_up_type, callRescheduleDate);
      } else {
          alert('Please select an outcome.');
          return;
      }
      
      setCallOutcome('');
      setCallRescheduleDate('');
      
      if (currentCallIndex < callQueue.length - 1) {
          setCurrentCallIndex(currentCallIndex + 1);
      } else {
          setIsCalling(false);
          alert('Call queue completed!');
          fetchFollowUps();
      }
  };

  return (
    <div className="animate-fade-in" style={{paddingBottom: '4rem'}}>
      <div className="page-header">
        <div>
          <h1>{t('nav.today') === 'Today' ? 'Daily Work Board' : 'फॉलो-अप (Follow-ups)'}</h1>
          <p className="text-secondary" style={{marginTop: '0.25rem'}}>Manage your daily actions and upcoming tasks.</p>
        </div>
        <Link to="/follow-ups/new" className="btn btn-primary">
          <Plus size={18} /> {t('btn.newFollowUp')}
        </Link>
      </div>
      
      {/* Summary Cards */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '1.5rem'}}>
          {[
              { label: 'Due Today', value: summary.dueToday, color: 'var(--primary)', tab: 'Today' },
              { label: 'Overdue', value: summary.overdue, color: 'var(--danger)', tab: 'Overdue' },
              { label: 'Tomorrow', value: summary.tomorrow, color: 'var(--warning)', tab: 'Upcoming' },
              { label: 'This Week', value: summary.thisWeek, color: 'var(--success)', tab: 'Upcoming' },
              { label: 'High Priority', value: summary.highPriority, color: 'var(--text-primary)', filter: 'High' },
              { label: 'Completed', value: summary.completedToday, color: 'var(--success)', tab: 'Completed' },
          ].map((card, i) => (
              <div key={i} className="glass-panel" style={{padding: '1rem', textAlign: 'center', cursor: 'pointer', borderTop: `3px solid ${card.color}`}} onClick={() => {
                  if (card.tab) setActiveTab(card.tab);
                  if (card.filter) setFilterPriority(card.filter);
              }}>
                  <div style={{fontSize: '1.5rem', fontWeight: 700, color: card.color}}>{card.value}</div>
                  <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{card.label}</div>
              </div>
          ))}
      </div>

      {/* Toolbar */}
      <div className="glass-panel" style={{padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center'}}>
        <div style={{position: 'relative', flex: '1 1 250px'}}>
          <Search size={18} className="text-secondary" style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)'}} />
          <input 
            type="text" 
            placeholder={t('list.searchPlaceholder') || 'Search...'}
            style={{paddingLeft: '2.5rem', width: '100%', background: 'var(--bg-surface)'}}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {activeTab !== 'Report' && (
          <>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{background: 'var(--bg-surface)'}}>
                <option value="All">All Types</option>
                <option value="Payment">Payment</option>
                <option value="Lead">Lead</option>
                <option value="Commercial">Commercial</option>
                <option value="General">General</option>
            </select>
            
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{background: 'var(--bg-surface)'}}>
                <option value="All">All Priorities</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
            </select>
          </>
        )}
        
        {activeTab === 'Today' && (
            <button className="btn btn-primary" onClick={startCalling} disabled={filteredItems.length === 0}>
                <Phone size={16} /> Start Calling ({filteredItems.length})
            </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto'}}>
        {['Today', 'Overdue', 'Upcoming', 'Completed', 'Report'].map(tab => (
          <button 
            key={tab}
            className={`nav-item ${activeTab === tab ? 'active' : ''}`} 
            style={{borderRadius: 0, padding: '0.75rem 1rem', whiteSpace: 'nowrap'}} 
            onClick={() => { setActiveTab(tab); setFilterType('All'); setFilterPriority('All'); }}
          >
            {t(`nav.${tab.toLowerCase()}`)}
          </button>
        ))}
      </div>

      {/* List */}
      {activeTab === 'Report' ? (
        <FollowUpReport searchQuery={searchQuery} />
      ) : loading ? (
        <div style={{padding: '3rem', textAlign: 'center'}}>Loading...</div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel" style={{padding: '4rem 2rem', textAlign: 'center'}}>
          <CheckCircle2 size={48} className="text-muted" style={{margin: '0 auto 1rem', opacity: 0.5}} />
          <h2 style={{marginBottom: '0.5rem'}}>{t('list.emptyTitle')}</h2>
          <p className="text-secondary">{t('list.emptyDesc')}</p>
        </div>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
          {activeTab === 'Upcoming' ? (
              // Grouped by Date
              Object.keys(groupedUpcoming).sort().map(dateKey => (
                  <div key={dateKey}>
                      <h3 style={{marginBottom: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <Calendar size={18} /> {formatGroupHeader(dateKey)} ({groupedUpcoming[dateKey].length})
                      </h3>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                          {groupedUpcoming[dateKey].map(item => <FollowUpCard key={item.id} item={item} financials={financials} updateStatus={updateStatus} activeTab={activeTab} todayStart={todayStart} t={t} />)}
                      </div>
                  </div>
              ))
          ) : (
              // Flat List
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                  {filteredItems.map(item => <FollowUpCard key={item.id} item={item} financials={financials} updateStatus={updateStatus} activeTab={activeTab} todayStart={todayStart} t={t} />)}
              </div>
          )}
        </div>
      )}
      
      {/* Calling Modal */}
      {isCalling && callQueue.length > 0 && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'}}>
              <div className="glass-panel" style={{width: '100%', maxWidth: '600px', background: 'var(--bg-card)', position: 'relative', padding: '2rem'}}>
                  <button onClick={() => setIsCalling(false)} style={{position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'}}>
                      <X size={24} />
                  </button>
                  
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: 'var(--text-muted)'}}>
                      <span>Today's Call Queue</span>
                      <span>{currentCallIndex + 1} / {callQueue.length}</span>
                  </div>
                  
                  {callQueue[currentCallIndex] && (
                      <div style={{marginBottom: '2rem'}}>
                          <h2 style={{fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary)'}}>
                              {callQueue[currentCallIndex].crm_parties?.display_name || 'Unknown'}
                          </h2>
                          <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                              <a href={`tel:${callQueue[currentCallIndex].crm_parties?.mobile}`} className="btn btn-primary" style={{flex: 1, padding: '0.75rem', justifyContent: 'center'}}>
                                  <Phone size={18} /> Call {callQueue[currentCallIndex].crm_parties?.mobile}
                              </a>
                              <a href={`https://wa.me/91${callQueue[currentCallIndex].crm_parties?.mobile?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{flex: 1, padding: '0.75rem', justifyContent: 'center'}}>
                                  <MessageSquare size={18} /> WhatsApp
                              </a>
                          </div>
                          
                          <div style={{padding: '1rem', background: 'var(--bg-surface)', borderRadius: '8px'}}>
                              <p><strong>Type:</strong> {callQueue[currentCallIndex].follow_up_type}</p>
                              <p><strong>Reason:</strong> {callQueue[currentCallIndex].reason}</p>
                              {callQueue[currentCallIndex].notes && <p><strong>Notes:</strong> {callQueue[currentCallIndex].notes}</p>}
                              {financials[callQueue[currentCallIndex].party_id] !== undefined && (
                                  <p style={{color: 'var(--danger)', fontWeight: 600}}><strong>Pending Amount:</strong> ₹{financials[callQueue[currentCallIndex].party_id].toLocaleString('en-IN')}</p>
                              )}
                          </div>
                      </div>
                  )}
                  
                  <div style={{borderTop: '1px solid var(--border)', paddingTop: '1.5rem'}}>
                      <h4 style={{marginBottom: '1rem'}}>Call Outcome</h4>
                      <div style={{display: 'flex', gap: '0.75rem', marginBottom: '1rem'}}>
                          <button className={`btn ${callOutcome === 'Completed' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCallOutcome('Completed')}>Completed</button>
                          <button className={`btn ${callOutcome === 'Callback Later Today' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCallOutcome('Callback Later Today')}>Callback Later Today</button>
                          <button className={`btn ${callOutcome === 'Rescheduled' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCallOutcome('Rescheduled')}>Rescheduled</button>
                      </div>
                      
                      {callOutcome === 'Rescheduled' && (
                          <div style={{marginBottom: '1rem'}}>
                              <label>Select Next Action Date & Time:</label>
                              <input type="datetime-local" style={{width: '100%', marginTop: '0.5rem'}} value={callRescheduleDate} onChange={e => setCallRescheduleDate(e.target.value)} />
                          </div>
                      )}
                      
                      <button className="btn btn-primary" style={{width: '100%', padding: '0.75rem', justifyContent: 'center'}} onClick={handleCallNext}>
                          Save & Next <RefreshCw size={16} />
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

function FollowUpCard({ item, financials, updateStatus, activeTab, todayStart, t }) {
    const isOverdue = new Date(item.due_at) < todayStart && item.status !== 'Completed';
    const isReminderToday = item.reminder_at && new Date(item.reminder_at) >= todayStart && new Date(item.reminder_at) < new Date(todayStart.getTime() + 86400000);
    const amount = financials[item.party_id];

    return (
        <div className="glass-panel" style={{
            padding: '1.25rem', 
            display: 'flex', 
            justifyContent: 'space-between', 
            gap: '1rem', 
            borderLeft: item.priority === 'High' ? '4px solid var(--danger)' : '4px solid transparent',
            position: 'relative',
            overflow: 'hidden'
        }}>
          <div style={{flex: 1}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap'}}>
              <Link to={item.crm_parties?.crm_status === 'Lead' ? `/leads/${item.party_id}` : `/customers/${item.party_id}`} style={{fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                <User size={16} /> {item.crm_parties?.display_name || 'Unknown'}
              </Link>
              
              <span className="badge" style={{background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)'}}>{item.follow_up_type}</span>
              <span className="badge" style={{background: item.priority === 'High' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.1)', color: item.priority === 'High' ? 'var(--danger)' : 'var(--text-secondary)'}}>
                {t(`priority.${item.priority}`)}
              </span>
              
              {isOverdue && <span className="badge" style={{background: 'var(--danger)', color: '#fff'}}>OVERDUE</span>}
              {activeTab === 'Upcoming' && isReminderToday && (
                  <span className="badge" style={{background: 'var(--warning)', color: '#000'}}>
                      <Clock size={12} style={{marginRight: '0.25rem'}} /> Reminder Today
                  </span>
              )}
            </div>
            
            <div style={{fontWeight: 500, marginBottom: '0.25rem', fontSize: '0.95rem'}}>{item.reason}</div>
            
            {item.notes && <div className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.75rem', maxHeight: '2.5rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>{item.notes}</div>}
            
            {amount !== undefined && (
                <div style={{color: 'var(--danger)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem'}}>
                    Amount Pending: ₹{amount.toLocaleString('en-IN')}
                </div>
            )}
            
            <div style={{display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)'}}>
              <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem', color: isOverdue ? 'var(--danger)' : 'inherit'}}>
                <Calendar size={14} /> Action Due: {item.due_at ? new Date(item.due_at).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'}) : 'No date'}
              </span>
              {item.reminder_at && (
                <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                  <Clock size={14} /> Remind: {new Date(item.reminder_at).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'})}
                </span>
              )}
              {item.crm_parties?.city && (
                  <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                      • {item.crm_parties.city}
                  </span>
              )}
            </div>
          </div>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'flex-start', minWidth: '120px'}}>
            <Link to={`/follow-ups/${item.id}/edit`} className="btn btn-secondary" style={{padding: '0.4rem 0.75rem', fontSize: '0.85rem', justifyContent: 'center'}}>
              Edit
            </Link>
            
            <a href={`tel:${item.crm_parties?.mobile}`} className="btn btn-primary" style={{padding: '0.4rem 0.75rem', fontSize: '0.85rem', justifyContent: 'center'}}>
              <Phone size={14} /> Call
            </a>
            
            {item.status !== 'Completed' ? (
              <button className="btn btn-secondary" style={{padding: '0.4rem 0.75rem', fontSize: '0.85rem', justifyContent: 'center', color: 'var(--success)', borderColor: 'var(--success)'}} onClick={() => updateStatus(item.id, 'Completed', item.follow_up_type)}>
                <CheckCircle2 size={14} /> Complete
              </button>
            ) : (
              <button className="btn btn-secondary" style={{padding: '0.4rem 0.75rem', fontSize: '0.85rem', justifyContent: 'center'}} onClick={() => updateStatus(item.id, 'Pending', item.follow_up_type)}>
                Reopen
              </button>
            )}
          </div>
        </div>
    );
}
