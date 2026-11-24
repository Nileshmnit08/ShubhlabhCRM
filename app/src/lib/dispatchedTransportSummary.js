/**
 * dispatchedTransportSummary.js
 * 
 * Logic and helpers for:
 * - SL-DISPATCHED-TRANSPORT-SUMMARY-03
 * - SL-REQUIREMENTS-TRANSPORTER-COLUMN-01
 * 
 * Key capabilities:
 * 1. Determining Dispatched status and ensuring dispatched orders are never Pending, Due Today, or Overdue
 * 2. Resolving actual transporter details for dispatched requirements
 * 3. Resolving customer-wise suggested transporter from latest successful dispatch history for non-dispatched requirements
 * 4. Handling missing/historical dispatch records with appropriate fallback labels
 * 5. Formatting display dates and phone numbers for click-to-call direct calling
 * 6. Filtering requirements by status with strict exclusion of dispatched orders from pending filters
 */

export const INACTIVE_DISPATCH_STATUSES = ['Cancelled', 'Voided', 'Deleted', 'Reversed'];

/**
 * Formats a date string (e.g. '2026-11-18' or ISO) into '18 Nov 2026'.
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return String(dateStr);
  }
}

/**
 * Formats a 10-digit Indian phone number (e.g. '9829012345') into '98290 12345' for readability.
 */
export function formatDisplayPhone(phoneStr) {
  if (!phoneStr) return '';
  const clean = String(phoneStr).trim().replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return String(phoneStr).trim();
}

/**
 * Computes actual total quantity required across requirement items or fallback quantity.
 */
export function getRequiredQuantity(req) {
  if (!req) return 0;
  if (Array.isArray(req.requirement_items) && req.requirement_items.length > 0) {
    return req.requirement_items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
  }
  return Number(req.required_quantity) || Number(req.quantity) || 0;
}

/**
 * Computes pending quantity: required - total_dispatched.
 */
export function getPendingQuantity(req) {
  if (!req) return 0;
  const totalRequired = getRequiredQuantity(req);
  const dispatched = Number(req.total_dispatched_quantity) || 0;
  return Math.max(0, totalRequired - dispatched);
}

/**
 * Checks whether a requirement is successfully dispatched.
 */
export function isRequirementDispatched(req) {
  if (!req) return false;
  if (req.status === 'Dispatched') return true;
  if (req.dispatch_progress === 'Fully Dispatched') return true;
  
  const pending = getPendingQuantity(req);
  const dispatched = Number(req.total_dispatched_quantity) || 0;
  if (dispatched > 0 && pending === 0) {
    return true;
  }

  return false;
}

/**
 * Checks whether a requirement is active/pending.
 * Dispatched requirements are NEVER classified as pending.
 */
export function isRequirementPending(req) {
  if (!req) return false;
  if (isRequirementDispatched(req)) return false;

  const terminalStatuses = ['Closed', 'Fulfilled', 'Completed', 'Cancelled', 'Lost', 'Won', 'Dispatched'];
  if (terminalStatuses.includes(req.status)) return false;

  const pending = getPendingQuantity(req);
  return pending > 0;
}

/**
 * Checks whether a requirement is Overdue.
 * Dispatched requirements are NEVER classified as Overdue.
 */
export function isRequirementOverdue(req, todayStr) {
  if (!req || !req.expected_date) return false;
  if (isRequirementDispatched(req)) return false;
  if (!isRequirementPending(req)) return false;

  const today = todayStr ? new Date(todayStr) : new Date();
  today.setHours(0, 0, 0, 0);

  const exp = new Date(req.expected_date);
  exp.setHours(0, 0, 0, 0);

  return exp < today;
}

/**
 * Checks whether a requirement is Due Today.
 * Dispatched requirements are NEVER classified as Due Today.
 */
export function isRequirementDueToday(req, todayStr) {
  if (!req || !req.expected_date) return false;
  if (isRequirementDispatched(req)) return false;
  if (!isRequirementPending(req)) return false;

  const today = todayStr ? new Date(todayStr) : new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const todayFormatted = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const expDateStr = req.expected_date.split('T')[0];
  return expDateStr === todayFormatted;
}

/**
 * Resolves transporter details from the requirement's dispatch records and transporter metadata.
 * If multiple dispatches exist, selects the latest relevant active dispatch.
 * If historical records have no transporter details, sets hasDetails=false.
 * 
 * @param {Array} dispatches Array of dispatch records for this requirement
 * @param {Object} transporterMetadataMap Map of transporter_name -> { contact_number }
 * @param {string} fallbackDate Optional fallback date
 * @returns {Object}
 */
