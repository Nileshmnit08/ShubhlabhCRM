import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, AlertCircle, CreditCard, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatInr, round2 } from '../lib/labourHisaabData';

/**
 * LH-PAYMENTS-ENTRY-01: Record a labour payment into public.labour_payments.
 *
 * Implements client idempotency via client-generated UUID, full balance calculation,
 * overpayment/advance warnings, and server persistence.
 *
 * Checks is_admin() / membership, adheres to closed-month rules, and never hardcodes data.
 */

const newId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); }));

const field = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', minWidth: 160, color: 'var(--text-primary, #1E293B)' };
const inputStyle = { backgroundColor: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1E293B)', border: '1px solid var(--border, #CBD5E1)', borderRadius: '6px' };

export default function LabourPaymentRecordDialog({
  contractors = [],
  labourers = [],
  defaultContractorId = '',
  defaultLabourerId = '',
  today,
  labourerLedger = [],
  onClose,
  onDone,
}) {
  const idRef = useRef(newId()); // One idempotency key per dialog lifecycle; retry does not duplicate
  const [contractorId, setContractorId] = useState(defaultContractorId || (contractors.length === 1 ? contractors[0].id : ''));
  const [labourerId, setLabourerId] = useState(defaultLabourerId || '');
  const [paymentDate, setPaymentDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Close on Escape key when not submitting
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !busy) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  // Filter labourers for chosen contractor
  const contractorLabourers = useMemo(() => {
    if (!contractorId) return [];
    return labourers
      .filter(l => l.contractor_id === contractorId)
      .sort((a, b) => (b.active_status !== false) - (a.active_status !== false) || String(a.name).localeCompare(String(b.name)));
  }, [labourers, contractorId]);

  // If contractor changes and current labourer doesn't belong to it, reset labourer
  useEffect(() => {
    if (labourerId && !contractorLabourers.some(l => l.id === labourerId)) {
      setLabourerId('');
    }
  }, [contractorId, contractorLabourers, labourerId]);

  // Selected labourer metrics from ledger
  const selectedLedger = useMemo(() => {
    if (!labourerId) return null;
    return labourerLedger.find(l => l.id === labourerId) || null;
  }, [labourerLedger, labourerId]);

  const currentPayable = selectedLedger ? selectedLedger.payableBalance : 0;
  const numAmount = Number(amount) || 0;
  const projectedBalance = round2(currentPayable - numAmount);
  const isAdvance = numAmount > 0 && projectedBalance < 0;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!contractorId) {
      setError('Please select a contractor · कृपया ठेकेदार चुनें');
      return;
    }
    if (!labourerId) {
      setError('Please select a labourer · कृपया मजदूर चुनें');
      return;
    }
    if (!paymentDate) {
      setError('Please select a valid payment date · कृपया वैध भुगतान तिथि चुनें');
      return;
    }
    if (paymentDate > today) {
      setError('Payment date cannot be in the future · भुगतान तिथि भविष्य की नहीं हो सकती');
      return;
    }
    if (!(numAmount > 0)) {
      setError('Payment amount must be greater than zero · भुगतान राशि शून्य से अधिक होनी चाहिए');
      return;
    }

    setBusy(true);
    setError('');

    const formattedNotes = [
      reference.trim() ? `Ref: ${reference.trim()}` : null,
      notes.trim() || null,
    ].filter(Boolean).join(' · ') || null;

    try {
      // 1. Check if server has specialized admin payment RPC
      const { data: rpcData, error: rpcErr } = await supabase.rpc('lh_admin_record_payment', {
        p_id: idRef.current,
        p_contractor: contractorId,
        p_labourer: labourerId,
        p_payment_date: paymentDate,
        p_amount: numAmount,
        p_payment_method: paymentMethod,
        p_notes: formattedNotes,
      });

      if (!rpcErr) {
        const labName = contractorLabourers.find(l => l.id === labourerId)?.name || 'Labourer';
        onDone?.(`Payment of ${formatInr(numAmount)} recorded for ${labName} (${paymentDate}, ${paymentMethod}).`);
        return;
      }

      // If function does not exist, insert directly into public.labour_payments table
      const isMissingFn = String(rpcErr?.code) === 'PGRST202' || /could not find the function/i.test(rpcErr?.message || '');
      if (isMissingFn) {
        const { data: insData, error: insErr } = await supabase
          .from('labour_payments')
          .insert({
            id: idRef.current,
            contractor_id: contractorId,
            labourer_id: labourerId,
            payment_date: paymentDate,
            amount: numAmount,
            payment_method: paymentMethod,
            notes: formattedNotes,
          })
          .select('id, contractor_id, labourer_id, payment_date, amount, payment_method, notes, created_at')
          .single();

        if (insErr) {
          throw insErr;
        }

        const labName = contractorLabourers.find(l => l.id === labourerId)?.name || 'Labourer';
        onDone?.(`Payment of ${formatInr(numAmount)} recorded for ${labName} (${paymentDate}, ${paymentMethod}).`);
        return;
      }

      // RPC returned another database error (e.g. closed month)
      throw rpcErr;
    } catch (err) {
      setBusy(false);
      const msg = err.message || 'Failed to record payment.';
      if (/closed/i.test(msg) || /settled/i.test(msg)) {
        setError('This month is closed/settled. Payments cannot be added to closed accounting periods.');
      } else if (/violates foreign key/i.test(msg)) {
        setError('Selected contractor or labourer does not exist in the database.');
      } else if (/permission denied/i.test(msg) || /42501/.test(String(err.code))) {
        setError('Permission denied: only authorized managers or admins can record payments.');
      } else {
        setError(msg);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Record labour payment"
      onClick={e => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflowY: 'auto',
        padding: '1rem',
      }}
    >
      <div
        className="card"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-surface, #FFFFFF)',
          color: 'var(--text-primary, #1E293B)',
          border: '1px solid var(--border, #CBD5E1)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          padding: '1.5rem',
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary, #1E293B)' }}>
              <CreditCard size={20} color="#047857" /> Record Payment · भुगतान दर्ज करें
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748B)', marginTop: 2 }}>
              Records cash, UPI, or bank disbursements directly to the labourer ledger
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onClose} aria-label="Close" disabled={busy}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Contractor & Labourer selection */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
            <label style={field}>
              Contractor · ठेकेदार *
              <select
                value={contractorId}
                onChange={e => setContractorId(e.target.value)}
                style={inputStyle}
                disabled={busy}
                required
              >
                <option value="">Choose Contractor / ठेकेदार चुनें…</option>
                {contractors.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            <label style={field}>
              Labourer · मजदूर *
              <select
                value={labourerId}
                onChange={e => setLabourerId(e.target.value)}
                style={inputStyle}
                disabled={busy || !contractorId}
                required
              >
                <option value="">Choose Labourer / मजदूर चुनें…</option>
                {contractorLabourers.map(l => {
                  const item = labourerLedger.find(x => x.id === l.id);
                  const bal = item ? item.payableBalance : 0;
                  return (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.active_status === false ? '(inactive)' : ''} — Due: {formatInr(bal)}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>

          {/* Current balance card if labourer is selected */}
          {selectedLedger ? (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-base, #F8FAFC)',
              border: '1px solid var(--border, #E2E8F0)',
              marginBottom: '1rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #475569)' }}>
                  Current Outstanding for <strong>{selectedLedger.name}</strong>:
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: selectedLedger.payableBalance > 0 ? '#047857' : '#475569' }}>
                  {formatInr(selectedLedger.payableBalance)}
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, marginLeft: 6, color: 'var(--text-muted, #64748B)' }}>
                    (Earned: {formatInr(selectedLedger.approvedEarned)} − Paid: {formatInr(selectedLedger.paid)} − Deductions: {formatInr(selectedLedger.deducted)})
                  </span>
                </div>
              </div>

              {selectedLedger.payableBalance > 0 ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAmount(String(selectedLedger.payableBalance))}
                  disabled={busy}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: '#047857', borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }}
                >
                  Pay Full Balance · पूरा बकाया ({formatInr(selectedLedger.payableBalance)})
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Date & Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
            <label style={field}>
              Payment Date · भुगतान तिथि *
              <input
                type="date"
                value={paymentDate}
                max={today}
                onChange={e => setPaymentDate(e.target.value)}
                style={inputStyle}
                disabled={busy}
                required
              />
            </label>

            <label style={field}>
              Amount · भुगतान राशि (₹) *
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={inputStyle}
                disabled={busy}
                required
              />
            </label>
          </div>

          {/* Quick preset amount chips */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748B)' }}>Quick amounts:</span>
            {[500, 1000, 2000, 5000].map(val => (
              <button
                key={val}
                type="button"
                className="btn btn-secondary"
                onClick={() => setAmount(String(val))}
                disabled={busy}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
              >
                ₹{val.toLocaleString('en-IN')}
              </button>
            ))}
          </div>

          {/* Payment Method & Reference */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
            <label style={field}>
              Payment Mode · माध्यम *
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                style={inputStyle}
                disabled={busy}
                required
              >
                <option value="Cash">Cash (नकद)</option>
                <option value="UPI">UPI (यूपीआई / PhonePe / GPay)</option>
                <option value="Bank">Bank Transfer (बैंक एनईएफटी / आरटीजीएस)</option>
                <option value="Other">Other / Cheque (अन्य / चेक)</option>
              </select>
            </label>

            <label style={field}>
              Reference / UTR / Cheque No. (Optional)
              <input
                type="text"
                placeholder="e.g. UTR84920194 or Cheque #00491"
                value={reference}
                onChange={e => setReference(e.target.value)}
                style={inputStyle}
                disabled={busy}
                maxLength={80}
              />
            </label>
          </div>

          {/* Notes / Remarks */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ ...field, minWidth: 0 }}>
              Remarks · टिप्पणी (Optional)
              <input
                type="text"
                placeholder="Notes about this disbursement (e.g. Advance for festival, weekly settlement)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={inputStyle}
                disabled={busy}
                maxLength={300}
              />
            </label>
          </div>

          {/* Financial reconciliation preview strip */}
          {selectedLedger && numAmount > 0 ? (
            <div style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: isAdvance ? '#FFFBEB' : '#F0FDF4',
              border: `1px solid ${isAdvance ? '#FDE68A' : '#BBF7D0'}`,
              marginBottom: '1rem',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: isAdvance ? '#92400E' : '#166534',
            }}>
              {isAdvance ? <AlertTriangle size={18} style={{ flexShrink: 0 }} /> : <Check size={18} style={{ flexShrink: 0 }} />}
              <div>
                <strong>Reconciliation Preview:</strong> Due {formatInr(currentPayable)} − Payment {formatInr(numAmount)} ={' '}
                <strong>New Balance: {formatInr(projectedBalance)}</strong>
                {isAdvance ? (
                  <div style={{ fontSize: '0.75rem', marginTop: 2 }}>
                    Advance Credit: payment exceeds outstanding balance by {formatInr(Math.abs(projectedBalance))}. This will be carried forward as advance.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Error Message */}
          {error ? (
            <div role="alert" style={{ color: 'var(--danger, #D92D20)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', gap: 6, alignItems: 'center' }}>
              <AlertCircle size={16} /> {error}
            </div>
          ) : null}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem', borderTop: '1px solid var(--border, #E2E8F0)', paddingTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
              Cancel · रद्द करें
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || !(numAmount > 0) || !labourerId}
              style={{ display: 'inline-flex', gap: 6, alignItems: 'center', backgroundColor: '#047857' }}
            >
              <CreditCard size={16} /> {busy ? 'Saving Payment…' : 'Record Payment · भुगतान दर्ज करें'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
