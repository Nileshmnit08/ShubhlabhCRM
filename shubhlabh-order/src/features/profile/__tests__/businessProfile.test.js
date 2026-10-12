const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Validation rules mirrored from BusinessProfileScreen
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

function calculateProfileCompletion(profile, user) {
  const hasShop = Boolean(profile?.display_name?.trim());
  const hasOwner = Boolean(profile?.legal_or_core_name?.trim() || user?.display_name?.trim());
  const hasMobile = Boolean((profile?.mobile || user?.mobile)?.trim());
  const hasCity = Boolean(profile?.city?.trim());
  const hasState = Boolean(profile?.state?.trim());

  const coreFields = [hasShop, hasOwner, hasMobile, hasCity, hasState];
  const completedCount = coreFields.filter(Boolean).length;
  const percent = Math.round((completedCount / coreFields.length) * 100);
  const isComplete = percent === 100;
  const hasGst = Boolean(profile?.gst_number?.trim());

  let missingSection = null;
  if (!hasShop || !hasOwner || !hasMobile) {
    missingSection = 'business';
  } else if (!hasCity || !hasState) {
    missingSection = 'address';
  } else if (!hasGst) {
    missingSection = 'gst';
  }

  return {
    percent,
    isComplete,
    completedCount,
    missingSection,
    hasGst
  };
}

function sanitizePartyPayload(formData) {
  // Only buyer-editable columns are permitted
  const allowed = [
    'display_name',
    'legal_or_core_name',
    'customer_type',
    'mobile',
    'whatsapp',
    'email',
    'city',
    'state',
    'gst_number',
    'business_context'
  ];

  const payload = {};
  for (const key of allowed) {
    if (key in formData) {
      payload[key] = formData[key];
    }
  }

  // Explicitly forbidden columns must never be present
  const forbidden = [
    'crm_status',
    'assigned_owner_id',
    'territory_id',
    'credit_limit',
    'tally_ledger_id',
    'relationship_type',
    'ledger_classification',
    'data_quality_flags'
  ];
  for (const f of forbidden) {
    assert.equal(f in payload, false, `Forbidden column ${f} must not be in payload`);
  }

  return payload;
}

describe('SL-ORDER-BUSINESS-PROFILE-01: Profile Completion & Business Validation', () => {
  it('1. Profile Completion: 0% when no fields are populated', () => {
    const res = calculateProfileCompletion({}, {});
    assert.equal(res.percent, 0);
    assert.equal(res.isComplete, false);
    assert.equal(res.missingSection, 'business');
  });

  it('2. Profile Completion: Partial calculation (e.g. 60% with shop, owner, mobile)', () => {
    const profile = {
      display_name: 'Sharma Agro',
      legal_or_core_name: 'Rohit Sharma',
      mobile: '9876543210'
    };
    const res = calculateProfileCompletion(profile, {});
    assert.equal(res.percent, 60);
    assert.equal(res.isComplete, false);
    assert.equal(res.missingSection, 'address');
  });

  it('3. Profile Completion: 100% when all 5 core fields exist', () => {
    const profile = {
      display_name: 'Kisan Kendra',
      legal_or_core_name: 'Anil Kumar',
      mobile: '9876543210',
      city: 'Jaipur',
      state: 'Rajasthan'
    };
    const res = calculateProfileCompletion(profile, {});
    assert.equal(res.percent, 100);
    assert.equal(res.isComplete, true);
    assert.equal(res.missingSection, 'gst'); // Suggests GST as next optimization
  });

  it('4. GSTIN Validation: Accepts valid 15-character GSTINs', () => {
    const validGstins = [
      '08AAAAA0000A1Z5',
      '27AAPFU0939F1ZV',
      '07AAAAA0000A1Z5',
      '24AAACC1206D1ZM'
    ];
    for (const g of validGstins) {
      assert.equal(GSTIN_REGEX.test(g), true, `GSTIN ${g} should be valid`);
    }
  });

  it('5. GSTIN Validation: Rejects invalid GSTIN formats', () => {
    const invalidGstins = [
      '08AAAAA0000',      // too short
      '08AAAAA0000A1Z55', // too long
      'INVALIDGSTIN123',  // wrong format
      '08AAAAA0000A15Z',  // 14th char not Z
      '08123450000A1Z5',  // digits where letters required
      ''
    ];
    for (const g of invalidGstins) {
      assert.equal(GSTIN_REGEX.test(g), false, `GSTIN ${g} should be invalid`);
    }
  });

  it('6. Mobile Validation: Accepts valid 10-digit Indian numbers starting 6-9', () => {
    assert.equal(PHONE_REGEX.test('9352276227'), true);
    assert.equal(PHONE_REGEX.test('8234567890'), true);
    assert.equal(PHONE_REGEX.test('7123456789'), true);
    assert.equal(PHONE_REGEX.test('6987654321'), true);
  });

  it('7. Mobile Validation: Rejects numbers starting with 0-5 or wrong length', () => {
    assert.equal(PHONE_REGEX.test('5123456789'), false);
    assert.equal(PHONE_REGEX.test('935227622'), false);  // 9 digits
    assert.equal(PHONE_REGEX.test('93522762271'), false); // 11 digits
    assert.equal(PHONE_REGEX.test('abcd123456'), false);
  });

  it('8. PIN Code Validation: Accepts 6-digit Indian PIN codes', () => {
    assert.equal(PINCODE_REGEX.test('302001'), true);
    assert.equal(PINCODE_REGEX.test('302013'), true);
    assert.equal(PINCODE_REGEX.test('110001'), true);
  });

  it('9. PIN Code Validation: Rejects invalid PIN codes', () => {
    assert.equal(PINCODE_REGEX.test('012345'), false); // starting with 0
    assert.equal(PINCODE_REGEX.test('30200'), false);  // 5 digits
    assert.equal(PINCODE_REGEX.test('3020012'), false); // 7 digits
    assert.equal(PINCODE_REGEX.test('30200A'), false);
  });

  it('10. Email Validation: Accepts standard email addresses and rejects malformed', () => {
    assert.equal(EMAIL_REGEX.test('buyer@shubhlabh.com'), true);
    assert.equal(EMAIL_REGEX.test('contact.store@domain.in'), true);
    assert.equal(EMAIL_REGEX.test('invalid-email'), false);
    assert.equal(EMAIL_REGEX.test('buyer@'), false);
  });

  it('11. Security & Column Whitelisting: Strips admin-managed fields from save payload', () => {
    const maliciousInput = {
      display_name: 'New Shop Name',
      mobile: '9876543210',
      city: 'Jaipur',
      crm_status: 'VIP_APPROVED',
      credit_limit: 10000000,
      assigned_owner_id: 'hacker-uuid',
      territory_id: 'random-uuid'
    };

    const sanitized = sanitizePartyPayload(maliciousInput);
    assert.equal(sanitized.display_name, 'New Shop Name');
    assert.equal(sanitized.mobile, '9876543210');
    assert.equal(sanitized.city, 'Jaipur');
    assert.equal('crm_status' in sanitized, false);
    assert.equal('credit_limit' in sanitized, false);
    assert.equal('assigned_owner_id' in sanitized, false);
  });
});
