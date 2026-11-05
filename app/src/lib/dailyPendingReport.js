/**
 * Pure functions and calculations for Daily Pending Dispatch Report.
 * Formats WhatsApp report according to SL-REQ-WHATSAPP-REPORT-FORMAT-02.
 */

export const SEPARATOR = '━━━━━━━━━━━━━━━━━━━━';

/**
 * Calculates pending quantity in bags for a requirement.
 */
export function calculateRequirementPendingQty(req) {
  if (!req) return 0;
  const actualTotalRequired = req.requirement_items?.length > 0
    ? req.requirement_items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)
    : (Number(req.required_quantity) || Number(req.quantity) || 0);
  const dispatched = Number(req.total_dispatched_quantity) || 0;
  return Math.max(0, actualTotalRequired - dispatched);
}

/**
 * Checks if requirement is undispatched and active.
 */
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

/**
 * Formats a date string as DD-MM-YYYY in Indian Standard Time (IST).
 */
export function formatOrderDate(dateInput) {
  if (!dateInput) return 'Date Not Available';
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split('-');
    return `${d}-${m}-${y}`;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const parts = formatter.formatToParts(d);
    const day = parts.find(p => p.type === 'day')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const year = parts.find(p => p.type === 'year')?.value;
    if (day && month && year) {
      return `${day}-${month}-${year}`;
    }
  } catch {
    // Fallback if Intl fails
  }

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/**
 * Formats a date for UI header display (e.g. 05 Nov 2026).
 */
