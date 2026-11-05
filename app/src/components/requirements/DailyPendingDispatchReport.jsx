import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, Calendar, Copy, Check, Share2, 
  Package, Users, ClipboardList, AlertCircle, 
  ExternalLink, MessageCircle, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import { 
  filterPendingRequirements, 
  computeDailyPendingReport, 
  generateWhatsAppReportText,
  formatDateForDisplay
} from '../../lib/dailyPendingReport';

export default function DailyPendingDispatchReport({ requirements = [], loading = false, onRefresh }) {
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

  // Compute pending requirements based on date filters
  const pendingFiltered = useMemo(() => {
    return filterPendingRequirements(requirements, {
      reportDate: selectedDate,
      dateMode,
    });
  }, [requirements, selectedDate, dateMode]);

  // Compute report data (metrics, product breakdown, customer breakdown)
  const reportData = useMemo(() => {
    return computeDailyPendingReport(pendingFiltered, dateMode === 'all' ? '' : selectedDate);
  }, [pendingFiltered, selectedDate, dateMode]);

  // Generate WhatsApp message string
  const whatsAppText = useMemo(() => {
    return generateWhatsAppReportText(reportData);
  }, [reportData]);

  // Handle Share on WhatsApp
  const handleShareWhatsApp = () => {
    if (reportData.totalRequirements === 0) return;
    const url = `https://wa.me/?text=${encodeURIComponent(whatsAppText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Handle Copy to Clipboard
  const handleCopyReport = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(whatsAppText);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = whatsAppText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    } catch (err) {
      console.error('Failed to copy report text:', err);
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
      
      {/* 1. Header Toolbar & Date Selection (FR-02) */}
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
              Daily Pending Dispatch Report
            </h2>
            <p className="text-secondary" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
              {dateMode === 'exact' && `Showing pending dispatches scheduled for ${formatDateForDisplay(selectedDate)}`}
              {dateMode === 'up_to' && `Showing pending dispatches due on or before ${formatDateForDisplay(selectedDate)} (including overdue)`}
              {dateMode === 'all' && 'Showing all undispatched requirements across all dates'}
            </p>
          </div>

          {/* Action buttons (FR-06) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowPreview(prev => !prev)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '7px 12px' }}
            >
              <Eye size={15} />
              {showPreview ? 'Hide Preview' : 'Preview Message'}
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

            {/* Share on WhatsApp (FR-06, FR-07 disabled when empty) */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={reportData.totalRequirements === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 16px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: 'none',
                cursor: reportData.totalRequirements === 0 ? 'not-allowed' : 'pointer',
                background: reportData.totalRequirements === 0 ? '#9CA3AF' : '#25D366',
                color: '#ffffff',
                boxShadow: reportData.totalRequirements === 0 ? 'none' : '0 2px 6px rgba(37, 211, 102, 0.3)',
                transition: 'opacity 0.2s',
                opacity: reportData.totalRequirements === 0 ? 0.6 : 1
              }}
              title={reportData.totalRequirements === 0 ? 'No pending requirements to share' : 'Share report on WhatsApp'}
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
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Report Date:</span>
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
              title="Includes overdue requirements up to this date"
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

        {/* Inline Message Preview (collapsible) */}
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
                WhatsApp Output Preview (FR-05)
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
                fontFamily: 'monospace', 
                fontSize: '0.85rem', 
                whiteSpace: 'pre-wrap', 
                background: '#ffffff', 
                padding: '12px', 
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                color: '#111827',
                maxHeight: '260px',
                overflowY: 'auto'
              }}
            >
              {whatsAppText}
            </pre>
          </div>
        )}
      </div>

      {/* 2. Metric Cards (FR-01) */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem' 
        }}
      >
        {/* Pending Requirements */}
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
              Pending Requirements
            </span>
            <div style={{ padding: '6px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: 'var(--primary)' }}>
              <ClipboardList size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {reportData.totalRequirements}
          </div>
          <div className="text-secondary" style={{ fontSize: '0.78rem', marginTop: '4px' }}>
            Active requirement records
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
              Pending Bags
            </span>
            <div style={{ padding: '6px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: 'var(--warning)' }}>
              <Package size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {reportData.totalBags.toLocaleString('en-IN')}
          </div>
          <div className="text-secondary" style={{ fontSize: '0.78rem', marginTop: '4px' }}>
            Total quantity in bags
          </div>
        </div>

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
            <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: 'var(--success)' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {reportData.totalCustomers}
          </div>
          <div className="text-secondary" style={{ fontSize: '0.78rem', marginTop: '4px' }}>
            Unique parties waiting
          </div>
        </div>

        {/* Pending Products */}
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
              Pending Products
            </span>
            <div style={{ padding: '6px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', color: '#8B5CF6' }}>
              <Package size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {reportData.totalProducts}
          </div>
          <div className="text-secondary" style={{ fontSize: '0.78rem', marginTop: '4px' }}>
            Distinct commodities
          </div>
        </div>

        {/* Report Date */}
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
              Report Date
            </span>
            <div style={{ padding: '6px', background: 'rgba(107, 114, 128, 0.1)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {dateMode === 'all' ? 'All Dates' : formatDateForDisplay(selectedDate)}
          </div>
          <div className="text-secondary" style={{ fontSize: '0.78rem', marginTop: '4px' }}>
            {dateMode === 'exact' ? 'Target schedule date' : dateMode === 'up_to' ? 'Up to date' : 'Full pipeline'}
          </div>
        </div>
      </div>

      {/* 3. Empty State (FR-07) */}
      {reportData.totalRequirements === 0 ? (
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
            There are no undispatched orders scheduled for {formatDateForDisplay(selectedDate)}. You can switch to today, include overdue orders, or view all dates.
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
              View All Undispatched Requirements
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 4. Product-wise Summary (FR-03) */}
          <div 
            className="glass-panel" 
            style={{ 
              background: '#ffffff', 
              borderRadius: '12px', 
              border: '1px solid var(--border)', 
              overflow: 'hidden' 
            }}
          >
            <div 
              style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid #E5E7EB', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  Product-wise Summary
                </h3>
                <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                  Grouped by product • Sorted by highest pending quantity (FR-03)
                </span>
              </div>
              <span className="badge badge-neutral">
                {reportData.productSummary.length} Products
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>Product</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>Requirements</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Pending Bags</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, width: '180px' }}>Share of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.productSummary.map((item, idx) => {
                    const pct = reportData.totalBags > 0 ? Math.round((item.pendingBags / reportData.totalBags) * 100) : 0;
                    return (
                      <tr 
                        key={item.productName || idx} 
                        style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.productName}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {item.requirementsCount} order{item.requirementsCount !== 1 ? 's' : ''}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
                          {item.pendingBags.toLocaleString('en-IN')} Bags
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                              <div 
                                style={{ 
                                  width: `${pct}%`, 
                                  height: '100%', 
                                  background: 'var(--primary)', 
                                  borderRadius: '3px' 
                                }} 
                              />
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', minWidth: '32px' }}>
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F9FAFB', fontWeight: 700, borderTop: '2px solid #E5E7EB' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>Total Pending</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {reportData.totalRequirements} orders
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-primary)' }}>
                      {reportData.totalBags.toLocaleString('en-IN')} Bags
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 5. Customer-wise Summary (FR-04) */}
          <div 
            className="glass-panel" 
            style={{ 
              background: '#ffffff', 
              borderRadius: '12px', 
              border: '1px solid var(--border)', 
              overflow: 'hidden' 
            }}
          >
            <div 
              style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid #E5E7EB', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  Customer-wise Summary
                </h3>
                <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                  Undispatched requirements grouped by customer (FR-04)
                </span>
              </div>
              <span className="badge badge-neutral">
                {reportData.customerSummary.length} Customers
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>Customer Name</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>Product Name</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Pending Quantity</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>Requirement Date</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>Assigned Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.customerSummary.map((cust, idx) => {
                    return (
                      <tr 
                        key={cust.customerId || idx} 
                        style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {cust.customerName}
                          </div>
                          {cust.customerCity && (
                            <div className="text-secondary" style={{ fontSize: '0.78rem' }}>
                              {cust.customerCity}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {cust.productName}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
                          <span 
                            style={{ 
                              display: 'inline-block',
                              padding: '2px 8px', 
                              borderRadius: '6px', 
                              background: 'rgba(59, 130, 246, 0.08)',
                              color: 'var(--primary)'
                            }}
                          >
                            {cust.pendingBags.toLocaleString('en-IN')} Bags
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {cust.requirementDate ? formatDateForDisplay(cust.requirementDate) : '-'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          <span 
                            style={{ 
                              display: 'inline-block',
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              background: '#F3F4F6',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                              color: '#374151'
                            }}
                          >
                            {cust.assignedOwner}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
