/**
 * CallHistoryService.js
 * Fetches and enriches call_sessions records for the current user.
 * Caches to AsyncStorage for fast load / offline viewing.
 */
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@call_history_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Status/Direction Resolution ─────────────────────────────────────────────

/**
 * Resolves the user-visible status label given raw DB status and direction.
 */
export function resolveCallStatus(rawStatus, direction) {
  switch (rawStatus) {
    case 'ENDED': return 'COMPLETED';
    case 'MISSED':
      return direction === 'INCOMING' ? 'MISSED' : 'NO_ANSWER';
    case 'REJECTED':
      return direction === 'INCOMING' ? 'DECLINED' : 'DECLINED_BY_OTHER';
    case 'CANCELLED':
      return direction === 'INCOMING' ? 'MISSED' : 'CANCELLED';
    case 'FAILED': return 'FAILED';
    default: return rawStatus || 'UNKNOWN';
  }
}

/**
 * Returns whether a call entry should be highlighted as a missed call
 * for the current user.
 */
export function isMissedCall(entry) {
  return (
    entry.direction === 'INCOMING' &&
    (entry.resolvedStatus === 'MISSED' || entry.resolvedStatus === 'DECLINED')
  );
}

// ─── Duration Formatting ──────────────────────────────────────────────────────

/**
 * Format duration_seconds → "m:ss" string.
 */
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Date Group Helpers ───────────────────────────────────────────────────────

/**
 * Returns a group label for a date: 'Today', 'Yesterday', or a locale date string.
 */
export function getDateGroup(dateString) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Given a flat array of enriched call entries, return an array of sections:
 * [{ title: 'Today', data: [...] }, ...]
 */
export function groupCallHistory(entries) {
  const groups = {};
  const order = [];
  for (const entry of entries) {
    const key = getDateGroup(entry.created_at);
    if (!groups[key]) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(entry);
  }
  return order.map(title => ({ title, data: groups[title] }));
}

// ─── Core Query ───────────────────────────────────────────────────────────────

/**
 * Enriches a raw call_sessions row into a display-ready entry.
 */
function enrichEntry(row, currentUserId) {
  const isOutgoing = row.caller_id === currentUserId;
  const direction = isOutgoing ? 'OUTGOING' : 'INCOMING';
  const resolvedStatus = resolveCallStatus(row.status, direction);

  const otherParticipant = isOutgoing
    ? (row.receiver || { id: row.receiver_id, display_name: 'Unknown', role: null })
    : (row.caller || { id: row.caller_id, display_name: 'Unknown', role: null });

  return {
    id: row.id,
    caller_id: row.caller_id,
    receiver_id: row.receiver_id,
    call_type: row.call_type,
    status: row.status,
    resolvedStatus,
    direction,
    otherParticipant,
    created_at: row.created_at,
    answered_at: row.answered_at,
    connected_at: row.connected_at,
    ended_at: row.ended_at,
    duration_seconds: row.duration_seconds,
    durationFormatted: formatDuration(row.duration_seconds),
    end_reason: row.end_reason,
    isMissed: isMissedCall({ direction, resolvedStatus }),
  };
}

/**
 * Fetch the call history for `currentUserId`.
 * Uses participant-isolated RLS (no extra filtering needed — Supabase returns only
 * rows where caller_id = userId OR receiver_id = userId via RLS policies).
 *
 * Returns { data: enriched[], sections: grouped[], error }.
 */
export async function getCallHistory(currentUserId) {
  if (!currentUserId) return { data: [], sections: [], error: 'No user ID' };

  try {
    const { data: rows, error } = await supabase
      .from('call_sessions')
      .select(`
        id,
        caller_id,
        receiver_id,
        call_type,
        status,
        created_at,
        ringing_at,
        answered_at,
        connected_at,
        ended_at,
        duration_seconds,
        end_reason,
        caller:app_users!call_sessions_caller_id_fkey(id, display_name, role),
        receiver:app_users!call_sessions_receiver_id_fkey(id, display_name, role)
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    const enriched = (rows || []).map(r => enrichEntry(r, currentUserId));

    // Persist to cache
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), userId: currentUserId, data: enriched }));
    } catch (_) { /* cache write failure is non-fatal */ }

    return {
      data: enriched,
      sections: groupCallHistory(enriched),
      error: null,
    };
  } catch (err) {
    console.error('[CallHistoryService] fetch error:', err);

    // Try cache fallback
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.userId === currentUserId && Date.now() - cached.ts < CACHE_TTL_MS) {
          return {
            data: cached.data,
            sections: groupCallHistory(cached.data),
            error: null,
            fromCache: true,
          };
        }
      }
    } catch (_) { /* ignore */ }

    return { data: [], sections: [], error: err?.message || 'Failed to load call history' };
  }
}

/**
 * Clear the call history cache.
 */
export async function clearCallHistoryCache() {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (_) { /* ignore */ }
}
