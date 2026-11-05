import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRequirementPendingQty,
  isRequirementPending,
  formatDateForDisplay,
  filterPendingRequirements,
  computeDailyPendingReport,
  generateWhatsAppReportText,
} from '../dailyPendingReport.js';

test('isRequirementPending: identifies undispatched and filters out completed or closed', () => {
  // Undispatched active requirement
  const r1 = {
    id: 'req-1',
    status: 'Identified',
    required_quantity: 100,
    total_dispatched_quantity: 0,
    dispatch_progress: 'Not Dispatched',
  };
  assert.equal(isRequirementPending(r1), true);
  assert.equal(calculateRequirementPendingQty(r1), 100);

  // Partially dispatched requirement
  const r2 = {
    id: 'req-2',
    status: 'Commercial Intent',
    required_quantity: 100,
    total_dispatched_quantity: 30,
    dispatch_progress: 'Partially Dispatched',
  };
  assert.equal(isRequirementPending(r2), true);
  assert.equal(calculateRequirementPendingQty(r2), 70);

  // Fully dispatched
  const r3 = {
    id: 'req-3',
    status: 'Dispatched',
    required_quantity: 100,
    total_dispatched_quantity: 100,
    dispatch_progress: 'Fully Dispatched',
  };
  assert.equal(isRequirementPending(r3), false);

  // Closed / Cancelled
  const r4 = {
    id: 'req-4',
    status: 'Cancelled',
    required_quantity: 50,
    total_dispatched_quantity: 0,
  };
  assert.equal(isRequirementPending(r4), false);

  const r5 = {
    id: 'req-5',
    status: 'Closed',
    required_quantity: 50,
    total_dispatched_quantity: 0,
  };
  assert.equal(isRequirementPending(r5), false);
});

test('Multi-product requirements: calculates product-wise quantities without double-counting', () => {
  const reqWithItems = {
    id: 'req-multi',
    status: 'Qualified',
    customer_name: 'Shree Krishna Agro',
    party_id: 'party-1',
    expected_date: '2026-11-05',
    total_dispatched_quantity: 0,
    requirement_items: [
      { id: 'item-1', product_name: 'Mustard Cake', quantity: 60, unit: 'Bags' },
      { id: 'item-2', product_name: 'Soya DOC', quantity: 40, unit: 'Bags' },
    ],
  };

  assert.equal(calculateRequirementPendingQty(reqWithItems), 100);

  const report = computeDailyPendingReport([reqWithItems], '2026-11-05');
  assert.equal(report.totalRequirements, 1);
  assert.equal(report.totalBags, 100);
  assert.equal(report.totalCustomers, 1);
  assert.equal(report.totalProducts, 2);

  // Check product breakdown
  assert.equal(report.productSummary.length, 2);
  assert.equal(report.productSummary[0].productName, 'Mustard Cake');
  assert.equal(report.productSummary[0].pendingBags, 60);
  assert.equal(report.productSummary[1].productName, 'Soya DOC');
  assert.equal(report.productSummary[1].pendingBags, 40);
});

test('Product-wise summary sorting: sorts by highest pending quantity', () => {
  const requirements = [
    {
      id: 'r1',
      status: 'Qualified',
      customer_name: 'Customer A',
      product_type: 'Wheat Bran',
      required_quantity: 25,
      total_dispatched_quantity: 0,
    },
    {
      id: 'r2',
      status: 'Identified',
      customer_name: 'Customer B',
      product_type: 'Mustard Cake',
      required_quantity: 150,
      total_dispatched_quantity: 0,
    },
    {
      id: 'r3',
      status: 'Engaged',
      customer_name: 'Customer C',
      product_type: 'Cotton Seed Cake',
      required_quantity: 80,
      total_dispatched_quantity: 0,
    },
  ];

  const report = computeDailyPendingReport(requirements, '2026-11-05');
  assert.equal(report.productSummary[0].productName, 'Mustard Cake');
  assert.equal(report.productSummary[0].pendingBags, 150);
  assert.equal(report.productSummary[1].productName, 'Cotton Seed Cake');
  assert.equal(report.productSummary[1].pendingBags, 80);
  assert.equal(report.productSummary[2].productName, 'Wheat Bran');
  assert.equal(report.productSummary[2].pendingBags, 25);
});

