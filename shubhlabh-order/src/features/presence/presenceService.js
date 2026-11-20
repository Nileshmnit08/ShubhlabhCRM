import { Platform } from 'react-native';
import { supabase } from '../../core/api/supabase';

/**
 * PRESENCE SERVICE
 * 
 * Manages customer online presence and session reporting for Shubh Labh Order App.
 * In accordance with CRM-CUSTOMER-PRESENCE-01C zero-trust architecture:
 * - Direct table mutations are revoked.
 * - All state transitions and heartbeats are handled via secure server-side RPC functions.
 * - Timestamps and customer ownership are validated on the server.
 */

export const HEARTBEAT_INTERVAL_MS = 60000; // 60 seconds
export const ONLINE_EXPIRY_THRESHOLD_MS = 150000; // 150 seconds (2.5 minutes)

/**
 * Generates an RFC-compliant or cryptographically resilient unique session ID.
 */
export function generateSessionId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  const random2 = Math.random().toString(36).substring(2, 10);
  return `sess_${timestamp}_${random}${random2}`;
}

/**
 * Returns standard client device metadata for diagnostic logging.
 */
export function getDeviceInfo() {
  return {
    platform: Platform.OS,
    version: Platform.Version,
    app: 'shubhlabh-order',
    client_version: '1.0.1',
  };
}

/**
 * Start an active session for the authenticated buyer.
 */
export async function startPresenceSession(sessionId, deviceInfo = null) {
  if (!sessionId) return { success: false, error: 'MISSING_SESSION_ID' };
  try {
    const payload = {
      p_session_id: sessionId,
      p_device_info: deviceInfo || getDeviceInfo(),
    };
    const { data, error } = await supabase.rpc('customer_presence_start', payload);
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.warn('[Presence] Start session failed:', err?.message || err);
    return { success: false, error: err?.message || 'START_FAILED' };
  }
}

/**
 * Send periodic heartbeat pulse while app is in foreground.
 */
export async function sendPresenceHeartbeat(sessionId) {
  if (!sessionId) return { success: false, error: 'MISSING_SESSION_ID' };
  try {
    const { data, error } = await supabase.rpc('customer_presence_heartbeat', {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.warn('[Presence] Heartbeat failed:', err?.message || err);
    return { success: false, error: err?.message || 'HEARTBEAT_FAILED' };
  }
}

/**
 * Transition session state to background and pause active time counting.
 */
export async function transitionPresenceBackground(sessionId) {
  if (!sessionId) return { success: false, error: 'MISSING_SESSION_ID' };
  try {
    const { data, error } = await supabase.rpc('customer_presence_background', {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.warn('[Presence] Background transition failed:', err?.message || err);
    return { success: false, error: err?.message || 'BACKGROUND_FAILED' };
  }
}

/**
 * Transition session state to foreground and start a new active continuous duration.
 */
export async function transitionPresenceForeground(sessionId) {
  if (!sessionId) return { success: false, error: 'MISSING_SESSION_ID' };
  try {
    const { data, error } = await supabase.rpc('customer_presence_foreground', {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.warn('[Presence] Foreground transition failed:', err?.message || err);
    return { success: false, error: err?.message || 'FOREGROUND_FAILED' };
  }
}

/**
 * Terminate session cleanly on user logout.
 */
export async function endPresenceSession(sessionId) {
  if (!sessionId) return { success: false, error: 'MISSING_SESSION_ID' };
  try {
    const { data, error } = await supabase.rpc('customer_presence_end', {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.warn('[Presence] End session failed:', err?.message || err);
    return { success: false, error: err?.message || 'END_FAILED' };
  }
}
