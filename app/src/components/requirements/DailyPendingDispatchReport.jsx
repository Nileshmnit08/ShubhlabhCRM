import React, { useState, useMemo, useEffect, useContext } from 'react';
import { 
  FileText, Calendar, Copy, Check, 
  Package, Users, ClipboardList, 
  MessageCircle, Eye, AlertTriangle, Gift, Scale, MapPin, X,
  Square, RotateCcw, CheckCircle2, ChevronUp, ChevronDown, Loader2, Truck
} from 'lucide-react';
import { AuthContext } from '../../AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  filterPendingRequirements, 
  computeDailyPendingReport, 
  generateWhatsAppReportText,
  formatDateForDisplay
} from '../../lib/dailyPendingReport';
import {
  computeProductionReport,
  generateProductionReportText,
  formatIndianNumber,
  formatCompletionDateTime,
} from '../../lib/productionReport';

export default function DailyPendingDispatchReport({ requirements = [], loading = false, onRefresh }) {
  const { userProfile } = useContext(AuthContext);

  // Default to today's date in local YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dateMode, setDateMode] = useState('exact'); // 'exact' | 'up_to' | 'all'
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [productionCopyFeedback, setProductionCopyFeedback] = useState(false);
  const [productionModalTab, setProductionModalTab] = useState('pending'); // 'pending' | 'completed'

  // Production completion interaction state
  const [collapsedCustomers, setCollapsedCustomers] = useState(new Set());
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'complete'|'undo', item, order, customer }
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState(null);
  const [actionToast, setActionToast] = useState(null);
  const [usersMap, setUsersMap] = useState({});

  // Auto-dismiss action toast
  useEffect(() => {
    if (!actionToast) return;
    const t = setTimeout(() => setActionToast(null), 3500);
    return () => clearTimeout(t);
  }, [actionToast]);

  // Fetch users for resolving responsible staff in completed production report
  useEffect(() => {
    async function fetchUsers() {
      try {
        const { data, error } = await supabase.from('app_users').select('id, display_name, email');
        if (!error && data) {
          const map = {};
          data.forEach(u => {
            map[u.id] = u;
          });
          setUsersMap(map);
        }
      } catch (err) {
        console.warn('Could not fetch app_users for production report:', err);
      }
    }
    fetchUsers();
  }, []);

  // Close production modal on Escape key
  useEffect(() => {
    if (!showProductionModal && !confirmModal) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (confirmModal && !isMutating) setConfirmModal(null);
        else if (showProductionModal) setShowProductionModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showProductionModal, confirmModal, isMutating]);

  // Compute pending requirements based on date filters
  const pendingFiltered = useMemo(() => {
    return filterPendingRequirements(requirements, {
      reportDate: selectedDate,
      dateMode,
    });
  }, [requirements, selectedDate, dateMode]);

  // Compute report data (customer-wise orders, weights in MT, gifts)
  const reportData = useMemo(() => {
    return computeDailyPendingReport(pendingFiltered, dateMode === 'all' ? '' : selectedDate);
  }, [pendingFiltered, selectedDate, dateMode]);

  // Generate WhatsApp message string
  const whatsAppText = useMemo(() => {
    return generateWhatsAppReportText(reportData);
  }, [reportData]);

  // Compute Factory Production Report data (both pending and completed views)
  const productionData = useMemo(() => {
    return computeProductionReport(pendingFiltered, dateMode === 'all' ? '' : selectedDate, { usersMap });
  }, [pendingFiltered, selectedDate, dateMode, usersMap]);

  const activeProductionData = useMemo(() => {
    return productionModalTab === 'completed'
      ? (productionData.completed || productionData)
      : (productionData.pending || productionData);
  }, [productionData, productionModalTab]);

  const productionReportText = useMemo(() => {
    return generateProductionReportText(productionData, { view: productionModalTab });
  }, [productionData, productionModalTab]);

  // Shared clipboard helper
  const copyTextToClipboard = async (text, setFeedback) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setFeedback(true);
      setTimeout(() => setFeedback(false), 2500);
    } catch (err) {
      console.error('Failed to copy report text:', err);
    }
  };

  // Handle Share on WhatsApp
  const handleShareWhatsApp = () => {
    if (reportData.totalCustomers === 0) return;
    const url = `https://wa.me/?text=${encodeURIComponent(whatsAppText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Handle Copy to Clipboard (Customer Report)
  const handleCopyReport = () => copyTextToClipboard(whatsAppText, setCopyFeedback);

  // Handle Production Report WhatsApp & Copy
  const handleShareProductionWhatsApp = () => {
    if (activeProductionData.totalBags === 0) return;
    const url = `https://wa.me/?text=${encodeURIComponent(productionReportText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyProductionReport = () => copyTextToClipboard(productionReportText, setProductionCopyFeedback);

  // Permissions & Actions
  const isAdminOrManager = userProfile?.role === 'Admin' || userProfile?.role === 'Manager';
  const canUndoItem = (item) => {
    if (isAdminOrManager) return true;
    if (!item?.productionDoneBy) return true;
    return item.productionDoneBy === userProfile?.id;
  };

  const toggleCustomerCollapse = (customerId) => {
    setCollapsedCustomers(prev => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  const handlePromptMarkDone = (item, order, customer) => {
    setMutationError(null);
    setConfirmModal({
      type: 'complete',
      item,
      order,
      customer,
    });
  };

  const handlePromptUndo = (item, order, customer) => {
    setMutationError(null);
    setConfirmModal({
      type: 'undo',
      item,
      order,
      customer,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal || !confirmModal.item?.id) return;
    setIsMutating(true);
    setMutationError(null);

    const isComplete = confirmModal.type === 'complete';
    const itemId = confirmModal.item.id;

    try {
      const updatePayload = isComplete ? {
        production_done: true,
        production_done_at: new Date().toISOString(),
        production_done_by: userProfile?.id || null,
      } : {
        production_done: false,
        production_done_at: null,
        production_done_by: null,
      };

      const { error } = await supabase
        .from('requirement_items')
        .update(updatePayload)
        .eq('id', itemId);

      if (error) throw error;

      setActionToast({
        type: 'success',
        message: isComplete
          ? `Marked production done for ${confirmModal.item.productName} (${confirmModal.item.pendingBags} Bags)`
          : `Reverted ${confirmModal.item.productName} to Production Pending`,
      });

      setConfirmModal(null);

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error updating production status:', err);
      let errMsg = err.message || 'Failed to update production status. Please try again.';
      if (errMsg.includes('production_done') || errMsg.includes('schema cache')) {
        errMsg = 'Database column missing: Please execute migration 260_sprint_SL_PRODUCTION_STATUS_01.sql in Supabase Dashboard SQL Editor.';
      }
      setMutationError(errMsg);
    } finally {
      setIsMutating(false);
    }
  };

  const handleQuickDate = (mode, targetDate) => {
    setDateMode(mode);
    if (targetDate) setSelectedDate(targetDate);
  };

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Header Toolbar & Date Selection */}
      <div 
        className="glass-panel" 
        style={{ 
          background: '#ffffff', 
          borderRadius: '12px', 
          padding: '1.25rem', 
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <FileText size={20} style={{ color: 'var(--primary)' }} />
              Customer-wise Pending Orders Report
            </h2>
            <p className="text-secondary" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
              {dateMode === 'exact' && `Showing pending orders scheduled for ${formatDateForDisplay(selectedDate)}`}
              {dateMode === 'up_to' && `Showing pending orders due on or before ${formatDateForDisplay(selectedDate)} (including backlog)`}
              {dateMode === 'all' && 'Showing all undispatched orders across all dates'}
            </p>
          </div>

          {/* Action buttons (WhatsApp sharing & copy) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowPreview(prev => !prev)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '7px 12px' }}
            >
              <Eye size={15} />
              {showPreview ? 'Hide Preview' : 'Preview WhatsApp Message'}
            </button>

            <button
              type="button"
              onClick={handleCopyReport}
              className="btn btn-secondary"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                fontSize: '0.85rem', 
                padding: '7px 12px',
                borderColor: copyFeedback ? 'var(--success)' : undefined,
                color: copyFeedback ? 'var(--success)' : undefined,
                background: copyFeedback ? 'rgba(16, 185, 129, 0.08)' : undefined
              }}
              title="Copy WhatsApp formatted report to clipboard"
            >
              {copyFeedback ? <Check size={15} /> : <Copy size={15} />}
              {copyFeedback ? 'Copied to Clipboard!' : 'Copy Report'}
            </button>

            <button
              type="button"
              onClick={() => setShowProductionModal(true)}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                padding: '7px 12px'
              }}
              title="Open Hindi Production Report for factory & packing team"
            >
              🏭 Production Report
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={reportData.totalCustomers === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 16px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: 'none',
                cursor: reportData.totalCustomers === 0 ? 'not-allowed' : 'pointer',
                background: reportData.totalCustomers === 0 ? '#9CA3AF' : '#25D366',
                color: '#ffffff',
                boxShadow: reportData.totalCustomers === 0 ? 'none' : '0 2px 6px rgba(37, 211, 102, 0.3)',
                transition: 'opacity 0.2s',
                opacity: reportData.totalCustomers === 0 ? 0.6 : 1
              }}
              title={reportData.totalCustomers === 0 ? 'No pending orders to share' : 'Share report on WhatsApp'}
            >
              <MessageCircle size={16} />
              Share on WhatsApp
            </button>
          </div>
        </div>

        {/* Date Selector Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid #F3F4F6', paddingTop: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} className="text-secondary" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Schedule Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                if (dateMode === 'all') setDateMode('exact');
              }}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-base)',
                fontSize: '0.85rem',
                fontWeight: 500
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => handleQuickDate('exact', todayStr)}
              className={`badge ${dateMode === 'exact' && selectedDate === todayStr ? 'badge-primary' : 'badge-neutral'}`}
              style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '0.8rem' }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate('exact', getTomorrowStr())}
              className={`badge ${dateMode === 'exact' && selectedDate === getTomorrowStr() ? 'badge-primary' : 'badge-neutral'}`}
              style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '0.8rem' }}
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate('up_to', selectedDate)}
              className={`badge ${dateMode === 'up_to' ? 'badge-warning' : 'badge-neutral'}`}
              style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '0.8rem' }}
              title="Includes overdue orders up to this date"
            >
              Due on or before Date
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate('all', selectedDate)}
              className={`badge ${dateMode === 'all' ? 'badge-primary' : 'badge-neutral'}`}
              style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '0.8rem' }}
            >
              All Undispatched
            </button>
          </div>
        </div>

        {/* Message Preview Drawer */}
        {showPreview && (
          <div 
            style={{
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '1rem',
              marginTop: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                WhatsApp Output Preview (Mobile Readable)
              </span>
              <button
                type="button"
                onClick={handleCopyReport}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                {copyFeedback ? 'Copied!' : 'Copy Text'}
              </button>
            </div>
            <pre 
              style={{ 
                margin: 0, 
                fontFamily: 'monospace, Courier, sans-serif', 
                fontSize: '0.85rem', 
                whiteSpace: 'pre-wrap', 
                background: '#ffffff', 
                padding: '14px', 
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                color: '#111827',
                maxHeight: '360px',
                overflowY: 'auto',
                lineHeight: '1.45'
              }}
            >
              {whatsAppText}
            </pre>
          </div>
        )}
      </div>

      {/* 2. Top Metric Cards */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem' 
        }}
      >
        {/* Pending Customers */}
        <div 
          className="glass-panel" 
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '1.25rem', 
            border: '1px solid var(--border)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Pending Customers
            </span>
            <div style={{ padding: '6px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: 'var(--primary)' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {reportData.totalCustomers}
          </div>
          <div className="text-secondary" style={{ fontSize: '0.78rem', marginTop: '4px' }}>
            Parties with pending orders
          </div>
        </div>

        {/* Pending Bags */}
        <div 
          className="glass-panel" 
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '1.25rem', 
            border: '1px solid var(--border)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Total Pending Bags
            </span>
            <div style={{ padding: '6px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: 'var(--warning)' }}>
              <Package size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {reportData.totalPendingBags.toLocaleString('en-IN')} Bags
          </div>
          <div className="text-secondary" style={{ fontSize: '0.78rem', marginTop: '4px' }}>
            Total bag count
          </div>
        </div>

        {/* Total Pending Weight (MT) */}
        <div 
          className="glass-panel" 
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '1.25rem', 
            border: '1px solid var(--border)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Available Weight
            </span>
            <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: 'var(--success)' }}>
              <Scale size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {reportData.totalPendingWeightMT} MT
          </div>
          <div className="text-secondary" style={{ fontSize: '0.78rem', marginTop: '4px' }}>
            {reportData.hasMissingWeightOverall ? (
              <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={12} /> Some product weights are unavailable
              </span>
            ) : (
              'Sum of known product weights'
            )}
          </div>
        </div>

        {/* Pending Gifts */}
        <div 
          className="glass-panel" 
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '1.25rem', 
            border: '1px solid var(--border)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Committed Gifts
            </span>
            <div style={{ padding: '6px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '8px', color: '#EC4899' }}>
              <Gift size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {reportData.giftsSummary.length}
          </div>
          <div className="text-secondary" style={{ fontSize: '0.78rem', marginTop: '4px' }}>
            Distinct gift items
          </div>
        </div>
      </div>

      {/* 3. Empty State */}
      {reportData.totalCustomers === 0 ? (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '3.5rem 2rem', 
            textAlign: 'center', 
            background: '#ffffff', 
            borderRadius: '12px', 
            border: '1px solid var(--border)' 
          }}
        >
          <div 
            style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              background: '#F3F4F6', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 1rem', 
              color: 'var(--text-muted)' 
            }}
          >
            <ClipboardList size={28} />
          </div>
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)', fontSize: '1.2rem' }}>
            No pending dispatch requirements found for this date.
          </h3>
          <p className="text-secondary" style={{ margin: '0 auto 1.5rem', maxWidth: '440px', fontSize: '0.9rem' }}>
            There are no undispatched orders scheduled for {formatDateForDisplay(selectedDate)}.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              onClick={() => handleQuickDate('exact', todayStr)} 
              className="btn btn-primary"
            >
              Switch to Today
            </button>
            <button 
              type="button" 
              onClick={() => handleQuickDate('all', selectedDate)} 
              className="btn btn-secondary"
            >
              View All Undispatched Orders
            </button>
          </div>
        </div>
      ) : (
        /* 4. Customer-wise Pending Orders */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reportData.customerList.map((customer, idx) => {
            const customerKey = customer.customerId || idx;
            const isCollapsed = collapsedCustomers.has(customerKey);
            return (
              <div 
                key={customerKey} 
                className="glass-panel" 
                style={{ 
                  background: '#ffffff', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border)',
                  padding: '1.25rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                {/* Customer Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: isCollapsed ? 'none' : '1px solid #F3F4F6', paddingBottom: isCollapsed ? 0 : '0.75rem', marginBottom: isCollapsed ? 0 : '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{idx + 1}.</span> {customer.customerName}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#EFF6FF',
                        color: '#1D4ED8',
                        border: '1px solid #BFDBFE',
                        padding: '2px 9px',
                        borderRadius: '9999px',
                        fontSize: '0.78rem',
                        fontWeight: 600
                      }}>
                        <Truck size={12} /> Not Dispatched
                      </span>
                    </h3>
                    {customer.customerCity && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
                        <MapPin size={12} /> {customer.customerCity}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.85rem', padding: '4px 10px', fontWeight: 700 }}>
                      📦 {customer.totalBags.toLocaleString('en-IN')} BAGS
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: '0.85rem', padding: '4px 10px', fontWeight: 700 }}>
                      ⚖️ {(customer.totalWeightKg / 1000).toFixed(3)} MT
                    </span>
                    {customer.hasMissingWeight && (
                      <span className="badge badge-warning" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                        ⚠️ Weight incomplete
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleCustomerCollapse(customerKey)}
                      aria-label={isCollapsed ? 'Expand customer details' : 'Collapse customer details'}
                      title={isCollapsed ? 'Expand' : 'Collapse'}
                      style={{
                        background: '#F3F4F6',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        color: '#4B5563',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: '4px'
                      }}
                    >
                      {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                  </div>
                </div>

                {/* Orders under this customer (preserving separate order dates) */}
                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {customer.orders.map((order, oIdx) => (
                      <div 
                        key={order.orderId || oIdx}
                        style={{
                          background: '#F9FAFB',
                          borderRadius: '8px',
                          padding: '1rem',
                          border: '1px solid #E5E7EB'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            📅 <strong style={{ color: 'var(--primary)' }}>{order.orderDate}</strong>
                            {order.demandRef && <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>({order.demandRef})</span>}
                          </span>
                          <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                            Owner: {order.assignedOwner}
                          </span>
                        </div>

                        {/* Table View: Product | Bags | Kg/Bag | Total MT | Production Status | Action */}
                        <div style={{ overflowX: 'auto', margin: '8px 0' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid #E5E7EB', fontSize: '0.8rem' }}>
                                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Product</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Bags</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Kg/Bag</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Total MT</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'center' }}>Production Status</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.products.map((p, pIdx) => {
                                const isDone = Boolean(p.productionDone);
                                const authorizedToUndo = canUndoItem(p);
                                return (
                                  <tr key={p.id || pIdx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                    <td style={{ padding: '10px 10px', fontWeight: 700, color: '#111827' }}>
                                      {p.productName}
                                    </td>
                                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                                      {p.pendingBags}
                                    </td>
                                    <td style={{ padding: '10px 10px', textAlign: 'right', color: p.hasWeight ? '#111827' : 'var(--warning)', fontWeight: 500 }}>
                                      {p.hasWeight ? p.bagWeightKg : '—'}
                                    </td>
                                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: p.hasWeight ? '#16A34A' : 'var(--warning)' }}>
                                      {p.hasWeight ? (p.itemWeightKg / 1000).toFixed(3) : '—'}
                                    </td>
                                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                      {isDone ? (
                                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                                          <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            background: '#DCFCE7',
                                            color: '#15803D',
                                            border: '1px solid #BBF7D0',
                                            padding: '3px 12px',
                                            borderRadius: '9999px',
                                            fontSize: '0.80rem',
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap'
                                          }}>
                                            <CheckCircle2 size={13} style={{ color: '#16A34A' }} /> Production Done
                                          </span>
                                          {p.productionDoneAt && (
                                            <span style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '3px', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                                              ✓ On {formatCompletionDateTime(p.productionDoneAt)}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          background: '#FEF3C7',
                                          color: '#92400E',
                                          border: '1px solid #FDE68A',
                                          padding: '3px 12px',
                                          borderRadius: '9999px',
                                          fontSize: '0.80rem',
                                          fontWeight: 600,
                                          whiteSpace: 'nowrap'
                                        }}>
                                          ⏳ Production Pending
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                                      {isDone ? (
                                        <button
                                          type="button"
                                          onClick={() => handlePromptUndo(p, order, customer)}
                                          disabled={!authorizedToUndo || !p.id}
                                          title={!authorizedToUndo ? 'Only Admins, Managers, or the assigned user can undo' : !p.id ? 'Line item ID not available' : 'Undo production completion'}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            padding: '5px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid #D1D5DB',
                                            background: '#ffffff',
                                            color: authorizedToUndo ? '#374151' : '#9CA3AF',
                                            fontSize: '0.82rem',
                                            fontWeight: 600,
                                            cursor: authorizedToUndo && p.id ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.15s ease'
                                          }}
                                          onMouseEnter={e => { if (authorizedToUndo && p.id) e.currentTarget.style.background = '#F3F4F6'; }}
                                          onMouseLeave={e => { if (authorizedToUndo && p.id) e.currentTarget.style.background = '#ffffff'; }}
                                        >
                                          <RotateCcw size={13} /> Undo
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handlePromptMarkDone(p, order, customer)}
                                          disabled={!p.id}
                                          title={!p.id ? 'Line item ID not available' : 'Mark production done'}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '5px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid #16A34A',
                                            background: '#ffffff',
                                            color: '#16A34A',
                                            fontSize: '0.82rem',
                                            fontWeight: 600,
                                            cursor: p.id ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.15s ease'
                                          }}
                                          onMouseEnter={e => { if (p.id) e.currentTarget.style.background = '#F0FDF4'; }}
                                          onMouseLeave={e => { if (p.id) e.currentTarget.style.background = '#ffffff'; }}
                                        >
                                          <Square size={14} /> Mark Production Done
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Order Totals Bar */}
                        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              📦 Total: <strong>{order.orderTotalBags} Bags</strong>
                            </span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              ⚖️ Weight: <strong>{(order.orderTotalWeightKg / 1000).toFixed(3)} MT</strong>
                            </span>
                            {order.orderHasMissingWeight && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--warning)', fontWeight: 600 }}>
                                ⚠️ Weight incomplete
                              </span>
                            )}
                          </div>

                          {/* Gifts */}
                          {order.gifts.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {order.gifts.map((g, gIdx) => (
                                <span key={gIdx} style={{ fontSize: '0.82rem', color: '#047857', background: '#ECFDF5', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
                                  🎁 Gift: {g.giftName} × {g.giftQuantity !== null ? g.giftQuantity : 'Qty Not Specified'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                )}

              </div>
            );
          })}

          {/* 5. Grand Total Pending & Gifts Card */}
          <div 
            className="glass-panel" 
            style={{ 
              background: '#ffffff', 
              borderRadius: '12px', 
              border: '1px solid var(--border)',
              padding: '1.25rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📌 Grand Total Pending
            </h3>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'baseline' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                📦 Total Bags: <span style={{ color: 'var(--primary)' }}>{reportData.totalPendingBags} Bags</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                ⚖️ Available Weight: <span style={{ color: 'var(--primary)' }}>{reportData.totalPendingWeightMT} MT</span>
              </div>
            </div>
            {reportData.hasMissingWeightOverall && (
              <div style={{ marginTop: '6px', fontSize: '0.85rem', color: 'var(--warning)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={14} /> Some product weights are unavailable.
              </div>
            )}

            {/* Pending Gifts Summary */}
            {reportData.giftsSummary.length > 0 && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #F3F4F6' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Gift size={16} style={{ color: '#EC4899' }} /> 🎁 Pending Gifts
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {reportData.giftsSummary.map((g, idx) => (
                    <div key={idx} style={{ fontSize: '0.88rem', color: '#374151' }}>
                      <strong style={{ color: '#9D174D' }}>{g.giftName}:</strong> {g.summaryText}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Factory Production Report Modal (SL-REQ-PRODUCTION-REPORT-01 & SL-PRODUCTION-STATUS-01) */}
      {showProductionModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="production-report-modal-title"
          onClick={() => setShowProductionModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              color: '#111827',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #E5E7EB' }}>
              <div>
                <h3 id="production-report-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
                  🏭 Production Report (उत्पादन विभाग)
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#6B7280' }}>
                  दिनांक: {productionData.reportDateDDMMYYYY} • केवल उत्पाद एवं पैकेजिंग सारांश (ग्राहक जानकारी रहित)
                </p>
              </div>
              <button
                type="button"
                aria-label="बंद करें"
                onClick={() => setShowProductionModal(false)}
                style={{
                  background: '#F3F4F6',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#4B5563',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* View Tabs: Pending Production vs Completed Production */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', padding: '0 1rem', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setProductionModalTab('pending')}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: productionModalTab === 'pending' ? '2px solid var(--primary)' : '2px solid transparent',
                  background: 'transparent',
                  color: productionModalTab === 'pending' ? 'var(--primary)' : '#6B7280',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ⏳ Pending Production ({formatIndianNumber(productionData.pending?.totalBags || 0)} Bags)
              </button>
              <button
                type="button"
                onClick={() => setProductionModalTab('completed')}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: productionModalTab === 'completed' ? '2px solid #16A34A' : '2px solid transparent',
                  background: 'transparent',
                  color: productionModalTab === 'completed' ? '#16A34A' : '#6B7280',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ✅ Completed Production ({formatIndianNumber(productionData.completed?.totalBags || 0)} Bags)
              </button>
            </div>

            {/* Compact Totals Strip */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '0.75rem 1.25rem', backgroundColor: '#ffffff', borderBottom: '1px solid #E5E7EB', fontSize: '0.85rem' }}>
              <span>
                📦 उत्पाद: <strong>{activeProductionData.products?.length || 0}</strong>
              </span>
              <span>
                🛍️ {productionModalTab === 'completed' ? 'पूर्ण बैग' : 'लंबित बैग'}: <strong>{formatIndianNumber(activeProductionData.totalBags || 0)}</strong>
              </span>
              <span>
                ⚖️ {productionModalTab === 'completed' ? 'तैयार माल' : 'कुल माल'}: <strong>{formatIndianNumber(activeProductionData.totalKnownWeightKg || 0)} किलो ({activeProductionData.totalKnownWeightMT || '0.000'} MT)</strong>
              </span>
              {activeProductionData.hasMissingWeightOverall && (
                <span style={{ color: '#B45309', fontWeight: 600 }}>
                  ⚠️ कुछ वजन उपलब्ध नहीं
                </span>
              )}
            </div>

            {/* Preview Text */}
            <div style={{ padding: '1.25rem' }}>
              <pre
                style={{
                  margin: 0,
                  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
                  fontSize: '0.9rem',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: '#F9FAFB',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  color: '#111827',
                  maxHeight: '50vh',
                  overflowY: 'auto',
                  lineHeight: 1.55
                }}
              >
                {productionReportText}
              </pre>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', padding: '1rem 1.25rem', borderTop: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
              <button
                type="button"
                onClick={() => setShowProductionModal(false)}
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.88rem' }}
              >
                बंद करें
              </button>

              <button
                type="button"
                onClick={handleCopyProductionReport}
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '0.88rem',
                  borderColor: productionCopyFeedback ? 'var(--success)' : undefined,
                  color: productionCopyFeedback ? 'var(--success)' : undefined,
                  background: productionCopyFeedback ? 'rgba(16, 185, 129, 0.08)' : undefined
                }}
              >
                {productionCopyFeedback ? <Check size={15} /> : <Copy size={15} />}
                {productionCopyFeedback ? 'कॉपी हो गया!' : 'कॉपी करें'}
              </button>

              <button
                type="button"
                onClick={handleShareProductionWhatsApp}
                disabled={(activeProductionData.totalBags || 0) === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: (activeProductionData.totalBags || 0) === 0 ? 'not-allowed' : 'pointer',
                  background: (activeProductionData.totalBags || 0) === 0 ? '#9CA3AF' : '#25D366',
                  color: '#ffffff',
                  opacity: (activeProductionData.totalBags || 0) === 0 ? 0.6 : 1
                }}
              >
                <MessageCircle size={16} />
                WhatsApp पर भेजें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Production Confirmation Dialog (Mark Done / Undo) */}
      {confirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !isMutating && setConfirmModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              color: '#111827',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E5E7EB',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: confirmModal.type === 'complete' ? '#DCFCE7' : '#FEF3C7',
                color: confirmModal.type === 'complete' ? '#16A34A' : '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {confirmModal.type === 'complete' ? <CheckCircle2 size={24} /> : <RotateCcw size={22} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  {confirmModal.type === 'complete' ? 'Confirm Production Done' : 'Undo Production Completion'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#6B7280' }}>
                  {confirmModal.type === 'complete' 
                    ? 'Confirm production completion for this line item' 
                    : 'Revert this line item back to Production Pending'}
                </p>
              </div>
            </div>

            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px 14px', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Product:</span>
                <strong style={{ color: '#111827' }}>{confirmModal.item.productName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Quantity:</span>
                <strong style={{ color: '#111827' }}>{confirmModal.item.pendingBags} Bags</strong>
              </div>
              {confirmModal.item.bagWeightKg && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B7280' }}>Packaging:</span>
                  <span style={{ fontWeight: 600 }}>{confirmModal.item.bagWeightKg} kg/bag</span>
                </div>
              )}
              {confirmModal.order?.demandRef && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B7280' }}>Demand Ref:</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{confirmModal.order.demandRef}</span>
                </div>
              )}
              {confirmModal.customer?.customerName && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B7280' }}>Customer:</span>
                  <span style={{ color: '#374151' }}>{confirmModal.customer.customerName}</span>
                </div>
              )}
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.5 }}>
              {confirmModal.type === 'complete'
                ? 'This will record the completion timestamp and mark the item as produced in CRM. The requirement dispatch status will not be modified.'
                : 'This will reset the production status to Pending and return the item to the factory production queue.'}
            </p>

            {mutationError && (
              <div style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem' }}>
                {mutationError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={isMutating}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.88rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isMutating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: isMutating ? 'not-allowed' : 'pointer',
                  background: confirmModal.type === 'complete' ? '#16A34A' : '#4B5563',
                  color: '#ffffff',
                }}
              >
                {isMutating && <Loader2 size={15} className="spin" />}
                {confirmModal.type === 'complete' ? 'Yes, Mark Done' : 'Yes, Undo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Action Toast Notification */}
      {actionToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1200,
          background: actionToast.type === 'success' ? '#15803D' : '#DC2626',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.9rem',
          fontWeight: 500,
        }}>
          {actionToast.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span>{actionToast.message}</span>
        </div>
      )}

    </div>
  );
}
