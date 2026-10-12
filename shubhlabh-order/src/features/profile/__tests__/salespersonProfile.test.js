const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Pure helper functions replicating MySalespersonScreen logic
function normalizeSalesperson(data, defaultRole = 'Field Sales Representative') {
  if (!data) return null;

  if (data.owner && data.owner.display_name) {
    return {
      id: data.owner.id,
      display_name: data.owner.display_name,
      role: data.owner.role || defaultRole,
      mobile: data.owner.mobile || null,
      whatsapp: data.owner.whatsapp || data.owner.mobile || null,
      email: data.owner.email || null,
      territory: data.territory_name || null,
    };
  }

  if (data.owner_name) {
    return {
      display_name: data.owner_name,
      role: defaultRole,
      mobile: null,
      whatsapp: null,
      email: null,
      territory: data.territory_name || null,
    };
  }

  return null;
}

function constructTelUrl(mobile) {
  if (!mobile) return null;
  const cleanNumber = mobile.replace(/[^\d+]/g, '');
  return `tel:${cleanNumber}`;
}

function constructWhatsAppUrl(mobile, name = 'Representative') {
  if (!mobile) return null;
  const digits = mobile.replace(/\D/g, '');
  const cleanDigits = digits.startsWith('91') && digits.length === 12 ? digits : `91${digits.slice(-10)}`;
  const greeting = `Hello ${name}, I am contacting you from Shubh Labh Buyer App regarding an order.`;
  return `https://wa.me/${cleanDigits}?text=${encodeURIComponent(greeting)}`;
}

function getInitials(name) {
  if (!name) return 'SL';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

describe('SL-ORDER-MY-SALESPERSON-PROFILE-01: Salesperson Profile Logic', () => {
  it('1. Canonical CRM mapping: Correctly normalizes salesperson when FK join succeeds', () => {
    const rawData = {
      id: 'cust-101',
      assigned_owner_id: 'owner-501',
      territory_name: 'Rajasthan Central',
      owner: {
        id: 'owner-501',
        display_name: 'Vishnu Khandelwal',
        role: 'Staff',
        mobile: '+91 98285 39054',
        whatsapp: '+91 98285 39054',
        email: 'vishnu@shubhlabh.com'
      }
    };

    const result = normalizeSalesperson(rawData);
    assert.ok(result);
    assert.strictEqual(result.display_name, 'Vishnu Khandelwal');
    assert.strictEqual(result.role, 'Staff');
    assert.strictEqual(result.mobile, '+91 98285 39054');
    assert.strictEqual(result.whatsapp, '+91 98285 39054');
    assert.strictEqual(result.territory, 'Rajasthan Central');
  });

  it('2. Denormalized fallback: Uses party owner_name when FK embed is null', () => {
    const rawData = {
      id: 'cust-102',
      assigned_owner_id: 'owner-999',
      owner_name: 'Rajesh Sharma',
      territory_name: 'Jaipur Rural',
      owner: null // blocked by RLS or not returned
    };

    const result = normalizeSalesperson(rawData);
    assert.ok(result);
    assert.strictEqual(result.display_name, 'Rajesh Sharma');
    assert.strictEqual(result.role, 'Field Sales Representative');
    assert.strictEqual(result.territory, 'Jaipur Rural');
    assert.strictEqual(result.mobile, null);
  });

  it('3. Unassigned State: Returns null when neither owner nor owner_name exist', () => {
    const rawData = {
      id: 'cust-103',
      assigned_owner_id: null,
      owner_name: null,
      territory_name: null,
      owner: null
    };

    const result = normalizeSalesperson(rawData);
    assert.strictEqual(result, null, 'Unassigned customer must evaluate to null to trigger empty state');
  });

  it('4. Telephone URL formatting: Cleanly parses mobile string into tel: URI', () => {
    assert.strictEqual(constructTelUrl('+91 98285 39054'), 'tel:+919828539054');
    assert.strictEqual(constructTelUrl('098285-39054'), 'tel:09828539054');
    assert.strictEqual(constructTelUrl(''), null);
    assert.strictEqual(constructTelUrl(null), null);
  });

  it('5. WhatsApp URL formatting: Formats Indian 10-digit number with 91 prefix and encoded message', () => {
    const url = constructWhatsAppUrl('+91 98285 39054', 'Vishnu Ji');
    assert.ok(url.startsWith('https://wa.me/919828539054?text='));
    assert.ok(url.includes('Hello%20Vishnu%20Ji'));
    assert.ok(url.includes('Shubh%20Labh%20Buyer%20App'));
  });

  it('6. Avatar Initials Generator: Correctly derives initials for various name formats', () => {
    assert.strictEqual(getInitials('Vishnu Khandelwal'), 'VK');
    assert.strictEqual(getInitials('Pradeep Kumar Sharma'), 'PK');
    assert.strictEqual(getInitials('Nitesh'), 'NI');
    assert.strictEqual(getInitials(''), 'SL');
    assert.strictEqual(getInitials(null), 'SL');
  });

  it('7. Security & Privacy: Excludes internal audit, password, and sensitive tokens', () => {
    const rawData = {
      id: 'cust-104',
      owner: {
        id: 'owner-777',
        display_name: 'Mishika',
        role: 'Staff',
        mobile: '9461924461',
        password_hash: '$2b$10$secretHashDoNotExpose',
        internal_notes: 'Private performance note',
        raw_user_meta_data: { private: true }
      }
    };

    const result = normalizeSalesperson(rawData);
    assert.strictEqual(result.password_hash, undefined);
    assert.strictEqual(result.internal_notes, undefined);
    assert.strictEqual(result.raw_user_meta_data, undefined);
  });

  it('8. Buyer Customer Isolation: Query strictly binds to customerProfile.id', () => {
    function constructQuery(customerProfileId) {
      if (!customerProfileId) throw new Error('Customer profile ID required');
      return {
        table: 'crm_parties',
        filter: { column: 'id', value: customerProfileId }
      };
    }

    const query = constructQuery('231b398f-88a1-4d9d-b9d9-4699c42f8416');
    assert.strictEqual(query.filter.column, 'id');
    assert.strictEqual(query.filter.value, '231b398f-88a1-4d9d-b9d9-4699c42f8416');
    assert.throws(() => constructQuery(null), /Customer profile ID required/);
  });
});
