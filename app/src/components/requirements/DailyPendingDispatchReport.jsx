import React, { useState, useMemo } from 'react';
import { 
  FileText, Calendar, Copy, Check, 
  Package, Users, ClipboardList, 
  MessageCircle, Eye, AlertTriangle, Gift, Scale
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

  // Compute report data (customer-wise orders, weights in MT, gifts)
  const reportData = useMemo(() => {
    return computeDailyPendingReport(pendingFiltered, dateMode === 'all' ? '' : selectedDate);
  }, [pendingFiltered, selectedDate, dateMode]);

  // Generate WhatsApp message string
  const whatsAppText = useMemo(() => {
    return generateWhatsAppReportText(reportData);
  }, [reportData]);

  // Handle Share on WhatsApp
  const handleShareWhatsApp = () => {
    if (reportData.totalCustomers === 0) return;
    const url = `https://wa.me/?text=${encodeURIComponent(whatsAppText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Handle Copy to Clipboard
  const handleCopyReport = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(whatsAppText);
      } else {
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
              Customer-wise Pending Dispatch Report
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
                WhatsApp Output Preview
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
                maxHeight: '320px',
                overflowY: 'auto'
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
            Parties with pending dispatch
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
            {reportData.totalPendingBags.toLocaleString('en-IN')}
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
              Total Pending Weight
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
                <AlertTriangle size={12} /> Some weights unavailable
              </span>
            ) : (
              'Calculated from bag weights'
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
              Pending Gifts
            </span>
            <div style={{ padding: '6px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '8px', color: '#EC4899' }}>
              <Gift size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {reportData.giftsSummary.length}
          </div>
          <div className="text-secondary" style={{ fontSize: '0.78rem', marginTop: '4px' }}>
            Distinct gift commodities
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
          {reportData.customerList.map((customer, idx) => (
            <div 
              key={customer.customerId || idx} 
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #F3F4F6', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{idx + 1}.</span> {customer.customerName}
                  </h3>
                  {customer.customerCity && (
                    <span className="text-secondary" style={{ fontSize: '0.82rem' }}>
                      Location: {customer.customerCity}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span className="badge badge-primary" style={{ fontSize: '0.85rem', padding: '4px 10px' }}>
                    📦 {customer.totalBags.toLocaleString('en-IN')} Bags
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: '0.85rem', padding: '4px 10px' }}>
                    ⚖️ {(customer.totalWeightKg / 1000).toFixed(3)} MT
                  </span>
                </div>
              </div>

              {/* Orders under this customer */}
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
                        📅 Order Date: <strong style={{ color: 'var(--primary)' }}>{order.orderDate}</strong>
                        {order.demandRef && <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>({order.demandRef})</span>}
                      </span>
                      <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                        Owner: {order.assignedOwner}
                      </span>
                    </div>

                    {/* Products list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '8px 0' }}>
                      {order.products.map((p, pIdx) => (
                        <div key={pIdx} style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>•</span>
                          <span style={{ fontWeight: 600 }}>{p.productName}:</span>
                          <span>
                            {p.pendingBags} Bags {p.hasWeight ? `× ${p.bagWeightKg} kg` : <span style={{ color: 'var(--warning)', fontSize: '0.8rem' }}>(Weight Not Available)</span>}
                          </span>
                          {p.hasWeight && (
                            <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                              ({(p.itemWeightKg / 1000).toFixed(3)} MT)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Gifts (if any) */}
                    {order.gifts.length > 0 && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #D1D5DB', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {order.gifts.map((g, gIdx) => (
                          <div key={gIdx} style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🎁 Gift:</span>
                            <strong>{g.giftName}</strong>
                            {g.giftQuantity !== null && <span>× {g.giftQuantity}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Customer Total Line */}
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Customer Total:
                </span>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    📦 {customer.totalBags} Bags
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    ⚖️ {(customer.totalWeightKg / 1000).toFixed(3)} MT
                    {customer.hasMissingWeight && <span style={{ color: 'var(--warning)', fontSize: '0.75rem', marginLeft: '4px' }}>(Incomplete)</span>}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* 5. Overall Gifts Summary Card (if gifts exist) */}
          {reportData.giftsSummary.length > 0 && (
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
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gift size={18} style={{ color: '#EC4899' }} />
                Pending Gifts Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {reportData.giftsSummary.map((g, idx) => (
                  <div 
                    key={idx}
                    style={{
                      background: '#FDF2F8',
                      border: '1px solid #FBCFE8',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#9D174D', fontSize: '0.9rem' }}>{g.giftName}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#BE185D' }}>{g.displayQty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
