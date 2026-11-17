import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VISITOR_TABLE,
  VISITOR_STORAGE_BUCKET,
  VISITOR_CATEGORIES,
  VISITOR_STATUSES,
  REGISTRATION_SOURCES,
  istBusinessDate,
  formatIstTime,
  formatIstDateTime,
  generatePassNumber,
  validateMobile,
  validateVisitorInput,
  formatDuration,
  filterVisitors,
  computeDashboardStats,
  buildVisitorCsvRows,
} from '../visitorRegister.js';

test('constants match database schema specifications', () => {
  assert.equal(VISITOR_TABLE, 'visitor_register');
  assert.equal(VISITOR_STORAGE_BUCKET, 'visitor-photos');
  assert.deepEqual(VISITOR_CATEGORIES, [
    'Customer',
    'Dealer',
    'Supplier',
    'Transporter',
    'Other',
  ]);
  assert.deepEqual(VISITOR_STATUSES, ['IN', 'OUT']);
  assert.deepEqual(REGISTRATION_SOURCES, ['Field Assist', 'CRM']);
});

test('istBusinessDate converts UTC correctly to IST (+05:30)', () => {
  // 17 Nov 2026 20:00:00 UTC -> 18 Nov 2026 01:30:00 IST
  const lateUtc = '2026-11-17T20:00:00.000Z';
  assert.equal(istBusinessDate(lateUtc), '2026-11-18');

  // 17 Nov 2026 04:00:00 UTC -> 17 Nov 2026 09:30:00 IST
  const morningUtc = '2026-11-17T04:00:00.000Z';
  assert.equal(istBusinessDate(morningUtc), '2026-11-17');
});

test('formatIstTime and formatIstDateTime format correctly in IST', () => {
  const ts = '2026-11-17T04:30:00.000Z'; // 10:00 AM IST
  assert.equal(formatIstTime(ts), '10:00 AM');
  assert.equal(formatIstDateTime(ts), '17 Nov 2026, 10:00 AM');

  const eveningTs = '2026-11-17T11:45:00.000Z'; // 05:15 PM IST
  assert.equal(formatIstTime(eveningTs), '05:15 PM');
  assert.equal(formatIstDateTime(eveningTs), '17 Nov 2026, 05:15 PM');
});

test('generatePassNumber creates unique VR-YYYYMMDD-XXXX format', () => {
  const pass1 = generatePassNumber('2026-11-17', '1234');
  assert.equal(pass1, 'VR-20261117-1234');

  const passAuto = generatePassNumber('2026-11-17');
  assert.match(passAuto, /^VR-20261117-\d{4}$/);
});

test('validateMobile normalizes +91, 0, spaces, and validates 10 digits', () => {
  const r1 = validateMobile('+91 93522 76227');
  assert.equal(r1.isValid, true);
  assert.equal(r1.normalized, '9352276227');

  const r2 = validateMobile('09928192696');
  assert.equal(r2.isValid, true);
  assert.equal(r2.normalized, '9928192696');

  const r3 = validateMobile('98290123'); // short
  assert.equal(r3.isValid, false);
  assert.match(r3.error, /10-digit/);
});

test('validateVisitorInput validates mandatory fields', () => {
  const valid = {
    visitor_name: 'Nilesh Sharma',
    mobile_number: '9352276227',
    category: 'Customer',
    photo_url: 'https://example.com/photo.jpg',
  };
  const res = validateVisitorInput(valid);
  assert.equal(res.isValid, true);

  const missingName = validateVisitorInput({ ...valid, visitor_name: '' });
  assert.equal(missingName.isValid, false);
  assert.ok(missingName.errors.visitor_name);

  const missingPhoto = validateVisitorInput({ ...valid, photo_url: '' });
  assert.equal(missingPhoto.isValid, false);
  assert.ok(missingPhoto.errors.photo_url);
});