export function formatDateForDisplay(dateString) {
  if (!dateString) return 'All Dates';
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

/**
 * Formats weight in MT with 3 decimal places.
 */
export function formatMT(weightInKg) {
  if (weightInKg === null || weightInKg === undefined || isNaN(weightInKg)) return '—';
  const mt = Number(weightInKg) / 1000;
  return `${mt.toFixed(3)} MT`;
}

/**
 * Filters pending requirements by report date.
 */
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
 * Extracts parsed JSON extras from requirement notes safely.
 */
export function parseRequirementExtras(notes) {
  if (!notes) return {};
  try {
    const parsed = typeof notes === 'string' ? JSON.parse(notes) : notes;
    return parsed.extras || parsed || {};
  } catch {
    return {};
  }
}

/**
 * Extracts bag weight in kg for an item.
 * Weight Validation Rules:
 * - Never assume every bag is 50 kg.
 * - Never assume a missing weight.
 * - Do not use the product name to guess bag weight.
 * - If bag weight is missing, returns null (Weight Not Available).
 */
export function extractItemWeight(item, extra = {}) {
  const directWeight = item?.weight !== undefined && item?.weight !== null ? Number(item.weight) : null;
  if (directWeight !== null && !isNaN(directWeight) && directWeight > 0) {
    return directWeight;
  }

  const extraWeight = extra?.weight !== undefined && extra?.weight !== null ? Number(extra.weight) : null;
  if (extraWeight !== null && !isNaN(extraWeight) && extraWeight > 0) {
    return extraWeight;
  }

  return null;
}

/**
 * Extracts gift details for an item.
 * Returns null if no gift.
 */
export function extractGiftDetails(item, extra = {}) {
  const rawGift = item?.gift || extra?.gift;
  const rawOther = item?.other_gift || extra?.other_gift;

  if (!rawGift || rawGift === 'None' || rawGift === 'null' || rawGift === 'undefined') {
    if (!rawOther || rawOther === 'None') return null;
  }

  let giftName = rawGift === 'Others' ? (rawOther || 'Gift') : (rawGift || rawOther);
  if (!giftName || typeof giftName !== 'string' || giftName.trim() === '' || giftName.toLowerCase() === 'none') {
    return null;
  }

  giftName = giftName.trim();

  // Extract explicit quantity if present
  let giftQty = item?.gift_quantity || item?.gift_qty || extra?.gift_quantity || extra?.gift_qty || null;

  if (!giftQty) {
    // Check if embedded in gift string like "Steel Bucket × 25" or "Steel Bucket: 25 Nos"
    const matchX = giftName.match(/^(.*?)\s*(?:[×x*:]|\s-\s)\s*(\d+(?:\.\d+)?)\s*(?:nos|pcs|units)?$/i);
    if (matchX) {
      giftName = matchX[1].trim();
      giftQty = Number(matchX[2]);
    } else {
      const matchParen = giftName.match(/^(.*?)\s*\((\d+(?:\.\d+)?)\s*(?:nos|pcs|units)?\)$/i);
      if (matchParen) {
        giftName = matchParen[1].trim();
        giftQty = Number(matchParen[2]);
      }
    }
  } else {
    giftQty = Number(giftQty);
  }

  return {
    giftName: giftName.toUpperCase(),
    giftQuantity: (giftQty !== null && !isNaN(giftQty) && giftQty > 0) ? giftQty : null,
  };
}

/**
 * Formats a single product row with monospaced column spacing:
 * Product             Bags   Kg/Bag   Total MT
 * PRODUCT NAME          45      45      2.025
 */
export function formatProductRow(productName, bags, bagWeightKg) {
  const upperName = (productName || 'PRODUCT').toUpperCase();
  const bagsStr = (bags !== null && bags !== undefined) ? String(bags) : '—';
  const kgStr = (bagWeightKg !== null && bagWeightKg !== undefined && bagWeightKg > 0) ? String(bagWeightKg) : '—';
  const mtStr = (bags !== null && bagWeightKg !== null && bagWeightKg > 0)
    ? ((bags * bagWeightKg) / 1000).toFixed(3)
    : '—';

  const kgPart = ' '.repeat(Math.max(2, 8 - kgStr.length)) + kgStr;
  const mtPart = ' '.repeat(Math.max(2, 11 - mtStr.length)) + mtStr;

  if (upperName.length <= 18) {
    const padding = Math.max(2, 24 - upperName.length - bagsStr.length);
    const firstPart = upperName + ' '.repeat(padding) + bagsStr;
    return `${firstPart}${kgPart}${mtPart}`;
  } else {
    // For long product names, wrap naturally onto the next line without changing the values
    const colBags = bagsStr.padStart(24, ' ');
    return `${upperName}\n${colBags}${kgPart}${mtPart}`;
  }
}

/**
 * Computes Customer-wise Pending Orders report data.
 */
export function computeDailyPendingReport(pendingRequirements = [], reportDate = '') {
  let totalPendingBags = 0;
  let totalPendingWeightKg = 0;
  let hasMissingWeightOverall = false;

  const giftsSummaryMap = new Map(); // giftName -> { totalQty: number, hasUnspecified: boolean }
  const customerMap = new Map(); // customerKey -> customerData

  pendingRequirements.forEach(req => {
    const customerName = req.customer_name?.trim() || 'UNKNOWN CUSTOMER';
    const customerKey = req.party_id || customerName;

    if (!customerMap.has(customerKey)) {
      customerMap.set(customerKey, {
        customerId: customerKey,
        customerName: customerName.toUpperCase(),
        customerCity: req.customer_city ? req.customer_city.trim().toUpperCase() : '',
        customerMobile: req.customer_mobile || '',
        customerWhatsapp: req.customer_whatsapp || '',
        orders: [],
        totalBags: 0,
        totalWeightKg: 0,
        hasMissingWeight: false,
      });
    }

    const customerEntry = customerMap.get(customerKey);
    const extras = parseRequirementExtras(req.notes);

    // Original order date
    const orderDateStr = formatOrderDate(req.created_at || req.order_date || req.expected_date);

    const orderObj = {
      orderId: req.id,
      demandRef: req.demand_ref,
      orderDate: orderDateStr,
      created_at: req.created_at,
      expected_date: req.expected_date,
      assignedOwner: req.owner_email ? req.owner_email.split('@')[0] : 'Unassigned',
      products: [],
      gifts: [],
      orderTotalBags: 0,
      orderTotalWeightKg: 0,
      orderHasMissingWeight: false,
    };

    if (req.requirement_items && req.requirement_items.length > 0) {
      const headerTotal = req.requirement_items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
      const headerPending = calculateRequirementPendingQty(req);
      const ratio = headerTotal > 0 ? (headerPending / headerTotal) : 1;

      req.requirement_items.forEach(item => {
        const prodName = item.product_name?.trim() || 'UNKNOWN PRODUCT';
        const rawQty = Number(item.quantity) || 0;
        const itemPending = ratio < 1 ? Math.round(rawQty * ratio) : rawQty;
        if (itemPending <= 0) return;

        const extraKey = `${item.category}_${item.product_name}`;
        const itemExtra = extras[extraKey] || extras[item.product_name] || {};

        const bagWeight = extractItemWeight(item, itemExtra);
        const hasWeight = bagWeight !== null;

        let itemWeightKg = 0;
        if (hasWeight) {
          itemWeightKg = itemPending * bagWeight;
          orderObj.orderTotalWeightKg += itemWeightKg;
          customerEntry.totalWeightKg += itemWeightKg;
          totalPendingWeightKg += itemWeightKg;
        } else {
          orderObj.orderHasMissingWeight = true;
          customerEntry.hasMissingWeight = true;
          hasMissingWeightOverall = true;
        }

        orderObj.orderTotalBags += itemPending;
        customerEntry.totalBags += itemPending;
        totalPendingBags += itemPending;

        orderObj.products.push({
          productName: prodName.toUpperCase(),
          pendingBags: itemPending,
          bagWeightKg: bagWeight,
          itemWeightKg: hasWeight ? itemWeightKg : null,
          hasWeight,
        });

        // Gift check
        const giftDetails = extractGiftDetails(item, itemExtra);
        if (giftDetails) {
          orderObj.gifts.push(giftDetails);

          const gName = giftDetails.giftName;
          if (!giftsSummaryMap.has(gName)) {
            giftsSummaryMap.set(gName, { giftName: gName, totalQty: 0, hasUnspecified: false });
          }
          const gEntry = giftsSummaryMap.get(gName);
          if (giftDetails.giftQuantity !== null) {
            gEntry.totalQty += giftDetails.giftQuantity;
          } else {
            gEntry.hasUnspecified = true;
          }
        }
      });
    } else {
      // Single requirement fallback
      const reqPending = calculateRequirementPendingQty(req);
      if (reqPending > 0) {
        const prodName = (req.product_type && req.product_type !== 'General Requirement')
          ? req.product_type.trim()
          : (req.product_name?.trim() || 'GENERAL REQUIREMENT');

        const itemExtra = extras[prodName] || extras['General'] || {};
        const bagWeight = extractItemWeight(req, itemExtra);
        const hasWeight = bagWeight !== null;

        let itemWeightKg = 0;
        if (hasWeight) {
          itemWeightKg = reqPending * bagWeight;
          orderObj.orderTotalWeightKg += itemWeightKg;
          customerEntry.totalWeightKg += itemWeightKg;
          totalPendingWeightKg += itemWeightKg;
        } else {
          orderObj.orderHasMissingWeight = true;
          customerEntry.hasMissingWeight = true;
          hasMissingWeightOverall = true;
        }

        orderObj.orderTotalBags += reqPending;
        customerEntry.totalBags += reqPending;
        totalPendingBags += reqPending;

        orderObj.products.push({
          productName: prodName.toUpperCase(),
          pendingBags: reqPending,
          bagWeightKg: bagWeight,
          itemWeightKg: hasWeight ? itemWeightKg : null,
          hasWeight,
        });

        const giftDetails = extractGiftDetails(req, itemExtra);
        if (giftDetails) {
          orderObj.gifts.push(giftDetails);
          const gName = giftDetails.giftName;
          if (!giftsSummaryMap.has(gName)) {
            giftsSummaryMap.set(gName, { giftName: gName, totalQty: 0, hasUnspecified: false });
          }
          const gEntry = giftsSummaryMap.get(gName);
          if (giftDetails.giftQuantity !== null) {
            gEntry.totalQty += giftDetails.giftQuantity;
          } else {
            gEntry.hasUnspecified = true;
          }
        }
      }
    }

    if (orderObj.products.length > 0) {
      customerEntry.orders.push(orderObj);
    }
  });

  // Convert customerMap to array
  const customerList = Array.from(customerMap.values())
    .filter(c => c.orders.length > 0)
    .sort((a, b) => b.totalBags - a.totalBags);

  // Overall gifts summary array
  const giftsSummary = Array.from(giftsSummaryMap.values()).map(g => {
    let summaryText = '';
    if (g.totalQty > 0 && !g.hasUnspecified) {
      summaryText = `Committed — ${g.totalQty} Nos`;
    } else if (g.totalQty > 0 && g.hasUnspecified) {
      summaryText = `Committed — ${g.totalQty} Nos (+ Qty Not Specified)`;
    } else {
      summaryText = 'Committed — Quantity Not Specified';
    }
    return {
      giftName: g.giftName,
      totalQty: g.totalQty,
      hasUnspecified: g.hasUnspecified,
      summaryText,
    };
  });

  const reportDateFormatted = reportDate ? formatDateForDisplay(reportDate) : 'Today';

  return {
    reportDate,
    reportDateFormatted,
    totalCustomers: customerList.length,
    totalPendingBags,
    totalPendingWeightKg,
    totalPendingWeightMT: (totalPendingWeightKg / 1000).toFixed(3),
    hasMissingWeightOverall,
    customerList,
    giftsSummary,
  };
}

/**
 * Generates exact WhatsApp message formatted for SL-REQ-WHATSAPP-REPORT-FORMAT-02.
 */
export function generateWhatsAppReportText(reportData) {
  const {
    customerList = [],
    totalPendingBags = 0,
    totalPendingWeightMT = '0.000',
    hasMissingWeightOverall = false,
    giftsSummary = [],
  } = reportData;

  if (customerList.length === 0) {
    return `👥 *CUSTOMER-WISE PENDING ORDERS*
${SEPARATOR}

No pending dispatch requirements found for this date.

${SEPARATOR}
*Report generated from Shubh Labh CRM*`;
  }

  const tableHeader = 'Product             Bags   Kg/Bag   Total MT';

  const customerBlocks = customerList.map((customer, idx) => {
    const custNum = idx + 1;
    let custHeader = `*${custNum}. ${customer.customerName}*`;
    if (customer.customerCity) {
      custHeader += `\n📍 ${customer.customerCity}`;
    }

    // Process orders under customer (preserving separate order dates)
    const orderSections = customer.orders.map(order => {
      const dateLine = `📅 ${order.orderDate}`;

      const productLines = order.products.map(p => {
        return formatProductRow(p.productName, p.pendingBags, p.bagWeightKg);
      }).join('\n');

      const orderBags = `📦 Total: *${order.orderTotalBags} Bags*`;
      let orderWeight = `⚖️ Weight: *${(order.orderTotalWeightKg / 1000).toFixed(3)} MT*`;
      if (order.orderHasMissingWeight) {
        orderWeight += '\n⚠️ Weight incomplete';
      }

      const giftLines = order.gifts.map(g => {
        if (g.giftQuantity !== null) {
          return `🎁 Gift: ${g.giftName} × ${g.giftQuantity}`;
        }
        return `🎁 Gift: ${g.giftName} × Qty Not Specified`;
      }).join('\n');

      let orderBlock = `${dateLine}\n\n${tableHeader}\n${productLines}\n${SEPARATOR}\n${orderBags}\n${orderWeight}`;
      if (giftLines) {
        orderBlock += `\n${giftLines}`;
      }
      return orderBlock;
    }).join('\n\n');

    return `${custHeader}\n\n${orderSections}`;
  }).join(`\n\n${SEPARATOR}\n\n`);

  // Grand Total Section
  let grandTotalSection = `📌 *GRAND TOTAL PENDING*
📦 Total Bags: *${totalPendingBags} Bags*
⚖️ Available Weight: *${totalPendingWeightMT} MT*`;

  if (hasMissingWeightOverall) {
    grandTotalSection += '\n⚠️ Some product weights are unavailable.';
  }

  // Gifts summary section
  let giftsSection = '';
  if (giftsSummary.length > 0) {
    const giftLines = giftsSummary.map(g => `${g.giftName}: ${g.summaryText}`).join('\n');
    giftsSection = `\n\n🎁 *PENDING GIFTS*\n${giftLines}`;
  }

  return `👥 *CUSTOMER-WISE PENDING ORDERS*
${SEPARATOR}

${customerBlocks}

${SEPARATOR}

${grandTotalSection}${giftsSection}

${SEPARATOR}
*Report generated from Shubh Labh CRM*`;
}
