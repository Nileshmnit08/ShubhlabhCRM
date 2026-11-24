/**
 * transporterDispatch.js
 * 
 * Logic and helpers for:
 * - Validating Transporter Name and Indian 10-digit mobile number
 * - Detecting existing transporters by mobile number to prevent duplicates
 * - Auto-creating new transporters in transporter_metadata
 * - Atomically / safely recording requirement dispatch with linked transporter details
 */

/**
 * Normalizes an Indian mobile number.
 * Strips formatting, leading zeros, +91, or 91 country codes.
 * Returns a 10-digit string if valid shape, or stripped digits.
 */
export function normalizeIndianMobile(phone) {
  if (!phone) return '';
  const clean = String(phone).trim().replace(/[^\d+]/g, '');
  
  // If starts with +91, strip it
  if (clean.startsWith('+91')) {
    const rest = clean.slice(3);
    if (/^[6-9]\d{9}$/.test(rest)) return rest;
  }
  
  // If starts with 91 and has 12 digits
  if (clean.startsWith('91') && clean.length === 12) {
    const rest = clean.slice(2);
    if (/^[6-9]\d{9}$/.test(rest)) return rest;
  }
  
  // If starts with leading 0 and has 11 digits
  if (clean.startsWith('0') && clean.length === 11) {
    const rest = clean.slice(1);
    if (/^[6-9]\d{9}$/.test(rest)) return rest;
  }
  
  // Raw 10 digits
  const digitsOnly = clean.replace(/\D/g, '');
  return digitsOnly;
}

/**
 * Validates whether the given phone is a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).
 */
export function isValidIndianMobile(phone) {
  const normalized = normalizeIndianMobile(phone);
  return /^[6-9]\d{9}$/.test(normalized);
}

/**
 * Validates transport details form input.
 * Returns { isValid: boolean, error: string | null, sanitized: { transporterName: string, mobileNumber: string } }
 */
export function validateTransportDetails({ transporterName, mobileNumber }) {
  const name = (transporterName || '').trim();
  const mobile = (mobileNumber || '').toString().trim();

  if (!name) {
    return {
      isValid: false,
      error: 'Transporter name is required.',
      sanitized: null
    };
  }

  if (!mobile) {
    return {
      isValid: false,
      error: 'Mobile number is required.',
      sanitized: null
    };
  }

  if (!isValidIndianMobile(mobile)) {
    return {
      isValid: false,
      error: 'Please enter a valid 10-digit Indian mobile number (e.g. 9828539054).',
      sanitized: null
    };
  }

  return {
    isValid: true,
    error: null,
    sanitized: {
      transporterName: name,
      mobileNumber: normalizeIndianMobile(mobile)
    }
  };
}

/**
 * Finds a transporter by mobile number from an in-memory list.
 */
export function findTransporterByMobile(transportersList, mobileNumber) {
  if (!Array.isArray(transportersList) || !mobileNumber) return null;
  const target = normalizeIndianMobile(mobileNumber);
  if (!target) return null;

  return transportersList.find(t => {
    const num = normalizeIndianMobile(t.contact_number || t.contactNumber || t.driver_mobile);
    return num === target;
  }) || null;
}

/**
 * Deduplicates or creates a transporter in public.transporter_metadata.
 * - Detects existing record using mobile number.
 * - If found: reuses existing record, avoiding duplicates.
 * - If not found: checks name; inserts new record if new name or updates contact if existing name.
 * 
 * @param {object} supabase Supabase client instance
 * @param {object} params { transporterName, mobileNumber }
 * @returns {Promise<{ transporter_name: string, contact_number: string, isExisting: boolean }>}
 */
