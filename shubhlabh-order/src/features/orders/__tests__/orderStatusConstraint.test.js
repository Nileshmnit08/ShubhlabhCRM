import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PERMITTED_REQUIREMENT_STATUSES,
  normalizeRequirementStatus,
  buildRequirementPayload,
} from '../orderSubmission.js';

describe('SL-ORDER-CUSTOMER-ORDER-STATUS-FIX-01: req_status_check Constraint & Status Normalization', () => {
  it('1. Authoritative permitted statuses conform to database req_status_check constraint', () => {
    const expected = [
      'New',
      'Quotation Required',
      'Quotation Sent',
      'Negotiation',
      'Confirmed',
      'Lost',
      'Closed'
    ];
    assert.equal(PERMITTED_REQUIREMENT_STATUSES.size, 7);
    for (const st of expected) {
      assert.ok(PERMITTED_REQUIREMENT_STATUSES.has(st), `Missing permitted status: ${st}`);
    }
  });

  it('2. Preserves valid canonical statuses as-is', () => {
    assert.equal(normalizeRequirementStatus('New'), 'New');
    assert.equal(normalizeRequirementStatus('Confirmed'), 'Confirmed');
    assert.equal(normalizeRequirementStatus('Closed'), 'Closed');
    assert.equal(normalizeRequirementStatus('Quotation Required'), 'Quotation Required');
    assert.equal(normalizeRequirementStatus('Quotation Sent'), 'Quotation Sent');
    assert.equal(normalizeRequirementStatus('Negotiation'), 'Negotiation');
    assert.equal(normalizeRequirementStatus('Lost'), 'Lost');
  });

  it('3. Normalizes uppercase UI/canonical labels into valid case-sensitive DB statuses', () => {
    assert.equal(normalizeRequirementStatus('NEW'), 'New');
    assert.equal(normalizeRequirementStatus('CONFIRMED'), 'Confirmed');
    assert.equal(normalizeRequirementStatus('CLOSED'), 'Closed');
    assert.equal(normalizeRequirementStatus('QUOTATION REQUIRED'), 'Quotation Required');
    assert.equal(normalizeRequirementStatus('QUOTATION SENT'), 'Quotation Sent');
    assert.equal(normalizeRequirementStatus('NEGOTIATION'), 'Negotiation');
    assert.equal(normalizeRequirementStatus('LOST'), 'Lost');
  });

  it('4. Safely sanitizes invalid statuses (Open, Draft, Pending, Order Lag Gaya) to "New"', () => {
    assert.equal(normalizeRequirementStatus('Open'), 'New');
    assert.equal(normalizeRequirementStatus('Draft'), 'New');
    assert.equal(normalizeRequirementStatus('Pending'), 'New');
    assert.equal(normalizeRequirementStatus('Placed'), 'New');
    assert.equal(normalizeRequirementStatus('Submitted'), 'New');
    assert.equal(normalizeRequirementStatus('Order Lag Gaya'), 'New');
    assert.equal(normalizeRequirementStatus('PROCESSING'), 'New');
    assert.equal(normalizeRequirementStatus('DISPATCHED'), 'New');
    assert.equal(normalizeRequirementStatus('DELIVERED'), 'New');
    assert.equal(normalizeRequirementStatus('CANCELLED'), 'New');
    assert.equal(normalizeRequirementStatus(null), 'New');
    assert.equal(normalizeRequirementStatus(undefined), 'New');
    assert.equal(normalizeRequirementStatus(''), 'New');
  });

  it('5. buildRequirementPayload in mode="create" ALWAYS produces status="New"', () => {
    const profile = { id: 'cust-uuid-1', display_name: 'Test Customer' };
    const payload = buildRequirementPayload({
      mode: 'create',
      customerProfile: profile,
      address: 'Shop 10, Mandi',
      clientReferenceId: 'ref-12345'
    });

    assert.equal(payload.party_id, 'cust-uuid-1');
    assert.equal(payload.status, 'New');
    assert.equal(payload.unit, 'Bags');
    assert.ok(PERMITTED_REQUIREMENT_STATUSES.has(payload.status));
  });

  it('6. buildRequirementPayload in mode="reorder" ALWAYS produces status="New"', () => {
    const profile = { id: 'cust-uuid-2', display_name: 'Repeat Customer' };
    const payload = buildRequirementPayload({
      mode: 'reorder',
      customerProfile: profile,
      existingOrder: { id: 'old-1', status: 'CONFIRMED' },
      address: 'Shop 12',
      clientReferenceId: 'ref-reorder-99'
    });

    assert.equal(payload.status, 'New');
    assert.ok(PERMITTED_REQUIREMENT_STATUSES.has(payload.status));
  });

  it('7. buildRequirementPayload in mode="edit" normalizes status to satisfy req_status_check', () => {
    const profile = { id: 'cust-uuid-3', display_name: 'Edit Customer' };
    
    // Case A: normalized existingOrder has uppercase 'NEW'
    const payloadA = buildRequirementPayload({
      mode: 'edit',
      customerProfile: profile,
      existingOrder: { id: 'old-2', status: 'NEW' },
      address: 'Shop 14',
      clientReferenceId: 'ref-edit-1'
    });
    assert.equal(payloadA.status, 'New');
    assert.ok(PERMITTED_REQUIREMENT_STATUSES.has(payloadA.status));

    // Case B: existingOrder with raw_status = 'Confirmed'
    const payloadB = buildRequirementPayload({
      mode: 'edit',
      customerProfile: profile,
      existingOrder: { id: 'old-3', status: 'CONFIRMED', raw_status: 'Confirmed' },
      address: 'Shop 14',
      clientReferenceId: 'ref-edit-2'
    });
    assert.equal(payloadB.status, 'Confirmed');
    assert.ok(PERMITTED_REQUIREMENT_STATUSES.has(payloadB.status));

    // Case C: existingOrder with invalid/legacy status
    const payloadC = buildRequirementPayload({
      mode: 'edit',
      customerProfile: profile,
      existingOrder: { id: 'old-4', status: 'Open' },
      address: 'Shop 14',
      clientReferenceId: 'ref-edit-3'
    });
    assert.equal(payloadC.status, 'New');
    assert.ok(PERMITTED_REQUIREMENT_STATUSES.has(payloadC.status));
  });
});
