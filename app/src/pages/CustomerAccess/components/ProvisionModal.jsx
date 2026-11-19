import React, { useState, useEffect } from 'react';
import { X, UserPlus, RefreshCw, Copy, Check, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { generateSecureTemporaryPassword } from '../utils/passwordGenerator';
import { normalizeIndianPhone } from '../utils/whatsappTemplate';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/activityLogger';

export default function ProvisionModal({
  isOpen,
  onClose,
  customer,
  existingAccount,
  onProvisionSuccess,
}) {
  const [loginId, setLoginId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer && isOpen) {
      const cleanPhone = normalizeIndianPhone(customer.mobile || customer.whatsapp || '');
      const defaultLogin = cleanPhone ? `${cleanPhone}@shubhlabh.app` : '';
      setLoginId(defaultLogin);
      setDisplayName(customer.display_name || '');
      setTempPassword(generateSecureTemporaryPassword());
      setError('');
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const handleRegeneratePassword = () => {
    setTempPassword(generateSecureTemporaryPassword());
    setCopied(false);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (existingAccount) {
      setError('इस ग्राहक के पास पहले से एक सक्रिय/पंजीकृत खाता मौजूद है। (Account already exists for this customer).');
      return;
    }

    const cleanEmail = loginId.trim();
    if (!cleanEmail) {
      setError('Login ID cannot be empty.');
      return;
    }

    if (!tempPassword.trim()) {
      setError('Temporary password cannot be empty.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Verify on server if an account already exists for this party
      const { data: checkExisting, error: checkErr } = await supabase
        .from('app_users')
        .select('id, email')
        .eq('crm_party_id', customer.id)
        .eq('role', 'Buyer');

      if (!checkErr && checkExisting && checkExisting.length > 0) {
        throw new Error(`Customer already has a Buyer account registered with Login ID: ${checkExisting[0].email}`);
      }

      // 2. Call admin_create_buyer RPC
      const { data: newUserId, error: rpcErr } = await supabase.rpc('admin_create_buyer', {
        new_email: cleanEmail,
        new_password: tempPassword,
        new_display_name: displayName.trim() || customer.display_name,
        new_crm_party_id: customer.id,
        new_is_active: true,
      });

      if (rpcErr) {
        throw rpcErr;
      }

      // 3. Log security event
      await logActivity({
        module: 'CustomerAccess',
        actionType: 'CREATED',
        entityType: 'app_users',
        entityId: newUserId,
        summary: `Created Buyer account for customer: ${customer.display_name} (Login: ${cleanEmail})`,
        metadata: {
          crm_party_id: customer.id,
          login_id: cleanEmail,
          created_by_admin: true,
        },
      });

      // 4. Return to parent and transition to WhatsApp invitation
      onProvisionSuccess({
        newUserId,
        loginId: cleanEmail,
        temporaryPassword: tempPassword,
        customer,
      });
    } catch (err) {
      console.error('Provisioning failed:', err);
      setError(err.message || 'Account creation failed. Please check credentials and try again.');
    } finally {
      setSubmitting(false);
    }
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
        maxWidth: '540px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid var(--border, #e2e8f0)',
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
              backgroundColor: 'rgba(18, 61, 38, 0.12)',
              color: '#123d26',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <UserPlus size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                Create Customer App Account
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                Provision Shubh Labh Order credentials for this customer
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

        {/* Customer Details Ribbon */}
        <div style={{
          padding: '0.85rem 1.5rem',
          backgroundColor: '#f1f5f9',
          borderBottom: '1px solid var(--border, #e2e8f0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
        }}>
          <div>
            <strong style={{ color: '#0f172a' }}>{customer.display_name}</strong>
            {customer.customer_code && (
              <span style={{ marginLeft: '0.5rem', color: '#64748b' }}>({customer.customer_code})</span>
            )}
          </div>
          <div style={{ color: '#475569' }}>
            {customer.mobile ? `📱 ${customer.mobile}` : 'No Mobile'} {customer.city ? `• ${customer.city}` : ''}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: '1.15rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary, #1e293b)' }}>
              Login ID (Email Format) *
            </label>
            <input
              type="text"
              className="input"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="e.g. 9826012345@shubhlabh.app"
              required
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '0.25rem', display: 'block' }}>
              Used by customer to login to Shubh Labh Order mobile app.
            </span>
          </div>

          <div style={{ marginBottom: '1.15rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary, #1e293b)' }}>
              Display Name in Mobile App
            </label>
            <input
              type="text"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
                Temporary Password (अस्थायी पासवर्ड) *
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleRegeneratePassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.75rem',
                    color: '#2563eb',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <RefreshCw size={13} /> Generate New
                </button>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.75rem',
                    color: '#16a34a',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}>
              <input
                type="text"
                className="input"
                readOnly
                value={tempPassword}
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  backgroundColor: '#f8fafc',
                  letterSpacing: '0.5px',
                }}
              />
            </div>
          </div>

          <div style={{
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.65rem',
          }}>
            <ShieldCheck size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.78rem', color: '#166534', lineHeight: 1.45 }}>
              <strong>सुरक्षा गारंटी:</strong> पासवर्ड PostgreSQL सर्वर पर pgcrypto (bcrypt) द्वारा सुरक्षित रूप से एन्क्रिप्ट होता है। यह पासवर्ड किसी भी डेटाबेस टेबल में सादे टेक्स्ट में नहीं रखा जाता है। यह क्रेडेंशियल केवल मोबाइल ऐप में कार्य करेगा।
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              {submitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Provisioning...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Create & Prepare WhatsApp Invite
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
