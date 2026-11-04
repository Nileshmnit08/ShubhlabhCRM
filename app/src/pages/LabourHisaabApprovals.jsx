import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, RefreshCw, AlertCircle, PlugZap, CheckCircle2, XCircle, ArrowLeft, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatInr, monthStart, quantityLabel, workTypeLabel, isPermissionError } from '../lib/labourHisaabData';
import { formatIst, formatIstTime, sortRegisters, registerTimeline, registerTotals, decisionError, EVENT_LABELS, isRegisterNotInstalled } from '../lib/labourApprovals';

/**
 * LH-DAILY-REGISTER-APPROVAL-01: approve or reject LabourHisaab daily registers (admin only).
 *
 * One register = one contractor's business date (proposal 252). Labour details stay read-only;
 * the ONLY write is lh_decide_daily_register, which the database restricts to CRM approvers
 * (is_admin) who are not members of that contractor, for the exact revision reviewed.
 */

const istToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

const th = { padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
const td = { padding: '0.6rem 0.75rem', fontSize: '0.88rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top' };
const tdNum = { ...td, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
const STATUS_COLORS = { Pending: 'var(--warning, #B54708)', Approved: 'var(--success, #168A45)', Rejected: 'var(--danger, #D92D20)' };

const Badge = ({ status }) => (
  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: STATUS_COLORS[status] || 'inherit', border: `1px solid ${STATUS_COLORS[status] || 'var(--border)'}`, borderRadius: 999, padding: '0.1rem 0.5rem', whiteSpace: 'nowrap' }}>
    {status}
  </span>
);

