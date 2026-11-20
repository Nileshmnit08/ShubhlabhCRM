/**
 * PRESENCE UTILITIES
 * 
 * Provides authoritative online/offline calculations, continuous foreground active duration,
 * IST timestamp formatting, and multi-device session aggregation for CRM Customer Access.
 */

export const ONLINE_EXPIRY_THRESHOLD_MS = 150000; // 150 seconds (2.5 minutes)

/**
 * Checks whether an individual session record is actively online.
 */
export function isSessionOnline(session, nowMs = Date.now()) {
  if (!session) return false;
  if (session.app_state !== 'active') return false;
  if (session.ended_at) return false;
  if (!session.last_seen_at) return false;

  const lastSeenMs = new Date(session.last_seen_at).getTime();
  if (isNaN(lastSeenMs)) return false;

  return (nowMs - lastSeenMs) <= ONLINE_EXPIRY_THRESHOLD_MS;
}

/**
 * Formats a duration in milliseconds into a concise, human-readable string.
 * Examples: '< 1m', '14m', '1h 22m', '3h'.
 */
export function formatActiveDuration(durationMs) {
  if (typeof durationMs !== 'number' || durationMs < 0 || isNaN(durationMs)) {
    return '< 1m';
  }

  const totalMinutes = Math.floor(durationMs / 60000);
  if (totalMinutes < 1) return '< 1m';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Formats a date string into Indian Standard Time (IST, UTC+5:30) with explicit timezone.
 * Example: '20 Nov 2026, 11:30 AM'.
 */
export function formatIST(dateInput) {
  if (!dateInput) return 'Never logged in';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Formats relative time in IST context (e.g. 'Today, 11:30 AM', 'Yesterday, 04:15 PM', or full date).
 */
export function formatRelativeIST(dateInput, nowMs = Date.now()) {
  if (!dateInput) return 'Never logged in';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Never logged in';

  const dateISTStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

  const nowISTStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(nowMs));

  const timePart = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  if (dateISTStr === nowISTStr) {
    return `Today, ${timePart}`;
  }

  // Calculate day difference
  const dateDay = new Date(dateISTStr).getTime();
  const nowDay = new Date(nowISTStr).getTime();
  const dayDiff = Math.round((nowDay - dateDay) / (1000 * 60 * 60 * 24));

  if (dayDiff === 1) {
    return `Yesterday, ${timePart}`;
  }

  return formatIST(date);
}

/**
 * Aggregates all sessions for a customer into an authoritative presence summary.
 * 
 * Rules:
 * - Customer is Online if AT LEAST ONE session is online (active, no ended_at, last_seen within 150s).
 * - Active Time represents the current continuous foreground duration (now - foreground_entered_at).
 * - Last Active represents the latest last_seen_at across all historical sessions.
 */
export function aggregateCustomerPresence(sessions = [], nowMs = Date.now()) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return {
      isOnline: false,
      activeDurationFormatted: null,
      activeDurationMs: null,
      lastActiveAt: null,
      lastActiveFormatted: 'Never logged in',
      lastActiveRelative: 'Never logged in',
      activeSessionCount: 0,
    };
  }

  let latestLastSeenMs = 0;
  let latestLastSeenIso = null;

  const onlineSessions = [];

  for (const sess of sessions) {
    if (sess.last_seen_at) {
      const ms = new Date(sess.last_seen_at).getTime();
      if (!isNaN(ms) && ms > latestLastSeenMs) {
        latestLastSeenMs = ms;
        latestLastSeenIso = sess.last_seen_at;
      }
    }

    if (isSessionOnline(sess, nowMs)) {
      onlineSessions.push(sess);
    }
  }

  const isOnline = onlineSessions.length > 0;

  let activeDurationFormatted = null;
  let activeDurationMs = null;

  if (isOnline) {
    // Find earliest active foreground entry among currently active sessions
    let earliestForegroundMs = nowMs;
    for (const s of onlineSessions) {
      const fgTime = s.foreground_entered_at || s.started_at;
      if (fgTime) {
        const ms = new Date(fgTime).getTime();
        if (!isNaN(ms) && ms < earliestForegroundMs) {
          earliestForegroundMs = ms;
        }
      }
    }

    activeDurationMs = Math.max(0, nowMs - earliestForegroundMs);
    activeDurationFormatted = formatActiveDuration(activeDurationMs);
  }

  return {
    isOnline,
    activeDurationFormatted,
    activeDurationMs,
    lastActiveAt: latestLastSeenIso,
    lastActiveFormatted: formatIST(latestLastSeenIso),
    lastActiveRelative: formatRelativeIST(latestLastSeenIso, nowMs),
    activeSessionCount: onlineSessions.length,
  };
}

/**
 * Groups an array of session records by crm_party_id and aggregates presence for each.
 */
export function buildCustomerPresenceMap(allSessions = [], nowMs = Date.now()) {
  const sessionsByParty = {};

  (allSessions || []).forEach((sess) => {
    if (sess && sess.crm_party_id) {
      if (!sessionsByParty[sess.crm_party_id]) {
        sessionsByParty[sess.crm_party_id] = [];
      }
      sessionsByParty[sess.crm_party_id].push(sess);
    }
  });

  const presenceMap = {};
  for (const partyId in sessionsByParty) {
    presenceMap[partyId] = aggregateCustomerPresence(sessionsByParty[partyId], nowMs);
  }

  return presenceMap;
}
