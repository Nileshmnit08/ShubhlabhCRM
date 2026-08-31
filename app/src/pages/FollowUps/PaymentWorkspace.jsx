import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../AuthContext';
import { Link } from 'react-router-dom';
import { 
  DollarSign, AlertCircle, Clock, ChevronRight, CheckCircle2, 
  Phone, MessageCircle, FileText, UserPlus, Filter, Download,
  MoreVertical, Calendar, ShieldAlert, XCircle, Search
} from 'lucide-react';

export default function PaymentWorkspace() {
  const { userProfile } = useContext(AuthContext);
  const isAdmin = userProfile?.role === 'Admin';
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs
  const [activeTab, setActiveTab] = useState('Today'); 
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [actionModal, setActionModal] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, [userProfile]);

  async function fetchPayments() {
    setLoading(true);
    try {
      let query = supabase.from('v_collections_control_tower').select('*');
      
      if (!isAdmin) {
         query = query.eq('assigned_owner_id', userProfile?.id);
      }

      const { data, error } = await query;
      if (error) {
        console.warn("View v_collections_control_tower might not exist yet", error);
        setCustomers([]);
      } else {
        setCustomers(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers = customers.filter(c => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        c.display_name?.toLowerCase().includes(term) ||
        c.mobile?.includes(term) ||
        c.territory_name?.toLowerCase().includes(term) ||
        c.owner_name?.toLowerCase().includes(term);
      if (!matchesSearch) return false;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const isTrade = c.ledger_classification === 'Trade Customer' || c.ledger_classification === 'Dealer / Distributor';
    
    if (activeTab === 'DataReview') {
      return !isTrade || (c.data_quality_flags && c.data_quality_flags.length > 0) || (c.last_payment_date && c.last_payment_date > todayStr);
    }
    
    if (!isTrade) return false;
    
    if (activeTab === 'Today') {
      return (c.next_action_date && c.next_action_date <= todayStr) || 
             (c.promise_status === 'Due Today') || 
             (c.next_action_priority === 'Critical');
    }
    if (activeTab === 'Broken') {
      return c.promise_status === 'Broken' || (c.promised_date < todayStr && c.promise_status !== 'Kept');
    }
    if (activeTab === 'HighValue') {
      return c.outstanding_balance >= 100000;
    }
    if (activeTab === 'NoContact') {
      if (!c.last_interaction_date) return true;
      const daysSince = (new Date() - new Date(c.last_interaction_date)) / (1000 * 3600 * 24);
      return daysSince > 7;
    }
    if (activeTab === 'Unassigned') {
      return !c.assigned_owner_id;
    }
    if (activeTab === 'MyAccounts') {
      return c.assigned_owner_id === userProfile?.id;
    }
    if (activeTab === 'Disputes') {
      return c.dispute_status === 'Open' || c.dispute_status === 'Investigating';
    }
    
    return true;
  });

  const validTrade = customers.filter(c => c.ledger_classification === 'Trade Customer' || c.ledger_classification === 'Dealer / Distributor');
  
  const totalReceivables = validTrade.reduce((sum, c) => sum + (Number(c.outstanding_balance) || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const dueToday = validTrade.filter(c => (c.next_action_date && c.next_action_date <= todayStr) || c.promise_status === 'Due Today').length;
  const brokenPromises = validTrade.filter(c => c.promise_status === 'Broken' || (c.promised_date < todayStr && c.promise_status !== 'Kept')).length;
  const highValue = validTrade.filter(c => c.outstanding_balance >= 100000).length;
  const unassigned = validTrade.filter(c => !c.assigned_owner_id).length;

  const calculatePriority = (c) => {
    if (c.promise_status === 'Broken' || (c.promised_date < todayStr && c.promise_status !== 'Kept')) return { level: 'Critical', color: 'var(--danger)', reason: 'Broken Promise' };
    if (c.outstanding_balance >= 100000 && !c.assigned_owner_id) return { level: 'Critical', color: 'var(--danger)', reason: 'High balance, unassigned' };
    if (c.outstanding_balance >= 100000 && (!c.last_interaction_date || (new Date() - new Date(c.last_interaction_date))/(1000*3600*24) > 7)) return { level: 'High', color: 'var(--warning)', reason: 'High Balance, No Contact' };
    if (c.next_action_date && c.next_action_date < todayStr) return { level: 'High', color: 'var(--warning)', reason: 'Overdue Action' };
    if (c.next_action_date === todayStr) return { level: 'Medium', color: 'var(--primary)', reason: 'Action Due Today' };
    return { level: 'Low', color: 'var(--text-muted)', reason: 'Standard' };
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    try {
      alert(`Action '${actionModal.type}' saved successfully! (Simulated for Demo)`);
      setActionModal(null);
      fetchPayments();
    } catch (err) {
      console.error(err);
      alert("Failed to save action.");
    }
  };

  if (loading) return <div className="cv-panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading Collections Data...</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <DollarSign size={28} className="text-warning" /> Collections Control Tower
          </h1>
          <p className="text-secondary" style={{ fontSize: '1.05rem', maxWidth: '600px' }}>
            Prioritise overdue receivables, assign accountability, track commitments, and improve daily collections.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn cv-btn-subtle" onClick={() => fetchPayments()}><Clock size={16} /> Sync Status</button>
          {isAdmin && <button className="btn btn-secondary"><Download size={16} /> Export</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="cv-panel" style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: '4px solid var(--primary)' }} onClick={() => setActiveTab('Today')}>
          <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Total Trade Receivables</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹{totalReceivables.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{validTrade.length} Accounts</div>
        </div>
        <div className="cv-panel" style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: '4px solid var(--warning)' }} onClick={() => setActiveTab('Today')}>
          <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Due Today</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{dueToday} Actions</div>
        </div>
        <div className="cv-panel" style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: '4px solid var(--danger)' }} onClick={() => setActiveTab('Broken')}>
          <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Broken Promises</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{brokenPromises} Accounts</div>
        </div>
        <div className="cv-panel" style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: '4px solid var(--warning)' }} onClick={() => setActiveTab('HighValue')}>
          <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>High-Value Overdue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{highValue} Accounts</div>
        </div>
        <div className="cv-panel" style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: '4px solid var(--text-muted)' }} onClick={() => setActiveTab('Unassigned')}>
          <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Unassigned Exposure</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{unassigned} Accounts</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {['Today', 'Broken', 'HighValue', 'NoContact', 'Unassigned', 'MyAccounts', 'Disputes', 'DataReview'].map(tab => (
          <button 
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'cv-btn-subtle'}`}
            style={{ borderRadius: '20px', padding: '0.4rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab(tab)}
          >
            {tab.replace(/([A-Z])/g, ' $1').trim()}
          </button>
        ))}
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search customer, territory, owner..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>
        <button className="btn cv-btn-subtle"><Filter size={18} /> More Filters</button>
      </div>

      {actionModal && (
        <div className="cv-panel animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--primary)', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>{actionModal.type} - {actionModal.party.display_name}</h3>
            <button className="btn cv-btn-subtle" style={{ padding: '0.25rem' }} onClick={() => setActionModal(null)}><XCircle size={20} /></button>
          </div>
          <form onSubmit={handleModalSubmit} style={{ display: 'grid', gap: '1rem' }}>
            
            {actionModal.type === 'Record Promise' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div><label>Promise Amount (₹)</label><input type="number" required /></div>
                <div><label>Promise Date</label><input type="date" required /></div>
                <div><label>Payment Mode</label>
                  <select><option>UPI</option><option>Bank Transfer</option><option>Cheque</option><option>Cash</option></select>
                </div>
              </div>
            )}
            
            {actionModal.type === 'Call' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div><label>Outcome</label>
                  <select><option>Connected</option><option>No answer</option><option>Promised payment</option></select>
                </div>
                <div><label>Next Action Date</label><input type="date" required /></div>
              </div>
            )}

            <div><label>Notes</label><textarea rows="2" placeholder="Add context..."></textarea></div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" className="btn cv-btn-subtle" onClick={() => setActionModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Action</button>
            </div>
          </form>
        </div>
      )}

      <div className="cv-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Priority</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Customer</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>Outstanding</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Commitment</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Next Action</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Owner</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No records found for the current view.</td></tr>
            ) : (
              filteredCustomers.map(c => {
                const priority = calculatePriority(c);
                return (
                  <tr key={c.party_id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: `${priority.color}20`, color: priority.color, display: 'inline-block'
                      }} title={priority.reason}>
                        {priority.level}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Link to={`/customers/${c.party_id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                        {c.display_name}
                      </Link>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {c.territory_name || 'No Territory'} • {c.ledger_classification}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>₹{Number(c.outstanding_balance || 0).toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Last Paid: {c.last_payment_date ? new Date(c.last_payment_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {c.promise_status ? (
                        <>
                          <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>₹{Number(c.promised_amount || 0).toLocaleString('en-IN')} by {new Date(c.promised_date).toLocaleDateString()}</div>
                          <div style={{ fontSize: '0.8rem', color: c.promise_status === 'Broken' ? 'var(--danger)' : 'var(--text-secondary)' }}>{c.promise_status}</div>
                        </>
                      ) : <span className="text-muted" style={{fontSize: '0.85rem'}}>No Promise</span>}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {c.next_action_date ? (
                        <>
                          <div style={{ fontSize: '0.9rem' }}>{c.next_action_reason || 'Follow-up'}</div>
                          <div style={{ fontSize: '0.8rem', color: c.next_action_date < todayStr ? 'var(--danger)' : 'var(--text-secondary)' }}>
                            Due: {new Date(c.next_action_date).toLocaleDateString()}
                          </div>
                        </>
                      ) : <span className="text-muted" style={{fontSize: '0.85rem'}}>No Task</span>}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.9rem' }}>{c.owner_name || <span className="text-warning">Unassigned</span>}</div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button className="btn cv-btn-subtle" style={{ padding: '0.25rem 0.5rem' }} title="Call" onClick={() => setActionModal({ type: 'Call', party: c })}><Phone size={16} /></button>
                        <button className="btn cv-btn-subtle" style={{ padding: '0.25rem 0.5rem' }} title="Record Promise" onClick={() => setActionModal({ type: 'Record Promise', party: c })}><Calendar size={16} /></button>
                        <button className="btn cv-btn-subtle" style={{ padding: '0.25rem 0.5rem' }} title="More Actions"><MoreVertical size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
