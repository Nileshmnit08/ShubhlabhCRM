/**
 * CRM-NAV-02: useNavBadges
 *
 * Custom hook that fetches real badge counts from Supabase.
 *
 * Rules:
 *  - Never return fake/hardcoded counts
 *  - Gracefully fall back to 0 on any query failure
 *  - Never display "0" badges (the Sidebar hides badges when count === 0)
 *  - Never create new tables or modify any schema
 *  - Queries are read-only
 *
 * Badge sources:
 *   followups     → count of overdue + due today, not completed
 *   requirements  → count of open/pending requirements
 *   dispatches    → count of pending dispatches
 *   payments      → count of overdue collections
 *   issues        → 0 (no dedicated issues table in schema — BLOCKED)
 *   notifications → count of unread crm_notifications for this user
 */

import { useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from './supabase';
import { AuthContext } from '../AuthContext';

const REFRESH_INTERVAL_MS = 60 * 1000; // refresh every 60 seconds

export default function useNavBadges() {
  const { userProfile } = useContext(AuthContext);
  const [badges, setBadges] = useState({
    followups: 0,
    requirements: 0,
    dispatches: 0,
    payments: 0,
    issues: 0,
    notifications: 0,
  });

  const fetchBadges = useCallback(async () => {
    if (!userProfile) return;

    const isAdmin = userProfile.role === 'Admin';
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const results = {
      followups: 0,
      requirements: 0,
      dispatches: 0,
      payments: 0,
      issues: 0,
      notifications: 0,
    };

    // ─── Follow-ups: overdue + due today (not completed/cancelled) ───
    try {
      const { count } = await supabase
        .from('follow_ups')
        .select('id', { count: 'exact', head: true })
        .lte('scheduled_date', today)
        .not('status', 'in', '("completed","cancelled","done")');
      if (typeof count === 'number') results.followups = count;
    } catch (_) {
      // silent fallback
    }

    // ─── Requirements: open/pending (all users) ───
    try {
      const { count } = await supabase
        .from('requirements')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'open', 'new']);
      if (typeof count === 'number') results.requirements = count;
    } catch (_) {
      // silent fallback
    }

    // ─── Dispatches: pending (all users) ───
    try {
      const { count } = await supabase
        .from('dispatches')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (typeof count === 'number') results.dispatches = count;
    } catch (_) {
      // silent fallback
    }

    // ─── Payments: overdue collections (admin only) ───
    if (isAdmin) {
      try {
        // payment_outcomes table tracks payment status
        const { count } = await supabase
          .from('payment_outcomes')
          .select('id', { count: 'exact', head: true })
          .eq('outcome', 'overdue');
        if (typeof count === 'number') results.payments = count;
      } catch (_) {
        // silent fallback
      }
    }

    // ─── Issues: BLOCKED — no dedicated issues table in schema ───
    // results.issues stays 0

    // ─── Notifications: unread for this user ───
    try {
      const { count } = await supabase
        .from('crm_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userProfile.id)
        .eq('is_read', false);
      if (typeof count === 'number') results.notifications = count;
    } catch (_) {
      // silent fallback
    }

    setBadges(results);
  }, [userProfile]);

  useEffect(() => {
    fetchBadges();
    const timer = setInterval(fetchBadges, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchBadges]);

  // Expose refresh so other components can trigger on mutation
  return { badges, refreshBadges: fetchBadges };
}
