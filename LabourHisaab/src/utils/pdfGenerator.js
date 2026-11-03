// PDF Generator & Formatter for LabourHisaab
// Implements LH-REPORTS-01: HTML-to-PDF print layout and native mobile sharing
// Supports Individual Labourer Statement and Consolidated Monthly/Weekly/Daily Reports

import { formatRupees } from './shareWhatsApp.js';

let NativeShare = null;
// Plain require, not top-level await (unsupported by Hermes release bundles).
try {
  const rn = require('react-native');
  NativeShare = rn.Share;
} catch (e) {
  // Running in Node / Test runner
}

/**
 * Common Print CSS Styles for professional invoice/ledger appearance
 */
const PDF_CSS = `
  @page {
    size: A4;
    margin: 15mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", Arial, sans-serif;
    color: #1E293B;
    background: #FFFFFF;
    margin: 0;
    padding: 24px;
    font-size: 13px;
    line-height: 1.5;
  }
  .pdf-container {
    max-width: 800px;
    margin: 0 auto;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 24px;
    background: #FFFFFF;
  }
  .pdf-header {
    border-bottom: 2px solid #F57C00;
    padding-bottom: 16px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .brand-badge {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .wheat-logo {
    width: 48px;
    height: 48px;
    border-radius: 24px;
    background: #FFF7ED;
    border: 2px solid #F57C00;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }
  .brand-title {
    font-size: 22px;
    font-weight: 800;
    color: #F57C00;
    margin: 0;
  }
  .brand-subtitle {
    font-size: 12px;
    color: #64748B;
    margin: 2px 0 0 0;
  }
  .doc-title-block {
    text-align: right;
  }
  .doc-title {
    font-size: 18px;
    font-weight: 800;
    color: #1E293B;
    margin: 0;
  }
  .doc-meta {
    font-size: 12px;
    color: #64748B;
    margin-top: 4px;
  }
  .meta-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 20px;
  }
  .meta-item-label {
    font-size: 11px;
    color: #64748B;
    font-weight: 600;
    text-transform: uppercase;
  }
  .meta-item-val {
    font-size: 14px;
    font-weight: 700;
    color: #0F172A;
    margin-top: 2px;
  }
  .kpi-cards-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 20px;
  }
  .kpi-card {
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
    border-radius: 6px;
    padding: 10px;
    text-align: center;
  }
  .kpi-label {
    font-size: 11px;
    color: #166534;
    font-weight: 600;
  }
  .kpi-val {
    font-size: 16px;
    font-weight: 800;
    color: #15803D;
    margin-top: 4px;
  }
  .table-title {
    font-size: 14px;
    font-weight: 700;
    color: #334155;
    margin: 16px 0 8px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
  }
  th {
    background: #F1F5F9;
    color: #475569;
    font-size: 11px;
    font-weight: 700;
    text-align: left;
    padding: 8px 12px;
    border-bottom: 1px solid #CBD5E1;
  }
  td {
    padding: 8px 12px;
    border-bottom: 1px solid #F1F5F9;
    font-size: 12px;
  }
  tr:nth-child(even) td {
    background: #FAFAFA;
  }
  .text-right {
    text-align: right;
  }
  .text-center {
    text-align: center;
  }
  .total-row td {
    font-weight: 800;
    background: #E8F5EC !important;
    border-top: 2px solid #137A38;
    color: #065F46;
  }
  .balance-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #FFF7ED;
    border: 1.5px solid #FDBA74;
    border-radius: 6px;
    padding: 12px 16px;
    margin-top: 16px;
    margin-bottom: 24px;
  }
  .balance-negative {
    background: #FEF2F2;
    border-color: #FCA5A5;
  }
  .balance-positive {
    background: #F0FDF4;
    border-color: #86EFAC;
  }
  .balance-title {
    font-size: 14px;
    font-weight: 800;
  }
  .balance-amount {
    font-size: 20px;
    font-weight: 900;
  }
  .signatures-row {
    display: flex;
    justify-content: space-between;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px dashed #CBD5E1;
  }
  .sig-box {
    text-align: center;
    width: 200px;
  }
  .sig-line {
    border-top: 1px solid #64748B;
    margin-top: 40px;
    padding-top: 6px;
    font-size: 11px;
    font-weight: 600;
    color: #475569;
  }
  .footer-note {
    font-size: 10px;
    color: #94A3B8;
    text-align: center;
    margin-top: 20px;
  }
`;

