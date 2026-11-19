import React, { useState, useEffect } from 'react';
import { X, Send, Copy, Check, MessageSquare, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { buildHindiInviteMessage, buildWhatsAppLink, normalizeIndianPhone } from '../utils/whatsappTemplate';
import { logActivity } from '../../../lib/activityLogger';

export default function WhatsAppInviteModal({
  isOpen,
  onClose,
  customer,
  account,
  temporaryPassword,
  releaseConfig,
}) {
  const [copied, setCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [sendNotice, setSendNotice] = useState('');

  useEffect(() => {
    if (customer && isOpen) {
      const loginId = account?.email || (customer.mobile ? `${normalizeIndianPhone(customer.mobile)}@shubhlabh.app` : '');
      const initialMsg = buildHindiInviteMessage({
        customerName: customer.display_name,
        loginId,
        temporaryPassword: temporaryPassword || '',
        downloadUrl: releaseConfig?.downloadUrl || 'https://shubhlabh.in/download',
        appVersion: releaseConfig?.appVersion || 'v1.2.0',
        isPasswordReset: Boolean(account && temporaryPassword),
      });
      setCustomMessage(initialMsg);
      setSendNotice('');
    }
  }, [customer, account, temporaryPassword, releaseConfig, isOpen]);

  if (!isOpen || !customer) return null;

  const rawPhone = customer.whatsapp || customer.mobile || '';
  const cleanPhone = normalizeIndianPhone(rawPhone);
  const isValidPhone = cleanPhone && cleanPhone.length === 10;

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = async () => {
    if (!isValidPhone) {
      alert('ग्राहक का मान्य 10-अंकों का मोबाइल नंबर उपलब्ध नहीं है।');
      return;
    }

    const { url, fallbackUrl } = buildWhatsAppLink(cleanPhone, customMessage);
    
    // Log intent to activity logs
    await logActivity({
      module: 'CustomerAccess',
      actionType: 'WHATSAPP_INVITE_INITIATED',
      entityType: 'crm_parties',
      entityId: customer.id,
      summary: `WhatsApp invitation initiated for ${customer.display_name} (${cleanPhone})`,
      metadata: {
        loginId: account?.email,
        phone: cleanPhone,
        hasTempPassword: Boolean(temporaryPassword),
      },
    });

    // Open WhatsApp
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    }

    setSendNotice('WhatsApp विंडो खोली गई है। कृपया WhatsApp में मैसेज की समीक्षा कर "Send" बटन दबाएं। (WhatsApp window opened. Please click Send in WhatsApp).');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface, #ffffff)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--border, #e2e8f0)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(37, 211, 102, 0.15)',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                WhatsApp Invitation (हिंदी संदेश)
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                {customer.display_name} • {cleanPhone ? `+91 ${cleanPhone}` : 'No valid mobile'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary, #64748b)',
              padding: '0.25rem',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {!isValidPhone && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <AlertCircle size={18} />
              <span>ग्राहक के पास वैध 10-अंकों का मोबाइल नंबर नहीं है। कृपया पहले ग्राहक मास्टर में सही नंबर दर्ज करें।</span>
            </div>
          )}

          {temporaryPassword && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase', display: 'block' }}>
                  Temporary Session Password
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace', color: '#14532d' }}>
                  {temporaryPassword}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#15803d' }}>
                (Included in invite)
              </span>
            </div>
          )}

          <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
              संदेश पूर्वावलोकन (Editable Message Preview):
            </label>
            <button
              onClick={handleCopy}
              style={{
                background: 'none',
                border: '1px solid var(--border, #cbd5e1)',
                borderRadius: '6px',
                padding: '0.25rem 0.6rem',
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
                color: 'var(--text-secondary, #475569)',
              }}
            >
              {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
          </div>

          <textarea
            className="input"
            rows={11}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            style={{
              width: '100%',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              padding: '0.75rem',
              fontFamily: 'inherit',
              borderRadius: '8px',
              resize: 'vertical',
            }}
          />

          <div style={{
            marginTop: '0.75rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            color: '#1e40af',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.45rem',
          }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>महत्वपूर्ण:</strong> "Send via WhatsApp" पर क्लिक करने पर WhatsApp खुलेगा। एडमिन को संदेश की जांच करके स्वयं WhatsApp में 'Send' बटन दबाना होगा। केवल विंडो खुलने से मैसेज डिलीवरी का दावा नहीं होता।
            </span>
          </div>

          {sendNotice && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              fontSize: '0.82rem',
              fontWeight: 500,
            }}>
              {sendNotice}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border, #e2e8f0)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          backgroundColor: '#f8fafc',
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!isValidPhone}
            onClick={handleOpenWhatsApp}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: '#25D366',
              borderColor: '#25D366',
              color: '#ffffff',
            }}
          >
            <Send size={16} /> WhatsApp पर भेजें
          </button>
        </div>
      </div>
    </div>
  );
}
