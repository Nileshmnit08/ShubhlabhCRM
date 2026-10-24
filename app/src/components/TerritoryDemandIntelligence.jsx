import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, Treemap, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid,
} from 'recharts';
import { MapPin, X, Lightbulb, AlertTriangle, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  METRICS, UNASSIGNED,
  summarize, aggregateByTerritory, intensityLevel, territoryDetail, buildInsights,
  requirementLink, customerLink,
} from '../lib/territoryDemand';

/**
 * PDM-TERRITORY-INTELLIGENCE-01: Territory Demand Intelligence section.
 * Receives the page's shared, already-filtered signals; never queries by itself.
 * Territories are CRM sales territories (crm_territories), not geographic shapes,
 * so the "map" is a territory tile view sized and shaded by demand — no invented geography.
 */

// Blue intensity scale (level 0..4) with readable text colours.
const SCALE = ['#f1f5f9', '#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8'];
const SCALE_TEXT = ['#475569', '#1e3a8a', '#1e3a8a', '#ffffff', '#ffffff'];
const BAR_COLOR = '#3b82f6';
const BAR_SELECTED = '#1d4ed8';
const CHART_LIMIT = 12;

const safeDate = (v) => {
  try { return format(parseISO(v), 'dd MMM yyyy'); } catch { return '—'; }
};

