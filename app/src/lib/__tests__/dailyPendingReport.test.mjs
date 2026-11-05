import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRequirementPendingQty,
  isRequirementPending,
  formatOrderDate,
  formatMT,
  extractItemWeight,
  extractGiftDetails,
  filterPendingRequirements,
  computeDailyPendingReport,
  generateWhatsAppReportText,
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

test('formatOrderDate: formats in DD-MM-YYYY Indian local date', () => {
  assert.equal(formatOrderDate('2026-11-05T04:30:00.000Z'), '05-11-2026');
  assert.equal(formatOrderDate('2026-10-24'), '24-10-2026');
  assert.equal(formatOrderDate(null), 'Date Not Available');
});

test('Weight calculation & validation: calculates exact MT and handles missing weight without assuming 50kg', () => {
  // Valid weight: 110 Bags × 40 kg = 4,400 kg = 4.400 MT
  assert.equal(formatMT(4400), '4.400 MT');
  assert.equal(extractItemWeight({ weight: 40 }), 40);

  // Missing weight: never assume 50kg, never guess from name
  assert.equal(extractItemWeight({ weight: null, product_name: 'Super Feed (50 kg)' }), null);
  assert.equal(extractItemWeight({}), null);

  const reqWithMissingWeight = {
    id: 'req-missing-w',
    customer_name: 'Kisan Feeds',
    party_id: 'cust-1',
    created_at: '2026-11-05T05:00:00Z',
    requirement_items: [
      { product_name: 'Feed A', quantity: 50, weight: null },
    ],
  };

  const report = computeDailyPendingReport([reqWithMissingWeight]);
  assert.equal(report.hasMissingWeightOverall, true);
  assert.equal(report.customerList[0].hasMissingWeight, true);

  const text = generateWhatsAppReportText(report);
  assert.match(text, /Feed A: 50 Bags \(Weight Not Available\)/);
  assert.match(text, /⚠️ Incomplete|Weight Not Available/);
});

test('Customer-wise report with gifts: conforms exactly to Section 1 reference structure', () => {
  const req = {
    id: 'req-1',
    customer_name: 'Sharma Poultry Farm',
    party_id: 'p-1',
    created_at: '2026-11-02T10:00:00Z',
    requirement_items: [
      { product_name: 'Broiler Pre-Starter', quantity: 50, weight: 50 },
      { product_name: 'Broiler Starter', quantity: 60, weight: 40, gift: 'Steel Bucket × 2' },
    ],
  };

  const report = computeDailyPendingReport([req]);
  assert.equal(report.totalPendingBags, 110);
  // (50 * 50) + (60 * 40) = 2500 + 2400 = 4900 kg = 4.900 MT
  assert.equal(report.totalPendingWeightMT, '4.900');
  assert.equal(report.customerList.length, 1);
  assert.equal(report.customerList[0].orders[0].orderDate, '02-11-2026');

  const text = generateWhatsAppReportText(report);

  const expected = `👥 *CUSTOMER-WISE PENDING ORDERS*
━━━━━━━━━━━━━━━━━━

1. *Sharma Poultry Farm*
📅 Order Date: 02-11-2026

• Broiler Pre-Starter: 50 Bags × 50 kg
• Broiler Starter: 60 Bags × 40 kg

🎁 Gift: Steel Bucket × 2

📦 Total: 110 Bags
⚖️ Total Weight: 4.900 MT

━━━━━━━━━━━━━━━━━━

📌 *TOTAL PENDING*
📦 110 Bags
⚖️ 4.900 MT

🎁 *PENDING GIFTS SUMMARY*
Steel Bucket: 2 Nos

*Report generated from Shubh Labh CRM*`;

  assert.equal(text, expected);
});

test('Multiple orders with different dates for one customer: preserves individual order dates', () => {
  const req1 = {
    id: 'order-1',
    customer_name: 'Apex Traders',
    party_id: 'apex-1',
    created_at: '2026-11-01T04:00:00Z',
    requirement_items: [
      { product_name: 'Layer Mash', quantity: 40, weight: 50 },
    ],
  };

  const req2 = {
    id: 'order-2',
    customer_name: 'Apex Traders',
    party_id: 'apex-1',
    created_at: '2026-11-04T04:00:00Z',
    requirement_items: [
      { product_name: 'Layer Grower', quantity: 60, weight: 50 },
    ],
  };

  const report = computeDailyPendingReport([req1, req2]);
  assert.equal(report.totalCustomers, 1);
  assert.equal(report.totalPendingBags, 100);
  assert.equal(report.customerList[0].orders.length, 2);
  assert.equal(report.customerList[0].orders[0].orderDate, '01-11-2026');
  assert.equal(report.customerList[0].orders[1].orderDate, '04-11-2026');

  const text = generateWhatsAppReportText(report);
  assert.match(text, /📅 Order Date: 01-11-2026/);
  assert.match(text, /📅 Order Date: 04-11-2026/);
  assert.match(text, /📦 Total: 100 Bags/);
  assert.match(text, /⚖️ Total Weight: 5\.000 MT/);
});

test('Empty gifts: omits gift section when customer has no gift', () => {
  const req = {
    id: 'order-no-gift',
    customer_name: 'Modern Feed Store',
    party_id: 'm-1',
    created_at: '2026-11-05T04:00:00Z',
    requirement_items: [
      { product_name: 'Chicks Mash', quantity: 20, weight: 50, gift: 'None' },
    ],
  };

  const report = computeDailyPendingReport([req]);
  const text = generateWhatsAppReportText(report);

  assert.equal(text.includes('🎁 Gift:'), false);
  assert.equal(text.includes('PENDING GIFTS SUMMARY'), false);
});

test('Empty state: generates graceful fallback when 0 orders pending', () => {
  const emptyReport = computeDailyPendingReport([]);
  const text = generateWhatsAppReportText(emptyReport);

  assert.match(text, /No pending dispatch requirements found for this date/);
});