export function resolveTransportDetails(dispatches, transporterMetadataMap = {}, fallbackDate = null) {
  const activeList = (dispatches || []).filter(d => 
    d && !INACTIVE_DISPATCH_STATUSES.includes(d.status)
  );

  if (activeList.length === 0) {
    return {
      hasDetails: false,
      transporterName: null,
      mobileNumber: null,
      dispatchDate: fallbackDate || null,
      fallbackMessage: 'Transport details unavailable'
    };
  }

  // Sort by dispatch_date DESC, created_at DESC to pick the relevant latest dispatch
  activeList.sort((a, b) => {
    const dateA = a.dispatch_date || '';
    const dateB = b.dispatch_date || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);

    const timeA = a.created_at || '';
    const timeB = b.created_at || '';
    return timeB.localeCompare(timeA);
  });

  const latest = activeList[0];
  const name = latest.transporter_name?.trim() || null;
  const meta = name && transporterMetadataMap ? transporterMetadataMap[name] : null;
  const mobile = latest.driver_mobile?.trim() || meta?.contact_number?.trim() || null;
  const dispatchDate = latest.dispatch_date || fallbackDate || null;

  const hasDetails = Boolean(name || mobile);

  return {
    hasDetails,
    transporterName: name,
    mobileNumber: mobile,
    dispatchDate,
    dispatchId: latest.id,
    fallbackMessage: hasDetails ? null : 'Transport details unavailable'
  };
}

/**
 * Builds a lookup map of latest successful dispatch per customer.
 * 
 * Handles:
 * - Active dispatches only (ignoring Cancelled, Voided, Deleted, Reversed).
 * - Multi-dispatch sorting by dispatch_date DESC, created_at DESC.
 * - Falling back to transporter_metadata for missing mobile numbers.
 * - Mapping by party_id and customer_name (lowercase).
 * 
 * @param {Array} dispatches List of dispatch records (can include requirements join)
 * @param {Array} requirements Optional list of requirement objects to correlate requirement_id -> party_id
 * @param {Object} transporterMetadataMap Map of transporter_name -> { contact_number }
 * @returns {Object} { byPartyId: {}, byCustomerName: {} }
 */
export function buildCustomerLatestDispatchMap(dispatches = [], requirements = [], transporterMetadataMap = {}) {
  const reqPartyMap = {};
  const reqCustomerMap = {};
  for (const r of requirements) {
    if (r.id) {
      if (r.party_id) reqPartyMap[r.id] = r.party_id;
      if (r.customer_name) reqCustomerMap[r.id] = r.customer_name;
    }
  }

  // Filter out cancelled/inactive dispatches
  const activeDispatches = (dispatches || []).filter(d => 
    d && !INACTIVE_DISPATCH_STATUSES.includes(d.status)
  );

  // Sort by dispatch_date DESC, created_at DESC
  activeDispatches.sort((a, b) => {
    const dateA = a.dispatch_date || '';
    const dateB = b.dispatch_date || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);

    const timeA = a.created_at || '';
    const timeB = b.created_at || '';
    return timeB.localeCompare(timeA);
  });

  const byPartyId = {};
  const byCustomerName = {};

  for (const d of activeDispatches) {
    const partyId = d.party_id || d.requirements?.party_id || reqPartyMap[d.requirement_id] || null;
    const customerName = d.customer_name || d.requirements?.customer_name || reqCustomerMap[d.requirement_id] || null;

    const tName = d.transporter_name?.trim() || null;
    const meta = tName && transporterMetadataMap ? transporterMetadataMap[tName] : null;
    const tMobile = d.driver_mobile?.trim() || meta?.contact_number?.trim() || null;
    const dDate = d.dispatch_date || (d.created_at ? d.created_at.split('T')[0] : null);

    // Only consider dispatches that have a valid transporter name or contact
    if (tName || tMobile) {
      const entry = {
        transporterName: tName,
        mobileNumber: tMobile,
        dispatchDate: dDate,
        dispatchId: d.id,
        partyId,
        customerName
      };

      if (partyId && !byPartyId[partyId]) {
        byPartyId[partyId] = entry;
      }

      if (customerName) {
        const key = customerName.trim().toLowerCase();
        if (!byCustomerName[key]) {
          byCustomerName[key] = entry;
        }
      }
    }
  }

  return { byPartyId, byCustomerName };
}

/**
 * Resolves the transporter presentation for any requirement (dispatched or non-dispatched).
 * 
 * Rules:
 * - If dispatched: returns actual transporter used for that dispatch (isSuggested = false).
 *   If historical record lacks details, fallbackMessage is 'Transport details unavailable'.
 * - If non-dispatched: returns suggested transporter from customer's latest dispatch (isSuggested = true).
 *   If customer has no dispatch history, fallbackMessage is 'No transporter history'.
 * 
 * @param {Object} req The requirement object
 * @param {Object} customerLatestDispatchMap Result of buildCustomerLatestDispatchMap
 * @param {Object} transporterMetadataMap Map of transporter_name -> { contact_number }
 * @returns {Object} { isDispatched, isSuggested, hasDetails, transporterName, mobileNumber, date, fallbackMessage }
 */