export async function findOrCreateTransporter(supabase, { transporterName, mobileNumber }) {
  const validation = validateTransportDetails({ transporterName, mobileNumber });
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const { transporterName: cleanName, mobileNumber: cleanMobile } = validation.sanitized;

  // 1. Look up existing transporter by mobile number (contact_number)
  const { data: existingByMobile, error: mobileErr } = await supabase
    .from('transporter_metadata')
    .select('*')
    .eq('contact_number', cleanMobile)
    .limit(1);

  if (mobileErr && mobileErr.code !== 'PGRST116') {
    throw new Error(`Failed to check existing transporter by mobile: ${mobileErr.message}`);
  }

  if (existingByMobile && existingByMobile.length > 0) {
    const existing = existingByMobile[0];
    return {
      transporter_name: existing.transporter_name,
      contact_number: existing.contact_number,
      isExisting: true,
      matchedBy: 'mobile'
    };
  }

  // 2. Check if transporter already exists by primary key (transporter_name)
  const { data: existingByName, error: nameErr } = await supabase
    .from('transporter_metadata')
    .select('*')
    .eq('transporter_name', cleanName)
    .limit(1);

  if (nameErr && nameErr.code !== 'PGRST116') {
    throw new Error(`Failed to check existing transporter by name: ${nameErr.message}`);
  }

  if (existingByName && existingByName.length > 0) {
    // Update contact_number for existing named transporter if missing or updated
    const { error: updateErr } = await supabase
      .from('transporter_metadata')
      .update({ contact_number: cleanMobile, updated_at: new Date().toISOString() })
      .eq('transporter_name', cleanName);

    if (updateErr) {
      throw new Error(`Failed to update transporter contact: ${updateErr.message}`);
    }

    return {
      transporter_name: cleanName,
      contact_number: cleanMobile,
      isExisting: true,
      matchedBy: 'name'
    };
  }

  // 3. Brand new transporter - insert into transporter_metadata
  const newPayload = {
    transporter_name: cleanName,
    contact_number: cleanMobile,
    is_fraud: false,
    added_locations: [],
    removed_locations: []
  };

  const { error: insertErr } = await supabase
    .from('transporter_metadata')
    .insert(newPayload);

  if (insertErr) {
    throw new Error(`Failed to create new transporter in master list: ${insertErr.message}`);
  }

  return {
    transporter_name: cleanName,
    contact_number: cleanMobile,
    isExisting: false,
    matchedBy: 'new'
  };
}

/**
 * Confirms dispatch of a requirement safely:
 * 1. Validates transport details (name & 10-digit mobile).
 * 2. Deduplicates / creates transporter in transporter_metadata.
 * 3. Records dispatch entry with transporter details.
 * 4. Updates requirement status to 'Closed' (canonical CRM status).
 * 5. Logs audit history.
 * Rolls back dispatch record if requirement update fails to maintain consistency.
 */
export async function confirmRequirementDispatch(supabase, { requirement, transporterName, mobileNumber, userProfile, sessionUser }) {
  if (!requirement || !requirement.id) {
    throw new Error('Requirement is required to confirm dispatch.');
  }

  // 1. Validate transport details first
  const validation = validateTransportDetails({ transporterName, mobileNumber });
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // 2. Find or create transporter record
  const transporter = await findOrCreateTransporter(supabase, {
    transporterName: validation.sanitized.transporterName,
    mobileNumber: validation.sanitized.mobileNumber
  });

  const userId = userProfile?.id || sessionUser?.id || null;
  const dispatchDate = new Date().toISOString().split('T')[0];
  const dispatchQty = requirement.required_quantity || requirement.quantity || 0;
  const dispatchUnit = requirement.unit || 'Bags';

  // 3. Create dispatch record in requirement_dispatches
  const dispatchPayload = {
    requirement_id: requirement.id,
    dispatch_date: dispatchDate,
    quantity: dispatchQty,
    unit: dispatchUnit,
    truck_number: '',
    transporter_name: transporter.transporter_name,
    driver_mobile: transporter.contact_number,
    status: 'Dispatched',
    created_by: userId
  };

  const { data: insertedDispatch, error: dispatchErr } = await supabase
    .from('requirement_dispatches')
    .insert(dispatchPayload)
    .select()
    .single();

  if (dispatchErr) {
    throw new Error(`Failed to record dispatch: ${dispatchErr.message}`);
  }

  // 4. Update requirement status to Closed
  const { error: reqErr } = await supabase
    .from('requirements')
    .update({ status: 'Closed' })
    .eq('id', requirement.id);

  if (reqErr) {
    // Attempt rollback of created dispatch record for consistency
    if (insertedDispatch?.id) {
      await supabase.from('requirement_dispatches').delete().eq('id', insertedDispatch.id);
    }
    throw new Error(`Failed to update requirement status: ${reqErr.message}`);
  }

  // 5. Log audit history
  if (userId) {
    try {
      await supabase.from('requirement_status_history').insert({
        requirement_id: requirement.id,
        old_status: requirement.status,
        new_status: 'Closed',
        note: `Marked as dispatched via ${transporter.transporter_name} (${transporter.contact_number}).`,
        changed_by: userId
      });
    } catch (historyErr) {
      console.warn('Could not record status history:', historyErr);
    }
  }

  return {
    success: true,
    dispatch: insertedDispatch,
    transporter,
    note: `Marked as dispatched via ${transporter.transporter_name} (${transporter.contact_number}).`
  };
}
