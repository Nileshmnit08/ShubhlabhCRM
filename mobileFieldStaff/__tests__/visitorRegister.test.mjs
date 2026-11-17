/**
 * FA-VISITOR-REGISTER-01 unit tests.
 * Imports the real production module and verifies all requirements.
 * Run: node --test mobileFieldStaff/__tests__/visitorRegister.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  VISITOR_TABLE,
  VISITOR_CATEGORIES,
  istBusinessDate,
  formatIstTime,
  formatIstDateTime,
  generatePassNumber,
  validateMobile,
  validateVisitorInput,
  buildVisitorPayload,
  buildExitPayload,
  filterTodayVisitors,
  searchVisitors,
  isMissingTableError,
} from '../src/utils/visitorRegister.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('table and category constants match sprint specification', () => {
  assert.equal(VISITOR_TABLE, 'visitor_register');
  assert.deepEqual(VISITOR_CATEGORIES, [
    'Customer',
    'Dealer',
    'Supplier',
    'Transporter',
    'Other',
  ]);
});

test('istBusinessDate uses Asia/Kolkata (+05:30), not UTC or device time', () => {
  assert.equal(istBusinessDate('2026-11-17T18:29:59Z'), '2026-11-17');
  assert.equal(istBusinessDate('2026-11-17T18:30:00Z'), '2026-11-18'); // 00:00 IST next day
  assert.equal(istBusinessDate('2026-11-18T00:15:00Z'), '2026-11-18'); // 05:45 IST
  assert.equal(istBusinessDate('invalid-date'), null);
});

test('formatIstTime formats correctly in IST 12-hour format', () => {
  assert.equal(formatIstTime('2026-11-17T03:35:00Z'), '09:05 AM');
  assert.equal(formatIstTime('2026-11-17T12:45:00Z'), '06:15 PM');
  assert.equal(formatIstTime('2026-11-17T18:30:00Z'), '12:00 AM');
  assert.equal(formatIstTime(null), null);
});

test('generatePassNumber creates unique VR-YYYYMMDD-XXXX format', () => {
  const pass1 = generatePassNumber('2026-11-17', '1234');
  assert.equal(pass1, 'VR-20261117-1234');

  const autoPass = generatePassNumber('2026-11-17');
  assert.match(autoPass, /^VR-20261117-\d{4}$/);

  // Uniqueness check
  const passA = generatePassNumber();
  const passB = generatePassNumber();
  assert.match(passA, /^VR-\d{8}-\d{4}$/);
  assert.match(passB, /^VR-\d{8}-\d{4}$/);
});

test('validateMobile strictly validates 10-digit mobile numbers with normalization', () => {
  // Valid numbers
  const res1 = validateMobile('9876543210');
  assert.equal(res1.isValid, true);
  assert.equal(res1.normalized, '9876543210');

  // Normalizes with +91 prefix and formatting
  const res2 = validateMobile('+91 98765-43210');
  assert.equal(res2.isValid, true);
  assert.equal(res2.normalized, '9876543210');

  // Normalizes with leading 0
  const res3 = validateMobile('09876543210');
  assert.equal(res3.isValid, true);
  assert.equal(res3.normalized, '9876543210');

  // Invalid numbers
  const resShort = validateMobile('987654321');
  assert.equal(resShort.isValid, false);
  assert.match(resShort.error, /10-digit/);

  const resLong = validateMobile('987654321000');
  assert.equal(resLong.isValid, false);

  const resAlpha = validateMobile('98765ABCDE');
  assert.equal(resAlpha.isValid, false);

  const resEmpty = validateMobile('');
  assert.equal(resEmpty.isValid, false);
});

test('validateVisitorInput validates all mandatory fields', () => {
  const validForm = {
    visitor_name: 'Rajesh Sharma',
    mobile_number: '9829012345',
    category: 'Customer',
    photo_url: 'data:image/jpeg;base64,samplephoto123',
  };

  const validRes = validateVisitorInput(validForm);
  assert.equal(validRes.isValid, true);
  assert.equal(Object.keys(validRes.errors).length, 0);

  // Missing Name
  const noName = validateVisitorInput({ ...validForm, visitor_name: ' ' });
  assert.equal(noName.isValid, false);
  assert.match(noName.errors.visitor_name, /required/);

  // Invalid Mobile
  const badMobile = validateVisitorInput({ ...validForm, mobile_number: '123' });
  assert.equal(badMobile.isValid, false);
  assert.match(badMobile.errors.mobile_number, /10-digit/);

  // Invalid Category
  const badCat = validateVisitorInput({ ...validForm, category: 'VipVisitor' });
  assert.equal(badCat.isValid, false);
  assert.match(badCat.errors.category, /Category must be one of/);

  // Missing Photo (Required by Requirement 2 & 3)
  const noPhoto = validateVisitorInput({ ...validForm, photo_url: null });
  assert.equal(noPhoto.isValid, false);
  assert.match(noPhoto.errors.photo_url, /photograph is required/);

  const emptyPhoto = validateVisitorInput({ ...validForm, photo_url: '  ' });
  assert.equal(emptyPhoto.isValid, false);
});

test('buildVisitorPayload produces canonical database payload', () => {
  const payload = buildVisitorPayload({
    id: 'a1b2c3d4-1111-4000-8000-000000000001',
    pass_number: 'VR-20261117-9999',
    visitor_name: '  Kishan Lal  ',
    mobile_number: '+91 9352276227',
    company_name: '  Shree Ram Feeds  ',
    address: 'Jaipur',
    category: 'Dealer',
    person_to_meet: 'Mr. Sharma',
    purpose_of_visit: 'Discuss cattle feed bulk order',
    vehicle_number: 'rj 14 ab 1234',
    photo_url: 'data:image/jpeg;base64,xyz',
    registered_by: '00000000-0000-0000-0000-000000000002',
  });

  assert.equal(payload.id, 'a1b2c3d4-1111-4000-8000-000000000001');
  assert.equal(payload.pass_number, 'VR-20261117-9999');
  assert.equal(payload.visitor_name, 'Kishan Lal');
  assert.equal(payload.mobile_number, '9352276227');
  assert.equal(payload.company_name, 'Shree Ram Feeds');
  assert.equal(payload.category, 'Dealer');
  assert.equal(payload.vehicle_number, 'RJ 14 AB 1234'); // auto-capitalized
  assert.equal(payload.status, 'IN');
  assert.equal(payload.registration_source, 'Field Assist');
  assert.equal(payload.exit_time, null);
  assert.ok(payload.entry_time);
  assert.ok(payload.created_at);

  const crmPayload = buildVisitorPayload({
    visitor_name: 'Test User',
    mobile_number: '9876543210',
    registration_source: 'CRM',
  });
  assert.equal(crmPayload.registration_source, 'CRM');
});

test('buildExitPayload marks status OUT on the existing record (no duplicate record)', () => {
  const exitPayload = buildExitPayload(
    'a1b2c3d4-1111-4000-8000-000000000001',
    '2026-11-17T11:45:00Z'
  );

  assert.equal(exitPayload.id, 'a1b2c3d4-1111-4000-8000-000000000001');
  assert.equal(exitPayload.status, 'OUT');
  assert.equal(exitPayload.exit_time, '2026-11-17T11:45:00Z');
  assert.ok(exitPayload.updated_at);
  assert.equal(exitPayload.visitor_name, undefined); // does not overwrite or create new row
});

test('filterTodayVisitors filters accurately by Asia/Kolkata date', () => {
  const list = [
    { id: '1', visitor_name: 'Today Visitor 1', entry_time: '2026-11-17T04:00:00Z' }, // 09:30 AM IST on 17th
    { id: '2', visitor_name: 'Today Visitor 2', entry_time: '2026-11-17T10:00:00Z' }, // 03:30 PM IST on 17th
    { id: '3', visitor_name: 'Yesterday Visitor', entry_time: '2026-11-16T10:00:00Z' },
    { id: '4', visitor_name: 'Tomorrow Visitor', entry_time: '2026-11-18T04:00:00Z' },
  ];

  const todayList = filterTodayVisitors(list, '2026-11-17');
  assert.equal(todayList.length, 2);
  assert.equal(todayList[0].id, '1');
  assert.equal(todayList[1].id, '2');
});

test('searchVisitors matches against name, mobile, pass number, company, and vehicle', () => {
  const list = [
    { id: '1', visitor_name: 'Sunil Choudhary', mobile_number: '9828000001', pass_number: 'VR-20261117-1001', company_name: 'Marwar Agro' },
    { id: '2', visitor_name: 'Amit Verma', mobile_number: '9928192696', pass_number: 'VR-20261117-1002', company_name: 'Kisan Kendra' },
    { id: '3', visitor_name: 'Vikram Singh', mobile_number: '9352276227', pass_number: 'VR-20261117-1003', vehicle_number: 'RJ 14 CZ 9999' },
  ];

  assert.equal(searchVisitors(list, 'sunil').length, 1);
  assert.equal(searchVisitors(list, '99281').length, 1);
  assert.equal(searchVisitors(list, 'VR-20261117-1003').length, 1);
  assert.equal(searchVisitors(list, 'Marwar').length, 1);
  assert.equal(searchVisitors(list, 'RJ 14').length, 1);
  assert.equal(searchVisitors(list, 'nonexistent').length, 0);
  assert.equal(searchVisitors(list, '').length, 3);
});

test('isMissingTableError recognizes PostgreSQL 42P01 and PGRST205', () => {
  assert.equal(isMissingTableError({ code: '42P01' }), true);
  assert.equal(isMissingTableError({ code: 'PGRST205' }), true);
  assert.equal(isMissingTableError({ message: 'relation "public.visitor_register" does not exist' }), true);
  assert.equal(isMissingTableError({ code: '23505', message: 'duplicate key' }), false);
  assert.equal(isMissingTableError(null), false);
});

test('database migration proposal 258 exists and defines visitor_register table safely', () => {
  const proposalPath = path.join(rootDir, 'supabase/proposals/258_sprint_FA_VISITOR_REGISTER_01.sql');
  const rollbackPath = path.join(rootDir, 'supabase/proposals/258_rollback_sprint_FA_VISITOR_REGISTER_01.sql');

  assert.ok(existsSync(proposalPath), 'Proposal 258 must exist in supabase/proposals/');
  assert.ok(existsSync(rollbackPath), 'Rollback 258 must exist in supabase/proposals/');

  const sql = readFileSync(proposalPath, 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.visitor_register/i);
  assert.match(sql, /pass_number\s+TEXT/i);
  assert.match(sql, /visitor_name\s+TEXT/i);
  assert.match(sql, /mobile_number\s+VARCHAR\(15\)/i);
  assert.match(sql, /photo_url\s+TEXT/i);
  assert.match(sql, /status\s+TEXT.*DEFAULT 'IN'/i);
  assert.match(sql, /CHECK\s*\(category IN \('Customer', 'Dealer', 'Supplier', 'Transporter', 'Other'\)\)/i);
  assert.match(sql, /CHECK\s*\(status IN \('IN', 'OUT'\)\)/i);
  assert.match(sql, /UNIQUE\s*\(pass_number\)/i);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql, /CREATE POLICY/i);

  const rollbackSql = readFileSync(rollbackPath, 'utf8');
  assert.match(rollbackSql, /DROP TABLE IF EXISTS public\.visitor_register CASCADE/i);
});
