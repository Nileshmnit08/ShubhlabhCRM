import React, { useEffect, useMemo, useState } from 'react';
import { X, Check, AlertTriangle, Users, Calendar, AlertCircle } from 'lucide-react';
import { formatInr, round2 } from '../lib/labourHisaabData';
import { supabase } from '../lib/supabase';

/**
 * MICRO-SPRINT: LH-DAILY-LABOUR-ACTIVE-INACTIVE-01
 * Modal for editing day-wise Active / Inactive status of a labourer.
 *
 * Implements:
 * - Labourer Name, Current Amount, Selected Working Date
 * - Active / Inactive selection
 * - Clear status indicators: 🟢 Active / 🔴 Inactive
 * - Confirmation messages and live redistribution preview
 * - Validation: At least one active labourer must remain
 * - Save and Cancel buttons
 */
export default function LabourDailyStatusModal({
  isOpen,
  labourer,
  dayLabourers = [],
  totalDayAmount = 0,
  onClose,
  onSave,
}) {
  const [selectedStatus, setSelectedStatus] = useState(labourer?.isActive !== false ? 'Active' : 'Inactive');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (labourer) {
      setSelectedStatus(labourer.isActive !== false ? 'Active' : 'Inactive');
      setReason('');
      setError('');
    }
  }, [labourer]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !busy) {
        onClose?.();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, busy, onClose]);

  const activeLabourers = useMemo(() => {
    return dayLabourers.filter(l => l.isActive !== false);
  }, [dayLabourers]);

  const isCurrentlyActive = labourer?.isActive !== false;
  const isChangingToInactive = isCurrentlyActive && selectedStatus === 'Inactive';
  const isChangingToActive = !isCurrentlyActive && selectedStatus === 'Active';
  const isStatusChanged = (isCurrentlyActive && selectedStatus === 'Inactive') || (!isCurrentlyActive && selectedStatus === 'Active');

  // Guard check: cannot deactivate the last active labourer
  const isLastActive = isCurrentlyActive && activeLabourers.length <= 1;
  const isBlocked = isChangingToInactive && isLastActive;

  // Compute live projected amounts
  const projectedCalculation = useMemo(() => {
    if (!labourer || dayLabourers.length === 0) return null;

    let projectedActiveCount = activeLabourers.length;
    if (isChangingToInactive) projectedActiveCount = Math.max(0, activeLabourers.length - 1);
    else if (isChangingToActive) projectedActiveCount = activeLabourers.length + 1;

    if (projectedActiveCount === 0) {
      return {
        labourerShare: 0,
        otherShare: 0,
        activeCount: 0,
      };
    }

    const share = round2(totalDayAmount / projectedActiveCount);
    return {
      labourerShare: selectedStatus === 'Active' ? share : 0,
      otherShare: share,
      activeCount: projectedActiveCount,
    };
  }, [labourer, dayLabourers, activeLabourers, isChangingToInactive, isChangingToActive, selectedStatus, totalDayAmount]);

  if (!isOpen || !labourer) return null;

  const handleSave = async () => {
    if (isBlocked) {
      setError('At least one labourer must remain active for this day.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const nextIsActive = selectedStatus === 'Active';
      if (labourer?.contractorId && labourer?.workDate) {
        try {
          const { error: rpcErr } = await supabase.rpc('lh_set_labourer_day_status', {
            p_contractor: labourer.contractorId,
            p_work_date: labourer.workDate,
            p_labourer_id: labourer.id,
            p_is_active: nextIsActive,
            p_reason: reason || null,
          });

          if (rpcErr) {
            await supabase.from('labour_daily_labourer_status').upsert({
              contractor_id: labourer.contractorId,
              work_date: labourer.workDate,
              labourer_id: labourer.id,
              is_active: nextIsActive,
              reason: reason || null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'contractor_id,work_date,labourer_id' });
          }
        } catch (dbErr) {
          console.warn('DB persistence notice (persisting locally):', dbErr);
        }
      }

      await onSave?.(labourer.id, nextIsActive, reason);
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Failed to update labourer status.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="labour-status-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '1rem',
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          color: '#1E293B',
          border: '1px solid #CBD5E1',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          margin: 'auto',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.1rem 1.35rem',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3
              id="labour-status-modal-title"
              style={{
                margin: 0,
                fontSize: '1.12rem',
                fontWeight: 700,
                color: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Users size={20} color="#0F766E" />
              Day-wise Labourer Status · दैनिक मजदूर स्थिति
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Set active/inactive status for this date and redistribute earnings.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
            style={{
              background: 'none',
              border: 'none',
              cursor: busy ? 'not-allowed' : 'pointer',
              color: '#64748B',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.35rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Labourer & Day Summary Card */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#F1F5F9',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Labourer Name</span>
              <span style={{ fontSize: '0.98rem', fontWeight: 700, color: '#1E293B' }}>
                {labourer.name}
                {labourer.localId ? ` (${labourer.localId})` : ''}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Working Date</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F766E', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={14} /> {labourer.workDate}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Current Calculated Amount</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: labourer.currentAmount > 0 ? '#0F766E' : '#94A3B8' }}>
                {formatInr(labourer.currentAmount)}
              </span>
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.5rem', display: 'block' }}>
              Select Status for {labourer.workDate}:
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* Active Option */}
              <button
                type="button"
                onClick={() => setSelectedStatus('Active')}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: selectedStatus === 'Active' ? '2px solid #059669' : '1px solid #CBD5E1',
                  backgroundColor: selectedStatus === 'Active' ? '#ECFDF5' : '#FFFFFF',
                  color: selectedStatus === 'Active' ? '#065F46' : '#475569',
                  fontWeight: selectedStatus === 'Active' ? 700 : 500,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: selectedStatus === 'Active' ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.1rem' }}>🟢</span> Active
                </span>
                {selectedStatus === 'Active' && <Check size={18} color="#059669" />}
              </button>

              {/* Inactive Option */}
              <button
                type="button"
                onClick={() => setSelectedStatus('Inactive')}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: selectedStatus === 'Inactive' ? '2px solid #DC2626' : '1px solid #CBD5E1',
                  backgroundColor: selectedStatus === 'Inactive' ? '#FEF2F2' : '#FFFFFF',
                  color: selectedStatus === 'Inactive' ? '#991B1B' : '#475569',
                  fontWeight: selectedStatus === 'Inactive' ? 700 : 500,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: selectedStatus === 'Inactive' ? '0 2px 8px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.1rem' }}>🔴</span> Inactive
                </span>
                {selectedStatus === 'Inactive' && <Check size={18} color="#DC2626" />}
              </button>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '0.74rem', color: '#64748B' }}>
              Note: This status applies strictly to <strong>{labourer.workDate}</strong> and does not change the labourer's master profile.
            </p>
          </div>

          {/* Validation Guard Alert */}
          {isBlocked && (
            <div
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                color: '#B91C1C',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Operation Blocked:</strong> At least one labourer must remain active for this day.
              </div>
            </div>
          )}

          {/* Dynamic Confirmation Message & Redistribution Preview */}
          {isStatusChanged && !isBlocked && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: isChangingToInactive ? '#FFFBEB' : '#ECFDF5',
                border: `1px solid ${isChangingToInactive ? '#FDE68A' : '#A7F3D0'}`,
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <AlertTriangle size={18} color={isChangingToInactive ? '#B45309' : '#047857'} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: '0.86rem', fontWeight: 600, color: isChangingToInactive ? '#92400E' : '#065F46', lineHeight: 1.4 }}>
                  {isChangingToInactive
                    ? 'Are you sure you want to make this labourer inactive for this day? Their complete amount will be redistributed equally among the remaining active labourers.'
                    : 'Make this labourer active again? The daily labour amount will be recalculated among all active labourers.'}
                </span>
              </div>

              {/* Live Preview Strip */}
              {projectedCalculation && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.8rem',
                    color: '#334155',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{labourer.name}'s new amount:</span>
                    <strong style={{ color: selectedStatus === 'Active' ? '#0F766E' : '#DC2626' }}>
                      {formatInr(projectedCalculation.labourerShare)}
                    </strong>
                  </div>
                  {projectedCalculation.activeCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>
                        {isChangingToInactive
                          ? `Remaining active labourers (${projectedCalculation.activeCount}):`
                          : `Active labourers (${projectedCalculation.activeCount}):`}
                      </span>
                      <strong style={{ color: '#0F766E' }}>
                        each receives ~{formatInr(projectedCalculation.otherShare)}
                      </strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: 4, marginTop: 2 }}>
                    <span>Total daily labour amount:</span>
                    <strong style={{ color: '#0F172A' }}>{formatInr(totalDayAmount)} (unchanged)</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Optional reason / remark */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem', display: 'block' }}>
              Reason / Remark (Optional):
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Absent on second half, left early, replaced..."
              disabled={busy}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                fontSize: '0.84rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#1E293B',
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '6px',
                color: '#DC2626',
                fontSize: '0.8rem',
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '0.9rem 1.35rem',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={busy}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={busy || isBlocked || !isStatusChanged}
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: isBlocked || !isStatusChanged ? '#94A3B8' : '#0F766E',
              borderColor: isBlocked || !isStatusChanged ? '#94A3B8' : '#0F766E',
              cursor: isBlocked || !isStatusChanged ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {busy ? 'Saving...' : 'Save Changes · सहेजें'}
          </button>
        </div>
      </div>
    </div>
  );
}
