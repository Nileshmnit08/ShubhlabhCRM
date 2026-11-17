import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  LogOut,
  Eye,
  User,
  Smartphone,
  Laptop,
  Calendar,
  Clock,
  Car,
  CheckCircle2,
  AlertCircle,
  Copy,
} from 'lucide-react';
import {
  VISITOR_CATEGORIES,
  VISITOR_STATUSES,
  REGISTRATION_SOURCES,
  formatIstTime,
  formatIstDateTime,
  formatDuration,
  filterVisitors,
  istBusinessDate,
} from '../../lib/visitorRegister';
import { exportVisitorsToCSV } from './visitorService';

export default function VisitorHistoryTable({
  visitors,
  loading,
  onRefresh,
  onSelectVisitor,
  onMarkExit,
  markingExitId,
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL'); // 'TODAY', 'LAST_7_DAYS', 'THIS_MONTH', 'ALL'
  const [copiedPass, setCopiedPass] = useState(null);

  const todayYmd = istBusinessDate();

  // Compute date range based on date preset
  const dateRange = useMemo(() => {
    if (datePreset === 'TODAY') {
      return { startDate: todayYmd, endDate: todayYmd };
    }
    if (datePreset === 'LAST_7_DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const start = istBusinessDate(d);
      return { startDate: start, endDate: todayYmd };
    }
    if (datePreset === 'THIS_MONTH') {
      const start = `${todayYmd.slice(0, 7)}-01`;
      return { startDate: start, endDate: todayYmd };
    }
    return { startDate: null, endDate: null };
  }, [datePreset, todayYmd]);

  // Filter visitors
  const filteredVisitors = useMemo(() => {
    return filterVisitors(visitors, {
      search,
      status: statusFilter,
      category: categoryFilter,
      source: sourceFilter,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  }, [visitors, search, statusFilter, categoryFilter, sourceFilter, dateRange]);

  const handleExport = () => {
    exportVisitorsToCSV(filteredVisitors);
  };

  const handleCopyPass = (pass) => {
    if (!pass) return;
    navigator.clipboard?.writeText(pass);
    setCopiedPass(pass);
    setTimeout(() => setCopiedPass(null), 1500);
  };

  return (
    <div
      style={{
        background: 'var(--bg-surface, #ffffff)',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border, #e2e8f0)',
        overflow: 'hidden',
      }}
    >
      {/* Top Controls Toolbar */}
      <div
        style={{
          padding: '1.25rem',
          borderBottom: '1px solid var(--border, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)', margin: 0 }}>
              Visitor Register & Log
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Showing {filteredVisitors.length} of {visitors.length} total entries
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Refresh visitor list"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              onClick={handleExport}
              disabled={filteredVisitors.length === 0}
              title="Export filtered records to CSV"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid #0284c7',
                background: '#0284c7',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: filteredVisitors.length === 0 ? 'not-allowed' : 'pointer',
                opacity: filteredVisitors.length === 0 ? 0.6 : 1,
              }}
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Search by name, mobile, pass, vehicle, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
              }}
            />
          </div>

          {/* Date Preset */}
          <div>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.82rem',
                color: '#334155',
              }}
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today Only</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.82rem',
                color: '#334155',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="IN">Currently Inside</option>
              <option value="OUT">Exited</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.82rem',
                color: '#334155',
              }}
            >
              <option value="ALL">All Categories</option>
              {VISITOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.82rem',
                color: '#334155',
              }}
            >
              <option value="ALL">All Sources</option>
              <option value="Field Assist">Field Assist (App)</option>
              <option value="CRM">CRM (Web)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border, #e2e8f0)', color: '#475569' }}>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Pass #</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Photo</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Visitor & Firm</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Contact</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Category</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Person to Meet</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Entry Time</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Exit / Duration</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Source</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVisitors.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                  {loading ? 'Loading visitor records...' : 'No visitors matching your filter criteria.'}
                </td>
              </tr>
            ) : (
              filteredVisitors.map((v) => {
                const isInside = v.status === 'IN';
                const duration = formatDuration(v.entry_time, v.exit_time);
                const isMarkingThis = markingExitId === v.id;

                return (
                  <tr
                    key={v.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Pass Number */}
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                          {v.pass_number}
                        </span>
                        <button
                          onClick={() => handleCopyPass(v.pass_number)}
                          title="Copy pass number"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: copiedPass === v.pass_number ? '#16a34a' : '#94a3b8',
                            cursor: 'pointer',
                            padding: '2px',
                          }}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>

                    {/* Photo Thumbnail */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div
                        onClick={() => onSelectVisitor(v)}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {v.photo_url ? (
                          <img
                            src={v.photo_url}
                            alt={v.visitor_name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '';
                            }}
                          />
                        ) : (
                          <User size={18} color="#94a3b8" />
                        )}
                      </div>
                    </td>

                    {/* Visitor & Firm */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div
                        onClick={() => onSelectVisitor(v)}
                        style={{ fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}
                      >
                        {v.visitor_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {v.company_name || 'Individual'}
                      </div>
                    </td>

                    {/* Mobile */}
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <a
                        href={`tel:${v.mobile_number}`}
                        style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {v.mobile_number}
                      </a>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {v.category || 'Other'}
                      </span>
                    </td>

                    {/* Person to Meet */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ color: '#334155' }}>{v.person_to_meet || '—'}</div>
                      {v.vehicle_number && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                          🚗 {v.vehicle_number}
                        </div>
                      )}
                    </td>

                    {/* Entry Time */}
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 500, color: '#334155' }}>
                        {formatIstTime(v.entry_time)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {formatIstDateTime(v.entry_time).split(',')[0]}
                      </div>
                    </td>

                    {/* Exit Time / Duration */}
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ color: isInside ? '#15803d' : '#475569', fontWeight: 500 }}>
                        {duration} {isInside ? '(Active)' : ''}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {v.exit_time ? formatIstTime(v.exit_time) : 'Still Inside'}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          backgroundColor: isInside ? '#dcfce7' : '#f1f5f9',
                          color: isInside ? '#15803d' : '#64748b',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: isInside ? '#16a34a' : '#94a3b8',
                          }}
                        />
                        {isInside ? 'INSIDE' : 'EXITED'}
                      </span>
                    </td>

                    {/* Source Badge */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          color: '#475569',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {v.registration_source === 'Field Assist' ? (
                          <Smartphone size={12} color="#0284c7" />
                        ) : (
                          <Laptop size={12} color="#15803d" />
                        )}
                        {v.registration_source || 'Field Assist'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        {isInside && (
                          <button
                            onClick={() => onMarkExit(v.id)}
                            disabled={isMarkingThis}
                            title="Mark Visitor Exit"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: isMarkingThis ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <LogOut size={12} />
                            {isMarkingThis ? 'Exiting...' : 'Mark Exit'}
                          </button>
                        )}

                        <button
                          onClick={() => onSelectVisitor(v)}
                          title="View Details"
                          style={{
                            padding: '0.35rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