test('formatDuration calculates human-readable duration', () => {
  const start = '2026-11-17T10:00:00.000Z';
  const end45m = '2026-11-17T10:45:00.000Z';
  assert.equal(formatDuration(start, end45m), '45m');

  const end2h15m = '2026-11-17T12:15:00.000Z';
  assert.equal(formatDuration(start, end2h15m), '2h 15m');
});

test('filterVisitors filters correctly by search, status, category, and source', () => {
  const sampleData = [
    {
      id: '1',
      visitor_name: 'Rajesh Kumar',
      mobile_number: '9829012345',
      category: 'Customer',
      status: 'IN',
      registration_source: 'CRM',
      entry_time: '2026-11-17T09:00:00.000Z',
    },
    {
      id: '2',
      visitor_name: 'Suresh Patel',
      mobile_number: '9829099999',
      category: 'Supplier',
      status: 'OUT',
      registration_source: 'Field Assist',
      entry_time: '2026-11-17T08:00:00.000Z',
      exit_time: '2026-11-17T09:30:00.000Z',
    },
  ];

  // Search by name
  const filtered1 = filterVisitors(sampleData, { search: 'Rajesh' });
  assert.equal(filtered1.length, 1);
  assert.equal(filtered1[0].id, '1');

  // Filter by status IN
  const filteredStatus = filterVisitors(sampleData, { status: 'IN' });
  assert.equal(filteredStatus.length, 1);
  assert.equal(filteredStatus[0].id, '1');

  // Filter by source Field Assist
  const filteredSource = filterVisitors(sampleData, { source: 'Field Assist' });
  assert.equal(filteredSource.length, 1);
  assert.equal(filteredSource[0].id, '2');
});

test('computeDashboardStats aggregates today, inside, exited, and category counts', () => {
  const sampleData = [
    {
      id: '1',
      visitor_name: 'V1',
      category: 'Customer',
      status: 'IN',
      registration_source: 'Field Assist',
      entry_time: '2026-11-17T09:00:00.000Z',
    },
    {
      id: '2',
      visitor_name: 'V2',
      category: 'Dealer',
      status: 'OUT',
      registration_source: 'CRM',
      entry_time: '2026-11-17T10:00:00.000Z',
      exit_time: '2026-11-17T11:00:00.000Z',
    },
    {
      id: '3',
      visitor_name: 'V3',
      category: 'Transporter',
      status: 'IN',
      registration_source: 'Field Assist',
      entry_time: '2026-11-17T11:00:00.000Z',
    },
  ];

  const stats = computeDashboardStats(sampleData, '2026-11-17');
  assert.equal(stats.totalToday, 3);
  assert.equal(stats.currentlyInside, 2);
  assert.equal(stats.exitedToday, 1);
  assert.equal(stats.monthlyTotal, 3);
  assert.equal(stats.categoryCounts.Customer, 1);
  assert.equal(stats.categoryCounts.Dealer, 1);
  assert.equal(stats.categoryCounts.Transporter, 1);
  assert.equal(stats.sourceCounts['Field Assist'], 2);
  assert.equal(stats.sourceCounts.CRM, 1);
  assert.equal(stats.recentInside.length, 2);
});

test('buildVisitorCsvRows builds formatted exportable records', () => {
  const visitors = [
    {
      pass_number: 'VR-20261117-1001',
      visitor_name: 'Ramesh Singh',
      mobile_number: '9829011111',
      category: 'Dealer',
      company_name: 'Kisan Feeds',
      person_to_meet: 'Factory Manager',
      purpose_of_visit: 'Order inquiry',
      vehicle_number: 'RJ 14 CC 5555',
      address: 'Jaipur',
      entry_time: '2026-11-17T04:30:00.000Z',
      exit_time: null,
      status: 'IN',
      registration_source: 'CRM',
      notes: 'VIP Dealer',
    },
  ];

  const rows = buildVisitorCsvRows(visitors);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]['Pass Number'], 'VR-20261117-1001');
  assert.equal(rows[0]['Visitor Name'], 'Ramesh Singh');
  assert.equal(rows[0]['Status'], 'INSIDE');
  assert.equal(rows[0]['Registration Source'], 'CRM');
});
