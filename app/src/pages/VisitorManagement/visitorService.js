import { supabase } from '../../lib/supabase';
import Papa from 'papaparse';
import {
  VISITOR_TABLE,
  VISITOR_STORAGE_BUCKET,
  generatePassNumber,
  validateVisitorInput,
  computeDashboardStats,
  buildVisitorCsvRows,
  istBusinessDate,
} from '../../lib/visitorRegister';

/**
 * SL-VISITOR-MANAGEMENT-01: Service layer for Visitor Management.
 * Communicates with the shared Supabase backend (public.visitor_register).
 */

export async function fetchVisitors({
  startDate = null,
  endDate = null,
  status = 'ALL',
  category = 'ALL',
  source = 'ALL',
  search = '',
  limit = 200,
} = {}) {
  try {
    let query = supabase
      .from(VISITOR_TABLE)
      .select('*')
      .order('entry_time', { ascending: false })
      .limit(limit);

    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    if (category && category !== 'ALL') {
      query = query.eq('category', category);
    }

    if (source && source !== 'ALL') {
      query = query.eq('registration_source', source);
    }

    if (startDate) {
      query = query.gte('entry_time', `${startDate}T00:00:00Z`);
    }

    if (endDate) {
      query = query.lte('entry_time', `${endDate}T23:59:59Z`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[VisitorService] fetchVisitors error:', error);
      return { data: [], error };
    }

    let records = data || [];

    // Client-side search for flexible multi-field filtering
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      records = records.filter((v) => {
        const name = (v.visitor_name || '').toLowerCase();
        const mobile = (v.mobile_number || '').toLowerCase();
        const pass = (v.pass_number || '').toLowerCase();
        const company = (v.company_name || '').toLowerCase();
        const person = (v.person_to_meet || '').toLowerCase();
        const vehicle = (v.vehicle_number || '').toLowerCase();
        return (
          name.includes(q) ||
          mobile.includes(q) ||
          pass.includes(q) ||
          company.includes(q) ||
          person.includes(q) ||
          vehicle.includes(q)
        );
      });
    }

    return { data: records, error: null };
  } catch (err) {
    console.error('[VisitorService] Unexpected error in fetchVisitors:', err);
    return { data: [], error: err };
  }
}

/**
 * Fetches data needed for the dashboard metrics & watchlist.
 */
export async function fetchVisitorDashboard() {
  try {
    const todayYmd = istBusinessDate();
    const currentYearMonth = todayYmd.slice(0, 7);
    const startOfMonth = `${currentYearMonth}-01T00:00:00Z`;

    // Fetch this month's visitors for comprehensive KPIs
    const { data, error } = await supabase
      .from(VISITOR_TABLE)
      .select('*')
      .gte('entry_time', startOfMonth)
      .order('entry_time', { ascending: false });

    if (error) {
      console.warn('[VisitorService] fetchVisitorDashboard error:', error);
      return { stats: computeDashboardStats([], todayYmd), error };
    }

    const stats = computeDashboardStats(data || [], todayYmd);
    return { stats, error: null };
  } catch (err) {
    console.error('[VisitorService] fetchVisitorDashboard caught error:', err);
    return { stats: computeDashboardStats([], istBusinessDate()), error: err };
  }
}

/**
 * Registers a new visitor from the CRM portal.
 */
export async function registerVisitor(formData, currentUser) {
  const validation = validateVisitorInput(formData);
  if (!validation.isValid) {
    return {
      success: false,
      error: new Error('Validation failed'),
      validationErrors: validation.errors,
    };
  }

  const passNumber = formData.pass_number || generatePassNumber();
  const now = new Date().toISOString();

  const payload = {
    pass_number: passNumber,
    visitor_name: formData.visitor_name.trim(),
    mobile_number: validation.normalizedMobile || formData.mobile_number.trim(),
    company_name: formData.company_name ? formData.company_name.trim() : null,
    address: formData.address ? formData.address.trim() : null,
    category: formData.category || 'Other',
    person_to_meet: formData.person_to_meet ? formData.person_to_meet.trim() : null,
    purpose_of_visit: formData.purpose_of_visit ? formData.purpose_of_visit.trim() : null,
    vehicle_number: formData.vehicle_number ? formData.vehicle_number.trim().toUpperCase() : null,
    photo_url: formData.photo_url,
    registered_by: currentUser?.id || null,
    registration_source: 'CRM',
    entry_time: formData.entry_time || now,
    exit_time: null,
    status: 'IN',
    notes: formData.notes ? formData.notes.trim() : null,
    created_at: now,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase
      .from(VISITOR_TABLE)
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('[VisitorService] Insert visitor error:', error);
      return { success: false, error, data: null };
    }

    return { success: true, error: null, data };
  } catch (err) {
    console.error('[VisitorService] Unexpected register error:', err);
    return { success: false, error: err, data: null };
  }
}

/**
 * Marks visitor exit (status 'OUT', exit_time set to now).
 */
export async function markVisitorExit(visitorId, exitTime = null) {
  if (!visitorId) {
    return { success: false, error: new Error('Visitor ID is required') };
  }

  const now = exitTime || new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from(VISITOR_TABLE)
      .update({
        status: 'OUT',
        exit_time: now,
        updated_at: now,
      })
      .eq('id', visitorId)
      .select()
      .single();

    if (error) {
      console.error('[VisitorService] Mark exit error:', error);
      return { success: false, error };
    }

    return { success: true, data, error: null };
  } catch (err) {
    console.error('[VisitorService] markVisitorExit exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Uploads a photo blob/file to Supabase Storage bucket 'visitor-photos'.
 * Falls back gracefully to returning null or error so caller can preserve data URI.
 */
export async function uploadVisitorPhoto(blobOrFile, passNumber) {
  if (!blobOrFile) return { url: null, error: new Error('No photo provided') };

  const fileName = `${passNumber || 'VR'}_${Date.now()}.jpg`;
  const filePath = `passes/${fileName}`;

  try {
    const { data, error } = await supabase.storage
      .from(VISITOR_STORAGE_BUCKET)
      .upload(filePath, blobOrFile, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.warn('[VisitorService] Storage upload failed (falling back to data URI):', error);
      return { url: null, error };
    }

    // Try to get public URL
    const { data: publicData } = supabase.storage
      .from(VISITOR_STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return { url: publicData?.publicUrl || filePath, error: null };
  } catch (err) {
    console.warn('[VisitorService] Photo upload exception (falling back):', err);
    return { url: null, error: err };
  }
}

/**
 * Exports visitors to CSV and triggers instant browser download.
 */
export function exportVisitorsToCSV(visitors, customFilename = null) {
  try {
    const rows = buildVisitorCsvRows(visitors);
    const csvString = Papa.unparse(rows);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    const today = istBusinessDate();
    link.href = url;
    link.setAttribute('download', customFilename || `visitor_register_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('[VisitorService] CSV Export error:', err);
    return false;
  }
}