function SummaryCard({ label, value, help }) {
  return (
    <div style={{ flex: '1 1 150px', padding: '0.9rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }} title={help}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function TileCell(props) {
  const { x, y, width, height, name, value, level, selectedName, onSelect } = props;
  if (!name || width <= 0 || height <= 0) return null;
  const lv = level ?? 0;
  const selected = selectedName === name;
  const showLabel = width > 54 && height > 30;
  return (
    <g
      onClick={() => onSelect?.(name)}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={`${name}: ${value} demand signals`}
    >
      <rect x={x} y={y} width={width} height={height} rx={6}
        fill={SCALE[lv]} stroke={selected ? '#0f172a' : '#ffffff'} strokeWidth={selected ? 3 : 2} />
      {showLabel && (
        <>
          <text x={x + 8} y={y + 18} fill={SCALE_TEXT[lv]} fontSize={12} fontWeight={600}>
            {name.length > Math.floor(width / 7) ? `${name.slice(0, Math.max(3, Math.floor(width / 7) - 1))}…` : name}
          </text>
          <text x={x + 8} y={y + 34} fill={SCALE_TEXT[lv]} fontSize={11}>{value}</text>
        </>
      )}
    </g>
  );
}

function RecordList({ title, rows, empty, renderRow }) {
  return (
    <div>
      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0 0 0.4rem 0', color: 'var(--text-primary)' }}>{title}</h4>
      {rows.length === 0
        ? <div className="text-muted" style={{ fontSize: '0.8rem' }}>{empty}</div>
        : <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '0.8rem' }}>{rows.map(renderRow)}</ul>}
    </div>
  );
}

export default function TerritoryDemandIntelligence({ signals, allSignals, filters, truncated, onFocusProduct }) {
  const [metric, setMetric] = useState('demandSignals');
  const [selected, setSelected] = useState(null);

  const summary = useMemo(() => summarize(signals), [signals]);
  const byTerritory = useMemo(() => aggregateByTerritory(signals), [signals]);
  const insights = useMemo(() => buildInsights({ filtered: signals, all: allSignals, filters }), [signals, allSignals, filters]);

  // Drop a selection that no longer exists under the current filters.
  useEffect(() => {
    if (selected && !byTerritory.some((t) => t.territory === selected)) setSelected(null);
  }, [byTerritory, selected]);

  const detail = useMemo(() => (selected ? territoryDetail(signals, selected) : null), [signals, selected]);
  const maxDemand = byTerritory.reduce((m, t) => Math.max(m, t.demandSignals), 0);
  const tiles = byTerritory
    .filter((t) => t.demandSignals > 0)
    .map((t) => ({ name: t.territory, size: t.demandSignals, level: intensityLevel(t.demandSignals, maxDemand) }));
  const chartRows = [...byTerritory].sort((a, b) => b[metric] - a[metric] || a.territory.localeCompare(b.territory)).slice(0, CHART_LIMIT);
  const unassigned = byTerritory.find((t) => t.territory === UNASSIGNED);
  const metricMeta = METRICS.find((m) => m.key === metric);

  const toggle = (name) => setSelected((cur) => (cur === name ? null : name));

  return (
    <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }} aria-labelledby="tdi-title">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <h2 id="tdi-title" style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MapPin size={18} style={{ color: BAR_COLOR }} /> Territory Demand Intelligence
          </h2>
          <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
            Where demand comes from, what drives it, and where to follow up. Uses the filters above.
          </p>
        </div>
      </div>

      {truncated && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', marginBottom: '0.75rem' }} className="text-warning">
          <AlertTriangle size={14} /> Only the latest 1,000 demand signals were loaded; totals may be incomplete.
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {METRICS.map((m) => <SummaryCard key={m.key} label={m.label} value={summary[m.key]} help={m.help} />)}
      </div>

      {signals.length === 0 ? (
        <div className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>No demand signals match the current filters.</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {/* Territory tile view */}
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>Demand by territory</h3>
              <p className="text-muted" style={{ fontSize: '0.75rem', margin: '0 0 0.5rem 0' }}>
                Tile size and shade = demand signals. CRM sales territories, not map boundaries. Select a tile for details.
              </p>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <Treemap
                    data={tiles}
                    dataKey="size"
                    isAnimationActive={false}
                    content={<TileCell selectedName={selected} onSelect={toggle} />}
                  >
                    <Tooltip formatter={(v) => [v, 'Demand signals']} />
                  </Treemap>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', marginTop: '0.4rem' }} className="text-muted" aria-label="Legend: lighter is lower demand, darker is higher demand">
                <span>Lower</span>
                {SCALE.slice(1).map((c) => <span key={c} style={{ width: 22, height: 10, background: c, borderRadius: 2, display: 'inline-block' }} />)}
                <span>Higher</span>
                {selected && <span style={{ marginLeft: 'auto', color: 'var(--text-primary)' }}>Selected: <strong>{selected}</strong></span>}
              </div>
            </div>

            {/* Comparison graph */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Territory comparison</h3>
                <select className="input" value={metric} onChange={(e) => setMetric(e.target.value)} aria-label="Comparison metric" style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}>
                  {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
              <p className="text-muted" style={{ fontSize: '0.75rem', margin: '0 0 0.5rem 0' }}>{metricMeta.help}</p>
              <div style={{ width: '100%', height: Math.max(160, chartRows.length * 30 + 30) }}>
                <ResponsiveContainer>
                  <BarChart data={chartRows} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
                    <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="territory" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [v, metricMeta.label]} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
                    <Bar dataKey={metric} radius={[0, 4, 4, 0]} isAnimationActive={false}
                      onClick={(d) => toggle(d?.payload?.territory ?? d?.territory)} style={{ cursor: 'pointer' }}>
                      {chartRows.map((row) => <Cell key={row.territory} fill={row.territory === selected ? BAR_SELECTED : BAR_COLOR} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {byTerritory.length > CHART_LIMIT && (
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Top {CHART_LIMIT} shown. All territories are in the table below.</div>
              )}
              <details style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>Show counts for all territories</summary>
                <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                        <th style={{ padding: '0.3rem' }}>Territory</th>
                        {METRICS.map((m) => <th key={m.key} style={{ padding: '0.3rem', textAlign: 'right' }}>{m.label}</th>)}
                        <th style={{ padding: '0.3rem', textAlign: 'right' }}>Customers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byTerritory.map((t) => (
                        <tr key={t.territory} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: t.territory === selected ? 'rgba(59,130,246,0.08)' : 'transparent' }} onClick={() => toggle(t.territory)}>
                          <td style={{ padding: '0.3rem' }}>{t.territory}</td>
                          {METRICS.map((m) => <td key={m.key} style={{ padding: '0.3rem', textAlign: 'right' }}>{t[m.key]}</td>)}
                          <td style={{ padding: '0.3rem', textAlign: 'right' }}>{t.uniqueCustomers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          </div>

          {unassigned && (
            <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.75rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <Info size={13} /> {unassigned.demandSignals} signal{unassigned.demandSignals === 1 ? '' : 's'} from customers without a territory are grouped as "Unassigned".
            </div>
          )}

          {/* Territory drill-down */}
          {detail && (
            <div style={{ marginTop: '1.25rem', padding: '1rem', border: '1px solid #bfdbfe', background: '#f8fbff', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{detail.territory}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)} style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <X size={14} /> Clear selection
                </button>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', marginBottom: '0.9rem' }} className="text-secondary">
                <span><strong style={{ color: 'var(--text-primary)' }}>{detail.summary.demandSignals}</strong> demand signals</span>
                <span><strong style={{ color: 'var(--text-primary)' }}>{detail.summary.uniqueCustomers}</strong> customers</span>
                <span><strong style={{ color: 'var(--text-primary)' }}>{detail.summary.openRequirements}</strong> open requirements</span>
                <span><strong style={{ color: 'var(--text-primary)' }}>{detail.summary.activeIntents}</strong> active intents</span>
                <span><strong style={{ color: 'var(--text-primary)' }}>{detail.summary.completedTransactions}</strong> transactions</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <RecordList title="Top products (requirements & intents)" rows={detail.topProducts} empty="No product-level demand."
                  renderRow={(p) => (
                    <li key={p.name} style={{ padding: '0.2rem 0', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <button type="button" onClick={() => onFocusProduct?.(p.name, detail.territory)} className="text-primary"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem' }}
                        title="Show this product in the table below">
                        {p.name}
                      </button>
                      <span className="text-muted">{p.signals}</span>
                    </li>
                  )} />
                <RecordList title="Open requirements" rows={detail.openRequirements} empty="None open."
                  renderRow={(s) => (
                    <li key={s.source_id} style={{ padding: '0.2rem 0' }}>
                      <Link to={requirementLink(s)} className="text-primary">{s.standardized_product_name}</Link>
                      <span className="text-muted"> · {s.party_name} · {s.signal_status}</span>
                    </li>
                  )} />
                <RecordList title="Active buying intents" rows={detail.activeIntents} empty="None active."
                  renderRow={(s) => (
                    <li key={s.source_id} style={{ padding: '0.2rem 0' }}>
                      <Link to={requirementLink(s)} className="text-primary">{s.standardized_product_name}</Link>
                      <span className="text-muted"> · {s.party_name}</span>
                    </li>
                  )} />
                <RecordList title="Completed transactions" rows={detail.transactions} empty="None in this period."
                  renderRow={(s) => (
                    <li key={s.source_id} style={{ padding: '0.2rem 0' }}>
                      <Link to={customerLink(s)} className="text-primary">{s.party_name}</Link>
                      <span className="text-muted"> · {safeDate(s.signal_date)}</span>
                    </li>
                  )} />
                <RecordList title="Customers" rows={detail.customers} empty="—"
                  renderRow={(c) => (
                    <li key={c.party_id} style={{ padding: '0.2rem 0', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <Link to={`/customers/${c.party_id}`} className="text-primary">{c.party_name}</Link>
                      <span className="text-muted">{c.signals}</span>
                    </li>
                  )} />
                <RecordList title="Recent activity" rows={detail.recentActivity} empty="—"
                  renderRow={(s) => (
                    <li key={`${s.signal_type}:${s.source_id}`} style={{ padding: '0.2rem 0' }}>
                      <span className="text-muted">{safeDate(s.signal_date)} · </span>
                      {requirementLink(s)
                        ? <Link to={requirementLink(s)} className="text-primary">{s.signal_type === 'Commercial Intent' ? 'Intent' : 'Requirement'}: {s.standardized_product_name}</Link>
                        : <Link to={customerLink(s)} className="text-primary">Transaction: {s.party_name}</Link>}
                    </li>
                  )} />
              </div>
            </div>
          )}

          {/* Insights */}
          <div style={{ marginTop: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Lightbulb size={16} style={{ color: '#d97706' }} /> Where to follow up
            </h3>
            {insights.length === 0 ? (
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>No follow-up signals in the current filters.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {insights.slice(0, 6).map((ins, i) => (
                  <li key={`${ins.kind}-${ins.territory}-${i}`} style={{ padding: '0.6rem 0.8rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ins.title}</div>
                    <div className="text-secondary">{ins.detail}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.3rem' }}>
                      {ins.territory && (
                        <button type="button" className="text-primary" onClick={() => setSelected(ins.territory)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.8rem' }}>
                          View {ins.territory}
                        </button>
                      )}
                      {ins.records.slice(0, 5).map((s) => (
                        <Link key={s.source_id} to={requirementLink(s) || customerLink(s)} className="text-primary">
                          {s.party_name}
                        </Link>
                      ))}
                      {ins.records.length > 5 && <span className="text-muted">+{ins.records.length - 5} more</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
