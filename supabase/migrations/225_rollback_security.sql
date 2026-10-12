-- ============================================================================
-- HARDENED ROLLBACK SCRIPT: 225_rollback_security.sql
-- Description: Safely rolls back Migration 225 changes if needed,
--              dropping buyer policies/RPCs and restoring staff operational baseline
--              without reopening anonymous access or permissive leaks.
-- ============================================================================

-- Step 1: Drop Buyer App read RPC cleanly
DROP FUNCTION IF EXISTS public.get_buyer_my_schemes();

-- Step 2: Drop all policies created by Migration 225
DROP POLICY IF EXISTS "Authenticated users can view active schemes" ON public.dealer_schemes;
DROP POLICY IF EXISTS "Admins can manage schemes" ON public.dealer_schemes;

DROP POLICY IF EXISTS "Authenticated users can view scheme slabs" ON public.dealer_scheme_slabs;
DROP POLICY IF EXISTS "Admins can manage scheme slabs" ON public.dealer_scheme_slabs;

DROP POLICY IF EXISTS "Staff can manage requirement dispatches" ON public.requirement_dispatches;
DROP POLICY IF EXISTS "Buyers can view own dispatches" ON public.requirement_dispatches;

DROP POLICY IF EXISTS "Staff can manage reward eligibility" ON public.dealer_reward_eligibility;
DROP POLICY IF EXISTS "Buyers can view own reward eligibility" ON public.dealer_reward_eligibility;

DROP POLICY IF EXISTS "Staff can view reward calculation audit" ON public.dealer_reward_calculation_audit;

DROP POLICY IF EXISTS "Staff can manage dealer targets" ON public.dealer_targets;
DROP POLICY IF EXISTS "Buyers can view own dealer targets" ON public.dealer_targets;

DROP POLICY IF EXISTS "Staff can manage reward ledger" ON public.dealer_reward_ledger;
DROP POLICY IF EXISTS "Buyers can view own reward ledger" ON public.dealer_reward_ledger;

DROP POLICY IF EXISTS "Staff can manage reward claims" ON public.dealer_reward_claims;
DROP POLICY IF EXISTS "Buyers can view own reward claims" ON public.dealer_reward_claims;

-- Step 3: Restore Staff Operational Baseline (Without re-opening anonymous or buyer leaks)
CREATE POLICY "Staff fallback on dealer_schemes"
  ON public.dealer_schemes FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Staff fallback on dealer_scheme_slabs"
  ON public.dealer_scheme_slabs FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Staff fallback on requirement_dispatches"
  ON public.requirement_dispatches FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Staff fallback on dealer_reward_eligibility"
  ON public.dealer_reward_eligibility FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

-- Step 4: Retain security hardening on functions (Do not re-grant to PUBLIC)
REVOKE EXECUTE ON FUNCTION public.get_customer_scheme_performance() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_dealer_scheme_eligibility(UUID, UUID) FROM PUBLIC, anon;
