import React, { useEffect, useState, useContext, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link } from 'react-router-dom';
import { Layers, Package, ChevronDown, ChevronRight, Activity, TrendingUp, DollarSign, CheckCircle2, RefreshCw, AlertTriangle, Calendar, MapPin, Boxes, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ProductDemandDashboard from '../components/productDemand/ProductDemandDashboard';
import { applyFilters } from '../lib/territoryDemand';

// PDM-UI-REFERENCE-MATCH-01: Product Demand Intelligence.
// Pagination protects against the API's default 1,000-row response limit.
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;        // safety stop at 50,000 signals (flagged in the UI if reached)
const PARTY_CHUNK = 200;     // keeps .in() URLs short

const DEFAULT_FILTERS = { dateFrom: '', dateTo: '', territory: 'All', category: 'All', signalType: 'All' };

async function fetchAllSignals(buildQuery) {
  const rows = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    // Deterministic order across pages: date, then signal identity.
    const { data, error } = await buildQuery()
      .order('signal_date', { ascending: false })
      .order('signal_type', { ascending: true })
      .order('source_id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

async function fetchParties(partyIds) {
  const map = {};
  let withLocation = true;
  for (let i = 0; i < partyIds.length; i += PARTY_CHUNK) {
    const ids = partyIds.slice(i, i + PARTY_CHUNK);
    let res = withLocation
      ? await supabase.from('crm_parties').select('id, city, state, crm_territories(name)').in('id', ids)
      : null;
    if (!res || res.error) {
      // city/state unavailable: fall back to territory only (never break the page).
      withLocation = false;
      res = await supabase.from('crm_parties').select('id, crm_territories(name)').in('id', ids);
    }
    if (res.error) throw res.error;
    (res.data || []).forEach((p) => {
      const label = [p.city, p.state].map((v) => (v || '').trim()).filter(Boolean).join(', ');
      map[p.id] = { territory_name: p.crm_territories?.name, location_label: label || null };
    });
  }
  return map;
}

/** Original category-grouped product table (unchanged behaviour), used by the "Product Table" view. */
function ProductCategoryTable({ signals }) {
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const toggleProduct = (prodKey) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(prodKey)) next.delete(prodKey);
      else next.add(prodKey);
      return next;
    });
  };

  const groupedByCategory = useMemo(() => {
    const groups = {};
    signals.forEach(s => {
      const cat = s.product_category || 'Uncategorized';
      const prod = s.standardized_product_name || 'Unknown';
      if (!groups[cat]) groups[cat] = { category: cat, products: {} };
      if (!groups[cat].products[prod]) groups[cat].products[prod] = { name: prod, reqCount: 0, intentCount: 0, txnCount: 0, signals: [] };
      const p = groups[cat].products[prod];
      p.signals.push(s);
      if (s.signal_type === 'Stated Requirement') p.reqCount++;
      else if (s.signal_type === 'Commercial Intent') p.intentCount++;
      else if (s.signal_type === 'Tally Transaction' || s.signal_type === 'Repeat Purchase Evidence') p.txnCount++;
    });
    const sortedGroups = Object.values(groups).sort((a, b) => a.category.localeCompare(b.category));
    sortedGroups.forEach(g => {
      g.products = Object.values(g.products).sort((a, b) => a.name.localeCompare(b.name));
    });
    return sortedGroups;
  }, [signals]);

  if (groupedByCategory.length === 0) {
    return <div className="pdi-empty">No product demand signals found.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {groupedByCategory.map(catGroup => (
        <div key={catGroup.category} style={{ border: '1px solid #e5e9f2', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '0.6rem 1rem', background: '#1e3a8a', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 13 }}>
            <Package size={16} /> {catGroup.category}
          </div>
          <div className="pdi-table-wrap">
            <table className="pdi-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>Product Name</th>
                  <th className="c">Total Signals</th>
                  <th className="c">Open Reqs</th>
                  <th className="c">Active Intents</th>
                  <th className="c">Transactions</th>
                </tr>
              </thead>
              <tbody>
                {catGroup.products.map(prod => {
                  const prodKey = `${catGroup.category}-${prod.name}`;
                  const isExpanded = expandedProducts.has(prodKey);
                  return (
                    <React.Fragment key={prodKey}>
                      <tr className="is-clickable" style={{ background: isExpanded ? '#f8fafc' : undefined }} onClick={() => toggleProduct(prodKey)}>
                        <td className="c" style={{ color: '#94a3b8' }}>{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                        <td style={{ fontWeight: 600 }}>{prod.name}</td>
                        <td className="c" style={{ fontWeight: 600 }}>{prod.signals.length}</td>
                        <td className="c">{prod.reqCount > 0 ? <span className="badge badge-success">{prod.reqCount}</span> : <span className="text-muted">-</span>}</td>
                        <td className="c">{prod.intentCount > 0 ? <span className="badge badge-primary">{prod.intentCount}</span> : <span className="text-muted">-</span>}</td>
                        <td className="c">{prod.txnCount > 0 ? <span className="text-success" style={{ fontWeight: 600 }}>{prod.txnCount}</span> : <span className="text-muted">-</span>}</td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td></td>
                          <td colSpan="5" style={{ paddingTop: 0 }}>
                            <table style={{ width: '100%', fontSize: '0.8rem' }}>
                              <tbody>
                                {prod.signals.map((s, idx) => (
                                  <tr key={idx} style={{ borderBottom: idx < prod.signals.length - 1 ? '1px solid #eef2f7' : 'none' }}>
                                    <td style={{ padding: '0.4rem', width: '110px' }}>
                                      {s.signal_type === 'Stated Requirement' && <span className="text-success"><CheckCircle2 size={12}/> Req</span>}
                                      {s.signal_type === 'Commercial Intent' && <span className="text-primary"><TrendingUp size={12}/> Intent</span>}
                                      {s.signal_type === 'Tally Transaction' && <span className="text-success"><DollarSign size={12}/> Tally</span>}
                                      {s.signal_type === 'Repeat Purchase Evidence' && <span className="text-warning"><Activity size={12}/> Patrn</span>}
                                    </td>
                                    <td style={{ padding: '0.4rem', width: '140px', color: '#64748b' }}>
                                      {(() => { try { return format(parseISO(s.signal_date), 'MMM dd, HH:mm'); } catch { return '—'; } })()}
                                    </td>
                                    <td style={{ padding: '0.4rem', fontWeight: 500 }}>
                                      <Link to={`/customers/${s.party_id}`} className="text-primary" onClick={e => e.stopPropagation()}>{s.party_name}</Link>
                                      {s.territory_name && <span className="text-muted" style={{ fontSize: '0.72rem', marginLeft: '0.5rem' }}>[{s.territory_name}]</span>}
                                    </td>
                                    <td style={{ padding: '0.4rem' }}>{s.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProductDemand() {
  const { userProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signals, setSignals] = useState([]);
  const [truncated, setTruncated] = useState(false);

  // Header filters: edited as a draft, applied with the Apply button.
  const [draft, setDraft] = useState(DEFAULT_FILTERS);
  const [applied, setApplied] = useState(DEFAULT_FILTERS);

  useEffect(() => {
    fetchData();
  }, [userProfile]);

  async function fetchData() {
    if (!userProfile) return; // Wait for profile

    setLoading(true);
    setError(null);
    try {
      // 1. Base demand signals (paged; non-admins see their own customers, as before)
      const buildQuery = () => {
        let q = supabase.from('v_demand_signals').select('*');
        if (userProfile.role !== 'Admin') q = q.eq('assigned_owner_id', userProfile.id);
        return q;
      };
      const { rows: rawSignals, truncated: hitLimit } = await fetchAllSignals(buildQuery);
      setTruncated(hitLimit);

      // 2. Products to get categories
      const { data: productsData } = await supabase.from('products').select('name, category');
      const productsMap = {};
      (productsData || []).forEach(p => { productsMap[p.name] = p; });

      // 3. Territory and recorded location for the involved parties
      const partyIds = [...new Set(rawSignals.map(s => s.party_id).filter(Boolean))];
      const customerMap = partyIds.length ? await fetchParties(partyIds) : {};

      // 4. Client-side join (mirrors v_product_demand_signals)
      const enriched = rawSignals.map(ds => {
        const prod = productsMap[ds.product_reference] || {};
        const cust = customerMap[ds.party_id] || {};
        return {
          ...ds,
          product_category: prod.category || 'Uncategorized',
          standardized_product_name: prod.name || ds.product_reference || 'Unknown',
          territory_name: cust.territory_name,
          location_label: cust.location_label || null,
        };
      });

      // 5. Same ordering as before (category, product, newest first)
      enriched.sort((a, b) => {
        if (a.product_category !== b.product_category) return (a.product_category || '').localeCompare(b.product_category || '');
        if (a.standardized_product_name !== b.standardized_product_name) return (a.standardized_product_name || '').localeCompare(b.standardized_product_name || '');
        return new Date(b.signal_date) - new Date(a.signal_date);
      });

      setSignals(enriched);
    } catch (err) {
      console.error("Product demand data load error:", err?.message);
      setError(err?.code === '42501'
        ? "You don't have permission to view product demand data."
        : (err?.message || "Failed to load product demand data."));
    } finally {
      setLoading(false);
    }
  }

  const territories = useMemo(() => [...new Set(signals.map(s => s.territory_name).filter(Boolean))].sort(), [signals]);
  const categories = useMemo(() => [...new Set(signals.map(s => s.product_category || 'Uncategorized'))].sort(), [signals]);
  const tableSignals = useMemo(() => applyFilters(signals, applied), [signals, applied]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);
  const setD = (k) => (e) => setDraft(d => ({ ...d, [k]: e.target.value }));

  const header = (
    <header className="pdi-header">
      <div className="pdi-title">
        <Layers size={34} color="#2563eb" strokeWidth={2.2} aria-hidden="true" />
        <div>
          <h1>Product Demand Intelligence</h1>
          <p>Understand what products are in demand, where the demand is coming from, and which customers need follow-up.</p>
        </div>
      </div>
      <form className="pdi-filters" onSubmit={(e) => { e.preventDefault(); setApplied(draft); }}>
        <label className="pdi-control" title="Date range (leave empty for all dates)">
          <Calendar size={15} color="#475569" />
          <input type="date" value={draft.dateFrom} max={draft.dateTo || undefined} onChange={setD('dateFrom')} aria-label="From date" />
          <span style={{ color: '#94a3b8' }}>–</span>
          <input type="date" value={draft.dateTo} min={draft.dateFrom || undefined} onChange={setD('dateTo')} aria-label="To date" />
        </label>
        <label className="pdi-control">
          <MapPin size={15} color="#475569" />
          <select value={draft.territory} onChange={setD('territory')} aria-label="Territory">
            <option value="All">All Territories</option>
            {territories.map(t => <option key={t} value={t}>{t}</option>)}
            <option value="Unassigned">Unassigned</option>
          </select>
        </label>
        <label className="pdi-control">
          <Boxes size={15} color="#475569" />
          <select value={draft.category} onChange={setD('category')} aria-label="Category">
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="pdi-control">
          <Filter size={15} color="#475569" />
          <select value={draft.signalType} onChange={setD('signalType')} aria-label="Signal type">
            <option value="All">All Signal Types</option>
            <option value="Stated Requirement">Requirements</option>
            <option value="Commercial Intent">Buying Intents</option>
            <option value="Tally Transaction">Transactions</option>
          </select>
        </label>
        <button type="submit" className="pdi-apply" title={dirty ? 'Apply the selected filters' : 'Filters are applied'}>Apply</button>
      </form>
    </header>
  );

  if (loading) return (
    <div className="pdi-page">
      {header}
      <div className="pdi-panel" style={{ height: 180, marginBottom: 12, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
      <div className="pdi-panel" style={{ height: 260, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
    </div>
  );

  if (error) return (
    <div className="pdi-page">
      {header}
      <div className="pdi-panel" style={{ padding: '2rem', textAlign: 'center', maxWidth: 460, margin: '2rem auto', borderTop: '4px solid var(--danger)' }}>
        <AlertTriangle size={32} className="text-danger" style={{ marginBottom: '1rem' }} />
        <h3 style={{ margin: '0 0 1rem 0' }}>Data Fetch Failed</h3>
        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>{error}</p>
        <button className="btn btn-secondary" onClick={fetchData} style={{ margin: '0 auto' }}>
          <RefreshCw size={16} style={{ marginRight: '0.5rem' }} /> Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="pdi-page animate-fade-in">
      {header}
      <ProductDemandDashboard
        signals={signals}
        filters={applied}
        truncated={truncated}
        productTable={<ProductCategoryTable signals={tableSignals} />}
      />
    </div>
  );
}
