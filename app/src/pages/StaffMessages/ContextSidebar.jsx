import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CheckCircle, X, Plus, Calendar, ShoppingCart, MapPin, ChevronDown, ChevronUp, Phone, Video } from 'lucide-react';
import { CallContext } from '../Calling/CallProvider';

/**
 * ContextSidebar
 *
 * Right panel: live CRM data for the conversation's staff member.
 * Shows:
 *  - Today's stats (visits, orders, follow-ups)
 *  - Recent activity items (clickable links to CRM records)
 *  - Follow-up creation form
 *
 * NOTE: This panel replaces the localStorage context approach.
 * Data is fetched live from the database via fetchStaffContext in the hook.
 */
export default function ContextSidebar({
  staffContext,
  loadingContext,
  selectedConversation,
  currentUserId,
  userProfile,
  showFollowUpForm,
  setShowFollowUpForm,
  fuCustomer,
  setFuCustomer,
  fuDate,
  setFuDate,
  fuNotes,
  setFuNotes,
  fuIsSubmitting,
  setFuIsSubmitting,
  fuCustomerSearch,
  setFuCustomerSearch,
  fuCustomerList,
  setFuCustomerList,
  existingCustomerFollowUps,
  setExistingCustomerFollowUps,
  recentCustomerWork,
  setRecentCustomerWork,
  followUpSuccess,
  setFollowUpSuccess,
  onFollowUpCreated,
}) {
  const { initiateCall } = useContext(CallContext);
  const [activityExpanded, setActivityExpanded] = useState(true);

  // Fetch customer data when a customer is selected for follow-up creation
  useEffect(() => {
    if (!fuCustomer?.id) {
      setExistingCustomerFollowUps([]);
      setRecentCustomerWork({ orders: [], visits: [] });
      return;
    }
    const fetchCustomerData = async () => {
      const [{ data: fuData }, { data: orderData }, { data: visitData }] = await Promise.all([
        supabase.from('follow_ups').select('id, reason, follow_up_date, status').eq('party_id', fuCustomer.id).in('status', ['Pending']).gte('follow_up_date', new Date().toISOString().split('T')[0]).order('follow_up_date', { ascending: true }).limit(3),
        supabase.from('requirements').select('id, product_type, created_at').eq('party_id', fuCustomer.id).order('created_at', { ascending: false }).limit(2),
        supabase.from('crm_visits').select('id, started_at, status').eq('party_id', fuCustomer.id).order('started_at', { ascending: false }).limit(2),
      ]);
      setExistingCustomerFollowUps(fuData || []);
      setRecentCustomerWork({ orders: orderData || [], visits: visitData || [] });
    };
    fetchCustomerData();
  }, [fuCustomer, setExistingCustomerFollowUps, setRecentCustomerWork]);

  // Search customers for follow-up form
  useEffect(() => {
    if (fuCustomerSearch.length > 2 && !fuCustomer) {
      const search = async () => {
        const { data } = await supabase.from('crm_parties').select('id, display_name').ilike('display_name', `%${fuCustomerSearch}%`).limit(5);
        setFuCustomerList(data || []);
      };
      search();
    } else {
      setFuCustomerList([]);
    }
  }, [fuCustomerSearch, fuCustomer, setFuCustomerList]);

  const handleSaveFollowUp = async () => {
    if (!fuCustomer || !fuDate || !fuNotes.trim()) {
      alert('Please complete all fields.');
      return;
    }
    setFuIsSubmitting(true);
    try {
      const staffUser = selectedConversation?.participants?.find((p) => p.user_id !== currentUserId);
      const { data, error } = await supabase.from('follow_ups').insert({
        party_id: fuCustomer.id,
        reason: fuNotes,
        follow_up_date: fuDate,
        due_at: fuDate,
        priority: 'Normal',
        follow_up_type: 'Commercial',
        assigned_to: staffUser?.user_id || null,
      }).select();
      if (error) throw error;

      setFollowUpSuccess(true);
      setTimeout(() => setFollowUpSuccess(false), 3000);
      setShowFollowUpForm(false);
      setFuNotes('');
      setFuDate('');
      setFuCustomer(null);
      setFuCustomerSearch('');
      if (onFollowUpCreated) onFollowUpCreated(data?.[0]);
    } catch (err) {
      console.error(err);
      alert('Failed to save follow-up.');
    } finally {
      setFuIsSubmitting(false);
    }
  };

  if (loadingContext) {
    return (
      <div className="sm-ctx-sidebar">
        <div className="sm-ctx-loading">
          <div className="sm-ctx-skel" />
          <div className="sm-ctx-skel sm-ctx-skel--sm" />
          <div className="sm-ctx-skel" />
        </div>
      </div>
    );
  }

  return (
    <div className="sm-ctx-sidebar">
      {/* ── Communication Actions ────────────────────── */}
      <div className="sm-ctx-section">
        <div className="sm-ctx-section-label">Call {selectedConversation?.participants?.find(p => p.user_id !== currentUserId)?.display_name || 'User'}</div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button 
            className="btn btn-secondary" 
            style={{ flex: 1, display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => {
              const remoteUsr = selectedConversation?.participants?.find(p => p.user_id !== currentUserId);
              if (remoteUsr) initiateCall({ id: remoteUsr.user_id, name: remoteUsr.display_name, role: remoteUsr.role }, 'AUDIO');
            }}
          >
            <Phone size={14} /> Audio
          </button>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => {
              const remoteUsr = selectedConversation?.participants?.find(p => p.user_id !== currentUserId);
              if (remoteUsr) initiateCall({ id: remoteUsr.user_id, name: remoteUsr.display_name, role: remoteUsr.role }, 'VIDEO');
            }}
          >
            <Video size={14} /> Video
          </button>
        </div>
      </div>

      {/* ── Today Stats ─────────────────────────────── */}
      <div className="sm-ctx-section">
        <div className="sm-ctx-section-label">Today</div>
        <div className="sm-ctx-stats">
          <StatRow icon={<MapPin size={13} />} label="Visits" value={staffContext.visits} />
          <StatRow icon={<ShoppingCart size={13} />} label="Orders" value={staffContext.orders} />
          <StatRow icon={<Calendar size={13} />} label="Follow-ups" value={staffContext.followUps} />
        </div>
      </div>

      {/* ── Recent Activity ──────────────────────────── */}
      <div className="sm-ctx-section">
        <button
          className="sm-ctx-section-label sm-ctx-section-toggle"
          onClick={() => setActivityExpanded((v) => !v)}
        >
          Recent Activity
          {activityExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {activityExpanded && (
          <>
            {staffContext.recentWork.length === 0 ? (
              <div className="sm-ctx-empty">No recent activity</div>
            ) : (
              <div className="sm-ctx-items">
                {staffContext.recentWork.map((work, i) => (
                  <ActivityItem key={`${work.type}-${work.id}-${i}`} work={work} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Follow-up Section ────────────────────────── */}
      <div className="sm-ctx-section">
        <div className="sm-ctx-section-label">Follow-up Action</div>

        {followUpSuccess && (
          <div className="sm-ctx-success">
            <CheckCircle size={13} />
            Follow-up created
          </div>
        )}

        {!showFollowUpForm ? (
          <button
            className="btn btn-secondary sm-ctx-add-btn"
            onClick={() => setShowFollowUpForm(true)}
          >
            <Plus size={14} /> Add Follow-up
          </button>
        ) : (
          <div className="sm-ctx-form">
            {/* Customer field */}
            <div className="sm-ctx-field">
              <label className="sm-ctx-label">Customer</label>
              {fuCustomer ? (
                <div className="sm-ctx-customer-selected">
                  <span>{fuCustomer.display_name}</span>
                  <button
                    className="sm-ctx-clear"
                    onClick={() => { setFuCustomer(null); setFuCustomerSearch(''); }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="sm-ctx-customer-search">
                  <input
                    type="text"
                    placeholder="Search customer…"
                    value={fuCustomerSearch}
                    onChange={(e) => setFuCustomerSearch(e.target.value)}
                    className="sm-ctx-input"
                  />
                  {fuCustomerList.length > 0 && (
                    <div className="sm-ctx-dropdown">
                      {fuCustomerList.map((c) => (
                        <button
                          key={c.id}
                          className="sm-ctx-dropdown-item"
                          onClick={() => { setFuCustomer(c); setFuCustomerSearch(''); setFuCustomerList([]); }}
                        >
                          {c.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Existing follow-ups warning */}
            {fuCustomer && existingCustomerFollowUps.length > 0 && (
              <div className="sm-ctx-existing-fu">
                <div className="sm-ctx-existing-fu-title">Existing pending</div>
                {existingCustomerFollowUps.map((ef) => (
                  <div key={ef.id} className="sm-ctx-existing-fu-item">
                    <strong>{ef.follow_up_date === new Date().toISOString().split('T')[0] ? 'Today' : ef.follow_up_date}:</strong> {ef.reason}
                  </div>
                ))}
              </div>
            )}

            {/* Date */}
            <div className="sm-ctx-field">
              <label className="sm-ctx-label">Date</label>
              <input
                type="date"
                value={fuDate}
                onChange={(e) => setFuDate(e.target.value)}
                className="sm-ctx-input"
              />
            </div>

            {/* Notes */}
            <div className="sm-ctx-field">
              <label className="sm-ctx-label">Notes</label>
              <textarea
                placeholder="Action required…"
                value={fuNotes}
                onChange={(e) => setFuNotes(e.target.value)}
                className="sm-ctx-input sm-ctx-textarea"
              />
            </div>

            <div className="sm-ctx-form-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowFollowUpForm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSaveFollowUp}
                disabled={fuIsSubmitting}
              >
                {fuIsSubmitting ? 'Saving…' : 'Save Follow-up'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ icon, label, value }) {
  return (
    <div className="sm-ctx-stat-row">
      <span className="sm-ctx-stat-icon">{icon}</span>
      <span className="sm-ctx-stat-label">{label}</span>
      <span className="sm-ctx-stat-value">{value}</span>
    </div>
  );
}

function ActivityItem({ work }) {
  const typeConfig = {
    Order: { color: 'var(--primary)', bg: 'rgba(15,118,110,0.08)' },
    Visit: { color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
    'Follow-up': { color: 'var(--warning)', bg: 'rgba(245,158,11,0.08)' },
  };
  const config = typeConfig[work.type] || { color: 'var(--text-muted)', bg: 'var(--bg-base)' };

  return (
    <Link to={work.link} className="sm-ctx-item">
      <span className="sm-ctx-item-type" style={{ color: config.color, background: config.bg }}>
        {work.type}
      </span>
      <span className="sm-ctx-item-label">{work.label}</span>
    </Link>
  );
}
