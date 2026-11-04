-- LH-SHARED-DATA-01: link the LabourHisaab phone account to its contractor so cloud sync can upload.
-- NOT APPLIED. Run in the Supabase SQL editor as the project owner, one step at a time.
-- Evidence (device log, 2026-11-04 06:37): app signed in, contractor_members query succeeded
-- with 0 active rows → sync stops before uploading ("इस खाते को किसी ठेकेदार से नहीं जोड़ा गया है").
-- No schema, RLS or grant changes. Step 3 is the only write: one membership row (+ one contractor row if none exists).

-- ── Step 1 (read-only): confirm the 249 tables are live and see what exists ──────────────
SELECT to_regclass('public.contractor_members') AS members_tbl,
       to_regclass('public.daily_work_entries') AS entries_tbl,
       to_regclass('public.v_labour_work_lines') AS lines_view;
SELECT id, name, is_active FROM public.contractors ORDER BY created_at;
SELECT cm.contractor_id, cm.role, cm.is_active, u.email
  FROM public.contractor_members cm JOIN auth.users u ON u.id = cm.user_id;

-- ── Step 2 (read-only): find the auth user the phone signed in with ─────────────────────
-- The phone signed in at 2026-11-03/04, so it is among the most recent sign-ins.
SELECT email, created_at, last_sign_in_at FROM auth.users
 ORDER BY last_sign_in_at DESC NULLS LAST LIMIT 10;

-- ── Step 3 (write, needs PO approval): link the user as Owner ───────────────────────────
-- 3a. Only if Step 1 returned no real contractor: create it with the REAL name (no demo data).
-- INSERT INTO public.contractors (name, phone) VALUES ('<REAL_CONTRACTOR_NAME>', NULL) RETURNING id;

-- 3b. Run this block ALONE after editing the two values on the v_name / v_email lines.
--     It looks up both ids itself and stops (writing nothing) unless exactly one active
--     contractor and exactly one account match.
DO $$
DECLARE
    v_name  text := 'REAL CONTRACTOR NAME';      -- edit: exactly as shown by Step 1
    v_email text := 'phone-login@example.com';   -- edit: the email the phone signed in with
    v_contractor uuid; v_user uuid; n int;
BEGIN
    SELECT count(*), min(id::text)::uuid INTO n, v_contractor FROM public.contractors WHERE name = v_name AND is_active;
    IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 active contractor named "%", found %', v_name, n; END IF;
    SELECT count(*), min(id::text)::uuid INTO n, v_user FROM auth.users WHERE lower(email) = lower(trim(v_email));
    IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 account with email "%", found %', v_email, n; END IF;
    INSERT INTO public.contractor_members (contractor_id, user_id, role, is_active)
    VALUES (v_contractor, v_user, 'Owner', true)
    ON CONFLICT (contractor_id, user_id) DO UPDATE SET role = 'Owner', is_active = true, updated_at = now();
    RAISE NOTICE 'Linked user % to contractor % as Owner', v_user, v_contractor;
END $$;

-- 3c. Confirm (read-only):
SELECT c.name, u.email, cm.role, cm.is_active
  FROM public.contractor_members cm
  JOIN public.contractors c ON c.id = cm.contractor_id
  JOIN auth.users u ON u.id = cm.user_id;
-- Rollback for step 3 (same two values):
-- DELETE FROM public.contractor_members cm USING public.contractors c, auth.users u
--  WHERE cm.contractor_id = c.id AND cm.user_id = u.id AND c.name = 'REAL CONTRACTOR NAME' AND lower(u.email) = lower('phone-login@example.com');

-- A second phone: sign in with its own account, then repeat Step 3 for that user
-- (role 'Manager' to edit, 'Viewer' to only read; 'Operator' = add/update only, needs 251).
-- After 251, the Owner (or a CRM admin) can do this from the app/CRM session instead, by email:
--   SELECT public.lh_add_member_by_email('<CONTRACTOR_ID>', 'operator@example.com', 'Operator');
-- The operator must have created an account and signed in once; nobody is linked automatically.
-- CRM admins need no row: is_admin() reads all contractors, read-only.

-- ── Step 4 (read-only, after the phone shows "सिंक हो गया"): verify the real 2/3 Nov records ──
SELECT e.work_date, e.work_type, e.total_bags, e.total_weight_kg, e.calculated_labour_amount,
       count(a.id) AS labourers, coalesce(sum(a.allocated_amount), 0) AS allocated
  FROM public.daily_work_entries e
  LEFT JOIN public.labour_work_allocations a ON a.work_entry_id = e.id
 WHERE e.work_date IN ('2026-11-02', '2026-11-03')
 GROUP BY e.id ORDER BY e.work_date;
-- Expected from the phone's storage: 2026-11-02 pallet 550 bags ₹5,775; 2026-11-03 pallet 100 bags ₹1,050; 6 labourers each.
SELECT count(*) AS labourers FROM public.labourers WHERE contractor_id = '<CONTRACTOR_ID>';