export default function LabourHisaabApprovals() {
  const today = istToday();
  const [fromDate, setFromDate] = useState(monthStart(today));
  const [toDate, setToDate] = useState(today);
  const [contractorId, setContractorId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [state, setState] = useState('loading'); // loading | ready | not_installed | no_access | error
  const [errorText, setErrorText] = useState('');
  const [contractors, setContractors] = useState([]);
  const [registers, setRegisters] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null); // { register, entries, lines, events, users }
  const [detailError, setDetailError] = useState('');
  const [confirm, setConfirm] = useState(null); // { decision }
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState('loading');
    try {
      const [cRes, rRes] = await Promise.all([
        supabase.from('contractors').select('id, name, is_active').order('name'),
        (() => {
          let q = supabase.from('v_lh_daily_registers')
            .select('id, contractor_id, contractor_name, work_date, status, revision, rejection_reason, decided_by, decided_at, entry_count, total_amount, labourer_count, updated_at')
            .gte('work_date', fromDate).lte('work_date', toDate).order('work_date', { ascending: false }).limit(1000);
          if (contractorId !== 'ALL') q = q.eq('contractor_id', contractorId);
          if (statusFilter !== 'ALL') q = q.eq('status', statusFilter);
          return q;
        })(),
      ]);
      if (cRes.error) throw cRes.error;
      if (rRes.error) throw rRes.error;
      setContractors(cRes.data || []);
      setRegisters(rRes.data || []);
      setState('ready');
    } catch (e) {
      if (isRegisterNotInstalled(e)) setState('not_installed');
      else if (isPermissionError(e)) setState('no_access');
      else { setErrorText(e?.message || 'Unknown error'); setState('error'); }
    }
  }, [fromDate, toDate, contractorId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Registers submitted from the phones appear without a reload (tab focus / every 60 s).
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') load({ silent: true }); };
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);

  const openRegister = useCallback(async (reg) => {
    setOpenId(reg.id); setDetail(null); setDetailError(''); setConfirm(null); setReason(''); setNotice('');
    try {
      const [eRes, lRes, evRes] = await Promise.all([
        supabase.from('daily_work_entries')
          .select('id, work_date, work_type, rate_snapshot, rate_unit_snapshot, total_weight_kg, total_bags, total_batches, calculated_labour_amount, notes, recorded_at, work_completed_at, created_at, updated_at, created_by, updated_by')
          .eq('contractor_id', reg.contractor_id).eq('work_date', reg.work_date),
        supabase.from('v_labour_work_lines')
          .select('work_entry_id, labourer_id, labourer_name, allocated_amount')
          .eq('contractor_id', reg.contractor_id).eq('work_date', reg.work_date),
        supabase.from('labour_daily_register_events')
          .select('id, action, from_status, to_status, revision, reason, actor, at')
          .eq('register_id', reg.id).order('at', { ascending: true }),
      ]);
      for (const r of [eRes, lRes, evRes]) if (r.error) throw r.error;
      // Names for people ids (CRM users); unknown ids are shown shortened, never guessed.
      const ids = [...new Set([...(eRes.data || []).flatMap(e => [e.created_by, e.updated_by]), ...(evRes.data || []).map(e => e.actor), reg.decided_by].filter(Boolean))];
      let users = {};
      if (ids.length) {
        const { data: u } = await supabase.from('app_users').select('id, email').in('id', ids);
        users = Object.fromEntries((u || []).map(x => [x.id, x.email]));
      }
      setDetail({ register: reg, entries: eRes.data || [], lines: lRes.data || [], events: evRes.data || [], users });
    } catch (e) {
      setDetailError(e?.message || 'Could not load the register.');
    }
  }, []);

  const who = (id) => (!id ? '—' : detail?.users?.[id] || `${String(id).slice(0, 8)}…`);

  const decide = async () => {
    const err = decisionError({ decision: confirm?.decision, reason });
    if (err) { setNotice(err); return; }
    const reg = detail.register;
    setBusy(true); setNotice('');
    const { error } = await supabase.rpc('lh_decide_daily_register', {
      p_contractor: reg.contractor_id, p_date: reg.work_date, p_decision: confirm.decision,
      p_revision: reg.revision, p_reason: confirm.decision === 'Rejected' ? reason.trim() : null,
    });
    setBusy(false);
    if (error) { setNotice(error.message); return; }
    setConfirm(null); setReason('');
    setNotice(`${reg.contractor_name} · ${reg.work_date}: ${confirm.decision}.`);
    await load();
    const { data } = await supabase.from('v_lh_daily_registers').select('*').eq('id', reg.id).single();
    if (data) openRegister(data);
  };

  const timeline = useMemo(() => (detail ? registerTimeline(detail.entries, detail.lines) : []), [detail]);
  const totals = useMemo(() => (detail ? registerTotals(detail.entries, detail.lines) : null), [detail]);
  const list = useMemo(() => sortRegisters(registers), [registers]);
  const rangeInvalid = !fromDate || !toDate || fromDate > toDate;

  const header = (
    <div className="page-header" style={{ marginBottom: '1.25rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardCheck size={26} /> Labour register approvals
        </h1>
        <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
          Daily labour registers from the LabourHisaab app (one per contractor per day). Review the work, then approve or reject.{' '}
          <Link to="/labour-hisaab" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ArrowLeft size={14} /> Labour Hisaab</Link>
        </p>
      </div>
    </div>
  );

  if (state === 'not_installed') {
    return (
      <div className="animate-fade-in">
        {header}
        <div className="card" role="status" style={{ padding: '2rem', textAlign: 'center', maxWidth: 720 }}>
          <PlugZap size={40} className="text-warning" style={{ margin: '0 auto 0.75rem' }} aria-hidden="true" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Daily register approval is not installed yet.</h2>
          <p className="text-secondary" style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>The approval tables (proposal 252) are not in the database yet, so there is nothing to approve.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {header}

      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }} className="text-secondary">
          From<input type="date" value={fromDate} max={toDate || undefined} onChange={e => setFromDate(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }} className="text-secondary">
          To<input type="date" value={toDate} min={fromDate || undefined} onChange={e => setToDate(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', minWidth: 180 }} className="text-secondary">
          Contractor
          <select value={contractorId} onChange={e => setContractorId(e.target.value)}>
            <option value="ALL">All contractors</option>
            {contractors.map(c => <option key={c.id} value={c.id}>{c.name}{c.is_active ? '' : ' (archived)'}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }} className="text-secondary">
          Status
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="Pending">Pending</option><option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option><option value="ALL">All</option>
          </select>
        </label>
        <button className="btn btn-secondary" onClick={() => load()} disabled={state === 'loading' || rangeInvalid} style={{ height: 38, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {rangeInvalid ? (
        <div className="card" style={{ padding: '1rem' }}><AlertCircle size={16} className="text-danger" /> Choose a valid date range.</div>
      ) : state === 'loading' ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }} role="status">Loading registers…</div>
      ) : state === 'no_access' ? (
        <div className="card" style={{ padding: '1.5rem' }} role="alert"><AlertCircle size={18} className="text-danger" /> Only CRM admins can review labour registers.</div>
      ) : state === 'error' ? (
        <div className="card" style={{ padding: '1.5rem' }} role="alert"><AlertCircle size={18} className="text-danger" /> Could not load registers: {errorText}</div>
      ) : list.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }} role="status">No {statusFilter === 'ALL' ? '' : `${statusFilter.toLowerCase()} `}registers for this period.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: '1.25rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Date</th><th style={th}>Contractor</th><th style={th}>Status</th>
              <th style={{ ...th, textAlign: 'right' }}>Entries</th><th style={{ ...th, textAlign: 'right' }}>Labourers</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th><th style={th}>Last change</th><th style={th} />
            </tr></thead>
            <tbody>
              {list.map(r => (
                <tr key={r.id} style={r.id === openId ? { background: 'var(--bg-secondary, rgba(0,0,0,0.03))' } : undefined}>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.work_date}</td>
                  <td style={td}>{r.contractor_name}</td>
                  <td style={td}><Badge status={r.status} /></td>
                  <td style={tdNum}>{r.entry_count}</td>
                  <td style={tdNum}>{r.labourer_count}</td>
                  <td style={tdNum}>{formatInr(r.total_amount)}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{formatIst(r.updated_at)}</td>
                  <td style={td}><button className="btn btn-secondary" onClick={() => openRegister(r)}>Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openId && (detailError ? (
        <div className="card" style={{ padding: '1rem' }} role="alert"><AlertCircle size={16} className="text-danger" /> {detailError}</div>
      ) : !detail ? (
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }} role="status">Loading register…</div>
      ) : (
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {detail.register.contractor_name} · {detail.register.work_date} <Badge status={detail.register.status} />
              </h2>
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                Revision {detail.register.revision}
                {detail.register.decided_at ? ` · ${detail.register.status} by ${who(detail.register.decided_by)} at ${formatIst(detail.register.decided_at)}` : ''}
              </div>
              {detail.register.status === 'Rejected' ? <div style={{ fontSize: '0.85rem', color: STATUS_COLORS.Rejected }}>Reason: {detail.register.rejection_reason}</div> : null}
            </div>
            {detail.register.status === 'Pending' && !confirm ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" disabled={!timeline.length} onClick={() => { setConfirm({ decision: 'Approved' }); setNotice(''); }} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <CheckCircle2 size={16} /> Approve
                </button>
                <button className="btn btn-secondary" onClick={() => { setConfirm({ decision: 'Rejected' }); setNotice(''); }} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <XCircle size={16} /> Reject
                </button>
              </div>
            ) : null}
          </div>

          {confirm ? (
            <div className="card" style={{ padding: '0.75rem', marginBottom: '0.75rem', border: `1px solid ${STATUS_COLORS[confirm.decision]}` }} role="dialog" aria-label="Confirm decision">
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                {confirm.decision === 'Approved' ? 'Approve' : 'Reject'} {detail.register.contractor_name}'s register for {detail.register.work_date}
                {' '}({totals.entries} entries, {formatInr(totals.amount)})?
              </div>
              {confirm.decision === 'Rejected' ? (
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} maxLength={1000} placeholder="Reason the operator will see (required)" style={{ width: '100%', marginBottom: 8 }} />
              ) : null}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" disabled={busy} onClick={decide}>{busy ? 'Saving…' : `Confirm ${confirm.decision === 'Approved' ? 'approval' : 'rejection'}`}</button>
                <button className="btn btn-secondary" disabled={busy} onClick={() => { setConfirm(null); setReason(''); }}>Cancel</button>
              </div>
            </div>
          ) : null}
          {notice ? <div role="status" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>{notice}</div> : null}

          {timeline.length === 0 ? (
            <div className="text-secondary" style={{ padding: '1rem 0' }}>This register has no work entries (they were removed after it was created).</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={th}>Completed</th><th style={th}>Recorded</th><th style={th}>Work</th><th style={th}>Quantity</th>
                  <th style={{ ...th, textAlign: 'right' }}>Amount</th><th style={th}>Labourers</th><th style={th}>Entered by</th>
                </tr></thead>
                <tbody>
                  {timeline.map(e => (
                    <tr key={e.id}>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>{formatIstTime(e.work_completed_at)}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }} title={`Received by server ${formatIst(e.created_at)}`}>{formatIstTime(e.recorded_at)}</td>
                      <td style={td}>{workTypeLabel(e.work_type)}</td>
                      <td style={td}>{quantityLabel(e)}</td>
                      <td style={tdNum}>{formatInr(e.calculated_labour_amount)}</td>
                      <td style={td}>{e.labourers.length ? e.labourers.map(l => `${l.name} (${formatInr(l.amount)})`).join(', ') : '—'}</td>
                      <td style={td}>{who(e.created_by)}{e.updated_by && e.updated_by !== e.created_by ? ` · edited by ${who(e.updated_by)}` : ''}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...td, fontWeight: 600 }} colSpan={4}>Total · {totals.entries} entries · {totals.labourers} labourers · {totals.bags} bags</td>
                    <td style={{ ...tdNum, fontWeight: 700 }}>{formatInr(totals.amount)}</td><td style={td} colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '1rem 0 0.5rem', display: 'flex', gap: 6, alignItems: 'center' }}><History size={16} /> Approval history</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem' }}>
            {detail.events.map(ev => (
              <li key={ev.id}>{formatIst(ev.at)} — {EVENT_LABELS[ev.action] || ev.action} (rev {ev.revision}){ev.actor ? ` by ${who(ev.actor)}` : ''}{ev.reason ? `: ${ev.reason}` : ''}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
