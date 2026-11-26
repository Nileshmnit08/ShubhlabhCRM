import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Truck, Check, AlertCircle, Info } from 'lucide-react';
import { findTransporterByMobile, validateTransportDetails } from '../../lib/transporterDispatch';
import { getCanonicalRequirementItems, formatItemQtyAndWeight } from '../../lib/canonicalRequirements';

/**
 * MarkDispatchedModal
 * SL-MARK-DISPATCHED-INPUT-FOCUS-FIX-01
 *
 * Dedicated modal component for confirming dispatch with transporter details.
 * Prevents input focus loss by:
 * 1. Maintaining local modal form state (does not trigger full Requirements table re-renders on every keystroke).
 * 2. Eliminating inline ref callbacks on container elements that steal active DOM focus.
 * 3. Focusing the primary input once on initial mount via useEffect with empty dependency array.
 * 4. Handling Escape key cleanly via window listener without container div ref autofocus.
 */
export default function MarkDispatchedModal({
  isOpen,
  req,
  onClose,
  onConfirm,
  isDispatching = false,
  transporterOptions = [],
  productName = '',
  quantity = '',
  unit = ''
}) {
  const [transporterName, setTransporterName] = useState(() => {
    return req?.transporter_info?.transporterName || '';
  });
  const [transporterMobile, setTransporterMobile] = useState(() => {
    return req?.transporter_info?.mobileNumber || '';
  });
  const [transporterError, setTransporterError] = useState('');
  const [detectedTransporter, setDetectedTransporter] = useState(() => {
    const initMob = req?.transporter_info?.mobileNumber;
    const initName = req?.transporter_info?.transporterName;
    if (initMob) {
      return findTransporterByMobile(transporterOptions, initMob);
    }
    if (initName) {
      return transporterOptions.find(
        t => (t.transporter_name || '').toLowerCase() === initName.trim().toLowerCase()
      ) || null;
    }
    return null;
  });

  const nameInputRef = useRef(null);

  // Focus primary input once on modal mount without interfering with subsequent typing
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard accessibility: Escape to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !req) return null;

  const handleTransporterNameChange = (val) => {
    setTransporterName(val);
    setTransporterError('');
    const matched = transporterOptions.find(
      t => (t.transporter_name || '').toLowerCase() === val.trim().toLowerCase()
    );
    if (matched) {
      setDetectedTransporter(matched);
      if (matched.contact_number && !transporterMobile) {
        setTransporterMobile(matched.contact_number);
      }
    } else {
      const mobileMatched = transporterMobile
        ? findTransporterByMobile(transporterOptions, transporterMobile)
        : null;
      setDetectedTransporter(mobileMatched || null);
    }
  };

  const handleTransporterMobileChange = (val) => {
    const cleanDigits = val.replace(/[^\d+]/g, '').slice(0, 10);
    setTransporterMobile(cleanDigits);
    setTransporterError('');
    const matched = findTransporterByMobile(transporterOptions, cleanDigits);
    if (matched) {
      setDetectedTransporter(matched);
      if (!transporterName) {
        setTransporterName(matched.transporter_name);
      }
    } else {
      const nameMatched = transporterName
        ? transporterOptions.find(
            t => (t.transporter_name || '').toLowerCase() === transporterName.trim().toLowerCase()
          )
        : null;
      setDetectedTransporter(nameMatched || null);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const validation = validateTransportDetails({
      transporterName,
      mobileNumber: transporterMobile
    });

    if (!validation.isValid) {
      setTransporterError(validation.error);
      return;
    }

    setTransporterError('');
    onConfirm(validation.sanitized, setTransporterError);
  };

  const isSuggested =
    req?.transporter_info?.isSuggested &&
    req?.transporter_info?.hasDetails &&
    transporterName === req?.transporter_info?.transporterName;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mark-dispatched-modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          padding: '1.75rem',
          borderRadius: '8px',
          maxWidth: '440px',
          width: '92%',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="mark-dispatched-modal-title"
          style={{
            margin: '0 0 1rem 0',
            color: 'var(--success)',
            fontSize: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Truck size={22} /> Mark this order as dispatched?
        </h3>

        {/* Order Summary */}
        <div
          style={{
            background: 'var(--bg-base)',
            padding: '0.85rem 1rem',
            borderRadius: '6px',
            marginBottom: '1.25rem',
            fontSize: '0.88rem',
            border: '1px solid var(--border)'
          }}
        >
          <div style={{ marginBottom: '4px' }}>
            <strong>Customer:</strong> {req.customer_name}
          </div>
          {(() => {
            const items = getCanonicalRequirementItems(req);
            if (items.length > 1) {
              return (
                <div style={{ marginTop: '6px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                  <strong>Ordered Products ({items.length}):</strong>
                  {items.map((it, idx) => (
                    <div key={idx} style={{ paddingLeft: '8px', color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '2px' }}>
                      • {it.product_name} – {formatItemQtyAndWeight(it).fullLabel}
                    </div>
                  ))}
                </div>
              );
            }
            const single = items[0];
            return (
              <>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Product:</strong> {single?.product_name || productName || '-'}
                </div>
                <div>
                  <strong>Quantity:</strong> {single ? formatItemQtyAndWeight(single).fullLabel : `${quantity} ${unit}`}
                </div>
              </>
            );
          })()}
        </div>

        {/* Transport Details Section */}
        <form onSubmit={handleSubmit}>
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '1rem',
              marginBottom: '1.25rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem'
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Transport Details
              </h4>
              {detectedTransporter ? (
                <span
                  style={{
                    fontSize: '0.72rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#059669',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <Check size={12} /> Existing Transporter
                </span>
              ) : isSuggested ? (
                <span
                  style={{
                    fontSize: '0.72rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: '#1D4ED8',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <Info size={12} /> Suggested from Last Dispatch
                </span>
              ) : null}
            </div>

            {/* Field 1: Transporter Name */}
            <div style={{ marginBottom: '0.85rem' }}>
              <label
                htmlFor="dispatch-transporter-name-input"
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  marginBottom: '4px',
                  color: 'var(--text-primary)'
                }}
              >
                Transporter Name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                ref={nameInputRef}
                id="dispatch-transporter-name-input"
                type="text"
                list="transporter-list-options-modal"
                placeholder="Enter transporter name"
                value={transporterName}
                onChange={(e) => handleTransporterNameChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
              <datalist id="transporter-list-options-modal">
                {transporterOptions.map((t) => (
                  <option key={t.transporter_name} value={t.transporter_name}>
                    {t.contact_number
                      ? `${t.transporter_name} (${t.contact_number})`
                      : t.transporter_name}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Field 2: Mobile Number */}
            <div>
              <label
                htmlFor="dispatch-transporter-mobile-input"
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  marginBottom: '4px',
                  color: 'var(--text-primary)'
                }}
              >
                Mobile Number <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="dispatch-transporter-mobile-input"
                type="tel"
                inputMode="numeric"
                placeholder="Enter 10-digit mobile number"
                value={transporterMobile}
                onChange={(e) => handleTransporterMobileChange(e.target.value)}
                maxLength={10}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginTop: '4px'
                }}
              >
                {detectedTransporter
                  ? `Matching record for "${detectedTransporter.transporter_name}" will be reused.`
                  : 'New transporter will be automatically saved to Transporter List.'}
              </div>
            </div>

            {/* Error Message */}
            {transporterError && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '4px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--danger)',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{transporterError}</span>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isDispatching}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                background: 'var(--success)',
                borderColor: 'var(--success)',
                color: '#fff'
              }}
              disabled={isDispatching}
            >
              {isDispatching ? 'Marking...' : 'Mark as Dispatched'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
