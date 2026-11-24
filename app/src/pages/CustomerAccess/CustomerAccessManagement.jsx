import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/activityLogger';
import { Smartphone, RefreshCw, Sliders } from 'lucide-react';
import SummaryCards from './components/SummaryCards';
import CustomerTable from './components/CustomerTable';
import ProvisionModal from './components/ProvisionModal';
import ManageAccountModal from './components/ManageAccountModal';
import ReleaseConfigModal from './components/ReleaseConfigModal';
import WhatsAppInviteModal from './components/WhatsAppInviteModal';
import { getStoredReleaseConfig } from './utils/whatsappTemplate';
import { buildCustomerPresenceMap } from './utils/presenceUtils';
import { sortCustomers, getNextSortState } from './utils/customerSortUtils';

export default function CustomerAccessManagement() {
  // Live Metrics
  const [metrics, setMetrics] = useState({
    totalCustomers: 0,
    accountsCreated: 0,
    accountsPending: 0,
    activeAccounts: 0,
    disabledAccounts: 0,
    onlineNow: 0,
  });

  // Data & State
  const [allCustomers, setAllCustomers] = useState([]);
  const [buyerAccountsMap, setBuyerAccountsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [presenceFilter, setPresenceFilter] = useState('ALL'); // 'ALL' | 'ONLINE' | 'OFFLINE'
  const [presenceMap, setPresenceMap] = useState({});
  const rawSessionsRef = useRef([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  // App Release Config
  const [releaseConfig, setReleaseConfig] = useState(getStoredReleaseConfig());
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);

  // Modals
  const [selectedCustomerForProvision, setSelectedCustomerForProvision] = useState(null);
  const [selectedAccountForManage, setSelectedAccountForManage] = useState(null);
  const [whatsappInviteState, setWhatsappInviteState] = useState({
    isOpen: false,
    customer: null,
    account: null,
    temporaryPassword: '',
  });

  // Fetch Live Customers and Buyer Accounts
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all customers from crm_parties using batched chunking (bypasses PostgREST 1000-row limit)
      const batchSize = 1000;
      let allPartiesData = [];
      let from = 0;
      while (true) {
        const { data: batch, error: partiesErr } = await supabase
          .from('crm_parties')
          .select('id, display_name, legal_or_core_name, customer_code, mobile, whatsapp, city, state, crm_status, created_at')
          .order('display_name', { ascending: true })
          .range(from, from + batchSize - 1);

        if (partiesErr) throw partiesErr;
        if (!batch || batch.length === 0) break;
        allPartiesData.push(...batch);
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      // 2. Fetch all Buyer accounts from app_users using batched chunking
      let allBuyersData = [];
      let buyerFrom = 0;
      while (true) {
        const { data: bBatch, error: buyersErr } = await supabase
          .from('app_users')
          .select('id, email, display_name, role, crm_party_id, is_active, created_at')
          .eq('role', 'Buyer')
          .range(buyerFrom, buyerFrom + batchSize - 1);

        if (buyersErr) throw buyersErr;
        if (!bBatch || bBatch.length === 0) break;
        allBuyersData.push(...bBatch);
        if (bBatch.length < batchSize) break;
        buyerFrom += batchSize;
      }

      // 3. Map buyer accounts by crm_party_id
      const bMap = {};
      let activeCount = 0;
      let disabledCount = 0;

      (allBuyersData || []).forEach((b) => {
        if (b.crm_party_id) {
          bMap[b.crm_party_id] = b;
          if (b.is_active) activeCount++;
          else disabledCount++;
        }
      });

      const totalCust = allPartiesData.length;
      const createdCount = Object.keys(bMap).length;
      const pendingCount = Math.max(0, totalCust - createdCount);

      setMetrics({
        totalCustomers: totalCust,
        accountsCreated: createdCount,
        accountsPending: pendingCount,
        activeAccounts: activeCount,
        disabledAccounts: disabledCount,
      });

      setAllCustomers(allPartiesData);
      setBuyerAccountsMap(bMap);

      // 4. Fetch customer presence sessions from customer_app_sessions
      try {
        const { data: presBatch, error: presErr } = await supabase
          .from('customer_app_sessions')
          .select('*')
          .order('last_seen_at', { ascending: false });

        if (!presErr && presBatch) {
          rawSessionsRef.current = presBatch;
          setPresenceMap(buildCustomerPresenceMap(presBatch, Date.now()));
        }
      } catch (presFetchErr) {
        console.warn('Could not load customer presence sessions:', presFetchErr);
      }

      // 5. Fetch authoritative release configuration from crm_settings
      try {
        const { data: settingsData } = await supabase
          .from('crm_settings')
          .select('customer_app_release_config')
          .eq('id', 1)
          .maybeSingle();

        if (settingsData?.customer_app_release_config) {
          setReleaseConfig(settingsData.customer_app_release_config);
          saveStoredReleaseConfig(settingsData.customer_app_release_config);
        }
      } catch (settingsFetchErr) {
        console.warn('Could not load customer_app_release_config from crm_settings:', settingsFetchErr);
      }
    } catch (err) {
      console.error('Failed to load customer access data:', err);
      setError(err.message || 'Error loading live customer access records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time Supabase Presence Subscription & Dynamic 10s Ticker
  useEffect(() => {
    const channel = supabase
      .channel('customer_presence_feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_app_sessions' },
        (payload) => {
          let updated = [...rawSessionsRef.current];
          if (payload.eventType === 'INSERT') {
            updated = [payload.new, ...updated.filter((s) => s.session_id !== payload.new?.session_id)];
          } else if (payload.eventType === 'UPDATE') {
            updated = updated.map((s) => (s.session_id === payload.new?.session_id ? payload.new : s));
          } else if (payload.eventType === 'DELETE') {
            updated = updated.filter((s) => s.session_id !== payload.old?.session_id);
          }
          rawSessionsRef.current = updated;
          setPresenceMap(buildCustomerPresenceMap(updated, Date.now()));
        }
      )
      .subscribe();

    // 10-second ticker: refreshes continuous active duration and automatically marks stale heartbeats as offline
    const ticker = setInterval(() => {
      if (rawSessionsRef.current && rawSessionsRef.current.length > 0) {
        setPresenceMap(buildCustomerPresenceMap(rawSessionsRef.current, Date.now()));
      }
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(ticker);
    };
  }, []);

  // Client-side filtering & search
  const filteredCustomers = useMemo(() => {
    let list = allCustomers;

    // Filter by Account Status
    if (statusFilter === 'PENDING') {
      list = list.filter((c) => !buyerAccountsMap[c.id]);
    } else if (statusFilter === 'CREATED') {
      list = list.filter((c) => Boolean(buyerAccountsMap[c.id]));
    } else if (statusFilter === 'ACTIVE') {
      list = list.filter((c) => buyerAccountsMap[c.id]?.is_active === true);
    } else if (statusFilter === 'DISABLED') {
      list = list.filter((c) => buyerAccountsMap[c.id] && buyerAccountsMap[c.id]?.is_active === false);
    } else if (statusFilter === 'ONLINE') {
      list = list.filter((c) => presenceMap[c.id]?.isOnline === true);
    }

    // Filter by App Presence (ALL / ONLINE / OFFLINE)
    if (presenceFilter === 'ONLINE') {
      list = list.filter((c) => presenceMap[c.id]?.isOnline === true);
    } else if (presenceFilter === 'OFFLINE') {
      list = list.filter((c) => !presenceMap[c.id]?.isOnline);
    }

    // Filter by Search Term
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter((c) => {
        const name = (c.display_name || '').toLowerCase();
        const legal = (c.legal_or_core_name || '').toLowerCase();
        const code = (c.customer_code || '').toLowerCase();
        const mobile = (c.mobile || '').replace(/[^0-9]/g, '');
        const whatsapp = (c.whatsapp || '').replace(/[^0-9]/g, '');
        const city = (c.city || '').toLowerCase();
        const state = (c.state || '').toLowerCase();
        const buyerEmail = (buyerAccountsMap[c.id]?.email || '').toLowerCase();

        return (
          name.includes(term) ||
          legal.includes(term) ||
          code.includes(term) ||
          mobile.includes(term) ||
          whatsapp.includes(term) ||
          city.includes(term) ||
          state.includes(term) ||
          buyerEmail.includes(term)
        );
      });
    }

    return list;
  }, [allCustomers, buyerAccountsMap, statusFilter, presenceFilter, presenceMap, searchTerm]);

  // Count online customers
  const onlineCount = useMemo(() => {
    return Object.values(presenceMap).filter((p) => p.isOnline).length;
  }, [presenceMap]);

  // Keep metrics.onlineNow in sync with live presence state
  useEffect(() => {
    setMetrics((prev) => ({
      ...prev,
      onlineNow: onlineCount,
    }));
  }, [onlineCount]);

  // Sort filtered customer records across all pages
  const sortedCustomers = useMemo(() => {
    return sortCustomers(filteredCustomers, sortConfig.key, sortConfig.direction, {
      buyerAccountsMap,
      presenceMap,
    });
  }, [filteredCustomers, sortConfig, buyerAccountsMap, presenceMap]);

  // Pagination calculation
  const totalItems = sortedCustomers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCustomers.slice(start, start + pageSize);
  }, [sortedCustomers, currentPage, pageSize]);

  // Reset to page 1 on filter, search or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, presenceFilter, sortConfig]);

  const handleSort = (columnKey) => {
    setSortConfig((prev) => getNextSortState(prev.key, prev.direction, columnKey));
  };

  // Handlers
  const handleProvisionClick = (customer) => {
    setSelectedCustomerForProvision(customer);
  };

  const handleManageClick = (customer, account) => {
    setSelectedAccountForManage({ customer, account });
  };

  const handleOpenWhatsAppInvite = ({ customer, account, temporaryPassword = '' }) => {
    setWhatsappInviteState({
      isOpen: true,
      customer,
      account,
      temporaryPassword,
    });
  };

  const handleProvisionSuccess = ({ loginId, temporaryPassword, customer }) => {
    setSelectedCustomerForProvision(null);
    loadData(); // Reload live data
    // Open WhatsApp invite directly with temporary credentials
    setWhatsappInviteState({
      isOpen: true,
      customer,
      account: { email: loginId, is_active: true },
      temporaryPassword,
    });
  };

  const handleSaveReleaseConfig = async (updated) => {
    setReleaseConfig(updated);
    saveStoredReleaseConfig(updated);

    try {
      // Persist to central authoritative crm_settings in Supabase
      const { error: settingsErr } = await supabase
        .from('crm_settings')
        .update({
          customer_app_release_config: updated,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (settingsErr) {
        console.warn('Failed to persist release config to crm_settings in DB:', settingsErr);
      } else {
        await logActivity({
          module: 'CustomerAccess',
          actionType: 'UPDATED',
          summary: `Updated Order App Release Config: version ${updated.appVersion}, URL: ${updated.downloadUrl}`,
        });
      }
    } catch (e) {
      console.error('Error saving release config to database:', e);
    }
  };

  return (
    <div className="container-responsive animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: '#123d26',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(18, 61, 38, 0.2)',
          }}>
            <Smartphone size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                Customer App Access Management
              </h1>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.2rem 0.55rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(18, 61, 38, 0.1)',
                color: '#123d26',
              }}>
                Order App
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
              Provision buyer credentials, manage active/disabled state, configure APK downloads, and prepare Hindi WhatsApp invitations.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setReleaseModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Sliders size={15} /> APK Release Config
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          backgroundColor: '#fef2f2',
          color: '#b91c1c',
          border: '1px solid #fecaca',
          marginBottom: '1.25rem',
          fontSize: '0.875rem',
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Summary Cards */}
      <SummaryCards
        metrics={metrics}
        loading={loading}
        onFilterSelect={(tabId) => setStatusFilter(tabId)}
        activeFilter={statusFilter}
      />

      {/* Customer Directory Table */}
      <CustomerTable
        customers={paginatedCustomers}
        buyerAccountsMap={buyerAccountsMap}
        presenceMap={presenceMap}
        presenceFilter={presenceFilter}
        onPresenceFilterChange={setPresenceFilter}
        onlineCount={onlineCount}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        sortConfig={sortConfig}
        onSort={handleSort}
        onProvisionClick={handleProvisionClick}
        onManageClick={handleManageClick}
        onWhatsAppClick={handleOpenWhatsAppInvite}
      />

      {/* Provision Modal */}
      {selectedCustomerForProvision && (
        <ProvisionModal
          isOpen={Boolean(selectedCustomerForProvision)}
          onClose={() => setSelectedCustomerForProvision(null)}
          customer={selectedCustomerForProvision}
          existingAccount={buyerAccountsMap[selectedCustomerForProvision?.id]}
          onProvisionSuccess={handleProvisionSuccess}
        />
      )}

      {/* Manage Account Modal */}
      {selectedAccountForManage && (
        <ManageAccountModal
          isOpen={Boolean(selectedAccountForManage)}
          onClose={() => setSelectedAccountForManage(null)}
          customer={selectedAccountForManage.customer}
          account={selectedAccountForManage.account}
          onAccountUpdated={() => {
            setSelectedAccountForManage(null);
            loadData();
          }}
          onOpenWhatsAppInvite={handleOpenWhatsAppInvite}
        />
      )}

      {/* App Release Config Modal */}
      {releaseModalOpen && (
        <ReleaseConfigModal
          isOpen={releaseModalOpen}
          onClose={() => setReleaseModalOpen(false)}
          releaseConfig={releaseConfig}
          onSaveConfig={handleSaveReleaseConfig}
        />
      )}

      {/* WhatsApp Invite Modal */}
      {whatsappInviteState.isOpen && (
        <WhatsAppInviteModal
          isOpen={whatsappInviteState.isOpen}
          onClose={() => setWhatsappInviteState(prev => ({ ...prev, isOpen: false }))}
          customer={whatsappInviteState.customer}
          account={whatsappInviteState.account}
          temporaryPassword={whatsappInviteState.temporaryPassword}
          releaseConfig={releaseConfig}
        />
      )}
    </div>
  );
}
