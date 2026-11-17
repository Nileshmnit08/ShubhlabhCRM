import React from 'react';
import {
  X,
  User,
  Phone,
  Building,
  MapPin,
  Calendar,
  Clock,
  Car,
  UserCheck,
  Smartphone,
  Laptop,
  CheckCircle,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { formatIstDateTime, formatDuration } from '../../lib/visitorRegister';

export default function VisitorDetailModal({ visitor, onClose, onMarkExit, markingExit }) {
  if (!visitor) return null;

  const isInside = visitor.status === 'IN';
  const durationText = formatDuration(visitor.entry_time, visitor.exit_time);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface, #ffffff)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--border, #e2e8f0)',
          width: '100%',
          maxWidth: '650px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border, #e2e8f0)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                }}
              >
                {visitor.pass_number}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  backgroundColor: isInside ? '#dcfce7' : '#f1f5f9',
                  color: isInside ? '#15803d' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: isInside ? '#16a34a' : '#94a3b8',
                  }}
                />
                {isInside ? 'CURRENTLY INSIDE' : 'EXITED'}
              </span>
            </div>
            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: 'var(--text-primary, #0f172a)',
                marginTop: '0.35rem',
              }}
            >
              {visitor.visitor_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.4rem',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted, #64748b)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem' }}>
          {/* Top Section: Photo & Key Summary */}
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '140px',
                height: '140px',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {visitor.photo_url ? (
                <img
                  src={visitor.photo_url}
                  alt={visitor.visitor_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '';
                  }}
                />
              ) : (
                <User size={48} color="#94a3b8" />
              )}
            </div>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <Phone size={15} color="#64748b" />
                  <a
                    href={`tel:${visitor.mobile_number}`}
                    style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}
                  >
                    +91 {visitor.mobile_number}
                  </a>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <Building size={15} color="#64748b" />
                  <span style={{ color: 'var(--text-secondary, #334155)' }}>
                    {visitor.company_name || 'Individual / Not specified'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
                    }}
                  >
                    {visitor.category || 'Other'}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      color: '#475569',
                      backgroundColor: '#f1f5f9',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                    }}
                  >
                    {visitor.registration_source === 'Field Assist' ? (
                      <Smartphone size={12} color="#0284c7" />
                    ) : (
                      <Laptop size={12} color="#15803d" />
                    )}
                    {visitor.registration_source || 'Field Assist'}
                  </span>
                </div>

                {visitor.vehicle_number && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <Car size={15} color="#64748b" />
                    <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#1e293b' }}>
                      {visitor.vehicle_number}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              backgroundColor: '#f8fafc',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--border, #e2e8f0)',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Person to Meet
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                {visitor.person_to_meet || 'General Visit'}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Purpose of Visit
              </span>
              <span style={{ fontSize: '0.9rem', color: '#334155' }}>
                {visitor.purpose_of_visit || 'Not specified'}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Address / Location
              </span>
              <span style={{ fontSize: '0.9rem', color: '#334155' }}>
                {visitor.address || '—'}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Duration on Premises
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: isInside ? '#15803d' : '#475569' }}>
                {durationText} {isInside ? '(Active)' : ''}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Entry Time (IST)
              </span>
              <span style={{ fontSize: '0.85rem', color: '#334155' }}>
                {formatIstDateTime(visitor.entry_time)}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Exit Time (IST)
              </span>
              <span style={{ fontSize: '0.85rem', color: '#334155' }}>
                {visitor.exit_time ? formatIstDateTime(visitor.exit_time) : 'Still Inside Premises'}
              </span>
            </div>
          </div>

          {visitor.notes && (
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Notes / Remarks
              </span>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: '#334155',
                  backgroundColor: '#f1f5f9',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  margin: 0,
                }}
              >
                {visitor.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border, #e2e8f0)',
            backgroundColor: '#fafafa',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid var(--border, #cbd5e1)',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Close
          </button>

          {isInside && (
            <button
              onClick={() => onMarkExit(visitor.id)}
              disabled={markingExit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1.25rem',
                borderRadius: '6px',
                border: 'none',
                background: '#dc2626',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: markingExit ? 'not-allowed' : 'pointer',
                opacity: markingExit ? 0.7 : 1,
              }}
            >
              <LogOut size={16} />
              {markingExit ? 'Recording Exit...' : 'Mark Visitor Exit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
