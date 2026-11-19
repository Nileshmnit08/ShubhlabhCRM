import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('CRM-CUSTOMER-UPDATES-02: Customer Updates Edit, Visibility & Soft Deactivation', () => {

  describe('1. Customer App Visibility & Deactivation Filtering Rules', () => {
    const notices = [
      { id: '1', title: 'Active Published Visible', status: 'PUBLISHED', is_active: true, is_visible_in_app: true },
      { id: '2', title: 'Active Closed Visible', status: 'CLOSED', is_active: true, is_visible_in_app: true },
      { id: '3', title: 'Hidden Update', status: 'PUBLISHED', is_active: true, is_visible_in_app: false },
      { id: '4', title: 'Deactivated Update', status: 'PUBLISHED', is_active: false, is_visible_in_app: true },
      { id: '5', title: 'Draft Update', status: 'DRAFT', is_active: true, is_visible_in_app: true },
      { id: '6', title: 'Hidden and Deactivated', status: 'CLOSED', is_active: false, is_visible_in_app: false },
    ];

    it('excludes hidden and deactivated updates from customer-facing view', () => {
      const customerVisible = notices.filter(item => 
        ['PUBLISHED', 'CLOSED'].includes(item.status) &&
        item.is_active !== false && 
        item.is_visible_in_app !== false
      );

      assert.equal(customerVisible.length, 2);
      assert.deepEqual(customerVisible.map(n => n.id), ['1', '2']);
    });

    it('allows closed updates to appear in customer app when visible and active', () => {
      const closedNotice = notices.find(n => n.id === '2');
      const isEligible = ['PUBLISHED', 'CLOSED'].includes(closedNotice.status) &&
                         closedNotice.is_active !== false &&
                         closedNotice.is_visible_in_app !== false;
      assert.equal(isEligible, true);
    });

    it('rejects access to deactivated notice in detail view', () => {
      const targetNotice = notices.find(n => n.id === '4');
      const isVisible = targetNotice && targetNotice.is_active !== false && targetNotice.is_visible_in_app !== false;
      assert.equal(isVisible, false);
    });
  });

  describe('2. Safe Recipient Merge (Preserving Read Tracking)', () => {
    it('preserves existing read_at when recipient list is updated', () => {
      const existingRecipients = [
        { id: 'rec-1', customer_id: 'cust-A', read_at: '2026-11-19T10:00:00Z' },
        { id: 'rec-2', customer_id: 'cust-B', read_at: null },
        { id: 'rec-3', customer_id: 'cust-C', read_at: '2026-11-19T10:30:00Z' },
      ];

      // Admin selects cust-A (kept), cust-B (kept), cust-D (added), cust-C (removed)
      const newSelectedCustomerIds = ['cust-A', 'cust-B', 'cust-D'];

      const existingMap = new Map(existingRecipients.map(r => [r.customer_id, r.id]));
      const newCustomerSet = new Set(newSelectedCustomerIds);

      // Deletions
      const toDeleteIds = existingRecipients
        .filter(r => !newCustomerSet.has(r.customer_id))
        .map(r => r.id);

      assert.deepEqual(toDeleteIds, ['rec-3'], 'Only unselected cust-C recipient row should be deleted');

      // Additions
      const toAddPayload = newSelectedCustomerIds
        .filter(cid => !existingMap.has(cid))
        .map(cid => ({ update_id: 'upd-1', customer_id: cid }));

      assert.deepEqual(toAddPayload, [{ update_id: 'upd-1', customer_id: 'cust-D' }], 'Only new cust-D should be inserted');

      // Unchanged recipients retain their read_at
      const remainingRecipients = existingRecipients.filter(r => !toDeleteIds.includes(r.id));
      const custARec = remainingRecipients.find(r => r.customer_id === 'cust-A');
      assert.equal(custARec.read_at, '2026-11-19T10:00:00Z', 'cust-A read_at timestamp must remain intact');
    });
  });

  describe('3. Edit Save Payload Integrity', () => {
    it('preserves PUBLISHED status and published_at on published updates', () => {
      const currentUpdate = {
        id: 'upd-99',
        title: 'Original Title',
        type: 'PRICE_UPDATE',
        message: 'Original Message',
        status: 'PUBLISHED',
        published_at: '2026-11-15T08:00:00Z',
        is_visible_in_app: true,
        is_active: true
      };

      // Admin edits title and message, saving changes without publishing afresh
      const editedTitle = 'Updated Title';
      const editedMessage = 'Updated Message';

      const savePayload = {
        title: editedTitle.trim(),
        type: currentUpdate.type,
        message: editedMessage.trim(),
        audience_type: 'ALL',
        status: currentUpdate.status, // Remains PUBLISHED
        published_at: currentUpdate.published_at, // Preserves original published timestamp
        is_visible_in_app: currentUpdate.is_visible_in_app,
        is_active: currentUpdate.is_active,
        updated_at: new Date().toISOString()
      };

      assert.equal(savePayload.status, 'PUBLISHED');
      assert.equal(savePayload.published_at, '2026-11-15T08:00:00Z');
      assert.equal(savePayload.title, 'Updated Title');
      assert.equal(savePayload.message, 'Updated Message');
    });
  });

  describe('4. Soft Deactivation State Transitions', () => {
    it('sets is_active to false and records deactivated_at without deleting record', () => {
      const record = {
        id: 'upd-100',
        title: 'Discount Offer',
        is_active: true,
        deactivated_at: null
      };

      // Soft deactivation operation
      const deactivationUpdate = {
        is_active: false,
        deactivated_at: new Date().toISOString()
      };

      const deactivatedRecord = { ...record, ...deactivationUpdate };
      assert.equal(deactivatedRecord.is_active, false);
      assert.ok(deactivatedRecord.deactivated_at);
      assert.equal(deactivatedRecord.id, 'upd-100', 'Record still exists in storage');
    });

    it('reactivates cleanly by restoring is_active and clearing deactivated_at', () => {
      const deactivatedRecord = {
        id: 'upd-100',
        title: 'Discount Offer',
        is_active: false,
        deactivated_at: '2026-11-19T11:00:00Z'
      };

      const reactivateUpdate = {
        is_active: true,
        deactivated_at: null
      };

      const restoredRecord = { ...deactivatedRecord, ...reactivateUpdate };
      assert.equal(restoredRecord.is_active, true);
      assert.equal(restoredRecord.deactivated_at, null);
    });
  });

});
