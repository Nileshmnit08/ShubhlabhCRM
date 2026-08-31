import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../AuthContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Download, Filter, UserX, User, ChevronRight, Activity, Zap } from 'lucide-react';
import UserActivityDrawer from '../../components/UserActivityDrawer';

export default function FollowUpActivityReport() {
  const { userProfile } = useContext(AuthContext);
  const isAdminOrManager = userProfile?.role === 'Admin' || userProfile?.role === 'Manager';

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [users, setUsers] = useState({});
  const [drawerUser, setDrawerUser] = useState(null);
  
  // Filters
  const [dateRange, setDateRange] = useState('7D');
  const [selectedUser, setSelectedUser] = useState('ALL');
  const [complianceFilter, setComplianceFilter] = useState('ALL');

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedUser, complianceFilter, userProfile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      if (dateRange === 'TODAY') {
        startDate.setHours(0,0,0,0);
      } else if (dateRange === '7D') {
        startDate.setDate(now.getDate() - 7);
      } else if (dateRange === '30D') {
        startDate.setDate(now.getDate() - 30);
      }
      const startIso = startDate.toISOString();

      // Fetch users
      const { data: usersData, error: usersError } = await supabase.from('app_users').select('id, full_name, email, role, is_active, avatar_url');
      if (usersError) throw usersError;
      
      const userMap = {};
      usersData.forEach(u => userMap[u.id] = u);
      setUsers(userMap);

      // Fetch Activity Data
      let query = supabase.from('v_follow_up_activity_report').select('*').gte('interaction_date', startIso);
      
      if (!isAdminOrManager) {
        query = query.eq('user_id', userProfile?.id);
      } else if (selectedUser !== 'ALL') {
        query = query.eq('user_id', selectedUser);
      }
      
      if (complianceFilter === 'COMPLIANT') {
        query = query.eq('requires_next_action', true).eq('has_valid_next_action', true);
      } else if (complianceFilter === 'NON_COMPLIANT') {
        query = query.eq('requires_next_action', true).eq('has_valid_next_action', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setReportData(data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  const getComplianceKpi = () => {
    const requiresAction = reportData.filter(d => d.requires_next_action);
    if (requiresAction.length === 0) return 100;
    const compliant = requiresAction.filter(d => d.has_valid_next_action);
    return Math.round((compliant.length / requiresAction.length) * 100);
  };

  // Group data by user
  const groupedByUser = reportData.reduce((acc, curr) => {
    const uid = curr.user_id || 'unassigned';
    if (!acc[uid]) {
      acc[uid] = { records: [], total: 0, productive: 0, missingAction: 0, uniqueCustomers: new Set() };
    }
    acc[uid].records.push(curr);
    acc[uid].total++;
    if (curr.is_productive) acc[uid].productive++;
    if (curr.requires_next_action && !curr.has_valid_next_action) acc[uid].missingAction++;
    if (curr.party_id) acc[uid].uniqueCustomers.add(curr.party_id);
    return acc;
  }, {});

  const exportCSV = () => {
    // Generate CSV
    const headers = ['Date', 'User', 'Role', 'Customer', 'Mobile', 'Type', 'Outcome', 'Productive', 'Requires Next Action', 'Compliant', 'Notes'];
    const rows = reportData.map(d => {
      const u = users[d.user_id] || {};
      const mobile = isAdminOrManager ? d.customer_mobile : '***';
      return [
        new Date(d.interaction_date).toLocaleString(),
        u.full_name || 'Unknown',
        u.role || '',
        `"${d.customer_name || ''}"`,
        mobile || '',
        d.follow_up_type || '',
        `"${d.outcome_category || ''}"`,
        d.is_productive ? 'Yes' : 'No',
        d.requires_next_action ? 'Yes' : 'No',
        d.requires_next_action ? (d.has_valid_next_action ? 'Yes' : 'No') : 'N/A',
        `"${(d.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FollowUp_Activity_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="animate-fade-in" style={{maxWidth: '1200px', margin: '0 auto'}}>
      <div className="page-header" style={{alignItems: 'flex-start'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <Link to="/" className="btn-icon"><ArrowLeft size={24} /></Link>
          <div>
            <h1 style={{margin: 0}}>Follow-up Activity Report</h1>
            <p className="text-secondary" style={{margin: '0.25rem 0 0 0'}}>Detailed interaction logs and compliance tracking</p>
          </div>
        </div>
        
        <div style={{display: 'flex', gap: '1rem'}}>
          <button className="btn btn-secondary" onClick={exportCSV} disabled={loading || reportData.length === 0}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem'}}>
        {/* Filters Sidebar */}
        <div className="glass-panel" style={{padding: '1.5rem', alignSelf: 'start'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 600}}>
            <Filter size={18} /> Filters
          </div>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600}}>Date Range</label>
              <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{width: '100%'}}>
                <option value="TODAY">Today</option>
                <option value="7D">Last 7 Days</option>
                <option value="30D">Last 30 Days</option>
              </select>
            </div>
            
            {isAdminOrManager && (
              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600}}>User</label>
                <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{width: '100%'}}>
                  <option value="ALL">All Users</option>
                  {Object.values(users).map(u => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600}}>Next Action Compliance</label>
              <select value={complianceFilter} onChange={e => setComplianceFilter(e.target.value)} style={{width: '100%'}}>
                <option value="ALL">All Outcomes</option>
                <option value="COMPLIANT">Compliant (Has Next Action)</option>
                <option value="NON_COMPLIANT">Missing Next Action</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
          {/* KPI Summary */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
            <div className="glass-panel" style={{padding: '1.5rem', borderLeft: '4px solid var(--primary)'}}>
              <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase'}}>Total Activities</div>
              <div style={{fontSize: '2rem', fontWeight: 700}}>{reportData.length}</div>
            </div>
            
            <div className="glass-panel" style={{padding: '1.5rem', borderLeft: '4px solid var(--success)'}}>
              <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase'}} title="(Completed with valid required next action / Completed requiring a next action) * 100">
                Next Action Compliance
              </div>
              <div style={{fontSize: '2rem', fontWeight: 700, color: getComplianceKpi() < 80 ? 'var(--danger)' : 'var(--success)'}}>
                {loading ? '-' : `${getComplianceKpi()}%`}
              </div>
            </div>
          </div>

          {/* User Grouped List */}
          <div className="glass-panel" style={{padding: '0'}}>
            <div style={{padding: '1.5rem', borderBottom: '1px solid var(--border)'}}>
              <h3 style={{margin: 0}}>Activity by User</h3>
            </div>
            
            {loading ? (
              <div style={{padding: '3rem', textAlign: 'center'}}>Loading report...</div>
            ) : Object.keys(groupedByUser).length === 0 ? (
              <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-muted)'}}>No activity found for the selected filters.</div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column'}}>
                {Object.entries(groupedByUser).map(([uid, stats]) => {
                  const u = users[uid] || {};
                  return (
                    <div 
                      key={uid} 
                      onClick={() => setDrawerUser({ id: uid, stats, records: stats.records })}
                      style={{
                        padding: '1.25rem 1.5rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        borderBottom: '1px solid var(--border-light)',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%', 
                          background: 'var(--primary)', color: '#fff', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 'bold', fontSize: '1.2rem', overflow: 'hidden'
                        }}>
                          {u.avatar_url ? <img src={u.avatar_url} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}}/> : (u.full_name ? u.full_name.charAt(0) : <User size={20}/>)}
                        </div>
                        <div>
                          <div style={{fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                            {u.full_name || 'Unknown User'}
                            {u.is_active === false && (
                              <span style={{fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'var(--danger)', color: '#fff', borderRadius: '4px'}}>
                                Inactive User
                              </span>
                            )}
                          </div>
                          <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{u.role || 'No Role'}</div>
                        </div>
                      </div>
                      
                      <div style={{display: 'flex', gap: '2rem', alignItems: 'center'}}>
                        <div style={{textAlign: 'center'}}>
                          <div style={{fontSize: '1.2rem', fontWeight: 600}}>{stats.total}</div>
                          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Follow-ups</div>
                        </div>
                        <div style={{textAlign: 'center'}}>
                          <div style={{fontSize: '1.2rem', fontWeight: 600}}>{stats.uniqueCustomers.size}</div>
                          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Customers</div>
                        </div>
                        <div style={{textAlign: 'center'}}>
                          <div style={{fontSize: '1.2rem', fontWeight: 600, color: stats.missingAction > 0 ? 'var(--danger)' : 'var(--success)'}}>
                            {stats.missingAction}
                          </div>
                          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Missing Action</div>
                        </div>
                        <ChevronRight size={20} className="text-muted" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {drawerUser && (
        <UserActivityDrawer 
          user={users[drawerUser.id] || { id: drawerUser.id, full_name: 'Unknown' }} 
          records={drawerUser.records} 
          onClose={() => setDrawerUser(null)}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
