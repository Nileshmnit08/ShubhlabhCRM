/**
 * SL-ORDER-PROFILE-UI-02 — the salesperson ASSIGNED to the signed-in customer, for the Profile card.
 *
 * Pure JavaScript (no React Native); the database client is injected so the exact code is unit-tested in Node.
 * It uses the SAME existing relationship and query as MySalespersonScreen: crm_parties.assigned_owner_id →
 * app_users (FK embed), with the denormalised crm_parties.owner_name as fallback. The customer is identified by
 * their own party id (customerProfile.id); nothing is selected by name and no list of salespeople is ever read.
 * Row access stays governed by the existing RLS; this module changes nothing about assignment or permissions.
 */

export async function fetchAssignedSalesperson(client, partyId, defaultRole = null) {
  if (!partyId) return { salesperson: null, error: null };
  const { data, error } = await client
    .from('crm_parties')
    .select(`
      id,
      assigned_owner_id,
      owner_name,
      territory_name,
      owner:app_users!crm_parties_assigned_owner_id_fkey (
        id,
        display_name,
        role,
        mobile,
        whatsapp,
        email
      )
    `)
    .eq('id', partyId)
    .single();
  if (error) return { salesperson: null, error };
  return { salesperson: normalizeSalesperson(data, defaultRole), error: null };
}

/** Only the fields the app shows. Anything else on the row (tokens, notes, …) is never copied. */
export function normalizeSalesperson(data, defaultRole = null) {
  if (!data) return null;
  const owner = data.owner;
  if (owner && typeof owner.display_name === 'string' && owner.display_name.trim()) {
    return {
      id: owner.id,
      display_name: owner.display_name.trim(),
      role: owner.role || defaultRole,
      mobile: owner.mobile || null,
      whatsapp: owner.whatsapp || owner.mobile || null,
      territory: data.territory_name || null,
    };
  }
  if (typeof data.owner_name === 'string' && data.owner_name.trim()) {
    return { display_name: data.owner_name.trim(), role: defaultRole, mobile: null, whatsapp: null, territory: data.territory_name || null };
  }
  return null;
}

/** A number is usable when it holds at least the 10 digits of an Indian mobile number (and no more than 13 with 91 / 0 prefixes). */
export function isValidPhone(value) {
  if (typeof value !== 'string') return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}

/** Which contact buttons may be shown. Call needs a valid mobile; WhatsApp a valid WhatsApp (or mobile) number. */
export function contactActions(salesperson) {
  if (!salesperson) return { call: false, whatsapp: false };
  return {
    call: isValidPhone(salesperson.mobile),
    whatsapp: isValidPhone(salesperson.whatsapp || salesperson.mobile),
  };
}

export function telUrl(value) {
  return isValidPhone(value) ? `tel:${value.replace(/[^\d+]/g, '')}` : null;
}

export function whatsappUrl(value, name = 'Representative') {
  if (!isValidPhone(value)) return null;
  const digits = value.replace(/\D/g, '');
  const full = digits.startsWith('91') && digits.length === 12 ? digits : `91${digits.slice(-10)}`;
  const greeting = `Hello ${name}, I am contacting you from Shubh Labh Buyer App regarding an order.`;
  return `https://wa.me/${full}?text=${encodeURIComponent(greeting)}`;
}
