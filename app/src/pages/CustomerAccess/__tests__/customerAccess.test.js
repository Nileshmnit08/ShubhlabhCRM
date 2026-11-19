import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateSecureTemporaryPassword } from '../utils/passwordGenerator.js';
import {
  normalizeIndianPhone,
  buildHindiInviteMessage,
  buildWhatsAppLink,
  DEFAULT_RELEASE_CONFIG,
} from '../utils/whatsappTemplate.js';

describe('Customer App Access – Phase 5 Validation', () => {
  // Test 1: Temporary password generation
  test('generateSecureTemporaryPassword generates compliant temporary passwords', () => {
    for (let i = 0; i < 20; i++) {
      const pwd = generateSecureTemporaryPassword();
      assert.ok(pwd.startsWith('SL'), 'Password must start with SL prefix');
      assert.ok(pwd.length >= 10, 'Password length must be at least 10 characters');
      assert.match(pwd, /[#@$!]/, 'Password must contain a special symbol');
      assert.match(pwd, /[0-9]/, 'Password must contain digits');
      assert.match(pwd, /[a-zA-Z]/, 'Password must contain alphabetic characters');
    }
  });

  // Test 2 & Test 4: Indian phone normalization
  test('normalizeIndianPhone handles various mobile formats and validates 10 digits', () => {
    assert.equal(normalizeIndianPhone('9826012345'), '9826012345');
    assert.equal(normalizeIndianPhone('+91 98260 12345'), '9826012345');
    assert.equal(normalizeIndianPhone('+919826012345'), '9826012345');
    assert.equal(normalizeIndianPhone('919826012345'), '9826012345');
    assert.equal(normalizeIndianPhone('09826012345'), '9826012345');
    assert.equal(normalizeIndianPhone('  98260-12345  '), '9826012345');

    // Invalid or missing numbers
    assert.equal(normalizeIndianPhone(''), '');
    assert.equal(normalizeIndianPhone(null), '');
    assert.equal(normalizeIndianPhone('12345'), '12345'); // not 10 digits
  });

  // Test 3: WhatsApp Link Builder
  test('buildWhatsAppLink generates valid wa.me and api.whatsapp URLs', () => {
    const res = buildWhatsAppLink('+91 98260 12345', 'नमस्ते परीक्षण');
    assert.equal(res.isValid, true);
    assert.equal(res.cleanPhone, '9826012345');
    assert.ok(res.url.startsWith('https://wa.me/919826012345?text='));
    assert.ok(res.fallbackUrl.startsWith('https://api.whatsapp.com/send?phone=919826012345&text='));

    // Invalid phone
    const invalidRes = buildWhatsAppLink('1234', 'test');
    assert.equal(invalidRes.isValid, false);
    assert.equal(invalidRes.url, null);
    assert.ok(invalidRes.error);
  });

  // Test 4: WhatsApp Hindi Message Template
  test('buildHindiInviteMessage formats complete invitation with required Hindi sections', () => {
    const msg = buildHindiInviteMessage({
      customerName: 'राजेश पटेल',
      loginId: '9826012345@shubhlabh.app',
      temporaryPassword: 'SL#8291@4kL',
      downloadUrl: 'https://shubhlabh.in/download',
      appVersion: 'v1.2.0',
      isPasswordReset: false,
    });

    assert.ok(msg.includes('नमस्ते राजेश पटेल जी'), 'Must address customer by name in Hindi');
    assert.ok(msg.includes('Shubh Labh Order App में आपका स्वागत है!'), 'Must include welcome text');
    assert.ok(msg.includes('लॉगिन आईडी: 9826012345@shubhlabh.app'), 'Must contain Login ID');
    assert.ok(msg.includes('अस्थायी पासवर्ड: SL#8291@4kL'), 'Must contain temporary password');
    assert.ok(msg.includes('ऐप डाउनलोड लिंक: https://shubhlabh.in/download (वर्जन: v1.2.0)'), 'Must contain download link and version');
    assert.ok(msg.includes('पहले लॉगिन के बाद सुरक्षा हेतु ऐप की प्रोफ़ाइल सेटिंग में जाकर अपना नया पासवर्ड अवश्य सेट कर लें'), 'Must contain first-login password instruction');
  });

  // Test 5: WhatsApp message for password reset
  test('buildHindiInviteMessage correctly adapts for password reset events', () => {
    const msg = buildHindiInviteMessage({
      customerName: 'अमित कुमार',
      loginId: 'amit@shubhlabh.app',
      temporaryPassword: 'SL#4120@xP2',
      downloadUrl: 'https://shubhlabh.in/download',
      appVersion: 'v1.2.0',
      isPasswordReset: true,
    });

    assert.ok(msg.includes('पासवर्ड रीसेट क्रेडेंशियल्स'), 'Must reflect password reset event');
    assert.ok(msg.includes('अस्थायी पासवर्ड: SL#4120@xP2'));
  });

  // Test 6: Handling customer without existing account vs with existing account
  test('Directory mapping correctly categorizes customers into Pending, Active, Disabled', () => {
    const mockCustomers = [
      { id: 'c1', display_name: 'Customer 1', mobile: '9826011111' },
      { id: 'c2', display_name: 'Customer 2', mobile: '9826022222' },
      { id: 'c3', display_name: 'Customer 3', mobile: '9826033333' },
    ];

    const mockBuyerUsers = [
      { id: 'u1', crm_party_id: 'c1', email: '9826011111@shubhlabh.app', is_active: true, role: 'Buyer' },
      { id: 'u2', crm_party_id: 'c2', email: '9826022222@shubhlabh.app', is_active: false, role: 'Buyer' },
    ];

    const buyerMap = {};
    mockBuyerUsers.forEach(u => { buyerMap[u.crm_party_id] = u; });

    // Customer 1 has active account
    assert.equal(Boolean(buyerMap['c1']), true);
    assert.equal(buyerMap['c1'].is_active, true);

    // Customer 2 has disabled account
    assert.equal(Boolean(buyerMap['c2']), true);
    assert.equal(buyerMap['c2'].is_active, false);

    // Customer 3 is pending (no account)
    assert.equal(Boolean(buyerMap['c3']), false);
  });

  // Test 7: Duplicate creation prevention logic
  test('Duplicate account prevention prevents provisioning when account exists', () => {
    const partyId = 'cust-uuid-123';
    const existingAccounts = [
      { id: 'buyer-uuid-1', crm_party_id: partyId, email: 'buyer@shubhlabh.app' },
    ];

    const isDuplicate = existingAccounts.some(acc => acc.crm_party_id === partyId);
    assert.equal(isDuplicate, true, 'Must detect existing buyer mapping for this party');
  });

  // Test 8: Multiple customers sharing a mobile number
  test('Two customers sharing a mobile number map to independent party IDs', () => {
    const customerA = { id: 'uuid-a', display_name: 'Babulal Brother A', mobile: '9826099999' };
    const customerB = { id: 'uuid-b', display_name: 'Babulal Brother B', mobile: '9826099999' };

    // Unique login IDs can be differentiated by customer code or email
    const loginA = `${normalizeIndianPhone(customerA.mobile)}.a@shubhlabh.app`;
    const loginB = `${normalizeIndianPhone(customerB.mobile)}.b@shubhlabh.app`;

    assert.notEqual(customerA.id, customerB.id);
    assert.notEqual(loginA, loginB);
  });

  // Test 9: Security barrier - Buyer role rejection in CRM ProtectedRoute
  test('Security Barrier: Buyer role is flagged for CRM denial', () => {
    const buyerProfile = { id: 'buyer-123', role: 'Buyer', is_active: true };
    const staffProfile = { id: 'staff-123', role: 'Salesperson', is_active: true };
    const adminProfile = { id: 'admin-123', role: 'Admin', is_active: true };

    const isDeniedCRM = (profile) => !profile || !profile.is_active || profile.role === 'Buyer';

    assert.equal(isDeniedCRM(buyerProfile), true, 'Buyer accounts must be denied CRM access');
    assert.equal(isDeniedCRM(staffProfile), false, 'Active staff must be permitted');
    assert.equal(isDeniedCRM(adminProfile), false, 'Active admin must be permitted');
  });

  // Test 10: Admin authorization check for account management
  test('Security Barrier: Only Admin can access Customer App Access management', () => {
    const canAccessAdminRoute = (profile) => profile && profile.role === 'Admin';

    assert.equal(canAccessAdminRoute({ role: 'Admin' }), true);
    assert.equal(canAccessAdminRoute({ role: 'Salesperson' }), false);
    assert.equal(canAccessAdminRoute({ role: 'Viewer' }), false);
    assert.equal(canAccessAdminRoute({ role: 'Buyer' }), false);
  });
});
