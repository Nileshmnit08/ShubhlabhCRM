import React from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Treemap, PieChart, Pie, Cell,
} from 'recharts';
import {
  Package, ArrowUp, ArrowDown, Minus, HelpCircle, Lightbulb, Users, MapPin, Target, TrendingUp, TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { SERIES_COLORS, INTENSITY_BUCKETS, intensityColor } from '../../lib/productDemandIntel';

/** PDM-UI-REFERENCE-MATCH-01 presentational panels (data comes from the page). */

const fmtWeek = (iso) => { try { return format(new Date(iso), 'dd MMM'); } catch { return ''; } };
const badgeTone = (s) => (s.status === 'New' ? 'tone-new' : `tone-${s.tone}`);

export function TrendValue({ stat, small }) {
  if (stat.pct === null) {
    return <span className={`pdi-trend neutral`} style={small ? { fontSize: 12 } : undefined}><Minus size={12} />—</span>;
  }
  const Icon = stat.pct > 0 ? ArrowUp : stat.pct < 0 ? ArrowDown : Minus;
  const cls = stat.pct > 0 ? 'up' : stat.pct < 0 ? 'down' : 'flat';
  return (
    <span className={`pdi-trend ${cls}`} style={small ? { fontSize: 12 } : undefined}>
      <Icon size={13} strokeWidth={2.5} />{stat.pct > 0 ? '+' : ''}{stat.pct}%
    </span>
  );
}

export function PanelHead({ title, help, children }) {
  return (
    <div className="pdi-panel-head">
      <h2 className="pdi-panel-title" title={typeof title === 'string' ? title : undefined}>
        <span className="pdi-panel-title-text">{title}</span>
        {help && <span className="pdi-help" title={help}><HelpCircle size={14} /></span>}
      </h2>
      {children && <div className="pdi-controls">{children}</div>}
    </div>
  );
}

/* ── Product cards ───────────────────────────────────────────────────────── */
export function ProductCards({ stats, selected, onSelect }) {
  if (stats.length === 0) return <div className="pdi-empty">No product demand recorded for the current filters.</div>;
  return (
    <div className="pdi-cards">
      {stats.slice(0, 5).map((s) => (
        <button
          type="button"
          key={s.name}
          className={`pdi-card${selected === s.name ? ' is-selected' : ''}`}
          onClick={() => onSelect(selected === s.name ? null : s.name)}
          aria-pressed={selected === s.name}
        >
          <div className="pdi-card-top">
            <div className="pdi-thumb" aria-hidden="true"><Package size={26} /></div>
            <div className="pdi-card-main">
              <div className="pdi-card-name-row">
                <span className="pdi-card-name" title={s.name}>{s.name}</span>
                <span className={`pdi-badge ${badgeTone(s)}`}>{s.status}</span>
              </div>
              <div className="pdi-card-numbers">
                <div>
                  <div className="pdi-big">{s.total}</div>
                  <div className="pdi-sub">Total Signals</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <TrendValue stat={s} />
                  <div className="pdi-sub">vs prior 30 days</div>
                </div>
              </div>
            </div>
          </div>
          <div className="pdi-card-metrics">
            <div className="pdi-metric"><b className="pdi-c-open">{s.openRequirements}</b><small>Open Reqs</small></div>
            <div className="pdi-metric"><b className="pdi-c-intent">{s.activeIntents}</b><small title="Active buying intents">Intents</small></div>
            <div className="pdi-metric"><b className="pdi-c-cust">{s.customers}</b><small>Customers</small></div>
            <div className="pdi-metric"><b className="pdi-c-loc">{s.locations}</b><small>Locations</small></div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Trend by product (last 12 weeks) ────────────────────────────────────── */
export function TrendPanel({ series, products, metric, onMetric }) {
  const hasData = series.some((b) => products.some((p) => b[p] > 0));
  return (
    <section className="pdi-panel">
      <PanelHead title="Demand Trend by Product (Last 12 Weeks)" help="Weekly count of product demand signals (requirements and intents), oldest to newest.">
        <select className="pdi-select" value={metric} onChange={(e) => onMetric(e.target.value)} aria-label="Trend metric">
          <option value="total">Total Signals</option>
          <option value="open">Open Requirements</option>
          <option value="intents">Buying Intents</option>
        </select>
      </PanelHead>
      <div className="pdi-legend">
        {products.map((p, i) => <span key={p}><i style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />{p}</span>)}
      </div>
      {!hasData ? (
        <div className="pdi-empty">No dated product demand in the last 12 weeks for these filters.</div>
      ) : (
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 6, right: 22, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="weekStart" tickFormatter={fmtWeek} tick={{ fontSize: 10.5, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10.5, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip labelFormatter={(v) => `Week of ${fmtWeek(v)}`} />
              {products.map((p, i) => (
                <Line key={p} type="linear" dataKey={p} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 0, fill: SERIES_COLORS[i % SERIES_COLORS.length] }} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

/* ── Territory (CRM sales territories; not geographic boundaries) ────────── */
function TerritoryTile({ x, y, width, height, name, value, selectedName, onSelect }) {
  if (!name || width <= 0 || height <= 0) return null;
  const fill = intensityColor(value);
  const dark = value >= 11;
  return (
    <g onClick={() => onSelect(name)} style={{ cursor: 'pointer' }} role="button" aria-label={`${name}: ${value}`}>
      <rect x={x} y={y} width={width} height={height} rx={5} fill={fill}
        stroke={selectedName === name ? '#0f172a' : '#ffffff'} strokeWidth={selectedName === name ? 2.5 : 2} />
      {width > 46 && height > 26 && (
        <>
          <text x={x + 6} y={y + 15} fontSize={11} fontWeight={600} fill={dark ? '#fff' : '#1e3a8a'}>
            {name.length > Math.floor(width / 7) ? `${name.slice(0, Math.max(3, Math.floor(width / 7) - 1))}…` : name}
          </text>
          <text x={x + 6} y={y + 29} fontSize={10.5} fill={dark ? '#e0e7ff' : '#334155'}>{value}</text>
        </>
      )}
    </g>
  );
}

export function TerritoryPanel({ ranking, rankingTop, products, product, onProduct, selected, onSelect }) {
  const tiles = ranking.filter((r) => r.value > 0).map((r) => ({ name: r.name, size: r.value, value: r.value }));
  return (
    <section className="pdi-panel">
      <PanelHead title="Demand by Territory" help="Demand signals per CRM sales territory for the selected product. Territories are not geographic boundaries, so no map is drawn.">
        <select className="pdi-select" value={product || ''} onChange={(e) => onProduct(e.target.value || null)} aria-label="Product for territory panel">
          <option value="">All products</option>
          {products.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </PanelHead>
      {tiles.length === 0 ? (
        <div className="pdi-empty">No territory demand for this selection.</div>
      ) : (
        <div className="pdi-terr">
          <div>
            <div style={{ width: '100%', height: 170 }}>
              <ResponsiveContainer>
                <Treemap data={tiles} dataKey="size" isAnimationActive={false}
                  content={<TerritoryTile selectedName={selected} onSelect={(n) => onSelect(selected === n ? null : n)} />} />
              </ResponsiveContainer>
            </div>
            <div className="pdi-terr-scale" aria-label="Total signals legend">
              <span className="pdi-note">Total Signals</span>
              {INTENSITY_BUCKETS.map((b) => <span key={b.label}><i style={{ background: b.color }} />{b.label}</span>)}
            </div>
          </div>
          <table className="pdi-rank">
            <tbody>
              {rankingTop.map((r, i) => (
                <tr key={r.name}
                  className={`${r.isOthers ? '' : 'is-clickable'}${selected === r.name ? ' is-selected' : ''}`}
                  onClick={r.isOthers ? undefined : () => onSelect(selected === r.name ? null : r.name)}>
                  <td className="num">{i + 1}</td>
                  <td>{r.name}</td>
                  <td className="val">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ── Top locations ───────────────────────────────────────────────────────── */
export function LocationsPanel({ title, rows, unrecorded, metric, onMetric, selected, onSelect }) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  return (
    <section className="pdi-panel">
      <PanelHead title={title}>
        <select className="pdi-select" value={metric} onChange={(e) => onMetric(e.target.value)} aria-label="Location metric">
          <option value="total">By Total Signals</option>
          <option value="open">By Open Requirements</option>
          <option value="intents">By Buying Intents</option>
          <option value="customers">By Customers</option>
        </select>
      </PanelHead>
      {rows.length === 0 ? (
        <div className="pdi-empty">No recorded customer locations for this selection.</div>
      ) : (
        <div className="pdi-bars">
          {rows.map((r) => (
            <button type="button" key={r.name}
              className={`pdi-bar-row${r.isOthers ? ' is-static' : ''}${selected === r.name ? ' is-selected' : ''}`}
              onClick={r.isOthers ? undefined : () => onSelect(selected === r.name ? null : r.name)}
              disabled={r.isOthers}>
              <span className="pdi-bar-label" title={r.name}>{r.name}</span>
              <span className="pdi-bar-track"><span className="pdi-bar-fill" style={{ width: `${(r.value / max) * 100}%`, display: 'block' }} /></span>
              <span className="pdi-bar-val">{r.value}</span>
            </button>
          ))}
        </div>
      )}
      {unrecorded > 0 && <div className="pdi-note" style={{ marginTop: 8 }}>{unrecorded} signal{unrecorded === 1 ? '' : 's'} from customers with no recorded location.</div>}
    </section>
  );
}

/* ── Comparison table ────────────────────────────────────────────────────── */
function Sparkline({ data, color }) {
  if (!data.some((d) => d.v > 0)) return <span className="pdi-note">—</span>;
  return (
    <div style={{ width: 72, height: 24 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.6} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ComparisonPanel({ stats, sparks, compareDays, onCompareDays, sparkMetric, onSparkMetric, selected, onSelect }) {
  return (
    <section className="pdi-panel" style={{ padding: 0 }}>
      <div style={{ padding: '14px 16px 0' }}>
        <PanelHead title="Product Demand Trend & Comparison" help="Trend compares the period with the previous equal period. Sparklines show the last 12 weeks.">
          <select className="pdi-select" value={compareDays} onChange={(e) => onCompareDays(Number(e.target.value))} aria-label="Trend period">
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
          <select className="pdi-select" value={sparkMetric} onChange={(e) => onSparkMetric(e.target.value)} aria-label="Sparkline metric">
            <option value="total">Total Signals</option>
            <option value="open">Open Requirements</option>
            <option value="intents">Buying Intents</option>
          </select>
        </PanelHead>
      </div>
      {stats.length === 0 ? (
        <div className="pdi-empty">No product demand for the current filters.</div>
      ) : (
        <div className="pdi-table-wrap" style={{ maxHeight: 268, overflowY: 'auto' }}>
          <table className="pdi-table pdi-table-compact">
            <thead>
              <tr>
                <th>Product</th>
                <th>Trend</th>
                <th className="c" title="Total signals">Signals</th>
                <th className="c" title="Open requirements">Open Reqs</th>
                <th className="c" title="Active buying intents">Intents</th>
                <th className="c">Customers</th>
                <th className="c">Locations</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.name} className={`is-clickable${selected === s.name ? ' is-selected' : ''}`} onClick={() => onSelect(selected === s.name ? null : s.name)}>
                  <td style={{ fontWeight: 600 }}><div className="pdi-cell-1line" style={{ maxWidth: 150 }} title={s.name}>{s.name}</div></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ minWidth: 46 }}><TrendValue stat={s} small /></span>
                      <Sparkline data={sparks[s.name] || []} color={s.tone === 'down' ? '#ef4444' : '#2563eb'} />
                    </div>
                  </td>
                  <td className="c">{s.total}</td>
                  <td className="c"><span className="pdi-num-red">{s.openRequirements}</span></td>
                  <td className="c"><span className="pdi-num-orange">{s.activeIntents}</span></td>
                  <td className="c">{s.customers}</td>
                  <td className="c"><span className="pdi-num-purple">{s.locations}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ── Distribution + Quick Insights ───────────────────────────────────────── */
const INSIGHT_ICONS = {
  up: <TrendingUp size={15} color="#16a34a" />,
  down: <TrendingDown size={15} color="#dc2626" />,
  flat: <Minus size={15} color="#64748b" />,
  customers: <Users size={15} color="#16a34a" />,
  locations: <MapPin size={15} color="#2563eb" />,
  open: <Target size={15} color="#dc2626" />,
};

export function DistributionPanel({ title, distribution, insights }) {
  const data = distribution.buckets.filter((b) => b.value > 0);
  return (
    <section className="pdi-panel">
      <div className="pdi-dist">
        <div>
          <PanelHead title={title} help="Every product signal falls in exactly one group, so the groups add up to the total." />
          {distribution.total === 0 ? (
            <div className="pdi-empty">No product signals for this selection.</div>
          ) : (
            <div className="pdi-donut-wrap">
              <div className="pdi-donut">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data} dataKey="value" nameKey="label" innerRadius={52} outerRadius={74} paddingAngle={1} stroke="none" isAnimationActive={false}>
                      {data.map((b) => <Cell key={b.key} fill={b.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pdi-donut-center"><b>{distribution.total}</b><small>Total Signals</small></div>
              </div>
              <ul className="pdi-dist-legend">
                {distribution.buckets.map((b) => (
                  <li key={b.key}><i style={{ background: b.color }} /><span>{b.label}</span><b>{b.value} ({b.pct}%)</b></li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <aside className="pdi-insights" aria-label="Quick insights">
          <h3><Lightbulb size={15} color="#f59e0b" /> Quick Insights</h3>
          <ul>
            {insights.map((it, i) => (
              <li key={i}><span className="pdi-ins-icon">{INSIGHT_ICONS[it.kind] || INSIGHT_ICONS.flat}</span><span>{it.text}</span></li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
