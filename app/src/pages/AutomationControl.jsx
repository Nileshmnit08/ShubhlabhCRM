import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { ShieldAlert, Activity, Filter, RefreshCw, ServerCrash, Zap, Power } from 'lucide-react';
import { logActivity } from '../lib/activityLogger';

export default function AutomationControl() {
  const { userProfile } = useContext(AuthContext);
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logFilter, setLogFilter] = useState('ALL');

  useEffect(() => {
    if (userProfile?.role === 'Admin') {
      fetchData();
    }
  }, [userProfile]);

  async function fetchData() {
    setLoading(true);
    await Promise.all([fetchRules(), fetchLogs()]);
    setLoading(false);
  }

  async function fetchRules() {
    try {
      const { data, error } = await supabase
        .from('crm_automation_rules')
        .select('*')
        .order('trigger_event', { ascending: true });
      if (error) throw error;
      setRules(data || []);
    } catch (err) {
      console.error('Error fetching rules:', err);
    }
  }

  async function fetchLogs() {
    try {
      let query = supabase
        .from('crm_automation_logs')
        .select('*, rule:rule_id(name)')
        .order('executed_at', { ascending: false })
        .limit(50);
      
      if (logFilter !== 'ALL') {
        query = query.eq('status', logFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  }

  useEffect(() => {
    if (userProfile?.role === 'Admin') fetchLogs();
  }, [logFilter]);

  async function handleToggleRule(rule) {
    const newValue = !rule.is_active;
    try {
      const { error } = await supabase
        .from('crm_automation_rules')
        .update({ is_active: newValue })
        .eq('id', rule.id);
      
      if (error) throw error;
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: newValue } : r));
      
      await logActivity(null, 'Automation Config', `Toggled rule "${rule.name}" to ${newValue ? 'Active' : 'Inactive'}`, userProfile.id);
    } catch (err) {
      console.error('Error toggling rule:', err);
      alert('Failed to update rule.');
    }
  }

  async function handleKillSwitch(rule) {
    const newValue = !rule.system_kill_switch;
    if (newValue && !window.confirm(`Are you sure you want to ENGAGE the kill switch for "${rule.name}"? This overrides standard activation.`)) return;
    
    try {
      const { error } = await supabase
        .from('crm_automation_rules')
        .update({ system_kill_switch: newValue })
        .eq('id', rule.id);
      
      if (error) throw error;
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, system_kill_switch: newValue } : r));
      
      await logActivity(null, 'Automation Config', `${newValue ? 'ENGAGED' : 'DISENGAGED'} Kill Switch for "${rule.name}"`, userProfile.id);
    } catch (err) {
      console.error('Error updating kill switch:', err);
      alert('Failed to update kill switch.');
    }
  }

  if (userProfile?.role !== 'Admin') {
    return <div className="p-4 text-center">Unauthorized. Administrator access required.</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={28} /> Automation Control Room
          </h1>
          <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
            Inspect, audit, and safely control the deterministic CRM execution engine.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
          <RefreshCw size={16} style={{ marginRight: '0.5rem' }} /> Refresh Telemetry
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* Left Col: Rules */}
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
            Deterministic Rules Engine
          </h2>
          {loading && rules.length === 0 ? (
            <p>Loading rules...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {rules.map(rule => (
                <div key={rule.id} className="cv-panel" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: rule.system_kill_switch ? 'var(--danger)' : 'inherit' }}>
                      {rule.name}
                    </h3>
                    <span className="badge badge-primary">{rule.action_type}</span>
                  </div>
                  <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>{rule.description}</p>
                  
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', background: 'var(--bg-main)', padding: '0.5rem', borderRadius: '4px' }}>
                    <span><strong>Trigger:</strong> {rule.trigger_event}</span>
                    <span><strong>Cooldown:</strong> {Math.round(rule.cooldown_minutes/60)} hrs</span>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active:</label>
                      <button 
                        className={`btn ${rule.is_active ? 'btn-success' : 'btn-secondary'}`} 
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => handleToggleRule(rule)}
                      >
                        {rule.is_active ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    
                    <button 
                      className={`btn ${rule.system_kill_switch ? 'btn-danger' : 'btn-ghost'}`}
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      onClick={() => handleKillSwitch(rule)}
                    >
                      <Power size={14} /> {rule.system_kill_switch ? 'KILL SWITCH ENGAGED' : 'Kill Switch'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Logs */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Execution Audit Log</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <Filter size={14} />
              <select 
                className="form-control" 
                style={{ padding: '0.15rem 0.5rem', height: 'auto', fontSize: '0.85rem', width: 'auto' }}
                value={logFilter}
                onChange={e => setLogFilter(e.target.value)}
              >
                <option value="ALL">All Executions</option>
                <option value="SUCCESS">Success Only</option>
                <option value="SKIPPED">Skipped (Safeguards)</option>
                <option value="FAILED">Failures</option>
              </select>
            </div>
          </div>

          {loading && logs.length === 0 ? (
            <p>Loading telemetry...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {logs.map(log => (
                <div key={log.id} style={{ 
                  padding: '0.75rem', 
                  borderRadius: '6px', 
                  background: 'var(--bg-card)', 
                  borderLeft: `4px solid ${log.status === 'SUCCESS' ? 'var(--success)' : log.status === 'SKIPPED' ? 'var(--warning)' : 'var(--danger)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.rule?.name || 'Unknown Rule'}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(log.executed_at).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : log.status === 'SKIPPED' ? 'badge-warning' : 'badge-danger'}`}>
                      {log.status}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Target: {log.entity_type} ({log.entity_id?.substring(0,8)}...)
                    </span>
                  </div>
                  <pre style={{ 
                    margin: 0, padding: '0.5rem', background: 'var(--bg-main)', 
                    borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-muted)',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                  }}>
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              ))}
              {logs.length === 0 && <p className="text-secondary" style={{ textAlign: 'center', padding: '2rem 0' }}>No telemetry logs found.</p>}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
