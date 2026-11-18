/**
 * Pure aggregation and Hindi WhatsApp formatting for the Factory Production Report.
 * Feature: SL-REQ-PRODUCTION-REPORT-01 & SL-PRODUCTION-STATUS-01
 *
 * Strictly read-only. Excludes all customer names, addresses, and personal info.
 * Provides two clear views:
 *   - Pending Production (production_done = false): Product-wise pending bags, packaging weight, gifts. Excludes completed items.
 *   - Completed Production (production_done = true): Actual completed quantities, packaging, completion date, and responsible staff.
 */

import {
  SEPARATOR,
  calculateRequirementPendingQty,
  isRequirementPending,
  formatOrderDate,
  parseRequirementExtras,
  extractItemWeight,
  extractGiftDetails,
} from './dailyPendingReport.js';

export function formatIndianNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString('en-IN');
}

/**
 * Formats ISO datetime string to Indian display format: DD-MM-YYYY, hh:mm A
 * Example: 2026-11-17T11:24:00Z -> 17-11-2026, 11:24 AM
 */
export function formatCompletionDateTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const pad = (n) => n.toString().padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  const displayHours = hours ? hours : 12;
  return `${day}-${month}-${year}, ${pad(displayHours)}:${minutes} ${ampm}`;
}

/**
 * Resolves packaging weight in KG per bag from item, JSON extras, or optional product master.
 * Never defaults to 50 kg and never guesses weight from product name.
 */
function resolvePackagingWeight(item, extra, productName, productWeights = {}) {
  const itemWeight = extractItemWeight(item, extra);
  if (itemWeight !== null) return itemWeight;

  const key = productName ? productName.trim().toLowerCase() : '';
  const masterWeight = key && productWeights[key] !== undefined && productWeights[key] !== null
    ? Number(productWeights[key])
    : null;

  if (masterWeight !== null && !isNaN(masterWeight) && masterWeight > 0) {
    return masterWeight;
  }

  return null;
}

/**
 * Aggregates requirements into two distinct views:
 *   A. Pending Production (production_done !== true)
 *   B. Completed Production (production_done === true)
 */
