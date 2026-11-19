import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Edit, Eye, EyeOff, Archive, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

export default function BusinessUpdateDetail() {
  const { id } = useParams();
  const [update, setUpdate] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const { data, error } = await supabase.from('business_updates').select('*').eq('id', id).single();
      if (error) throw error;
      setUpdate(data);

      const { data: recData } = await supabase.from('business_update_recipients')
        .select(`
          id,
          read_at,
          customer_id,
          crm_parties ( display_name )
        `)
        .eq('update_id', id);
        
      setRecipients(recData || []);
    } catch (e) {
      console.error('Error fetching update detail:', e);
      setStatusMessage({ type: 'error', text: 'Failed to load details: ' + (e.message || e) });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAppVisibility = async () => {
    if (!update) return;
    const nextVal = !(update.is_visible_in_app !== false);
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const { error } = await supabase
        .from('business_updates')
        .update({ 
          is_visible_in_app: nextVal,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        if (error.code === '42703' || error.message?.includes('is_visible_in_app')) {
          setStatusMessage({
            type: 'error',
            text: 'Database column missing: Please execute migration 263_sprint_CRM_CUSTOMER_UPDATES_02.sql in Supabase Dashboard SQL Editor.'
          });
          return;
        }
        throw error;
      }

      setUpdate(prev => ({ ...prev, is_visible_in_app: nextVal }));
      setStatusMessage({
        type: 'success',
        text: nextVal ? 'Update is now VISIBLE in the Customer Order App.' : 'Update is now HIDDEN from the Customer Order App.'
      });
    } catch (e) {
      console.error('Failed to toggle app visibility:', e);
      setStatusMessage({ type: 'error', text: 'Failed to update visibility: ' + (e.message || e) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    const confirmed = window.confirm(
      'This update will be deactivated and removed from the Customer Order App. Historical records will be retained. Continue?'
    );
    if (!confirmed) return;

    setActionLoading(true);
    setStatusMessage(null);
    try {
      const { error } = await supabase
        .from('business_updates')
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        if (error.code === '42703' || error.message?.includes('is_active')) {
          setStatusMessage({
            type: 'error',
            text: 'Database column missing: Please execute migration 263_sprint_CRM_CUSTOMER_UPDATES_02.sql in Supabase Dashboard SQL Editor.'
          });
          return;
        }
        throw error;
      }

      setUpdate(prev => ({ ...prev, is_active: false, deactivated_at: new Date().toISOString() }));
      setStatusMessage({ type: 'success', text: 'Update deactivated successfully. Historical records preserved.' });
    } catch (e) {
      console.error('Failed to deactivate update:', e);
      setStatusMessage({ type: 'error', text: 'Failed to deactivate: ' + (e.message || e) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const { error } = await supabase
        .from('business_updates')
        .update({
          is_active: true,
          deactivated_at: null,
          deactivated_by: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        if (error.code === '42703' || error.message?.includes('is_active')) {
          setStatusMessage({
            type: 'error',
            text: 'Database column missing: Please execute migration 263_sprint_CRM_CUSTOMER_UPDATES_02.sql in Supabase Dashboard SQL Editor.'
          });
          return;
        }
        throw error;
      }

      setUpdate(prev => ({ ...prev, is_active: true, deactivated_at: null, deactivated_by: null }));
      setStatusMessage({ type: 'success', text: 'Update reactivated successfully.' });
    } catch (e) {
      console.error('Failed to reactivate update:', e);
      setStatusMessage({ type: 'error', text: 'Failed to reactivate: ' + (e.message || e) });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading update detail...</div>;
  if (!update) return <div className="p-6">Update not found.</div>;

  const readCount = recipients.filter(r => r.read_at).length;
  const isActive = update.is_active !== false;
  const isVisibleInApp = update.is_visible_in_app !== false;

  return (
    <div className="animate-fade-in" style={{paddingBottom: '4rem'}}>
      <div className="page-header" style={{position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-base)', padding: '1rem 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
        <div>
          <h1 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Link to="/customer-updates" style={{color: 'var(--text-muted)', textDecoration: 'none'}}>
              <ArrowLeft size={24} />
            </Link>
            Customer Update Detail
          </h1>
        </div>
        <div style={{display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap'}}>
          {/* Edit Update Button */}
          <Link to={`/customer-updates/${id}/edit`} className="btn btn-primary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Edit size={16} /> Edit Update
          </Link>

          {/* Soft Deactivate / Reactivate Action */}
          {isActive ? (
            <button 
              className="btn btn-secondary" 
              onClick={handleDeactivate} 
              disabled={actionLoading}
              style={{display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--danger, #dc2626)', color: 'var(--danger, #dc2626)'}}
            >
              <Archive size={16} /> Deactivate
            </button>
          ) : (
            <button 
              className="btn btn-outline-primary" 
              onClick={handleReactivate} 
              disabled={actionLoading}
              style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}
            >
              <RefreshCw size={16} /> Reactivate
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div style={{margin: '1rem 0', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', background: statusMessage.type === 'error' ? 'var(--danger-bg, #fee2e2)' : 'var(--success-bg, #dcfce7)', color: statusMessage.type === 'error' ? 'var(--danger, #b91c1c)' : 'var(--success, #15803d)', border: '1px solid currentColor', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
          {statusMessage.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Deactivated Notice Banner */}
      {!isActive && (
        <div style={{margin: '1.5rem 0', padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)', background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
          <Archive size={20} />
          <div>
            <strong>This update is currently Deactivated.</strong> It is hidden from all customer applications. Historical recipient read data is preserved.
          </div>
        </div>
      )}

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.5rem'}}>
        {/* Main Content Card */}
        <div style={{gridColumn: '1 / span 2'}}>
          <div className="glass-panel" style={{padding: '2rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem'}}>
              <div>
                <h2 style={{margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)'}}>
                  {update.title}
                </h2>
                <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center'}}>
                  <span className="badge badge-primary" style={{fontSize: '0.8rem', padding: '0.25rem 0.75rem'}}>
                    {update.type.replace(/_/g, ' ')}
                  </span>
                  
                  {/* Status Badge */}
                  <span className={`badge ${update.status === 'PUBLISHED' ? 'badge-success' : 'badge-warning'}`} style={{fontSize: '0.8rem', padding: '0.25rem 0.75rem'}}>
                    {update.status}
                  </span>

                  {/* App Visibility Badge */}
                  <span className={`badge ${isVisibleInApp ? 'badge-success' : 'badge-secondary'}`} style={{fontSize: '0.8rem', padding: '0.25rem 0.75rem'}}>
                    {isVisibleInApp ? 'Visible in App' : 'Hidden from App'}
                  </span>

                  {/* Active / Deactivated Badge */}
                  <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`} style={{fontSize: '0.8rem', padding: '0.25rem 0.75rem'}}>
                    {isActive ? 'Active' : 'Deactivated'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', fontSize: '0.88rem', color: 'var(--text-secondary)'}}>
              <div>Published: <strong style={{color: 'var(--text-primary)'}}>{new Date(update.published_at || update.created_at).toLocaleString()}</strong></div>
              <div>Audience: <strong style={{color: 'var(--text-primary)'}}>{update.audience_type === 'ALL' ? 'All Customers' : 'Selected Customers'}</strong></div>
              {update.deactivated_at && (
                <div>Deactivated: <strong style={{color: 'var(--danger, #dc2626)'}}>{new Date(update.deactivated_at).toLocaleString()}</strong></div>
              )}
            </div>

            <div style={{padding: '1.5rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: 1.6, minHeight: '120px'}}>
              {update.message}
            </div>

            {/* Quick App Visibility Control Section */}
            <div style={{marginTop: '2rem', padding: '1.25rem', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
              <div>
                <strong style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)'}}>
                  {isVisibleInApp ? <Eye size={18} color="var(--success, #16a34a)" /> : <EyeOff size={18} color="var(--text-muted)" />}
                  Customer Order App Visibility
                </strong>
                <p style={{margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                  {isVisibleInApp 
                    ? 'This update is currently visible to targeted customers in the Order App.' 
                    : 'This update is hidden from the Order App, even if published.'}
                </p>
              </div>
              <button 
                className={`btn ${isVisibleInApp ? 'btn-secondary' : 'btn-primary'}`}
                onClick={handleToggleAppVisibility}
                disabled={actionLoading}
                style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}
              >
                {isVisibleInApp ? (
                  <><EyeOff size={16} /> Hide from App</>
                ) : (
                  <><Eye size={16} /> Show in App</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar: Recipient Stats & List */}
        <div>
          <div className="glass-panel" style={{padding: '1.5rem', marginBottom: '1.5rem'}}>
            <h3 style={{margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)'}}>Recipient Stats</h3>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem'}}>
              <span style={{color: 'var(--text-secondary)'}}>Total Targeted:</span>
              <strong style={{color: 'var(--text-primary)'}}>{update.audience_type === 'ALL' ? 'All Customers' : recipients.length}</strong>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: 'var(--text-secondary)'}}>Total Read:</span>
              <strong style={{color: 'var(--success, #16a34a)'}}>{readCount}</strong>
            </div>
          </div>

          <div className="glass-panel" style={{padding: '0'}}>
            <div style={{padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)'}}>
              <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)'}}>Recipients List</h3>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {recipients.length === 0 ? (
                <div style={{padding: '2rem', textAlign: 'center', color: 'var(--text-muted)'}}>
                  {update.audience_type === 'ALL' ? 'All Customers targeted.' : 'No recipients linked.'}
                </div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  {recipients.map(r => (
                    <div key={r.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)'}}>
                      <span style={{color: 'var(--text-primary)', fontWeight: 500}}>
                        {r.crm_parties?.display_name || r.customer_id}
                      </span>
                      {r.read_at ? (
                        <span className="badge badge-success" style={{fontSize: '0.7rem'}}>
                          Read ({new Date(r.read_at).toLocaleDateString()})
                        </span>
                      ) : (
                        <span className="badge badge-secondary" style={{fontSize: '0.7rem'}}>Unread</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
