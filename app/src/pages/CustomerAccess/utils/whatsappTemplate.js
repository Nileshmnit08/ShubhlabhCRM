/**
 * WhatsApp Invitation Template Generator for Customer App Access
 * Formats an inviting, clear Hindi message with app credentials and official download link.
 */

export const DEFAULT_RELEASE_CONFIG = {
  downloadUrl: 'https://www.shubhlabhfeeds.in/order-app',
  appVersion: 'v1.0.0',
  releaseDate: '2026-10-12',
  isActive: true,
};

export const RELEASE_CONFIG_STORAGE_KEY = 'crm_customer_app_release_config';

export function getStoredReleaseConfig() {
  try {
    const raw = localStorage.getItem(RELEASE_CONFIG_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_RELEASE_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to parse stored release config:', e);
  }
  return DEFAULT_RELEASE_CONFIG;
}

export function saveStoredReleaseConfig(config) {
  try {
    localStorage.setItem(RELEASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save release config to localStorage:', e);
  }
}

/**
 * Normalizes an Indian phone number to 10-digit format, removing spaces, dashes, +91 etc.
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
 * Builds the Hindi WhatsApp message.
 */
export function buildHindiInviteMessage({
  customerName = '',
  loginId = '',
  temporaryPassword = '',
  downloadUrl = '',
  appVersion = '',
  isPasswordReset = false,
}) {
  const safeName = customerName || 'ग्राहक';
  const headerAction = isPasswordReset ? 'पासवर्ड रीसेट क्रेडेंशियल्स' : 'Shubh Labh Order App में आपका स्वागत है!';
  const finalDownloadUrl = downloadUrl || DEFAULT_RELEASE_CONFIG.downloadUrl;
  const finalAppVersion = appVersion || DEFAULT_RELEASE_CONFIG.appVersion;

  let passwordBlock = '';
  if (temporaryPassword) {
    passwordBlock = `🔑 अस्थायी पासवर्ड: ${temporaryPassword}`;
  } else {
    passwordBlock = `🔑 पासवर्ड: (आपका पूर्व निर्धारित पासवर्ड — यदि भूल गए हैं तो CRM से नया पासवर्ड रीसेट करें)`;
  }

  const versionText = finalAppVersion ? ` (वर्जन: ${finalAppVersion})` : '';

  return `नमस्ते ${safeName} जी,

शुभ लाभ पोल्ट्री एंड कैटल फीड्स (Shubh Labh Feeds) - ${headerAction}

अब आप हमारे Shubh Labh Order मोबाइल ऐप से सीधे अपने आर्डर दर्ज कर सकते हैं, वर्तमान भाव देख सकते हैं और अपनी लेजर स्थिति चेक कर सकते हैं।

आपके लॉगिन क्रेडेंशियल्स:
📱 लॉगिन आईडी: ${loginId}
${passwordBlock}

📲 ऐप डाउनलोड लिंक: ${finalDownloadUrl}${versionText}

निर्देश:
1. ऊपर दिए गए लिंक से ऐप डाउनलोड और इनस्टॉल करें।
2. अपनी लॉगिन आईडी और दिए गए पासवर्ड से लॉगिन करें।
3. पहले लॉगिन के बाद सुरक्षा हेतु ऐप की प्रोफ़ाइल सेटिंग में जाकर अपना नया पासवर्ड अवश्य सेट कर लें।

किसी भी सहायता के लिए संपर्क करें: +91 93522 76227 / +91 99281 92696
शुभ लाभ पोल्ट्री एंड कैटल फीड्स, अजमेर`;
}

/**
 * Generates the WhatsApp Web / App intent URL.
 */
export function buildWhatsAppLink(rawPhone, messageText) {
  const cleanPhone = normalizeIndianPhone(rawPhone);
  if (!cleanPhone || cleanPhone.length !== 10) {
    return {
      isValid: false,
      url: null,
      error: 'अमान्य मोबाइल नंबर (Invalid 10-digit mobile number)',
    };
  }

  const encodedMsg = encodeURIComponent(messageText);
  return {
    isValid: true,
    cleanPhone,
    url: `https://wa.me/91${cleanPhone}?text=${encodedMsg}`,
    fallbackUrl: `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodedMsg}`,
  };
}
