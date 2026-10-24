import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import DataTable from '../components/DataTable';
import {
  CalendarCheck, UserCheck, UserX, Clock, ListChecks, RefreshCw, AlertCircle, MapPin, X, ExternalLink,
} from 'lucide-react';
import {
  ATTENDANCE_COLUMNS,
  MAX_ROWS,
  STATUS_META,
  LOCATION_RPC,
  LOCATION_MAX_RANGE_DAYS,
  istDate,
  isValidYmd,
  buildRows,
  filterRows,
  computeTodaySummary,
  classifyError,
  classifyLocationError,
  locationRangeAllowed,
  buildLocationEvent,
  indexLocationsByAttendance,
} from '../lib/attendanceRegister';

/**
 * SL-CRM-ATTENDANCE-PORTAL-01: read-only Attendance Register.
 * Data: staff_attendance (written by Field Assist), app_users for names,
 * staff_leave_requests for approved leave. All reads run under the signed-in
 * user's RLS; this page never writes.
 */

const inputStyle = {
  width: '100%', height: '38px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
  background: 'var(--bg-base)', padding: '0 0.75rem', fontSize: '0.85rem', color: 'var(--text-primary)',
};
const labelStyle = { fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', fontWeight: 500 };

const KpiCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
  <div style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', minWidth: '160px', flex: 1 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</span>
      <Icon size={16} className={`text-${colorClass}`} />
    </div>
    <div style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
    {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{subtitle}</div>}
  </div>
);

