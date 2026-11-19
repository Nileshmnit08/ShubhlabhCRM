import React, { useState } from 'react';
import { X, Key, ShieldCheck, ShieldAlert, MessageSquare, RefreshCw, AlertTriangle, CheckCircle2, Copy, Check } from 'lucide-react';
import { generateSecureTemporaryPassword } from '../utils/passwordGenerator';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/activityLogger';

export default function ManageAccountModal({
  isOpen,
  onClose,
  customer,
  account,
  onAccountUpdated,
  onOpenWhatsAppInvite,
}) {
  const [resettingPassword, setResettingPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !customer || !account) return null;

  const handleGeneratePassword = () => {
    setTempPassword(generateSecureTemporaryPassword());
    setCopied(false);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecutePasswordReset = async () => {
    if (!tempPassword) {
      handleGeneratePassword();
      return;
    }

    setResettingPassword(true);
    setError('');
    try {
      const { error: rpcErr } = await supabase.rpc('admin_change_user_password', {
        target_user_id: account.id,
        new_password: tempPassword,
      });

      if (rpcErr) throw rpcErr;

      await logActivity({
        module: 'CustomerAccess',
        actionType: 'PASSWORD_RESET',
        entityType: 'app_users',
        entityId: account.id,
        summary: `Admin reset password for buyer: ${customer.display_name} (${account.email})`,
        metadata: {
          crm_party_id: customer.id,
          login_id: account.email,
        },
      });

      setResetSuccess(true);
    } catch (err) {
      console.error('Password reset failed:', err);
      setError(err.message || 'Failed to reset password.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleToggleActiveStatus = async () => {
    setTogglingStatus(true);
    setError('');
    const newStatus = !account.is_active;

    try {
      const { error: updateErr } = await supabase
        .from('app_users')
        .update({ is_active: newStatus })
        .eq('id', account.id);

      if (updateErr) throw updateErr;

      await logActivity({
        module: 'CustomerAccess',
        actionType: newStatus ? 'ACTIVATED' : 'DEACTIVATED',
        entityType: 'app_users',
        entityId: account.id,
        summary: `Admin ${newStatus ? 'activated' : 'deactivated'} buyer account for ${customer.display_name}`,
        metadata: {
          crm_party_id: customer.id,
          new_status: newStatus,
        },
      });

      setShowStatusConfirm(false);
      onAccountUpdated();
    } catch (err) {
      console.error('Toggle status failed:', err);
      setError(err.message || 'Failed to update account status.');
    } finally {
      setTogglingStatus(false);
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
        maxWidth: '560px',
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
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
              Manage Buyer Account
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              {customer.display_name} • {account.email}
            </p>
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
        <div style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
          {error && (
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
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Account Info Card */}
          <div style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: '#f8fafc',
            border: '1px solid var(--border, #e2e8f0)',
            marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Account Overview
              </span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                backgroundColor: account.is_active ? 'rgba(22, 163, 74, 0.12)' : 'rgba(225, 29, 72, 0.12)',
                color: account.is_active ? '#16a34a' : '#e11d48',
              }}>
                {account.is_active ? '● Active' : '● Disabled'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Login ID:</span>
                <strong style={{ color: '#0f172a' }}>{account.email}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Role:</span>
                <span style={{ color: '#0f172a' }}>{account.role || 'Buyer'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Registered Mobile:</span>
                <span style={{ color: '#0f172a' }}>{customer.mobile || 'None'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>CRM Mapping:</span>
                <span style={{ color: '#16a34a', fontWeight: 500 }}>✓ Linked to Party ID</span>
              </div>
            </div>
          </div>

          {/* Action 1: Reset Password */}
          <div style={{
            padding: '1.15rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border, #e2e8f0)',
            marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Key size={18} color="#2563eb" />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                Reset Password (पासवर्ड रीसेट करें)
              </h4>
            </div>
            <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              Generates a new secure temporary password for the customer and updates Supabase auth with bcrypt hash.
            </p>

            {resetSuccess ? (
              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                marginBottom: '0.75rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <CheckCircle2 size={16} /> Password Reset Successfully!
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: '#065f46' }}>
                    {tempPassword}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="btn btn-secondary"
                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenWhatsAppInvite({ customer, account, temporaryPassword: tempPassword })}
                      className="btn btn-primary"
                      style={{ padding: '0.2rem 0.75rem', fontSize: '0.75rem', backgroundColor: '#25D366', borderColor: '#25D366' }}
                    >
                      <MessageSquare size={13} style={{ marginRight: '4px' }} /> Send on WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {!tempPassword ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleGeneratePassword}
                    style={{ fontSize: '0.85rem' }}
                  >
                    Generate Temporary Password
                  </button>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <input
                        type="text"
                        className="input"
                        readOnly
                        value={tempPassword}
                        style={{ fontFamily: 'monospace', fontWeight: 600, flex: 1, backgroundColor: '#f8fafc' }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleGeneratePassword}
                        title="Generate another"
                      >
                        <RefreshCw size={15} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={resettingPassword}
                        onClick={handleExecutePasswordReset}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                      >
                        {resettingPassword ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> Updating...
                          </>
                        ) : (
                          'Confirm & Apply Reset'
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setTempPassword('')}
                        disabled={resettingPassword}
                        style={{ fontSize: '0.85rem' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action 2: Activate / Deactivate Account */}
          <div style={{
            padding: '1.15rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border, #e2e8f0)',
            marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {account.is_active ? <ShieldAlert size={18} color="#e11d48" /> : <ShieldCheck size={18} color="#16a34a" />}
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                  {account.is_active ? 'Deactivate Account' : 'Activate Account'}
                </h4>
              </div>
            </div>
            <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              {account.is_active
                ? 'Deactivating immediately blocks this customer from logging in or placing orders through Shubh Labh Order.'
                : 'Activating restores order placement and mobile app access for this customer.'}
            </p>

            {showStatusConfirm ? (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                backgroundColor: account.is_active ? '#fff1f2' : '#f0fdf4',
                border: `1px solid ${account.is_active ? '#fecdd3' : '#bbf7d0'}`,
              }}>
                <p style={{ margin: '0 0 0.65rem 0', fontSize: '0.85rem', fontWeight: 600, color: account.is_active ? '#9f1239' : '#166534' }}>
                  Are you sure you want to {account.is_active ? 'deactivate' : 'activate'} {customer.display_name}?
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn"
                    disabled={togglingStatus}
                    onClick={handleToggleActiveStatus}
                    style={{
                      backgroundColor: account.is_active ? '#e11d48' : '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.82rem',
                      padding: '0.35rem 0.85rem',
                    }}
                  >
                    {togglingStatus ? 'Updating...' : `Yes, ${account.is_active ? 'Deactivate' : 'Activate'}`}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={togglingStatus}
                    onClick={() => setShowStatusConfirm(false)}
                    style={{ fontSize: '0.82rem', padding: '0.35rem 0.85rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowStatusConfirm(true)}
                style={{
                  fontSize: '0.82rem',
                  color: account.is_active ? '#e11d48' : '#16a34a',
                  borderColor: account.is_active ? '#fca5a5' : '#86efac',
                }}
              >
                {account.is_active ? 'Deactivate Access' : 'Activate Access'}
              </button>
            )}
          </div>

          {/* Action 3: Prepare WhatsApp Invite */}
          <div style={{
            padding: '1.15rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border, #e2e8f0)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <MessageSquare size={18} color="#16a34a" />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                WhatsApp Invitation (हिंदी निमंत्रण)
              </h4>
            </div>
            <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              Open WhatsApp with pre-filled Hindi instructions, login ID, and APK download link.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onOpenWhatsAppInvite({ customer, account, temporaryPassword: resetSuccess ? tempPassword : '' })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <MessageSquare size={15} color="#16a34a" /> Open WhatsApp Invite Dialog
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border, #e2e8f0)',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: '#f8fafc',
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
