import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../AuthContext';
import { LanguageContext } from '../../LanguageContext';
import { Clock, Users, Calendar, Activity, CheckCircle, UploadCloud, LogIn, LogOut, ChevronDown, ChevronRight, UserPlus, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ActivityTimeline() {
  const { userProfile } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterModule, setFilterModule] = useState('');
  const [filterUser, setFilterUser] = useState('');
  
  const [users, setUsers] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    fetchLogs();
    if (userProfile?.role === 'Admin') {
      fetchUsers();
    }
  }, [filterModule, filterUser, userProfile]);

  const fetchUsers = async () => {
    const { data } = await supabase.from('app_users').select('id, email, display_name');
    if (data) setUsers(data);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase.from('activity_logs')
        .select(`*, app_users ( id, display_name, email )`)
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (filterModule) query = query.eq('module', filterModule);
      if (filterUser) query = query.eq('actor_id', filterUser);

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  const getModuleIcon = (module, type) => {
    if (module === 'Auth') return type === 'LOGIN' ? <LogIn size={16} /> : <LogOut size={16} />;
    if (module === 'DataSync') return <UploadCloud size={16} />;
    if (module === 'Customers') return type === 'CREATED' ? <UserPlus size={16} /> : <Users size={16} />;
    if (module === 'FollowUps') return type === 'COMPLETED' ? <CheckCircle size={16} /> : <Clock size={16} />;
    return <Activity size={16} />;
  };

  const getModuleColor = (module) => {
    if (module === 'Auth') return 'var(--primary)';
    if (module === 'DataSync') return 'var(--warning)';
    if (module === 'Customers') return 'var(--success)';
    if (module === 'FollowUps') return 'var(--danger)';
    return 'var(--text-secondary)';
  };

  return (
    <div className="animate-fade-in" style={{maxWidth: '1000px', margin: '0 auto'}}>
      <div className="page-header" style={{alignItems: 'flex-start', marginBottom: '2rem'}}>
        <div>
          <h1 style={{margin: 0}}>{t('activity.title') || 'Activity Timeline'}</h1>
          <p className="text-secondary" style={{marginTop: '0.25rem'}}>Track system events, data syncs, and user actions.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
        <div style={{flex: '1 1 200px'}}>
          <label style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>Module</label>
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)}>
            <option value="">All Modules</option>
            <option value="Customers">Customers</option>
            <option value="FollowUps">Follow-ups</option>
            <option value="DataSync">Data Sync</option>
            <option value="Auth">Authentication</option>
          </select>
        </div>
        
        {userProfile?.role === 'Admin' && (
          <div style={{flex: '1 1 200px'}}>
            <label style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>User</label>
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)}>
              <option value="">All Users</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.display_name || u.email}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative'}}>
        {/* Vertical timeline line */}
        <div style={{position: 'absolute', left: '1.5rem', top: '1rem', bottom: '1rem', width: '2px', background: 'var(--border)', zIndex: 0}} />
        
        {loading ? (
          <div style={{padding: '2rem', textAlign: 'center'}}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-muted)'}}>No activity found.</div>
        ) : (
          logs.map(log => {
            const isExpanded = expandedRows.has(log.id);
            const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;
            
            return (
              <div key={log.id} style={{position: 'relative', zIndex: 1, paddingLeft: '3rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                {/* Icon node */}
                <div style={{
                  position: 'absolute', left: '0.5rem', top: '0.5rem', width: '2rem', height: '2rem',
                  borderRadius: '50%', background: getModuleColor(log.module), 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 4px var(--bg-base)', color: '#fff'
                }}>
                  {getModuleIcon(log.module, log.action_type)}
                </div>
                
                {/* Content Card */}
                <div className="glass-panel" style={{padding: '1rem', cursor: hasMeta ? 'pointer' : 'default'}} onClick={() => hasMeta && toggleRow(log.id)}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem'}}>
                    <div>
                      <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem'}}>
                        <span style={{fontWeight: 600, fontSize: '0.9rem'}}>
                          {log.app_users ? (log.app_users.display_name || log.app_users.email) : 'System'}
                        </span>
                        <span className="badge" style={{background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)'}}>
                          {t(`activity.${log.module}`) || log.module}
                        </span>
                        <span className="badge" style={{background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)'}}>
                          {t(`activity.${log.action_type}`) || log.action_type}
                        </span>
                      </div>
                      
                      <div style={{fontSize: '0.95rem'}}>{log.summary}</div>
                      
                      {log.entity_id && (
                        <div style={{marginTop: '0.5rem', fontSize: '0.8rem'}}>
                          {log.entity_type === 'crm_parties' ? (
                            <Link to={`/customers/${log.entity_id}`} className="text-primary" onClick={e => e.stopPropagation()}>View Customer &rarr;</Link>
                          ) : log.entity_type === 'follow_ups' ? (
                            <Link to={`/follow-ups/${log.entity_id}/edit`} className="text-primary" onClick={e => e.stopPropagation()}>View Follow-up &rarr;</Link>
                          ) : (
                            <span className="text-muted">Ref: {log.entity_id.split('-')[0]}</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', minWidth: '100px'}}>
                      <span className="text-muted" style={{fontSize: '0.8rem'}}>
                        {new Date(log.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                      </span>
                      {hasMeta && (
                        <span className="text-secondary">
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && hasMeta && (
                    <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', fontFamily: 'monospace', overflowX: 'auto'}}>
                      <pre style={{margin: 0, color: 'var(--text-secondary)'}}>
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
