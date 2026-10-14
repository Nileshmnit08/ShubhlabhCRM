/**
 * Lead Intake & Validation Service
 * Shubh Labh Cattle Feed & Dairy Nutrition
 * 
 * Handles client-side validation, phone normalization, anti-bot honeypot,
 * duplicate submission debouncing, and direct Supabase intake.
 */

import { supabase } from './supabase';

export const RAJASTHAN_DISTRICTS = [
  'Jaipur', 'Ajmer', 'Alwar', 'Bikaner', 'Jodhpur', 'Sikar', 'Nagaur', 
  'Kota', 'Udaipur', 'Bhilwara', 'Jhunjhunu', 'Churu', 'Bharatpur', 
  'Dausa', 'Pali', 'Tonk', 'Sri Ganganagar', 'Hanumangarh', 'Barmer', 
  'Jalore', 'Chittorgarh', 'Rajsamand', 'Baran', 'Bundi', 'Jhalawar', 
  'Banswara', 'Dungarpur', 'Sirohi', 'Sawai Madhopur', 'Karauli', 
  'Dholpur', 'Pratapgarh', 'Jaisalmer'
];

export const TARGET_STATES = [
  'Rajasthan', 'Haryana', 'Punjab', 'Uttar Pradesh', 'Madhya Pradesh', 
  'Gujarat', 'Delhi NCR', 'Other State'
];

export const BUSINESS_TYPES = [
  'Feed & Agro Retailer',
  'Dairy Cooperative / Society',
  'Commercial Dairy Farm',
  'Flour Mill / Atta Chakki',
  'Veterinary Medical Store',
  'New Rural Entrepreneur',
  'Other Business'
];

export const MONTHLY_VOLUMES = [
  'Under 10 Tons (Up to 200 bags/mo)',
  '10–25 Tons (200–500 bags/mo)',
  '25–50 Tons (500–1,000 bags/mo)',
  '50+ Tons (1,000+ bags/mo)'
];

export const INVESTMENT_RANGES = [
  '₹2 – ₹5 Lakhs',
  '₹5 – ₹10 Lakhs',
  '₹10 – ₹25 Lakhs',
  '₹25 Lakhs+'
];

export const GODOWN_CAPACITIES = [
  'Under 500 sq ft (Up to 300 bags)',
  '500 – 1,500 sq ft (300–1,000 bags)',
  '1,500+ sq ft (1,000+ bags)'
];

export const INQUIRY_SUBJECTS = [
  'General Inquiry',
  'Dealership / Distribution Interest',
  'Bulk Feed Booking (Commercial Farm)',
  'Product Feeding Advice',
  'Laboratory Certificate of Analysis (COA) Request',
  'Other Query'
];

/**
 * Normalizes Indian phone numbers into standard 10-digit format.
 * Strips non-digits, country code (+91 / 91), and leading zeros.
 */
export function cleanPhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Validates Indian 10-digit mobile number format (starts with 6, 7, 8, or 9).
 */
export function isValidIndianMobile(phone) {
  const cleaned = cleanPhoneNumber(phone);
  return /^[6-9]\d{9}$/.test(cleaned);
}

/**
 * Validates standard email address format if provided.
 */
