/**
 * SL-VISITOR-MANAGEMENT-01: Shared Pure Business Logic & Utilities for Visitor Management.
 *
 * Coordinates cross-platform data structures between:
 * - Field Assist Android (mobileFieldStaff/src/utils/visitorRegister.js)
 * - Shubh Labh CRM Web Portal (app/src/pages/VisitorManagement)
 *
 * All business dates and timestamps follow Asia/Kolkata (+05:30) IST timezone.
 */

export const VISITOR_TABLE = 'visitor_register';
export const VISITOR_STORAGE_BUCKET = 'visitor-photos';

export const VISITOR_CATEGORIES = [
  'Customer',
  'Dealer',
  'Supplier',
  'Transporter',
  'Other',
];

export const VISITOR_STATUSES = ['IN', 'OUT'];

export const REGISTRATION_SOURCES = ['Field Assist', 'CRM'];

const IST_OFFSET_MS = 330 * 60 * 1000;
const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const toDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Returns 'YYYY-MM-DD' in Asia/Kolkata (+05:30) for the given instant.
 * Defaults to current time if no argument provided.
 */
export function istBusinessDate(value = new Date()) {
  const d = toDate(value);
  if (!d) return null;
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

/**
 * Formats an ISO string or Date to 12-hour IST time: "hh:mm AM/PM".
 */
export function formatIstTime(value) {
  const d = toDate(value);
  if (!d) return null;
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const h = ist.getUTCHours();
  return `${pad(h % 12 || 12)}:${pad(ist.getUTCMinutes())} ${h >= 12 ? 'PM' : 'AM'}`;
}

/**
 * Formats an ISO string or Date to readable IST date & time: "DD MMM YYYY, hh:mm AM/PM".
 */
export function formatIstDateTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const day = pad(ist.getUTCDate());
  const month = MONTHS[ist.getUTCMonth()];
  const year = ist.getUTCFullYear();
  const timeStr = formatIstTime(value);
  return `${day} ${month} ${year}, ${timeStr}`;
}

/**
 * Generates a unique canonical pass number: VR-YYYYMMDD-XXXX
 */
export function generatePassNumber(dateStr, customCode) {
  const ymd = (dateStr || istBusinessDate() || '').replace(/-/g, '');
  let code = customCode;
  if (!code) {
    code = String(Math.floor(1000 + Math.random() * 9000));
  }
  return `VR-${ymd}-${code}`;
}

/**
 * Validates a mobile number: must contain exactly 10 digits after stripping
 * formatting characters (+91, leading 0, spaces, dashes).
 */
