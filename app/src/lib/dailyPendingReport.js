/**
 * Pure functions and calculations for Daily Pending Dispatch Report.
 * Used by DailyPendingDispatchReport component and tested independently.
 */

export function calculateRequirementPendingQty(req) {
  if (!req) return 0;
  const actualTotalRequired = req.requirement_items?.length > 0
    ? req.requirement_items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)
    : (Number(req.required_quantity) || Number(req.quantity) || 0);
  const dispatched = Number(req.total_dispatched_quantity) || 0;
  return Math.max(0, actualTotalRequired - dispatched);
}

export function isRequirementPending(req) {
  if (!req) return false;
  const pendingQty = calculateRequirementPendingQty(req);
  const dispatched = Number(req.total_dispatched_quantity) || 0;
  const isDispatched = req.status === 'Dispatched' ||
                       req.dispatch_progress === 'Fully Dispatched' ||
                       (dispatched > 0 && pendingQty === 0);
  const isClosedOrCancelled = ['Closed', 'Fulfilled', 'Completed', 'Cancelled', 'Lost', 'Won', 'Dispatched'].includes(req.status);
  return pendingQty > 0 && !isClosedOrCancelled && !isDispatched;
}

export function formatDateForDisplay(dateString) {
  if (!dateString) return 'All Dates';
  // Parse date safely whether it's 'YYYY-MM-DD' or ISO timestamp
  const parts = dateString.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function filterPendingRequirements(requirements = [], { reportDate = '', dateMode = 'exact' } = {}) {
  return requirements.filter(req => {
    if (!isRequirementPending(req)) return false;

    if (!reportDate || dateMode === 'all') {
      return true;
    }

    const reqDate = req.expected_date ? req.expected_date.split('T')[0] : '';
    const targetDate = reportDate ? reportDate.split('T')[0] : '';

    if (dateMode === 'exact') {
      return reqDate === targetDate;
    } else if (dateMode === 'up_to') {
      // Due on or before selected date (includes overdue)
      return reqDate && reqDate <= targetDate;
    }

    return true;
  });
}

/**
 * Computes metrics, product summary and customer summary from a list of pending requirements.
 */
export function computeDailyPendingReport(pendingRequirements = [], reportDate = '') {
  const totalRequirements = pendingRequirements.length;
  let totalBags = 0;
  const uniqueCustomers = new Set();
  const uniqueProducts = new Set();

  const productMap = new Map(); // productName -> { requirementsSet: Set, pendingBags: number }
  const customerMap = new Map(); // customerKey -> { customerName, customerCity, products: Map<productName, bags>, ... }

  pendingRequirements.forEach(req => {
    const customerName = req.customer_name?.trim() || 'Unknown Customer';
    const customerKey = req.party_id || customerName;
    uniqueCustomers.add(customerKey);

    const ownerName = req.owner_email ? req.owner_email.split('@')[0] : (req.assigned_to_name || 'Unassigned');
    const reqDate = req.expected_date ? req.expected_date.split('T')[0] : (req.created_at ? req.created_at.split('T')[0] : '');

    if (!customerMap.has(customerKey)) {
      customerMap.set(customerKey, {
        customerId: customerKey,
        customerName,
        customerCity: req.customer_city || '',
        customerMobile: req.customer_mobile || '',
        customerWhatsapp: req.customer_whatsapp || '',
        productsMap: new Map(),
        pendingBags: 0,
        requirementDate: reqDate,
        assignedOwner: ownerName,
        requirementsCount: 0,
      });
    }
    const customerEntry = customerMap.get(customerKey);
    customerEntry.requirementsCount += 1;

    // Handle items
    if (req.requirement_items && req.requirement_items.length > 0) {
      const headerTotal = req.requirement_items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
      const headerPending = calculateRequirementPendingQty(req);
      const ratio = headerTotal > 0 ? (headerPending / headerTotal) : 1;

      req.requirement_items.forEach(item => {
        const prodName = item.product_name?.trim() || 'Unknown Product';
        const rawQty = Number(item.quantity) || 0;
        // Allocate pending quantity proportionately if partially dispatched
        const itemPending = ratio < 1 ? Math.round(rawQty * ratio) : rawQty;
        if (itemPending <= 0) return;

        uniqueProducts.add(prodName);
        totalBags += itemPending;

        // Add to productMap
        if (!productMap.has(prodName)) {
          productMap.set(prodName, { productName: prodName, requirementsSet: new Set(), pendingBags: 0 });
        }
        const pEntry = productMap.get(prodName);
        pEntry.requirementsSet.add(req.id);
        pEntry.pendingBags += itemPending;

        // Add to customerEntry
        const currentProdBags = customerEntry.productsMap.get(prodName) || 0;
        customerEntry.productsMap.set(prodName, currentProdBags + itemPending);
        customerEntry.pendingBags += itemPending;
      });
    } else {
      const reqPending = calculateRequirementPendingQty(req);
      if (reqPending > 0) {
        const prodName = (req.product_type && req.product_type !== 'General Requirement')
          ? req.product_type.trim()
          : (req.product_name?.trim() || 'General Requirement');

        uniqueProducts.add(prodName);
        totalBags += reqPending;

        // Add to productMap
        if (!productMap.has(prodName)) {
          productMap.set(prodName, { productName: prodName, requirementsSet: new Set(), pendingBags: 0 });
        }
        const pEntry = productMap.get(prodName);
        pEntry.requirementsSet.add(req.id);
        pEntry.pendingBags += reqPending;

        // Add to customerEntry
        const currentProdBags = customerEntry.productsMap.get(prodName) || 0;
        customerEntry.productsMap.set(prodName, currentProdBags + reqPending);
        customerEntry.pendingBags += reqPending;
      }
    }
  });

  // Sort products descending by pending bags
  const productSummary = Array.from(productMap.values()).map(p => ({
    productName: p.productName,
    requirementsCount: p.requirementsSet.size,
    pendingBags: p.pendingBags,
  })).sort((a, b) => b.pendingBags - a.pendingBags);

  // Customer summary array
  const customerSummary = Array.from(customerMap.values()).map(c => {
    const productNames = Array.from(c.productsMap.keys()).join(', ');
    return {
      customerId: c.customerId,
      customerName: c.customerName,
      customerCity: c.customerCity,
      customerMobile: c.customerMobile,
      customerWhatsapp: c.customerWhatsapp,
      productName: productNames || 'General Requirement',
      pendingBags: c.pendingBags,
      requirementDate: c.requirementDate,
      assignedOwner: c.assignedOwner,
      requirementsCount: c.requirementsCount,
      productsMap: c.productsMap,
    };
  }).sort((a, b) => b.pendingBags - a.pendingBags);

  const reportDateFormatted = reportDate ? formatDateForDisplay(reportDate) : 'Today';

  return {
    reportDate,
    reportDateFormatted,
    totalRequirements,
    totalBags,
    totalCustomers: uniqueCustomers.size,
    totalProducts: uniqueProducts.size,
    productSummary,
    customerSummary,
  };
}

/**
 * Generates exact WhatsApp report string according to FR-05 specification.
 */
export function generateWhatsAppReportText(reportData) {
  const {
    reportDateFormatted,
    totalRequirements,
    totalCustomers,
    totalProducts,
    totalBags,
    productSummary = [],
    customerSummary = [],
  } = reportData;

  if (totalRequirements === 0) {
    return `📋 SHUBH LABH CRM
DAILY PENDING DISPATCH REPORT
📅 Date: ${reportDateFormatted}

No pending dispatch requirements found for this date.

Report generated from Shubh Labh CRM.`;
  }

  const productLines = productSummary.map(p => `${p.productName} — ${p.pendingBags} Bags`).join('\n');

  const customerLines = customerSummary.map(c => {
    return `${c.customerName}\nProduct: ${c.productName}\nPending: ${c.pendingBags} Bags`;
  }).join('\n\n');

  return `📋 SHUBH LABH CRM
DAILY PENDING DISPATCH REPORT
📅 Date: ${reportDateFormatted}

PENDING SUMMARY
• Pending Requirements: ${totalRequirements}
• Pending Customers: ${totalCustomers}
• Pending Products: ${totalProducts}
• Total Pending Bags: ${totalBags}

PRODUCT-WISE PENDING
${productLines}

CUSTOMER-WISE PENDING
${customerLines}

TOTAL PENDING: ${totalBags} BAGS

Report generated from Shubh Labh CRM.`;
}
