import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  normalizeIndianMobile,
  isValidIndianMobile,
  validateTransportDetails,
  findTransporterByMobile,
  findOrCreateTransporter,
  confirmRequirementDispatch
} from '../transporterDispatch.js';

describe('SL-DISPATCH-TRANSPORTER-01 Transporter & Dispatch Unit Tests', () => {

  // ─────────────────────────────────────────────────────────────────────────────
  // Case 1: Phone Normalization & Valid Indian 10-Digit Mobile Numbers
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Case 1: Valid Indian Mobile Number & Normalization', () => {
    it('should validate and normalize standard 10-digit Indian mobile numbers starting with 6, 7, 8, 9', () => {
      assert.strictEqual(isValidIndianMobile('9828539054'), true);
      assert.strictEqual(normalizeIndianMobile('9828539054'), '9828539054');

      assert.strictEqual(isValidIndianMobile('8765432109'), true);
      assert.strictEqual(isValidIndianMobile('7000123456'), true);
      assert.strictEqual(isValidIndianMobile('6398765432'), true);
    });

    it('should strip spaces, dashes, parentheses and country code (+91 / 91 / 0)', () => {
      assert.strictEqual(normalizeIndianMobile('+91 98285 39054'), '9828539054');
      assert.strictEqual(isValidIndianMobile('+91 98285 39054'), true);

      assert.strictEqual(normalizeIndianMobile('+91-94144-46444'), '9414446444');
      assert.strictEqual(isValidIndianMobile('+91-94144-46444'), true);

      assert.strictEqual(normalizeIndianMobile('09828539054'), '9828539054');
      assert.strictEqual(isValidIndianMobile('09828539054'), true);

      assert.strictEqual(normalizeIndianMobile('919828539054'), '9828539054');
      assert.strictEqual(isValidIndianMobile('919828539054'), true);
    });

    it('should successfully validate new transporter input with valid name and mobile', () => {
      const res = validateTransportDetails({
        transporterName: 'Sharma Freightways',
        mobileNumber: '+91 98285 39054'
      });
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.error, null);
      assert.strictEqual(res.sanitized.transporterName, 'Sharma Freightways');
      assert.strictEqual(res.sanitized.mobileNumber, '9828539054');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Case 2: Existing Transporter Detection by Mobile Number
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Case 2: Existing Transporter Detection & Reuse', () => {
    it('should detect existing transporter from in-memory list using normalized mobile number', () => {
      const list = [
        { transporter_name: 'Jaipur Golden Transport', contact_number: '9829012345' },
        { transporter_name: 'VRL Logistics', contact_number: '9414098765' }
      ];

      const found = findTransporterByMobile(list, '+91-98290-12345');
      assert.ok(found);
      assert.strictEqual(found.transporter_name, 'Jaipur Golden Transport');
    });

    it('should reuse existing record in findOrCreateTransporter when matching mobile number exists', async () => {
      const mockDb = createMockSupabase({
        transportersByMobile: {
          '9829012345': [{ transporter_name: 'Jaipur Golden Transport', contact_number: '9829012345' }]
        }
      });

      const res = await findOrCreateTransporter(mockDb, {
        transporterName: 'Different Name Entered',
        mobileNumber: '9829012345'
      });

      assert.strictEqual(res.isExisting, true);
      assert.strictEqual(res.transporter_name, 'Jaipur Golden Transport');
      assert.strictEqual(res.contact_number, '9829012345');
      assert.strictEqual(res.matchedBy, 'mobile');
      assert.strictEqual(mockDb.insertedTransporters.length, 0); // No duplicate inserted
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Case 3: Invalid Mobile Number Validation
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Case 3: Invalid Mobile Number Rejection', () => {
    it('should reject numbers with less than 10 digits', () => {
      const res = validateTransportDetails({
        transporterName: 'VRL Logistics',
        mobileNumber: '982853'
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error, /valid 10-digit/i);
    });

    it('should reject non-numeric inputs', () => {
      const res = validateTransportDetails({
        transporterName: 'VRL Logistics',
        mobileNumber: '98285ABCDE'
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error, /valid 10-digit/i);
    });

    it('should reject mobile numbers that start with invalid digits (0, 1, 2, 3, 4, 5)', () => {
      assert.strictEqual(isValidIndianMobile('1234567890'), false);
      assert.strictEqual(isValidIndianMobile('2345678901'), false);
      assert.strictEqual(isValidIndianMobile('5555555555'), false);

      const res = validateTransportDetails({
        transporterName: 'VRL Logistics',
        mobileNumber: '1234567890'
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error, /valid 10-digit/i);
    });

    it('should reject numbers with more than 10 digits that do not have country code', () => {
      assert.strictEqual(isValidIndianMobile('982853905499'), false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Case 4: Empty Transporter Name Validation
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Case 4: Empty Transporter Name Rejection', () => {
    it('should reject empty or whitespace-only transporter name', () => {
      const res1 = validateTransportDetails({
        transporterName: '',
        mobileNumber: '9828539054'
      });
      assert.strictEqual(res1.isValid, false);
      assert.match(res1.error, /Transporter name is required/i);

      const res2 = validateTransportDetails({
        transporterName: '   ',
        mobileNumber: '9828539054'
      });
      assert.strictEqual(res2.isValid, false);
      assert.match(res2.error, /Transporter name is required/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Case 5: Empty Mobile Number Validation
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Case 5: Empty Mobile Number Rejection', () => {
    it('should reject empty or null mobile number', () => {
      const res1 = validateTransportDetails({
        transporterName: 'Shree Karni Transport',
        mobileNumber: ''
      });
      assert.strictEqual(res1.isValid, false);
      assert.match(res1.error, /Mobile number is required/i);

      const res2 = validateTransportDetails({
        transporterName: 'Shree Karni Transport',
        mobileNumber: null
      });
      assert.strictEqual(res2.isValid, false);
      assert.match(res2.error, /Mobile number is required/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Case 6: DB Failure During Transporter Creation
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Case 6: DB Failure During Transporter Creation', () => {
    it('should safely abort and not touch dispatches or requirements if transporter creation fails', async () => {
      const mockDb = createMockSupabase({
        insertTransporterError: new Error('Database connection failed on transporter_metadata')
      });

      const requirement = { id: 'req-101', quantity: 100, unit: 'Bags', status: 'Approved' };

      await assert.rejects(
        async () => {
          await confirmRequirementDispatch(mockDb, {
            requirement,
            transporterName: 'New Roadways',
            mobileNumber: '9828539054'
          });
        },
        /Failed to create new transporter/i
      );

      // Verify no dispatches were inserted and requirement was not modified
      assert.strictEqual(mockDb.insertedDispatches.length, 0);
      assert.strictEqual(mockDb.updatedRequirements.length, 0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Case 7: DB Failure During Dispatch Confirmation & Rollback
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Case 7: DB Failure During Dispatch Confirmation & Rollback', () => {
    it('should abort and rollback dispatch record if requirement status update fails', async () => {
      const mockDb = createMockSupabase({
        updateRequirementError: new Error('Permission denied updating requirement')
      });

      const requirement = { id: 'req-202', quantity: 50, unit: 'Bags', status: 'Approved' };

      await assert.rejects(
        async () => {
          await confirmRequirementDispatch(mockDb, {
            requirement,
            transporterName: 'Safe Express',
            mobileNumber: '9828539054'
          });
        },
        /Failed to update requirement status/i
      );

      // Verify that rollback deleted the temporary dispatch record
      assert.strictEqual(mockDb.deletedDispatches.length, 1);
      assert.strictEqual(mockDb.deletedDispatches[0], 'dispatch-uuid-mock');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Case 8: Transporter Record Conforms to Transporter List Schema
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Case 8: Transporter Schema for Transporter List (Logistics.jsx)', () => {
    it('should create transporter record matching public.transporter_metadata schema', async () => {
      const mockDb = createMockSupabase();

      const res = await findOrCreateTransporter(mockDb, {
        transporterName: 'Marwar Cargo Carrier',
        mobileNumber: '+91 94144 46444'
      });

      assert.strictEqual(res.isExisting, false);
      assert.strictEqual(res.transporter_name, 'Marwar Cargo Carrier');
      assert.strictEqual(res.contact_number, '9414446444');

      const saved = mockDb.insertedTransporters[0];
      assert.ok(saved);
      assert.strictEqual(saved.transporter_name, 'Marwar Cargo Carrier');
      assert.strictEqual(saved.contact_number, '9414446444');
      assert.strictEqual(saved.is_fraud, false);
      assert.deepStrictEqual(saved.added_locations, []);
      assert.deepStrictEqual(saved.removed_locations, []);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Case 9: Transporter Linked to Dispatch History
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Case 9: Transporter Linked to Dispatch Record', () => {
    it('should store transporter_name and contact_number into requirement_dispatches and history note', async () => {
      const mockDb = createMockSupabase();
      const requirement = {
        id: 'req-303',
        customer_name: 'Aggarwal Mills',
        quantity: 250,
        unit: 'Bags',
        status: 'Approved'
      };

      const result = await confirmRequirementDispatch(mockDb, {
        requirement,
        transporterName: 'Choudhary Roadlines',
        mobileNumber: '9828539054',
        userProfile: { id: 'usr-admin-1', role: 'Admin' }
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.transporter.transporter_name, 'Choudhary Roadlines');
      assert.strictEqual(result.transporter.contact_number, '9828539054');

      // Verify dispatch record
      const dispatch = mockDb.insertedDispatches[0];
      assert.strictEqual(dispatch.requirement_id, 'req-303');
      assert.strictEqual(dispatch.transporter_name, 'Choudhary Roadlines');
      assert.strictEqual(dispatch.driver_mobile, '9828539054');
      assert.strictEqual(dispatch.status, 'Dispatched');
      assert.strictEqual(dispatch.quantity, 250);

      // Verify requirement updated to Closed
      const updatedReq = mockDb.updatedRequirements[0];
      assert.strictEqual(updatedReq.id, 'req-303');
      assert.strictEqual(updatedReq.status, 'Closed');

      // Verify history logged
      const history = mockDb.insertedHistory[0];
      assert.strictEqual(history.requirement_id, 'req-303');
      assert.strictEqual(history.new_status, 'Closed');
      assert.match(history.note, /Choudhary Roadlines/);
      assert.match(history.note, /9828539054/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Case 10: Duplicate Prevention
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Case 10: Duplicate Prevention Across Multiple Dispatches', () => {
    it('should not duplicate transporter on subsequent dispatches using the same mobile number', async () => {
      const mockDb = createMockSupabase();

      // First dispatch with New Transporter
      await confirmRequirementDispatch(mockDb, {
        requirement: { id: 'req-401', quantity: 100, unit: 'Bags', status: 'Approved' },
        transporterName: 'Rajasthan Goods Transport',
        mobileNumber: '9828539054'
      });

      assert.strictEqual(mockDb.insertedTransporters.length, 1);

      // Second dispatch with same mobile number (even if typed with different formatting)
      await confirmRequirementDispatch(mockDb, {
        requirement: { id: 'req-402', quantity: 200, unit: 'Bags', status: 'Approved' },
        transporterName: 'Rajasthan Goods Transport Corp',
        mobileNumber: '+91 98285-39054'
      });

      // Still only 1 record created in transporter master!
      assert.strictEqual(mockDb.insertedTransporters.length, 1);
      // Both dispatches linked to the same transporter name
      assert.strictEqual(mockDb.insertedDispatches[0].transporter_name, 'Rajasthan Goods Transport');
      assert.strictEqual(mockDb.insertedDispatches[1].transporter_name, 'Rajasthan Goods Transport');
    });
  });
});

/**
 * Creates a mock Supabase client for testing dispatch & transporter workflows.
 */
function createMockSupabase(options = {}) {
  const {
    transportersByMobile = {},
    transportersByName = {},
    insertTransporterError = null,
    updateRequirementError = null,
    insertDispatchError = null
  } = options;

  const insertedTransporters = [];
  const insertedDispatches = [];
  const deletedDispatches = [];
  const updatedRequirements = [];
  const insertedHistory = [];

  const dbState = {
    transporter_metadata: Object.values(transportersByMobile).flat()
  };

  const client = {
    insertedTransporters,
    insertedDispatches,
    deletedDispatches,
    updatedRequirements,
    insertedHistory,
    from: (table) => {
      return {
        select: (cols) => {
          let filterCol = null;
          let filterVal = null;
          const queryObj = {
            eq: (col, val) => {
              filterCol = col;
              filterVal = val;
              return queryObj;
            },
            limit: (n) => {
              if (table === 'transporter_metadata') {
                if (filterCol === 'contact_number') {
                  const match = dbState.transporter_metadata.filter(t => t.contact_number === filterVal);
                  return Promise.resolve({ data: match, error: null });
                }
                if (filterCol === 'transporter_name') {
                  const match = dbState.transporter_metadata.filter(t => t.transporter_name === filterVal);
                  return Promise.resolve({ data: match, error: null });
                }
                return Promise.resolve({ data: dbState.transporter_metadata, error: null });
              }
              return Promise.resolve({ data: [], error: null });
            }
          };
          return queryObj;
        },
        insert: (payload) => {
          if (table === 'transporter_metadata') {
            if (insertTransporterError) {
              return Promise.resolve({ data: null, error: insertTransporterError });
            }
            insertedTransporters.push(payload);
            dbState.transporter_metadata.push(payload);
            return Promise.resolve({ data: payload, error: null });
          }

          if (table === 'requirement_dispatches') {
            if (insertDispatchError) {
              return { select: () => ({ single: () => Promise.resolve({ data: null, error: insertDispatchError }) }) };
            }
            const record = { id: 'dispatch-uuid-mock', ...payload };
            insertedDispatches.push(record);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: record, error: null })
              })
            };
          }

          if (table === 'requirement_status_history') {
            insertedHistory.push(payload);
            return Promise.resolve({ data: payload, error: null });
          }

          return Promise.resolve({ data: payload, error: null });
        },
        update: (payload) => {
          return {
            eq: (col, val) => {
              if (table === 'requirements') {
                if (updateRequirementError) {
                  return Promise.resolve({ error: updateRequirementError });
                }
                updatedRequirements.push({ id: val, ...payload });
                return Promise.resolve({ error: null });
              }
              if (table === 'transporter_metadata') {
                return Promise.resolve({ error: null });
              }
              return Promise.resolve({ error: null });
            }
          };
        },
        delete: () => {
          return {
            eq: (col, val) => {
              if (table === 'requirement_dispatches') {
                deletedDispatches.push(val);
                return Promise.resolve({ error: null });
              }
              return Promise.resolve({ error: null });
            }
          };
        }
      };
    }
  };

  return client;
}
