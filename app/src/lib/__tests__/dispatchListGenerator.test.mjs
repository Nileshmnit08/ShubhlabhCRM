import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDispatchDate,
  filterEligibleDispatchRequirements,
  normalizeTransporterName,
  normalizeTransporterPhone,
  extractRequirementItems,
  buildConsolidatedDispatchData,
  generateDispatchListPlainText,
  generateWhatsAppShareUrl
} from '../dispatchListGenerator.js';

test('1. Single customer, single product', () => {
  const reqs = [
    {
      id: 'req-1',
      party_id: 'party-1',
      customer_name: 'Radha Baat Bhandhar',
      customer_city: 'Lalchandpura',
      product_type: 'Diamond',
      required_quantity: 70,
      unit: 'Bags',
      status: 'New'
    }
  ];

  const data = buildConsolidatedDispatchData(reqs);
  assert.equal(data.summary.totalCustomers, 1);
  assert.equal(data.summary.totalRequirements, 1);
  assert.equal(data.summary.totalQtyDisplay, '70 Bags');
  assert.equal(data.entries.length, 1);

  const entry = data.entries[0];
  assert.equal(entry.customerTitle, 'Radha Baat Bhandhar – Lalchandpura');
  assert.equal(entry.productsLine, 'Diamond – 70 Bags');
  assert.equal(entry.transporterName, 'Not Available');
  assert.equal(entry.mobile, 'Not Available');

  const text = generateDispatchListPlainText(data, '25 Nov 2026');
  assert.equal(
    text,
    `Dispatch List – 25 Nov 2026\n\n1. Radha Baat Bhandhar – Lalchandpura\n   Diamond – 70 Bags\n   Transporter: Not Available\n   Mobile: Not Available`
  );
});

test('2. Single customer, multiple products consolidated with semicolons', () => {
  const reqs = [
    {
      id: 'req-2a',
      party_id: 'party-shyam',
      customer_name: 'Shyam Baat Bhandar',
      customer_city: 'Kanwarpura',
      requirement_items: [
        { product_name: 'Diamond', quantity: 50, unit: 'Bags' },
        { product_name: 'Naman', quantity: 15, unit: 'Bags' },
        { product_name: '8000', quantity: 15, unit: 'Bags' }
      ],
      status: 'New'
    }
  ];

  const data = buildConsolidatedDispatchData(reqs);
  assert.equal(data.summary.totalCustomers, 1);
  assert.equal(data.summary.totalRequirements, 1);
  assert.equal(data.summary.totalQtyDisplay, '80 Bags');
  assert.equal(data.entries[0].productsLine, 'Diamond – 50 Bags; Naman – 15 Bags; 8000 – 15 Bags');

  const text = generateDispatchListPlainText(data, '25 Nov 2026');
  assert.match(text, /Diamond – 50 Bags; Naman – 15 Bags; 8000 – 15 Bags/);
});

test('3. Multiple customers with numbering and separators', () => {
  const reqs = [
    {
      id: 'req-1',
      party_id: 'party-1',
      customer_name: 'Radha Baat Bhandhar',
      customer_city: 'Lalchandpura',
      product_type: 'Diamond',
      required_quantity: 70,
      unit: 'Bags',
      status: 'New'
    },
    {
      id: 'req-2',
      party_id: 'party-2',
      customer_name: 'Arihant Kumar Rahul Kumar',
      customer_city: 'Medta City',
      product_type: 'Dry Mix',
      required_quantity: 60,
      unit: 'Bags',
      status: 'New',
      transporter_info: {
        transporterName: 'Banna Ji',
        mobileNumber: '9257150693'
      }
    }
  ];

  const data = buildConsolidatedDispatchData(reqs);
  assert.equal(data.summary.totalCustomers, 2);
  assert.equal(data.summary.totalRequirements, 2);
  assert.equal(data.summary.totalQtyDisplay, '130 Bags');

  const text = generateDispatchListPlainText(data, '25 Nov 2026');
  assert.match(text, /1\. Radha Baat Bhandhar – Lalchandpura/);
  assert.match(text, /2\. Arihant Kumar Rahul Kumar – Medta City/);
  assert.match(text, /Transporter: Banna Ji/);
  assert.match(text, /Mobile: 9257150693/);
});

test('4. Different transporters for same customer produce separate entries', () => {
  const reqs = [
    {
      id: 'req-3a',
      party_id: 'party-arihant',
      customer_name: 'Arihant Traders',
      customer_city: 'Jaipur',
      product_type: 'Feed A',
      required_quantity: 40,
      unit: 'Bags',
      status: 'New',
      transporter_info: {
        transporterName: 'Sharma Transport',
        mobileNumber: '9829011111'
      }
    },
    {
      id: 'req-3b',
      party_id: 'party-arihant',
      customer_name: 'Arihant Traders',
      customer_city: 'Jaipur',
      product_type: 'Feed B',
      required_quantity: 20,
      unit: 'Bags',
      status: 'New',
      transporter_info: {
        transporterName: 'Verma Roadlines',
        mobileNumber: '9829022222'
      }
    }
  ];

  const data = buildConsolidatedDispatchData(reqs);
  assert.equal(data.summary.totalCustomers, 1, 'Still 1 unique customer');
  assert.equal(data.entries.length, 2, '2 separate entries because transporters differ');
  assert.equal(data.entries[0].transporterName, 'Sharma Transport');
  assert.equal(data.entries[1].transporterName, 'Verma Roadlines');
});

