import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Download, Eye, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import { PanelHead } from './DemandPanels';
import {
  CUSTOMER_STATUSES, LOCATION_NOT_RECORDED, filterAndSortCustomers, customersToCsv,
} from '../../lib/productDemandIntel';

/** PDM-UI-REFERENCE-MATCH-01: Customer & Location Demand Details. */

const STATUS_CLASS = {
  'Open requirement': 's-open',
  'Active intent': 's-intent',
  'Transaction recorded': 's-tx',
  'No open demand': 's-none',
};
const PAGE = 15;
const fmtDate = (ms) => format(new Date(ms), 'dd MMM yyyy');

export default function CustomerDemandTable({ rows, scopeLabel, chips }) {
  // With a single product selected the product name is redundant on every row.
  const showProduct = scopeLabel === 'All products';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState('lastDate');
  const [limit, setLimit] = useState(PAGE);

  const visible = useMemo(() => filterAndSortCustomers(rows, { search, status, sort }), [rows, search, status, sort]);

  const exportCsv = () => {
    const csv = customersToCsv(visible, fmtDate);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-demand-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="pdi-panel pdi-full" style={{ padding: 0 }}>
      <div style={{ padding: '14px 16px 10px' }}>
        <PanelHead title={`Customer & Location Demand Details (${scopeLabel})`} help="One row per customer with demand in the current filters and selection.">
          <span className="pdi-search-wrap">
            <Search size={14} />
            <input className="pdi-search" type="search" placeholder="Search customer, location or product..." value={search}
              onChange={(e) => { setSearch(e.target.value); setLimit(PAGE); }} aria-label="Search customers" />
          </span>
          <select className="pdi-select" value={status} onChange={(e) => { setStatus(e.target.value); setLimit(PAGE); }} aria-label="Demand status">
            <option value="All">All Demand Status</option>
            {CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="pdi-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="lastDate">Sort by: Last Demand Date</option>
            <option value="signals">Sort by: Total Signals</option>
            <option value="name">Sort by: Customer Name</option>
          </select>
          <button type="button" className="pdi-btn" onClick={exportCsv} disabled={visible.length === 0} title="Download the rows shown as CSV">
            <Download size={14} /> Export
          </button>
        </PanelHead>
        {chips.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {chips.map((c) => (
              <span className="pdi-chip" key={c.key}>
                {c.label}
                <button type="button" onClick={c.onClear} aria-label={`Clear ${c.label}`}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
      </div>
      {visible.length === 0 ? (
        <div className="pdi-empty">{rows.length === 0 ? 'No customers with recorded demand for this selection.' : 'No customers match the search or status filter.'}</div>
      ) : (
        <>
          <div className="pdi-table-wrap">
            <table className="pdi-table">
              <thead>
                <tr>
                  <th className="c" style={{ width: 36 }}>#</th>
                  <th>Customer Name</th>
                  <th>Location / Territory</th>
                  <th className="c">Total Signals</th>
                  <th className="c">Open Reqs</th>
                  <th className="c">Buying Intents</th>
                  <th>Last Demand Date</th>
                  <th>Latest Signal</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, limit).map((r, i) => (
                  <tr key={r.partyId}>
                    <td className="c">{i + 1}</td>
                    <td style={{ fontWeight: 500 }}><div className="pdi-cell-1line" title={r.name}>{r.name}</div></td>
                    <td>
                      <div className="pdi-cell-1line" title={`${r.location || LOCATION_NOT_RECORDED} · ${r.territory}`}>
                        {r.location || <span className="pdi-note">{LOCATION_NOT_RECORDED}</span>}
                        <span className="pdi-note"> · {r.territory}</span>
                      </div>
                    </td>
                    <td className="c">{r.total}</td>
                    <td className="c">{r.openRequirements > 0 ? <span className="pdi-num-red">{r.openRequirements}</span> : 0}</td>
                    <td className="c">{r.activeIntents}</td>
                    <td>{r.lastMs ? fmtDate(r.lastMs) : <span className="pdi-note">No dated signal</span>}</td>
                    <td>
                      <div className="pdi-cell-1line" title={r.latestProduct ? `${r.latestSignal} · ${r.latestProduct}` : r.latestSignal}>
                        {r.latestSignal}
                        {showProduct && r.latestProduct && <span className="pdi-note"> · {r.latestProduct}</span>}
                      </div>
                    </td>
                    <td><span className={`pdi-status ${STATUS_CLASS[r.status]}`}>{r.status}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link className="pdi-action" to={`/customers/${r.partyId}`} title="View customer" aria-label={`View ${r.name}`}><Eye size={14} /></Link>
                      {r.latestRequirementId && (
                        <Link className="pdi-action" to={`/requirements/${r.latestRequirementId}`} title="Open latest requirement" aria-label={`Open latest requirement for ${r.name}`}><FileText size={14} /></Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px 12px' }} className="pdi-note">
            <span>Showing {Math.min(limit, visible.length)} of {visible.length} customers</span>
            {visible.length > limit && <button type="button" className="pdi-btn" onClick={() => setLimit((l) => l + PAGE)}>Show more</button>}
          </div>
        </>
      )}
    </section>
  );
}
