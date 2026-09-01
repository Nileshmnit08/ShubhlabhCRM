import React, { useEffect, useState, useContext, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, AlertCircle, Clock, Phone, ChevronRight, 
  BarChart3, AlertTriangle, Users, Plus, FileText, 
  CheckCircle2, Activity, UserPlus, FileEdit, ClipboardList, Target, MapPin, 
  Search, Bell, ArrowRight, Truck, IndianRupee
} from 'lucide-react';
import CreateDispatchModal from './Requirements/CreateDispatchModal';

export default function Today() {
  const { userProfile } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [data, setData] = useState({
    kpis: { overdueActions: 0, dueTodayActions: 0, readyToDispatchCount: 0, overduePaymentCount: 0, openServiceIssuesCount: 0 },
    myPriorities: [],
    operations: { openReqs: 0, pendingDispatches: 0, pendingQuotes: 0, topReqs: [] },
    collections: { overdueCount: 0, overdueAmount: 0, todayCount: 0, todayAmount: 0, topPayments: [] },
    issues: { openCount: 0, criticalCount: 0, topIssues: [] },
    atAGlance: { growthOpps: 0, dormant: 0, unassigned: 0, openReqs: 0 },
    recentActivity: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [dispatchModalReq, setDispatchModalReq] = useState(null);
  
  const newMenuRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (newMenuRef.current && !newMenuRef.current.contains(event.target)) {
        setNewMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchDashboardData() {
    if (!userProfile) return;
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      
      const isAdmin = userProfile?.role === 'Admin';
      const ownerId = userProfile?.id;

      // 1. Fetch Follow-ups
      let fuQuery = supabase.from('follow_ups')
        .select(`*, crm_parties ( id, display_name, assigned_owner_id ), owner:app_users!follow_ups_assigned_to_fkey(display_name)`)
        .eq('status', 'Pending');
      
      const { data: allPendingFu } = await fuQuery;
      let allAccessibleFu = (allPendingFu || []).filter(f => f.crm_parties !== null);
      
      if (!isAdmin) {
         allAccessibleFu = allAccessibleFu.filter(f => f.assigned_to === ownerId || f.crm_parties.assigned_owner_id === ownerId);
      }
      
      let paymentTasks = [];
      let otherTasks = [];
      
      allAccessibleFu.forEach(f => {
        if (f.follow_up_type === 'Payment') paymentTasks.push(f);
        else otherTasks.push(f);
      });
      
      // Financials for payment tasks
      const partyIds = [...new Set(paymentTasks.map(f => f.party_id))];
      let financialsMap = {};
      if (partyIds.length > 0) {
        const { data: finData } = await supabase.from('v_customer_financials').select('party_id, outstanding_balance').in('party_id', partyIds);
        if (finData) {
          finData.forEach(fin => financialsMap[fin.party_id] = fin.outstanding_balance);
        }
      }
      paymentTasks = paymentTasks.map(f => ({ ...f, amount: financialsMap[f.party_id] || 0 }));

      // 2. Fetch Issues
      let issuesQuery = supabase.from('crm_issues')
         .select(`*, crm_parties(id, display_name), owner:app_users!crm_issues_assigned_owner_id_fkey(display_name)`)
         .not('status', 'in', '("Resolved","Closed")');
      
      if (!isAdmin) issuesQuery = issuesQuery.eq('assigned_owner_id', ownerId);
      const { data: issuesData } = await issuesQuery;
      const issues = issuesData || [];

      // 3. Process My Priorities
      const isUrgent = (task, dateField) => {
        if (['High', 'Urgent', 'Critical'].includes(task.priority)) return true;
        if (task[dateField] <= todayStr) return true;
        return false;
      };

      const myFu = otherTasks.filter(t => (t.assigned_to === ownerId || t.crm_parties.assigned_owner_id === ownerId) && isUrgent(t, 'follow_up_date'));
      const myPayments = paymentTasks.filter(t => (t.assigned_to === ownerId || t.crm_parties.assigned_owner_id === ownerId) && isUrgent(t, 'follow_up_date'));
      const myIssues = issues.filter(t => t.assigned_owner_id === ownerId && isUrgent(t, 'created_at'));

      const unifiedMyPriorities = [
        ...myFu.map(t => ({ ...t, _type: 'follow_up', _date: t.follow_up_date, _label: t.reason || t.follow_up_type, _isOverdue: t.follow_up_date < todayStr, _isToday: t.follow_up_date === todayStr })),
        ...myPayments.map(t => ({ ...t, _type: 'payment', _date: t.follow_up_date, _label: 'Payment Collection', _isOverdue: t.follow_up_date < todayStr, _isToday: t.follow_up_date === todayStr })),
        ...myIssues.map(t => ({ ...t, _type: 'issue', _date: t.created_at.split('T')[0], _label: t.category || 'Service Issue', _isOverdue: true, _isToday: false }))
      ];

      const pWeight = { 'Critical': 4, 'High': 3, 'Urgent': 3, 'Normal': 2, 'Low': 1 };
      unifiedMyPriorities.sort((a, b) => {
        if (a._isOverdue && !b._isOverdue) return -1;
        if (!a._isOverdue && b._isOverdue) return 1;
        if (a._isToday && !b._isToday) return -1;
        if (!a._isToday && b._isToday) return 1;
        const priA = pWeight[a.priority || 'Normal'] || 2;
        const priB = pWeight[b.priority || 'Normal'] || 2;
        if (priA !== priB) return priB - priA;
        return a._date.localeCompare(b._date);
      });
      
      const myPrioritiesLimited = unifiedMyPriorities.slice(0, 8);

      // 4. KPI Cards
      const overdueActions = otherTasks.filter(t => t.follow_up_date < todayStr).length;
      const dueTodayActions = otherTasks.filter(t => t.follow_up_date === todayStr).length;
      
      const { data: reqsData } = await supabase.from('v_board_requirements').select('*').in('status', ['Won', 'Dispatched']);
      let readyToDispatchCount = 0;
      let urgentReqs = [];
      if (reqsData) {
        reqsData.forEach(r => {
           if (r.pending_quantity > 0 || (r.pending_quantity === null && r.required_quantity > 0)) {
             readyToDispatchCount++;
             urgentReqs.push(r);
           }
        });
      }
      urgentReqs.sort((a, b) => {
        if (!a.expected_date) return 1;
        if (!b.expected_date) return -1;
        return a.expected_date.localeCompare(b.expected_date);
      });
      const topUrgentReqs = urgentReqs.slice(0, 3);

      const overduePaymentTasks = paymentTasks.filter(t => t.follow_up_date < todayStr);
      const openServiceIssuesCount = issues.length;

      // 5. Collections
      const dueTodayPaymentTasks = paymentTasks.filter(t => t.follow_up_date === todayStr);
      const overduePaymentAmount = overduePaymentTasks.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const dueTodayPaymentAmount = dueTodayPaymentTasks.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const topActionablePayments = [...overduePaymentTasks, ...dueTodayPaymentTasks].sort((a, b) => {
         const pA = a.follow_up_date < todayStr ? 1 : 0;
         const pB = b.follow_up_date < todayStr ? 1 : 0;
         if (pA !== pB) return pB - pA;
         return Number(b.amount || 0) - Number(a.amount || 0);
      }).slice(0, 3);

      // 6. Issues
      const criticalIssuesCount = issues.filter(i => i.priority === 'Critical' || i.priority === 'High').length;
      const topIssues = issues.sort((a, b) => {
         const pA = (a.priority === 'Critical' || a.priority === 'High') ? 1 : 0;
         const pB = (b.priority === 'Critical' || b.priority === 'High') ? 1 : 0;
         if (pA !== pB) return pB - pA;
         return a.created_at.localeCompare(b.created_at);
      }).slice(0, 3);

      // 7. Operations & At a Glance
      const { count: openReqsCount } = await supabase.from('v_open_requirements').select('*', { count: 'exact', head: true });
      const { count: pendingQuotesCount } = await supabase.from('v_open_requirements').select('*', { count: 'exact', head: true }).eq('status', 'Quotation Required');
      const { count: growthOppsCount } = await supabase.from('v_customer_opportunities').select('*', { count: 'exact', head: true });
      const { count: dormantCount } = await supabase.from('v_customer_attention').select('*', { count: 'exact', head: true }).eq('attention_reason', 'Dormant Candidate');
      
      let unassignedCount = 0;
      if (isAdmin) {
         const { count: uCount } = await supabase.from('crm_parties').select('*', { count: 'exact', head: true }).is('assigned_owner_id', null);
         unassignedCount = uCount || 0;
      }

      // 8. Recent Activity
      const { data: recentActivityData } = await supabase.from('interactions')
        .select(`*, crm_parties(display_name)`)
        .order('created_at', { ascending: false })
        .limit(5);

      setData({
        kpis: {
          overdueActions,
          dueTodayActions,
          readyToDispatchCount,
          overduePaymentCount: overduePaymentTasks.length,
          openServiceIssuesCount
        },
        myPriorities: myPrioritiesLimited,
        operations: {
          openReqs: openReqsCount || 0,
          pendingDispatches: readyToDispatchCount,
          pendingQuotes: pendingQuotesCount || 0,
          topReqs: topUrgentReqs
        },
        collections: {
          overdueCount: overduePaymentTasks.length,
          overdueAmount: overduePaymentAmount,
          todayCount: dueTodayPaymentTasks.length,
          todayAmount: dueTodayPaymentAmount,
          topPayments: topActionablePayments
        },
        issues: {
          openCount: openServiceIssuesCount,
          criticalCount: criticalIssuesCount,
          topIssues
        },
        atAGlance: {
          growthOpps: growthOppsCount || 0,
          dormant: dormantCount || 0,
          unassigned: unassignedCount,
          openReqs: openReqsCount || 0
        },
        recentActivity: recentActivityData || []
      });

    } catch (err) {
      console.error(err);
      setError("Unable to load operations data.");
    } finally {
      setLoading(false);
    }
  }

  const KpiCard = ({ title, value, colorClass, link }) => {
    const isZeroClear = value === 0 && ['Overdue Actions', 'Overdue Payments', 'Open Service Issues'].includes(title);
    const displayValue = isZeroClear ? 'All clear' : value;
    
    return (
      <Link to={link || '#'} style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', background: 'var(--bg-surface)', border: `1px solid ${value === 0 ? 'var(--border)' : `var(--${colorClass})`}`, borderRadius: 'var(--radius-md)', textDecoration: 'none', color: 'inherit', minWidth: '160px', flex: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.02)', textAlign: 'center', transition: 'border-color 0.2s' }}>
        <div style={{ fontSize: isZeroClear ? '1.2rem' : '2rem', fontWeight: 600, color: value === 0 ? 'var(--text-muted)' : `var(--${colorClass})`, marginBottom: '0.25rem', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {displayValue}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</div>
      </Link>
    );
  };

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading Command Center...</div>;
  if (error) return <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}>{error}</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      
      {/* HEADER */}
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {userProfile?.display_name || 'User'}
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} &bull; {userProfile?.role || 'Operator'}
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, maxWidth: '500px', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search customers, requirements, dispatches, payments..." style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.25rem', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--bg-base)', fontSize: '0.85rem' }} disabled title="Search placeholder" />
          </div>
          <button className="btn-icon" style={{ position: 'relative' }}>
            <Bell size={20} />
          </button>
          
          <div style={{ position: 'relative' }} ref={newMenuRef}>
             <button className="btn btn-primary" onClick={() => setNewMenuOpen(!newMenuOpen)}>
                <Plus size={16} style={{ marginRight: '4px' }} /> New
             </button>
             {newMenuOpen && (
               <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 100, minWidth: '200px', padding: '0.5rem 0' }}>
                 <Link to="/customers/new" className="dropdown-item" onClick={() => setNewMenuOpen(false)}>Add Customer</Link>
                 <Link to="/requirements/new" className="dropdown-item" onClick={() => setNewMenuOpen(false)}>Add Requirement</Link>
                 <Link to="/follow-ups/new" className="dropdown-item" onClick={() => setNewMenuOpen(false)}>Log Follow-up</Link>
                 <Link to="/requirements" className="dropdown-item" onClick={() => setNewMenuOpen(false)}>Create Dispatch</Link>
                 <Link to="/payments" className="dropdown-item" onClick={() => setNewMenuOpen(false)}>Record Payment</Link>
                 <Link to="/requirements/new" className="dropdown-item" onClick={() => setNewMenuOpen(false)}>Create Quotation</Link>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* SECTION 1: TODAY'S PRIORITIES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <KpiCard title="Overdue Actions" value={data.kpis.overdueActions} colorClass="danger" link="/follow-ups?status=Pending&dateRange=Overdue" />
        <KpiCard title="Due Today" value={data.kpis.dueTodayActions} colorClass="warning" link="/follow-ups?status=Pending&dateRange=Today" />
        <KpiCard title="Ready to Dispatch" value={data.kpis.readyToDispatchCount} colorClass="primary" link="/requirements" />
        <KpiCard title="Overdue Payments" value={data.kpis.overduePaymentCount} colorClass="danger" link="/payments" />
        <KpiCard title="Open Service Issues" value={data.kpis.openServiceIssuesCount} colorClass="warning" link="/customers" />
      </div>

      {/* SECTION 2: MY PRIORITIES */}
      <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-surface)' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>My Priorities</h2>
            <Link to="/follow-ups" className="text-primary" style={{ fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>View All <ArrowRight size={14} style={{ verticalAlign: 'middle' }} /></Link>
         </div>
         {data.myPriorities.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
              <CheckCircle2 size={32} className="text-success" style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
              <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>You are all caught up. No immediate actions assigned to you.</div>
            </div>
         ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
               {data.myPriorities.map((item, idx) => (
                  <div key={`${item._type}-${item.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: idx === data.myPriorities.length - 1 ? 'none' : '1px solid var(--border)', background: 'var(--bg-base)', borderRadius: '4px', marginBottom: '0.5rem' }}>
                     <div style={{ flex: '1 1 0', minWidth: 0, paddingRight: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                           <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.crm_parties?.display_name || 'Unknown'}
                           </strong>
                           <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>&bull; {item._label}</span>
                           {item._isOverdue && <span className="badge badge-danger" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>Overdue</span>}
                           {!item._isOverdue && item._isToday && <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>Today</span>}
                           {!item._isOverdue && !item._isToday && (item.priority === 'High' || item.priority === 'Critical') && <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>High</span>}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                           {item._type === 'issue' ? item.description : item.reason}
                           {item._type === 'payment' && item.amount > 0 && <span style={{ marginLeft: '0.5rem', color: 'var(--danger)', fontWeight: 500 }}>&bull; ₹{Number(item.amount).toLocaleString('en-IN')}</span>}
                           <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>&bull; {item._type === 'issue' ? 'Opened' : 'Due'}: {new Date(item._date).toLocaleDateString()}</span>
                        </div>
                     </div>
                     <div>
                        {item._type === 'follow_up' && (
                           <Link to={`/follow-ups/${item.id}/edit`} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>Call & Log</Link>
                        )}
                        {item._type === 'payment' && (
                           <Link to={`/payments`} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>Record Payment</Link>
                        )}
                        {item._type === 'issue' && (
                           <Link to={`/customers/${item.party_id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>Resolve</Link>
                        )}
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* SECTION 3: OPERATIONS */}
      <div style={{ marginBottom: '2rem' }}>
         <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>Operations</h2>
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Open Requirements</span>
               <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{data.operations.openReqs}</span>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pending Dispatches</span>
               <span style={{ fontSize: '1.25rem', fontWeight: 600, color: data.operations.pendingDispatches > 0 ? 'var(--primary)' : 'inherit' }}>{data.operations.pendingDispatches}</span>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pending Quotes</span>
               <span style={{ fontSize: '1.25rem', fontWeight: 600, color: data.operations.pendingQuotes > 0 ? 'var(--warning)' : 'inherit' }}>{data.operations.pendingQuotes}</span>
            </div>
         </div>
         <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
            {data.operations.topReqs.length === 0 ? (
               <div className="text-secondary" style={{ fontSize: '0.85rem' }}>No urgent operational tasks.</div>
            ) : (
               <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                     <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                           <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>Customer</th>
                           <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>Product & Qty</th>
                           <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>Required Date</th>
                           <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>Owner</th>
                           <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500, textAlign: 'right' }}>Action</th>
                        </tr>
                     </thead>
                     <tbody>
                        {data.operations.topReqs.map(req => (
                           <tr key={req.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>{req.customer_name}</td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>{req.required_quantity} {req.unit} {req.product_type}</td>
                              <td style={{ padding: '0.75rem 0.5rem', color: (req.expected_date && req.expected_date < todayStr) ? 'var(--danger)' : 'inherit' }}>{req.expected_date ? new Date(req.expected_date).toLocaleDateString() : '-'}</td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>{req.owner_email?.split('@')[0] || 'Unassigned'}</td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                                 <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setDispatchModalReq(req)}>
                                    Mark Dispatched
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
               <Link to="/requirements" className="text-primary" style={{ fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none' }}>View Requirements <ArrowRight size={14} style={{ verticalAlign: 'middle' }} /></Link>
               <Link to="/dispatches" className="text-primary" style={{ fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none' }}>View Dispatches <ArrowRight size={14} style={{ verticalAlign: 'middle' }} /></Link>
            </div>
         </div>
      </div>

      {/* SECTION 4: COLLECTIONS & ISSUES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
         {/* Collections Column */}
         <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>Collections</h2>
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
               <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Overdue</div>
                     <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--danger)' }}>{data.collections.overdueCount} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>/ ₹{Number(data.collections.overdueAmount).toLocaleString('en-IN')}</span></div>
                  </div>
                  <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Due Today</div>
                     <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--warning)' }}>{data.collections.todayCount} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>/ ₹{Number(data.collections.todayAmount).toLocaleString('en-IN')}</span></div>
                  </div>
               </div>
               
               {data.collections.topPayments.length === 0 ? (
                  <div className="text-secondary" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>No pending collections.</div>
               ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                     {data.collections.topPayments.map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-base)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                           <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>{p.crm_parties?.display_name || 'Unknown'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due: {new Date(p.follow_up_date).toLocaleDateString()} &bull; Owner: {p.owner?.display_name || 'Unassigned'}</div>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '0.25rem' }}>₹{Number(p.amount).toLocaleString('en-IN')}</div>
                              <Link to={`/payments`} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>Record</Link>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>

         {/* Issues Column */}
         <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>Service Issues</h2>
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
               <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Open Issues</div>
                     <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{data.issues.openCount}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Critical Priority</div>
                     <div style={{ fontSize: '1.1rem', fontWeight: 600, color: data.issues.criticalCount > 0 ? 'var(--danger)' : 'inherit' }}>{data.issues.criticalCount}</div>
                  </div>
               </div>
               
               {data.issues.topIssues.length === 0 ? (
                  <div className="text-secondary" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>No open service issues.</div>
               ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                     {data.issues.topIssues.map(issue => (
                        <div key={issue.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-base)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                           <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>{issue.crm_parties?.display_name || 'Unknown'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{issue.category} &bull; Owner: {issue.owner?.display_name || 'Unassigned'}</div>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                              <span className={`badge ${(issue.priority === 'Critical' || issue.priority === 'High') ? 'badge-danger' : 'badge-neutral'}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', marginBottom: '0.25rem', display: 'inline-block' }}>{issue.priority}</span>
                              <Link to={`/customers/${issue.party_id}`} className="btn btn-secondary" style={{ display: 'block', padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>Resolve</Link>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>
      </div>

      {/* SECTION 5: QUICK ACTIONS */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>Quick Actions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
         <Link to="/customers/new" className="btn btn-secondary" style={{ justifyContent: 'center', background: 'var(--bg-surface)', height: '3rem', border: '1px solid var(--border)' }}><UserPlus size={16} /> Add Customer</Link>
         <Link to="/requirements/new" className="btn btn-secondary" style={{ justifyContent: 'center', background: 'var(--bg-surface)', height: '3rem', border: '1px solid var(--border)' }}><FileEdit size={16} /> Add Requirement</Link>
         <Link to="/follow-ups/new" className="btn btn-secondary" style={{ justifyContent: 'center', background: 'var(--bg-surface)', height: '3rem', border: '1px solid var(--border)' }}><ClipboardList size={16} /> Log Follow-up</Link>
         <Link to="/requirements" className="btn btn-secondary" style={{ justifyContent: 'center', background: 'var(--bg-surface)', height: '3rem', border: '1px solid var(--border)' }}><Truck size={16} /> Create Dispatch</Link>
         <Link to="/payments" className="btn btn-secondary" style={{ justifyContent: 'center', background: 'var(--bg-surface)', height: '3rem', border: '1px solid var(--border)' }}><IndianRupee size={16} /> Record Payment</Link>
         <Link to="/requirements/new" className="btn btn-secondary" style={{ justifyContent: 'center', background: 'var(--bg-surface)', height: '3rem', border: '1px solid var(--border)' }}><FileText size={16} /> Create Quotation</Link>
      </div>

      {/* SECTION 6: AT A GLANCE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem', background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
         <Link to="/opportunities" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Growth Opps</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)' }}>{data.atAGlance.growthOpps}</div>
         </Link>
         <Link to="/dormant" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dormant Accounts</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{data.atAGlance.dormant}</div>
         </Link>
         <Link to="/customers" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unassigned Urgent</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: data.atAGlance.unassigned > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{data.atAGlance.unassigned}</div>
         </Link>
         <Link to="/requirements" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Open Requirements</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{data.atAGlance.openReqs}</div>
         </Link>
      </div>

      {/* RECENT ACTIVITY */}
      {data.recentActivity.length > 0 && (
         <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>Recent Activity</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               {data.recentActivity.map(act => (
                  <div key={act.id} style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                     <div style={{ width: '2px', background: 'var(--border)', position: 'relative', margin: '4px 0' }}>
                        <div style={{ position: 'absolute', top: 0, left: '-4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--text-muted)' }}></div>
                     </div>
                     <div style={{ paddingBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; </span>
                        <strong style={{ color: 'var(--text-primary)' }}>{act.crm_parties?.display_name || 'System'}</strong> - 
                        <span style={{ color: 'var(--text-secondary)' }}> {act.interaction_type || 'interaction'} ({act.outcome || 'No outcome'})</span>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* DISPATCH MODAL */}
      {dispatchModalReq && (
         <CreateDispatchModal 
           requirement={{ id: dispatchModalReq.id, quantity: dispatchModalReq.required_quantity, pending_quantity: dispatchModalReq.pending_quantity, unit: dispatchModalReq.unit, status: dispatchModalReq.status }}
           onClose={() => setDispatchModalReq(null)}
           onComplete={() => { setDispatchModalReq(null); fetchDashboardData(); }}
         />
      )}

    </div>
  );
}
