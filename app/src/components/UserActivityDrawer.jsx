import React, { useState } from 'react';
import { X, Calendar, PlusCircle, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UserActivityDrawer({ user, records, onClose, onRefresh }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('ALL'); // ALL, PRODUCTIVE, MISSING_ACTION, OVERDUE

  // Filter records
  const filteredRecords = records.filter(r => {
    if (filter === 'PRODUCTIVE') return r.is_productive;
    if (filter === 'MISSING_ACTION') return r.requires_next_action && !r.has_valid_next_action;
    if (filter === 'OVERDUE') return false; // Overdue is for pending, these are completed. Maybe just keep this for consistency if requested.
    return true;
  });

  const handleCreateFollowUp = (r) => {
    // Navigates to new follow-up form with pre-filled parameters
    const params = new URLSearchParams({
      party_id: r.party_id,
      assigned_to: r.user_id,
      reason: `Follow-up on: ${r.outcome_category || 'Interaction'}`,
      follow_up_type: r.follow_up_type || 'General'
    });
    navigate(`/follow-ups/new?${params.toString()}`);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '600px',
      background: 'var(--bg-surface)', zIndex: 1000, boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
      display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease-out'
    }}>
      <div style={{padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
          }}>
            {user.avatar_url ? <img src={user.avatar_url} alt="" style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}}/> : (user.full_name?.charAt(0) || 'U')}
          </div>
          <div>
            <h2 style={{margin: 0, fontSize: '1.25rem'}}>{user.full_name}</h2>
            <div className="text-secondary" style={{fontSize: '0.85rem'}}>{user.role || 'User'} Activity</div>
          </div>
        </div>
        <button className="btn-icon" onClick={onClose}><X size={24}/></button>
      </div>
      
      <div style={{padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-base)', display: 'flex', gap: '0.5rem', overflowX: 'auto'}}>
        <button 
          onClick={() => setFilter('ALL')}
          style={{
            background: filter === 'ALL' ? 'var(--primary)' : 'transparent',
            color: filter === 'ALL' ? '#fff' : 'var(--text-primary)',
            border: `1px solid ${filter === 'ALL' ? 'var(--primary)' : 'var(--border)'}`,
            padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          All Activity ({records.length})
        </button>
        <button 
          onClick={() => setFilter('PRODUCTIVE')}
          style={{
            background: filter === 'PRODUCTIVE' ? 'var(--primary)' : 'transparent',
            color: filter === 'PRODUCTIVE' ? '#fff' : 'var(--text-primary)',
            border: `1px solid ${filter === 'PRODUCTIVE' ? 'var(--primary)' : 'var(--border)'}`,
            padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          Productive ({records.filter(r => r.is_productive).length})
        </button>
        <button 
          onClick={() => setFilter('MISSING_ACTION')}
          style={{
            background: filter === 'MISSING_ACTION' ? 'var(--danger)' : 'transparent',
            color: filter === 'MISSING_ACTION' ? '#fff' : 'var(--danger)',
            border: `1px solid var(--danger)`,
            padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          Missing Next Action ({records.filter(r => r.requires_next_action && !r.has_valid_next_action).length})
        </button>
      </div>

      <div style={{flex: 1, overflowY: 'auto', padding: '1.5rem'}}>
        {filteredRecords.length === 0 ? (
          <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>
            No records found for this filter.
          </div>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            {filteredRecords.map(r => (
              <div key={r.id} style={{
                background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem',
                borderLeft: r.requires_next_action && !r.has_valid_next_action ? '4px solid var(--danger)' : '4px solid var(--success)'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem'}}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: '1rem'}}>{r.customer_name || 'Unknown Customer'}</div>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{r.customer_mobile || 'No Mobile'}</div>
                  </div>
                  <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                    <Calendar size={14}/> 
                    {new Date(r.interaction_date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap'}}>
                  <span style={{fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '4px'}}>
                    {r.follow_up_type}
                  </span>
                  <span style={{fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', borderRadius: '4px', fontWeight: 600}}>
                    {r.outcome_category}
                  </span>
                  {r.is_productive && (
                    <span style={{fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '4px'}}>
                      Productive
                    </span>
                  )}
                </div>
                
                {r.notes && (
                  <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', whiteSpace: 'pre-wrap', background: 'var(--bg-surface)', padding: '0.5rem', borderRadius: '4px'}}>
                    "{r.notes}"
                  </div>
                )}
                
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-light)'}}>
                  {r.requires_next_action ? (
                    r.has_valid_next_action ? (
                      <div style={{fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                        <CheckCircle size={14}/> Next action scheduled
                      </div>
                    ) : (
                      <div style={{fontSize: '0.8rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                        <AlertCircle size={14}/> Missing required next action
                      </div>
                    )
                  ) : (
                    <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                      <Clock size={14}/> No next action required
                    </div>
                  )}
                  
                  {r.requires_next_action && !r.has_valid_next_action && (
                    <button 
                      className="btn btn-primary" 
                      style={{padding: '0.3rem 0.75rem', fontSize: '0.8rem'}}
                      onClick={() => handleCreateFollowUp(r)}
                    >
                      <PlusCircle size={14} style={{marginRight: '0.25rem'}}/> Create Follow-up
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