/**
 * Generates printable HTML document for an Individual Labourer Statement
 */
export function generateIndividualStatementHtml(statement, contractorName = 'शुभ लाभ लेबर कांट्रेक्टर') {
  const isNegative = statement.remainingBalance < 0;
  const balanceClass = isNegative ? 'balance-negative' : 'balance-positive';
  const balanceColor = isNegative ? '#DC2626' : '#15803D';
  const balanceLabel = isNegative ? 'अग्रिम राशि / कांट्रेक्टर बकाया' : 'कुल देय बकाया राशि (Payable)';
  const balanceFormatted = isNegative
    ? `- ₹${Math.abs(statement.remainingBalance).toLocaleString('en-IN')}`
    : `₹${statement.remainingBalance.toLocaleString('en-IN')}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>लेबर हिसाब पर्ची - ${statement.labourerName}</title>
  <style>${PDF_CSS}</style>
</head>
<body>
  <div class="pdf-container">
    <!-- Header -->
    <div class="pdf-header">
      <div class="brand-badge">
        <div class="wheat-logo">🌾</div>
        <div>
          <h1 class="brand-title">शुभ लाभ लेबर हिसाब</h1>
          <p class="brand-subtitle">${contractorName} • Labour Management</p>
        </div>
      </div>
      <div class="doc-title-block">
        <h2 class="doc-title">मासिक हिसाब पर्ची</h2>
        <div class="doc-meta">पर्ची दिनांक: ${new Date().toLocaleDateString('hi-IN')}</div>
      </div>
    </div>

    <!-- Meta Strip -->
    <div class="meta-strip">
      <div>
        <div class="meta-item-label">मजदूर का नाम</div>
        <div class="meta-item-val">${statement.labourerName}</div>
      </div>
      <div>
        <div class="meta-item-label">मजदूर कोड / ID</div>
        <div class="meta-item-val">${statement.labourerId}</div>
      </div>
      <div>
        <div class="meta-item-label">हिसाब अवधि (Month)</div>
        <div class="meta-item-val">${statement.yearMonth || 'अक्टूबर 2026'}</div>
      </div>
      <div>
        <div class="meta-item-label">कुल कार्य दिवस</div>
        <div class="meta-item-val">${statement.workingDays} दिन</div>
      </div>
      <div>
        <div class="meta-item-label">कुल प्रसंस्कृत वजन</div>
        <div class="meta-item-val">${statement.totalWeightProcessedKg ? statement.totalWeightProcessedKg.toLocaleString('en-IN') + ' kg' : (statement.totalWeightKg || '1,25,000 kg')}</div>
      </div>
    </div>

    <!-- Summary Statement Table -->
    <div class="table-title">वित्तीय हिसाब विवरण (Financial Statement)</div>
    <table>
      <thead>
        <tr>
          <th>विवरण (Description)</th>
          <th class="text-center">संदर्भ / मात्रा</th>
          <th class="text-right">राशि (Amount)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>कुल मजदूरी कमाई (Labour Earned)</strong></td>
          <td class="text-center">${statement.workingDays} दिन कार्य</td>
          <td class="text-right" style="color: #15803D; font-weight: 700;">+ ${formatRupees(statement.totalLabourEarned)}</td>
        </tr>
        <tr>
          <td>दिया गया नकद भुगतान (Cash Paid)</td>
          <td class="text-center">माह का भुगतान</td>
          <td class="text-right" style="color: #2563EB;">- ${formatRupees(statement.totalAmountPaid)}</td>
        </tr>
        <tr>
          <td>खाना / भोजन कटौती (Food / Meals)</td>
          <td class="text-center">मेस कटौती</td>
          <td class="text-right" style="color: #D97706;">- ${formatRupees(statement.totalAllocatedFoodExpenses || statement.foodExpense || 0)}</td>
        </tr>
        <tr>
          <td>अन्य सेवा / आवागमन खर्च कटौती</td>
          <td class="text-center">वाहन / सुविधा</td>
          <td class="text-right" style="color: #D97706;">- ${formatRupees(statement.totalOtherAllocatedExpenses || statement.transportExpense || 0)}</td>
        </tr>
        ${statement.contractorBorneExpenses > 0 ? `
        <tr style="background: #F8FAFC; color: #64748B;">
          <td><em>ठेकेदार वहन खर्च (Contractor Borne Expense)</em></td>
          <td class="text-center">मजदूर से नहीं काटा गया</td>
          <td class="text-right" style="color: #64748B;"><em>[${formatRupees(statement.contractorBorneExpenses)}]</em></td>
        </tr>` : ''}
      </tbody>
    </table>

    <!-- Final Balance Banner -->
    <div class="balance-banner ${balanceClass}">
      <div>
        <div class="balance-title" style="color: ${balanceColor};">${balanceLabel}</div>
        <div style="font-size: 11px; color: #64748B; margin-top: 2px;">कमाई − भुगतान − सेवा कटौती</div>
      </div>
      <div class="balance-amount" style="color: ${balanceColor};">${balanceFormatted}</div>
    </div>

    <!-- Signatures -->
    <div class="signatures-row">
      <div class="sig-box">
        <div class="sig-line">मजदूर के हस्ताक्षर / अंगूठा</div>
      </div>
      <div class="sig-box">
        <div class="sig-line">ठेकेदार के हस्ताक्षर (${contractorName})</div>
      </div>
    </div>

    <div class="footer-note">
      यह हिसाब पर्ची LabourHisaab एप्लिकेशन द्वारा जनरेट की गई है। किसी भी विसंगति की स्थिति में तुरंत ठेकेदार से संपर्क करें।
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates printable HTML document for Consolidated Monthly/Period Report
 */
export function generateConsolidatedReportHtml(reportData, contractorName = 'शुभ लाभ लेबर कांट्रेक्टर') {
  const isNegative = reportData.remainingPayableBalance < 0;
  const balanceColor = isNegative ? '#DC2626' : '#15803D';
  const totalDeductions = Math.round(
    ((reportData.totalPaymentsMade || 0) + (reportData.totalAllocatedServiceExpenses || 0)) * 100
  ) / 100;

  const rows = (reportData.individualSummaries || []).map((lab, idx) => {
    const isNeg = lab.remainingBalance < 0;
    const rowDeductions = Math.round(((lab.totalAmountPaid || 0) + (lab.totalAllocatedServiceExpenses || 0)) * 100) / 100;
    const balColor = isNeg ? '#DC2626' : lab.remainingBalance === 0 ? '#1E293B' : '#15803D';
    const balStr = isNeg ? `- ₹${Math.abs(lab.remainingBalance).toLocaleString('en-IN')}` : `₹${lab.remainingBalance.toLocaleString('en-IN')}`;

    return `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td><strong>${lab.labourerName}</strong></td>
        <td class="text-center">${lab.workingDays || '-'}</td>
        <td class="text-right" style="color: #15803D; font-weight: 700;">₹${(lab.totalLabourEarned || 0).toLocaleString('en-IN')}</td>
        <td class="text-right" style="color: #2563EB;">₹${(lab.totalAmountPaid || 0).toLocaleString('en-IN')}</td>
        <td class="text-right" style="color: #D97706;">₹${(lab.totalAllocatedServiceExpenses || 0).toLocaleString('en-IN')}</td>
        <td class="text-right">₹${rowDeductions.toLocaleString('en-IN')}</td>
        <td class="text-right" style="font-weight: 800; color: ${balColor};">${balStr}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>मासिक लेबर समरी रिपोर्ट - ${reportData.periodLabel || reportData.yearMonth}</title>
  <style>${PDF_CSS}</style>
</head>
<body>
  <div class="pdf-container">
    <!-- Header -->
    <div class="pdf-header">
      <div class="brand-badge">
        <div class="wheat-logo">🌾</div>
        <div>
          <h1 class="brand-title">शुभ लाभ लेबर हिसाब</h1>
          <p class="brand-subtitle">${contractorName} • Consolidated Report</p>
        </div>
      </div>
      <div class="doc-title-block">
        <h2 class="doc-title">मासिक लेबर समरी</h2>
        <div class="doc-meta">अवधि: ${reportData.periodLabel || reportData.yearMonth || 'अक्टूबर 2026'}</div>
      </div>
    </div>

    <!-- 4 KPI Cards -->
    <div class="kpi-cards-row">
      <div class="kpi-card">
        <div class="kpi-label">कुल मजदूर</div>
        <div class="kpi-val">${reportData.individualSummaries?.length || 6}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">कुल कार्य दिवस</div>
        <div class="kpi-val">${reportData.totalWorkingDays || 26}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">कुल मजदूरी</div>
        <div class="kpi-val">₹${(reportData.totalLabourEarned || 0).toLocaleString('en-IN')}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">कुल सेवा खर्च</div>
        <div class="kpi-val">₹${((reportData.totalAllocatedServiceExpenses || 0) + (reportData.contractorBorneExpenses || 0)).toLocaleString('en-IN')}</div>
      </div>
    </div>

    <!-- Summary Table -->
    <div class="table-title">सभी मजदूरों का समेकित हिसाब (Consolidated Labour Ledger)</div>
    <table>
      <thead>
        <tr>
          <th class="text-center" style="width: 30px;">क्र.</th>
          <th>मजदूर का नाम</th>
          <th class="text-center" style="width: 50px;">दिन</th>
          <th class="text-right">कुल कमाई</th>
          <th class="text-right">भुगतान</th>
          <th class="text-right">सेवा कटौती</th>
          <th class="text-right">कुल कटौती</th>
          <th class="text-right">बकाया शेष</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="3"><strong>कुल योग (Total Reconciled)</strong></td>
          <td class="text-right">₹${(reportData.totalLabourEarned || 0).toLocaleString('en-IN')}</td>
          <td class="text-right">₹${(reportData.totalPaymentsMade || 0).toLocaleString('en-IN')}</td>
          <td class="text-right">₹${(reportData.totalAllocatedServiceExpenses || 0).toLocaleString('en-IN')}</td>
          <td class="text-right">₹${totalDeductions.toLocaleString('en-IN')}</td>
          <td class="text-right" style="color: ${balanceColor}; font-size: 13px;">₹${(reportData.remainingPayableBalance || 0).toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    <!-- Expense Allocation Transparency Box -->
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 14px; margin-top: 10px; font-size: 11px;">
      <strong>खर्च वर्गीकरण पारदर्शिता:</strong> कुल सेवा खर्च ₹${((reportData.totalAllocatedServiceExpenses || 0) + (reportData.contractorBorneExpenses || 0)).toLocaleString('en-IN')} में से ₹${(reportData.totalAllocatedServiceExpenses || 0).toLocaleString('en-IN')} मजदूरों के हिसाब से काटा गया है एवं ₹${(reportData.contractorBorneExpenses || 0).toLocaleString('en-IN')} ठेकेदार द्वारा स्वयं वहन किया गया है।
    </div>

    <!-- Signatures -->
    <div class="signatures-row">
      <div class="sig-box">
        <div class="sig-line">लेखापाल / मुंशी हस्ताक्षर</div>
      </div>
      <div class="sig-box">
        <div class="sig-line">ठेकेदार हस्ताक्षर (${contractorName})</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates printable HTML document for an Individual Monthly Settlement Statement (LH-SETTLEMENT-01)
 */
export function generateSettlementStatementHtml(item, settlementMeta = {}, contractorName = 'शुभ लाभ लेबर कांट्रेक्टर') {
  const isNegative = item.closingBalance < 0;
  const balanceClass = isNegative ? 'balance-negative' : 'balance-positive';
  const balanceColor = isNegative ? '#DC2626' : '#15803D';
  const balanceLabel = isNegative ? 'मजदूर पर अग्रिम शेष (Advance Carried Forward)' : 'ठेकेदार द्वारा कुल देय बकाया (Payable Remaining)';
  const balanceFormatted = isNegative
    ? `- ₹${Math.abs(item.closingBalance).toLocaleString('en-IN')}`
    : `₹${(item.closingBalance || 0).toLocaleString('en-IN')}`;

  const statusLabel = {
    Open: 'खुला (Open)',
    Reviewed: 'समीक्षित (Reviewed)',
    'Partially Settled': 'आंशिक चुकता (Partially Settled)',
    Settled: 'पूर्ण चुकता (Settled)',
    Closed: 'खाता क्लोज्ड (Closed)',
  }[item.status] || item.status || 'Settled';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>मासिक सेटलमेंट पर्ची - ${item.labourerName}</title>
  <style>${PDF_CSS}</style>
</head>
<body>
  <div class="pdf-container">
    <div class="pdf-header">
      <div class="brand-badge">
        <div class="wheat-logo">🌾</div>
        <div>
          <h1 class="brand-title">शुभ लाभ लेबर हिसाब</h1>
          <p class="brand-subtitle">${contractorName} • मासिक खाता सेटलमेंट</p>
        </div>
      </div>
      <div class="doc-title-block">
        <h2 class="doc-title">मासिक सेटलमेंट पर्ची</h2>
        <div class="doc-meta">माह: <strong>${item.yearMonth || '2026-10'}</strong> | स्थिति: <strong>${statusLabel}</strong></div>
      </div>
    </div>

    <div class="meta-strip">
      <div class="meta-item">
        <div class="meta-label">मजदूर का नाम</div>
        <div class="meta-value">${item.labourerName}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">लेबर कोड</div>
        <div class="meta-value">${item.labourerId || 'LH_LAB'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">कार्यरत दिवस</div>
        <div class="meta-value">${item.workingDays || 0} दिन</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">खाता स्थिति</div>
        <div class="meta-value" style="color: ${item.status === 'Closed' ? '#6B7280' : '#15803D'}; font-weight: 700;">${statusLabel}</div>
      </div>
    </div>

    <div class="table-title">मासिक सेटलमेंट गणना (Settlement Calculation)</div>
    <table>
      <thead>
        <tr>
          <th>विवरण</th>
          <th class="text-right">प्रकार</th>
          <th class="text-right">राशि (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>⏮️ प्रारंभिक शेष (Opening Balance - पिछले माह से अग्रेषित)</td>
          <td class="text-right" style="color: #64748B;">प्रारंभिक</td>
          <td class="text-right">₹${(item.openingBalance || 0).toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>💰 चालू माह कुल कमाई (Current Month Labour Earned)</td>
          <td class="text-right" style="color: #15803D;">+ जमा (Credit)</td>
          <td class="text-right" style="color: #15803D; font-weight: 600;">₹${(item.currentEarnings || 0).toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>💵 चालू माह दिया गया भुगतान (Payments Made)</td>
          <td class="text-right" style="color: #DC2626;">- नामे (Debit)</td>
          <td class="text-right" style="color: #DC2626;">₹${(item.paymentsMade || 0).toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>🍽️ सेवा खर्च कटौती (Allocated Service Deductions)</td>
          <td class="text-right" style="color: #DC2626;">- नामे (Debit)</td>
          <td class="text-right" style="color: #DC2626;">₹${(item.allocatedDeductions || 0).toLocaleString('en-IN')}</td>
        </tr>
        <tr class="total-row">
          <td><strong>अंतिम शेष राशि (Closing Balance = Opening + Earned − Paid − Deductions)</strong></td>
          <td class="text-right"><strong>शुद्ध शेष</strong></td>
          <td class="text-right" style="color: ${balanceColor}; font-size: 14px;"><strong>${balanceFormatted}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="balance-banner ${balanceClass}">
      <div>
        <div class="balance-title">${balanceLabel}</div>
        <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
          ${isNegative ? 'यह अग्रिम राशि अगले माह के प्रारंभिक शेष में नामे (-ve) की जाएगी।' : 'यह देय राशि ठेकेदार द्वारा मजदूर को चुकता की जानी है।'}
        </div>
      </div>
      <div class="balance-amount" style="color: ${balanceColor};">${balanceFormatted}</div>
    </div>

    ${settlementMeta.notes ? `
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 14px; font-size: 11px; margin-bottom: 20px;">
      <strong>टिप्पणी / क्लोजिंग नोट:</strong> ${settlementMeta.notes}
    </div>` : ''}

    <div class="signatures-row">
      <div class="sig-box">
        <div class="sig-line">मजदूर के हस्ताक्षर / अंगूठा</div>
      </div>
      <div class="sig-box">
        <div class="sig-line">ठेकेदार हस्ताक्षर (${contractorName})</div>
      </div>
    </div>

    <div class="footer-note">
      LabourHisaab Android System • यह एक कम्प्यूटरीकृत सेटलमेंट पर्ची है।
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates printable HTML document for Consolidated Monthly Settlement & Closing Ledger (LH-SETTLEMENT-01)
 */
export function generateConsolidatedSettlementHtml(settlementData, contractorName = 'शुभ लाभ लेबर कांट्रेक्टर') {
  const items = settlementData.items || [];
  const rows = items.map((item, idx) => {
    const isNeg = item.closingBalance < 0;
    const color = isNeg ? '#DC2626' : item.closingBalance > 0 ? '#15803D' : '#64748B';
    const sign = isNeg ? '-' : '';
    const formatted = `${sign}₹${Math.abs(item.closingBalance).toLocaleString('en-IN')}`;

    return `<tr>
      <td class="text-center">${idx + 1}</td>
      <td><strong>${item.labourerName}</strong></td>
      <td class="text-center">${item.workingDays || 0}</td>
      <td class="text-right">₹${(item.openingBalance || 0).toLocaleString('en-IN')}</td>
      <td class="text-right">₹${(item.currentEarnings || 0).toLocaleString('en-IN')}</td>
      <td class="text-right">₹${(item.paymentsMade || 0).toLocaleString('en-IN')}</td>
      <td class="text-right">₹${(item.allocatedDeductions || 0).toLocaleString('en-IN')}</td>
      <td class="text-right" style="color: ${color}; font-weight: 700;">${formatted}</td>
      <td class="text-center"><span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #F1F5F9;">${item.status}</span></td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>मासिक सेटलमेंट एवं क्लोजिंग लेजर - ${settlementData.yearMonth}</title>
  <style>${PDF_CSS}</style>
</head>
<body>
  <div class="pdf-container">
    <div class="pdf-header">
      <div class="brand-badge">
        <div class="wheat-logo">🌾</div>
        <div>
          <h1 class="brand-title">शुभ लाभ लेबर हिसाब</h1>
          <p class="brand-subtitle">${contractorName} • समेकित सेटलमेंट लेजर</p>
        </div>
      </div>
      <div class="doc-title-block">
        <h2 class="doc-title">मासिक खाता क्लोजिंग लेजर</h2>
        <div class="doc-meta">माह: <strong>${settlementData.yearMonth}</strong> | स्थिति: <strong>${settlementData.status}</strong></div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">कुल मजदूर</div>
        <div class="kpi-val">${settlementData.totalLabourers || items.length}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">कुल कमाई</div>
        <div class="kpi-val" style="color: #15803D;">₹${(settlementData.totalEarnings || 0).toLocaleString('en-IN')}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">कुल भुगतान</div>
        <div class="kpi-val">₹${(settlementData.totalPaid || 0).toLocaleString('en-IN')}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">कुल कटौती</div>
        <div class="kpi-val">₹${(settlementData.totalDeductions || 0).toLocaleString('en-IN')}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">ठेकेदार देय बकाया</div>
        <div class="kpi-val" style="color: #15803D;">₹${(settlementData.totalPayableRemaining || 0).toLocaleString('en-IN')}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">अग्रिम बकाया (Advance)</div>
        <div class="kpi-val" style="color: #DC2626;">₹${(settlementData.totalAdvanceOutstanding || 0).toLocaleString('en-IN')}</div>
      </div>
    </div>

    <div class="table-title">समस्त मजदूरों का मासिक सेटलमेंट विवरण (Consolidated Reconciled Ledger)</div>
    <table>
      <thead>
        <tr>
          <th class="text-center" style="width: 25px;">क्र.</th>
          <th>मजदूर</th>
          <th class="text-center" style="width: 40px;">दिन</th>
          <th class="text-right">प्रारंभिक शेष</th>
          <th class="text-right">चालू कमाई</th>
          <th class="text-right">भुगतान</th>
          <th class="text-right">कटौती</th>
          <th class="text-right">अंतिम शेष</th>
          <th class="text-center" style="width: 60px;">स्थिति</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="3"><strong>कुल योग (Total)</strong></td>
          <td class="text-right">₹${(settlementData.totalOpeningBalance || 0).toLocaleString('en-IN')}</td>
          <td class="text-right">₹${(settlementData.totalEarnings || 0).toLocaleString('en-IN')}</td>
          <td class="text-right">₹${(settlementData.totalPaid || 0).toLocaleString('en-IN')}</td>
          <td class="text-right">₹${(settlementData.totalDeductions || 0).toLocaleString('en-IN')}</td>
          <td class="text-right">₹${(settlementData.totalClosingBalance || 0).toLocaleString('en-IN')}</td>
          <td class="text-center"><strong>${settlementData.status}</strong></td>
        </tr>
      </tbody>
    </table>

    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 14px; margin-top: 10px; font-size: 11px;">
      <strong>सेटलमेंट नीति एवं सुरक्षा:</strong>
      Closing Balance = Opening Balance + Earnings − Payments − Deductions।
      माह क्लोज होने पर अंतिम शेष अगले माह के प्रारंभिक शेष में बिना पुनः गणना के अग्रेषित होता है।
      ठेकेदार वहन खर्च (₹${(settlementData.contractorExpenses || 0).toLocaleString('en-IN')}) किसी मजदूर से नहीं काटा गया है।
    </div>

    <div class="signatures-row">
      <div class="sig-box">
        <div class="sig-line">लेखापाल / मुंशी हस्ताक्षर</div>
      </div>
      <div class="sig-box">
        <div class="sig-line">ठेकेदार हस्ताक्षर (${contractorName})</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Native Share handler for PDF document content
 */
export async function sharePdfDocument(title, htmlContent, summaryText) {
  try {
    if (NativeShare && typeof NativeShare.share === 'function') {
      const result = await NativeShare.share({
        title,
        message: summaryText,
      });
      return { success: true, result };
    }
    return { success: true, method: 'preview_only' };
  } catch (err) {
    console.error('Error sharing PDF document:', err);
    return { success: false, error: err.message };
  }
}

