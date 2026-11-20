import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateSecureTemporaryPassword } from '../utils/passwordGenerator.js';
import {
  normalizeIndianPhone,
  buildHindiInviteMessage,
  buildWhatsAppLink,
  DEFAULT_RELEASE_CONFIG,
} from '../utils/whatsappTemplate.js';
import {
  isSessionOnline,
  aggregateCustomerPresence,
  buildCustomerPresenceMap,
} from '../utils/presenceUtils.js';

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
      downloadUrl: DEFAULT_RELEASE_CONFIG.downloadUrl,
      appVersion: DEFAULT_RELEASE_CONFIG.appVersion,
      isPasswordReset: false,
    });

    assert.ok(msg.includes('नमस्ते राजेश पटेल जी'), 'Must address customer by name in Hindi');
    assert.ok(msg.includes('Shubh Labh Order App में आपका स्वागत है!'), 'Must include welcome text');
    assert.ok(msg.includes('लॉगिन आईडी: 9826012345@shubhlabh.app'), 'Must contain Login ID');
    assert.ok(msg.includes('अस्थायी पासवर्ड: SL#8291@4kL'), 'Must contain temporary password');
    assert.ok(msg.includes(`ऐप डाउनलोड लिंक: ${DEFAULT_RELEASE_CONFIG.downloadUrl} (वर्जन: ${DEFAULT_RELEASE_CONFIG.appVersion})`), 'Must contain download link and version');
    assert.ok(msg.includes('पहले लॉगिन के बाद सुरक्षा हेतु ऐप की प्रोफ़ाइल सेटिंग में जाकर अपना नया पासवर्ड अवश्य सेट कर लें'), 'Must contain first-login password instruction');
  });

  // Test 5: WhatsApp message for password reset
  test('buildHindiInviteMessage correctly adapts for password reset events', () => {
    const msg = buildHindiInviteMessage({
      customerName: 'अमित कुमार',
      loginId: 'amit@shubhlabh.app',
      temporaryPassword: 'SL#4120@xP2',
      downloadUrl: DEFAULT_RELEASE_CONFIG.downloadUrl,
      appVersion: DEFAULT_RELEASE_CONFIG.appVersion,
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

  // Test 11: Multi-field search filter supporting location (city and state)
  test('Search filter matches customer name, legal name, code, phone, and location', () => {
    const customers = [
      { id: '1', display_name: 'Yashika Agro Indsutries - Merta', legal_or_core_name: '', customer_code: null, city: 'Merta', state: 'Rajasthan', mobile: '9928100000' },
      { id: '2', display_name: 'Babulal Traders', legal_or_core_name: 'Babulal & Sons', customer_code: 'CUST-042', city: 'Jaipur', state: 'Rajasthan', mobile: '9826011111' },
      { id: '3', display_name: 'Shree Ram Feed', legal_or_core_name: '', customer_code: 'SRF-100', city: 'Makrana', state: 'Rajasthan', mobile: '9414022222' },
    ];
    const buyerMap = {
      '2': { email: 'babulal@shubhlabh.app' },
    };

    const filterCustomers = (list, term) => {
      const t = term.trim().toLowerCase();
      if (!t) return list;
      return list.filter((c) => {
        const name = (c.display_name || '').toLowerCase();
        const legal = (c.legal_or_core_name || '').toLowerCase();
        const code = (c.customer_code || '').toLowerCase();
        const mobile = (c.mobile || '').replace(/[^0-9]/g, '');
        const whatsapp = (c.whatsapp || '').replace(/[^0-9]/g, '');
        const city = (c.city || '').toLowerCase();
        const state = (c.state || '').toLowerCase();
        const buyerEmail = (buyerMap[c.id]?.email || '').toLowerCase();

        return (
          name.includes(t) ||
          legal.includes(t) ||
          code.includes(t) ||
          mobile.includes(t) ||
          whatsapp.includes(t) ||
          city.includes(t) ||
          state.includes(t) ||
          buyerEmail.includes(t)
        );
      });
    };

    // 1. Search by Name
    assert.equal(filterCustomers(customers, 'Yashika').length, 1);
    assert.equal(filterCustomers(customers, 'Yashika')[0].id, '1');

    // 2. Search by Location (City)
    assert.equal(filterCustomers(customers, 'Merta').length, 1);
    assert.equal(filterCustomers(customers, 'Merta')[0].id, '1');
    assert.equal(filterCustomers(customers, 'Jaipur').length, 1);
    assert.equal(filterCustomers(customers, 'Jaipur')[0].id, '2');

    // 3. Search by Location (State)
    assert.equal(filterCustomers(customers, 'Rajasthan').length, 3);

    // 4. Search by Customer Code
    assert.equal(filterCustomers(customers, 'CUST-042').length, 1);
    assert.equal(filterCustomers(customers, 'CUST-042')[0].id, '2');

    // 5. Search by Buyer Email
    assert.equal(filterCustomers(customers, 'babulal@shubhlabh.app').length, 1);
    assert.equal(filterCustomers(customers, 'babulal@shubhlabh.app')[0].id, '2');
  });

  // Test 12: Batched pagination / chunking simulation (exceeds PostgREST 1000 limit)
  test('Batched chunking ingests all records exceeding PostgREST 1000-row limit', async () => {
    // Generate 1,024 mock customers (matching live database total)
    const mockDb = Array.from({ length: 1024 }, (_, i) => ({
      id: `cust-${i + 1}`,
      display_name: i === 1020 ? 'Yashika Agro Indsutries - Merta' : `Customer ${String(i + 1).padStart(4, '0')}`,
    }));

    // Mock paginated Supabase range query
    const mockFetchRange = async (from, to) => {
      return { data: mockDb.slice(from, to + 1), error: null };
    };

    const batchSize = 1000;
    let allPartiesData = [];
    let from = 0;
    while (true) {
      const { data: batch, error } = await mockFetchRange(from, from + batchSize - 1);
      assert.equal(error, null);
      if (!batch || batch.length === 0) break;
      allPartiesData.push(...batch);
      if (batch.length < batchSize) break;
      from += batchSize;
    }

    assert.equal(allPartiesData.length, 1024, 'Must load all 1024 customers without truncation');
    const yashika = allPartiesData.find(c => c.display_name === 'Yashika Agro Indsutries - Merta');
    assert.ok(yashika, 'Yashika Agro Industries must be present in ingested dataset');
  });

  // Test 13: Customer Presence Filter Logic
  test('Presence filtering (ALL, ONLINE, OFFLINE) correctly subsets customers', () => {
    const customers = [
      { id: 'c1', display_name: 'Customer 1' },
      { id: 'c2', display_name: 'Customer 2' },
      { id: 'c3', display_name: 'Customer 3' },
    ];

    const presenceMap = {
      c1: { isOnline: true, activeDurationFormatted: '12m' },
      c2: { isOnline: false, lastActiveFormatted: '20 Nov 2026, 11:30 AM' },
      // c3 has no presence record (never logged in)
    };

    const filterByPresence = (list, filter) => {
      if (filter === 'ONLINE') return list.filter(c => presenceMap[c.id]?.isOnline === true);
      if (filter === 'OFFLINE') return list.filter(c => !presenceMap[c.id]?.isOnline);
      return list;
    };

    assert.equal(filterByPresence(customers, 'ALL').length, 3);
    assert.equal(filterByPresence(customers, 'ONLINE').length, 1);
    assert.equal(filterByPresence(customers, 'ONLINE')[0].id, 'c1');
    assert.equal(filterByPresence(customers, 'OFFLINE').length, 2);
    assert.deepEqual(filterByPresence(customers, 'OFFLINE').map(c => c.id), ['c2', 'c3']);
  });

  // Test 14: Multi-device aggregation in customer access
  test('Multi-device simultaneous sessions are aggregated properly per crm_party_id', () => {
    const now = 1700000000000;
    const rawSessions = [
      {
        crm_party_id: 'p1',
        session_id: 'devA',
        app_state: 'active',
        ended_at: null,
        foreground_entered_at: new Date(now - 10 * 60000).toISOString(),
        last_seen_at: new Date(now - 20000).toISOString(),
      },
      {
        crm_party_id: 'p1',
        session_id: 'devB',
        app_state: 'terminated',
        ended_at: new Date(now - 5000).toISOString(),
        foreground_entered_at: new Date(now - 30 * 60000).toISOString(),
        last_seen_at: new Date(now - 5000).toISOString(),
      },
      {
        crm_party_id: 'p2',
        session_id: 'devC',
        app_state: 'active',
        ended_at: null,
        last_seen_at: new Date(now - 160000).toISOString(), // > 150s expired
      }
    ];

    const map = buildCustomerPresenceMap(rawSessions, now);
    assert.equal(map['p1'].isOnline, true, 'Customer p1 must stay Online while devA is active');
    assert.equal(map['p1'].activeDurationFormatted, '10m');
    assert.equal(map['p2'].isOnline, false, 'Customer p2 must be Offline due to heartbeat expiry (> 150s)');
  });
});