export function computeProductionReport(pendingRequirements = [], reportDate = '', { productWeights = {}, usersMap = {} } = {}) {
  // Pending maps & accumulators
  const pendingProductMap = new Map();
  const pendingGiftMap = new Map();
  let pendingTotalBags = 0;
  let pendingTotalKnownWeightKg = 0;
  let pendingHasMissingWeightOverall = false;
  let pendingHasUnspecifiedGifts = false;

  // Completed maps & accumulators
  const completedProductMap = new Map();
  const completedItemsList = [];
  let completedTotalBags = 0;
  let completedTotalKnownWeightKg = 0;
  let completedHasMissingWeightOverall = false;

  const recordPendingLine = ({ prodName, pendingBags, bagWeightKg, giftDetails }) => {
    if (!pendingBags || pendingBags <= 0) return;

    const cleanProdName = (prodName || 'अज्ञात उत्पाद').trim();
    const prodKey = cleanProdName.toLowerCase();
    const weightKey = bagWeightKg !== null ? String(bagWeightKg) : 'UNKNOWN';

    if (!pendingProductMap.has(prodKey)) {
      pendingProductMap.set(prodKey, {
        productName: cleanProdName,
        variantsMap: new Map(),
        totalBags: 0,
        totalKnownWeightKg: 0,
        hasMissingWeight: false,
      });
    }

    const pEntry = pendingProductMap.get(prodKey);
    if (!pEntry.variantsMap.has(weightKey)) {
      pEntry.variantsMap.set(weightKey, {
        bagWeightKg,
        bags: 0,
        weightKg: 0,
      });
    }

    const vEntry = pEntry.variantsMap.get(weightKey);
    vEntry.bags += pendingBags;
    pEntry.totalBags += pendingBags;
    pendingTotalBags += pendingBags;

    if (bagWeightKg !== null) {
      const lineWeightKg = pendingBags * bagWeightKg;
      vEntry.weightKg += lineWeightKg;
      pEntry.totalKnownWeightKg += lineWeightKg;
      pendingTotalKnownWeightKg += lineWeightKg;
    } else {
      pEntry.hasMissingWeight = true;
      pendingHasMissingWeightOverall = true;
    }

    if (giftDetails) {
      const gKey = `${prodKey}__${weightKey}__${giftDetails.giftName.toLowerCase()}`;
      if (!pendingGiftMap.has(gKey)) {
        pendingGiftMap.set(gKey, {
          productName: cleanProdName,
          bagWeightKg,
          giftName: giftDetails.giftName,
          bags: 0,
          knownGiftQty: 0,
          hasUnspecifiedQty: false,
        });
      }
      const gEntry = pendingGiftMap.get(gKey);
      gEntry.bags += pendingBags;

      if (giftDetails.giftQuantity !== null) {
        gEntry.knownGiftQty += giftDetails.giftQuantity;
      } else {
        gEntry.hasUnspecifiedQty = true;
        pendingHasUnspecifiedGifts = true;
      }
    }
  };

  const recordCompletedLine = ({ prodName, completedBags, bagWeightKg, doneAt, doneBy, responsibleName, reqId, demandRef, itemId }) => {
    if (!completedBags || completedBags <= 0) return;

    const cleanProdName = (prodName || 'अज्ञात उत्पाद').trim();
    const prodKey = cleanProdName.toLowerCase();
    const weightKey = bagWeightKg !== null ? String(bagWeightKg) : 'UNKNOWN';

    if (!completedProductMap.has(prodKey)) {
      completedProductMap.set(prodKey, {
        productName: cleanProdName,
        variantsMap: new Map(),
        totalBags: 0,
        totalKnownWeightKg: 0,
        hasMissingWeight: false,
        completions: [],
      });
    }

    const pEntry = completedProductMap.get(prodKey);
    if (!pEntry.variantsMap.has(weightKey)) {
      pEntry.variantsMap.set(weightKey, {
        bagWeightKg,
        bags: 0,
        weightKg: 0,
      });
    }

    const vEntry = pEntry.variantsMap.get(weightKey);
    vEntry.bags += completedBags;
    pEntry.totalBags += completedBags;
    completedTotalBags += completedBags;

    let lineWeightKg = null;
    if (bagWeightKg !== null) {
      lineWeightKg = completedBags * bagWeightKg;
      vEntry.weightKg += lineWeightKg;
      pEntry.totalKnownWeightKg += lineWeightKg;
      completedTotalKnownWeightKg += lineWeightKg;
    } else {
      pEntry.hasMissingWeight = true;
      completedHasMissingWeightOverall = true;
    }

    pEntry.completions.push({
      itemId,
      reqId,
      demandRef,
      bags: completedBags,
      bagWeightKg,
      doneAt,
      doneBy,
      responsibleName,
    });

    completedItemsList.push({
      id: itemId,
      requirementId: reqId,
      demandRef,
      productName: cleanProdName,
      bags: completedBags,
      bagWeightKg,
      weightKg: lineWeightKg,
      doneAt,
      doneBy,
      responsibleName,
    });
  };

  pendingRequirements.forEach(req => {
    if (!isRequirementPending(req)) return;

    const extras = parseRequirementExtras(req.notes);

    if (req.requirement_items && req.requirement_items.length > 0) {
      const headerTotal = req.requirement_items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
      const headerPending = calculateRequirementPendingQty(req);
      const ratio = headerTotal > 0 ? (headerPending / headerTotal) : 1;

      req.requirement_items.forEach(item => {
        const rawQty = Number(item.quantity) || 0;
        const itemQty = ratio < 1 ? Math.round(rawQty * ratio) : rawQty;
        if (itemQty <= 0) return;

        const prodName = item.product_name?.trim() || 'अज्ञात उत्पाद';
        const extraKey = `${item.category}_${item.product_name}`;
        const itemExtra = extras[extraKey] || extras[item.product_name] || {};
        const bagWeightKg = resolvePackagingWeight(item, itemExtra, prodName, productWeights);

        const isDone = item.production_done === true;

        if (isDone) {
          const userLookup = item.production_done_by ? (usersMap[item.production_done_by] || null) : null;
          const respName = (userLookup && typeof userLookup === 'object' ? (userLookup.display_name || userLookup.email?.split('@')[0]) : userLookup)
            || (req.owner_email ? req.owner_email.split('@')[0] : null);

          recordCompletedLine({
            prodName,
            completedBags: itemQty,
            bagWeightKg,
            doneAt: item.production_done_at,
            doneBy: item.production_done_by,
            responsibleName: respName,
            reqId: req.id,
            demandRef: req.demand_ref,
            itemId: item.id,
          });
        } else {
          const giftDetails = extractGiftDetails(item, itemExtra, { preserveCase: true });
          recordPendingLine({
            prodName,
            pendingBags: itemQty,
            bagWeightKg,
            giftDetails,
          });
        }
      });
    } else {
      const reqPending = calculateRequirementPendingQty(req);
      if (reqPending > 0) {
        const prodName = (req.product_type && req.product_type !== 'General Requirement')
          ? req.product_type.trim()
          : (req.product_name?.trim() || 'General Requirement');

        const itemExtra = extras[prodName] || extras['General'] || {};
        const bagWeightKg = resolvePackagingWeight(req, itemExtra, prodName, productWeights);

        if (req.production_done === true) {
          recordCompletedLine({
            prodName,
            completedBags: reqPending,
            bagWeightKg,
            doneAt: req.production_done_at,
            doneBy: req.production_done_by,
            responsibleName: req.owner_email ? req.owner_email.split('@')[0] : null,
            reqId: req.id,
            demandRef: req.demand_ref,
            itemId: null,
          });
        } else {
          const giftDetails = extractGiftDetails(req, itemExtra, { preserveCase: true });
          recordPendingLine({
            prodName,
            pendingBags: reqPending,
            bagWeightKg,
            giftDetails,
          });
        }
      }
    }
  });

  const sortVariants = (variantsMap) => {
    return Array.from(variantsMap.values()).sort((a, b) => {
      if (a.bagWeightKg === null && b.bagWeightKg === null) return 0;
      if (a.bagWeightKg === null) return 1;
      if (b.bagWeightKg === null) return -1;
      return b.bagWeightKg - a.bagWeightKg;
    });
  };

  const pendingProducts = Array.from(pendingProductMap.values()).map(p => ({
    productName: p.productName,
    variants: sortVariants(p.variantsMap),
    totalBags: p.totalBags,
    totalKnownWeightKg: p.totalKnownWeightKg,
    hasMissingWeight: p.hasMissingWeight,
    allWeightsMissing: p.hasMissingWeight && p.totalKnownWeightKg === 0,
  }));

  const completedProducts = Array.from(completedProductMap.values()).map(p => ({
    productName: p.productName,
    variants: sortVariants(p.variantsMap),
    totalBags: p.totalBags,
    totalKnownWeightKg: p.totalKnownWeightKg,
    hasMissingWeight: p.hasMissingWeight,
    allWeightsMissing: p.hasMissingWeight && p.totalKnownWeightKg === 0,
    completions: p.completions,
  }));

  const pendingGifts = Array.from(pendingGiftMap.values());
  const dateSource = reportDate || new Date();
  const reportDateDDMMYYYY = formatOrderDate(dateSource);

  const pending = {
    products: pendingProducts,
    gifts: pendingGifts,
    totalBags: pendingTotalBags,
    totalKnownWeightKg: pendingTotalKnownWeightKg,
    totalKnownWeightMT: (pendingTotalKnownWeightKg / 1000).toFixed(3),
    hasMissingWeightOverall: pendingHasMissingWeightOverall,
    hasUnspecifiedGifts: pendingHasUnspecifiedGifts,
  };

  const completed = {
    products: completedProducts,
    items: completedItemsList,
    totalBags: completedTotalBags,
    totalKnownWeightKg: completedTotalKnownWeightKg,
    totalKnownWeightMT: (completedTotalKnownWeightKg / 1000).toFixed(3),
    hasMissingWeightOverall: completedHasMissingWeightOverall,
  };

  return {
    reportDateDDMMYYYY,
    pending,
    completed,
    // Top-level aliases for pending (100% backwards compatibility)
    products: pendingProducts,
    gifts: pendingGifts,
    totalBags: pendingTotalBags,
    totalKnownWeightKg: pendingTotalKnownWeightKg,
    totalKnownWeightMT: (pendingTotalKnownWeightKg / 1000).toFixed(3),
    hasMissingWeightOverall: pendingHasMissingWeightOverall,
    hasUnspecifiedGifts: pendingHasUnspecifiedGifts,
  };
}

