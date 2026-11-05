import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HardHat, PlugZap, RefreshCw, AlertCircle, ClipboardList, ClipboardCheck,
  Wallet, Scale, Users, CalendarDays, Info, Plus, Pencil, Trash2,
  CheckCircle2, Clock, ChevronDown, ChevronRight, Download, FileText,
  FileSpreadsheet, Eye, X, Search, Check, AlertTriangle, Layers,
  TrendingUp, ArrowRight, DollarSign, Building2, UserCheck, ArrowDownRight,
  Filter, RotateCcw
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import {
  summarize, dailyRows, labourerBalances, formatInr, monthStart,
  isNotConnectedError, isPermissionError, attachApprovalStatus, approvedOnly, notCountedSummary,
  commandCenterMetrics, groupedDailyEntries, detailedLabourerLedger, workTypeSummary,
  generateDailyRegisterCsv, generateLabourerBalancesCsv,
  shiftDays, weekStart, lastMonthRange, getDateRangePreset,
  reconciliationPanelData, contractorSettlementSummaries
} from '../lib/labourHisaabData';
import LabourEntryAdminDialog from '../components/LabourEntryAdminDialog';
import { AuthContext } from '../AuthContext';

/**
 * MICRO-SPRINT LH-SETTLEMENT-UX-02: Reconciliation & Faster Daily Use
 * Extends the Labour Hisaab Command Center with:
 * - Dedicated Reconciliation Panel: Approved Wages − Paid − Deductions = Balance Payable
 * - Contractor Settlement Summaries with Last Payment Date & Settlement Status
 * - Faster Filters: Presets (Today, Yesterday, This week, This month, Last month), Removable Chips, Status Filters
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

// Table styling helpers
const th = { padding: '0.65rem 0.85rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', borderBottom: '1px solid var(--border, #CBD5E1)', whiteSpace: 'nowrap', backgroundColor: '#F8FAFC' };
const td = { padding: '0.65rem 0.85rem', fontSize: '0.86rem', borderBottom: '1px solid var(--border, #CBD5E1)', verticalAlign: 'middle' };
const tdNum = { ...td, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };

export default function LabourHisaab() {
  const today = istToday();
  const [fromDate, setFromDate] = useState(monthStart(today));
  const [toDate, setToDate] = useState(today);
  const [activePreset, setActivePreset] = useState('thisMonth'); // 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom'
  const [contractorId, setContractorId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Approved' | 'Pending' | 'Rejected' | 'Paid' | 'Unpaid' | 'Partially Paid'
  const [state, setState] = useState('loading'); // loading | ready | not_connected | no_access | error
  const [errorText, setErrorText] = useState('');
  const [data, setData] = useState({ contractors: [], labourers: [], entries: [], lines: [], payments: [], deductions: [], expenses: [] });

  // Navigation & Workspace states
  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'labourers' | 'approvals' | 'reports'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSplits, setExpandedSplits] = useState(new Set());
  const [selectedLabourer, setSelectedLabourer] = useState(null);

  const [refreshedAt, setRefreshedAt] = useState(null);
  const { userProfile } = useContext(AuthContext) || {};
  const isAdmin = userProfile?.role === 'Admin';
  const [dialog, setDialog] = useState(null); // { mode: 'add' | 'edit' | 'delete', entry? }
  const [notice, setNotice] = useState('');

  // Apply a date range preset
  const applyPreset = (key) => {
    setActivePreset(key);
    const range = getDateRangePreset(key, today);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  };

  const handleCustomDateChange = (from, to) => {
    setActivePreset('custom');
    if (from !== undefined) setFromDate(from);
    if (to !== undefined) setToDate(to);
  };

  // silent: background refresh (focus / every 60 s) keeps figures on screen.
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

      const ENTRY_COLS = 'id, contractor_id, work_date, work_type, rate_snapshot, rate_unit_snapshot, total_weight_kg, total_bags, total_batches, calculated_labour_amount, notes';
      const inRange = (q) => byContractor(q).gte('work_date', fromDate).lte('work_date', toDate);
      let entries; let statusFromDb = true;
      try {
        entries = await fetchAll(() => inRange(supabase.from('v_lh_entries_with_status')
          .select(`${ENTRY_COLS}, entry_source, approval_status, register_revision`))
          .order('work_date', { ascending: false }).order('id'));
      } catch (e) {
        if (!isNotConnectedError(e)) throw e;
        statusFromDb = false;
        const base = await fetchAll(() => inRange(supabase.from('daily_work_entries').select(ENTRY_COLS))
          .order('work_date', { ascending: false }).order('id'));
        let registers = [];
        try {
          registers = await fetchAll(() => inRange(supabase.from('labour_daily_registers').select('contractor_id, work_date, status')).order('work_date'));
        } catch (re) { if (!isNotConnectedError(re)) throw re; }
        entries = attachApprovalStatus(base, registers);
      }

      const [lines, payments, expenses] = await Promise.all([
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

      const expenseIds = expenses.map(e => e.id);
      const deductions = [];
      for (let i = 0; i < expenseIds.length; i += 200) {
        const chunk = expenseIds.slice(i, i + 200);
        const { data: alloc, error } = await supabase.from('service_expense_allocations')
          .select('expense_id, labourer_id, allocated_amount').in('expense_id', chunk);
        if (error) throw error;
        deductions.push(...(alloc || []));
      }

      let approved;
      if (statusFromDb) {
        const [aEntries, aLines] = await Promise.all([
          fetchAll(() => inRange(supabase.from('v_lh_approved_entries').select(ENTRY_COLS)).order('work_date', { ascending: false }).order('id')),
          fetchAll(() => byContractor(supabase.from('v_lh_approved_work_lines')
            .select('allocation_id, work_entry_id, contractor_id, work_date, labourer_id, labourer_name, allocated_amount')
            .gte('work_date', fromDate).lte('work_date', toDate)).order('work_date', { ascending: false }).order('allocation_id')),
        ]);
        approved = { entries: aEntries, lines: aLines };
      } else {
        approved = approvedOnly({ entries, lines });
      }

      setData({
        contractors: contractorsRes.data || [],
        labourers: labourersRes.data || [],
        entries,
        lines,
        payments,
        deductions,
        expenses,
        approved,
        statusFromDb
      });
      setState('ready');
      setRefreshedAt(new Date());
    } catch (e) {
      if (isNotConnectedError(e)) setState('not_connected');
      else if (isPermissionError(e)) setState('no_access');
      else { setErrorText(e?.message || 'Unknown error'); setState('error'); }
    }
  }, [fromDate, toDate, contractorId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') load({ silent: true }); };
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);

  const labourersById = useMemo(() => Object.fromEntries(data.labourers.map(l => [l.id, l])), [data.labourers]);
  const contractorsById = useMemo(() => Object.fromEntries(data.contractors.map(c => [c.id, c])), [data.contractors]);
  const activeContractor = useMemo(() => data.contractors.find(c => c.id === contractorId), [data.contractors, contractorId]);

  // Approved data strictly enforces test invariants
  const approvedData = useMemo(() => data.approved || { entries: [], lines: [] }, [data]);
  const kpi = useMemo(() => summarize({ entries: approvedData.entries, lines: approvedData.lines, payments: data.payments, deductions: data.deductions }), [approvedData, data]);
  const notCounted = useMemo(() => notCountedSummary(data.entries), [data]);
  const rows = useMemo(() => dailyRows({ entries: data.entries, lines: data.lines, contractorsById, labourersById }), [data, contractorsById, labourersById]);
  const balances = useMemo(() => labourerBalances({ lines: approvedData.lines, payments: data.payments, deductions: data.deductions, labourersById }), [approvedData, data, labourersById]);

  // Command Center analytics & reconciliation
  const ccMetrics = useMemo(() => commandCenterMetrics({ entries: data.entries, lines: data.lines, payments: data.payments, deductions: data.deductions }), [data]);
  const reconPanel = useMemo(() => reconciliationPanelData({ entries: data.entries, lines: data.lines, payments: data.payments, deductions: data.deductions }), [data]);
  const groupedDays = useMemo(() => groupedDailyEntries({ entries: data.entries, lines: data.lines, contractorsById, labourersById }), [data, contractorsById, labourersById]);
  const detailedLabourers = useMemo(() => detailedLabourerLedger({ lines: data.lines, payments: data.payments, deductions: data.deductions, entries: data.entries, labourersById }), [data, labourersById]);
  const contractorSummaries = useMemo(() => contractorSettlementSummaries({
    contractors: data.contractors,
    entries: data.entries,
    lines: data.lines,
    payments: data.payments,
    deductions: data.deductions,
    expenses: data.expenses,
  }), [data]);
  const workTypes = useMemo(() => workTypeSummary({ entries: data.entries }), [data.entries]);

  const rangeInvalid = !fromDate || !toDate || fromDate > toDate;

  // Toggle worker split on an entry
  const toggleSplit = (id) => {
    setExpandedSplits(prev => {
      if (prev.has(id)) return new Set([...prev].filter(x => x !== id));
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Filtered daily entries (Search + Status)
  const filteredGroupedDays = useMemo(() => {
    return groupedDays.map(group => {
      let matchedRows = group.rows;

      // Status Filter
      if (statusFilter === 'Approved') matchedRows = matchedRows.filter(r => r.status === 'Approved');
      else if (statusFilter === 'Pending') matchedRows = matchedRows.filter(r => r.status !== 'Approved' && r.status !== 'Rejected');
      else if (statusFilter === 'Rejected') matchedRows = matchedRows.filter(r => r.status === 'Rejected');

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        matchedRows = matchedRows.filter(r =>
          r.workType.toLowerCase().includes(q) ||
          r.contractor.toLowerCase().includes(q) ||
          r.labourers.some(l => l.name.toLowerCase().includes(q))
        );
      }

      if (matchedRows.length === 0) return null;
      return { ...group, rows: matchedRows };
    }).filter(Boolean);
  }, [groupedDays, searchQuery, statusFilter]);

  // Filtered labourers list (Status + Search)
  const filteredLabourers = useMemo(() => {
    let list = detailedLabourers;

    if (statusFilter === 'Paid') list = list.filter(l => l.payableBalance <= 0 && l.approvedEarned > 0);
    else if (statusFilter === 'Unpaid') list = list.filter(l => l.paid === 0 && l.approvedEarned > 0);
    else if (statusFilter === 'Partially Paid') list = list.filter(l => l.paid > 0 && l.payableBalance > 0);
    else if (statusFilter === 'Approved') list = list.filter(l => l.approvedEarned > 0);
    else if (statusFilter === 'Pending') list = list.filter(l => l.pendingEarned > 0);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(l => l.name.toLowerCase().includes(q) || (l.localId && l.localId.toLowerCase().includes(q)));
    }
    return list;
  }, [detailedLabourers, statusFilter, searchQuery]);

  // Filtered contractor settlement summaries
  const filteredContractorSummaries = useMemo(() => {
    let list = contractorSummaries;
    if (contractorId !== 'ALL') {
      list = list.filter(c => c.contractorId === contractorId);
    }
    if (statusFilter === 'Paid') list = list.filter(c => c.status === 'Fully Settled');
    else if (statusFilter === 'Unpaid') list = list.filter(c => c.status === 'Unpaid');
    else if (statusFilter === 'Partially Paid') list = list.filter(c => c.status === 'Partially Paid');
    return list;
  }, [contractorSummaries, contractorId, statusFilter]);

  // Active filters detection
  const hasActiveFilters = activePreset !== 'thisMonth' || contractorId !== 'ALL' || statusFilter !== 'all' || searchQuery.trim() !== '';

  const clearAllFilters = () => {
    applyPreset('thisMonth');
    setContractorId('ALL');
    setStatusFilter('all');
    setSearchQuery('');
  };

  // CSV Exporters
  const downloadCsv = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportDailyCsv = () => {
    const csv = generateDailyRegisterCsv(groupedDays, {
      contractorName: activeContractor?.name || 'All Contractors',
      fromDate,
      toDate,
    });
    downloadCsv(csv, `LabourHisaab_Daily_Register_${fromDate}_to_${toDate}.csv`);
  };

  const handleExportLabourerCsv = () => {
    const csv = generateLabourerBalancesCsv(detailedLabourers, {
      contractorName: activeContractor?.name || 'All Contractors',
      fromDate,
      toDate,
    });
    downloadCsv(csv, `LabourHisaab_Labourer_Balances_${fromDate}_to_${toDate}.csv`);
  };

  // PDF Exporter
  const handleExportPdf = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setTextColor(15, 118, 110);
      doc.text('Shubh Labh — Labour Hisaab Command Center', 14, 16);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Period: ${fromDate} to ${toDate} | Contractor: ${activeContractor?.name || 'All Contractors'} | Generated: ${new Date().toLocaleString('en-IN')}`, 14, 23);

      doc.setDrawColor(203, 213, 225);
      doc.line(14, 26, 196, 26);

      // KPI Summary table
      autoTable(doc, {
        startY: 29,
        head: [['Approved Wages', 'Pending Review', 'Total Recorded', 'Paid', 'Deductions', 'Payable Now']],
        body: [[
          formatInr(reconPanel.approvedWages),
          formatInr(reconPanel.pendingWages),
          formatInr(reconPanel.approvedWages + reconPanel.pendingWages),
          formatInr(reconPanel.paid),
          formatInr(reconPanel.deductions),
          formatInr(reconPanel.balancePayable),
        ]],
        theme: 'grid',
        headStyles: { fillColor: [15, 118, 110], fontSize: 8 },
        bodyStyles: { fontSize: 8, fontStyle: 'bold' },
      });

      const registerRows = [];
      groupedDays.forEach(g => {
        g.rows.forEach(r => {
          registerRows.push([
            r.date,
            r.workType,
            r.quantity,
            r.rate,
            formatInr(r.amount),
            r.status || 'Pending',
            `${(r.labourers || []).length} workers`,
          ]);
        });
      });

      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Daily Work Register', 14, doc.lastAutoTable.finalY + 10);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 13,
        head: [['Date', 'Work Type', 'Quantity', 'Rate', 'Amount', 'Status', 'Workers']],
        body: registerRows.slice(0, 50),
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
      });

      doc.save(`LabourHisaab_Statement_${fromDate}_to_${toDate}.pdf`);
    } catch (e) {
      alert('Could not generate PDF: ' + (e?.message || e));
    }
  };

  // Header markup
  const header = (
    <div className="page-header" style={{ marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <HardHat size={28} color="#0F766E" /> Labour Hisaab Command Center
        </h1>
        <p className="text-secondary" style={{ fontSize: '0.92rem', margin: 0 }}>
          Real-time operations, wage reconciliation & settlement ledger. Totals count CRM-approved work only.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {isAdmin && state === 'ready' ? (
          <button
            className="btn btn-primary"
            onClick={() => setDialog({ mode: 'add' })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
          >
            <Plus size={16} /> Add entry
          </button>
        ) : null}
        <Link
          to="/labour-hisaab/approvals"
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
        >
          <ClipboardCheck size={16} color="#0F766E" /> Daily register approvals
        </Link>
      </div>
    </div>
  );

  if (state === 'not_connected') {
    return (
      <div className="animate-fade-in">
        {header}
        <div className="card" role="status" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: '720px', margin: '2rem auto' }}>
          <PlugZap size={44} className="text-warning" style={{ margin: '0 auto 1rem' }} aria-hidden="true" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
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
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {header}

      {/* PHASE 4: FASTER FILTER CONTROL BAR & PRESETS */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {/* Presets Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.85rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span className="text-secondary" style={{ fontSize: '0.78rem', fontWeight: 700, marginRight: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <CalendarDays size={14} color="#0F766E" /> Date Presets:
            </span>
            <button
              className={`btn ${activePreset === 'today' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => applyPreset('today')}
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem', height: 28 }}
            >
              Today
            </button>
            <button
              className={`btn ${activePreset === 'yesterday' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => applyPreset('yesterday')}
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem', height: 28 }}
            >
              Yesterday
            </button>
            <button
              className={`btn ${activePreset === 'thisWeek' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => applyPreset('thisWeek')}
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem', height: 28 }}
            >
              This week
            </button>
            <button
              className={`btn ${activePreset === 'thisMonth' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => applyPreset('thisMonth')}
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem', height: 28 }}
            >
              This month
            </button>
            <button
              className={`btn ${activePreset === 'lastMonth' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => applyPreset('lastMonth')}
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem', height: 28 }}
            >
              Last month
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => load()}
              disabled={state === 'loading' || rangeInvalid}
              style={{ height: 30, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}
            >
              <RefreshCw size={13} className={state === 'loading' ? 'spin' : ''} /> Refresh
            </button>
            {refreshedAt ? (
              <span className="text-muted" style={{ fontSize: '0.74rem' }}>
                {refreshedAt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST
              </span>
            ) : null}
          </div>
        </div>

        {/* Inputs & Dropdowns Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem', fontWeight: 600 }} className="text-secondary">
            From
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={e => handleCustomDateChange(e.target.value, undefined)}
              style={{ padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem', fontWeight: 600 }} className="text-secondary">
            To
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={e => handleCustomDateChange(undefined, e.target.value)}
              style={{ padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem', minWidth: 190, fontWeight: 600 }} className="text-secondary">
            Contractor (ठेकेदार)
            <select
              value={contractorId}
              onChange={e => setContractorId(e.target.value)}
              style={{ padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)' }}
            >
              <option value="ALL">All contractors (सभी ठेकेदार)</option>
              {data.contractors.map(c => <option key={c.id} value={c.id}>{c.name}{c.is_active ? '' : ' (archived)'}</option>)}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem', minWidth: 160, fontWeight: 600 }} className="text-secondary">
            Status Filter (स्थिति)
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)' }}
            >
              <option value="all">All Statuses (सभी)</option>
              <option value="Approved">Approved only (स्वीकृत)</option>
              <option value="Pending">Pending review (प्रतीक्षित)</option>
              <option value="Rejected">Rejected (अस्वीकृत)</option>
              <option value="Paid">Fully Paid (पूर्ण भुगतान)</option>
              <option value="Partially Paid">Partially Paid (आंशिक भुगतान)</option>
              <option value="Unpaid">Unpaid / Dues (बकाया)</option>
            </select>
          </label>

          {/* Live Search */}
          <div style={{ flex: '1 1 180px', minWidth: 160 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem', fontWeight: 600 }} className="text-secondary">
              Search
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Worker, work type..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem 0.6rem 0.45rem 30px', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
                {searchQuery ? (
                  <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            </label>
          </div>
        </div>

        {/* Removable Active Filter Chips */}
        {hasActiveFilters ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid #F1F5F9' }}>
            <span className="text-muted" style={{ fontSize: '0.74rem', fontWeight: 600 }}>Active filters:</span>

            <span style={{ fontSize: '0.74rem', backgroundColor: '#F0FDFA', color: '#0F766E', border: '1px solid #CCFBF1', padding: '2px 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              📅 {fromDate} to {toDate} {activePreset !== 'custom' ? `(${activePreset})` : ''}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => applyPreset('thisMonth')} />
            </span>

            {contractorId !== 'ALL' ? (
              <span style={{ fontSize: '0.74rem', backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #DBEAFE', padding: '2px 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                🏢 {activeContractor?.name || contractorId}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setContractorId('ALL')} />
              </span>
            ) : null}

            {statusFilter !== 'all' ? (
              <span style={{ fontSize: '0.74rem', backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Status: {statusFilter}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('all')} />
              </span>
            ) : null}

            {searchQuery ? (
              <span style={{ fontSize: '0.74rem', backgroundColor: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                🔍 "{searchQuery}"
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
              </span>
            ) : null}

            <button
              onClick={clearAllFilters}
              style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
            >
              <RotateCcw size={11} /> Clear all
            </button>
          </div>
        ) : null}
      </div>

      {rangeInvalid ? (
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <AlertCircle size={16} className="text-danger" /> Choose a valid date range.
        </div>
      ) : state === 'loading' ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }} role="status">
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.75rem', color: '#0F766E' }} />
          <div>Loading labour records and calculating ledger balances…</div>
        </div>
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
          {/* TOP KPI CARDS */}
          <div style={{ display: 'grid', gap: '0.85rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '1rem' }}>
            <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10B981', background: '#FFFFFF', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="text-secondary" style={{ fontSize: '0.78rem', fontWeight: 600 }}>Approved wages</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#047857', backgroundColor: '#ECFDF5', padding: '2px 6px', borderRadius: 999 }}>Approved only</span>
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0F766E' }}>{formatInr(reconPanel.approvedWages)}</div>
              <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: 4 }}>
                {ccMetrics.approvedCount} approved entries · {ccMetrics.workDays} work days
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #F59E0B', background: '#FFFFFF', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="text-secondary" style={{ fontSize: '0.78rem', fontWeight: 600 }}>Pending approval</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#B45309', backgroundColor: '#FFFBEB', padding: '2px 6px', borderRadius: 999 }}>Review needed</span>
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#B45309' }}>{formatInr(reconPanel.pendingWages)}</div>
              <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: 4 }}>
                {ccMetrics.pendingCount} entries awaiting approval
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #3B82F6', background: '#FFFFFF', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="text-secondary" style={{ fontSize: '0.78rem', fontWeight: 600 }}>Total recorded</span>
                <span style={{ fontSize: '0.68rem', color: '#1D4ED8', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: 999 }}>Gross</span>
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#1E293B' }}>{formatInr(reconPanel.approvedWages + reconPanel.pendingWages)}</div>
              <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: 4 }}>
                Approved + Pending ({ccMetrics.totalRecordedCount} entries)
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #6366F1', background: '#FFFFFF', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="text-secondary" style={{ fontSize: '0.78rem', fontWeight: 600 }}>Paid to labour</span>
                <ClipboardList size={16} color="#6366F1" />
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#4338CA' }}>{formatInr(reconPanel.paid)}</div>
              <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: 4 }}>
                Disbursed payment records
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #94A3B8', background: '#FFFFFF', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="text-secondary" style={{ fontSize: '0.78rem', fontWeight: 600 }}>Allocated deductions</span>
                <Scale size={16} color="#64748B" />
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#475569' }}>{formatInr(reconPanel.deductions)}</div>
              <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: 4 }}>
                Food, transport & recovery
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #0F766E', background: '#F0FDFA', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F766E' }}>Balance payable</span>
                <Wallet size={16} color="#0F766E" />
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F766E' }}>{formatInr(reconPanel.balancePayable)}</div>
              <div style={{ fontSize: '0.72rem', color: '#0F766E', marginTop: 4, fontWeight: 500 }}>
                Approved earned − paid − deductions
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #D97706', background: '#FFFFFF', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="text-secondary" style={{ fontSize: '0.78rem', fontWeight: 600 }}>Labourers</span>
                <Users size={16} color="#D97706" />
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#1E293B' }}>{ccMetrics.labourersWorked} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>workers</span></div>
              <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: 4 }}>
                Avg approved: {formatInr(ccMetrics.avgApprovedPerLabourer)} / worker
              </div>
            </div>
          </div>

          {/* PHASE 2: VISIBLE FINANCIAL RECONCILIATION PANEL */}
          <div className="card" style={{
            padding: '1.15rem 1.25rem',
            marginBottom: '1.25rem',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #CCFBF1',
            boxShadow: '0 2px 4px rgba(15, 118, 110, 0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Scale size={20} color="#0F766E" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F766E', margin: 0 }}>
                  Financial Wage Reconciliation (मजदूरी हिसाब मिलान)
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#047857', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: 999, border: '1px solid #A7F3D0' }}>
                  Approved Only Basis
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#B45309', backgroundColor: '#FFFBEB', padding: '2px 8px', borderRadius: 999, border: '1px solid #FDE68A' }}>
                  Pending Excluded
                </span>
              </div>
            </div>

            {/* Reconciliation Equation Visual Chain */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.85rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}>
              <div style={{ flex: '1 1 140px', padding: '0.5rem 0.75rem', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Approved Earned Wages</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F766E', marginTop: 2 }}>{formatInr(reconPanel.approvedEarned)}</div>
              </div>

              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#94A3B8' }}>−</span>

              <div style={{ flex: '1 1 140px', padding: '0.5rem 0.75rem', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Paid Disbursements</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4338CA', marginTop: 2 }}>{formatInr(reconPanel.paid)}</div>
              </div>

              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#94A3B8' }}>−</span>

              <div style={{ flex: '1 1 140px', padding: '0.5rem 0.75rem', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Allocated Deductions</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#475569', marginTop: 2 }}>{formatInr(reconPanel.deductions)}</div>
              </div>

              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#94A3B8' }}>=</span>

              <div style={{ flex: '1 1 150px', padding: '0.5rem 0.75rem', backgroundColor: reconPanel.balancePayable > 0 ? '#ECFDF5' : '#F8FAFC', borderRadius: '6px', border: `1.5px solid ${reconPanel.balancePayable > 0 ? '#10B981' : '#E2E8F0'}` }}>
                <div style={{ fontSize: '0.72rem', color: reconPanel.balancePayable > 0 ? '#047857' : '#64748B', fontWeight: 700 }}>
                  {reconPanel.balancePayable > 0 ? 'Balance Payable Now' : reconPanel.balancePayable === 0 ? 'Fully Cleared' : 'Advance Balance'}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: reconPanel.balancePayable > 0 ? '#0F766E' : reconPanel.balancePayable < 0 ? '#DC2626' : '#1E293B', marginTop: 2 }}>
                  {formatInr(reconPanel.balancePayable)}
                </div>
              </div>
            </div>

            {/* Reconciliation Note & Fulfillment Progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem', fontSize: '0.78rem' }}>
              <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={14} color="#0F766E" />
                <span>
                  Formula: <strong>Approved wages ({formatInr(reconPanel.approvedEarned)}) − Paid ({formatInr(reconPanel.paid)}) − Deductions ({formatInr(reconPanel.deductions)}) = Balance payable ({formatInr(reconPanel.balancePayable)})</strong>.
                  {reconPanel.pendingWages > 0 ? ` Note: ${formatInr(reconPanel.pendingWages)} pending review is kept separate and cannot be paid.` : ''}
                </span>
              </div>

              {reconPanel.approvedEarned > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, color: '#475569' }}>Disbursement Progress:</span>
                  <div style={{ width: 90, height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${reconPanel.fulfillmentPct}%`, height: '100%', backgroundColor: reconPanel.fulfillmentPct >= 100 ? '#10B981' : '#3B82F6' }} />
                  </div>
                  <span style={{ fontWeight: 700, color: '#1E293B' }}>{reconPanel.fulfillmentPct}%</span>
                </div>
              ) : null}
            </div>
          </div>

          {notice ? (
            <div className="card" role="status" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} /> {notice}
            </div>
          ) : null}

          {/* MAIN TASK NAVIGATION TABS */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: '1.25rem', gap: '0.5rem', overflowX: 'auto' }}>
            <button
              onClick={() => setActiveTab('register')}
              style={{
                padding: '0.65rem 1.15rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'register' ? 700 : 500,
                color: activeTab === 'register' ? '#0F766E' : 'var(--text-secondary)',
                borderBottom: activeTab === 'register' ? '3px solid #0F766E' : '3px solid transparent',
                marginBottom: -2,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.9rem',
                whiteSpace: 'nowrap'
              }}
            >
              <CalendarDays size={16} /> Daily Register (दैनिक कार्य)
              <span style={{ fontSize: '0.72rem', backgroundColor: activeTab === 'register' ? '#CCFBF1' : '#F1F5F9', color: activeTab === 'register' ? '#0F766E' : '#64748B', padding: '1px 6px', borderRadius: 999 }}>
                {data.entries.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('labourers')}
              style={{
                padding: '0.65rem 1.15rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'labourers' ? 700 : 500,
                color: activeTab === 'labourers' ? '#0F766E' : 'var(--text-secondary)',
                borderBottom: activeTab === 'labourers' ? '3px solid #0F766E' : '3px solid transparent',
                marginBottom: -2,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.9rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Users size={16} /> Labourer Hisaab (मजदूर हिसाब)
              <span style={{ fontSize: '0.72rem', backgroundColor: activeTab === 'labourers' ? '#CCFBF1' : '#F1F5F9', color: activeTab === 'labourers' ? '#0F766E' : '#64748B', padding: '1px 6px', borderRadius: 999 }}>
                {detailedLabourers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('contractors')}
              style={{
                padding: '0.65rem 1.15rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'contractors' ? 700 : 500,
                color: activeTab === 'contractors' ? '#0F766E' : 'var(--text-secondary)',
                borderBottom: activeTab === 'contractors' ? '3px solid #0F766E' : '3px solid transparent',
                marginBottom: -2,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.9rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Building2 size={16} /> Contractor Settlements (ठेकेदार निपटान)
              <span style={{ fontSize: '0.72rem', backgroundColor: activeTab === 'contractors' ? '#CCFBF1' : '#F1F5F9', color: activeTab === 'contractors' ? '#0F766E' : '#64748B', padding: '1px 6px', borderRadius: 999 }}>
                {contractorSummaries.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              style={{
                padding: '0.65rem 1.15rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'approvals' ? 700 : 500,
                color: activeTab === 'approvals' ? '#0F766E' : 'var(--text-secondary)',
                borderBottom: activeTab === 'approvals' ? '3px solid #0F766E' : '3px solid transparent',
                marginBottom: -2,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.9rem',
                whiteSpace: 'nowrap'
              }}
            >
              <ClipboardCheck size={16} /> Approvals Overview (अनुमोदन)
              {ccMetrics.pendingCount > 0 ? (
                <span style={{ fontSize: '0.72rem', backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 700, padding: '1px 6px', borderRadius: 999 }}>
                  {ccMetrics.pendingCount} pending
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              style={{
                padding: '0.65rem 1.15rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'reports' ? 700 : 500,
                color: activeTab === 'reports' ? '#0F766E' : 'var(--text-secondary)',
                borderBottom: activeTab === 'reports' ? '3px solid #0F766E' : '3px solid transparent',
                marginBottom: -2,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.9rem',
                whiteSpace: 'nowrap'
              }}
            >
              <FileSpreadsheet size={16} /> Reports & Export (रिपोर्ट्स)
            </button>
          </div>

          {/* TAB 1: DAILY REGISTER */}
          {activeTab === 'register' ? (
            <div>
              {rows.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }} role="status">
                  <CalendarDays size={36} color="#94A3B8" style={{ margin: '0 auto 0.75rem' }} />
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    No labour work recorded for this period yet.
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                    Try choosing a different date range or select "All contractors".
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {filteredGroupedDays.map(group => (
                    <div key={group.date} className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: '10px' }}>
                      {/* Date Group Header */}
                      <div style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: '#F8FAFC',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <CalendarDays size={18} color="#0F766E" />
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1E293B' }}>{group.date}</span>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 999,
                            backgroundColor: group.dayStatus === 'Approved' ? '#ECFDF5' : group.dayStatus === 'Rejected' ? '#FEE2E2' : '#FFFBEB',
                            color: group.dayStatus === 'Approved' ? '#047857' : group.dayStatus === 'Rejected' ? '#B91C1C' : '#B45309',
                            border: `1px solid ${group.dayStatus === 'Approved' ? '#A7F3D0' : group.dayStatus === 'Rejected' ? '#FECACA' : '#FDE68A'}`
                          }}>
                            {group.dayStatus}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.82rem', flexWrap: 'wrap' }}>
                          <span className="text-secondary">{group.entryCount} entries</span>
                          <span className="text-secondary">{group.labourerCount} labourers</span>
                          {group.totalWeightKg > 0 ? (
                            <span className="text-muted">{group.totalWeightKg.toLocaleString('en-IN')} kg</span>
                          ) : null}
                          <span style={{ fontWeight: 700, color: '#0F766E' }}>Approved: {formatInr(group.totalApprovedAmount)}</span>
                          {group.totalPendingAmount > 0 ? (
                            <span style={{ fontWeight: 600, color: '#B45309' }}>Pending: {formatInr(group.totalPendingAmount)}</span>
                          ) : null}
                          <span style={{ fontWeight: 700, color: '#1E293B', backgroundColor: '#E2E8F0', padding: '2px 8px', borderRadius: 4 }}>
                            Total: {formatInr(group.totalAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Entries Table */}
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={th}>Work Type</th>
                              <th style={th}>Quantity</th>
                              <th style={th}>Rate</th>
                              <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                              <th style={th}>Labourers</th>
                              {contractorId === 'ALL' ? <th style={th}>Contractor</th> : null}
                              <th style={th}>Approval Status</th>
                              {isAdmin ? <th style={th}>Actions</th> : null}
                            </tr>
                          </thead>
                          <tbody>
                            {group.rows.map(r => {
                              const isSplitOpen = expandedSplits.has(r.id);
                              return (
                                <React.Fragment key={r.id}>
                                  <tr style={{ backgroundColor: isSplitOpen ? '#F0FDFA' : 'transparent' }}>
                                    <td style={td}>
                                      <div style={{ fontWeight: 600, color: '#1E293B' }}>{r.workType}</div>
                                      {r.source === 'crm_admin' ? <span style={{ fontSize: '0.7rem', color: '#6366F1' }}>Added in CRM</span> : null}
                                    </td>
                                    <td style={td}>{r.quantity}</td>
                                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.rate}</td>
                                    <td style={tdNum}>
                                      <span style={{ fontWeight: 700, color: r.status === 'Approved' ? '#0F766E' : '#B45309' }}>
                                        {formatInr(r.amount)}
                                      </span>
                                    </td>
                                    <td style={td}>
                                      <button
                                        onClick={() => toggleSplit(r.id)}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          padding: '3px 8px',
                                          borderRadius: '6px',
                                          border: '1px solid var(--border)',
                                          background: isSplitOpen ? '#0F766E' : '#F1F5F9',
                                          color: isSplitOpen ? '#FFFFFF' : '#334155',
                                          cursor: 'pointer',
                                          fontSize: '0.78rem',
                                          fontWeight: 600,
                                        }}
                                        title="Click to view worker share breakdown"
                                      >
                                        <Users size={13} />
                                        {(r.labourers || []).length} labourers
                                        {isSplitOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                      </button>
                                    </td>
                                    {contractorId === 'ALL' ? <td style={td}>{r.contractor}</td> : null}
                                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                                      <span style={{
                                        fontWeight: 600,
                                        fontSize: '0.76rem',
                                        color: r.status === 'Approved' ? '#047857' : r.status === 'Rejected' ? '#B91C1C' : '#B45309',
                                        backgroundColor: r.status === 'Approved' ? '#ECFDF5' : r.status === 'Rejected' ? '#FEE2E2' : '#FFFBEB',
                                        padding: '2px 8px',
                                        borderRadius: 999,
                                      }}>
                                        {r.status || 'Pending'}
                                      </span>
                                      {r.status !== 'Approved' ? (
                                        <div className="text-muted" style={{ fontSize: '0.7rem', marginTop: 2 }}>Not in payable totals</div>
                                      ) : null}
                                    </td>
                                    {isAdmin ? (
                                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                          <button
                                            className="btn btn-secondary"
                                            style={{ padding: '0.25rem 0.5rem' }}
                                            onClick={() => setDialog({ mode: 'edit', entry: r.entry })}
                                            aria-label={`Edit entry ${r.date}`}
                                            title="Edit work entry"
                                          >
                                            <Pencil size={13} />
                                          </button>
                                          <button
                                            className="btn btn-secondary"
                                            style={{ padding: '0.25rem 0.5rem', color: '#DC2626' }}
                                            onClick={() => setDialog({ mode: 'delete', entry: r.entry })}
                                            aria-label={`Delete entry ${r.date}`}
                                            title="Delete work entry"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </td>
                                    ) : null}
                                  </tr>

                                  {/* Expandable Labourer Split Panel */}
                                  {isSplitOpen ? (
                                    <tr>
                                      <td colSpan={contractorId === 'ALL' ? (isAdmin ? 8 : 7) : (isAdmin ? 7 : 6)} style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1.25rem', borderBottom: '2px solid #CCFBF1' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F766E', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <Users size={14} /> Labourer Allocation Breakdown (Penny-Perfect Share):
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
                                          {(r.labourers || []).map((l, i) => (
                                            <div key={i} style={{ padding: '0.4rem 0.65rem', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                              <span style={{ fontWeight: 500, color: '#334155' }}>{l.name}</span>
                                              <span style={{ fontWeight: 700, color: '#0F766E' }}>{formatInr(l.amount)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  ) : null}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* TAB 2: LABOURER HISAAB (Worker Ledgers & Drill-down) */}
          {activeTab === 'labourers' ? (
            <div>
              {/* Filter controls */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setStatusFilter('all')}
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    All ({detailedLabourers.length})
                  </button>
                  <button
                    className={`btn ${statusFilter === 'Unpaid' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setStatusFilter('Unpaid')}
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    Unpaid Dues ({detailedLabourers.filter(l => l.paid === 0 && l.approvedEarned > 0).length})
                  </button>
                  <button
                    className={`btn ${statusFilter === 'Partially Paid' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setStatusFilter('Partially Paid')}
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    Partially Paid ({detailedLabourers.filter(l => l.paid > 0 && l.payableBalance > 0).length})
                  </button>
                  <button
                    className={`btn ${statusFilter === 'Paid' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setStatusFilter('Paid')}
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    Fully Cleared ({detailedLabourers.filter(l => l.payableBalance <= 0 && l.approvedEarned > 0).length})
                  </button>
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={handleExportLabourerCsv}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              {filteredLabourers.length === 0 ? (
                <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                  <Users size={32} color="#94A3B8" style={{ margin: '0 auto 0.5rem' }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No labourers match this filter.</div>
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflowX: 'auto', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>Labourer</th>
                        <th style={{ ...th, textAlign: 'right' }}>Days</th>
                        <th style={{ ...th, textAlign: 'right' }}>Approved Earned</th>
                        <th style={{ ...th, textAlign: 'right' }}>Pending Earned</th>
                        <th style={{ ...th, textAlign: 'right' }}>Total Earned</th>
                        <th style={{ ...th, textAlign: 'right' }}>Paid</th>
                        <th style={{ ...th, textAlign: 'right' }}>Deductions</th>
                        <th style={{ ...th, textAlign: 'right' }}>Payable Balance</th>
                        <th style={{ ...th, textAlign: 'center' }}>Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLabourers.map(l => (
                        <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLabourer(l)}>
                          <td style={td}>
                            <div style={{ fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{l.name}</span>
                              {l.localId ? (
                                <span style={{ fontSize: '0.7rem', color: '#64748B', backgroundColor: '#F1F5F9', padding: '1px 5px', borderRadius: 4 }}>
                                  {l.localId}
                                </span>
                              ) : null}
                              {!l.active ? (
                                <span style={{ fontSize: '0.68rem', color: '#DC2626', backgroundColor: '#FEE2E2', padding: '1px 4px', borderRadius: 4 }}>
                                  inactive
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td style={tdNum}>{l.approvedDays}</td>
                          <td style={{ ...tdNum, color: '#0F766E', fontWeight: 600 }}>{formatInr(l.approvedEarned)}</td>
                          <td style={{ ...tdNum, color: '#B45309' }}>
                            {l.pendingEarned > 0 ? formatInr(l.pendingEarned) : '—'}
                          </td>
                          <td style={{ ...tdNum, color: '#1E293B' }}>{formatInr(l.totalEarned)}</td>
                          <td style={{ ...tdNum, color: '#4338CA' }}>{formatInr(l.paid)}</td>
                          <td style={{ ...tdNum, color: '#475569' }}>{formatInr(l.deducted)}</td>
                          <td style={{ ...tdNum, fontWeight: 700 }}>
                            <span style={{
                              color: l.payableBalance > 0 ? '#0F766E' : l.payableBalance < 0 ? '#DC2626' : '#64748B',
                              backgroundColor: l.payableBalance > 0 ? '#ECFDF5' : l.payableBalance < 0 ? '#FEE2E2' : '#F1F5F9',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}>
                              {formatInr(l.payableBalance)}
                            </span>
                          </td>
                          <td style={{ ...td, textAlign: 'center' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={(e) => { e.stopPropagation(); setSelectedLabourer(l); }}
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <Eye size={12} /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {/* PHASE 3: CONTRACTOR SETTLEMENT SUMMARIES TAB */}
          {activeTab === 'contractors' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="card" style={{ padding: '1.25rem', backgroundColor: '#FFFFFF', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Building2 size={20} color="#0F766E" /> Contractor Settlement Accounts ({filteredContractorSummaries.length})
                    </h2>
                    <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '4px 0 0' }}>
                      Reconciled balance payable per contractor. All figures derive from verified approved work, payments, and deductions.
                    </p>
                  </div>
                </div>
              </div>

              {filteredContractorSummaries.length === 0 ? (
                <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                  <Building2 size={32} color="#94A3B8" style={{ margin: '0 auto 0.5rem' }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No contractors match this filter.</div>
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflowX: 'auto', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>Contractor</th>
                        <th style={{ ...th, textAlign: 'right' }}>Approved Wages</th>
                        <th style={{ ...th, textAlign: 'right' }}>Pending Wages</th>
                        <th style={{ ...th, textAlign: 'right' }}>Paid Amount</th>
                        <th style={{ ...th, textAlign: 'right' }}>Deductions</th>
                        <th style={{ ...th, textAlign: 'right' }}>Balance Payable</th>
                        <th style={th}>Last Payment Date</th>
                        <th style={th}>Settlement Status</th>
                        <th style={{ ...th, textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContractorSummaries.map(c => (
                        <tr key={c.contractorId}>
                          <td style={td}>
                            <div style={{ fontWeight: 700, color: '#1E293B' }}>{c.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              {c.entryCount} entries · {c.paymentCount} payments
                            </div>
                          </td>
                          <td style={{ ...tdNum, color: '#0F766E', fontWeight: 600 }}>{formatInr(c.approvedWages)}</td>
                          <td style={{ ...tdNum, color: '#B45309' }}>{c.pendingWages > 0 ? formatInr(c.pendingWages) : '—'}</td>
                          <td style={{ ...tdNum, color: '#4338CA', fontWeight: 600 }}>{formatInr(c.paid)}</td>
                          <td style={{ ...tdNum, color: '#475569' }}>{formatInr(c.deductions)}</td>
                          <td style={{ ...tdNum, fontWeight: 800 }}>
                            <span style={{
                              color: c.balancePayable > 0 ? '#0F766E' : c.balancePayable < 0 ? '#DC2626' : '#64748B',
                              backgroundColor: c.balancePayable > 0 ? '#ECFDF5' : c.balancePayable < 0 ? '#FEE2E2' : '#F1F5F9',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}>
                              {formatInr(c.balancePayable)}
                            </span>
                          </td>
                          <td style={{ ...td, whiteSpace: 'nowrap' }}>
                            {c.lastPaymentDate ? (
                              <span style={{ fontWeight: 600, color: '#334155' }}>{c.lastPaymentDate}</span>
                            ) : (
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>No payments</span>
                            )}
                          </td>
                          <td style={td}>
                            <span style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 999,
                              backgroundColor: c.status === 'Fully Settled' ? '#ECFDF5' : c.status === 'Partially Paid' ? '#EFF6FF' : c.status === 'Unpaid' ? '#FEF3C7' : '#F1F5F9',
                              color: c.status === 'Fully Settled' ? '#047857' : c.status === 'Partially Paid' ? '#1D4ED8' : c.status === 'Unpaid' ? '#B45309' : '#64748B',
                              border: `1px solid ${c.status === 'Fully Settled' ? '#A7F3D0' : c.status === 'Partially Paid' ? '#BFDBFE' : c.status === 'Unpaid' ? '#FDE68A' : '#CBD5E1'}`,
                            }}>
                              {c.status}
                            </span>
                          </td>
                          <td style={{ ...td, textAlign: 'center' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => { setContractorId(c.contractorId); setActiveTab('register'); }}
                              style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                            >
                              Filter records
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {/* TAB 4: APPROVALS OVERVIEW */}
          {activeTab === 'approvals' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="card" style={{ padding: '1.25rem', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      Register Approval Management
                    </h2>
                    <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '4px 0 0' }}>
                      Daily registers must be approved by CRM administrators before amounts become payable.
                    </p>
                  </div>

                  <Link
                    to="/labour-hisaab/approvals"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                  >
                    Open Full Approval Center <ArrowRight size={16} />
                  </Link>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#B45309' }}>Awaiting Approval</span>
                      <Clock size={18} color="#B45309" />
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#92400E', marginTop: 6 }}>
                      {formatInr(reconPanel.pendingWages)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: 2 }}>
                      {ccMetrics.pendingCount} work entries in current filter
                    </div>
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: '#ECFDF5', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#047857' }}>Approved</span>
                      <CheckCircle2 size={18} color="#047857" />
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#065F46', marginTop: 6 }}>
                      {formatInr(reconPanel.approvedWages)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: 2 }}>
                      {ccMetrics.approvedCount} entries across {ccMetrics.workDays} days
                    </div>
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: '#FEE2E2', borderRadius: '8px', border: '1px solid #FECACA' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#B91C1C' }}>Rejected</span>
                      <AlertTriangle size={18} color="#B91C1C" />
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#991B1B', marginTop: 6 }}>
                      {formatInr(reconPanel.rejectedWages)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#B91C1C', marginTop: 2 }}>
                      {ccMetrics.rejectedCount} entries rejected
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Breakdown Table */}
              <div className="card" style={{ padding: 0, overflowX: 'auto', borderRadius: '10px' }}>
                <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 600, color: '#1E293B' }}>
                  Register Dates & Status Breakdown ({groupedDays.length} days)
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Work Date</th>
                      <th style={th}>Entries</th>
                      <th style={th}>Labourers</th>
                      <th style={{ ...th, textAlign: 'right' }}>Approved Amount</th>
                      <th style={{ ...th, textAlign: 'right' }}>Pending Amount</th>
                      <th style={{ ...th, textAlign: 'right' }}>Total Amount</th>
                      <th style={th}>Current Status</th>
                      <th style={{ ...th, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedDays.map(g => (
                      <tr key={g.date}>
                        <td style={{ ...td, fontWeight: 600 }}>{g.date}</td>
                        <td style={td}>{g.entryCount}</td>
                        <td style={td}>{g.labourerCount}</td>
                        <td style={{ ...tdNum, color: '#0F766E', fontWeight: 600 }}>{formatInr(g.totalApprovedAmount)}</td>
                        <td style={{ ...tdNum, color: '#B45309' }}>{formatInr(g.totalPendingAmount)}</td>
                        <td style={{ ...tdNum, fontWeight: 700 }}>{formatInr(g.totalAmount)}</td>
                        <td style={td}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            color: g.dayStatus === 'Approved' ? '#047857' : g.dayStatus === 'Rejected' ? '#B91C1C' : '#B45309',
                            backgroundColor: g.dayStatus === 'Approved' ? '#ECFDF5' : g.dayStatus === 'Rejected' ? '#FEE2E2' : '#FFFBEB',
                            padding: '2px 8px',
                            borderRadius: 999,
                          }}>
                            {g.dayStatus}
                          </span>
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <Link
                            to="/labour-hisaab/approvals"
                            className="btn btn-secondary"
                            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* TAB 5: REPORTS & EXPORT */}
          {activeTab === 'reports' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Export Action Card */}
              <div className="card" style={{ padding: '1.25rem', backgroundColor: '#FFFFFF', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      Export Center
                    </h2>
                    <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '4px 0 0' }}>
                      Download filtered statements and accounting data in CSV and print-ready PDF formats.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={handleExportDailyCsv}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
                    >
                      <FileSpreadsheet size={16} color="#0F766E" /> Daily Register CSV
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleExportLabourerCsv}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
                    >
                      <FileSpreadsheet size={16} color="#0F766E" /> Labourer Balances CSV
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleExportPdf}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                    >
                      <Download size={16} /> Export Statement PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Work Type Breakdown */}
              <div className="card" style={{ padding: 0, overflowX: 'auto', borderRadius: '10px' }}>
                <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Layers size={16} color="#0F766E" /> Work Type Operational Analysis ({workTypes.length} categories)
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Work Category</th>
                      <th style={{ ...th, textAlign: 'right' }}>Entries</th>
                      <th style={{ ...th, textAlign: 'right' }}>Total Weight</th>
                      <th style={{ ...th, textAlign: 'right' }}>Total Bags</th>
                      <th style={{ ...th, textAlign: 'right' }}>Approved Amount</th>
                      <th style={{ ...th, textAlign: 'right' }}>Pending Amount</th>
                      <th style={{ ...th, textAlign: 'right' }}>Total Wage</th>
                      <th style={{ ...th, textAlign: 'right' }}>Share %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workTypes.map(w => {
                      const share = (reconPanel.approvedWages + reconPanel.pendingWages) > 0
                        ? Math.round((w.totalAmount / (reconPanel.approvedWages + reconPanel.pendingWages)) * 100)
                        : 0;
                      return (
                        <tr key={w.workType}>
                          <td style={{ ...td, fontWeight: 600 }}>{w.label}</td>
                          <td style={tdNum}>{w.count}</td>
                          <td style={tdNum}>{w.totalWeightKg > 0 ? `${w.totalWeightKg.toLocaleString('en-IN')} kg` : '—'}</td>
                          <td style={tdNum}>{w.totalBags > 0 ? `${w.totalBags.toLocaleString('en-IN')} bags` : '—'}</td>
                          <td style={{ ...tdNum, color: '#0F766E', fontWeight: 600 }}>{formatInr(w.approvedAmount)}</td>
                          <td style={{ ...tdNum, color: '#B45309' }}>{w.pendingAmount > 0 ? formatInr(w.pendingAmount) : '—'}</td>
                          <td style={{ ...tdNum, fontWeight: 700 }}>{formatInr(w.totalAmount)}</td>
                          <td style={tdNum}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                              <div style={{ width: 50, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${share}%`, height: '100%', backgroundColor: '#0F766E' }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{share}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Payment Register Table */}
              <div className="card" style={{ padding: 0, overflowX: 'auto', borderRadius: '10px' }}>
                <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ClipboardList size={16} color="#4338CA" /> Payment Disbursement Register ({data.payments.length} records)
                </div>
                {data.payments.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                    No payments recorded in this period.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>Payment Date</th>
                        <th style={th}>Labourer</th>
                        <th style={th}>Payment Method</th>
                        <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.map(p => {
                        const lab = labourersById[p.labourer_id] || {};
                        return (
                          <tr key={p.id}>
                            <td style={td}>{p.payment_date}</td>
                            <td style={{ ...td, fontWeight: 600 }}>{lab.name || p.labourer_id}</td>
                            <td style={td}>{p.payment_method || 'Cash'}</td>
                            <td style={{ ...tdNum, fontWeight: 700, color: '#4338CA' }}>{formatInr(p.amount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* LABOURER DETAIL STATEMENT MODAL */}
      {selectedLabourer ? (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  backgroundColor: '#0F766E',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                }}>
                  {selectedLabourer.name.slice(0, 1)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1E293B' }}>
                    {selectedLabourer.name}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {selectedLabourer.localId ? `ID: ${selectedLabourer.localId} · ` : ''}
                    {selectedLabourer.active ? 'Active Worker' : 'Inactive'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedLabourer(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} color="#64748B" />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.25rem', overflowY: 'auto' }}>
              {/* Financial Snapshot */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.65rem', backgroundColor: '#F0FDFA', borderRadius: '6px', border: '1px solid #CCFBF1' }}>
                  <div className="text-secondary" style={{ fontSize: '0.72rem' }}>Approved Earned</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F766E' }}>{formatInr(selectedLabourer.approvedEarned)}</div>
                </div>
                <div style={{ padding: '0.65rem', backgroundColor: '#FFFBEB', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                  <div className="text-secondary" style={{ fontSize: '0.72rem' }}>Pending Earned</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#B45309' }}>{formatInr(selectedLabourer.pendingEarned)}</div>
                </div>
                <div style={{ padding: '0.65rem', backgroundColor: '#EEF2FF', borderRadius: '6px', border: '1px solid #E0E7FF' }}>
                  <div className="text-secondary" style={{ fontSize: '0.72rem' }}>Paid</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#4338CA' }}>{formatInr(selectedLabourer.paid)}</div>
                </div>
                <div style={{ padding: '0.65rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div className="text-secondary" style={{ fontSize: '0.72rem' }}>Deductions</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#475569' }}>{formatInr(selectedLabourer.deducted)}</div>
                </div>
                <div style={{ padding: '0.65rem', backgroundColor: selectedLabourer.payableBalance > 0 ? '#ECFDF5' : '#FEF2F2', borderRadius: '6px', border: `1px solid ${selectedLabourer.payableBalance > 0 ? '#A7F3D0' : '#FECACA'}` }}>
                  <div className="text-secondary" style={{ fontSize: '0.72rem' }}>Payable Balance</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: selectedLabourer.payableBalance > 0 ? '#047857' : '#DC2626' }}>
                    {formatInr(selectedLabourer.payableBalance)}
                  </div>
                </div>
              </div>

              {/* Work history */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.5rem' }}>
                  Work Entries ({selectedLabourer.workHistory.length})
                </h4>
                {selectedLabourer.workHistory.length === 0 ? (
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>No work entries recorded.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th style={th}>Date</th>
                        <th style={th}>Work Type</th>
                        <th style={th}>Rate</th>
                        <th style={{ ...th, textAlign: 'right' }}>Share Amount</th>
                        <th style={th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLabourer.workHistory.map((w, idx) => (
                        <tr key={idx}>
                          <td style={td}>{w.date}</td>
                          <td style={td}>{w.workType}</td>
                          <td style={td}>{w.rate}</td>
                          <td style={{ ...tdNum, fontWeight: 600, color: '#0F766E' }}>{formatInr(w.allocatedAmount)}</td>
                          <td style={td}>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: w.status === 'Approved' ? '#047857' : '#B45309',
                              backgroundColor: w.status === 'Approved' ? '#ECFDF5' : '#FFFBEB',
                              padding: '1px 6px',
                              borderRadius: 4,
                            }}>
                              {w.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Payments & Deductions split */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.5rem' }}>
                    Payments ({selectedLabourer.paymentHistory.length})
                  </h4>
                  {selectedLabourer.paymentHistory.length === 0 ? (
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>No payments recorded.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th style={th}>Date</th>
                          <th style={th}>Method</th>
                          <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLabourer.paymentHistory.map((p, idx) => (
                          <tr key={idx}>
                            <td style={td}>{p.date}</td>
                            <td style={td}>{p.method}</td>
                            <td style={{ ...tdNum, fontWeight: 600, color: '#4338CA' }}>{formatInr(p.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.5rem' }}>
                    Deductions ({selectedLabourer.deductionHistory.length})
                  </h4>
                  {selectedLabourer.deductionHistory.length === 0 ? (
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>No deductions recorded.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th style={th}>Expense ID</th>
                          <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLabourer.deductionHistory.map((d, idx) => (
                          <tr key={idx}>
                            <td style={{ ...td, fontSize: '0.72rem' }}>{d.expenseId}</td>
                            <td style={{ ...tdNum, fontWeight: 600, color: '#475569' }}>{formatInr(d.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#F8FAFC',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button className="btn btn-secondary" onClick={() => setSelectedLabourer(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ADMIN ADD/EDIT/DELETE DIALOG */}
      {dialog && isAdmin ? (
        <LabourEntryAdminDialog
          mode={dialog.mode}
          entry={dialog.entry || null}
          lines={dialog.entry ? data.lines.filter(l => l.work_entry_id === dialog.entry.id) : []}
          contractors={data.contractors.filter(c => c.is_active)}
          labourers={data.labourers}
          defaultContractorId={contractorId === 'ALL' ? '' : contractorId}
          today={today}
          onClose={() => setDialog(null)}
          onDone={(message) => { setDialog(null); setNotice(message); load({ silent: true }); }}
        />
      ) : null}
    </div>
  );
}
