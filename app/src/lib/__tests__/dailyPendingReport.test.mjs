import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRequirementPendingQty,
  isRequirementPending,
  formatOrderDate,
  formatMT,
  formatProductRow,
  extractItemWeight,
  extractGiftDetails,
  filterPendingRequirements,
  computeDailyPendingReport,
  generateWhatsAppReportText,
  SEPARATOR,
} from '../dailyPendingReport.js';

test('isRequirementPending: identifies active pending and excludes closed/dispatched', () => {
  assert.equal(isRequirementPending({
    status: 'Identified',
    required_quantity: 100,
    total_dispatched_quantity: 0,
    dispatch_progress: 'Not Dispatched',
  }), true);

  assert.equal(isRequirementPending({
    status: 'Dispatched',
    required_quantity: 100,
    total_dispatched_quantity: 100,
    dispatch_progress: 'Fully Dispatched',
  }), false);

  assert.equal(isRequirementPending({
    status: 'Cancelled',
    required_quantity: 50,
  }), false);
});

test('formatProductRow: formats table row columns Product | Bags | Kg/Bag | Total MT', () => {
  // Short product name
  const row1 = formatProductRow('PRODUCT NAME', 45, 45);
  // Column alignment check matching prompt example
  assert.equal(row1, 'PRODUCT NAME          45      45      2.025');

  const row2 = formatProductRow('PRODUCT NAME', 250, 50);
  assert.equal(row2, 'PRODUCT NAME         250      50     12.500');

  // Unknown bag weight
  const rowMissing = formatProductRow('UNKNOWN FEED', 50, null);
  assert.match(rowMissing, /UNKNOWN FEED/);
  assert.match(rowMissing, /—/);

  // Long product name wraps naturally on first line
  const longRow = formatProductRow('SUPER PREMIUM BROILER CONCENTRATE', 80, 50);
  const lines = longRow.split('\n');
  assert.equal(lines[0], 'SUPER PREMIUM BROILER CONCENTRATE');
  assert.match(lines[1], /80/);
  assert.match(lines[1], /4\.000/);
});

test('Customer with multiple products on one date matching SL-REQ-WHATSAPP-REPORT-FORMAT-02 reference', () => {
  const req = {
    id: 'req-multi-prod',
    customer_name: 'CUSTOMER NAME',
    party_id: 'cust-1',
    created_at: '2026-11-05T04:30:00Z',
    requirement_items: [
      { product_name: 'PRODUCT NAME', quantity: 45, weight: 45 },
      { product_name: 'PRODUCT NAME', quantity: 250, weight: 50, gift: 'GIFT NAME × QTY' },
    ],
  };

  const report = computeDailyPendingReport([req]);
  assert.equal(report.totalPendingBags, 295);
  // (45*45) + (250*50) = 2025 + 12500 = 14525 kg = 14.525 MT
  assert.equal(report.totalPendingWeightMT, '14.525');

  const text = generateWhatsAppReportText(report);

  assert.match(text, /👥 \*CUSTOMER-WISE PENDING ORDERS\*/);
  assert.match(text, /\*1\. CUSTOMER NAME\*/);
  assert.match(text, /📅 05-11-2026/);
  assert.match(text, /Product             Bags   Kg\/Bag   Total MT/);
  assert.match(text, /📦 Total: \*295 Bags\*/);
  assert.match(text, /⚖️ Weight: \*14\.525 MT\*/);
  assert.match(text, /🎁 Gift: GIFT NAME × QTY/);
  assert.match(text, /📌 \*GRAND TOTAL PENDING\*/);
  assert.match(text, /📦 Total Bags: \*295 Bags\*/);
  assert.match(text, /⚖️ Available Weight: \*14\.525 MT\*/);
});