/**
 * Generates the Hindi WhatsApp report for Pending Production (उत्पादन आवश्यकता)
 */
export function generatePendingProductionReportText(reportData) {
  const pData = reportData?.pending || reportData || {};
  const reportDateDDMMYYYY = reportData?.reportDateDDMMYYYY || pData.reportDateDDMMYYYY || formatOrderDate(new Date());
  const {
    products = [],
    gifts = [],
    totalBags = 0,
    totalKnownWeightKg = 0,
    totalKnownWeightMT = '0.000',
    hasMissingWeightOverall = false,
    hasUnspecifiedGifts = false,
  } = pData;

  const header = `🏭 *शुभ लाभ – आज की उत्पादन आवश्यकता*
📅 ${reportDateDDMMYYYY}
${SEPARATOR}`;

  if (products.length === 0) {
    return `${header}

आज के लिए कोई लंबित (Not Dispatched) उत्पादन आवश्यकता नहीं है।

${SEPARATOR}

*शुभ लाभ CRM – उत्पादन विभाग*`;
  }

  const productBlocks = products.map((product, idx) => {
    const variantLines = product.variants.map(v => {
      if (v.bagWeightKg !== null) {
        return `- ${product.productName} के ${v.bagWeightKg} किलो के *${formatIndianNumber(v.bags)} बैग* बनाने हैं।`;
      }
      return `- ${product.productName} (पैकेजिंग वजन उपलब्ध नहीं) के *${formatIndianNumber(v.bags)} बैग* बनाने हैं।`;
    }).join('\n');

    let weightLine = '';
    if (product.allWeightsMissing) {
      weightLine = 'कुल वजन: ⚠️ *वजन उपलब्ध नहीं है*';
    } else if (product.hasMissingWeight) {
      weightLine = `कुल वजन: *${formatIndianNumber(product.totalKnownWeightKg)} किलो* ⚠️ (कुछ बैग का वजन उपलब्ध नहीं है)`;
    } else {
      weightLine = `कुल वजन: *${formatIndianNumber(product.totalKnownWeightKg)} किलो*`;
    }

    return `📦 *${idx + 1}. ${product.productName}*
${variantLines}

कुल: *${formatIndianNumber(product.totalBags)} बैग*
${weightLine}`;
  }).join(`\n\n${SEPARATOR}\n\n`);

  let giftsSection = '';
  if (gifts.length > 0) {
    const giftLines = gifts.map(g => {
      const packagingDesc = g.bagWeightKg !== null
        ? `${g.productName} के ${g.bagWeightKg} किलो वाले ${formatIndianNumber(g.bags)} बैग के साथ`
        : `${g.productName} के ${formatIndianNumber(g.bags)} बैग (वजन उपलब्ध नहीं) के साथ`;

      if (!g.hasUnspecifiedQty && g.knownGiftQty > 0) {
        return `- ${packagingDesc} *${g.giftName}* (${formatIndianNumber(g.knownGiftQty)} नग) देना है।`;
      } else if (g.hasUnspecifiedQty && g.knownGiftQty > 0) {
        return `- ${packagingDesc} *${g.giftName}* (${formatIndianNumber(g.knownGiftQty)} नग + शेष के लिए उपहार की संख्या की पुष्टि करनी है।) देना है।`;
      }
      return `- ${packagingDesc} *${g.giftName}* देना है। (उपहार की संख्या की पुष्टि करनी है।)`;
    }).join('\n');

    const giftWarning = hasUnspecifiedGifts
      ? '\n\n⚠️ कुछ उपहारों की संख्या उपलब्ध नहीं है — कृपया संख्या की पुष्टि करनी है।'
      : '';

    giftsSection = `\n\n${SEPARATOR}\n\n🎁 *उपहार पैकिंग*\n\n${giftLines}${giftWarning}`;
  }

  let totalWeightLine = '';
  if (hasMissingWeightOverall) {
    if (totalKnownWeightKg > 0) {
      totalWeightLine = `- कुल ज्ञात माल: *${formatIndianNumber(totalKnownWeightKg)} किलो (${totalKnownWeightMT} मीट्रिक टन)*\n- ⚠️ चेतावनी: कुछ बैग का पैकेजिंग वजन उपलब्ध नहीं है, इसलिए अज्ञात वजन को कुल में शामिल नहीं किया गया है।`;
    } else {
      totalWeightLine = '- कुल माल: ⚠️ *वजन उपलब्ध नहीं है*';
    }
  } else {
    totalWeightLine = `- कुल माल: *${formatIndianNumber(totalKnownWeightKg)} किलो (${totalKnownWeightMT} मीट्रिक टन)*`;
  }

  const totalSection = `📊 *कुल उत्पादन*
- कुल बैग बनाने हैं: *${formatIndianNumber(totalBags)}*
${totalWeightLine}`;

  return `${header}

${productBlocks}${giftsSection}

${SEPARATOR}

${totalSection}

${SEPARATOR}

*शुभ लाभ CRM – उत्पादन विभाग*`;
}

