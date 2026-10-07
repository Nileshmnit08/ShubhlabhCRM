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
    <div className="p-6">
      <div className="d-flex align-items-center mb-6">
        <Link to="/customer-updates" className="btn btn-icon me-4">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="h3 mb-0">Update Detail</h1>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card p-6 mb-6">
            <h2 className="h4 mb-2">{update.title}</h2>
            <div className="text-muted mb-4 d-flex gap-3">
              <span className="badge bg-primary">{update.type.replace(/_/g, ' ')}</span>
              <span>Published: {new Date(update.published_at || update.created_at).toLocaleString()}</span>
              <span>Audience: {update.audience_type}</span>
            </div>
            <div className="p-4 bg-light rounded" style={{ whiteSpace: 'pre-wrap' }}>
              {update.message}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card p-6 mb-6">
            <h3 className="h5 mb-4">Recipient Stats</h3>
            <div className="d-flex justify-content-between mb-2">
              <span>Total Targeted:</span>
              <strong>{update.audience_type === 'ALL' ? 'All Customers' : recipients.length}</strong>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>Total Read:</span>
              <strong>{readCount}</strong>
            </div>
          </div>

          <div className="card">
            <div className="card-header bg-transparent border-bottom p-4">
              <h3 className="h5 mb-0">Recipients List</h3>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {recipients.length === 0 ? (
                <div className="p-4 text-muted">No explicit recipients linked (or All Customers targeted).</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {recipients.map(r => (
                    <li key={r.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>{r.crm_parties?.display_name || r.customer_id}</span>
                      {r.read_at ? (
                        <span className="badge bg-success">Read</span>
                      ) : (
                        <span className="badge bg-secondary">Unread</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
