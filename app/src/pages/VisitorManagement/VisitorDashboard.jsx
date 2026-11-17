import React from 'react';
import {
  Users,
  UserCheck,
  LogOut,
  Clock,
  Calendar,
  Smartphone,
  Laptop,
  PlusCircle,
  RefreshCw,
  Phone,
  Car,
  AlertTriangle,
  Building,
} from 'lucide-react';
import {
  VISITOR_CATEGORIES,
  formatIstTime,
  formatDuration,
  istBusinessDate,
} from '../../lib/visitorRegister';

export default function VisitorDashboard({
  stats,
  loading,
  onRefresh,
  onNavigateToRegister,
  onSelectVisitor,
  onMarkExit,
  markingExitId,
}) {
  const {
    totalToday = 0,
    currentlyInside = 0,
    exitedToday = 0,
    monthlyTotal = 0,
    categoryCounts = {},
    sourceCounts = {},
    recentInside = [],
  } = stats || {};

  const todayYmd = istBusinessDate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner / Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)', margin: 0 }}>
            Factory & Office Visitor Overview
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
            Live status of visitors, contractors, suppliers, and transporters on premises.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 0.95rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={onNavigateToRegister}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 1.25rem',
              borderRadius: '6px',
              border: 'none',
              background: '#16a34a',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <PlusCircle size={15} />
            Register Visitor
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Currently Inside (Highlight Card) */}
        <div
          style={{
            background: currentlyInside > 0 ? '#f0fdf4' : '#ffffff',
            border: currentlyInside > 0 ? '1px solid #bbf7d0' : '1px solid var(--border, #e2e8f0)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>
              Currently Inside
            </span>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: currentlyInside > 0 ? '#16a34a' : '#94a3b8',
                display: 'inline-block',
                boxShadow: currentlyInside > 0 ? '0 0 0 3px rgba(34, 197, 94, 0.25)' : 'none',
              }}
            />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#14532d', margin: '0.5rem 0 0.25rem' }}>
            {currentlyInside}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
            {currentlyInside === 1 ? '1 person on premises' : `${currentlyInside} people on premises`}
          </div>
        </div>

        {/* Total Today */}
        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
              Registered Today
            </span>
            <UserCheck size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', margin: '0.5rem 0 0.25rem' }}>
            {totalToday}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Business date: {todayYmd}
          </div>
        </div>

        {/* Exited Today */}
        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
              Exited Today
            </span>
            <LogOut size={18} color="#64748b" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', margin: '0.5rem 0 0.25rem' }}>
            {exitedToday}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Departure logged
          </div>
        </div>

        {/* Total Month */}
        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
              This Month
            </span>
            <Calendar size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', margin: '0.5rem 0 0.25rem' }}>
            {monthlyTotal}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Cumulative visits this month
          </div>
        </div>
      </div>

      {/* Main Section: Watchlist + Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Active Watchlist (Currently Inside) */}
        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--border, #e2e8f0)',
            padding: '1.25rem',
            gridColumn: 'span 2',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#16a34a',
                }}
              />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Active Factory Watchlist ({recentInside.length})
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Visitors requiring exit clearance
            </span>
          </div>

          {recentInside.length === 0 ? (
            <div
              style={{
                padding: '2.5rem 1rem',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px dashed #cbd5e1',
                color: '#64748b',
              }}
            >
              <UserCheck size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
              <div style={{ fontWeight: 600, color: '#334155' }}>No visitors currently inside</div>
              <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                All registered visitors have logged their exit or none have entered today.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentInside.map((v) => {
                const duration = formatDuration(v.entry_time);
                const isMarkingThis = markingExitId === v.id;

                return (
                  <div
                    key={v.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      gap: '1rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div
                        onClick={() => onSelectVisitor(v)}
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          backgroundColor: '#e2e8f0',
                          flexShrink: 0,
                          cursor: 'pointer',
                        }}
                      >
                        {v.photo_url ? (
                          <img
                            src={v.photo_url}
                            alt={v.visitor_name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={18} color="#94a3b8" />
                          </div>
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            onClick={() => onSelectVisitor(v)}
                            style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', cursor: 'pointer' }}
                          >
                            {v.visitor_name}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontFamily: 'monospace',
                              padding: '1px 5px',
                              backgroundColor: '#e2e8f0',
                              borderRadius: '4px',
                              color: '#475569',
                            }}
                          >
                            {v.pass_number}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {v.company_name ? `${v.company_name} • ` : ''}
                          To meet: <strong style={{ color: '#334155' }}>{v.person_to_meet || 'Staff'}</strong>
                          {v.vehicle_number ? ` • 🚗 ${v.vehicle_number}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#15803d' }}>
                          Inside for {duration}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Since {formatIstTime(v.entry_time)}
                        </div>
                      </div>

                      <button
                        onClick={() => onMarkExit(v.id)}
                        disabled={isMarkingThis}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: isMarkingThis ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <LogOut size={13} />
                        {isMarkingThis ? 'Exiting...' : 'Mark Exit'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Side Panel: Distribution & Origin */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Category Distribution */}
          <div
            style={{
              background: 'var(--bg-surface, #ffffff)',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px solid var(--border, #e2e8f0)',
              padding: '1.25rem',
            }}
          >
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem' }}>
              Visitor Categories
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {VISITOR_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat] || 0;
                const total = monthlyTotal || 1;
                const percent = Math.round((count / total) * 100);

                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                      <span style={{ color: '#334155', fontWeight: 500 }}>{cat}</span>
                      <span style={{ color: '#64748b' }}>{count} ({percent}%)</span>
                    </div>
                    <div style={{ height: '6px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${percent}%`,
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

          {/* Registration Source */}
          <div
            style={{
              background: 'var(--bg-surface, #ffffff)',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px solid var(--border, #e2e8f0)',
              padding: '1.25rem',
            }}
          >
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.75rem' }}>
              Registration Source
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#0369a1', fontWeight: 600 }}>
                  <Smartphone size={13} /> Field Assist
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0c4a6e', marginTop: '4px' }}>
                  {sourceCounts['Field Assist'] || 0}
                </div>
              </div>

              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>
                  <Laptop size={13} /> CRM Portal
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#14532d', marginTop: '4px' }}>
                  {sourceCounts['CRM'] || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
