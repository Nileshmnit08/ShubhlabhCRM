import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SORTABLE_COLUMNS,
  getNextSortState,
  sortCustomers,
} from '../../pages/CustomerAccess/utils/customerSortUtils.js';

describe('SL-CRM-CUSTOMER-ACCESS-SORT-01: Customer Access Table Sorting Unit Tests', () => {
  const mockBuyerAccounts = {
    'c-1': { id: 'usr-1', email: 'arihant@example.com', is_active: true },
    'c-2': { id: 'usr-2', email: 'bajrang@example.com', is_active: false },
    'c-3': { id: 'usr-3', email: 'choudhary@example.com', is_active: true },
    // c-4 has no buyer account (Pending Access)
    // c-5 has no buyer account (Pending Access)
  };

  const mockPresence = {
    'c-1': { isOnline: true, activeDurationFormatted: '12m' },
    'c-2': { isOnline: false, lastActiveRelative: '1h ago' },
    'c-3': { isOnline: false, lastActiveRelative: 'Just now' },
  };

  const context = {
    buyerAccountsMap: mockBuyerAccounts,
    presenceMap: mockPresence,
  };

  const sampleCustomers = [
    { id: 'c-3', display_name: 'Choudhary Traders', customer_code: 'CUST-10', mobile: '9414056789' },
    { id: 'c-1', display_name: 'Arihant Enterprises', customer_code: 'CUST-2', mobile: '9829012345' },
    { id: 'c-5', display_name: 'Zeta Agro', customer_code: '', mobile: '' }, // Missing code & mobile
    { id: 'c-2', display_name: 'Bajrang Agro', customer_code: 'CUST-1', mobile: '9784567890' },
    { id: 'c-4', display_name: 'Deepak Mills', customer_code: 'CUST-20', mobile: '9166011223' },
  ];

  describe('1. 3-State Sorting Transition', () => {
    it('should transition none -> asc -> desc -> none for the same column', () => {
      // 1st click
      const state1 = getNextSortState(null, null, SORTABLE_COLUMNS.NAME);
      assert.deepEqual(state1, { key: SORTABLE_COLUMNS.NAME, direction: 'asc' });

      // 2nd click
      const state2 = getNextSortState(state1.key, state1.direction, SORTABLE_COLUMNS.NAME);
      assert.deepEqual(state2, { key: SORTABLE_COLUMNS.NAME, direction: 'desc' });

      // 3rd click -> returns to default (none)
      const state3 = getNextSortState(state2.key, state2.direction, SORTABLE_COLUMNS.NAME);
      assert.deepEqual(state3, { key: null, direction: null });
    });

    it('should switch directly to asc when clicking a new column', () => {
      const state1 = { key: SORTABLE_COLUMNS.NAME, direction: 'desc' };
      const state2 = getNextSortState(state1.key, state1.direction, SORTABLE_COLUMNS.CODE);
      assert.deepEqual(state2, { key: SORTABLE_COLUMNS.CODE, direction: 'asc' });
    });
  });

  describe('2. Customer Name Sorting', () => {
    it('should sort customer names case-insensitively ascending', () => {
      const sorted = sortCustomers(sampleCustomers, SORTABLE_COLUMNS.NAME, 'asc', context);
      const names = sorted.map((c) => c.display_name);
      assert.deepEqual(names, [
        'Arihant Enterprises',
        'Bajrang Agro',
        'Choudhary Traders',
        'Deepak Mills',
        'Zeta Agro',
      ]);
    });

    it('should sort customer names case-insensitively descending', () => {
      const sorted = sortCustomers(sampleCustomers, SORTABLE_COLUMNS.NAME, 'desc', context);
      const names = sorted.map((c) => c.display_name);
      assert.deepEqual(names, [
        'Zeta Agro',
        'Deepak Mills',
        'Choudhary Traders',
        'Bajrang Agro',
        'Arihant Enterprises',
      ]);
    });
  });

  describe('3. Customer Code Natural Sorting & Missing Code at Bottom', () => {
    it('should sort customer codes naturally (CUST-1, CUST-2, CUST-10, CUST-20) with missing at bottom', () => {
      const sorted = sortCustomers(sampleCustomers, SORTABLE_COLUMNS.CODE, 'asc', context);
      const codes = sorted.map((c) => c.customer_code);
      assert.deepEqual(codes, ['CUST-1', 'CUST-2', 'CUST-10', 'CUST-20', '']);
    });

    it('should sort customer codes descending with missing code consistently at bottom', () => {
      const sorted = sortCustomers(sampleCustomers, SORTABLE_COLUMNS.CODE, 'desc', context);
      const codes = sorted.map((c) => c.customer_code);
      assert.deepEqual(codes, ['CUST-20', 'CUST-10', 'CUST-2', 'CUST-1', '']);
    });
  });

  describe('4. Registered Mobile Sorting & Missing Mobile at Bottom', () => {
    it('should sort registered mobile numbers ascending with empty mobile at bottom', () => {
      const sorted = sortCustomers(sampleCustomers, SORTABLE_COLUMNS.MOBILE, 'asc', context);
      const mobiles = sorted.map((c) => c.mobile);
      assert.deepEqual(mobiles, [
        '9166011223',
        '9414056789',
        '9784567890',
        '9829012345',
        '', // Missing mobile at bottom
      ]);
    });

    it('should sort registered mobile numbers descending with empty mobile consistently at bottom', () => {
      const sorted = sortCustomers(sampleCustomers, SORTABLE_COLUMNS.MOBILE, 'desc', context);
      const mobiles = sorted.map((c) => c.mobile);
      assert.deepEqual(mobiles, [
        '9829012345',
        '9784567890',
        '9414056789',
        '9166011223',
        '', // Missing mobile at bottom
      ]);
    });
  });

  describe('5. App Status Sorting', () => {
    it('should sort app status ascending: Active -> Disabled -> Pending Access', () => {
      const sorted = sortCustomers(sampleCustomers, SORTABLE_COLUMNS.STATUS, 'asc', context);
      const statuses = sorted.map((c) => {
        const acc = mockBuyerAccounts[c.id];
        if (!acc) return 'Pending Access';
        return acc.is_active ? 'Active' : 'Disabled';
      });

      // Active (c-1, c-3) -> Disabled (c-2) -> Pending Access (c-4, c-5)
      assert.equal(statuses[0], 'Active');
      assert.equal(statuses[1], 'Active');
      assert.equal(statuses[2], 'Disabled');
      assert.equal(statuses[3], 'Pending Access');
      assert.equal(statuses[4], 'Pending Access');
    });

    it('should sort app status descending: Pending Access -> Disabled -> Active', () => {
      const sorted = sortCustomers(sampleCustomers, SORTABLE_COLUMNS.STATUS, 'desc', context);
      const statuses = sorted.map((c) => {
        const acc = mockBuyerAccounts[c.id];
        if (!acc) return 'Pending Access';
        return acc.is_active ? 'Active' : 'Disabled';
      });

      assert.equal(statuses[0], 'Pending Access');
      assert.equal(statuses[1], 'Pending Access');
      assert.equal(statuses[2], 'Disabled');
      assert.equal(statuses[3], 'Active');
      assert.equal(statuses[4], 'Active');
    });
  });

  describe('6. App Presence Sorting', () => {
    it('should sort app presence ascending: Online -> Offline -> No Account at bottom', () => {
      const sorted = sortCustomers(sampleCustomers, SORTABLE_COLUMNS.PRESENCE, 'asc', context);
      const presences = sorted.map((c) => {
        const acc = mockBuyerAccounts[c.id];
        if (!acc) return 'No Account';
        return mockPresence[c.id]?.isOnline ? 'Online' : 'Offline';
      });

      assert.equal(presences[0], 'Online'); // c-1
      assert.equal(presences[1], 'Offline'); // c-2 or c-3
      assert.equal(presences[2], 'Offline'); // c-2 or c-3
      assert.equal(presences[3], 'No Account'); // c-4 or c-5 at bottom
      assert.equal(presences[4], 'No Account'); // c-4 or c-5 at bottom
    });

    it('should sort app presence descending: Offline -> Online -> No Account consistently at bottom', () => {
      const sorted = sortCustomers(sampleCustomers, SORTABLE_COLUMNS.PRESENCE, 'desc', context);
      const presences = sorted.map((c) => {
        const acc = mockBuyerAccounts[c.id];
        if (!acc) return 'No Account';
        return mockPresence[c.id]?.isOnline ? 'Online' : 'Offline';
      });

      assert.equal(presences[0], 'Offline');
      assert.equal(presences[1], 'Offline');
      assert.equal(presences[2], 'Online');
      assert.equal(presences[3], 'No Account'); // Missing / No account remains at bottom
      assert.equal(presences[4], 'No Account');
    });
  });

  describe('7. Login ID Sorting & Missing Accounts at Bottom', () => {
    it('should sort login ID (email) ascending with unprovisioned accounts at bottom', () => {
      const sorted = sortCustomers(sampleCustomers, SORTABLE_COLUMNS.LOGIN_ID, 'asc', context);
      const emails = sorted.map((c) => mockBuyerAccounts[c.id]?.email || '');
      assert.deepEqual(emails, [
        'arihant@example.com',
        'bajrang@example.com',
        'choudhary@example.com',
        '', // c-4 has no login ID -> bottom
        '', // c-5 has no login ID -> bottom
      ]);
    });

    it('should sort login ID descending with unprovisioned accounts consistently at bottom', () => {
      const sorted = sortCustomers(sampleCustomers, SORTABLE_COLUMNS.LOGIN_ID, 'desc', context);
      const emails = sorted.map((c) => mockBuyerAccounts[c.id]?.email || '');
      assert.deepEqual(emails, [
        'choudhary@example.com',
        'bajrang@example.com',
        'arihant@example.com',
        '', // c-4 bottom
        '', // c-5 bottom
      ]);
    });
  });

  describe('8. Default Unsorted Return & Immutability', () => {
    it('should return original array when direction is null', () => {
      const original = [...sampleCustomers];
      const result = sortCustomers(sampleCustomers, null, null, context);
      assert.deepEqual(result, original);
    });

    it('should not mutate original array when sorting', () => {
      const originalCopy = JSON.parse(JSON.stringify(sampleCustomers));
      sortCustomers(sampleCustomers, SORTABLE_COLUMNS.NAME, 'asc', context);
      assert.deepEqual(sampleCustomers, originalCopy);
    });
  });
});
