import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HardHat, PlugZap, RefreshCw, AlertCircle, ClipboardList, ClipboardCheck, Wallet, Scale, Users, CalendarDays, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  summarize, dailyRows, labourerBalances, formatInr, monthStart,
  isNotConnectedError, isPermissionError,
} from '../lib/labourHisaabData';

/**
 * SL-LABOUR-NAV-01 / LH-CLOUD-SYNC-01: Labour Hisaab (admin only, read-only).
 *
 * Reads the secure LabourHisaab tables (proposal 249) that the LabourHisaab app syncs to.
 * Only SELECTs; CRM admins have read-only access by design. Coordinates/private data are not
 * involved. If the tables are not installed yet, the page says so instead of showing anything.
 */

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

const istToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

async function fetchAll(build) {
  const rows = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await build().range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
  return rows;
}

const Kpi = ({ icon: Icon, label, value, note }) => (
  <div className="card" style={{ padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
    <Icon size={20} className="text-secondary" style={{ marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
    <div style={{ minWidth: 0 }}>
      <div className="text-secondary" style={{ fontSize: '0.8rem' }}>{label}</div>
      <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
      {note ? <div className="text-muted" style={{ fontSize: '0.75rem' }}>{note}</div> : null}
    </div>
  </div>
);

const th = { padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
const td = { padding: '0.6rem 0.75rem', fontSize: '0.88rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top' };
const tdNum = { ...td, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };

export default function LabourHisaab() {
  const today = istToday();
  const [fromDate, setFromDate] = useState(monthStart(today));
  const [toDate, setToDate] = useState(today);
  const [contractorId, setContractorId] = useState('ALL');
  const [state, setState] = useState('loading'); // loading | ready | not_connected | no_access | error
  const [errorText, setErrorText] = useState('');
  const [data, setData] = useState({ contractors: [], labourers: [], entries: [], lines: [], payments: [], deductions: [] });

  const [refreshedAt, setRefreshedAt] = useState(null);
  // silent: background refresh (focus / every 60 s) keeps the current figures on screen.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState('loading');
    try {
      const byContractor = (q) => (contractorId === 'ALL' ? q : q.eq('contractor_id', contractorId));
      const [contractorsRes, labourersRes] = await Promise.all([
        supabase.from('contractors').select('id, name, is_active').order('name'),
        supabase.from('labourers').select('id, contractor_id, local_id, name, active_status'),
      ]);
      if (contractorsRes.error) throw contractorsRes.error;
      if (labourersRes.error) throw labourersRes.error;

      const [entries, lines, payments, expenses] = await Promise.all([
        fetchAll(() => byContractor(supabase.from('daily_work_entries')
          .select('id, contractor_id, work_date, work_type, rate_snapshot, rate_unit_snapshot, total_weight_kg, total_bags, total_batches, calculated_labour_amount')
          .gte('work_date', fromDate).lte('work_date', toDate)
          .order('work_date', { ascending: false }).order('id'))),
        fetchAll(() => byContractor(supabase.from('v_labour_work_lines')
          .select('allocation_id, work_entry_id, contractor_id, work_date, labourer_id, labourer_name, allocated_amount')
          .gte('work_date', fromDate).lte('work_date', toDate)
          .order('work_date', { ascending: false }).order('allocation_id'))),
        fetchAll(() => byContractor(supabase.from('labour_payments')
          .select('id, contractor_id, labourer_id, payment_date, amount, payment_method')
          .gte('payment_date', fromDate).lte('payment_date', toDate)
          .order('payment_date', { ascending: false }).order('id'))),
        fetchAll(() => byContractor(supabase.from('service_expenses')
          .select('id, contractor_id, expense_date')
          .gte('expense_date', fromDate).lte('expense_date', toDate)
          .order('expense_date', { ascending: false }).order('id'))),
      ]);
      // Deductions = only amounts explicitly allocated to labourers (contractor expenses excluded).
      const expenseIds = expenses.map(e => e.id);
      const deductions = [];
      for (let i = 0; i < expenseIds.length; i += 200) {
        const chunk = expenseIds.slice(i, i + 200);
        const { data: alloc, error } = await supabase.from('service_expense_allocations')
          .select('expense_id, labourer_id, allocated_amount').in('expense_id', chunk);
        if (error) throw error;
        deductions.push(...(alloc || []));
      }
      setData({ contractors: contractorsRes.data || [], labourers: labourersRes.data || [], entries, lines, payments, deductions });
      setState('ready');
      setRefreshedAt(new Date());
    } catch (e) {
      if (isNotConnectedError(e)) setState('not_connected');
      else if (isPermissionError(e)) setState('no_access');
      else { setErrorText(e?.message || 'Unknown error'); setState('error'); }
    }
  }, [fromDate, toDate, contractorId]);

  useEffect(() => { load(); }, [load]);

  // New entries saved on the phones appear without a manual reload: on returning to the tab
  // and every 60 s while it is visible (the database is the only source).
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') load({ silent: true }); };
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);

  const labourersById = useMemo(() => Object.fromEntries(data.labourers.map(l => [l.id, l])), [data.labourers]);
  const contractorsById = useMemo(() => Object.fromEntries(data.contractors.map(c => [c.id, c])), [data.contractors]);
  const kpi = useMemo(() => summarize(data), [data]);
  const rows = useMemo(() => dailyRows({ entries: data.entries, lines: data.lines, contractorsById, labourersById }), [data, contractorsById, labourersById]);
  const balances = useMemo(() => labourerBalances({ lines: data.lines, payments: data.payments, deductions: data.deductions, labourersById }), [data, labourersById]);
  const rangeInvalid = !fromDate || !toDate || fromDate > toDate;

  const header = (
    <div className="page-header" style={{ marginBottom: '1.25rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HardHat size={26} /> Labour Hisaab
        </h1>
        <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
          Labour work and payment records synced from the LabourHisaab app. Read-only.
        </p>
      </div>
      <Link to="/labour-hisaab/approvals" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
        <ClipboardCheck size={16} /> Daily register approvals
      </Link>
    </div>
  );

  if (state === 'not_connected') {
    return (
      <div className="animate-fade-in">
        {header}
        <div className="card" role="status" style={{ padding: '2rem', textAlign: 'center', maxWidth: '720px' }}>
          <PlugZap size={40} className="text-warning" style={{ margin: '0 auto 0.75rem' }} aria-hidden="true" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Labour Hisaab data is not connected yet.
          </h2>
          <p className="text-secondary" style={{ fontSize: '0.95rem', lineHeight: 1.6, margin: '0 auto', maxWidth: '560px' }}>
            This page will show labour work and payment details once the live data connection is available.
            The secure LabourHisaab tables are not installed in the database yet, so no figures are shown.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {header}

      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }} className="text-secondary">
          From
          <input type="date" value={fromDate} max={toDate || undefined} onChange={e => setFromDate(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }} className="text-secondary">
          To
          <input type="date" value={toDate} min={fromDate || undefined} onChange={e => setToDate(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', minWidth: 200 }} className="text-secondary">
          Contractor
          <select value={contractorId} onChange={e => setContractorId(e.target.value)}>
            <option value="ALL">All contractors</option>
            {data.contractors.map(c => <option key={c.id} value={c.id}>{c.name}{c.is_active ? '' : ' (archived)'}</option>)}
          </select>
        </label>
        <button className="btn btn-secondary" onClick={() => { setFromDate(today); setToDate(today); }} style={{ height: 38 }}>Today</button>
        <button className="btn btn-secondary" onClick={() => { setFromDate(monthStart(today)); setToDate(today); }} style={{ height: 38 }}>This month</button>
        <button className="btn btn-secondary" onClick={() => load()} disabled={state === 'loading' || rangeInvalid} style={{ height: 38, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Refresh
        </button>
        {refreshedAt ? (
          <span className="text-muted" style={{ fontSize: '0.75rem', alignSelf: 'center' }}>
            Updated {refreshedAt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST · auto-refresh every minute
          </span>
        ) : null}
      </div>

      {rangeInvalid ? (
        <div className="card" style={{ padding: '1rem' }}><AlertCircle size={16} className="text-danger" /> Choose a valid date range.</div>
      ) : state === 'loading' ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }} role="status">Loading labour records…</div>
      ) : state === 'no_access' ? (
        <div className="card" style={{ padding: '1.5rem' }} role="alert">
          <AlertCircle size={18} className="text-danger" /> You do not have access to Labour Hisaab records. Only CRM admins can view them.
        </div>
      ) : state === 'error' ? (
        <div className="card" style={{ padding: '1.5rem' }} role="alert">
          <AlertCircle size={18} className="text-danger" /> Could not load labour records: {errorText}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginBottom: '1rem' }}>
            <Kpi icon={Wallet} label="Total wages (work)" value={formatInr(kpi.totalWage)} note={`${kpi.entryCount} entries · ${kpi.workDays} days`} />
            <Kpi icon={Users} label="Labourers who worked" value={kpi.labourersWorked} />
            <Kpi icon={ClipboardList} label="Paid to labour" value={formatInr(kpi.paid)} />
            <Kpi icon={Scale} label="Allocated deductions" value={formatInr(kpi.deducted)} />
            <Kpi icon={CalendarDays} label="Pending to labour" value={formatInr(kpi.pending)} note="Earned − paid − deductions" />
          </div>

          <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>Figures come only from records synced by the LabourHisaab app. Payments and expenses appear here once the app syncs them; until then pending amounts equal earnings.</span>
          </div>

          {rows.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }} role="status">
              No labour work recorded for this period yet.
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>Daily work ({rows.length})</h2>
              <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: '1.25rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Date</th><th style={th}>Work</th><th style={th}>Quantity</th><th style={th}>Rate</th>
                      <th style={{ ...th, textAlign: 'right' }}>Amount</th><th style={th}>Labourers</th>
                      {contractorId === 'ALL' ? <th style={th}>Contractor</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id}>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.date}</td>
                        <td style={td}>{r.workType}</td>
                        <td style={td}>{r.quantity}</td>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.rate}</td>
                        <td style={tdNum}>{formatInr(r.amount)}</td>
                        <td style={td}>{r.labourers.length ? r.labourers.map(l => `${l.name} (${formatInr(l.amount)})`).join(', ') : '—'}</td>
                        {contractorId === 'ALL' ? <td style={td}>{r.contractor}</td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>Labourer balances ({balances.length})</h2>
              <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Labourer</th><th style={{ ...th, textAlign: 'right' }}>Days</th>
                      <th style={{ ...th, textAlign: 'right' }}>Earned</th><th style={{ ...th, textAlign: 'right' }}>Paid</th>
                      <th style={{ ...th, textAlign: 'right' }}>Deductions</th><th style={{ ...th, textAlign: 'right' }}>Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map(b => (
                      <tr key={b.id}>
                        <td style={td}>{b.name}{b.localId ? <span className="text-muted" style={{ fontSize: '0.75rem' }}> · {b.localId}</span> : null}{b.active ? '' : <span className="text-muted" style={{ fontSize: '0.75rem' }}> · inactive</span>}</td>
                        <td style={tdNum}>{b.days}</td>
                        <td style={tdNum}>{formatInr(b.earned)}</td>
                        <td style={tdNum}>{formatInr(b.paid)}</td>
                        <td style={tdNum}>{formatInr(b.deducted)}</td>
                        <td style={{ ...tdNum, fontWeight: 600 }}>{formatInr(b.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