export default function AttendanceRegister() {
  const today = istDate();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [employeeId, setEmployeeId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState([]);
  const [periodCount, setPeriodCount] = useState(null);
  const [summary, setSummary] = useState(null);
  const [leaveAvailable, setLeaveAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  // Location details come only from the admin RPC (server checks is_admin and the 92-day window).
  const [locationsById, setLocationsById] = useState({});
  const [locationError, setLocationError] = useState(null);
  const [detailRow, setDetailRow] = useState(null);

  const rangeInvalid = !isValidYmd(fromDate) || !isValidYmd(toDate) || fromDate > toDate;

  const fetchData = useCallback(async () => {
    if (rangeInvalid) return;
    setLoading(true);
    setError(null);
    setSummaryError(null);
    const todayYmd = istDate();
    try {
      // Period records (date + employee filters applied server-side).
      let periodQuery = supabase
        .from('staff_attendance')
        .select(ATTENDANCE_COLUMNS, { count: 'exact' })
        .gte('business_date', fromDate)
        .lte('business_date', toDate)
        .order('business_date', { ascending: false })
        .order('check_in_at', { ascending: false })
        .limit(MAX_ROWS);
      if (employeeId !== 'ALL') periodQuery = periodQuery.eq('staff_id', employeeId);

      const locationAllowed = locationRangeAllowed(fromDate, toDate);
      const locationQuery = locationAllowed
        ? supabase.rpc(LOCATION_RPC, { p_from: fromDate, p_to: toDate, p_staff: employeeId === 'ALL' ? null : employeeId })
        : Promise.resolve({ data: null, error: null });

      const [usersRes, periodRes, todayRes, leaveRes, locationRes] = await Promise.all([
        supabase.from('app_users').select('id, display_name, email, role, is_active'),
        periodQuery,
        supabase.from('staff_attendance').select(ATTENDANCE_COLUMNS).eq('business_date', todayYmd),
        supabase
          .from('staff_leave_requests')
          .select('staff_id')
          .eq('status', 'Approved')
          .lte('start_date', todayYmd)
          .gte('end_date', todayYmd),
        locationQuery,
      ]);

      if (!locationAllowed) {
        setLocationsById({});
        setLocationError({ kind: 'RANGE', message: `Location details are shown for date ranges of up to ${LOCATION_MAX_RANGE_DAYS + 1} days. Narrow the range to see them.` });
      } else if (locationRes.error) {
        setLocationsById({});
        setLocationError(classifyLocationError(locationRes.error));
      } else {
        setLocationsById(indexLocationsByAttendance(locationRes.data));
        setLocationError(null);
      }

      if (periodRes.error) {
        setError(classifyError(periodRes.error));
        setRecords([]);
        setPeriodCount(null);
      } else {
        setRecords(periodRes.data || []);
        setPeriodCount(typeof periodRes.count === 'number' ? periodRes.count : (periodRes.data || []).length);
      }

      const userList = usersRes.error ? [] : (usersRes.data || []);
      setUsers(userList);

      const leaveOk = !leaveRes.error;
      setLeaveAvailable(leaveOk);

      if (todayRes.error) {
        setSummary(null);
        setSummaryError(classifyError(todayRes.error));
      } else if (usersRes.error) {
        // Without the staff list, only record-based figures are reliable.
        setSummary({ ...computeTodaySummary({ todayRecords: todayRes.data, staff: [], approvedLeaveStaffIds: [], leaveAvailable: false }), noCheckIn: null, onLeave: null });
      } else {
        setSummary(computeTodaySummary({
          todayRecords: todayRes.data,
          staff: userList,
          approvedLeaveStaffIds: leaveOk ? (leaveRes.data || []).map((l) => l.staff_id) : [],
          leaveAvailable: leaveOk,
        }));
      }
      setLastLoadedAt(new Date());
    } catch (e) {
      setError(classifyError({ message: e?.message || 'network' }));
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, employeeId, rangeInvalid]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const employeeOptions = useMemo(
    () => users
      .filter((u) => u.role !== 'Buyer')
      .sort((a, b) => (a.display_name || a.email || '').localeCompare(b.display_name || b.email || '')),
    [users]
  );
  // In-progress durations are measured up to the last load time; Refresh updates them.
  const rows = useMemo(
    () => buildRows(records, usersById, istDate(lastLoadedAt || new Date()), lastLoadedAt || new Date()),
    [records, usersById, lastLoadedAt]
  );
  const visibleRows = useMemo(() => filterRows(rows, { status: statusFilter }), [rows, statusFilter]);

  const columns = [
    { id: 'employee', header: 'Employee', renderCell: (r) => <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.employee}</span> },
    { id: 'date', header: 'Date', renderCell: (r) => r.dateLabel },
    { id: 'in', header: 'Check-in', renderCell: (r) => r.checkInLabel },
    { id: 'out', header: 'Check-out', renderCell: (r) => <span className={r.checkOutLabel === '—' ? 'text-muted' : ''}>{r.checkOutLabel}</span> },
    {
      id: 'duration', header: 'Duration', renderCell: (r) => (
        <div>
          <div>{r.durationLabel}</div>
          {r.durationNote && <div style={{ fontSize: '0.75rem' }} className={r.status === 'INCOMPLETE' ? 'text-danger' : 'text-muted'}>{r.durationNote}</div>}
        </div>
      ),
    },
    { id: 'status', header: 'Status', renderCell: (r) => <span className={`badge ${STATUS_META[r.status].badge}`}>{STATUS_META[r.status].label}</span> },
    {
      id: 'location', header: 'Location', renderCell: (r) => {
        if (locationError) return <span className="text-muted">—</span>;
        const loc = locationsById[r.id];
        const inEv = buildLocationEvent(loc, 'check_in');
        const outEv = r.checkOutLabel === '—' ? null : buildLocationEvent(loc, 'check_out');
        return (
          <div style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
            <div className={inEv.recorded ? '' : 'text-muted'}>In: {inEv.summary}</div>
            <div className={outEv && outEv.recorded ? '' : 'text-muted'}>Out: {outEv ? outEv.summary : '—'}</div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDetailRow(r)}
              style={{ marginTop: '0.35rem', padding: '0.15rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <MapPin size={12} /> Details
            </button>
          </div>
        );
      },
    },
  ];

  const cap = periodCount !== null && periodCount > records.length;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Attendance Register</h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem' }}>Check-ins and check-outs recorded in Field Assist. Times shown in IST.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData} disabled={loading || rangeInvalid} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Today's summary (all staff, independent of table filters) */}
      <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Today</h2>
      {summaryError ? (
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={18} className="text-danger" /> <span>Today's summary unavailable: {summaryError.message}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <KpiCard title="Present today" value={summary ? summary.present : '—'} icon={UserCheck} colorClass="success" subtitle="Staff with a check-in today" />
          <KpiCard
            title="Absent today"
            value={summary && summary.noCheckIn !== null ? summary.noCheckIn : '—'}
            icon={UserX}
            colorClass="danger"
            subtitle={summary && summary.noCheckIn !== null
              ? `No check-in recorded · not confirmed${leaveAvailable && summary.onLeave !== null ? ` · ${summary.onLeave} on approved leave` : ' · leave not considered'}`
              : 'Staff list unavailable'}
          />
          <KpiCard title="Checked in, not out" value={summary ? summary.openCheckIns : '—'} icon={Clock} colorClass="warning" subtitle="Today's records without check-out" />
          <KpiCard
            title="Records in period"
            value={error ? '—' : (periodCount ?? '—')}
            icon={ListChecks}
            colorClass="primary"
            subtitle={fromDate === toDate ? `For ${fromDate}` : `${fromDate} to ${toDate}`}
          />
        </div>
      )}

      {/* Filters */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '150px', maxWidth: '200px' }}>
          <label style={labelStyle} htmlFor="att-from">From</label>
          <input id="att-from" type="date" value={fromDate} max={toDate || undefined} onChange={(e) => e.target.value && setFromDate(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1, minWidth: '150px', maxWidth: '200px' }}>
          <label style={labelStyle} htmlFor="att-to">To</label>
          <input id="att-to" type="date" value={toDate} min={fromDate || undefined} onChange={(e) => e.target.value && setToDate(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1, minWidth: '180px', maxWidth: '260px' }}>
          <label style={labelStyle} htmlFor="att-employee">Employee</label>
          <select id="att-employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={inputStyle}>
            <option value="ALL">All employees</option>
            {employeeOptions.map((u) => (
              <option key={u.id} value={u.id}>{u.display_name || u.email || u.id.slice(0, 8)}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '160px', maxWidth: '200px' }}>
          <label style={labelStyle} htmlFor="att-status">Status</label>
          <select id="att-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="ALL">All statuses</option>
            <option value="WORKING">Working</option>
            <option value="CHECKED_OUT">Checked Out</option>
            <option value="INCOMPLETE">Incomplete</option>
          </select>
        </div>
        <button className="btn btn-secondary" onClick={() => { setFromDate(today); setToDate(today); setEmployeeId('ALL'); setStatusFilter('ALL'); }} style={{ height: '38px' }}>
          Today
        </button>
      </div>

      {rangeInvalid ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertCircle size={32} className="text-warning" style={{ margin: '0 auto 0.5rem' }} />
          <div>The start date must be on or before the end date.</div>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <AlertCircle size={48} className="text-danger" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
          <h3 style={{ marginBottom: '1rem' }}>{error.message}</h3>
          <button className="btn btn-primary" onClick={fetchData}>Retry</button>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }} className="text-muted">Loading attendance records...</div>
      ) : (
        <div className="glass-panel" style={{ padding: 0 }}>
          {locationError && (
            <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }} className="text-secondary">
              <MapPin size={16} className={locationError.kind === 'RANGE' ? 'text-warning' : 'text-danger'} />
              <span>Locations unavailable: {locationError.message}</span>
            </div>
          )}
          {cap && (
            <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }} className="text-secondary">
              Showing the latest {records.length} of {periodCount} records. Narrow the date range or select an employee to see the rest.
            </div>
          )}
          {visibleRows.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }} className="text-muted">
              <CalendarCheck size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
              <p>{records.length === 0 ? 'No attendance records for the selected filters.' : 'No records match the selected status.'}</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={visibleRows}
              theadClassName="bg-slate-50 border-b border-base"
              tbodyClassName="divide-y divide-base"
            />
          )}
        </div>
      )}

      {detailRow && (
        <LocationDetailPanel
          row={detailRow}
          locRow={locationsById[detailRow.id]}
          onClose={() => setDetailRow(null)}
        />
      )}
    </div>
  );
}