export function resolveRequirementTransporter(req, customerLatestDispatchMap = {}, transporterMetadataMap = {}) {
  if (!req) {
    return {
      isDispatched: false,
      isSuggested: false,
      hasDetails: false,
      transporterName: null,
      mobileNumber: null,
      date: null,
      fallbackMessage: 'No transporter history'
    };
  }

  const dispatched = isRequirementDispatched(req);

  // 1. Dispatched Requirement -> Actual Transporter
  if (dispatched) {
    const details = resolveTransportDetails(req.dispatches, transporterMetadataMap, req.latest_dispatch_date);
    return {
      isDispatched: true,
      isSuggested: false,
      hasDetails: details.hasDetails,
      transporterName: details.transporterName,
      mobileNumber: details.mobileNumber,
      date: details.dispatchDate,
      dispatchId: details.dispatchId,
      fallbackMessage: details.hasDetails ? null : 'Transport details unavailable'
    };
  }

  // 2. Non-Dispatched Requirement -> Suggested Transporter from Customer's Latest Dispatch
  const partyMap = customerLatestDispatchMap?.byPartyId || {};
  const nameMap = customerLatestDispatchMap?.byCustomerName || {};

  const suggested = (req.party_id && partyMap[req.party_id]) ||
                    (req.customer_name && nameMap[req.customer_name.trim().toLowerCase()]) ||
                    null;

  if (suggested && (suggested.transporterName || suggested.mobileNumber)) {
    return {
      isDispatched: false,
      isSuggested: true,
      hasDetails: true,
      transporterName: suggested.transporterName,
      mobileNumber: suggested.mobileNumber,
      date: suggested.dispatchDate,
      dispatchId: suggested.dispatchId,
      fallbackMessage: null
    };
  }

  return {
    isDispatched: false,
    isSuggested: true,
    hasDetails: false,
    transporterName: null,
    mobileNumber: null,
    date: null,
    fallbackMessage: 'No transporter history'
  };
}

/**
 * Filters a list of requirements according to filter criteria.
 * Enforces that Dispatched requirements are NEVER in Pending, Due Today, or Overdue.
 */
export function filterRequirements(requirements, {
  statusFilter = 'All Open',
  dateRange = 'All Time',
  searchQuery = '',
  ownerFilter = 'All Owners',
  includeCompleted = false,
  userProfileId = null,
  todayStr = null
} = {}) {
  return (requirements || []).filter(req => {
    const dispatched = isRequirementDispatched(req);
    const pending = isRequirementPending(req);
    const overdue = isRequirementOverdue(req, todayStr);
    const dueToday = isRequirementDueToday(req, todayStr);

    // 1. Status Filter: Dispatched
    if (statusFilter === 'Dispatched') {
      if (!dispatched) return false;
    }

    // 2. Status Filter: Overdue - Dispatched is strictly excluded
    if (statusFilter === 'Overdue') {
      if (dispatched || !overdue) return false;
    }

    // 3. Status Filter: All Open (Active Pipeline) - Dispatched is strictly excluded
    if (statusFilter === 'All Open') {
      if (dispatched || !pending) return false;
    }

    // 4. Status Filter: Not Dispatched
    if (statusFilter === 'Not Dispatched') {
      if (dispatched) return false;
      if (!includeCompleted && !pending) return false;
    }

    // 5. Explicit Named Status Filter (e.g. 'Identified', 'Commercial Intent', etc.)
    if (statusFilter !== 'All' && statusFilter !== 'All Open' && statusFilter !== 'Overdue' && statusFilter !== 'Dispatched' && statusFilter !== 'Not Dispatched') {
      if (req.status !== statusFilter) return false;
    }

    // 6. Date Range: Due Today - Dispatched is strictly excluded
    if (dateRange === 'Today') {
      if (statusFilter !== 'Dispatched' && (dispatched || !dueToday)) return false;
    }

    // 7. Date Range: Overdue
    if (dateRange === 'Overdue') {
      if (statusFilter !== 'Dispatched' && (dispatched || !overdue)) return false;
    }

    // 8. Owner Filter
    if (ownerFilter === 'My Requirements' && userProfileId) {
      if (req.assigned_to !== userProfileId) return false;
    } else if (ownerFilter === 'Unassigned') {
      if (req.assigned_to) return false;
    } else if (ownerFilter !== 'All Owners') {
      if (req.assigned_to !== ownerFilter) return false;
    }

    // 9. Search Query: matches Customer, Product, City, Demand Ref, Transporter Name, or Mobile
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const customer = (req.customer_name || '').toLowerCase();
      const city = (req.customer_city || '').toLowerCase();
      const demandRef = (req.demand_ref || '').toLowerCase();
      const transName = (req.transporter_info?.transporterName || req.transport_details?.transporterName || '').toLowerCase();
      const transMobile = (req.transporter_info?.mobileNumber || req.transport_details?.mobileNumber || '').toLowerCase();
      
      const itemsMatch = req.requirement_items?.some(i => 
        (i.product_name || '').toLowerCase().includes(q)
      );

      if (!customer.includes(q) && !city.includes(q) && !demandRef.includes(q) &&
          !transName.includes(q) && !transMobile.includes(q) && !itemsMatch) {
        return false;
      }
    }

    return true;
  });
}