/**
 * Generates the Hindi WhatsApp report for Completed Production (पूर्ण उत्पादन रिपोर्ट)
 */
export function generateCompletedProductionReportText(reportData) {
  const cData = reportData?.completed || reportData || {};
  const reportDateDDMMYYYY = reportData?.reportDateDDMMYYYY || cData.reportDateDDMMYYYY || formatOrderDate(new Date());
  const {
    products = [],
    items = [],
    totalBags = 0,
    totalKnownWeightKg = 0,
    totalKnownWeightMT = '0.000',
    hasMissingWeightOverall = false,
  } = cData;

  const header = `✅ *शुभ लाभ – पूर्ण उत्पादन रिपोर्ट (Completed Production)*
📅 ${reportDateDDMMYYYY}
${SEPARATOR}`;

  if (products.length === 0 && items.length === 0) {
    return `${header}

आज के लिए कोई पूर्ण (Completed) उत्पादन रिकॉर्ड नहीं है।

${SEPARATOR}

*शुभ लाभ CRM – उत्पादन विभाग*`;
  }

  const productBlocks = products.map((product, idx) => {
    const variantLines = product.variants.map(v => {
      if (v.bagWeightKg !== null) {
        return `- ${product.productName} के ${v.bagWeightKg} किलो के *${formatIndianNumber(v.bags)} बैग* पूर्ण किए गए।`;
      }
      return `- ${product.productName} (पैकेजिंग वजन उपलब्ध नहीं) के *${formatIndianNumber(v.bags)} बैग* पूर्ण किए गए।`;
    }).join('\n');

    let weightLine = '';
    if (product.allWeightsMissing) {
      weightLine = 'कुल तैयार वजन: ⚠️ *वजन उपलब्ध नहीं है*';
    } else if (product.hasMissingWeight) {
      weightLine = `कुल तैयार वजन: *${formatIndianNumber(product.totalKnownWeightKg)} किलो* ⚠️ (कुछ बैग का वजन उपलब्ध नहीं है)`;
    } else {
      weightLine = `कुल तैयार वजन: *${formatIndianNumber(product.totalKnownWeightKg)} किलो*`;
    }

    let completionLines = '';
    if (product.completions && product.completions.length > 0) {
      const details = product.completions.map(c => {
        const timeStr = c.doneAt ? formatCompletionDateTime(c.doneAt) : 'समय उपलब्ध नहीं';
        const userStr = c.responsibleName ? ` (${c.responsibleName})` : '';
        return `  • ${formatIndianNumber(c.bags)} बैग: ${timeStr}${userStr}`;
      }).join('\n');
      completionLines = `\n${details}`;
    }

    return `📦 *${idx + 1}. ${product.productName}*
${variantLines}${completionLines}

कुल तैयार: *${formatIndianNumber(product.totalBags)} बैग*
${weightLine}`;
  }).join(`\n\n${SEPARATOR}\n\n`);

  let totalWeightLine = '';
  if (hasMissingWeightOverall) {
    if (totalKnownWeightKg > 0) {
      totalWeightLine = `- कुल तैयार माल: *${formatIndianNumber(totalKnownWeightKg)} किलो (${totalKnownWeightMT} मीट्रिक टन)*\n- ⚠️ चेतावनी: कुछ बैग का पैकेजिंग वजन उपलब्ध नहीं है।`;
    } else {
      totalWeightLine = '- कुल माल: ⚠️ *वजन उपलब्ध नहीं है*';
    }
  } else {
    totalWeightLine = `- कुल तैयार माल: *${formatIndianNumber(totalKnownWeightKg)} किलो (${totalKnownWeightMT} मीट्रिक टन)*`;
  }

  const totalSection = `📊 *कुल पूर्ण उत्पादन*
- कुल तैयार बैग: *${formatIndianNumber(totalBags)}*
${totalWeightLine}`;

  return `${header}

${productBlocks}

${SEPARATOR}

${totalSection}

${SEPARATOR}

*शुभ लाभ CRM – उत्पादन विभाग*`;
}

/**
 * Generates the Hindi WhatsApp report formatted for factory production & packing team.
 * Options:
 *   - view: 'pending' (default) | 'completed'
 */
export function generateProductionReportText(reportData, options = {}) {
  if (options?.view === 'completed') {
    return generateCompletedProductionReportText(reportData);
  }
  return generatePendingProductionReportText(reportData);
}