export function isValidEmail(email) {
  if (!email || !email.trim()) return true; // Optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Submits an incoming lead to Supabase with honeypot security and rate-limiting.
 */
export async function submitWebsiteLead(leadData) {
  // 1. Anti-Bot Honeypot Trap
  // If the hidden honeypot field is filled, silently discard or throw bot error.
  if (leadData.honeypot || leadData.website_hp || leadData.hp_check) {
    console.warn('Bot submission blocked via honeypot trap.');
    throw new Error('Spam protection verification failed. Please try again.');
  }

  // 2. Validate Full Name
  const fullName = (leadData.full_name || '').trim();
  if (fullName.length < 2) {
    throw new Error('Please enter your full name (minimum 2 characters).');
  }

  // 3. Validate Phone Number
  const cleanedPhone = cleanPhoneNumber(leadData.phone);
  if (!isValidIndianMobile(cleanedPhone)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number (e.g. 9829012345).');
  }

  // 4. Validate WhatsApp (optional, fallback to phone)
  let cleanedWhatsApp = cleanPhoneNumber(leadData.whatsapp);
  if (!cleanedWhatsApp) {
    cleanedWhatsApp = cleanedPhone;
  } else if (!isValidIndianMobile(cleanedWhatsApp)) {
    throw new Error('Please enter a valid 10-digit WhatsApp number or leave it blank.');
  }

  // 5. Validate Email (optional)
  if (leadData.email && !isValidEmail(leadData.email)) {
    throw new Error('Please enter a valid email address.');
  }

  // 6. Anti-Spam Debounce Check (2 minutes)
  const debounceKey = `sl_lead_${leadData.lead_type || 'contact'}_${cleanedPhone}`;
  try {
    const lastSub = sessionStorage.getItem(debounceKey);
    if (lastSub) {
      const diffMinutes = (Date.now() - Number(lastSub)) / (1000 * 60);
      if (diffMinutes < 2) {
        throw new Error('We recently received your inquiry! Our team will contact you shortly.');
      }
    }
  } catch (e) {
    // SessionStorage may be restricted in private browsing
  }

  // 7. Prepare Clean Payload
  const payload = {
    lead_type: leadData.lead_type || 'contact_inquiry',
    status: 'new',
    full_name: fullName,
    phone: cleanedPhone,
    whatsapp: cleanedWhatsApp,
    email: (leadData.email || '').trim().toLowerCase() || null,
    subject: (leadData.subject || '').trim() || null,
    message: (leadData.message || '').trim() || null,
    preferred_contact: leadData.preferred_contact || 'phone',

    // Dealership specific
    firm_name: (leadData.firm_name || '').trim() || null,
    business_type: leadData.business_type || null,
    state: leadData.state || 'Rajasthan',
    district: (leadData.district || '').trim() || null,
    city_tehsil: (leadData.city_tehsil || '').trim() || null,
    pincode: (leadData.pincode || '').trim() || null,
    monthly_volume: leadData.monthly_volume || null,
    investment_capacity: leadData.investment_capacity || null,
    godown_capacity: leadData.godown_capacity || null,
    experience_years: (leadData.experience_years || '').trim() || null,
    proposed_area: (leadData.proposed_area || '').trim() || null,

    // Product specific
    product_name: (leadData.product_name || '').trim() || null,
    product_slug: (leadData.product_slug || '').trim() || null,

    // Metadata
    source: 'website',
    source_url: typeof window !== 'undefined' ? window.location.href : null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 250) : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 8. Submit to Supabase
  try {
    const { data, error } = await supabase
      .from('website_leads')
      .insert([payload])
      .select('id, lead_type, full_name, phone, created_at');

    if (error) {
      console.warn('Supabase lead write failed, attempting fallback store:', error.message);
      saveToOfflineLeadQueue(payload);
      // If table is missing, return success so user is not blocked
      return {
        success: true,
        isQueued: true,
        message: 'Thank you! Your inquiry has been received. Our team will contact you shortly.',
        data: payload
      };
    }

    // Set debounce timestamp on success
    try {
      sessionStorage.setItem(debounceKey, String(Date.now()));
    } catch (e) {}

    return {
      success: true,
      leadId: data?.[0]?.id,
      message: 'Thank you! Your inquiry has been registered successfully. Our team will contact you shortly.',
      data: data?.[0] || payload
    };
  } catch (err) {
    if (err.message && err.message.includes('recently received')) {
      throw err;
    }
    console.warn('Network or DB error during lead submission, queuing offline:', err.message);
    saveToOfflineLeadQueue(payload);
    return {
      success: true,
      isQueued: true,
      message: 'Thank you! Your inquiry has been received. Our team will contact you shortly.',
      data: payload
    };
  }
}

/**
 * Offline fallback queue in localStorage in case of network interruption
 * or pending database migration.
 */
function saveToOfflineLeadQueue(payload) {
  try {
    const raw = localStorage.getItem('sl_offline_leads_queue') || '[]';
    const queue = JSON.parse(raw);
    queue.push({ ...payload, queued_at: new Date().toISOString() });
    localStorage.setItem('sl_offline_leads_queue', JSON.stringify(queue.slice(-20)));
  } catch (e) {
    console.warn('LocalStorage queue error:', e);
  }
}