test('5. Missing transporter details fallback cleanly to Not Available', () => {
  const reqs = [
    {
      id: 'req-4',
      party_id: 'party-4',
      customer_name: 'Shri Chand Pasu Aahar',
      customer_city: 'Malpura',
      product_type: 'Dry Mix',
      required_quantity: 80,
      unit: 'Bags',
      status: 'New',
      transporter_info: null
    }
  ];

  const data = buildConsolidatedDispatchData(reqs);
  assert.equal(data.entries[0].transporterName, 'Not Available');
  assert.equal(data.entries[0].mobile, 'Not Available');

  const text = generateDispatchListPlainText(data, '25 Nov 2026');
  assert.match(text, /Transporter: Not Available/);
  assert.match(text, /Mobile: Not Available/);
});

test('6. Different quantity units grouped separately (never added together)', () => {
  const reqs = [
    {
      id: 'req-bags',
      party_id: 'party-bags',
      customer_name: 'Customer Bags',
      product_type: 'Feed',
      required_quantity: 335,
      unit: 'Bags',
      status: 'New'
    },
    {
      id: 'req-mt',
      party_id: 'party-mt',
      customer_name: 'Yashika Agro Industries',
      customer_city: 'Merta',
      product_type: 'Chana Churi, Dry Mix, Lapti Mix',
      required_quantity: 10,
      unit: 'MT',
      status: 'New'
    }
  ];

  const data = buildConsolidatedDispatchData(reqs);
  assert.equal(data.summary.totalQtyDisplay, '335 Bags + 10 MT');
  assert.equal(data.summary.unitTotals['Bags'], 335);
  assert.equal(data.summary.unitTotals['MT'], 10);
});

test('7. Active filters exclusion (cancelled, lost, completed excluded in normal view)', () => {
  const reqs = [
    { id: '1', party_id: 'p1', customer_name: 'Valid Customer', status: 'New', required_quantity: 10, unit: 'Bags' },
    { id: '2', party_id: 'p2', customer_name: 'Cancelled Customer', status: 'Cancelled', required_quantity: 10, unit: 'Bags' },
    { id: '3', party_id: 'p3', customer_name: 'Lost Customer', status: 'Lost', required_quantity: 10, unit: 'Bags' },
    { id: '4', party_id: 'p4', customer_name: 'Dispatched Customer', status: 'Dispatched', dispatch_progress: 'Fully Dispatched', required_quantity: 10, unit: 'Bags' }
  ];

  // In default active view (All Open)
  const data = buildConsolidatedDispatchData(reqs, { statusFilter: 'All Open' });
  assert.equal(data.entries.length, 1);
  assert.equal(data.entries[0].customerName, 'Valid Customer');

  // In Dispatched view
  const dataDispatched = buildConsolidatedDispatchData(reqs, { statusFilter: 'Dispatched' });
  assert.equal(dataDispatched.entries.length, 1);
  assert.equal(dataDispatched.entries[0].customerName, 'Dispatched Customer');
});

test('8. Customer without location shows customer name alone', () => {
  const reqs = [
    {
      id: 'req-noloc',
      party_id: 'p-noloc',
      customer_name: 'Bhawani Agro',
      customer_city: '',
      product_type: 'Makka Aata',
      required_quantity: 50,
      unit: 'Bags',
      status: 'New'
    }
  ];

  const data = buildConsolidatedDispatchData(reqs);
  assert.equal(data.entries[0].customerTitle, 'Bhawani Agro');
});

test('9. Copy output preserved format matches specification exact structure', () => {
  const data = {
    entries: [
      {
        customerTitle: 'Radha Baat Bhandhar – Lalchandpura',
        productsLine: 'Diamond – 70 Bags',
        transporterName: 'Not Available',
        mobile: 'Not Available'
      },
      {
        customerTitle: 'Arihant Kumar Rahul Kumar – Medta City',
        productsLine: 'Dry Mix – 60 Bags',
        transporterName: 'Banna Ji',
        mobile: '9257150693'
      }
    ]
  };

  const text = generateDispatchListPlainText(data, '25 Nov 2026');
  const expected = 
`Dispatch List – 25 Nov 2026

1. Radha Baat Bhandhar – Lalchandpura
   Diamond – 70 Bags
   Transporter: Not Available
   Mobile: Not Available

2. Arihant Kumar Rahul Kumar – Medta City
   Dry Mix – 60 Bags
   Transporter: Banna Ji
   Mobile: 9257150693`;

  assert.equal(text, expected);
});

test('10. WhatsApp message generation creates valid encoded share url', () => {
  const plainText = 'Dispatch List – 25 Nov 2026\n\n1. Radha – City\n   Feed – 10 Bags\n   Transporter: T1\n   Mobile: 9999999999';
  const url = generateWhatsAppShareUrl(plainText);
  assert.ok(url.startsWith('https://api.whatsapp.com/send?text='));
  assert.ok(url.includes('Dispatch%20List'));
  assert.ok(url.includes('9999999999'));
});

test('11. Empty result set handled gracefully', () => {
  const data = buildConsolidatedDispatchData([]);
  assert.equal(data.summary.totalCustomers, 0);
  assert.equal(data.summary.totalRequirements, 0);
  assert.equal(data.summary.totalQtyDisplay, '0 Bags');
  assert.equal(data.entries.length, 0);

  const text = generateDispatchListPlainText(data, '25 Nov 2026');
  assert.match(text, /No eligible dispatch requirements/);
});
