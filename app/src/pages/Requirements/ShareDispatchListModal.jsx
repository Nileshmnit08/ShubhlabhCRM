import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Truck, X, Users, FileText, Package, Copy, Check, MessageCircle } from 'lucide-react';
import {
  formatDispatchDate,
  buildConsolidatedDispatchData,
  generateDispatchListPlainText,
  generateWhatsAppShareUrl
} from '../../lib/dispatchListGenerator';

export default function ShareDispatchListModal({
  isOpen,
  onClose,
  requirements = [],
  statusFilter = 'All Open',
  includeCompleted = false
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dateStr = formatDispatchDate(new Date());
  const dispatchData = buildConsolidatedDispatchData(requirements, {
    statusFilter,
    includeCompleted
  });

  const plainText = generateDispatchListPlainText(dispatchData, dateStr);
  const whatsAppUrl = generateWhatsAppShareUrl(plainText);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(plainText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = plainText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy dispatch list:', err);
    }
  };

  const handleWhatsApp = () => {
    if (whatsAppUrl) {
      window.open(whatsAppUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispatch-list-modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(2px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E5E7EB',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'fade-in 0.15s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#ECFDF5',
                border: '1px solid #D1FAE5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Truck size={20} style={{ color: '#059669' }} />
            </div>
            <div>
              <h3
                id="dispatch-list-modal-title"
                style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#111827', lineHeight: 1.25 }}
              >
                Dispatch List Preview
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#6B7280' }}>
                Consolidated dispatch details from current requirements.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'color 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#374151')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Compact Summary Box */}
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #DCFCE7',
            borderRadius: '8px',
            padding: '10px 14px',
            marginTop: '1rem',
            marginBottom: '1rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px'
          }}
        >
          {/* Customers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Users size={16} style={{ color: '#16A34A' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#4B5563', fontWeight: 500, lineHeight: 1.1 }}>Customers</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                {dispatchData.summary.totalCustomers}
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid #DCFCE7', paddingLeft: '8px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <FileText size={16} style={{ color: '#16A34A' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#4B5563', fontWeight: 500, lineHeight: 1.1 }}>Requirements</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                {dispatchData.summary.totalRequirements}
              </div>
            </div>
          </div>

          {/* Total Qty */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid #DCFCE7', paddingLeft: '8px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Package size={16} style={{ color: '#16A34A' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: '#4B5563', fontWeight: 500, lineHeight: 1.1 }}>Total Qty</div>
              <div
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: '#111827',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={dispatchData.summary.totalQtyDisplay}
              >
                {dispatchData.summary.totalQtyDisplay}
              </div>
            </div>
          </div>
        </div>

        {/* Date Title */}
        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111827', marginBottom: '0.65rem' }}>
          Dispatch List – {dateStr}
        </div>

        {/* Raw-Text Scrollable List */}
        <div
          className="dispatch-list-scrollable"
          style={{
            overflowY: 'auto',
            maxHeight: '44vh',
            paddingRight: '6px',
            fontFamily: 'inherit'
          }}
        >
          {dispatchData.entries.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#6B7280', fontSize: '0.88rem' }}>
              No eligible dispatch requirements match the current filters.
            </div>
          ) : (
            dispatchData.entries.map((entry, idx) => (
              <div key={entry.partyId + idx} style={{ marginBottom: idx === dispatchData.entries.length - 1 ? 0 : '10px' }}>
                {/* 1. Customer Name – Location */}
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', marginBottom: '2px' }}>
                  {idx + 1}. {entry.customerTitle}
                </div>
                {/* Product – Quantity */}
                <div style={{ fontSize: '0.86rem', color: '#374151', paddingLeft: '1rem', lineHeight: 1.4 }}>
                  {entry.productsLine}
                </div>
                {/* Transporter: Name */}
                <div style={{ fontSize: '0.84rem', color: '#4B5563', paddingLeft: '1rem', lineHeight: 1.4 }}>
                  Transporter: {entry.transporterName}
                </div>
                {/* Mobile: Number */}
                <div style={{ fontSize: '0.84rem', color: '#4B5563', paddingLeft: '1rem', lineHeight: 1.4 }}>
                  Mobile: {entry.mobile}
                </div>

                {/* Subtle Divider */}
                {idx < dispatchData.entries.length - 1 && (
                  <div style={{ borderBottom: '1px solid #F1F5F9', marginTop: '10px' }} />
                )}
              </div>
            ))
          )}
        </div>

        {/* Fixed Footer Action Buttons */}
        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center'
          }}
        >
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={dispatchData.entries.length === 0}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              background: '#ffffff',
              color: '#374151',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: dispatchData.entries.length === 0 ? 'not-allowed' : 'pointer',
              opacity: dispatchData.entries.length === 0 ? 0.6 : 1,
              transition: 'background 0.15s, border-color 0.15s'
            }}
            onMouseEnter={(e) => {
              if (dispatchData.entries.length > 0) e.currentTarget.style.background = '#F9FAFB';
            }}
            onMouseLeave={(e) => {
              if (dispatchData.entries.length > 0) e.currentTarget.style.background = '#ffffff';
            }}
          >
            {copied ? (
              <>
                <Check size={16} style={{ color: '#16A34A' }} />
                <span style={{ color: '#16A34A' }}>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* WhatsApp Button */}
          <button
            type="button"
            onClick={handleWhatsApp}
            disabled={dispatchData.entries.length === 0}
            style={{
              flex: 1.4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#16A34A',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: dispatchData.entries.length === 0 ? 'not-allowed' : 'pointer',
              opacity: dispatchData.entries.length === 0 ? 0.6 : 1,
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => {
              if (dispatchData.entries.length > 0) e.currentTarget.style.background = '#15803D';
            }}
            onMouseLeave={(e) => {
              if (dispatchData.entries.length > 0) e.currentTarget.style.background = '#16A34A';
            }}
          >
            <MessageCircle size={17} />
            <span>WhatsApp</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              background: '#ffffff',
              color: '#374151',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