export function validateMobile(mobile) {
  if (!mobile || typeof mobile !== 'string') {
    return { isValid: false, normalized: '', error: 'Mobile number is required' };
  }
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
 * Validates visitor input fields for CRM registration form.
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
 * Calculates readable duration between entry and exit timestamps.
 * If exit timestamp is missing, computes duration from entry until now.
 */
export function formatDuration(entryTime, exitTime) {
  const s = toDate(entryTime);
  if (!s) return '—';
  const e = exitTime ? toDate(exitTime) : new Date();
  if (!e) return '—';

  const diffMs = e.getTime() - s.getTime();
  if (diffMs < 0) return '0m';

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${remainingMins}m`;
  }
  return `${minutes}m`;
}

/**
 * Filters visitors in memory by date, status, category, source, and search query.
 */
export function filterVisitors(visitors, filters = {}) {
  if (!Array.isArray(visitors)) return [];

  const {
    search = '',
    status = 'ALL',
    category = 'ALL',
    source = 'ALL',
    startDate = null,
    endDate = null,
  } = filters;

  const q = search.trim().toLowerCase();

  return visitors.filter((v) => {
    // Status filter
    if (status !== 'ALL' && v.status !== status) {
      return false;
    }

    // Category filter
    if (category !== 'ALL' && v.category !== category) {
      return false;
    }

    // Source filter ('Field Assist' vs 'CRM')
    if (source !== 'ALL' && v.registration_source !== source) {
      return false;
    }

    // Date range filter based on IST entry date
    if (startDate || endDate) {
      const entryYmd = istBusinessDate(v.entry_time || v.created_at);
      if (startDate && entryYmd < startDate) return false;
      if (endDate && entryYmd > endDate) return false;
    }

    // Text search
    if (q) {
      const name = (v.visitor_name || '').toLowerCase();
      const mobile = (v.mobile_number || '').toLowerCase();
      const pass = (v.pass_number || '').toLowerCase();
      const company = (v.company_name || '').toLowerCase();
      const person = (v.person_to_meet || '').toLowerCase();
      const vehicle = (v.vehicle_number || '').toLowerCase();
      const purpose = (v.purpose_of_visit || '').toLowerCase();

      const match =
        name.includes(q) ||
        mobile.includes(q) ||
        pass.includes(q) ||
        company.includes(q) ||
        person.includes(q) ||
        vehicle.includes(q) ||
        purpose.includes(q);

      if (!match) return false;
    }

    return true;
  });
}

/**
 * Computes dashboard statistics from visitor records.
 */
export function computeDashboardStats(visitors, todayYmd = istBusinessDate()) {
  if (!Array.isArray(visitors)) {
    return {
      totalToday: 0,
      currentlyInside: 0,
      exitedToday: 0,
      monthlyTotal: 0,
      categoryCounts: {},
      sourceCounts: {},
      recentInside: [],
    };
  }

  const currentYearMonth = todayYmd.slice(0, 7); // 'YYYY-MM'

  let totalToday = 0;
  let currentlyInside = 0;
  let exitedToday = 0;
  let monthlyTotal = 0;
  const categoryCounts = {};
  const sourceCounts = { 'Field Assist': 0, CRM: 0 };
  const recentInside = [];

  for (const cat of VISITOR_CATEGORIES) {
    categoryCounts[cat] = 0;
  }

  for (const v of visitors) {
    const entryYmd = istBusinessDate(v.entry_time || v.created_at);
    const isToday = entryYmd === todayYmd;
    const isThisMonth = entryYmd && entryYmd.startsWith(currentYearMonth);

    if (isThisMonth) {
      monthlyTotal += 1;
    }

    if (isToday) {
      totalToday += 1;
      if (v.status === 'OUT') {
        exitedToday += 1;
      }
    }

    if (v.status === 'IN') {
      currentlyInside += 1;
      recentInside.push(v);
    }

    // Category tally
    if (v.category && categoryCounts[v.category] !== undefined) {
      categoryCounts[v.category] += 1;
    } else if (v.category) {
      categoryCounts[v.category] = (categoryCounts[v.category] || 0) + 1;
    }

    // Source tally
    const src = v.registration_source || 'Field Assist';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  }

  // Sort inside visitors by entry_time descending
  recentInside.sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time));

  return {
    totalToday,
    currentlyInside,
    exitedToday,
    monthlyTotal,
    categoryCounts,
    sourceCounts,
    recentInside,
  };
}

/**
 * Transforms visitor records into rows for CSV export.
 */
export function buildVisitorCsvRows(visitors) {
  if (!Array.isArray(visitors)) return [];

  return visitors.map((v) => ({
    'Pass Number': v.pass_number || '—',
    'Visitor Name': v.visitor_name || '—',
    'Mobile Number': v.mobile_number || '—',
    Category: v.category || '—',
    'Company / Firm': v.company_name || '—',
    'Person to Meet': v.person_to_meet || '—',
    'Visit Purpose': v.purpose_of_visit || '—',
    'Vehicle Number': v.vehicle_number || '—',
    Address: v.address || '—',
    'Entry Time (IST)': formatIstDateTime(v.entry_time),
    'Exit Time (IST)': v.exit_time ? formatIstDateTime(v.exit_time) : 'Still Inside',
    Duration: formatDuration(v.entry_time, v.exit_time),
    Status: v.status === 'IN' ? 'INSIDE' : 'EXITED',
    'Registration Source': v.registration_source || 'Field Assist',
    Notes: v.notes || '',
  }));
}
