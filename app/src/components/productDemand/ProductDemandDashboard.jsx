import React, { useMemo, useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import './productDemand.css';
import {
  ProductCards, TrendPanel, TerritoryPanel, LocationsPanel, ComparisonPanel, DistributionPanel, PanelHead,
} from './DemandPanels';
import CustomerDemandTable from './CustomerDemandTable';
import { applyFilters, dateRangeBounds } from '../../lib/territoryDemand';
import {
  productStats, productSignals, productOf, locationOf, weeklySeries, territoryRanking, locationRanking,
  topWithOthers, statusDistribution, customerRows, quickInsights,
} from '../../lib/productDemandIntel';

/**
 * PDM-UI-REFERENCE-MATCH-01: Product Demand Intelligence body.
 * All panels derive from the same filtered signals; selection (product / territory /
 * location) narrows the dependent panels and the customer table consistently.
 * Props: signals (enriched v_demand_signals rows), filters (applied), productTable (node), truncated, now
 */
export default function ProductDemandDashboard({ signals, filters, productTable, truncated, now: nowProp }) {
  // Stable reference time for this mount (a fresh Date per render would defeat memoisation).
  const [now] = useState(() => nowProp || new Date());
  const [view, setView] = useState('cards');
  const [selectedProduct, setSelectedProduct] = useState(undefined); // undefined = auto (top product), null = all
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [trendMetric, setTrendMetric] = useState('total');
  const [locationMetric, setLocationMetric] = useState('total');
  const [compareDays, setCompareDays] = useState(30);
  const [sparkMetric, setSparkMetric] = useState('total');

  const filtered = useMemo(() => applyFilters(signals, { ...filters, now }), [signals, filters, now]);
  const base = useMemo(() => applyFilters(signals, { ...filters, dateFrom: '', dateTo: '', period: 'ALL', now }), [signals, filters, now]);
  const endMs = useMemo(() => {
    const b = dateRangeBounds('', filters.dateTo, now);
    return b && filters.dateTo ? Math.min(b.toMs, now.getTime()) : now.getTime();
  }, [filters.dateTo, now]);

  const stats30 = useMemo(() => productStats(filtered, base, { endMs, compareDays: 30 }), [filtered, base, endMs]);
  const statsCmp = useMemo(
    () => (compareDays === 30 ? stats30 : productStats(filtered, base, { endMs, compareDays })),
    [compareDays, stats30, filtered, base, endMs]
  );
  const productNames = stats30.map((s) => s.name);
  const top5 = productNames.slice(0, 5);

  const product = selectedProduct === undefined ? (stats30[0]?.name ?? null) : selectedProduct;

  // Drop selections that no longer exist under the applied filters.
  useEffect(() => {
    if (selectedProduct && !productNames.includes(selectedProduct)) setSelectedProduct(undefined);
  }, [productNames.join('|'), selectedProduct]); // eslint-disable-line react-hooks/exhaustive-deps

  const productRows = useMemo(
    () => (product ? productSignals(filtered).filter((s) => productOf(s) === product) : filtered),
    [filtered, product]
  );
  const territoryRows = useMemo(
    () => (selectedTerritory ? productRows.filter((s) => (s.territory_name || 'Unassigned') === selectedTerritory) : productRows),
    [productRows, selectedTerritory]
  );
  const scopeRows = useMemo(
    () => (selectedLocation ? territoryRows.filter((s) => locationOf(s) === selectedLocation) : territoryRows),
    [territoryRows, selectedLocation]
  );

  const terrRanking = useMemo(() => territoryRanking(productRows, 'total'), [productRows]);
  const locRanking = useMemo(() => locationRanking(territoryRows, locationMetric), [territoryRows, locationMetric]);
  const series = useMemo(() => weeklySeries(productSignals(base), top5, { endMs, metric: trendMetric }), [base, top5.join('|'), endMs, trendMetric]); // eslint-disable-line react-hooks/exhaustive-deps
  const sparks = useMemo(() => {
    const names = statsCmp.map((s) => s.name);
    const ws = weeklySeries(productSignals(base), names, { endMs, metric: sparkMetric });
    return Object.fromEntries(names.map((n) => [n, ws.map((b) => ({ v: b[n] }))]));
  }, [statsCmp, base, endMs, sparkMetric]);
  const distribution = useMemo(() => statusDistribution(scopeRows), [scopeRows]);
  const selectedStat = product ? stats30.find((s) => s.name === product) : null;
  const insights = useMemo(() => quickInsights(selectedStat, scopeRows), [selectedStat, scopeRows]);
  const customers = useMemo(() => customerRows(scopeRows), [scopeRows]);

  const scopeLabel = product || 'All products';
  const selectProduct = (name) => { setSelectedProduct(name); setSelectedTerritory(null); setSelectedLocation(null); };
  const chips = [
    product && { key: 'p', label: `Product: ${product}`, onClear: () => selectProduct(null) },
    selectedTerritory && { key: 't', label: `Territory: ${selectedTerritory}`, onClear: () => { setSelectedTerritory(null); setSelectedLocation(null); } },
    selectedLocation && { key: 'l', label: `Location: ${selectedLocation}`, onClear: () => setSelectedLocation(null) },
  ].filter(Boolean);

  return (
    <>
      {truncated && (
        <div className="pdi-warn"><AlertTriangle size={14} /> Signal loading stopped at the safety limit; totals may be incomplete.</div>
      )}

      {/* B. Product-wise Demand Overview */}
      <section className="pdi-panel">
        <PanelHead title="Product-wise Demand Overview" help="Products from requirements and buying intents. Trend compares the last 30 days with the 30 days before.">
          <div className="pdi-toggle" role="group" aria-label="View as">
            <span>View as:</span>
            <button type="button" className={view === 'cards' ? 'is-active' : ''} onClick={() => setView('cards')} aria-pressed={view === 'cards'}>Product Cards</button>
            <button type="button" className={view === 'table' ? 'is-active' : ''} onClick={() => setView('table')} aria-pressed={view === 'table'}>Product Table</button>
          </div>
        </PanelHead>
        {view === 'cards'
          ? <ProductCards stats={stats30} selected={product} onSelect={selectProduct} />
          : productTable}
      </section>

      {/* C. Trend | Territory | Top locations */}
      <div className="pdi-row3">
        <TrendPanel series={series} products={top5} metric={trendMetric} onMetric={setTrendMetric} />
        <TerritoryPanel
          ranking={terrRanking}
          rankingTop={topWithOthers(terrRanking, 7)}
          products={productNames}
          product={product}
          onProduct={selectProduct}
          selected={selectedTerritory}
          onSelect={(t) => { setSelectedTerritory(t); setSelectedLocation(null); }}
        />
        <LocationsPanel
          title={`Top Locations for ${scopeLabel}`}
          rows={topWithOthers(locRanking.rows, 7)}
          unrecorded={locRanking.unrecorded}
          metric={locationMetric}
          onMetric={setLocationMetric}
          selected={selectedLocation}
          onSelect={setSelectedLocation}
        />
      </div>

      {/* D. Comparison | Distribution + insights */}
      <div className="pdi-row2">
        <ComparisonPanel
          stats={statsCmp}
          sparks={sparks}
          compareDays={compareDays}
          onCompareDays={setCompareDays}
          sparkMetric={sparkMetric}
          onSparkMetric={setSparkMetric}
          selected={product}
          onSelect={selectProduct}
        />
        <DistributionPanel title={`Product Distribution by Demand Status (${scopeLabel})`} distribution={distribution} insights={insights} />
      </div>

      {/* E. Customer & Location details */}
      <CustomerDemandTable rows={customers} scopeLabel={scopeLabel} chips={chips} />
    </>
  );
}
