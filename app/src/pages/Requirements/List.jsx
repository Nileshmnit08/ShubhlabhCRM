import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { ClipboardList, Search, Filter, ChevronRight, CheckCircle2 } from 'lucide-react';
import CallAction from '../../components/CallAction';
import WhatsAppAction from '../../components/WhatsAppAction';

export default function RequirementList() {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('All Open');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRequirements();
  }, [statusFilter]);

  async function fetchRequirements() {
    setLoading(true);
    try {
      let query = supabase
        .from('requirements')
        .select(`
          id, product_type, quantity, unit, expected_date, expected_rate, status, priority, assigned_to, intent_type,
          crm_parties ( id, display_name, city, mobile, whatsapp ),
          app_users:assigned_to ( email )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter === 'All Open') {
        query = query.not('status', 'in', '("Won","Lost")');
      } else if (statusFilter === 'Overdue') {
        const today = new Date().toISOString().split('T')[0];
        query = query.not('status', 'in', '("Won","Lost")').lt('expected_date', today);
      } else if (statusFilter !== 'All') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequirements(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredRequirements = requirements.filter(req => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      req.crm_parties?.display_name.toLowerCase().includes(q) ||
      req.product_type.toLowerCase().includes(q) ||
      req.crm_parties?.city?.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status) => {
    if (status === 'Identified') return 'badge badge-dormant';
    if (status === 'Engaged') return 'badge badge-active';
    if (status === 'Qualified') return 'badge badge-active';
    if (status === 'Commercial Intent') return 'badge badge-warning';
    if (status === 'Won') return 'badge badge-success';
    if (status === 'Lost') return 'badge badge-danger';
    if (status === 'On Hold') return 'badge badge-neutral';
    return 'badge'; // Default
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Requirements Board</h1>
          <p className="text-secondary" style={{marginTop: '0.25rem'}}>
            Track open feed demands and ongoing negotiations.
          </p>
        </div>
        <Link to="/customers" className="btn btn-primary">
          + New Requirement
        </Link>
      </div>

      <div style={{display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap'}}>
        <div style={{flex: 1, minWidth: '250px', position: 'relative'}}>
          <Search size={18} style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'}} />
          <input 
            type="text" 
            placeholder="Search by customer, product, or city..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'var(--text-primary)', minWidth: '180px'}}
        >
          <option value="All Open">Active Pipeline</option>
          <option value="Overdue">Overdue</option>
          <option value="Identified">Identified</option>
          <option value="Engaged">Engaged</option>
          <option value="Qualified">Qualified</option>
          <option value="Commercial Intent">Commercial Intent</option>
          <option value="On Hold">On Hold</option>
          <option value="Won">Won</option>
          <option value="Lost">Lost</option>
          <option value="All">All Lifetime</option>
        </select>
      </div>

      {loading ? (
        <div style={{padding: '3rem', textAlign: 'center'}}>Loading pipeline...</div>
      ) : filteredRequirements.length === 0 ? (
        <div className="glass-panel" style={{padding: '4rem', textAlign: 'center'}}>
          <ClipboardList size={48} className="text-secondary" style={{margin: '0 auto 1rem', opacity: 0.5}} />
          <h3 style={{marginBottom: '0.5rem'}}>Pipeline is clear</h3>
          <p className="text-secondary">No requirements match your current filters.</p>
        </div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem'}}>
          {filteredRequirements.map(req => {
            const isOverdue = req.expected_date && new Date(req.expected_date) < new Date(new Date().toDateString()) && !['Won', 'Lost'].includes(req.status);
            
            return (
            <Link key={req.id} to={`/requirements/${req.id}`} className="glass-panel" style={{display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.2s, border-color 0.2s', border: isOverdue ? '1px solid var(--danger)' : ''}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem'}}>
                <div style={{fontWeight: 600, fontSize: '1.1rem'}}>{req.crm_parties?.display_name}</div>
                <span className={getStatusBadge(req.status)}>{req.status}</span>
              </div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                <div style={{fontSize: '0.95rem'}}>
                  <strong>{req.quantity} {req.unit} (Est.)</strong> of {req.product_type}
                </div>
                <div className="text-secondary" style={{fontSize: '0.85rem'}}>
                  Intent: <strong>{req.intent_type || 'Product Interest'}</strong>
                </div>
                {req.expected_rate && (
                  <div className="text-secondary" style={{fontSize: '0.85rem'}}>
                    Target Rate (Est.): ₹{req.expected_rate}
                  </div>
                )}
                {req.expected_date && (
                  <div className={isOverdue ? "text-danger" : "text-secondary"} style={{fontSize: '0.85rem', fontWeight: isOverdue ? 600 : 400}}>
                    {isOverdue && '⚠️ '}Required By: {new Date(req.expected_date).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem'}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                  <span style={{color: req.priority === 'High' ? 'var(--warning)' : 'var(--text-muted)'}}>
                    Priority: {req.priority}
                  </span>
                  {req.app_users?.email && (
                    <span style={{color: 'var(--text-muted)'}}>
                      Owner: {req.app_users.email.split('@')[0]}
                    </span>
                  )}
                </div>
                <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                  <div onClick={e => e.preventDefault()}>
                     {req.crm_parties && <CallAction party={req.crm_parties} onComplete={fetchRequirements} showLabel={false} />}
                  </div>
                  <div onClick={e => e.preventDefault()}>
                     {req.crm_parties && <WhatsAppAction party={req.crm_parties} onComplete={fetchRequirements} />}
                  </div>
                  <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', marginLeft: '0.5rem'}}>
                    View <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          )})}
        </div>
      )}
    </div>
  );
}