test('Customer-wise summary: includes required fields and groups products per customer', () => {
  const req = {
    id: 'req-cust-1',
    status: 'Identified',
    customer_name: 'Balaji Feeds',
    party_id: 'cust-123',
    customer_city: 'Indore',
    owner_email: 'ramesh@shubhlabh.com',
    expected_date: '2026-11-05',
    required_quantity: 120,
    product_type: 'Soya Meal',
    total_dispatched_quantity: 0,
  };

  const report = computeDailyPendingReport([req], '2026-11-05');
  assert.equal(report.customerSummary.length, 1);
  const cust = report.customerSummary[0];
  assert.equal(cust.customerName, 'Balaji Feeds');
  assert.equal(cust.productName, 'Soya Meal');
  assert.equal(cust.pendingBags, 120);
  assert.equal(cust.requirementDate, '2026-11-05');
  assert.equal(cust.assignedOwner, 'ramesh');
});

test('Date filtering: filters correctly for exact date, up_to date, and all', () => {
  const requirements = [
    { id: '1', status: 'Identified', expected_date: '2026-11-04', required_quantity: 10, total_dispatched_quantity: 0 },
    { id: '2', status: 'Identified', expected_date: '2026-11-05', required_quantity: 20, total_dispatched_quantity: 0 },
    { id: '3', status: 'Identified', expected_date: '2026-11-06', required_quantity: 30, total_dispatched_quantity: 0 },
  ];

  // Exact date
  const exact = filterPendingRequirements(requirements, { reportDate: '2026-11-05', dateMode: 'exact' });
  assert.equal(exact.length, 1);
  assert.equal(exact[0].id, '2');

  // Up to date (including overdue)
  const upTo = filterPendingRequirements(requirements, { reportDate: '2026-11-05', dateMode: 'up_to' });
  assert.equal(upTo.length, 2);
  assert.deepEqual(upTo.map(r => r.id), ['1', '2']);

  // All dates
  const all = filterPendingRequirements(requirements, { reportDate: '2026-11-05', dateMode: 'all' });
  assert.equal(all.length, 3);
});

test('WhatsApp report generation: conforms to FR-05 exact template', () => {
  const reportData = {
    reportDateFormatted: '05 Nov 2026',
    totalRequirements: 2,
    totalCustomers: 2,
    totalProducts: 2,
    totalBags: 200,
    productSummary: [
      { productName: 'Mustard Cake', pendingBags: 120 },
      { productName: 'Soya Meal', pendingBags: 80 },
    ],
    customerSummary: [
      { customerName: 'Apex Feeds', productName: 'Mustard Cake', pendingBags: 120 },
      { customerName: 'Kisan Traders', productName: 'Soya Meal', pendingBags: 80 },
    ],
  };

  const text = generateWhatsAppReportText(reportData);

  const expected = `📋 SHUBH LABH CRM
DAILY PENDING DISPATCH REPORT
📅 Date: 05 Nov 2026

PENDING SUMMARY
• Pending Requirements: 2
• Pending Customers: 2
• Pending Products: 2
• Total Pending Bags: 200

PRODUCT-WISE PENDING
Mustard Cake — 120 Bags
Soya Meal — 80 Bags

CUSTOMER-WISE PENDING
Apex Feeds
Product: Mustard Cake
Pending: 120 Bags

Kisan Traders
Product: Soya Meal
Pending: 80 Bags

TOTAL PENDING: 200 BAGS

Report generated from Shubh Labh CRM.`;

  assert.equal(text, expected);
});

test('Empty state: generates graceful message and handles 0 requirements', () => {
  const emptyReport = computeDailyPendingReport([], '2026-11-05');
  assert.equal(emptyReport.totalRequirements, 0);
  assert.equal(emptyReport.totalBags, 0);
  assert.equal(emptyReport.totalCustomers, 0);
  assert.equal(emptyReport.totalProducts, 0);
  assert.equal(emptyReport.productSummary.length, 0);
  assert.equal(emptyReport.customerSummary.length, 0);

  const text = generateWhatsAppReportText(emptyReport);
  assert.match(text, /No pending dispatch requirements found for this date/);
});
