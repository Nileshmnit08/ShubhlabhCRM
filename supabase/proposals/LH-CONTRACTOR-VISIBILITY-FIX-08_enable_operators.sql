-- LH-CONTRACTOR-VISIBILITY-FIX-08: make active contractors visible/selectable for approved operators.
-- NOT APPLIED. Run in the Supabase SQL editor as the project owner, one step at a time, after PO approval.
--
-- Root cause: proposal 254 is not installed, so the app falls back to listing only the account's
-- own contractor_members rows; accounts with no membership see an empty list. After 254, an
-- account must ALSO be an approved LabourHisaab operator (public.lh_operators).
-- Note: lh_set_operator() checks is_admin() for the CALLER; in the SQL editor there is no signed-in
-- user (auth.uid() is NULL), so it refuses. Step 3 therefore inserts into lh_operators directly
-- (same effect as lh_set_operator by a CRM admin).

-- ── Step 1 (read-only): current state ───────────────────────────────────────
SELECT to_regprocedure('public.lh_list_active_contractors()') AS list_fn,
       to_regprocedure('public.lh_select_contractor(uuid)')  AS select_fn,
       to_regclass('public.lh_operators')                    AS operators_tbl;
SELECT u.email, u.last_sign_in_at,
       (SELECT count(*) FROM public.contractor_members m WHERE m.user_id = u.id AND m.is_active) AS active_memberships
  FROM auth.users u
 WHERE lower(u.email) IN (lower('<OPERATOR_EMAIL_1>'), lower('<OPERATOR_EMAIL_2>'));   -- replace
SELECT name, is_active FROM public.contractors ORDER BY name;

-- ── Step 2 (schema, needs approval): install proposal 254 ───────────────────
--   Run the whole file supabase/proposals/254_sprint_LH_CONTRACTOR_SELECT_OPEN_07.sql.

-- ── Step 3 (data write, needs approval): approve the operator accounts ──────
--   Grants ONLY: see all active contractors and choose one (which gives an Operator membership
--   in the chosen contractor). Never Owner/Admin; no member management; no deletes; no approvals.
INSERT INTO public.lh_operators (user_id, is_active)
SELECT u.id, true FROM auth.users u
 WHERE lower(u.email) IN (lower('<OPERATOR_EMAIL_1>'), lower('<OPERATOR_EMAIL_2>'))      -- replace
ON CONFLICT (user_id) DO UPDATE SET is_active = true, updated_at = now()
RETURNING user_id;
-- Expect one row per email. Fewer rows = that email has no account yet (sign in to the app first).

-- ── Step 4 (read-only): verify ──────────────────────────────────────────────
SELECT u.email, o.is_active, o.created_at
  FROM public.lh_operators o JOIN auth.users u ON u.id = o.user_id ORDER BY u.email;

-- Rollback of step 3 (keeps any memberships already created by selecting a contractor):
-- UPDATE public.lh_operators SET is_active = false, updated_at = now()
--  WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) IN (lower('<OPERATOR_EMAIL_1>'), lower('<OPERATOR_EMAIL_2>')));
