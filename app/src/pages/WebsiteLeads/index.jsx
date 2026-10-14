import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Inbox, Search, Filter, Download, RefreshCw, Phone, MessageCircle, 
  Mail, MapPin, Building, Briefcase, Package, Send, CheckCircle2, 
  AlertTriangle, Clock, X, ExternalLink, UserCheck, ShieldAlert,
  ChevronRight, ArrowUpDown, Check, FileText, UserPlus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../AuthContext';
import { 
  fetchWebsiteLeads, 
  updateLeadStatus, 
  convertLeadToParty, 
  exportLeadsToCsv, 
  syncOfflineQueueToSupabase,
  RAJASTHAN_DISTRICTS 
} from '../../lib/leadService';
import { logActivity } from '../../lib/activityLogger';
import './leadsInbox.css';

export default function WebsiteLeads() {
  const { userProfile } = useContext(AuthContext);
  const navigate = useNavigate();

  // Core Data States
  const [leads, setLeads] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    converted: 0,
    rejected: 0,
    dealerApps: 0,
    contactInquiries: 0,
    productEnquiries: 0
  });
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Modals & Drawers
  const [selectedLead, setSelectedLead] = useState(null);
  const [adminNotesDraft, setAdminNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Convert to CRM Party Modal State
  const [convertModalLead, setConvertModalLead] = useState(null);
  const [convertFormData, setConvertFormData] = useState({
    display_name: '',
    relationship_type: 'Dealer',
    dealer_classification: 'Retailer',
    territory_id: '',
    assigned_owner_id: userProfile?.id || '',
    notes: ''
  });
  const [converting, setConverting] = useState(false);
  const [territories, setTerritories] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Load leads from Supabase / offline fallback
  const loadLeads = async () => {
    setLoading(true);
    try {
      const res = await fetchWebsiteLeads({
        status: statusFilter,
        leadType: typeFilter,
        district: districtFilter,
        search,
        sortBy
      });

      setLeads(res.leads);
      setMetrics(res.metrics);
      setIsFallback(res.isFallback);
      setPendingOfflineCount(res.pendingOfflineCount);
    } catch (err) {
      console.error('Error fetching leads:', err);
      showToast('error', 'Failed to refresh website leads: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and on filter/search change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadLeads();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter, typeFilter, districtFilter, sortBy]);

  // Load CRM Territories & Team Members for conversion dialog
  useEffect(() => {
    async function loadCrmMeta() {
      try {
        const { data: tData } = await supabase.from('crm_territories').select('id, name').order('name');
        if (tData) setTerritories(tData);

        const { data: uData } = await supabase.from('app_users').select('id, full_name').order('full_name');
        if (uData) setTeamMembers(uData);
      } catch (e) {
        // silent
      }
    }
    loadCrmMeta();
  }, []);

  // Keyboard accessibility: Escape to dismiss drawer or modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (convertModalLead) {
          setConvertModalLead(null);
        } else if (selectedLead) {
          setSelectedLead(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [convertModalLead, selectedLead]);

  // Handle lead selection for detail drawer
  const handleOpenLeadDrawer = (lead) => {
    setSelectedLead(lead);
    setAdminNotesDraft(lead.admin_notes || '');
  };

  // Handle status transition
  const handleStatusChange = async (lead, newStatus) => {
    try {
      await updateLeadStatus(lead.id, newStatus);
      showToast('success', `Lead #${lead.id} marked as ${newStatus.toUpperCase()}`);
      
      logActivity({
        module: 'Customers',
        actionType: 'UPDATED',
        entityType: 'website_leads',
        entityId: String(lead.id),
        summary: `Updated website lead #${lead.id} status to ${newStatus}`
      });

      if (selectedLead && selectedLead.id === lead.id) {
        setSelectedLead(prev => ({ ...prev, status: newStatus }));
      }
      loadLeads();
    } catch (err) {
      showToast('error', `Failed to update status: ${err.message}`);
    }
  };

  // Save admin notes
  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    setSavingNotes(true);
    try {
      await updateLeadStatus(selectedLead.id, selectedLead.status, adminNotesDraft);
      setSelectedLead(prev => ({ ...prev, admin_notes: adminNotesDraft }));
      showToast('success', 'Admin notes updated.');
      loadLeads();
    } catch (err) {
      showToast('error', 'Failed to save notes: ' + err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  // Open conversion dialog
  const handleOpenConvertModal = (lead) => {
    const isDealer = lead.lead_type === 'dealer_application';
    setConvertModalLead(lead);
    setConvertFormData({
      display_name: lead.firm_name || lead.full_name,
      relationship_type: isDealer ? 'Dealer' : 'Customer',
      dealer_classification: 'Retailer',
      territory_id: '',
      assigned_owner_id: userProfile?.id || '',
      notes: lead.admin_notes || ''
    });
  };

  // Execute conversion to CRM Party
  const handleExecuteConversion = async (e) => {
    e.preventDefault();
    if (!convertModalLead) return;
    setConverting(true);

    try {
      const res = await convertLeadToParty(convertModalLead, convertFormData);
      showToast('success', `Successfully converted to CRM ${convertFormData.relationship_type}!`);
      
      logActivity({
        module: 'Customers',
        actionType: 'CREATED',
        entityType: 'crm_parties',
        entityId: res.partyId,
        summary: `Converted website lead #${convertModalLead.id} into party: ${convertFormData.display_name}`
      });

      setConvertModalLead(null);
      if (selectedLead) {
        setSelectedLead(prev => ({ ...prev, status: 'converted', converted_party_id: res.partyId }));
      }
      loadLeads();
    } catch (err) {
      showToast('error', 'Conversion failed: ' + err.message);
    } finally {
      setConverting(false);
    }
  };

  // Synchronize offline fallback queue
  const handleSyncOfflineLeads = async () => {
    setSyncingOffline(true);
    try {
      const res = await syncOfflineQueueToSupabase();
      if (res.syncedCount > 0) {
        showToast('success', `Synchronized ${res.syncedCount} offline leads to Supabase!`);
      } else {
        showToast('error', 'Could not sync offline leads. Please check table permissions.');
      }
      loadLeads();
    } catch (err) {
      showToast('error', 'Sync error: ' + err.message);
    } finally {
      setSyncingOffline(false);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (leads.length === 0) {
      showToast('error', 'No leads available to export.');
      return;
    }
    exportLeadsToCsv(leads, `shubh_labh_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('success', `Exported ${leads.length} leads to CSV.`);
  };

  // WhatsApp quick url helper
  const getWhatsAppUrl = (lead) => {
    const raw = lead.whatsapp || lead.phone;
    if (!raw) return '#';
    const clean = raw.replace(/\D/g, '');
    const num = clean.length === 10 ? `91${clean}` : clean;
    const msg = encodeURIComponent(
      `Hello ${lead.full_name}, thank you for contacting Shubh Labh Cattle Feeds regarding ${lead.subject || lead.product_name || 'our products'}. How can we assist you today?`
    );
    return `https://wa.me/${num}?text=${msg}`;
  };

  return (
    <div className="website-leads-container animate-fade-in" id="website-leads-inbox-page">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          backgroundColor: toast.type === 'success' ? '#15803d' : '#b91c1c',
          color: '#ffffff',
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fade-in 0.2s ease'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Row */}
      <div className="leads-header-row">
        <div className="leads-header-titles">
          <h1>
            <Inbox size={26} color="var(--primary, #15803d)" />
            <span>Website Inbound Leads</span>
            {isFallback && (
              <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                ● Local Baseline Fallback
              </span>
            )}
          </h1>
          <p>
            Review commercial dealership proposals, farmer ration inquiries, and product booking requests from the public website.
          </p>
        </div>

        <div className="leads-header-actions">
          <button
            onClick={handleExportCsv}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            id="export-leads-csv-btn"
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={loadLeads}
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            title="Refresh Leads"
            id="refresh-leads-btn"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Pending Offline Leads Alert Banner */}
      {pendingOfflineCount > 0 && (
        <div className="offline-sync-banner">
          <div className="offline-sync-content">
            <AlertTriangle size={20} />
            <span>
              <strong>{pendingOfflineCount} leads</strong> are stored in local offline queue waiting to sync to Supabase.
            </span>
          </div>
          <button
            onClick={handleSyncOfflineLeads}
            disabled={syncingOffline}
            className="btn btn-primary"
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
          >
            {syncingOffline ? 'Syncing...' : 'Sync Pending Leads to Database →'}
          </button>
        </div>
      )}

      {/* Metric Stat Cards */}
      <div className="leads-stat-grid">
        <div 
          className={`leads-stat-card ${statusFilter === 'all' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="stat-card-top">
            <span>Total Inquiries</span>
            <Inbox size={16} />
          </div>
          <div className="stat-card-value">{metrics.total}</div>
          <div className="stat-card-sub">All inbound website leads</div>
        </div>

        <div 
          className={`leads-stat-card ${statusFilter === 'new' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter('new')}
        >
          <div className="stat-card-top" style={{ color: '#b45309' }}>
            <span>New / Unread</span>
            <Clock size={16} />
          </div>
          <div className="stat-card-value" style={{ color: '#b45309' }}>{metrics.new}</div>
          <div className="stat-card-sub">Requires staff callback</div>
        </div>

        <div 
          className={`leads-stat-card ${statusFilter === 'contacted' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter('contacted')}
        >
          <div className="stat-card-top" style={{ color: '#1d4ed8' }}>
            <span>In Discussion</span>
            <Phone size={16} />
          </div>
          <div className="stat-card-value" style={{ color: '#1d4ed8' }}>{metrics.contacted}</div>
          <div className="stat-card-sub">Contacted / Follow-up</div>
        </div>

        <div 
          className={`leads-stat-card ${statusFilter === 'converted' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter('converted')}
        >
          <div className="stat-card-top" style={{ color: '#15803d' }}>
            <span>Converted Parties</span>
            <CheckCircle2 size={16} />
          </div>
          <div className="stat-card-value" style={{ color: '#15803d' }}>{metrics.converted}</div>
          <div className="stat-card-sub">Active CRM accounts</div>
        </div>
      </div>

      {/* Toolbar & Filters Card */}
      <div className="leads-toolbar-card">
        <div className="leads-toolbar-top">
          {/* Search Box */}
          <div className="leads-search-box">
            <Search size={16} />
            <input
              type="text"
              id="leads-search-input"
              className="leads-search-input"
              placeholder="Search by name, mobile, firm, district, or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') loadLeads(); }}
            />
            {search && (
              <button 
                type="button" 
                onClick={() => { setSearch(''); }} 
                className="leads-search-clear"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Lead Type Filter */}
          <select
            id="leads-type-filter"
            className="leads-filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Lead Categories</option>
            <option value="dealer_application">💼 Dealership Proposals ({metrics.dealerApps})</option>
            <option value="contact_inquiry">✉ General Contact Us ({metrics.contactInquiries})</option>
            <option value="product_enquiry">📦 Product Enquiries ({metrics.productEnquiries})</option>
          </select>

          {/* District Filter */}
          <select
            id="leads-district-filter"
            className="leads-filter-select"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
          >
            <option value="all">All Rajasthan Districts</option>
            {RAJASTHAN_DISTRICTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Sort By */}
          <select
            className="leads-filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ minWidth: '140px' }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        {/* Status Pill Filters */}
        <div className="leads-pill-row">
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #64748b)', marginRight: '0.25rem' }}>
            Status:
          </span>
          {[
            { id: 'all', label: 'All Leads', count: metrics.total },
            { id: 'new', label: 'New / Action Needed', count: metrics.new },
            { id: 'contacted', label: 'Contacted', count: metrics.contacted },
            { id: 'converted', label: 'Converted', count: metrics.converted },
            { id: 'rejected', label: 'Rejected', count: metrics.rejected }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setStatusFilter(p.id)}
              className={`lead-pill-btn ${statusFilter === p.id ? 'active' : ''}`}
            >
              <span>{p.label}</span>
              <span className="lead-pill-count">{p.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table Card */}
      <div className="leads-table-card">
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
            <p>Loading inbound website leads...</p>
          </div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
            <Inbox size={42} style={{ margin: '0 auto 1rem auto', opacity: 0.4 }} />
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary, #0f172a)', margin: '0 0 0.5rem 0' }}>No Leads Found</h3>
            <p style={{ fontSize: '0.88rem', margin: 0 }}>
              {search || statusFilter !== 'all' || typeFilter !== 'all' 
                ? 'Try adjusting your search criteria or filter tags.' 
                : 'No website inquiries registered yet. Forms are ready to receive leads.'}
            </p>
          </div>
        ) : (
          <div className="leads-table-responsive">
            <table className="leads-table" id="website-leads-table">
              <thead>
                <tr>
                  <th>Lead ID & Date</th>
                  <th>Category</th>
                  <th>Applicant & Firm</th>
                  <th>Territory & Contact</th>
                  <th>Subject / Commercial Interest</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => {
                  const isDealer = l.lead_type === 'dealer_application';
                  const isProd = l.lead_type === 'product_enquiry';

                  return (
                    <tr 
                      key={l.id} 
                      className={selectedLead?.id === l.id ? 'lead-row-selected' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleOpenLeadDrawer(l)}
                    >
                      {/* 1. ID & Timestamp */}
                      <td>
                        <strong style={{ color: 'var(--text-primary, #0f172a)' }}>#{l.id}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                          {new Date(l.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
                          {new Date(l.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>

                      {/* 2. Lead Type Badge */}
                      <td>
                        {isDealer ? (
                          <span className="lead-type-badge lead-type-dealer">
                            <Briefcase size={12} /> Dealership
                          </span>
                        ) : isProd ? (
                          <span className="lead-type-badge lead-type-product">
                            <Package size={12} /> Product
                          </span>
                        ) : (
                          <span className="lead-type-badge lead-type-contact">
                            <Send size={12} /> General
                          </span>
                        )}
                      </td>

                      {/* 3. Applicant & Firm */}
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                          {l.full_name}
                        </div>
                        {l.firm_name && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #475569)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '2px' }}>
                            <Building size={12} /> {l.firm_name}
                          </div>
                        )}
                        {l.business_type && (
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted, #94a3b8)' }}>
                            {l.business_type}
                          </div>
                        )}
                      </td>

                      {/* 4. Territory & Contact */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 600 }}>
                          <MapPin size={13} color="#15803d" />
                          <span>{l.district || 'Rajasthan'}{l.city_tehsil ? `, ${l.city_tehsil}` : ''}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #475569)', marginTop: '2px' }}>
                          📞 {l.phone}
                        </div>
                        {l.email && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)' }}>
                            ✉ {l.email}
                          </div>
                        )}
                      </td>

                      {/* 5. Subject & Commercial Volume */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {l.subject || l.product_name || 'Cattle Feed Inquiry'}
                        </div>
                        {l.monthly_volume && (
                          <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600, marginTop: '2px' }}>
                            Target: {l.monthly_volume}
                          </div>
                        )}
                        {l.investment_capacity && (
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted, #94a3b8)' }}>
                            Budget: {l.investment_capacity}
                          </div>
                        )}
                        {l.product_name && (
                          <div style={{ fontSize: '0.75rem', color: '#7e22ce', fontWeight: 600, marginTop: '2px' }}>
                            Formulation: {l.product_name}
                          </div>
                        )}
                      </td>

                      {/* 6. Status Badge */}
                      <td>
                        <span className={`lead-status-badge status-${l.status}`}>
                          <span className="status-indicator-dot"></span>
                          <span>{l.status.toUpperCase()}</span>
                        </span>
                      </td>

                      {/* 7. Action Buttons */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="lead-actions-cell">
                          {/* WhatsApp */}
                          <a
                            href={getWhatsAppUrl(l)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-lead-action wa"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle size={15} />
                          </a>

                          {/* Call */}
                          <a
                            href={`tel:${l.phone}`}
                            className="btn-lead-action call"
                            title="Call Phone"
                          >
                            <Phone size={15} />
                          </a>

                          {/* Convert button */}
                          {l.status !== 'converted' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenConvertModal(l)}
                              className="btn-lead-action"
                              title="Convert to CRM Party"
                              style={{ color: '#15803d' }}
                            >
                              <UserPlus size={15} />
                            </button>
                          ) : (
                            <span title="Converted to CRM Party" style={{ color: '#15803d', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                              <CheckCircle2 size={16} />
                            </span>
                          )}

                          {/* Open Drawer */}
                          <button
                            type="button"
                            onClick={() => handleOpenLeadDrawer(l)}
                            className="btn-lead-action"
                            title="View Full Details"
                          >
                            <ChevronRight size={15} />
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

      {/* Slide-out Detail Drawer */}
      {selectedLead && (
        <div className="lead-drawer-overlay" onClick={() => setSelectedLead(null)}>
          <div className="lead-drawer-panel" onClick={(e) => e.stopPropagation()} id="lead-detail-drawer">
            {/* Drawer Header */}
            <div className="lead-drawer-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span className={`lead-status-badge status-${selectedLead.status}`}>
                    <span className="status-indicator-dot"></span>
                    <span>{selectedLead.status.toUpperCase()}</span>
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                    Lead #{selectedLead.id}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                  {selectedLead.full_name}
                </h2>
                {selectedLead.firm_name && (
                  <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary, #475569)', fontSize: '0.9rem', fontWeight: 600 }}>
                    {selectedLead.firm_name}
                  </p>
                )}
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedLead(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' }}
                id="close-lead-drawer-btn"
                aria-label="Close drawer"
              >
                <X size={22} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="lead-drawer-body">
              {/* Quick Contact Bar */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a
                  href={getWhatsAppUrl(selectedLead)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#25d366', borderColor: '#25d366' }}
                >
                  <MessageCircle size={16} /> Chat on WhatsApp
                </a>
                <a
                  href={`tel:${selectedLead.phone}`}
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Phone size={16} /> Call {selectedLead.phone}
                </a>
                {selectedLead.status !== 'converted' && (
                  <button
                    type="button"
                    onClick={() => handleOpenConvertModal(selectedLead)}
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <UserPlus size={16} /> Convert to Party
                  </button>
                )}
              </div>

              {/* Status Workflow Selector */}
              <div className="drawer-section-card">
                <div className="drawer-section-title">
                  <ArrowUpDown size={15} /> Lead Workflow Status
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'new', label: 'Mark as New' },
                    { id: 'contacted', label: 'Mark Contacted' },
                    { id: 'converted', label: 'Mark Converted' },
                    { id: 'rejected', label: 'Mark Rejected' }
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleStatusChange(selectedLead, s.id)}
                      className={`lead-pill-btn ${selectedLead.status === s.id ? 'active' : ''}`}
                    >
                      {selectedLead.status === s.id && <Check size={13} />}
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Information */}
              <div className="drawer-section-card">
                <div className="drawer-section-title">
                  <Phone size={15} /> Contact & Territory Details
                </div>
                <div className="drawer-data-grid">
                  <div className="drawer-data-item">
                    <label>Mobile Number</label>
                    <strong>{selectedLead.phone}</strong>
                  </div>
                  <div className="drawer-data-item">
                    <label>WhatsApp Number</label>
                    <span>{selectedLead.whatsapp || selectedLead.phone}</span>
                  </div>
                  <div className="drawer-data-item">
                    <label>Email Address</label>
                    <span>{selectedLead.email || '—'}</span>
                  </div>
                  <div className="drawer-data-item">
                    <label>Territory / District</label>
                    <strong>{selectedLead.district || 'Rajasthan'}</strong>
                  </div>
                  <div className="drawer-data-item">
                    <label>City / Tehsil / Town</label>
                    <span>{selectedLead.city_tehsil || '—'}</span>
                  </div>
                  <div className="drawer-data-item">
                    <label>Pincode</label>
                    <span>{selectedLead.pincode || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Commercial Dealership Details (If dealer application) */}
              {selectedLead.lead_type === 'dealer_application' && (
                <div className="drawer-section-card">
                  <div className="drawer-section-title">
                    <Briefcase size={15} /> Commercial Proposal Details
                  </div>
                  <div className="drawer-data-grid">
                    <div className="drawer-data-item">
                      <label>Firm Name</label>
                      <strong>{selectedLead.firm_name || '—'}</strong>
                    </div>
                    <div className="drawer-data-item">
                      <label>Business Nature</label>
                      <span>{selectedLead.business_type || '—'}</span>
                    </div>
                    <div className="drawer-data-item">
                      <label>Target Monthly Volume</label>
                      <strong style={{ color: '#b45309' }}>{selectedLead.monthly_volume || '—'}</strong>
                    </div>
                    <div className="drawer-data-item">
                      <label>Proposed Capital Budget</label>
                      <span>{selectedLead.investment_capacity || '—'}</span>
                    </div>
                    <div className="drawer-data-item">
                      <label>Godown Storage Area</label>
                      <span>{selectedLead.godown_capacity || '—'}</span>
                    </div>
                    <div className="drawer-data-item">
                      <label>Feed Retailing Experience</label>
                      <span>{selectedLead.experience_years || '—'}</span>
                    </div>
                  </div>
                  {selectedLead.proposed_area && (
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border, #e2e8f0)' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Target Retailing Villages / Area</label>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{selectedLead.proposed_area}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Product Enquiry Details */}
              {selectedLead.product_name && (
                <div className="drawer-section-card">
                  <div className="drawer-section-title">
                    <Package size={15} /> Feed Formulation Interest
                  </div>
                  <div className="drawer-data-grid">
                    <div className="drawer-data-item">
                      <label>Product Name</label>
                      <strong style={{ color: '#7e22ce' }}>{selectedLead.product_name}</strong>
                    </div>
                    <div className="drawer-data-item">
                      <label>Catalogue Slug</label>
                      <span>{selectedLead.product_slug || '—'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Inquiry Message */}
              <div className="drawer-section-card">
                <div className="drawer-section-title">
                  <FileText size={15} /> Message / Inquiry Note
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-surface-hover, #f8fafc)', borderRadius: '8px', fontSize: '0.88rem', lineHeight: 1.6 }}>
                  {selectedLead.message || 'No additional message provided.'}
                </div>
              </div>

              {/* Staff Internal Notes */}
              <div className="drawer-section-card">
                <div className="drawer-section-title">
                  <UserCheck size={15} /> Internal Staff Notes & History
                </div>
                <textarea
                  id="lead-notes-textarea"
                  rows={3}
                  className="lead-textarea"
                  style={{ width: '100%', marginBottom: '0.75rem', fontSize: '0.88rem' }}
                  placeholder="Record staff discussions, call outcomes, dealer verification remarks..."
                  value={adminNotesDraft}
                  onChange={(e) => setAdminNotesDraft(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="btn btn-primary"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                  id="save-lead-notes-btn"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>

              {/* Metadata & Audit Trail */}
              <div className="drawer-section-card" style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)' }}>
                <div><strong>Submission Time:</strong> {new Date(selectedLead.created_at).toLocaleString('en-IN')}</div>
                <div><strong>Source:</strong> {selectedLead.source || 'Website'}</div>
                {selectedLead.converted_party_id && (
                  <div style={{ color: '#15803d', marginTop: '4px', fontWeight: 600 }}>
                    Linked CRM Party ID: {selectedLead.converted_party_id}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Convert to CRM Party Modal */}
      {convertModalLead && (
        <div className="conversion-modal-overlay" onClick={() => setConvertModalLead(null)}>
          <div className="conversion-modal-box" onClick={(e) => e.stopPropagation()} id="convert-lead-modal">
            <div className="conversion-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={18} color="#15803d" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Convert to CRM Party</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setConvertModalLead(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleExecuteConversion}>
              <div className="conversion-modal-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
                  This will register <strong>{convertModalLead.full_name}</strong> into your live CRM customer and dealer directory.
                </p>

                <div className="lead-form-group">
                  <label className="lead-label">Party / Display Name *</label>
                  <input
                    type="text"
                    id="convert-display-name"
                    className="lead-input"
                    value={convertFormData.display_name}
                    onChange={(e) => setConvertFormData({ ...convertFormData, display_name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="lead-form-group">
                    <label className="lead-label">Relationship Type</label>
                    <select
                      id="convert-rel-type"
                      className="lead-select"
                      value={convertFormData.relationship_type}
                      onChange={(e) => setConvertFormData({ ...convertFormData, relationship_type: e.target.value })}
                    >
                      <option value="Dealer">Authorized Dealer</option>
                      <option value="Customer">Commercial Dairy Customer</option>
                    </select>
                  </div>

                  {convertFormData.relationship_type === 'Dealer' && (
                    <div className="lead-form-group">
                      <label className="lead-label">Dealer Classification</label>
                      <select
                        className="lead-select"
                        value={convertFormData.dealer_classification}
                        onChange={(e) => setConvertFormData({ ...convertFormData, dealer_classification: e.target.value })}
                      >
                        <option value="Retailer">Retailer</option>
                        <option value="Wholesaler">Wholesaler</option>
                        <option value="Distributor">Regional Distributor</option>
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="lead-form-group">
                    <label className="lead-label">Assign Territory</label>
                    <select
                      className="lead-select"
                      value={convertFormData.territory_id}
                      onChange={(e) => setConvertFormData({ ...convertFormData, territory_id: e.target.value })}
                    >
                      <option value="">Select Territory</option>
                      {territories.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="lead-form-group">
                    <label className="lead-label">Assigned Staff Owner</label>
                    <select
                      className="lead-select"
                      value={convertFormData.assigned_owner_id}
                      onChange={(e) => setConvertFormData({ ...convertFormData, assigned_owner_id: e.target.value })}
                    >
                      <option value="">Select Staff</option>
                      {teamMembers.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="lead-form-group">
                  <label className="lead-label">Internal Conversion Note</label>
                  <textarea
                    rows={2}
                    className="lead-textarea"
                    placeholder="Add initial notes or terms agreed upon..."
                    value={convertFormData.notes}
                    onChange={(e) => setConvertFormData({ ...convertFormData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--bg-surface-hover, #f8fafc)' }}>
                <button
                  type="button"
                  id="cancel-convert-btn"
                  onClick={() => setConvertModalLead(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={converting}
                  className="btn btn-primary"
                  id="confirm-convert-btn"
                >
                  {converting ? 'Converting...' : 'Create Party & Link Lead →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
