import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../AuthContext';
import { Link } from 'react-router-dom';
import { Calendar, DollarSign, AlertCircle, Clock, ChevronRight, CheckCircle2, MessageCircle } from 'lucide-react';
import WhatsAppAction from '../../components/WhatsAppAction';

export default function PaymentWorkspace() {
  const { userProfile } = useContext(AuthContext);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedParty, setSelectedParty] = useState(null);
  const [newTask, setNewTask] = useState({ reason: '', follow_up_date: '', priority: 'High', follow_up_type: 'Payment' });

  useEffect(() => {
    fetchPayments();
  }, [userProfile]);

  async function fetchPayments() {
    setLoading(true);
    try {
      let query = supabase.from('v_payment_followup_workspace').select('*').gt('outstanding_balance', 0).order('outstanding_balance', { ascending: false });
      
      if (userProfile?.role !== 'Admin') {
         query = query.eq('assigned_owner_id', userProfile?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleScheduleTask = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('follow_ups').insert({
        party_id: selectedParty.party_id,
        reason: newTask.reason,
        follow_up_date: newTask.follow_up_date,
        priority: newTask.priority,
        follow_up_type: 'Payment',
        status: 'Pending',
        assigned_to: userProfile.id
      });
      if (error) throw error;
      setShowTaskModal(false);
      fetchPayments();
    } catch (err) {
      console.error(err);
      alert("Failed to schedule payment task.");
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const { error } = await supabase.from('follow_ups').update({ status: 'Completed' }).eq('id', taskId);
      if (error) throw error;
      fetchPayments();
    } catch (err) {
      console.error(err);
      alert("Failed to complete task.");
    }
  };

  if (loading) return <div className="cv-panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading payment workspace...</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <DollarSign size={28} className="text-warning" /> Payment Workspace
          </h1>
          <p className="text-secondary" style={{ fontSize: '1.05rem' }}>Follow up on outstanding balances driven directly from validated Tally data.</p>
        </div>
      </div>

      {showTaskModal && selectedParty && (
        <div className="cv-panel animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Schedule Payment Follow-up: {selectedParty.display_name}</h3>
          <form onSubmit={handleScheduleTask} style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label>Action / Reason</label>
                <input required type="text" value={newTask.reason} onChange={e => setNewTask({...newTask, reason: e.target.value})} placeholder="e.g. Call to confirm transfer" />
              </div>
              <div>
                <label>Due Date</label>
                <input required type="date" value={newTask.follow_up_date} onChange={e => setNewTask({...newTask, follow_up_date: e.target.value})} />
              </div>
              <div>
                <label>Priority</label>
                <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                  <option>Normal</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn cv-btn-subtle" onClick={() => setShowTaskModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Schedule Task</button>
            </div>
          </form>
        </div>
      )}

      {customers.length === 0 ? (
        <div className="cv-empty">
          <CheckCircle2 size={48} className="text-success" style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem' }}>Zero Outstanding Balances!</h3>
          <p className="text-secondary">All Tally ledger balances are clear. Great job!</p>
        </div>
      ) : (
        <div className="cv-panel" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Customer</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Ledger Balance</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>CRM Follow-up State</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, idx) => {
                const isOverdue = c.next_payment_followup_status === 'Pending' && c.next_payment_followup_date < new Date().toISOString().split('T')[0];
                return (
                  <tr key={c.party_id} style={{ borderBottom: idx === customers.length-1 ? 'none' : '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <Link to={`/customers/${c.party_id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {c.display_name} <ChevronRight size={14} className="text-muted" />
                      </Link>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Owner: {c.owner_name || 'Unassigned'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--warning)' }}>₹{Number(c.outstanding_balance).toLocaleString()}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Last Paid: {c.last_payment_date ? new Date(c.last_payment_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      {c.next_payment_followup_status === 'Pending' ? (
                        <div>
                           <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', color: isOverdue ? 'var(--danger)' : 'var(--text-primary)' }}>
                             <Clock size={14} /> Due: {new Date(c.next_payment_followup_date).toLocaleDateString()}
                           </div>
                           <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{c.next_payment_followup_reason}</div>
                           <button onClick={() => handleCompleteTask(c.next_payment_followup_id)} className="cv-btn-subtle" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={12}/> Mark Done</button>
                        </div>
                      ) : (
                        <div className="text-muted italic" style={{ fontSize: '0.9rem' }}>No pending task.</div>
                      )}
                      {c.last_interaction_date && (
                         <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: c.next_payment_followup_status === 'Pending' ? '0.5rem' : 0 }}>
                           Last contact: {new Date(c.last_interaction_date).toLocaleDateString()}
                         </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {c.whatsapp && (
                          <WhatsAppAction party={{ whatsapp: c.whatsapp, display_name: c.display_name }} onComplete={fetchPayments} btnClass="badge badge-active" />
                        )}
                        <button 
                          onClick={() => { setSelectedParty(c); setShowTaskModal(true); setNewTask({...newTask, follow_up_date: new Date().toISOString().split('T')[0]}); }} 
                          className="btn cv-btn-subtle" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Calendar size={14} /> Schedule
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
