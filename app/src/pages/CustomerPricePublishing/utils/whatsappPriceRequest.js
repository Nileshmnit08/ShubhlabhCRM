/**
 * whatsappPriceRequest.js
 * 
 * Utility functions for generating, validating, and tracking WhatsApp price requests
 * from Customer Price Publishing to the Procurement Manager.
 */

export const PROCUREMENT_CONFIG_STORAGE_KEY = 'crm_procurement_whatsapp_config';
export const PRICE_REQUEST_HISTORY_STORAGE_KEY = 'crm_procurement_price_requests';

export const DEFAULT_PROCUREMENT_CONFIG = {
  managerName: 'Procurement Manager',
  phone: '',
  notes: ''
};

const HINDI_MONTHS = [
  'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितम्बर', 'अक्टूबर', 'नवम्बर', 'दिसम्बर'
];

/**
 * Normalizes Indian phone numbers: strips non-digits, handles leading 91 or 0.
 * Returns 10-digit number for valid Indian mobile, or empty string if invalid.
 */
export function normalizeIndianPhone(rawPhone) {
  if (!rawPhone) return '';
  const cleaned = rawPhone.toString().replace(/[^0-9]/g, '');
  if (cleaned.length === 10) return cleaned;
  if (cleaned.length > 10 && cleaned.startsWith('91')) {
    const without91 = cleaned.substring(2);
    if (without91.length === 10) return without91;
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    const without0 = cleaned.substring(1);
    if (without0.length === 10) return without0;
  }
  return cleaned;
}

/**
 * Validates whether a phone number is an operable 10-digit Indian phone.
 */
export function isValidIndianPhone(phone) {
  const normalized = normalizeIndianPhone(phone);
  return Boolean(normalized && normalized.length === 10 && /^[6-9]\d{9}$/.test(normalized));
}

/**
 * Returns current date formatted in Indian Standard Time (Asia/Kolkata).
 * e.g., "21 नवम्बर 2026"
 */
export function getIndiaDateFormatted(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    const parts = formatter.formatToParts(date);
    const day = parts.find(p => p.type === 'day')?.value || '1';
    const monthVal = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10);
    const year = parts.find(p => p.type === 'year')?.value || '2026';
    const monthName = HINDI_MONTHS[monthVal - 1] || 'जनवरी';
    return `${day} ${monthName} ${year}`;
  } catch (err) {
    const d = new Date(date);
    return `${d.getDate()} ${HINDI_MONTHS[d.getMonth()] || 'जनवरी'} ${d.getFullYear()}`;
  }
}

/**
 * Generates a unique, human-readable Request Reference ID.
 * e.g., "PR-20261121-7A3B"
 */
export function generatePriceRequestId(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value || '2026';
    const month = parts.find(p => p.type === 'month')?.value || '11';
    const day = parts.find(p => p.type === 'day')?.value || '21';
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PR-${year}${month}${day}-${randomSuffix}`;
  } catch {
    const d = new Date(date);
    const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PR-${ymd}-${randomSuffix}`;
  }
}

/**
 * Formats a currency value with commas in Indian formatting.
 */
export function formatINRValue(val) {
  if (val === null || val === undefined || val === '' || isNaN(val)) return null;
  const num = Number(val);
  return '₹' + num.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: num % 1 === 0 ? 0 : 2
  });
}

/**
 * Generates the official WhatsApp price request message formatted per specifications.
 */
export function buildPriceRequestMessage({
  dateStr = getIndiaDateFormatted(),
  requestId = generatePriceRequestId(),
  selectedCommodities = [],
  managerName = 'Procurement Manager'
} = {}) {
  const commodityListText = selectedCommodities.map((item, index) => {
    const hindiName = item.name_hi || item.name_en;
    const englishName = item.name_en && item.name_en !== hindiName ? ` (${item.name_en})` : '';
    const formattedPrice = formatINRValue(item.savedPrice);
    const unitText = item.savedUnit || 'Quintal';
    const refText = formattedPrice ? ` [पिछला भाव: ${formattedPrice} / ${unitText}]` : ' [पिछला भाव: उपलब्ध नहीं]';
    return `${index + 1}. ${hindiName}${englishName}${refText}`;
  }).join('\n');

  return `नमस्कार,

कृपया आज की तारीख के अनुसार नीचे दी गई कमोडिटीज़ के ताज़ा बाजार भाव संबंधित Brokers से कन्फर्म करके साझा करें।

अनुरोध संदर्भ: #${requestId}
तारीख: ${dateStr}

चयनित कमोडिटीज़ (${selectedCommodities.length}):
${commodityListText}

प्रत्येक कमोडिटी के लिए कृपया निम्न जानकारी दें:

1. आज का वास्तविक खरीद भाव।
2. यूनिट (₹/किलो या ₹/क्विंटल)।
3. मंडी / लोकेशन।
4. क्वालिटी एवं उपलब्धता।
5. Broker का नाम / संपर्क।

कृपया पुराने भाव के बजाय आज का कन्फर्म रेट साझा करें, ताकि हम Customer Price Publishing अपडेट कर सकें।

धन्यवाद।

Shubh Labh – Procurement Team`;
}

/**
 * Builds standard WhatsApp click-to-chat links with mobile and web fallback.
 */
export function buildWhatsAppLink(rawPhone, message) {
  const cleanPhone = normalizeIndianPhone(rawPhone);
  const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const encodedText = encodeURIComponent(message);
  return {
    phone: fullPhone,
    url: `https://wa.me/${fullPhone}?text=${encodedText}`,
    webUrl: `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodedText}`
  };
}

/**
 * Loads configured Procurement WhatsApp contact from localStorage.
 */
export function loadProcurementConfig() {
  try {
    const raw = localStorage.getItem(PROCUREMENT_CONFIG_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_PROCUREMENT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Failed to load procurement config:', err);
  }
  return DEFAULT_PROCUREMENT_CONFIG;
}

/**
 * Saves configured Procurement WhatsApp contact to localStorage.
 */
export function saveProcurementConfig(config) {
  try {
    localStorage.setItem(PROCUREMENT_CONFIG_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (err) {
    console.error('Failed to save procurement config:', err);
    return false;
  }
}

/**
 * Loads recent price requests history from localStorage.
 */
export function loadPriceRequestHistory() {
  try {
    const raw = localStorage.getItem(PRICE_REQUEST_HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.warn('Failed to load price request history:', err);
  }
  return [];
}

/**
 * Saves a new price request record to tracking history (capped at latest 50).
 */
export function recordPriceRequest(record) {
  try {
    const history = loadPriceRequestHistory();
    const updated = [record, ...history].slice(0, 50);
    localStorage.setItem(PRICE_REQUEST_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save price request record:', err);
    return [];
  }
}

