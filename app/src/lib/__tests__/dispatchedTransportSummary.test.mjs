import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  isRequirementDispatched,
  isRequirementPending,
  isRequirementOverdue,
  isRequirementDueToday,
  resolveTransportDetails,
  filterRequirements,
  formatDisplayDate,
  formatDisplayPhone,
  buildCustomerLatestDispatchMap,
  resolveRequirementTransporter
} from '../dispatchedTransportSummary.js';

describe('SL-REQUIREMENTS-TRANSPORTER-COLUMN-01 & SL-DISPATCHED-TRANSPORT-SUMMARY-03: Unit Tests', () => {

  const TODAY_STR = '2026-11-24T10:00:00.000Z';
  const YESTERDAY_STR = '2026-11-23';
  const TODAY_DATE_ONLY = '2026-11-24';
  const TOMORROW_STR = '2026-11-25';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Dispatched Status Determination
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. Dispatched Status Determination', () => {
    it('should classify requirement as dispatched when status is Dispatched', () => {
      const req = { id: 'r1', status: 'Dispatched', quantity: 100, total_dispatched_quantity: 100 };
      assert.strictEqual(isRequirementDispatched(req), true);
    });

    it('should classify requirement as dispatched when dispatch_progress is Fully Dispatched', () => {
      const req = { id: 'r2', status: 'Closed', dispatch_progress: 'Fully Dispatched', quantity: 50, total_dispatched_quantity: 50 };
      assert.strictEqual(isRequirementDispatched(req), true);
    });

    it('should classify requirement as dispatched when total_dispatched_quantity matches required', () => {
      const req = { id: 'r3', status: 'Closed', required_quantity: 200, total_dispatched_quantity: 200 };
      assert.strictEqual(isRequirementDispatched(req), true);
    });

    it('should NOT classify partially dispatched requirement as fully dispatched', () => {
      const req = { id: 'r4', status: 'Commercial Intent', required_quantity: 100, total_dispatched_quantity: 40 };
      assert.strictEqual(isRequirementDispatched(req), false);
    });

    it('should NOT classify fresh requirement as dispatched', () => {
      const req = { id: 'r5', status: 'Identified', required_quantity: 100, total_dispatched_quantity: 0 };
      assert.strictEqual(isRequirementDispatched(req), false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Dispatched Orders Never Classified as Pending, Due Today, or Overdue
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. Dispatched Orders Never Classified as Pending, Due Today, or Overdue', () => {
    it('should NEVER classify a dispatched requirement as Pending', () => {
      const dispatchedReq = {
        id: 'r-disp-1',
        status: 'Closed',
        dispatch_progress: 'Fully Dispatched',
        quantity: 100,
        total_dispatched_quantity: 100
      };
      assert.strictEqual(isRequirementDispatched(dispatchedReq), true);
      assert.strictEqual(isRequirementPending(dispatchedReq), false);
    });

    it('should NEVER classify a dispatched requirement as Overdue even if expected_date is in the past', () => {
      const pastDispatchedReq = {
        id: 'r-disp-2',
        status: 'Closed',
        dispatch_progress: 'Fully Dispatched',
        expected_date: YESTERDAY_STR,
        quantity: 100,
        total_dispatched_quantity: 100
      };
      assert.strictEqual(isRequirementDispatched(pastDispatchedReq), true);
      assert.strictEqual(isRequirementOverdue(pastDispatchedReq, TODAY_STR), false);
    });

    it('should NEVER classify a dispatched requirement as Due Today even if expected_date is today', () => {
      const todayDispatchedReq = {
        id: 'r-disp-3',
        status: 'Closed',
        dispatch_progress: 'Fully Dispatched',
        expected_date: TODAY_DATE_ONLY,
        quantity: 100,
        total_dispatched_quantity: 100
      };
      assert.strictEqual(isRequirementDispatched(todayDispatchedReq), true);
      assert.strictEqual(isRequirementDueToday(todayDispatchedReq, TODAY_STR), false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Formatting Helpers (Phone & Date)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. Formatting Helpers', () => {
    it('formatDisplayPhone should format 10-digit number with standard 5-5 split', () => {
      assert.strictEqual(formatDisplayPhone('9829012345'), '98290 12345');
      assert.strictEqual(formatDisplayPhone('9784567890'), '97845 67890');
      assert.strictEqual(formatDisplayPhone('9414056789'), '94140 56789');
    });

    it('formatDisplayPhone should handle empty or non-10 digit gracefully', () => {
      assert.strictEqual(formatDisplayPhone(''), '');
      assert.strictEqual(formatDisplayPhone(null), '');
      assert.strictEqual(formatDisplayPhone('12345'), '12345');
    });

    it('formatDisplayDate should format ISO string into DD MMM YYYY', () => {
      assert.strictEqual(formatDisplayDate('2026-11-18'), '18 Nov 2026');
      assert.strictEqual(formatDisplayDate('2026-11-24T12:00:00Z'), '24 Nov 2026');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Customer-Wise Transporter Suggestions & History Map
  // ─────────────────────────────────────────────────────────────────────────────
  describe('4. Customer-Wise Transporter Suggestion & History Building', () => {
    const metaMap = {
      'Vishnu Transport': { contact_number: '9829012345' },
      'Sharma Roadlines': { contact_number: '9784567890' },
      'Meena Transport': { contact_number: '9414056789' }
    };

    it('Validation Case 1: Customer A previously used Transporter X -> show X for Customer A', () => {
      const dispatches = [
        {
          id: 'd1',
          party_id: 'cust-A',
          transporter_name: 'Vishnu Transport',
          driver_mobile: '9829012345',
          dispatch_date: '2026-11-18',
          status: 'Dispatched'
        }
      ];
      const historyMap = buildCustomerLatestDispatchMap(dispatches, [], metaMap);

      const pendingReqA = {
        id: 'req-pending-A',
        party_id: 'cust-A',
        customer_name: 'Customer A',
        status: 'Qualified',
        required_quantity: 60,
        total_dispatched_quantity: 0
      };

      const result = resolveRequirementTransporter(pendingReqA, historyMap, metaMap);
      assert.strictEqual(result.isDispatched, false);
      assert.strictEqual(result.isSuggested, true);
      assert.strictEqual(result.transporterName, 'Vishnu Transport');
      assert.strictEqual(result.mobileNumber, '9829012345');
      assert.strictEqual(result.date, '2026-11-18');
      assert.strictEqual(result.hasDetails, true);
    });

    it('Validation Case 2: Customer B used Transporter Y -> show Y for Customer B, never X', () => {
      const dispatches = [
        {
          id: 'd1',
          party_id: 'cust-A',
          transporter_name: 'Vishnu Transport',
          driver_mobile: '9829012345',
          dispatch_date: '2026-11-18',
          status: 'Dispatched'
        },
        {
          id: 'd2',
          party_id: 'cust-B',
          transporter_name: 'Sharma Roadlines',
          driver_mobile: '9784567890',
          dispatch_date: '2026-11-19',
          status: 'Dispatched'
        }
      ];
      const historyMap = buildCustomerLatestDispatchMap(dispatches, [], metaMap);

      const pendingReqB = {
        id: 'req-pending-B',
        party_id: 'cust-B',
        customer_name: 'Customer B',
        status: 'Identified',
        required_quantity: 50,
        total_dispatched_quantity: 0
      };

      const result = resolveRequirementTransporter(pendingReqB, historyMap, metaMap);
      assert.strictEqual(result.isSuggested, true);
      assert.strictEqual(result.transporterName, 'Sharma Roadlines');
      assert.strictEqual(result.mobileNumber, '9784567890');
      assert.notStrictEqual(result.transporterName, 'Vishnu Transport');
    });

    it('Validation Case 3: Customer A has multiple historical transporters -> pick latest successful dispatch', () => {
      const dispatches = [
        {
          id: 'd-old',
          party_id: 'cust-A',
          transporter_name: 'Old Transporter Co',
          driver_mobile: '9999900000',
          dispatch_date: '2026-10-01',
          created_at: '2026-10-01T08:00:00Z',
          status: 'Dispatched'
        },
        {
          id: 'd-latest',
          party_id: 'cust-A',
          transporter_name: 'Vishnu Transport',
          driver_mobile: '9829012345',
          dispatch_date: '2026-11-18',
          created_at: '2026-11-18T10:00:00Z',
          status: 'Dispatched'
        },
        {
          id: 'd-mid',
          party_id: 'cust-A',
          transporter_name: 'Mid Transporter Co',
          driver_mobile: '8888800000',
          dispatch_date: '2026-11-05',
          created_at: '2026-11-05T09:00:00Z',
          status: 'Dispatched'
        }
      ];
      const historyMap = buildCustomerLatestDispatchMap(dispatches, [], metaMap);

      const pendingReqA = {
        id: 'req-multi',
        party_id: 'cust-A',
        status: 'Commercial Intent',
        required_quantity: 100,
        total_dispatched_quantity: 0
      };

      const result = resolveRequirementTransporter(pendingReqA, historyMap, metaMap);
      assert.strictEqual(result.transporterName, 'Vishnu Transport');
      assert.strictEqual(result.mobileNumber, '9829012345');
      assert.strictEqual(result.date, '2026-11-18');
    });

    it('Validation Case 4: Customer has no dispatch history -> display "No transporter history"', () => {
      const historyMap = buildCustomerLatestDispatchMap([], [], metaMap);

      const freshReq = {
        id: 'req-fresh',
        party_id: 'cust-never-dispatched',
        customer_name: 'New Dairy Farm',
        status: 'Qualified',
        required_quantity: 100,
        total_dispatched_quantity: 0
      };

      const result = resolveRequirementTransporter(freshReq, historyMap, metaMap);
      assert.strictEqual(result.isSuggested, true);
      assert.strictEqual(result.hasDetails, false);
      assert.strictEqual(result.transporterName, null);
      assert.strictEqual(result.mobileNumber, null);
      assert.strictEqual(result.fallbackMessage, 'No transporter history');
    });

    it('Validation Case 5: Cancelled or failed dispatch -> must NOT be used as latest suggestion', () => {
      const dispatches = [
        {
          id: 'd-cancelled-recent',
          party_id: 'cust-A',
          transporter_name: 'Fraud Rogue Transport',
          driver_mobile: '9111122222',
          dispatch_date: '2026-11-20',
          created_at: '2026-11-20T10:00:00Z',
          status: 'Cancelled'
        },
        {
          id: 'd-valid-earlier',
          party_id: 'cust-A',
          transporter_name: 'Vishnu Transport',
          driver_mobile: '9829012345',
          dispatch_date: '2026-11-15',
          created_at: '2026-11-15T10:00:00Z',
          status: 'Dispatched'
        }
      ];
      const historyMap = buildCustomerLatestDispatchMap(dispatches, [], metaMap);

      const pendingReq = {
        id: 'req-pending-skip-cancel',
        party_id: 'cust-A',
        status: 'Approved',
        required_quantity: 80,
        total_dispatched_quantity: 0
      };

      const result = resolveRequirementTransporter(pendingReq, historyMap, metaMap);
      assert.strictEqual(result.transporterName, 'Vishnu Transport');
      assert.notStrictEqual(result.transporterName, 'Fraud Rogue Transport');
    });

    it('Validation Case 6: Dispatched requirement -> show actual transporter, NOT customer latest suggestion', () => {
      const dispatches = [
        {
          id: 'd-cust-latest',
          party_id: 'cust-A',
          transporter_name: 'Customer Latest Transporter',
          driver_mobile: '9999911111',
          dispatch_date: '2026-11-24',
          status: 'Dispatched'
        }
      ];
      const historyMap = buildCustomerLatestDispatchMap(dispatches, [], metaMap);

      const dispatchedReq = {
        id: 'req-disp-actual',
        party_id: 'cust-A',
        status: 'Closed',
        dispatch_progress: 'Fully Dispatched',
        required_quantity: 50,
        total_dispatched_quantity: 50,
        dispatches: [
          {
            id: 'd-actual',
            requirement_id: 'req-disp-actual',
            transporter_name: 'Sharma Roadlines',
            driver_mobile: '9784567890',
            dispatch_date: '2026-11-18',
            status: 'Dispatched'
          }
        ]
      };

      const result = resolveRequirementTransporter(dispatchedReq, historyMap, metaMap);
      assert.strictEqual(result.isDispatched, true);
      assert.strictEqual(result.isSuggested, false);
      assert.strictEqual(result.transporterName, 'Sharma Roadlines');
      assert.strictEqual(result.mobileNumber, '9784567890');
      assert.strictEqual(result.date, '2026-11-18');
      assert.notStrictEqual(result.transporterName, 'Customer Latest Transporter');
    });

    it('Validation Case 7: Historical dispatched requirement without details -> display "Transport details unavailable"', () => {
      const dispatchedWithoutDetails = {
        id: 'req-hist-no-details',
        party_id: 'cust-hist',
        status: 'Closed',
        dispatch_progress: 'Fully Dispatched',
        required_quantity: 40,
        total_dispatched_quantity: 40,
        dispatches: [] // No dispatch records attached
      };

      const result = resolveRequirementTransporter(dispatchedWithoutDetails, {}, metaMap);
      assert.strictEqual(result.isDispatched, true);
      assert.strictEqual(result.hasDetails, false);
      assert.strictEqual(result.fallbackMessage, 'Transport details unavailable');
    });

    it('Validation Case 8: Transporter metadata phone fallback when dispatch has missing driver_mobile', () => {
      const dispatches = [
        {
          id: 'd-no-phone',
          party_id: 'cust-C',
          transporter_name: 'Vishnu Transport',
          driver_mobile: null,
          dispatch_date: '2026-11-18',
          status: 'Dispatched'
        }
      ];
      const historyMap = buildCustomerLatestDispatchMap(dispatches, [], metaMap);

      const pendingReq = {
        id: 'req-c',
        party_id: 'cust-C',
        status: 'Identified',
        required_quantity: 75,
        total_dispatched_quantity: 0
      };

      const result = resolveRequirementTransporter(pendingReq, historyMap, metaMap);
      assert.strictEqual(result.transporterName, 'Vishnu Transport');
      assert.strictEqual(result.mobileNumber, '9829012345');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Search by Transporter Name or Mobile
  // ─────────────────────────────────────────────────────────────────────────────
  describe('5. Search Filter Supports Transporter Name & Mobile', () => {
    it('should match requirement when searchQuery matches transporter name', () => {
      const list = [
        {
          id: 'r1',
          status: 'Identified',
          required_quantity: 50,
          transporter_info: { transporterName: 'Vishnu Transport', mobileNumber: '9829012345' }
        },
        {
          id: 'r2',
          status: 'Identified',
          required_quantity: 50,
          transporter_info: { transporterName: 'Sharma Roadlines', mobileNumber: '9784567890' }
        }
      ];

      const res = filterRequirements(list, { statusFilter: 'All Open', searchQuery: 'vishnu' });
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].id, 'r1');
    });

    it('should match requirement when searchQuery matches mobile number', () => {
      const list = [
        {
          id: 'r1',
          status: 'Identified',
          required_quantity: 50,
          transporter_info: { transporterName: 'Vishnu Transport', mobileNumber: '9829012345' }
        },
        {
          id: 'r2',
          status: 'Identified',
          required_quantity: 50,
          transporter_info: { transporterName: 'Sharma Roadlines', mobileNumber: '9784567890' }
        }
      ];

      const res = filterRequirements(list, { statusFilter: 'All Open', searchQuery: '9784567890' });
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].id, 'r2');
    });
  });
});
