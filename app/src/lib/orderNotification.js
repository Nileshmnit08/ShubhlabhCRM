import { supabase } from './supabase';

/**
 * Ensures authorized Admin users receive an ORDER_CREATED notification
 * with full creator traceability and duplicate protection.
 *
 * @param {Object} params
 * @param {string} params.orderId - The primary key of the order (requirement id)
 * @param {string} [params.partyId] - The associated customer/dealer party id
 * @param {string} [params.createdBy] - The user ID of the staff creator
 * @param {string} [params.customerName] - Display name of the customer
 * @param {string} [params.orderRef] - Human-readable order reference (e.g. D-001)
 */
export async function notifyAdminsOnOrderCreated({
  orderId,
  partyId,
  createdBy,
  customerName,
  orderRef,
}) {
  if (!orderId) return;

  try {
    // 1. Duplicate protection check
    const { data: existing, error: checkError } = await supabase
      .from('crm_notifications')
      .select('id')
      .eq('entity_type', 'order')
      .eq('entity_id', orderId)
      .eq('notification_type', 'ORDER_CREATED')
      .limit(1);

    if (checkError) {
      console.warn('Error checking existing order notification:', checkError);
    } else if (existing && existing.length > 0) {
      // Already notified (e.g. by database trigger)
      return;
    }

    // 2. Resolve creator name
    let creatorName = 'Staff';
    if (createdBy) {
      try {
        const { data: userData } = await supabase
          .from('app_users')
          .select('display_name, email')
          .eq('id', createdBy)
          .single();

        if (userData) {
          creatorName = userData.display_name || userData.email || 'Staff';
        }
      } catch (err) {
        console.warn('Could not resolve staff creator name:', err);
      }
    }

    // 3. Resolve customer name if missing
    let resolvedCustomerName = customerName;
    if (!resolvedCustomerName && partyId) {
      try {
        const { data: partyData } = await supabase
          .from('crm_parties')
          .select('display_name')
          .eq('id', partyId)
          .single();

        if (partyData?.display_name) {
          resolvedCustomerName = partyData.display_name;
        }
      } catch (err) {
        console.warn('Could not resolve customer name:', err);
      }
    }
    if (!resolvedCustomerName) {
      resolvedCustomerName = 'Customer';
    }

    // 4. Format order reference and timestamp
    const ref = orderRef || ('Order #' + orderId.substring(0, 8).toUpperCase());
    const createdTime = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // 5. Query active Admin recipients
    const { data: admins, error: adminErr } = await supabase
      .from('app_users')
      .select('id')
      .eq('role', 'Admin')
      .or('is_active.is.null,is_active.eq.true');

    if (adminErr) {
      console.warn('Error querying admin users for notification:', adminErr);
      return;
    }

    if (!admins || admins.length === 0) {
      return;
    }

    // 6. Build notifications for all authorized Admins
    const message = `${ref} created by ${creatorName}\nCustomer: ${resolvedCustomerName}\nCreated: ${createdTime}`;
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      party_id: partyId || null,
      entity_type: 'order',
      entity_id: orderId,
      notification_type: 'ORDER_CREATED',
      title: '🔔 New Order',
      message: message,
      link_url: `/requirements/${orderId}`,
      is_read: false,
    }));

    // 7. Insert notifications
    const { error: insertErr } = await supabase
      .from('crm_notifications')
      .insert(notifications);

    if (insertErr) {
      console.error('Error inserting admin order notification:', insertErr);
    }
  } catch (err) {
    console.error('Failed to notify admins of order creation:', err);
  }
}
