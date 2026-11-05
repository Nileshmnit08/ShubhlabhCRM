import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, AlertCircle, Trash2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatInr, previewAmount, adminEntryError, workTypeLabel, quantityLabel } from '../lib/labourHisaabData';

/**
 * LH-CRM-APPROVED-SUMMARY-ADMIN-CRUD-09: CRM admin add / edit / delete of a labour entry.
 *
 * Every change goes ONLY through the database functions of proposal 255, which check is_admin()
 * themselves, recompute the amount from the rate period × quantity, keep the entry's id,
 * contractor and historical rate, write the audit history and never set an approval status
 * (the day returns to Pending until a CRM admin approves it). Delete needs a reason and is refused
 * for a closed (settled) month.
 */

const newId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); }));

const field = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', minWidth: 160, color: 'var(--text-primary, #1E293B)' };
const inputStyle = { backgroundColor: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1E293B)', border: '1px solid var(--border, #CBD5E1)', borderRadius: '6px' };
const isMissingFn = (e) => String(e?.code) === 'PGRST202' || /could not find the function/i.test(e?.message || '');

export default function LabourEntryAdminDialog({ mode, entry, lines = [], contractors = [], labourers = [], defaultContractorId = '', today, onClose, onDone }) {
  const isEdit = mode === 'edit';
  const idRef = useRef(entry?.id || newId()); // one id per dialog: a retry never creates a second entry
  const [form, setForm] = useState(() => ({
    contractorId: entry?.contractor_id || defaultContractorId || (contractors.length === 1 ? contractors[0].id : ''),
    workDate: entry?.work_date ? String(entry.work_date).slice(0, 10) : today,
    workType: entry?.work_type || '',
    unit: entry?.rate_unit_snapshot || '',
    totalWeightKg: entry ? String(Number(entry.total_weight_kg) || 0) : '',
    totalBags: entry ? String(Number(entry.total_bags) || 0) : '',
    totalBatches: entry ? String(Number(entry.total_batches) || 0) : '',
    rate: '',
    notes: entry?.notes || '',
    reason: '',
    labourerIds: [...new Set(lines.map(l => l.labourer_id))],
  }));
  const [bagLines, setBagLines] = useState([]);
  const [rates, setRates] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Close dialog on Escape key when not busy
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !busy) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  // Rate periods of the contractor (read-only for admins) and the entry's own bag lines.
  useEffect(() => {
    if (mode === 'delete' || !form.contractorId) { setRates([]); return; }
    supabase.from('labour_rates').select('id, work_type, rate, rate_unit, is_editable_rate, effective_from, effective_until')
      .eq('contractor_id', form.contractorId).order('work_type')
      .then(({ data, error: e }) => { if (e) setError(e.message); else setRates(data || []); });
  }, [form.contractorId, mode]);
  useEffect(() => {
    if (!isEdit || !entry) return;
    supabase.from('daily_work_details').select('bag_weight_kg, bag_count').eq('work_entry_id', entry.id)
      .then(({ data }) => setBagLines((data || []).map(d => ({ w: String(Number(d.bag_weight_kg)), c: String(d.bag_count) }))));
  }, [isEdit, entry]);

  const period = useMemo(() => rates.find(r => r.work_type === form.workType && (!form.unit || r.rate_unit === form.unit)
    && form.workDate >= r.effective_from && (!r.effective_until || form.workDate <= r.effective_until)) || null, [rates, form.workType, form.unit, form.workDate]);
  const workTypes = useMemo(() => [...new Map(rates.map(r => [`${r.work_type}|${r.rate_unit}`, r])).values()], [rates]);
  const unit = period?.rate_unit || form.unit;
  const useBagLines = unit === 'Per 100 kg' && bagLines.length > 0;
  const bagTotals = useMemo(() => bagLines.reduce((t, l) => ({ kg: t.kg + (Number(l.w) || 0) * (Number(l.c) || 0), bags: t.bags + (Number(l.c) || 0) }), { kg: 0, bags: 0 }), [bagLines]);
  // Rate shown: an edit in the same period keeps the entry's own (historical) rate.
  const effectiveRate = form.rate !== '' && period?.is_editable_rate ? Number(form.rate)
    : isEdit && entry && period && entry.rate_unit_snapshot === period.rate_unit && entry.work_type === period.work_type ? Number(entry.rate_snapshot)
    : Number(period?.rate || 0);
  const preview = previewAmount({ rate: effectiveRate, unit, totalWeightKg: useBagLines ? bagTotals.kg : form.totalWeightKg,
    totalBags: useBagLines ? bagTotals.bags : form.totalBags, totalBatches: form.totalBatches });
  const contractorLabourers = labourers.filter(l => l.contractor_id === form.contractorId)
    .sort((a, b) => (b.active_status !== false) - (a.active_status !== false) || String(a.name).localeCompare(String(b.name)));

  const save = async () => {
    const f = { ...form, unit, rate: unit === 'Fixed amount' ? (form.rate || (period ? String(period.rate) : '')) : form.rate,
      totalWeightKg: useBagLines ? String(bagTotals.kg) : form.totalWeightKg, totalBags: useBagLines ? String(bagTotals.bags) : form.totalBags };
    const err = adminEntryError(f, today) || (!period ? 'No rate period for this work type on that date.' : null)
      || (useBagLines && bagLines.some(l => !(Number(l.w) > 0) || !(Number(l.c) > 0 && Number.isInteger(Number(l.c)))) ? 'Each bag line needs a positive weight and a whole-number count.' : null);
    if (err) { setError(err); return; }
    setBusy(true); setError('');
    const { error: e } = await supabase.rpc('lh_admin_save_work_entry', {
      p_id: idRef.current, p_contractor: f.contractorId, p_work_date: f.workDate, p_work_type: f.workType, p_unit: unit,
      p_labourer_ids: f.labourerIds, p_total_weight_kg: Number(f.totalWeightKg) || 0, p_total_bags: Math.round(Number(f.totalBags) || 0),
      p_total_batches: Math.round(Number(f.totalBatches) || 0), p_notes: f.notes.trim() || null,
      p_rate: period?.is_editable_rate && f.rate !== '' ? Number(f.rate) : null,
      p_bag_lines: useBagLines ? bagLines.map(l => ({ bag_weight_kg: Number(l.w), bag_count: Number(l.c) })) : null,
      p_reason: f.reason.trim() || null,
    });
    setBusy(false);
    if (e) { setError(isMissingFn(e) ? 'Admin entry management is not installed yet (proposal 255).' : e.message); return; }
    onDone(`${isEdit ? 'Entry updated' : 'Entry added'} (${f.workDate}, ${workTypeLabel(f.workType)}). The day is now Pending CRM approval and is not in the totals until it is approved.`);
  };

  const remove = async () => {
    if (!form.reason.trim()) { setError('Give a reason for deleting this entry (kept in the audit history).'); return; }
    setBusy(true); setError('');
    const { error: e } = await supabase.rpc('lh_admin_delete_work_entry', { p_id: entry.id, p_reason: form.reason.trim() });
    setBusy(false);
    if (e) { setError(isMissingFn(e) ? 'Admin entry management is not installed yet (proposal 255).' : e.message); return; }
    onDone(`Entry deleted (${String(entry.work_date).slice(0, 10)}, ${workTypeLabel(entry.work_type)}). The old values are kept in the audit history; the day is Pending CRM approval.`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'delete' ? 'Delete labour entry' : isEdit ? 'Edit labour entry' : 'Add labour entry'}
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
          maxWidth: 760,
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary, #1E293B)' }}>{mode === 'delete' ? 'Delete labour entry' : isEdit ? 'Edit labour entry' : 'Add labour entry'}</h2>
          <button className="btn btn-secondary" onClick={onClose} aria-label="Close" disabled={busy}><X size={16} /></button>
        </div>

        {mode === 'delete' ? (
          <>
            <p style={{ margin: '0 0 0.5rem', color: 'var(--text-primary, #1E293B)' }}>
              Delete <strong>{workTypeLabel(entry.work_type)}</strong> on <strong>{String(entry.work_date).slice(0, 10)}</strong> — {quantityLabel(entry)}, {formatInr(entry.calculated_labour_amount)}?
            </p>
            <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
              The full entry stays in the audit history. Entries in a closed (settled) month are protected and cannot be deleted.
            </p>
            <label style={{ ...field, minWidth: 0 }}>Reason (required)
              <textarea rows={2} value={form.reason} onChange={e => set('reason', e.target.value)} maxLength={500} style={inputStyle} />
            </label>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <label style={field}>Contractor
                <select value={form.contractorId} disabled={isEdit} onChange={e => setForm(f => ({ ...f, contractorId: e.target.value, workType: '', unit: '', labourerIds: [] }))} style={inputStyle}>
                  <option value="">Choose…</option>
                  {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label style={field}>Work date
                <input type="date" value={form.workDate} max={today} onChange={e => set('workDate', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ ...field, minWidth: 220 }}>Work type
                <select value={`${form.workType}|${form.unit}`} onChange={e => { const [w, u] = e.target.value.split('|'); setForm(f => ({ ...f, workType: w, unit: u, rate: '' })); }} style={inputStyle}>
                  <option value="|">Choose…</option>
                  {workTypes.map(r => <option key={`${r.work_type}|${r.rate_unit}`} value={`${r.work_type}|${r.rate_unit}`}>{workTypeLabel(r.work_type)} — {r.rate_unit}</option>)}
                </select>
              </label>
            </div>

            {form.workType ? (
              <div className="text-secondary" style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                {period
                  ? <>Rate period: ₹{Number(period.rate)} {period.rate_unit} (from {period.effective_from}{period.effective_until ? ` to ${period.effective_until}` : ''}){period.is_editable_rate ? ' · rate may be set per entry' : ' · fixed rate'}{isEdit && entry?.rate_id === period.id ? ` · this entry keeps its rate ₹${Number(entry.rate_snapshot)}` : ''}</>
                  : <span style={{ color: 'var(--danger, #D92D20)' }}>No rate period for this work type on {form.workDate}. Rates are managed in the app; they are never changed here.</span>}
              </div>
            ) : null}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
              {unit === 'Per 100 kg' ? (
                <div style={{ ...field, minWidth: 320 }}>
                  Bag lines (weight kg × count) — or total weight
                  {bagLines.map((l, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6 }}>
                      <input type="number" min="0" step="0.01" value={l.w} onChange={e => setBagLines(b => b.map((x, j) => (j === i ? { ...x, w: e.target.value } : x)))} aria-label="Bag weight kg" style={{ ...inputStyle, width: 90 }} />
                      <input type="number" min="0" step="1" value={l.c} onChange={e => setBagLines(b => b.map((x, j) => (j === i ? { ...x, c: e.target.value } : x)))} aria-label="Bag count" style={{ ...inputStyle, width: 90 }} />
                      <button className="btn btn-secondary" onClick={() => setBagLines(b => b.filter((_, j) => j !== i))} aria-label="Remove bag line">×</button>
                    </div>
                  ))}
                  <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setBagLines(b => [...b, { w: '50', c: '' }])}>+ Bag line</button>
                  {bagLines.length ? <span>Total: {bagTotals.kg.toLocaleString('en-IN')} kg · {bagTotals.bags} bags</span> : (
                    <span style={{ display: 'flex', gap: 6 }}>
                      <input type="number" min="0" step="0.01" placeholder="Total kg" value={form.totalWeightKg} onChange={e => set('totalWeightKg', e.target.value)} aria-label="Total weight kg" style={{ ...inputStyle, width: 110 }} />
                      <input type="number" min="0" step="1" placeholder="Bags" value={form.totalBags} onChange={e => set('totalBags', e.target.value)} aria-label="Total bags" style={{ ...inputStyle, width: 90 }} />
                    </span>
                  )}
                </div>
              ) : unit === 'Per bag' ? (
                <label style={field}>Bags<input type="number" min="0" step="1" value={form.totalBags} onChange={e => set('totalBags', e.target.value)} style={inputStyle} /></label>
              ) : unit === 'Per batch' ? (
                <label style={field}>Batches<input type="number" min="0" step="1" value={form.totalBatches} onChange={e => set('totalBatches', e.target.value)} style={inputStyle} /></label>
              ) : null}
              {period && (period.is_editable_rate || unit === 'Fixed amount') ? (
                <label style={field}>{unit === 'Fixed amount' ? 'Amount (₹)' : 'Rate (₹, optional)'}
                  <input type="number" min="0" step="0.01" value={form.rate} placeholder={String(effectiveRate)} onChange={e => set('rate', e.target.value)} disabled={!period.is_editable_rate} style={inputStyle} />
                </label>
              ) : null}
              <div style={{ ...field, justifyContent: 'flex-end' }}>
                Amount (server recomputes)
                <strong style={{ fontSize: '1.1rem' }}>{formatInr(preview)}</strong>
              </div>
            </div>

            <div style={{ ...field, minWidth: 0, marginBottom: '0.75rem' }}>
              Labourers ({form.labourerIds.length} selected — amount split equally)
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem 0.75rem', maxHeight: 160, overflowY: 'auto' }}>
                {contractorLabourers.length === 0 ? <span className="text-muted">No labourers for this contractor yet.</span> : contractorLabourers.map(l => (
                  <label key={l.id} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', color: 'var(--text-primary)' }}>
                    <input type="checkbox" checked={form.labourerIds.includes(l.id)}
                      onChange={e => set('labourerIds', e.target.checked ? [...form.labourerIds, l.id] : form.labourerIds.filter(x => x !== l.id))} />
                    {l.name}{l.active_status === false ? ' (inactive)' : ''}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <label style={{ ...field, flex: 2 }}>Notes<input value={form.notes} onChange={e => set('notes', e.target.value)} maxLength={500} style={inputStyle} /></label>
              <label style={{ ...field, flex: 1 }}>Reason for the audit log (optional)<input value={form.reason} onChange={e => set('reason', e.target.value)} maxLength={300} style={inputStyle} /></label>
            </div>
            <p className="text-muted" style={{ fontSize: '0.78rem', margin: '0.5rem 0 0' }}>
              Saving makes the day Pending: it leaves the approved totals until a CRM admin approves it on the approvals page.
            </p>
          </>
        )}

        {error ? <div role="alert" style={{ color: 'var(--danger, #D92D20)', fontSize: '0.85rem', marginTop: '0.75rem', display: 'flex', gap: 6 }}><AlertCircle size={16} /> {error}</div> : null}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          {mode === 'delete' ? (
            <button className="btn btn-primary" onClick={remove} disabled={busy} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', background: 'var(--danger, #D92D20)' }}>
              <Trash2 size={16} /> {busy ? 'Deleting…' : 'Confirm delete'}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={save} disabled={busy} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <Save size={16} /> {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add entry'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
