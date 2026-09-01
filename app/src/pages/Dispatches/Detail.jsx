import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Edit2, CheckCircle, XCircle, RefreshCcw, ExternalLink, Package, Truck, FileText, User } from 'lucide-react';

export default function DispatchDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [dispatch, setDispatch] = useState(null);
  
  // Delivery/Cancel Action states
  const [actionType, setActionType] = useState(null); // 'Deliver', 'Cancel', 'Return'
  const [actionReason, setActionReason] = useState('');
  const [actionQuantity, setActionQuantity] = useState('');
  const [actionDate, setActionDate] = useState(new Date().toISOString().split('T')[0]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchDispatch();
  }, [id]);

  const fetchDispatch = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('requirement_dispatches')
        .select(`
          *,
          requirements (
            id, quantity, unit, status, product_type,
            crm_parties (id, display_name, mobile, city, territory_name, owner_name)
          ),
          created_user:created_by (email)
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      setDispatch(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      let updates = {};
      let qty = actionQuantity ? parseFloat(actionQuantity) : 0;

      if (actionType === 'Deliver') {
        updates = {
          status: 'Delivered',
          actual_delivery_date: actionDate,
          shortage_quantity: qty,
          remarks: dispatch.remarks ? `${dispatch.remarks}\nDelivered on ${actionDate} with ${qty} shortage.` : `Delivered on ${actionDate} with ${qty} shortage.`
        };
      } else if (actionType === 'Cancel') {
        updates = {
          status: 'Cancelled',
          cancellation_reason: actionReason
        };
      } else if (actionType === 'Return') {
        if (qty <= 0 || qty > dispatch.quantity) {
          alert('Invalid return quantity');
          setActionLoading(false);
          return;
        }
        updates = {
          status: qty === dispatch.quantity ? 'Returned' : 'Delivered', // If full return, status Returned, else Delivered (with return qty recorded)
          return_quantity: qty,
          cancellation_reason: actionReason // using this field for return reason
        };
      }

      const { error } = await supabase.from('requirement_dispatches').update(updates).eq('id', id);
      if (error) throw error;
      
      setActionType(null);
      fetchDispatch(); // Reload
    } catch (err) {
      console.error(err);
      alert('Failed to update dispatch status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading...</div>;
  if (!dispatch) return <div style={{padding: '3rem', textAlign: 'center'}}>Dispatch not found</div>;

  const req = dispatch.requirements;
  const party = req?.crm_parties;

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <Link to="/dispatches/list" className="btn-icon"><ArrowLeft size={24} /></Link>
          <div>
            <h1 style={{margin: 0}}>Dispatch #{dispatch.id.substring(0,8)}</h1>
            <div className="text-secondary" style={{marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              {new Date(dispatch.dispatch_date).toLocaleDateString()}
              <span className={`badge ${dispatch.status === 'Cancelled' ? 'badge-danger' : dispatch.status === 'Delivered' ? 'badge-success' : dispatch.status === 'Returned' ? 'badge-warning' : 'badge-active'}`}>
                {dispatch.status}
              </span>
            </div>
          </div>
        </div>
        
        <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
          {dispatch.status === 'Dispatched' && (
             <button className="btn btn-primary" onClick={() => setActionType('Deliver')}>
               <CheckCircle size={16} /> Mark Delivered
             </button>
          )}
          {['Dispatched', 'Delivered'].includes(dispatch.status) && (
             <button className="btn btn-secondary" onClick={() => setActionType('Return')} style={{color: 'var(--warning)'}}>
               <RefreshCcw size={16} /> Return Goods
             </button>
          )}
          {dispatch.status === 'Dispatched' && (
             <button className="btn btn-secondary" onClick={() => setActionType('Cancel')} style={{color: 'var(--danger)'}}>
               <XCircle size={16} /> Cancel Dispatch
             </button>
          )}
          <Link to={`/requirements/${dispatch.requirement_id}`} className="btn btn-secondary">
             <ExternalLink size={16} /> View Requirement
          </Link>
        </div>
      </div>

      {actionType && (
        <div className="glass-panel animate-fade-in" style={{padding: '1.5rem', marginBottom: '2rem', border: `1px solid ${actionType === 'Cancel' ? 'var(--danger)' : actionType === 'Return' ? 'var(--warning)' : 'var(--success)'}`}}>
          <h3 style={{marginBottom: '1rem'}}>
            {actionType === 'Deliver' ? 'Confirm Delivery' : actionType === 'Cancel' ? 'Cancel Dispatch' : 'Process Return'}
          </h3>
          <form onSubmit={handleAction} style={{display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap'}}>
            {['Cancel', 'Return'].includes(actionType) && (
              <div style={{flex: '1 1 250px'}}>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Reason *</label>
                <input type="text" value={actionReason} onChange={e => setActionReason(e.target.value)} required placeholder="Required for audit"
                  style={{width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
                />
              </div>
            )}
            
            {['Deliver', 'Return'].includes(actionType) && (
              <div>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>
                  {actionType === 'Deliver' ? 'Shortage Qty (if any)' : 'Return Qty *'}
                </label>
                <input type="number" step="0.01" min={actionType === 'Return' ? "0.01" : "0"} value={actionQuantity} onChange={e => setActionQuantity(e.target.value)} required={actionType === 'Return'}
                  style={{width: '120px', padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
                />
              </div>
            )}
            
            {actionType === 'Deliver' && (
              <div>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Delivery Date</label>
                <input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} required
                  style={{padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
                />
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={actionLoading}>Confirm</button>
            <button type="button" className="btn btn-secondary" onClick={() => setActionType(null)} disabled={actionLoading}>Cancel</button>
          </form>
        </div>
      )}

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
        
        {/* Basic Info */}
        <div className="glass-panel" style={{padding: '1.5rem'}}>
          <h3 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem'}}>
             <Package size={18} /> Product & Dealer
          </h3>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
             <div>
               <label className="text-muted" style={{fontSize: '0.85rem'}}>Dealer Name</label>
               <div style={{fontWeight: 600}}>{party?.display_name || 'N/A'}</div>
             </div>
             <div>
               <label className="text-muted" style={{fontSize: '0.85rem'}}>Territory</label>
               <div>{party?.territory_name || party?.city || 'N/A'}</div>
             </div>
             <div>
               <label className="text-muted" style={{fontSize: '0.85rem'}}>Product / Feed Type</label>
               <div style={{fontWeight: 600}}>{req?.product_type}</div>
             </div>
             <div>
               <label className="text-muted" style={{fontSize: '0.85rem'}}>Dispatched Quantity</label>
               <div style={{fontWeight: 700, fontSize: '1.25rem', color: 'var(--success)'}}>
                 {dispatch.quantity} {dispatch.unit}
               </div>
             </div>
             {dispatch.return_quantity > 0 && (
               <div style={{gridColumn: '1 / -1', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px'}}>
                 <span className="text-danger" style={{fontWeight: 600}}>Returned: {dispatch.return_quantity} {dispatch.unit}</span>
                 <br />
                 <small className="text-secondary">Effective Scheme Qty: {dispatch.quantity - dispatch.return_quantity} {dispatch.unit}</small>
               </div>
             )}
          </div>
        </div>

        {/* Logistics */}
        <div className="glass-panel" style={{padding: '1.5rem'}}>
          <h3 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem'}}>
             <Truck size={18} /> Logistics
          </h3>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
             <div>
               <label className="text-muted" style={{fontSize: '0.85rem'}}>Vehicle Number</label>
               <div style={{fontWeight: 600}}>{dispatch.truck_number}</div>
             </div>
             <div>
               <label className="text-muted" style={{fontSize: '0.85rem'}}>Transporter</label>
               <div>{dispatch.transporter_name || 'N/A'}</div>
             </div>
             <div>
               <label className="text-muted" style={{fontSize: '0.85rem'}}>Driver Name</label>
               <div>{dispatch.driver_name || 'N/A'}</div>
             </div>
             <div>
               <label className="text-muted" style={{fontSize: '0.85rem'}}>Driver Mobile</label>
               <div>{dispatch.driver_mobile || 'N/A'}</div>
             </div>
             <div>
               <label className="text-muted" style={{fontSize: '0.85rem'}}>Warehouse</label>
               <div>{dispatch.warehouse_location || 'N/A'}</div>
             </div>
             <div>
               <label className="text-muted" style={{fontSize: '0.85rem'}}>Freight Amt</label>
               <div>{dispatch.freight_amount ? `₹${dispatch.freight_amount}` : 'N/A'}</div>
             </div>
          </div>
        </div>

        {/* Documentation */}
        <div className="glass-panel" style={{padding: '1.5rem'}}>
          <h3 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem'}}>
             <FileText size={18} /> Documentation & Billing
          </h3>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
             <div>
               <label className="text-muted" style={{fontSize: '0.85rem'}}>Invoice Number</label>
               <div style={{fontWeight: 600}}>{dispatch.invoice_number || 'Pending'}</div>
             </div>
             <div>
               <label className="text-muted" style={{fontSize: '0.85rem'}}>Invoice Date</label>
               <div>{dispatch.invoice_date ? new Date(dispatch.invoice_date).toLocaleDateString() : 'N/A'}</div>
             </div>
             <div>
               <label className="text-muted" style={{fontSize: '0.85rem'}}>LR / Bilty</label>
               <div style={{fontWeight: 600}}>{dispatch.lr_bilty_number || 'N/A'}</div>
             </div>
             <div>
               <label className="text-muted" style={{fontSize: '0.85rem'}}>Expected Delivery</label>
               <div>{dispatch.expected_delivery_date ? new Date(dispatch.expected_delivery_date).toLocaleDateString() : 'N/A'}</div>
             </div>
          </div>
          {dispatch.remarks && (
            <div style={{marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px'}}>
              <label className="text-muted" style={{fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem'}}>Remarks</label>
              <p style={{margin: 0, fontSize: '0.9rem'}}>{dispatch.remarks}</p>
            </div>
          )}
          {dispatch.cancellation_reason && (
             <div style={{marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '6px'}}>
              <label style={{fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem'}}>Cancellation / Return Reason</label>
              <p style={{margin: 0, fontSize: '0.9rem'}}>{dispatch.cancellation_reason}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
