/**
 * FA-VISITOR-REGISTER-01: Visitor Register utilities and validation.
 *
 * All business logic, input validation, pass number generation,
 * and payload formatting are isolated here for easy testing.
 */

export const VISITOR_TABLE = 'visitor_register';

export const VISITOR_CATEGORIES = [
  'Customer',
  'Dealer',
  'Supplier',
  'Transporter',
  'Other',
];

export const IST_OFFSET_MINUTES = 330; // +05:30

/**
 * Returns YYYY-MM-DD for the given ISO timestamp in Asia/Kolkata (UTC+05:30).
 * Defaults to current time if no timestamp is provided.
 */
export function istBusinessDate(isoTimestamp) {
  const d = isoTimestamp ? new Date(isoTimestamp) : new Date();
  if (Number.isNaN(d.getTime())) return null;
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const ist = new Date(utc + IST_OFFSET_MINUTES * 60000);
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const day = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formats an ISO timestamp to IST 12-hour format "hh:mm A".
 */
export function formatIstTime(isoTimestamp) {
  if (!isoTimestamp) return null;
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return null;
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const ist = new Date(utc + IST_OFFSET_MINUTES * 60000);
  let h = ist.getHours();
  const m = String(ist.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // 0 becomes 12
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

/**
 * Formats an ISO timestamp to readable date/time "DD MMM YYYY, hh:mm A".
 */
export function formatIstDateTime(isoTimestamp) {
  if (!isoTimestamp) return null;
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return null;
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const ist = new Date(utc + IST_OFFSET_MINUTES * 60000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(ist.getDate()).padStart(2, '0');
  const month = months[ist.getMonth()];
  const year = ist.getFullYear();
  const timeStr = formatIstTime(isoTimestamp);
  return `${day} ${month} ${year}, ${timeStr}`;
}

/**
 * Generates a unique visitor pass number: VR-YYYYMMDD-XXXX
 * where YYYYMMDD is today's IST date, and XXXX is a 4-digit code.
 */
export function generatePassNumber(dateStr, customCode) {
  const ymd = (dateStr || istBusinessDate() || '').replace(/-/g, '');
  let code = customCode;
  if (!code) {
    // 4-digit random number between 1000 and 9999
    code = String(Math.floor(1000 + Math.random() * 9000));
  }
  return `VR-${ymd}-${code}`;
}

/**
 * Validates a mobile number: must contain exactly 10 digits after stripping
 * common formatting characters (spaces, dashes, parens, +91 prefix).
 */
export function validateMobile(mobile) {
  if (!mobile || typeof mobile !== 'string') {
    return { isValid: false, normalized: '', error: 'Mobile number is required' };
  }
  // Strip spaces, dashes, leading +91 or 0
  let clean = mobile.trim().replace(/[\s\-\(\)]/g, '');
  if (clean.startsWith('+91')) {
    clean = clean.slice(3);
  } else if (clean.startsWith('91') && clean.length === 12) {
    clean = clean.slice(2);
  } else if (clean.startsWith('0') && clean.length === 11) {
    clean = clean.slice(1);
  }

  const is10Digits = /^\d{10}$/.test(clean);
  if (!is10Digits) {
    return {
      isValid: false,
      normalized: clean,
      error: 'Please enter a valid 10-digit mobile number',
    };
  }
  return { isValid: true, normalized: clean, error: null };
}

/**
 * Validates the full Visitor Registration form.
 *
 * Requirements:
 * - Visitor Name: required (min 2 characters)
 * - Mobile Number: required (valid 10 digits)
 * - Visitor Category: required (must be in VISITOR_CATEGORIES)
 * - Visitor Photograph: required
 */
export function validateVisitorInput(form) {
  const errors = {};
  const name = (form?.visitor_name || '').trim();
  if (!name || name.length < 2) {
    errors.visitor_name = 'Visitor name is required (minimum 2 characters)';
  }

  const mobileRes = validateMobile(form?.mobile_number);
  if (!mobileRes.isValid) {
    errors.mobile_number = mobileRes.error;
  }

  const category = form?.category;
  if (!category || !VISITOR_CATEGORIES.includes(category)) {
    errors.category = `Category must be one of: ${VISITOR_CATEGORIES.join(', ')}`;
  }

  const photo = form?.photo_url;
  if (!photo || typeof photo !== 'string' || photo.trim().length === 0) {
    errors.photo_url = 'Visitor photograph is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalizedMobile: mobileRes.normalized,
  };
}

/**
 * Constructs the canonical visitor registration payload for DB insert & sync.
 */
export function buildVisitorPayload({
  id,
  pass_number,
  visitor_name,
  mobile_number,
  company_name,
  address,
  category,
  person_to_meet,
  purpose_of_visit,
  vehicle_number,
  photo_url,
  registered_by,
  registration_source,
  entry_time,
  notes,
}) {
  const now = new Date().toISOString();
  const mobileRes = validateMobile(mobile_number);
  return {
    id,
    pass_number: pass_number || generatePassNumber(),
    visitor_name: (visitor_name || '').trim(),
    mobile_number: mobileRes.normalized || mobile_number,
    company_name: company_name ? company_name.trim() : null,
    address: address ? address.trim() : null,
    category: category || 'Other',
    person_to_meet: person_to_meet ? person_to_meet.trim() : null,
    purpose_of_visit: purpose_of_visit ? purpose_of_visit.trim() : null,
    vehicle_number: vehicle_number ? vehicle_number.trim().toUpperCase() : null,
    photo_url,
    registered_by: registered_by || null,
    registration_source: registration_source || 'Field Assist',
    entry_time: entry_time || now,
    exit_time: null,
    status: 'IN',
    notes: notes ? notes.trim() : null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Constructs the payload to mark visitor exit on the existing record.
 */
export function buildExitPayload(visitorId, exitTime) {
  if (!visitorId) {
    throw new Error('visitorId is required to record exit');
  }
  const now = exitTime || new Date().toISOString();
  return {
    id: visitorId,
    exit_time: now,
    status: 'OUT',
    updated_at: now,
  };
}

/**
 * Filters a list of visitors to only those registered today in Asia/Kolkata.
 */
export function filterTodayVisitors(visitors, todayDateStr) {
  if (!Array.isArray(visitors)) return [];
  const targetDate = todayDateStr || istBusinessDate();
  return visitors.filter((v) => {
    const vDate = istBusinessDate(v.entry_time || v.created_at);
    return vDate === targetDate;
  });
}

/**
 * Searches/filters visitors by query string matching name, mobile, pass, or company.
 */
export function searchVisitors(visitors, query) {
  if (!Array.isArray(visitors)) return [];
  if (!query || !query.trim()) return visitors;
  const q = query.trim().toLowerCase();
  return visitors.filter((v) => {
    const name = (v.visitor_name || '').toLowerCase();
    const mobile = (v.mobile_number || '').toLowerCase();
    const pass = (v.pass_number || '').toLowerCase();
    const company = (v.company_name || '').toLowerCase();
    const person = (v.person_to_meet || '').toLowerCase();
    const vehicle = (v.vehicle_number || '').toLowerCase();
    return (
      name.includes(q) ||
      mobile.includes(q) ||
      pass.includes(q) ||
      company.includes(q) ||
      person.includes(q) ||
      vehicle.includes(q)
    );
  });
}

/**
 * Detects if a Supabase PostgREST error is due to the table not existing yet.
 */
export function isMissingTableError(error) {
  if (!error) return false;
  const code = error.code ? String(error.code) : '';
  const msg = (error.message || '').toLowerCase();
  return (
    code === '42P01' || // PostgreSQL undefined_table
    code === 'PGRST205' || // PostgREST relation not in schema
    msg.includes('relation') && msg.includes('does not exist') ||
    msg.includes('not found')
  );
}
