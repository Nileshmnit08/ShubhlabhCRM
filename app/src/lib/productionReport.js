/**
 * Pure aggregation and Hindi WhatsApp formatting for the Factory Production Report.
 * Feature: SL-REQ-PRODUCTION-REPORT-01
 *
 * Strictly read-only. Excludes all customer names, addresses, and personal info.
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
 * Aggregates all currently filtered Not Dispatched requirements by Product + Packaging Weight (KG)
 * and extracts associated gift commitments without any customer details.
 */
export function computeProductionReport(pendingRequirements = [], reportDate = '', { productWeights = {} } = {}) {
  const productMap = new Map(); // prodKey -> { productName, variantsMap, totalBags, totalKnownWeightKg, hasMissingWeight }
  const giftMap = new Map(); // giftKey -> { productName, bagWeightKg, giftName, bags, knownGiftQty, hasUnspecifiedQty }

  let totalBags = 0;
  let totalKnownWeightKg = 0;
  let hasMissingWeightOverall = false;
  let hasUnspecifiedGifts = false;

  const recordLine = ({ prodName, pendingBags, bagWeightKg, giftDetails }) => {
    if (!pendingBags || pendingBags <= 0) return;

    const cleanProdName = (prodName || 'अज्ञात उत्पाद').trim();
    const prodKey = cleanProdName.toLowerCase();
    const weightKey = bagWeightKg !== null ? String(bagWeightKg) : 'UNKNOWN';

    if (!productMap.has(prodKey)) {
      productMap.set(prodKey, {
        productName: cleanProdName,
        variantsMap: new Map(),
        totalBags: 0,
        totalKnownWeightKg: 0,
        hasMissingWeight: false,
      });
    }

    const pEntry = productMap.get(prodKey);
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
    totalBags += pendingBags;

    if (bagWeightKg !== null) {
      const lineWeightKg = pendingBags * bagWeightKg;
      vEntry.weightKg += lineWeightKg;
      pEntry.totalKnownWeightKg += lineWeightKg;
      totalKnownWeightKg += lineWeightKg;
    } else {
      pEntry.hasMissingWeight = true;
      hasMissingWeightOverall = true;
    }

    if (giftDetails) {
      const gKey = `${prodKey}__${weightKey}__${giftDetails.giftName.toLowerCase()}`;
      if (!giftMap.has(gKey)) {
        giftMap.set(gKey, {
          productName: cleanProdName,
          bagWeightKg,
          giftName: giftDetails.giftName,
          bags: 0,
          knownGiftQty: 0,
          hasUnspecifiedQty: false,
        });
      }
      const gEntry = giftMap.get(gKey);
      gEntry.bags += pendingBags;

      if (giftDetails.giftQuantity !== null) {
        gEntry.knownGiftQty += giftDetails.giftQuantity;
      } else {
        gEntry.hasUnspecifiedQty = true;
        hasUnspecifiedGifts = true;
      }
    }
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
        const itemPending = ratio < 1 ? Math.round(rawQty * ratio) : rawQty;
        if (itemPending <= 0) return;

        const prodName = item.product_name?.trim() || 'अज्ञात उत्पाद';
        const extraKey = `${item.category}_${item.product_name}`;
        const itemExtra = extras[extraKey] || extras[item.product_name] || {};
        const bagWeightKg = resolvePackagingWeight(item, itemExtra, prodName, productWeights);
        const giftDetails = extractGiftDetails(item, itemExtra, { preserveCase: true });

        recordLine({
          prodName,
          pendingBags: itemPending,
          bagWeightKg,
          giftDetails,
        });
      });
    } else {
      const reqPending = calculateRequirementPendingQty(req);
      if (reqPending > 0) {
        const prodName = (req.product_type && req.product_type !== 'General Requirement')
          ? req.product_type.trim()
          : (req.product_name?.trim() || 'General Requirement');

        const itemExtra = extras[prodName] || extras['General'] || {};
        const bagWeightKg = resolvePackagingWeight(req, itemExtra, prodName, productWeights);
        const giftDetails = extractGiftDetails(req, itemExtra, { preserveCase: true });

        recordLine({
          prodName,
          pendingBags: reqPending,
          bagWeightKg,
          giftDetails,
        });
      }
    }
  });

  const products = Array.from(productMap.values()).map(p => {
    // Sort variants: known weights descending (e.g. 45 kg then 43 kg), unknown weight last
    const variants = Array.from(p.variantsMap.values()).sort((a, b) => {
      if (a.bagWeightKg === null && b.bagWeightKg === null) return 0;
      if (a.bagWeightKg === null) return 1;
      if (b.bagWeightKg === null) return -1;
      return b.bagWeightKg - a.bagWeightKg;
    });

    return {
      productName: p.productName,
      variants,
      totalBags: p.totalBags,
      totalKnownWeightKg: p.totalKnownWeightKg,
      hasMissingWeight: p.hasMissingWeight,
      allWeightsMissing: p.hasMissingWeight && p.totalKnownWeightKg === 0,
    };
  });

  const gifts = Array.from(giftMap.values());
  const dateSource = reportDate || new Date();
  const reportDateDDMMYYYY = formatOrderDate(dateSource);

  return {
    reportDateDDMMYYYY,
    products,
    gifts,
    totalBags,
    totalKnownWeightKg,
    totalKnownWeightMT: (totalKnownWeightKg / 1000).toFixed(3),
    hasMissingWeightOverall,
    hasUnspecifiedGifts,
  };
}

/**
 * Generates the Hindi WhatsApp report formatted for the factory production & packing team.
 */
export function generateProductionReportText(reportData) {
  const {
    reportDateDDMMYYYY,
    products = [],
    gifts = [],
    totalBags = 0,
    totalKnownWeightKg = 0,
    totalKnownWeightMT = '0.000',
    hasMissingWeightOverall = false,
    hasUnspecifiedGifts = false,
  } = reportData;

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