test('Customer with orders on multiple dates: displays separate date sections under same customer', () => {
  const req1 = {
    id: 'order-1',
    customer_name: 'BALAJI FEEDS',
    party_id: 'p-1',
    created_at: '2026-11-01T05:00:00Z',
    requirement_items: [
      { product_name: 'FEED A', quantity: 40, weight: 50 },
    ],
  };

  const req2 = {
    id: 'order-2',
    customer_name: 'BALAJI FEEDS',
    party_id: 'p-1',
    created_at: '2026-11-04T05:00:00Z',
    requirement_items: [
      { product_name: 'FEED B', quantity: 60, weight: 50 },
    ],
  };

  const report = computeDailyPendingReport([req1, req2]);
  assert.equal(report.totalCustomers, 1);
  assert.equal(report.totalPendingBags, 100);

  const text = generateWhatsAppReportText(report);
  assert.match(text, /\*1\. BALAJI FEEDS\*/);
  assert.match(text, /📅 01-11-2026/);
  assert.match(text, /📅 04-11-2026/);
  assert.match(text, /📦 Total Bags: \*100 Bags\*/);
});

test('Product with unknown bag weight: shows — and flags ⚠️ Weight incomplete & Some product weights unavailable', () => {
  const req = {
    id: 'req-unknown-w',
    customer_name: 'RAMESH TRADERS',
    party_id: 'rt-1',
    created_at: '2026-11-05T05:00:00Z',
    requirement_items: [
      { product_name: 'MYSTERY FEED', quantity: 100, weight: null },
    ],
  };

  const report = computeDailyPendingReport([req]);
  assert.equal(report.hasMissingWeightOverall, true);
  assert.equal(report.customerList[0].hasMissingWeight, true);

  const text = generateWhatsAppReportText(report);
  assert.match(text, /—/);
  assert.match(text, /⚠️ Weight incomplete/);
  assert.match(text, /⚠️ Some product weights are unavailable\./);
});

test('Gift with quantity unspecified: formats as 🎁 Gift: GIFT NAME × Qty Not Specified and summary Committed — Quantity Not Specified', () => {
  const req = {
    id: 'req-gift-unspec',
    customer_name: 'KISAN AGRO',
    party_id: 'ka-1',
    created_at: '2026-11-05T05:00:00Z',
    requirement_items: [
      { product_name: 'SOYA DOC', quantity: 50, weight: 50, gift: 'STEEL BUCKET' },
    ],
  };

  const report = computeDailyPendingReport([req]);
  const text = generateWhatsAppReportText(report);

  assert.match(text, /🎁 Gift: STEEL BUCKET × Qty Not Specified/);
  assert.match(text, /🎁 \*PENDING GIFTS\*/);
  assert.match(text, /STEEL BUCKET: Committed — Quantity Not Specified/);
});

test('Customer location: displays 📍 LOCATION on a separate line when available', () => {
  const req = {
    id: 'req-loc',
    customer_name: 'SHREE RAM FEED',
    customer_city: 'Indore',
    party_id: 'srf-1',
    created_at: '2026-11-05T05:00:00Z',
    requirement_items: [
      { product_name: 'FEED X', quantity: 20, weight: 50 },
    ],
  };

  const report = computeDailyPendingReport([req]);
  const text = generateWhatsAppReportText(report);

  assert.match(text, /\*1\. SHREE RAM FEED\*\n📍 INDORE/);
});

test('Multiple customers and grand total: sums correctly without double counting', () => {
  const req1 = {
    id: 'r1',
    customer_name: 'CUSTOMER ONE',
    party_id: 'c1',
    created_at: '2026-11-05T05:00:00Z',
    requirement_items: [{ product_name: 'P1', quantity: 50, weight: 50 }],
  };
  const req2 = {
    id: 'r2',
    customer_name: 'CUSTOMER TWO',
    party_id: 'c2',
    created_at: '2026-11-05T05:00:00Z',
    requirement_items: [{ product_name: 'P2', quantity: 150, weight: 40 }],
  };

  const report = computeDailyPendingReport([req1, req2]);
  assert.equal(report.totalCustomers, 2);
  assert.equal(report.totalPendingBags, 200);
  // (50*50) + (150*40) = 2500 + 6000 = 8500 kg = 8.500 MT
  assert.equal(report.totalPendingWeightMT, '8.500');

  const text = generateWhatsAppReportText(report);
  assert.match(text, /\*1\. CUSTOMER TWO\*/);
  assert.match(text, /\*2\. CUSTOMER ONE\*/);
  assert.match(text, /📦 Total Bags: \*200 Bags\*/);
  assert.match(text, /⚖️ Available Weight: \*8\.500 MT\*/);
});