function LocationEventBlock({ title, timeLabel, ev }) {
  const line = (label, value) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
      <span className="text-secondary">{label}</span>
      <span style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
    </div>
  );
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{title}</h3>
      {line('Event time (IST)', timeLabel)}
      {line('Location status', ev.statusLabel)}
      {ev.recorded ? (
        <>
          {line('Accuracy', ev.accuracyLabel || 'Unknown')}
          {line('Captured at (IST)', ev.capturedAtLabel || '—')}
          {line('Coordinates (GPS)', `${ev.latitude}, ${ev.longitude}`)}
          <a
            href={ev.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ marginTop: '0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', textDecoration: 'none' }}
          >
            <ExternalLink size={14} /> Open in Google Maps
          </a>
        </>
      ) : (
        <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
          Location not recorded{ev.status ? ` (${ev.statusLabel}).` : '.'}
        </div>
      )}
    </div>
  );
}

function LocationDetailPanel({ row, locRow, onClose }) {
  const checkedOut = row.checkOutLabel !== '—';
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Attendance location details"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
    >
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-surface)', padding: '1.5rem', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{row.employee}</h2>
            <div className="text-secondary" style={{ fontSize: '0.85rem' }}>{row.dateLabel}</div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close location details"><X size={18} /></button>
        </div>
        <LocationEventBlock title="Check-in" timeLabel={row.checkInLabel} ev={buildLocationEvent(locRow, 'check_in')} />
        {checkedOut
          ? <LocationEventBlock title="Check-out" timeLabel={row.checkOutLabel} ev={buildLocationEvent(locRow, 'check_out')} />
          : <div className="text-muted" style={{ fontSize: '0.85rem' }}>Not checked out yet.</div>}
        <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '1rem', marginBottom: 0 }}>
          Coordinates are the GPS reading recorded by Field Assist at the moment of check-in/check-out. No address lookup is performed.
        </p>
      </div>
    </div>
  );
}
