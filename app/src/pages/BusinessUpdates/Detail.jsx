import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft } from 'lucide-react';

export default function BusinessUpdateDetail() {
  const { id } = useParams();
  const [update, setUpdate] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);

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
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!update) return <div className="p-6">Update not found.</div>;

  const readCount = recipients.filter(r => r.read_at).length;

  return (
    <div className="animate-fade-in" style={{paddingBottom: '4rem'}}>
      <div className="page-header" style={{position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-base)', padding: '1rem 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <h1 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Link to="/customer-updates" style={{color: 'var(--text-muted)', textDecoration: 'none'}}>
              <ArrowLeft size={24} />
            </Link>
            Update Detail
          </h1>
        </div>
        <div style={{display: 'flex', gap: '0.75rem', alignItems: 'center'}}>
          <Link to={`/customer-updates/${id}/edit`} className="btn btn-primary">Edit Update</Link>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem'}}>
        <div style={{gridColumn: '1 / span 2'}}>
          <div className="glass-panel" style={{padding: '2rem'}}>
            <h2 style={{margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)'}}>{update.title}</h2>
            <div style={{display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap'}}>
              <span className="badge badge-primary" style={{fontSize: '0.8rem', padding: '0.25rem 0.75rem'}}>{update.type.replace(/_/g, ' ')}</span>
              <span style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Published: <strong>{new Date(update.published_at || update.created_at).toLocaleString()}</strong></span>
              <span style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Audience: <strong>{update.audience_type}</strong></span>
              <span className={`badge ${update.status === 'PUBLISHED' ? 'badge-success' : 'badge-warning'}`} style={{fontSize: '0.8rem', padding: '0.25rem 0.75rem'}}>{update.status}</span>
            </div>
            <div style={{padding: '1.5rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: 1.6}}>
              {update.message}
            </div>
          </div>
        </div>

        <div>
          <div className="glass-panel" style={{padding: '1.5rem', marginBottom: '1.5rem'}}>
            <h3 style={{margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)'}}>Recipient Stats</h3>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem'}}>
              <span style={{color: 'var(--text-secondary)'}}>Total Targeted:</span>
              <strong style={{color: 'var(--text-primary)'}}>{update.audience_type === 'ALL' ? 'All Customers' : recipients.length}</strong>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: 'var(--text-secondary)'}}>Total Read:</span>
              <strong style={{color: 'var(--success)'}}>{readCount}</strong>
            </div>
          </div>

          <div className="glass-panel" style={{padding: '0'}}>
            <div style={{padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)'}}>
              <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)'}}>Recipients List</h3>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {recipients.length === 0 ? (
                <div style={{padding: '2rem', textAlign: 'center', color: 'var(--text-muted)'}}>No explicit recipients linked (or All Customers targeted).</div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  {recipients.map(r => (
                    <div key={r.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)'}}>
                      <span style={{color: 'var(--text-primary)', fontWeight: 500}}>{r.crm_parties?.display_name || r.customer_id}</span>
                      {r.read_at ? (
                        <span className="badge badge-success" style={{fontSize: '0.7rem'}}>Read</span>
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
