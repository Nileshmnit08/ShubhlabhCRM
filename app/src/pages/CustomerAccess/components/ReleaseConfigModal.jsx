import React, { useState } from 'react';
import { X, Save, Smartphone, CheckCircle, AlertCircle, Link, Calendar, Tag } from 'lucide-react';
import { saveStoredReleaseConfig } from '../utils/whatsappTemplate';

export default function ReleaseConfigModal({ isOpen, onClose, releaseConfig, onSaveConfig }) {
  const [downloadUrl, setDownloadUrl] = useState(releaseConfig.downloadUrl || '');
  const [appVersion, setAppVersion] = useState(releaseConfig.appVersion || '');
  const [releaseDate, setReleaseDate] = useState(releaseConfig.releaseDate || '');
  const [isActive, setIsActive] = useState(releaseConfig.isActive ?? true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    setError('');

    if (!downloadUrl.trim()) {
      setError('Download URL cannot be empty.');
      return;
    }

    try {
      new URL(downloadUrl);
    } catch {
      setError('Please provide a valid URL format (e.g. https://shubhlabh.in/download).');
      return;
    }

    const updated = {
      downloadUrl: downloadUrl.trim(),
      appVersion: appVersion.trim() || 'v1.0.0',
      releaseDate: releaseDate || new Date().toISOString().split('T')[0],
      isActive,
    };

    saveStoredReleaseConfig(updated);
    onSaveConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
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
        maxWidth: '520px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Smartphone size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                Order App Release Config
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                Configure APK download URL & version shown in invitations
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

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ padding: '1.5rem' }}>
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
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {savedSuccess && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <CheckCircle size={16} />
              <span>Configuration saved successfully!</span>
            </div>
          )}

          <div style={{ marginBottom: '1.15rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary, #1e293b)' }}>
              <Link size={15} /> Permanent Download URL *
            </label>
            <input
              type="text"
              className="input"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              placeholder="https://shubhlabh.in/download"
              required
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '0.25rem', display: 'block' }}>
              Used in WhatsApp invites. Do not hardcode internal or broken URLs.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.15rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary, #1e293b)' }}>
                <Tag size={15} /> Approved Version
              </label>
              <input
                type="text"
                className="input"
                value={appVersion}
                onChange={(e) => setAppVersion(e.target.value)}
                placeholder="v1.2.0"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary, #1e293b)' }}>
                <Calendar size={15} /> Release Date
              </label>
              <input
                type="date"
                className="input"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-base, #f8fafc)',
            border: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
          }}>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)', display: 'block' }}>
                Release Status
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                {isActive ? 'Active and open for buyer onboarding' : 'Paused / Maintenance mode'}
              </span>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#123d26' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={savedSuccess}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savedSuccess}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Save size={16} /> Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
