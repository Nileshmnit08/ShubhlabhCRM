import { normalizeIndianPhone } from './whatsappTemplate.js';

/**
 * SL-CRM-CUSTOMER-ACCESS-SORT-01
 * Customer App Access Management Sorting Utilities
 */

export const SORTABLE_COLUMNS = {
  NAME: 'name',
  CODE: 'code',
  MOBILE: 'mobile',
  STATUS: 'status',
  PRESENCE: 'presence',
  LOGIN_ID: 'loginId',
};

/**
 * Returns the next sort state in the 3-state cycle:
 * none -> 'asc' -> 'desc' -> none (null)
 */
export function getNextSortState(currentKey, currentDirection, targetKey) {
  if (currentKey !== targetKey) {
    return { key: targetKey, direction: 'asc' };
  }
  if (currentDirection === 'asc') {
    return { key: targetKey, direction: 'desc' };
  }
  // Return to default (none)
  return { key: null, direction: null };
}

/**
 * Extract underlying sort value and missing flag for each column
 */
export function getCustomerSortValue(customer, sortKey, { buyerAccountsMap = {}, presenceMap = {} } = {}) {
  const account = buyerAccountsMap[customer.id];
  const presence = presenceMap[customer.id];

  switch (sortKey) {
    case SORTABLE_COLUMNS.NAME: {
      const name = (customer.display_name || customer.legal_or_core_name || '').trim();
      return {
        value: name,
        isMissing: !name,
      };
    }

    case SORTABLE_COLUMNS.CODE: {
      const code = (customer.customer_code || '').trim();
      const isMissing = !code || code.toLowerCase() === 'unassigned';
      return {
        value: code,
        isMissing,
      };
    }

    case SORTABLE_COLUMNS.MOBILE: {
      const cleanMobile = normalizeIndianPhone(customer.mobile || customer.whatsapp || '');
      return {
        value: cleanMobile,
        isMissing: !cleanMobile,
      };
    }

    case SORTABLE_COLUMNS.STATUS: {
      // Statuses: 'Active' (1), 'Disabled' (2), 'Pending Access' (3)
      if (!account) {
        return { value: 'Pending Access', rank: 3, isMissing: false };
      }
      if (account.is_active) {
        return { value: 'Active', rank: 1, isMissing: false };
      }
      return { value: 'Disabled', rank: 2, isMissing: false };
    }

    case SORTABLE_COLUMNS.PRESENCE: {
      if (!account) {
        // Customers with no app account have no presence state
        return { value: '—', rank: 99, isMissing: true };
      }
      if (presence?.isOnline) {
        return { value: 'Online', rank: 1, isMissing: false };
      }
      return { value: 'Offline', rank: 2, isMissing: false };
    }

    case SORTABLE_COLUMNS.LOGIN_ID: {
      const email = (account?.email || '').trim();
      return {
        value: email,
        isMissing: !email,
      };
    }

    default:
      return { value: '', isMissing: true };
  }
}

/**
 * Compares two customers by a sortKey, always placing missing values at the bottom
 */
export function compareCustomers(a, b, sortKey, direction, context) {
  const extractedA = getCustomerSortValue(a, sortKey, context);
  const extractedB = getCustomerSortValue(b, sortKey, context);

  // Missing values (e.g., "No Mobile", "Unassigned", no account) are always placed at the bottom
  if (extractedA.isMissing && extractedB.isMissing) return 0;
  if (extractedA.isMissing) return 1;
  if (extractedB.isMissing) return -1;

  let cmp = 0;

  switch (sortKey) {
    case SORTABLE_COLUMNS.NAME:
    case SORTABLE_COLUMNS.LOGIN_ID: {
      cmp = extractedA.value.localeCompare(extractedB.value, undefined, {
        sensitivity: 'base',
      });
      break;
    }

    case SORTABLE_COLUMNS.CODE: {
      // Natural alphanumeric sorting (e.g. CUST-2 before CUST-10)
      cmp = extractedA.value.localeCompare(extractedB.value, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      break;
    }

    case SORTABLE_COLUMNS.MOBILE: {
      // Natural numeric comparison on clean phone strings
      cmp = extractedA.value.localeCompare(extractedB.value, undefined, {
        numeric: true,
      });
      break;
    }

    case SORTABLE_COLUMNS.STATUS:
    case SORTABLE_COLUMNS.PRESENCE: {
      // Use numeric rank if available, otherwise alphabetical
      if (extractedA.rank !== undefined && extractedB.rank !== undefined) {
        cmp = extractedA.rank - extractedB.rank;
      } else {
        cmp = extractedA.value.localeCompare(extractedB.value, undefined, {
          sensitivity: 'base',
        });
      }
      break;
    }

    default:
      cmp = 0;
  }

  return direction === 'desc' ? -cmp : cmp;
}

/**
 * Returns a sorted shallow copy of the customers array.
 * If sortKey or direction is not provided, returns original array order.
 */
export function sortCustomers(customers, sortKey, direction, context) {
  if (!sortKey || !direction || !Array.isArray(customers) || customers.length <= 1) {
    return customers;
  }

  return [...customers].sort((a, b) => compareCustomers(a, b, sortKey, direction, context));
}
