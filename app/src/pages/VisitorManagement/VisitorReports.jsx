import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Users,
  Clock,
  TrendingUp,
  PieChart,
} from 'lucide-react';
import {
  VISITOR_CATEGORIES,
  istBusinessDate,
  filterVisitors,
  formatDuration,
} from '../../lib/visitorRegister';
import { exportVisitorsToCSV } from './visitorService';

export default function VisitorReports({ visitors }) {
  const todayYmd = istBusinessDate();
  const currentMonthStart = `${todayYmd.slice(0, 7)}-01`;

  const [startDate, setStartDate] = useState(currentMonthStart);
  const [endDate, setEndDate] = useState(todayYmd);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Filter visitors by selected range and category
  const filteredRecords = useMemo(() => {
    return filterVisitors(visitors, {
      startDate,
      endDate,
      category: selectedCategory,
    });
  }, [visitors, startDate, endDate, selectedCategory]);

  // Aggregate statistics
  const metrics = useMemo(() => {
    let total = filteredRecords.length;
    let completedExits = 0;
    let totalStaySeconds = 0;
    const catMap = {};
    const srcMap = { 'Field Assist': 0, CRM: 0 };
    const dateMap = {};

    for (const cat of VISITOR_CATEGORIES) {
      catMap[cat] = 0;
    }

    for (const v of filteredRecords) {
      if (v.status === 'OUT' && v.entry_time && v.exit_time) {
        completedExits += 1;
        const s = new Date(v.entry_time).getTime();
        const e = new Date(v.exit_time).getTime();
        if (e > s) {
          totalStaySeconds += Math.floor((e - s) / 1000);
        }
      }

      if (v.category && catMap[v.category] !== undefined) {
        catMap[v.category] += 1;
      }

      const src = v.registration_source || 'Field Assist';
      srcMap[src] = (srcMap[src] || 0) + 1;

      const ymd = istBusinessDate(v.entry_time);
      if (ymd) {
        dateMap[ymd] = (dateMap[ymd] || 0) + 1;
      }
    }

    const avgMinutes = completedExits > 0 ? Math.round(totalStaySeconds / completedExits / 60) : 0;
    const avgDurationText = avgMinutes > 60 ? `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m` : `${avgMinutes}m`;

    return {
      total,
      completedExits,
      activeInside: total - completedExits,
      avgDurationText,
      catMap,
      srcMap,
      dateMap,
    };
  }, [filteredRecords]);

  const handleExport = () => {
    exportVisitorsToCSV(filteredRecords, `visitor_report_${startDate}_to_${endDate}.csv`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Controls */}
      <div
        style={{
          background: 'var(--bg-surface, #ffffff)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--border, #e2e8f0)',
          padding: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Visitor Analytics & Reports
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
            Filter by custom date range, analyze dwell time, and export security logs.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
              }}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '0.82rem',
            }}
          >
            <option value="ALL">All Categories</option>
            {VISITOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            onClick={handleExport}
            disabled={filteredRecords.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 1rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: filteredRecords.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filteredRecords.length === 0 ? 0.6 : 1,
            }}
          >
            <Download size={14} />
            Export Report CSV
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: '8px',
            padding: '1.25rem',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Total Visits in Period</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0.35rem 0' }}>
            {metrics.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7' }}>
            Between {startDate} and {endDate}
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: '8px',
            padding: '1.25rem',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Logged Departures</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#15803d', margin: '0.35rem 0' }}>
            {metrics.completedExits}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Checked out records
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: '8px',
            padding: '1.25rem',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Average Duration</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6366f1', margin: '0.35rem 0' }}>
            {metrics.avgDurationText}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Average time spent on premises
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: '8px',
            padding: '1.25rem',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Mobile vs Web Sync</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: '0.5rem 0' }}>
            📱 {metrics.srcMap['Field Assist']} &nbsp; • &nbsp; 💻 {metrics.srcMap['CRM']}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Field Assist App vs CRM Portal
          </div>
        </div>
      </div>

      {/* Breakdown Details */}
      <div
        style={{
          background: 'var(--bg-surface, #ffffff)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--border, #e2e8f0)',
          padding: '1.5rem',
        }}
      >
        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.25rem' }}>
          Visitor Breakdown by Category
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {VISITOR_CATEGORIES.map((cat) => {
            const count = metrics.catMap[cat] || 0;
            const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;

            return (
              <div
                key={cat}
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{cat}</span>
                  <span style={{ fontWeight: 700, color: '#0284c7' }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height: '6px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '3px' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: '#0284c7',
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
