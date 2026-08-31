import React, { useState } from 'react';
import { AlertCircle, Target, TrendingUp, Phone, Clock, MoreVertical, MessageSquare } from 'lucide-react';
import WhatsAppPreviewModal from './WhatsAppPreviewModal';

export default function TargetClosingAlerts({ alerts, onActionComplete }) {
  const [selectedAlert, setSelectedAlert] = useState(null);

  if (!alerts || alerts.length === 0) return null;

  const getPriorityBadge = (priority) => {
    if (priority === 'Critical') return <span className="badge badge-danger">Critical</span>;
    if (priority === 'High') return <span className="badge badge-warning">High</span>;
    if (priority === 'Achieved') return <span className="badge badge-success">Achieved</span>;
    return <span className="badge badge-secondary">{priority}</span>;
  };

  return (
    <div style={{ marginBottom: '3rem' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <AlertCircle size={20} className="text-danger" /> Target Closing Alerts
      </h2>
      <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
        Dealers who are close to their target or need immediate action before the target deadline.
      </p>

      <div className="cv-panel" style={{ overflowX: 'auto', borderLeft: '4px solid var(--danger)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Priority</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dealer</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target Period</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Achievement</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Remaining Balance</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Suggested Action</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                <td style={{ padding: '1rem' }}>{getPriorityBadge(a.priority)}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 600 }}>{a.display_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.territory_name} • {a.owner_name}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.9rem' }}>{a.scheme_name || a.target_period}</div>
                  <div style={{ fontSize: '0.8rem', color: a.days_left <= 3 ? 'var(--danger)' : 'var(--warning)', fontWeight: 600 }}>
                    <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '2px' }} /> 
                    {a.days_left} days left
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>₹{Number(a.achievement_value || 0).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>of ₹{Number(a.target_value || 0).toLocaleString('en-IN')}</div>
                  {/* Progress bar */}
                  <div style={{ width: '100%', height: '4px', background: 'var(--bg-base)', borderRadius: '2px', marginTop: '0.5rem' }}>
                    <div style={{ 
                      width: `${Math.min(100, (a.achievement_value/a.target_value)*100 || 0)}%`, 
                      height: '100%', background: a.achievement_value >= a.target_value ? 'var(--success)' : 'var(--primary)', borderRadius: '2px' 
                    }}></div>
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: a.achievement_value >= a.target_value ? 'var(--success)' : 'inherit' }}>
                    {a.achievement_value >= a.target_value ? 'Achieved!' : `₹${Number(Math.max(0, a.target_value - a.achievement_value)).toLocaleString('en-IN')}`}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {a.next_reward ? `Reward: ${a.next_reward}` : ''}
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.85rem' }}>{a.alert_type}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 500, marginTop: '0.25rem' }}>
                    {a.alert_type === 'Target Achieved' ? 'Send Congratulation' : 
                     a.alert_type === 'No Recent Activity' ? 'Call & Review Stock' : 
                     a.alert_type === 'One Slab Away' ? 'Push for Order' : 'Follow-up Call'}
                  </div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                    <button className="btn cv-btn-subtle" style={{ padding: '0.25rem 0.5rem', color: 'var(--success)' }} title="Send WhatsApp" onClick={() => setSelectedAlert(a)}>
                      <MessageSquare size={16} />
                    </button>
                    <button className="btn cv-btn-subtle" style={{ padding: '0.25rem 0.5rem' }} title="Call Dealer"><Phone size={16} /></button>
                    <button className="btn cv-btn-subtle" style={{ padding: '0.25rem 0.5rem' }} title="More Options"><MoreVertical size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {selectedAlert && <WhatsAppPreviewModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} onSave={onActionComplete} />}
    </div>
  );
}
