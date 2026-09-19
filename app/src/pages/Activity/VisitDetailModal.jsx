import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, MapPin, Clock, CheckCircle, FileText, ShoppingCart, User, Activity, Navigation, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function VisitDetailModal({ visitId, onClose }) {
  const [visit, setVisit] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (visitId) {
      fetchVisitData();
    }
  }, [visitId]);

  const fetchVisitData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Visit + Party + Staff
      const { data: visitData, error: visitError } = await supabase
        .from('crm_visits')
        .select(`
          *,
          party:crm_parties(id, display_name, mobile),
          staff:app_users!crm_visits_staff_id_fkey(id, display_name, role)
        `)
        .eq('id', visitId)
        .single();

      if (visitError) throw visitError;
      if (!visitData) throw new Error('Visit not found');

      setVisit(visitData);

      const partyId = visitData.party_id;
      const staffId = visitData.staff_id;
      const visitStartTime = new Date(visitData.started_at);
      const visitEndTime = new Date(visitData.ended_at || visitData.updated_at);
      
      const bufferStart = new Date(visitStartTime.getTime() - 1000 * 60 * 60 * 2).toISOString();
      const bufferEnd = new Date(visitEndTime.getTime() + 1000 * 60 * 60 * 2).toISOString();

      // 2. Fetch Requirements
      const { data: reqData } = await supabase
        .from('requirements')
        .select('*')
        .eq('party_id', partyId)
        .eq('assigned_to', staffId)
        .gte('created_at', bufferStart)
        .lte('created_at', bufferEnd)
        .order('created_at', { ascending: false });
        
      setRequirements(reqData || []);

      // 3. Fetch Follow-ups
      const { data: followUpData } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('party_id', partyId)
        .eq('assigned_to', staffId)
        .gte('created_at', bufferStart)
        .lte('created_at', bufferEnd)
        .order('created_at', { ascending: false });
        
      setFollowUps(followUpData || []);

      // 4. Fetch Activity Logs
      const { data: logsData } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_id', partyId)
        .eq('actor_id', staffId)
        .eq('module', 'Visits')
        .gte('created_at', bufferStart)
        .lte('created_at', bufferEnd)
        .order('created_at', { ascending: false });

      setActivityLogs(logsData || []);
    } catch (err) {
      console.error('Error fetching visit details:', err);
      setError(err.message || 'Failed to load visit details');
    } finally {
      setLoading(false);
    }
  };

  if (!visitId) return null;

  const renderOutcomeBadge = (key, value) => {
    if (!value) return null;
    const labels = {
      metCustomer: 'Met Customer',
      demandAdded: 'Demand Added',
      paymentTalk: 'Payment Talk',
      priceList: 'Price List Given',
      mandiIntel: 'Mandi Intel',
      ownerUnavailable: 'Owner Unavailable'
    };
    
    return (
      <span key={key} className="badge badge-success" style={{marginRight: '0.5rem', marginBottom: '0.5rem', display: 'inline-flex', alignItems: 'center'}}>
        <CheckCircle size={12} style={{marginRight: '4px'}} />
        {labels[key] || key}
      </span>
    );
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      padding: '1rem'
    }} onClick={onClose} className="animate-fade-in">
      <div 
        style={{
          background: 'var(--bg-base)', 
          width: '100%', maxWidth: '800px', 
          maxHeight: '90vh', overflowY: 'auto', 
          borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex', flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
        className="animate-scale-in"
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem', borderBottom: '1px solid var(--border)', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: 'var(--bg-base)', zIndex: 10
        }}>
          <div>
            <h2 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <MapPin className="text-primary" />
              Completed Visit Detail
            </h2>
            {visit && (
              <p className="text-secondary" style={{margin: '0.25rem 0 0 0', fontSize: '0.9rem'}}>
                {new Date(visit.started_at).toLocaleDateString()} • {visit.status}
              </p>
            )}
          </div>
          <button className="btn btn-outline" onClick={onClose} style={{padding: '0.5rem'}}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
            Loading authoritative visit data...
          </div>
        ) : error ? (
          <div style={{padding: '2rem'}}>
             <div className="alert alert-danger" style={{background: 'var(--danger-alpha)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--danger)'}}>
              <strong>Error:</strong> {error}
             </div>
          </div>
        ) : visit ? (
          <div style={{padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            
            {/* 1. Customer & Staff */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <div className="glass-panel" style={{padding: '1.25rem', border: '1px solid var(--border)'}}>
                <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                  <User size={14} /> Customer
                </div>
                <div style={{fontWeight: 600, fontSize: '1.1rem'}}>{visit.party?.display_name || 'Unknown'}</div>
                {visit.party?.mobile && <div className="text-secondary" style={{fontSize: '0.9rem', marginTop: '0.25rem'}}>{visit.party.mobile}</div>}
                
                <button 
                  className="btn btn-outline" 
                  style={{marginTop: '1rem', padding: '0.25rem 0.5rem', fontSize: '0.85rem'}}
                  onClick={() => { onClose(); navigate(`/customers/${visit.party_id}`); }}
                >
                  View Profile
                </button>
              </div>

              <div className="glass-panel" style={{padding: '1.25rem', border: '1px solid var(--border)'}}>
                <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                  <User size={14} /> Staff
                </div>
                <div style={{fontWeight: 600, fontSize: '1.1rem'}}>{visit.staff?.display_name || 'Unknown'}</div>
                <div className="text-secondary" style={{fontSize: '0.9rem', marginTop: '0.25rem'}}>{visit.staff?.role || 'Field Staff'}</div>
              </div>
            </div>

            {/* 2. Timing */}
            <div className="glass-panel" style={{padding: '1.25rem', border: '1px solid var(--border)'}}>
               <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                  <Clock size={14} /> Visit Timing
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{flex: 1, textAlign: 'center'}}>
                    <div className="text-secondary" style={{fontSize: '0.85rem'}}>Time In</div>
                    <div style={{fontWeight: 600, fontSize: '1.1rem'}}>{new Date(visit.started_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </div>
                  <div style={{flex: 1, textAlign: 'center', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)'}}>
                    <div className="text-secondary" style={{fontSize: '0.85rem'}}>Duration</div>
                    <div style={{fontWeight: 600, fontSize: '1.1rem', color: 'var(--primary)'}}>
                      {visit.duration_seconds ? `${Math.floor(visit.duration_seconds / 60)}m ${visit.duration_seconds % 60}s` : 'N/A'}
                    </div>
                  </div>
                  <div style={{flex: 1, textAlign: 'center'}}>
                    <div className="text-secondary" style={{fontSize: '0.85rem'}}>Time Out</div>
                    <div style={{fontWeight: 600, fontSize: '1.1rem'}}>{visit.ended_at ? new Date(visit.ended_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</div>
                  </div>
                </div>
            </div>

            {/* 3. Location */}
            <div className="glass-panel" style={{padding: '1.25rem', border: '1px solid var(--border)'}}>
               <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                  <Navigation size={14} /> Location Captured
                </div>
                {visit.latitude && visit.longitude ? (
                  <div style={{display: 'flex', gap: '2rem'}}>
                    <div>
                      <div className="text-secondary" style={{fontSize: '0.85rem'}}>Latitude</div>
                      <div style={{fontWeight: 500, fontFamily: 'monospace'}}>{visit.latitude.toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="text-secondary" style={{fontSize: '0.85rem'}}>Longitude</div>
                      <div style={{fontWeight: 500, fontFamily: 'monospace'}}>{visit.longitude.toFixed(6)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-secondary" style={{fontStyle: 'italic'}}>Not available</div>
                )}
            </div>

            {/* 4. Outcomes */}
            <div className="glass-panel" style={{padding: '1.25rem', border: '1px solid var(--border)'}}>
               <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                  <CheckCircle size={14} /> Visit Outcome
                </div>
                
                {visit.outcomes && (
                  <div style={{display: 'flex', flexWrap: 'wrap'}}>
                    {Array.isArray(visit.outcomes) ? (
                       visit.outcomes.map((o, i) => (
                         <span key={i} className="badge badge-info" style={{marginRight: '0.5rem', marginBottom: '0.5rem'}}>
                           {o.product_type || o.status || JSON.stringify(o)}
                         </span>
                       ))
                    ) : typeof visit.outcomes === 'object' ? (
                       Object.entries(visit.outcomes).map(([k, v]) => renderOutcomeBadge(k, v))
                    ) : (
                       <span className="text-secondary">{JSON.stringify(visit.outcomes)}</span>
                    )}
                  </div>
                )}

                {(!visit.outcomes || (typeof visit.outcomes === 'object' && Object.values(visit.outcomes).every(v => !v))) && (
                   <div className="text-secondary" style={{fontStyle: 'italic'}}>No structured outcomes recorded.</div>
                )}

                {visit.notes && (
                  <div style={{marginTop: '1rem', padding: '1rem', background: 'var(--bg-surface-hover)', borderRadius: '8px', border: '1px solid var(--border)'}}>
                    <div className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>Visit Notes</div>
                    <div style={{whiteSpace: 'pre-wrap'}}>{visit.notes}</div>
                  </div>
                )}
            </div>

            {/* 5. Requirements */}
            {requirements.length > 0 && (
              <div className="glass-panel" style={{padding: '1.25rem', border: '1px solid var(--border)'}}>
                 <div className="text-warning" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                    <ShoppingCart size={14} /> Requirements / Demands Captured
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                    {requirements.map(req => (
                      <div key={req.id} style={{padding: '0.75rem', background: 'var(--bg-surface-hover)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div>
                          <div style={{fontWeight: 600}}>{req.product_type}</div>
                          {req.notes && <div className="text-secondary" style={{fontSize: '0.85rem'}}>{req.notes}</div>}
                        </div>
                        <div style={{textAlign: 'right'}}>
                          <div style={{fontWeight: 600, color: 'var(--warning)'}}>{req.quantity} {req.unit || ''}</div>
                          <div className="text-secondary" style={{fontSize: '0.85rem'}}>{req.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
            )}

            {/* 6. Follow-Ups */}
            {followUps.length > 0 ? (
              <div className="glass-panel" style={{padding: '1.25rem', border: '1px solid var(--border)'}}>
                 <div className="text-success" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                    <Calendar size={14} /> Follow-ups Scheduled
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                    {followUps.map(fu => (
                      <div key={fu.id} style={{padding: '0.75rem', background: 'var(--bg-surface-hover)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div>
                          <div style={{fontWeight: 600}}>{fu.reason}</div>
                          {fu.notes && <div className="text-secondary" style={{fontSize: '0.85rem'}}>{fu.notes}</div>}
                        </div>
                        <div style={{textAlign: 'right'}}>
                          <div style={{fontWeight: 600}}>{new Date(fu.due_date).toLocaleDateString()}</div>
                          <span className={`badge ${fu.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>{fu.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
            ) : (
              <div className="glass-panel" style={{padding: '1.25rem', border: '1px solid var(--border)'}}>
                 <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                    <Calendar size={14} /> Follow-up
                 </div>
                 <div className="text-secondary" style={{fontStyle: 'italic', marginTop: '0.75rem'}}>No follow-up record</div>
              </div>
            )}

            {/* 7. Related Activity Logs */}
            {activityLogs.length > 0 && (
               <div className="glass-panel" style={{padding: '1.25rem', border: '1px solid var(--border)'}}>
                 <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                    <Activity size={14} /> Related System Activity
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                    {activityLogs.map(log => (
                      <div key={log.id} style={{padding: '0.5rem', borderBottom: '1px dashed var(--border)'}}>
                        <div style={{fontWeight: 500, fontSize: '0.9rem'}}>{log.summary}</div>
                        <div className="text-secondary" style={{fontSize: '0.8rem'}}>{new Date(log.created_at).toLocaleTimeString()} • {log.action_type}</div>
                      </div>
                    ))}
                  </div>
              </div>
            )}
            
          </div>
        ) : null}
      </div>
    </div>
  );
}
