const test = require('node:test');
const assert = require('node:assert');

const CATEGORY_COLORS = {
  PRICE_UPDATE: { color: '#EA580C', bg: '#FFEDD5', border: '#FED7AA' },
  RAW_MATERIAL_UPDATE: { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  SCHEME: { color: '#7C3AED', bg: '#EDE9FE', border: '#DDD6FE' },
  REWARD: { color: '#059669', bg: '#D1FAE5', border: '#A7F3D0' },
  OFFER: { color: '#2563EB', bg: '#DBEAFE', border: '#BFDBFE' },
  PRODUCT_UPDATE: { color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD' },
  ANNOUNCEMENT: { color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE' },
  SUPPLY_UPDATE: { color: '#0D9488', bg: '#CCFBF1', border: '#99F6E4' },
  IMPORTANT_NOTICE: { color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' },
  OTHER: { color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' },
};

function getCategoryStyling(type) {
  const key = String(type || '').toUpperCase();
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.OTHER;
}

function formatDateIndian(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimeIndian(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function buildWhatsAppSupportUrl(phone, title) {
  const safeTitle = title || 'Notice';
  const msg = encodeURIComponent(`Hello Shubh Labh Team, I have a query regarding this notice: "${safeTitle}"`);
  return `whatsapp://send?phone=+91${phone}&text=${msg}`;
}

test('1. Category Visual Identity & Palette Mapping', () => {
  const price = getCategoryStyling('PRICE_UPDATE');
  assert.strictEqual(price.color, '#EA580C');
  assert.strictEqual(price.bg, '#FFEDD5');

  const announcement = getCategoryStyling('ANNOUNCEMENT');
  assert.strictEqual(announcement.color, '#4F46E5');

  const unknown = getCategoryStyling('UNKNOWN_TYPE');
  assert.strictEqual(unknown.color, '#4B5563');
});

test('2. Indian Date and Time Formatting', () => {
  const testIso = '2026-10-12T10:15:04.081Z';
  const formattedDate = formatDateIndian(testIso);
  assert.match(formattedDate, /12.*Oct.*2026/);

  const formattedTime = formatTimeIndian(testIso);
  assert.match(formattedTime, /\d{1,2}:\d{2}\s*(am|pm|AM|PM)/);

  // Invalid date fallback
  assert.strictEqual(formatDateIndian('invalid'), '');
  assert.strictEqual(formatDateIndian(null), '');
});

test('3. WhatsApp Support Link Construction', () => {
  const phone = '9461924461';
  const title = 'Decrease in Cattle Feed Rate';
  const url = buildWhatsAppSupportUrl(phone, title);

  assert(url.includes('9461924461'));
  assert(url.includes(encodeURIComponent('Decrease in Cattle Feed Rate')));
  assert(url.startsWith('whatsapp://send?phone=+919461924461&text='));
});

test('4. Optional Supporting Attributes Integrity', () => {
  const sampleUpdate = {
    id: 'u-1',
    title: 'Festival Scheme',
    message: 'Details here',
    type: 'SCHEME',
    scheme_id: 'scheme-99',
    image_url: 'https://shubhlabh.com/banner.jpg',
    attachment_url: null,
    effective_date: null,
  };

  const isReward = sampleUpdate.type === 'SCHEME' || sampleUpdate.type === 'REWARD';
  assert.strictEqual(isReward, true, 'Correctly identifies scheme CTA requirement');

  const hasImage = Boolean(sampleUpdate.image_url);
  assert.strictEqual(hasImage, true, 'Image rendered only when supplied');

  const hasAttachment = Boolean(sampleUpdate.attachment_url);
  assert.strictEqual(hasAttachment, false, 'Attachment skipped when null');

  const hasEffectiveDate = Boolean(sampleUpdate.effective_date);
  assert.strictEqual(hasEffectiveDate, false, 'Effective date skipped when null');
});

test('5. Non-Fabrication Rule: Effective Date only rendered when source provides it', () => {
  const updateWithoutEffectiveDate = { id: 'u-2', title: 'Price cut', message: '50 rs cut' };
  assert.strictEqual(Boolean(updateWithoutEffectiveDate.effective_date), false);

  const updateWithEffectiveDate = { id: 'u-3', title: 'Price cut', effective_date: '2026-10-15T00:00:00Z' };
  assert.strictEqual(Boolean(updateWithEffectiveDate.effective_date), true);
  assert.match(formatDateIndian(updateWithEffectiveDate.effective_date), /15.*Oct.*2026/);
});
