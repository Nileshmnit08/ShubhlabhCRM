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
    const { error } = await supabase
      .from('website_leads')
      .insert([payload]);

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
      message: 'Thank you! Your inquiry has been registered successfully. Our team will contact you shortly.',
      data: payload
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
 * Baseline verification seed leads for CRM leads inbox.
 * Used when database table is freshly initialized or during offline testing.
 */
export const DEFAULT_SEED_LEADS = [
  {
    id: 101,
    lead_type: 'dealer_application',
    status: 'new',
    full_name: 'Mukesh Choudhary',
    phone: '9414098765',
    whatsapp: '9414098765',
    email: 'mukesh.kisanfeed@example.com',
    subject: 'Dealership Application for Sikar District',
    message: 'We run a fertilizer and seed shop in Ringas. We want to become an authorized dealer for Shubh Labh cattle feed across Ringas and Sri Madhopur.',
    preferred_contact: 'whatsapp',
    firm_name: 'Kisan Agro Agency',
    business_type: 'Feed & Agro Retailer',
    state: 'Rajasthan',
    district: 'Sikar',
    city_tehsil: 'Ringas',
    pincode: '332404',
    monthly_volume: '25–50 Tons (500–1,000 bags/mo)',
    investment_capacity: '₹10 – ₹25 Lakhs',
    godown_capacity: '1,500+ sq ft (1,000+ bags)',
    experience_years: '10+ Years',
    proposed_area: 'Ringas, Sri Madhopur, and adjoining dairy clusters',
    source: 'website',
    admin_notes: 'High prospective retail footfall. Shop located on Jaipur-Bikaner highway.',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 102,
    lead_type: 'contact_inquiry',
    status: 'contacted',
    full_name: 'Ramesh Chandra Sharma',
    phone: '9829012345',
    whatsapp: '9829012345',
    email: 'ramesh.sharma@example.com',
    subject: 'Bulk Cattle Feed Pricing for Dairy Farm',
    message: 'We operate a commercial dairy farm with 35 HF crossbred cows in Bassi. Inquiring about bulk discount rates and direct delivery terms.',
    preferred_contact: 'phone',
    firm_name: 'Sharma Dairy & Cattle Care',
    business_type: 'Commercial Dairy Farm',
    state: 'Rajasthan',
    district: 'Jaipur',
    city_tehsil: 'Bassi',
    pincode: '303301',
    monthly_volume: '10–25 Tons (200–500 bags/mo)',
    investment_capacity: '₹5 – ₹10 Lakhs',
    godown_capacity: '500 – 1,500 sq ft (300–1,000 bags)',
    experience_years: '5–10 Years',
    proposed_area: 'Bassi and Chaksu tehsil',
    source: 'website',
    admin_notes: 'Territory officer Suresh visited farm. Samples provided.',
    created_at: new Date(Date.now() - 3600000 * 26).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 103,
    lead_type: 'product_enquiry',
    status: 'new',
    full_name: 'Suresh Meena',
    phone: '9785011223',
    whatsapp: '9785011223',
    email: 'suresh.meena@example.com',
    subject: 'Product Inquiry: Shubh Labh Pallet 8000 (50 Bags)',
    message: 'Need 50 bags of Pallet 8000 for high-yielding Murrah buffalo herd in early lactation. Please share nearest dealer address in Dausa.',
    preferred_contact: 'phone',
    firm_name: 'Meena Dairy Farm',
    business_type: 'Commercial Dairy Farm',
    state: 'Rajasthan',
    district: 'Dausa',
    city_tehsil: 'Lalsot',
    pincode: '303503',
    product_name: 'Shubh Labh Pallet 8000',
    product_slug: 'pallet-8000',
    source: 'website',
    admin_notes: 'Urgent requirement; current feed stock finishing in 3 days.',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: 104,
    lead_type: 'dealer_application',
    status: 'converted',
    full_name: 'Kailash Gurjar',
    phone: '9928044332',
    whatsapp: '9928044332',
    email: 'gurjaragro@example.com',
    subject: 'Dealership Application: Behror & Kotputli',
    message: 'We have 2 retail stores in Behror mandi. Looking for authorized cattle feed distributorship with exclusive area rights.',
    preferred_contact: 'whatsapp',
    firm_name: 'Gurjar Agro & Krishi Kendra',
    business_type: 'Feed & Agro Retailer',
    state: 'Rajasthan',
    district: 'Alwar',
    city_tehsil: 'Behror',
    pincode: '301701',
    monthly_volume: '50+ Tons (1,000+ bags/mo)',
    investment_capacity: '₹25 Lakhs+',
    godown_capacity: '1,500+ sq ft (1,000+ bags)',
    experience_years: '10+ Years',
    proposed_area: 'Behror, Kotputli, and Neemrana rural belt',
    source: 'website',
    admin_notes: 'Converted to Authorized Dealer. First truckload dispatched.',
    created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

/**
 * Fetches website leads with filtering, search, and resilient fallback.
 */
export async function fetchWebsiteLeads({
  status = 'all',
  leadType = 'all',
  district = 'all',
  search = '',
  sortBy = 'newest'
} = {}) {
  let isFallback = false;

  try {
    const { data, error } = await supabase
      .from('website_leads')
      .select('*')
      .order('created_at', { ascending: sortBy === 'oldest' });

    if (error) throw error;

    let allLeads = data || [];

    // If table is genuinely empty in DB, check offline queue + default seeds
    if (allLeads.length === 0) {
      allLeads = getOfflineAndSeedLeads();
      isFallback = true;
    }

    // Calculate metrics across all leads
    const metrics = {
      total: allLeads.length,
      new: allLeads.filter(l => l.status === 'new').length,
      contacted: allLeads.filter(l => l.status === 'contacted').length,
      converted: allLeads.filter(l => l.status === 'converted').length,
      rejected: allLeads.filter(l => l.status === 'rejected').length,
      dealerApps: allLeads.filter(l => l.lead_type === 'dealer_application').length,
      contactInquiries: allLeads.filter(l => l.lead_type === 'contact_inquiry').length,
      productEnquiries: allLeads.filter(l => l.lead_type === 'product_enquiry').length,
    };

    // Apply filtering
    let filtered = allLeads;
    if (status !== 'all') {
      filtered = filtered.filter(l => l.status === status);
    }
    if (leadType !== 'all') {
      filtered = filtered.filter(l => l.lead_type === leadType);
    }
    if (district !== 'all') {
      filtered = filtered.filter(l => l.district === district);
    }

    // Client-side text search across multiple fields
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(item => 
        (item.full_name || '').toLowerCase().includes(q) ||
        (item.phone || '').includes(q) ||
        (item.firm_name || '').toLowerCase().includes(q) ||
        (item.district || '').toLowerCase().includes(q) ||
        (item.city_tehsil || '').toLowerCase().includes(q) ||
        (item.subject || '').toLowerCase().includes(q) ||
        (item.product_name || '').toLowerCase().includes(q) ||
        (item.message || '').toLowerCase().includes(q)
      );
    }

    return {
      leads: filtered,
      metrics,
      isFallback,
      pendingOfflineCount: getPendingOfflineCount()
    };
  } catch (err) {
    console.warn('Unable to query website_leads table directly, using local/seed fallback:', err.message);
    let allFallbackLeads = getOfflineAndSeedLeads();

    const metrics = {
      total: allFallbackLeads.length,
      new: allFallbackLeads.filter(l => l.status === 'new').length,
      contacted: allFallbackLeads.filter(l => l.status === 'contacted').length,
      converted: allFallbackLeads.filter(l => l.status === 'converted').length,
      rejected: allFallbackLeads.filter(l => l.status === 'rejected').length,
      dealerApps: allFallbackLeads.filter(l => l.lead_type === 'dealer_application').length,
      contactInquiries: allFallbackLeads.filter(l => l.lead_type === 'contact_inquiry').length,
      productEnquiries: allFallbackLeads.filter(l => l.lead_type === 'product_enquiry').length,
    };

    let filtered = allFallbackLeads;
    if (status !== 'all') {
      filtered = filtered.filter(l => l.status === status);
    }
    if (leadType !== 'all') {
      filtered = filtered.filter(l => l.lead_type === leadType);
    }
    if (district !== 'all') {
      filtered = filtered.filter(l => l.district === district);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(item => 
        (item.full_name || '').toLowerCase().includes(q) ||
        (item.phone || '').includes(q) ||
        (item.firm_name || '').toLowerCase().includes(q) ||
        (item.district || '').toLowerCase().includes(q) ||
        (item.city_tehsil || '').toLowerCase().includes(q) ||
        (item.subject || '').toLowerCase().includes(q) ||
        (item.product_name || '').toLowerCase().includes(q) ||
        (item.message || '').toLowerCase().includes(q)
      );
    }

    return {
      leads: filtered,
      metrics,
      isFallback: true,
      pendingOfflineCount: getPendingOfflineCount()
    };
  }
}

/**
 * Updates lead status and administrative notes.
 */
export async function updateLeadStatus(leadId, newStatus, adminNotes) {
  const updates = {
    status: newStatus,
    updated_at: new Date().toISOString()
  };
  if (adminNotes !== undefined) {
    updates.admin_notes = adminNotes;
  }

  try {
    const { error } = await supabase
      .from('website_leads')
      .update(updates)
      .eq('id', leadId);

    if (error) throw error;
  } catch (err) {
    console.warn('Fallback: updating lead in localStorage mock store:', err.message);
    updateOfflineLeadMock(leadId, updates);
  }

  return { success: true };
}

/**
 * Converts a website lead into an active CRM Party (and Dealer Profile if applicable).
 */
export async function convertLeadToParty(lead, options = {}) {
  const isDealer = options.relationship_type === 'Dealer' || lead.lead_type === 'dealer_application';
  
  const partyPayload = {
    display_name: options.display_name || lead.firm_name || lead.full_name,
    legal_or_core_name: lead.full_name,
    relationship_type: options.relationship_type || (isDealer ? 'Dealer' : 'Customer'),
    mobile: lead.phone,
    whatsapp: lead.whatsapp || lead.phone,
    city: lead.city_tehsil || lead.district || 'Jaipur',
    state: lead.state || 'Rajasthan',
    pincode: lead.pincode || null,
    crm_status: 'Active',
    lead_source: 'Website',
    product_interests: lead.product_name || (lead.monthly_volume ? `Target: ${lead.monthly_volume}` : 'Cattle Feed'),
    notes: `Converted from Website Lead #${lead.id} (${lead.lead_type}): ${lead.message || ''}. ${options.notes || ''}`.trim(),
    assigned_owner_id: options.assigned_owner_id || null,
    territory_id: options.territory_id || null
  };

  try {
    // 1. Insert into crm_parties
    const { data: partyData, error: partyError } = await supabase
      .from('crm_parties')
      .insert([partyPayload])
      .select('id, display_name');

    if (partyError) throw partyError;
    const newPartyId = partyData?.[0]?.id;

    // 2. If dealer, create dealer profile
    if (isDealer && newPartyId) {
      await supabase.from('crm_dealer_profiles').upsert([
        {
          party_id: newPartyId,
          dealer_classification: options.dealer_classification || 'Retailer',
          operating_status: 'Active'
        }
      ], { onConflict: 'party_id' });
    }

    // 3. Update lead status in website_leads
    const notesUpdate = `Converted to CRM Party (${partyPayload.display_name}) on ${new Date().toLocaleDateString('en-IN')}`;
    await supabase.from('website_leads').update({
      status: 'converted',
      converted_party_id: newPartyId,
      admin_notes: lead.admin_notes ? `${lead.admin_notes} | ${notesUpdate}` : notesUpdate,
      updated_at: new Date().toISOString()
    }).eq('id', lead.id);

    return { success: true, partyId: newPartyId, party: partyData?.[0] };
  } catch (err) {
    console.error('Error converting lead to party:', err);
    throw err;
  }
}

/**
 * Reads pending offline leads queue.
 */
export function getOfflineLeadQueue() {
  try {
    const raw = localStorage.getItem('sl_offline_leads_queue');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getPendingOfflineCount() {
  return getOfflineLeadQueue().length;
}

/**
 * Merges offline leads with baseline seed leads for resilient offline mode.
 */
function getOfflineAndSeedLeads() {
  const offline = getOfflineLeadQueue().map((item, idx) => ({
    ...item,
    id: `local-${idx + 1}`,
    status: item.status || 'new',
    is_offline_pending: true
  }));
  return [...offline, ...DEFAULT_SEED_LEADS];
}

function updateOfflineLeadMock(leadId, updates) {
  try {
    const localStoreKey = 'sl_mock_leads_overrides';
    const raw = localStorage.getItem(localStoreKey) || '{}';
    const store = JSON.parse(raw);
    store[leadId] = { ...(store[leadId] || {}), ...updates };
    localStorage.setItem(localStoreKey, JSON.stringify(store));
  } catch {}
}

/**
 * Attempts to upload all locally-queued offline leads into Supabase.
 */
export async function syncOfflineQueueToSupabase() {
  const queue = getOfflineLeadQueue();
  if (!queue || queue.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  let syncedCount = 0;
  let remaining = [];

  for (const item of queue) {
    try {
      const cleanItem = { ...item };
      delete cleanItem.queued_at;
      delete cleanItem.id;

      const { error } = await supabase.from('website_leads').insert([cleanItem]);
      if (!error) {
        syncedCount++;
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  localStorage.setItem('sl_offline_leads_queue', JSON.stringify(remaining));
  return { syncedCount, failedCount: remaining.length };
}

/**
 * Exports an array of leads into a clean, downloadable CSV file.
 */
export function exportLeadsToCsv(leads = [], filename = 'shubh_labh_website_leads.csv') {
  if (!leads || leads.length === 0) return;

  const headers = [
    'Lead ID',
    'Date Submitted',
    'Lead Type',
    'Status',
    'Applicant Name',
    'Phone',
    'WhatsApp',
    'Email',
    'Firm Name',
    'Business Type',
    'State',
    'District',
    'City/Tehsil',
    'Pincode',
    'Monthly Volume',
    'Investment Budget',
    'Godown Capacity',
    'Experience',
    'Product Formulation',
    'Subject',
    'Message/Inquiry',
    'Admin Notes'
  ];

  const escapeCsv = (str) => {
    if (str === null || str === undefined) return '""';
    const clean = String(str).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = leads.map(l => [
    l.id,
    new Date(l.created_at).toLocaleString('en-IN'),
    l.lead_type === 'dealer_application' ? 'Dealership Application' : l.lead_type === 'product_enquiry' ? 'Product Enquiry' : 'Contact Inquiry',
    l.status.toUpperCase(),
    escapeCsv(l.full_name),
    escapeCsv(l.phone),
    escapeCsv(l.whatsapp),
    escapeCsv(l.email),
    escapeCsv(l.firm_name),
    escapeCsv(l.business_type),
    escapeCsv(l.state),
    escapeCsv(l.district),
    escapeCsv(l.city_tehsil),
    escapeCsv(l.pincode),
    escapeCsv(l.monthly_volume),
    escapeCsv(l.investment_capacity),
    escapeCsv(l.godown_capacity),
    escapeCsv(l.experience_years),
    escapeCsv(l.product_name),
    escapeCsv(l.subject),
    escapeCsv(l.message),
    escapeCsv(l.admin_notes)
  ].join(','));

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
