// WhatsApp Sharing Engine for LabourHisaab
// Prepares share-ready Hindi text statement and opens native share sheet/WhatsApp

let NativeShare = null;
let NativeLinking = null;

// Dynamically resolve react-native when available in mobile runtime
// Plain require, not top-level await (unsupported by Hermes release bundles).
try {
  const rn = require('react-native');
  NativeShare = rn.Share;
  NativeLinking = rn.Linking;
} catch (e) {
  // Running in Node / Test runner environment
}

const HINDI_MONTHS = {
  '01': 'जनवरी',
  '02': 'फ़रवरी',
  '03': 'मार्च',
  '04': 'अप्रैल',
  '05': 'मई',
  '06': 'जून',
  '07': 'जुलाई',
  '08': 'अगस्त',
  '09': 'सितम्बर',
  '10': 'अक्टूबर',
  '11': 'नवम्बर',
  '12': 'दिसम्बर',
};

/**
 * Formats currency in Indian Rupee representation.
 */
export function formatRupees(amount) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Builds the share-ready text summary for an individual monthly statement.
 */
export function buildWhatsAppStatementText({
  labourerName,
  labourerId,
  yearMonth, // '2026-11'
  workingDays = 0,
  totalWeightProcessedKg = 0,
  totalWeightKg = 0,
  totalLabourEarned = 0,
  totalAmountPaid = 0,
  totalAllocatedServiceExpenses = 0,
  totalAllocatedFoodExpenses = 0,
  totalOtherAllocatedExpenses = 0,
  contractorBorneExpenses = 0,
  remainingBalance = 0,
  contractorName = 'शुभ लाभ लेबर कांट्रेक्टर',
}) {
  const [year, month] = (yearMonth || '2026-11').split('-');
  const hindiMonth = HINDI_MONTHS[month] || month;

  const isDuesPending = remainingBalance > 0;
  const isAdvance = remainingBalance < 0;
  const balanceEmoji = isDuesPending ? '🟢' : isAdvance ? '🔴' : '⚪';
  const balanceLabel = isDuesPending
    ? 'देय शेष राशि (Payable)'
    : isAdvance
    ? 'अग्रिम राशि / कांट्रेक्टर बकाया'
    : 'हिसाब चुकता / शून्य';

  const weightStr = totalWeightProcessedKg > 0
    ? `${Number(totalWeightProcessedKg).toLocaleString('en-IN')} kg`
    : totalWeightKg
    ? `${totalWeightKg} kg`
    : null;

  return `📋 *लेबर मासिक हिसाब पर्ची — LabourHisaab*
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 मज़दूर का नाम: *${labourerName}*
🆔 लेबर कोड: ${labourerId || 'LH_LAB'}
📅 महीना: *${hindiMonth} ${year}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
👷 कुल कार्य दिवस: *${workingDays} दिन*${weightStr ? `\n⚖️ कुल वजन: *${weightStr}*` : ''}
💰 कुल मजदूरी कमाई: *${formatRupees(totalLabourEarned)}*
💵 दिया गया भुगतान: *${formatRupees(totalAmountPaid)}*
${totalAllocatedFoodExpenses > 0 ? `🍲 खाना/भोजन कटौती: *${formatRupees(totalAllocatedFoodExpenses)}*\n` : ''}${totalOtherAllocatedExpenses > 0 ? `☕ अन्य सेवा कटौती: *${formatRupees(totalOtherAllocatedExpenses)}*\n` : ''}${totalAllocatedFoodExpenses === 0 && totalOtherAllocatedExpenses === 0 && totalAllocatedServiceExpenses > 0 ? `☕ सेवा खर्च कटौती: *${formatRupees(totalAllocatedServiceExpenses)}*\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━
${balanceEmoji} *${balanceLabel}: ${formatRupees(remainingBalance)}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
${contractorBorneExpenses > 0 ? `ℹ️ ठेकेदार वहन खर्च: ${formatRupees(contractorBorneExpenses)} (मजदूर से नहीं काटा गया)\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` : ''}✍️ ठेकेदार: *${contractorName}*
📲 *LabourHisaab App* द्वारा तैयार किया गया हिसाब।
कृपया पर्ची देखकर पुष्टि करें। 🙏`;
}

/**
 * Builds the share-ready text summary for an individual daily statement.
 */
export function buildWhatsAppDailyStatementText({
  labourerName,
  date,
  workDetails = '',
  earned = 0,
  paid = 0,
  deductions = 0,
  remainingBalance = 0,
  contractorName = 'शुभ लाभ लेबर कांट्रेक्टर',
}) {
  return `📋 *दैनिक लेबर हिसाब पर्ची — LabourHisaab*
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 मज़दूर: *${labourerName}*
📅 तारीख: *${date}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
${workDetails ? `📦 कार्य: ${workDetails}\n` : ''}💰 आज की कमाई: *${formatRupees(earned)}*
💵 आज मिला भुगतान: *${formatRupees(paid)}*
☕ सेवा खर्च कटौती: *${formatRupees(deductions)}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ *दैनिक शेष (Balance): ${formatRupees(remainingBalance)}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
✍️ ठेकेदार: *${contractorName}*`;
}

/**
 * Builds the share-ready text summary for a consolidated monthly report across all labourers.
 */
export function buildWhatsAppConsolidatedSummaryText({
  periodLabel,
  totalLabourers = 6,
  totalWorkingDays = 26,
  totalWeightKg = 0,
  totalLabourEarned = 0,
  totalPaymentsMade = 0,
  totalServiceExpenses = 0,
  contractorExpenses = 0,
  allocatedDeductions = 0,
  remainingPayable = 0,
  labourersList = [],
  contractorName = 'शुभ लाभ लेबर कांट्रेक्टर',
}) {
  const labourersSummary = labourersList.map((lab, i) => {
    const isNeg = lab.remainingBalance < 0;
    const sign = isNeg ? '-' : '';
    const amt = Math.abs(lab.remainingBalance).toLocaleString('en-IN');
    return `${i + 1}. *${lab.labourerName}*: कमाई ₹${lab.totalLabourEarned?.toLocaleString('en-IN')} | शेष ${sign}₹${amt}`;
  }).join('\n');

  return `📊 *मासिक समरी रिपोर्ट (सभी मजदूर) — LabourHisaab*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 अवधि: *${periodLabel}*
👥 कुल कार्यरत मजदूर: *${totalLabourers}*
👷 कुल कार्य दिवस: *${totalWorkingDays} दिन*${totalWeightKg > 0 ? `\n⚖️ कुल वजन: *${Number(totalWeightKg).toLocaleString('en-IN')} kg*` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 कुल मजदूरी: *${formatRupees(totalLabourEarned)}*
💵 कुल भुगतान: *${formatRupees(totalPaymentsMade)}*
🍽️ कुल सेवा खर्च: *${formatRupees(totalServiceExpenses)}*
   • मजदूर कटौती: ${formatRupees(allocatedDeductions)}
   • ठेकेदार वहन: ${formatRupees(contractorExpenses)}
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ *कुल देय बकाया शेष: ${formatRupees(remainingPayable)}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *मजदूर-वार विवरण:*
${labourersSummary || 'कोई प्रविष्टि नहीं'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
✍️ ठेकेदार: *${contractorName}*`;
}

/**
 * Builds the share-ready text summary for an individual monthly settlement statement (LH-SETTLEMENT-01).
 * Includes Opening Balance, Current Month Earnings, Payments Made, Deductions, and Closing Balance.
 */
export function buildWhatsAppSettlementStatementText({
  labourerName,
  labourerId,
  yearMonth = '2026-10',
  workingDays = 0,
  openingBalance = 0,
  currentEarnings = 0,
  paymentsMade = 0,
  allocatedDeductions = 0,
  closingBalance = 0,
  status = 'Closed',
  contractorName = 'शुभ लाभ लेबर कांट्रेक्टर',
}) {
  const [year, month] = (yearMonth || '2026-10').split('-');
  const hindiMonth = HINDI_MONTHS[month] || month;

  const isDuesPending = closingBalance > 0;
  const isAdvance = closingBalance < 0;
  const balanceEmoji = isDuesPending ? '🟢' : isAdvance ? '🔴' : '⚪';
  const balanceLabel = isDuesPending
    ? 'ठेकेदार द्वारा देय बकाया (Payable)'
    : isAdvance
    ? 'मजदूर पर अग्रिम / पेशगी (Advance Balance)'
    : 'खाता पूर्ण चुकता (Settled / Nil)';

  const statusLabel = {
    Open: 'खुला (Open)',
    Reviewed: 'समीक्षित (Reviewed)',
    'Partially Settled': 'आंशिक चुकता (Partially Settled)',
    Settled: 'पूर्ण चुकता (Settled)',
    Closed: 'खाता क्लोज्ड (Closed)',
  }[status] || status;

  return `🤝 *मासिक सेटलमेंट हिसाब पर्ची — LabourHisaab*
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 मज़दूर का नाम: *${labourerName}*
🆔 लेबर कोड: ${labourerId || 'LH_LAB'}
📅 सेटलमेंट माह: *${hindiMonth} ${year}*
📌 स्थिति: *${statusLabel}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
⏮️ प्रारंभिक शेष (Opening Balance): *${formatRupees(openingBalance)}*
👷 चालू माह कार्य दिवस: *${workingDays} दिन*
💰 चालू माह कमाई (Earnings): *+ ${formatRupees(currentEarnings)}*
💵 दिया गया भुगतान (Paid): *- ${formatRupees(paymentsMade)}*
🍽️ सेवा खर्च कटौती (Deductions): *- ${formatRupees(allocatedDeductions)}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
${balanceEmoji} *अंतिम शेष (Closing Balance): ${formatRupees(closingBalance)}*
ℹ️ स्थिति: *${balanceLabel}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
(नोट: यह अंतिम शेष अगले माह के प्रारंभिक शेष में अग्रेषित होगा।)
✍️ ठेकेदार: *${contractorName}*
📲 *LabourHisaab App* द्वारा प्रमाणित।`;
}

/**
 * Builds share-ready text summary for all labourers monthly settlement summary.
 */
export function buildWhatsAppSettlementSummaryText({
  yearMonth = '2026-10',
  status = 'Closed',
  totalLabourers = 6,
  totalOpeningBalance = 0,
  totalEarnings = 0,
  totalPaid = 0,
  totalDeductions = 0,
  totalClosingBalance = 0,
  totalPayableRemaining = 0,
  totalAdvanceOutstanding = 0,
  items = [],
  contractorName = 'शुभ लाभ लेबर कांट्रेक्टर',
}) {
  const [year, month] = (yearMonth || '2026-10').split('-');
  const hindiMonth = HINDI_MONTHS[month] || month;

  const itemsList = items.map((item, idx) => {
    const isNeg = item.closingBalance < 0;
    const sign = isNeg ? '-' : '';
    const amt = Math.abs(item.closingBalance).toLocaleString('en-IN');
    const badge = item.closingBalance > 0 ? 'देय' : item.closingBalance < 0 ? 'अग्रिम' : 'शून्य';
    return `${idx + 1}. *${item.labourerName}*: प्रा. ${formatRupees(item.openingBalance)} | कमाई ${formatRupees(item.currentEarnings)} | अंत: ${sign}₹${amt} (${badge})`;
  }).join('\n');

  return `🤝 *मासिक सेटलमेंट एवं खाता क्लोजिंग समरी — LabourHisaab*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 माह: *${hindiMonth} ${year}*
📌 खाता स्थिति: *${status}*
👥 कुल मजदूर: *${totalLabourers}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
⏮️ कुल प्रारंभिक शेष: *${formatRupees(totalOpeningBalance)}*
💰 कुल चालू कमाई: *+ ${formatRupees(totalEarnings)}*
💵 कुल भुगतान: *- ${formatRupees(totalPaid)}*
🍽️ कुल कटौती: *- ${formatRupees(totalDeductions)}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ कुल अंतिम शेष: *${formatRupees(totalClosingBalance)}*
🟢 ठेकेदार कुल देय बकाया: *${formatRupees(totalPayableRemaining)}*
🔴 मजदूर कुल अग्रिम बकाया: *${formatRupees(totalAdvanceOutstanding)}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *मजदूर-वार सेटलमेंट विवरण:*
${itemsList || 'कोई प्रविष्टि नहीं'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
✍️ ठेकेदार: *${contractorName}*`;
}

/**
 * Triggers native share for contractor review.
 */
export async function shareStatementOnWhatsApp(statementData, contractorName) {
  const messageText = buildWhatsAppStatementText({
    ...statementData,
    contractorName,
  });

  try {
    // Primary mechanism: Native Share sheet
    if (NativeShare && typeof NativeShare.share === 'function') {
      const result = await NativeShare.share({
        message: messageText,
        title: `लेबर हिसाब पर्ची - ${statementData.labourerName}`,
      });
      return { success: true, method: 'native_share', result };
    }

    // Fallback: Direct WhatsApp URL
    if (NativeLinking && typeof NativeLinking.openURL === 'function') {
      const encoded = encodeURIComponent(messageText);
      const phone = statementData.labourerPhone ? statementData.labourerPhone.replace(/\D/g, '') : '';
      const whatsappUrl = phone
        ? `whatsapp://send?phone=91${phone}&text=${encoded}`
        : `whatsapp://send?text=${encoded}`;

      const canOpen = await NativeLinking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await NativeLinking.openURL(whatsappUrl);
        return { success: true, method: 'whatsapp_url' };
      } else {
        const webUrl = phone
          ? `https://wa.me/91${phone}?text=${encoded}`
          : `https://wa.me/?text=${encoded}`;
        await NativeLinking.openURL(webUrl);
        return { success: true, method: 'whatsapp_web' };
      }
    }

    return { success: true, method: 'preview_only', text: messageText };
  } catch (error) {
    console.error('Error sharing to WhatsApp:', error);
    return { success: false, error: error.message };
  }
}
