import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, ChevronRight, BellRing } from 'lucide-react';
import ScheduleAction from './ScheduleAction';

export default function AlertsPanel({ entityType = null, entityId = null, compact = false }) {
  const { userProfile } = useContext(AuthContext);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  
  // State for converting alert to follow-up
  const [showScheduleAction, setShowScheduleAction] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    fetchAlerts();
  }, [userProfile, entityType, entityId]);

  async function fetchAlerts() {
    if (!userProfile) return;
    setLoading(true);
    try {
      let query = supabase
        .from('crm_alerts')
        .select('*, party:party_id(display_name)')
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false });
        
      if (entityType && entityId) {
        query = query.eq('entity_type', entityType).eq('entity_id', entityId);
      } else if (entityId && !entityType) {
        query = query.eq('party_id', entityId);
      }

      const { data, error } = await query.limit(compact ? 3 : 20);
      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAcknowledge(alertId) {
    setResolvingId(alertId);
    try {
      const { error } = await supabase
        .from('crm_alerts')
        .update({ 
          is_acknowledged: true, 
          acknowledged_by: userProfile.id,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
      
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      alert('Failed to acknowledge alert.');
    } finally {
      setResolvingId(null);
    }
  }

  function handleConvertClick(alert) {
    setSelectedAlert(alert);
    setShowScheduleAction(true);
  }

  async function onFollowUpScheduled() {
    if (selectedAlert) {
      await handleAcknowledge(selectedAlert.id);
    }
    setShowScheduleAction(false);
    setSelectedAlert(null);
  }

  if (loading) return compact ? null : <div className="text-muted p-3">Loading alerts...</div>;
  if (alerts.length === 0) return null; // Hide completely if no alerts

  return (
    <div className="cv-panel" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--warning)' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: 'rgba(245, 158, 11, 0.05)' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
          <BellRing size={18} /> Action Required
        </h3>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {alerts.map(alert => (
          <div key={alert.id} style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span className={`badge ${alert.priority === 'High' ? 'badge-danger' : 'badge-warning'}`}>
                  {alert.alert_type}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(alert.created_at).toLocaleDateString()}
                </span>
              </div>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {alert.message}
              </p>
              {!entityId && alert.party && (
                <Link to={`/customers/${alert.party_id}`} style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--primary)', textDecoration: 'none' }}>
                  {alert.party.display_name}
                </Link>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleConvertClick(alert)}
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                disabled={resolvingId === alert.id}
              >
                Create Follow-up
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => handleAcknowledge(alert.id)}
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                disabled={resolvingId === alert.id}
              >
                <CheckCircle size={14} style={{ marginRight: '0.25rem' }} /> Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>

      {showScheduleAction && selectedAlert && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '8px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>Create Action for Alert</h3>
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
              Resolving: {selectedAlert.alert_type}
            </p>
            <ScheduleAction 
               partyId={selectedAlert.party_id}
               initialReason={`Follow up on alert: ${selectedAlert.message}`}
               onSuccess={onFollowUpScheduled}
               onCancel={() => {
                 setShowScheduleAction(false);
                 setSelectedAlert(null);
               }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
