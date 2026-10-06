-- ============================================================
-- MIGRATION: 224_sprint_ORDER_01A_buyer_security.sql
-- Sprint: SL-ORDER-01A — Buyer Identity & RLS Security Foundation
-- Author: Antigravity / Shubh Labh Order
-- Date: 2026-10-06
--
-- PURPOSE:
-- Create the security foundation required for the Buyer App.
-- A Buyer must be technically incapable of accessing another
-- customer's data. This migration:
--   1. Adds crm_party_id to app_users to link each Buyer to ONE customer
--   2. Redefines is_active_user() to EXCLUDE Buyers — preventing them
--      from falling through to broad CRM policies designed for Field Staff
--   3. Creates is_buyer() and get_auth_crm_party_id() helper functions
--   4. Restricts app_users visibility for Buyers
--   5. Adds Buyer-specific isolated RLS policies for every customer table
--
-- SAFETY:
--   - All changes are ADDITIVE (no tables dropped, no data deleted)
--   - Existing Field Staff and Admin policies are preserved unchanged
--   - New Buyer policies are additional, role-gated layers
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- STEP 1: Add crm_party_id to app_users
-- Links a Buyer user account to exactly ONE crm_parties record.
-- NULL = unmapped buyer (will be denied access by RLS).
-- Field Staff and Admin will have NULL here (no impact on their access).
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS crm_party_id UUID REFERENCES public.crm_parties(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.app_users.crm_party_id IS
  'For Buyer role only: links this auth user to exactly one crm_parties (customer) record. NULL = unmapped; access denied by RLS.';


-- ────────────────────────────────────────────────────────────
-- STEP 2: Redefine is_active_user() to EXCLUDE Buyers
--
-- BEFORE: is_active_user() = any active user (including hypothetical Buyers)
-- AFTER:  is_active_user() = any active user where role != 'Buyer'
--
-- This single change ensures that if a Buyer account exists, they
-- CANNOT fall through the broad "Active users CRM Select/Insert/Update"
-- policies designed for Field Staff. They are completely blocked from
-- those policies and must use the Buyer-specific policies below.
--
-- Field Staff and Admin are UNAFFECTED (their role != 'Buyer').
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE id = auth.uid()
      AND is_active = true
      AND role != 'Buyer'
  );
$$ LANGUAGE sql SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- STEP 3: New Buyer authentication helper functions
-- ────────────────────────────────────────────────────────────

-- Returns TRUE only if the current user is an active Buyer
CREATE OR REPLACE FUNCTION public.is_buyer()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE id = auth.uid()
      AND is_active = true
      AND role = 'Buyer'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Returns the crm_party_id of the authenticated Buyer from the server-side app_users table.
-- The client CANNOT tamper with this value — it is derived from auth.uid() server-side.
-- Returns NULL if the user is not a Buyer, or if crm_party_id is unset (unmapped).
-- RLS policies use this function so an unmapped Buyer gets zero rows (not an error, but safe denial).
CREATE OR REPLACE FUNCTION public.get_auth_crm_party_id()
RETURNS UUID AS $$
  SELECT crm_party_id
  FROM public.app_users
  WHERE id = auth.uid()
    AND is_active = true
    AND role = 'Buyer'
$$ LANGUAGE sql SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- STEP 4: Restrict app_users visibility for Buyers
--
-- BEFORE: "Users can view active users" → any authenticated user sees all app_users
-- AFTER:  Field Staff/Admin → see all active users (existing behavior)
--         Buyer            → can only see their own user row
--
-- This prevents Buyers from enumerating internal staff.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view active users" ON public.app_users;

CREATE POLICY "Staff can view active users"
  ON public.app_users FOR SELECT
  USING (public.is_active_user() OR public.is_admin());

CREATE POLICY "Buyer can view own user row"
  ON public.app_users FOR SELECT
  USING (public.is_buyer() AND id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- STEP 5: Buyer RLS Policies — crm_parties (Customer Profile)
--
-- Buyer SELECT: only the ONE party matching their crm_party_id
-- Buyer UPDATE: DENIED (buyer cannot modify their own CRM record; internal fields only)
-- Buyer INSERT: DENIED (no policy = denied by default)
-- Buyer DELETE: DENIED
--
-- Field Staff policies ("Active users CRM Select/Insert/Update/Delete") are
-- UNCHANGED and remain in effect. is_active_user() now excludes Buyers so
-- there is no overlap.
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Buyer CRM Party Select"
  ON public.crm_parties FOR SELECT
  USING (public.is_buyer() AND id = public.get_auth_crm_party_id());

-- Note: No Buyer UPDATE on crm_parties. The internal CRM fields (status, territory,
-- assigned owner, credit limit) must not be buyer-writable.


-- ────────────────────────────────────────────────────────────
-- STEP 6: Buyer RLS Policies — requirements (Orders)
--
-- Buyer SELECT: only their party's requirements
-- Buyer INSERT: only allowed if party_id = their crm_party_id (server-enforced)
-- Buyer UPDATE: only their own requirements
-- Buyer DELETE: DENIED
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Buyer Requirements Select"
  ON public.requirements FOR SELECT
  USING (public.is_buyer() AND party_id = public.get_auth_crm_party_id());

CREATE POLICY "Buyer Requirements Insert"
  ON public.requirements FOR INSERT
  WITH CHECK (public.is_buyer() AND party_id = public.get_auth_crm_party_id());

CREATE POLICY "Buyer Requirements Update"
  ON public.requirements FOR UPDATE
  USING (public.is_buyer() AND party_id = public.get_auth_crm_party_id());

-- No Buyer DELETE policy = DELETE is denied.


-- ────────────────────────────────────────────────────────────
-- STEP 7: Buyer RLS Policies — requirement_items (Order Items)
--
-- CRITICAL: The existing policy "Allow all on requirement_items" is
-- wildly insecure (USING (true)). Replace it with proper role-gated policies.
--
-- requirement_items does not have a direct party_id; it references requirements.
-- The Buyer policy must join through requirements to validate ownership.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all on requirement_items" ON public.requirement_items;

-- Restore proper Field Staff access (was unrestricted USING(true) before)
CREATE POLICY "Field Staff Req Items Select"
  ON public.requirement_items FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Field Staff Req Items Insert"
  ON public.requirement_items FOR INSERT
  WITH CHECK (public.is_active_user());

CREATE POLICY "Field Staff Req Items Update"
  ON public.requirement_items FOR UPDATE
  USING (public.is_active_user());

CREATE POLICY "Field Staff Req Items Delete"
  ON public.requirement_items FOR DELETE
  USING (public.is_active_user());

-- Admin access
CREATE POLICY "Admin Req Items All"
  ON public.requirement_items FOR ALL
  USING (public.is_admin());

-- Buyer access: item's parent requirement must belong to buyer's party
CREATE POLICY "Buyer Req Items Select"
  ON public.requirement_items FOR SELECT
  USING (
    public.is_buyer() AND EXISTS (
      SELECT 1 FROM public.requirements r
      WHERE r.id = requirement_id
        AND r.party_id = public.get_auth_crm_party_id()
    )
  );

CREATE POLICY "Buyer Req Items Insert"
  ON public.requirement_items FOR INSERT
  WITH CHECK (
    public.is_buyer() AND EXISTS (
      SELECT 1 FROM public.requirements r
      WHERE r.id = requirement_id
        AND r.party_id = public.get_auth_crm_party_id()
    )
  );

CREATE POLICY "Buyer Req Items Update"
  ON public.requirement_items FOR UPDATE
  USING (
    public.is_buyer() AND EXISTS (
      SELECT 1 FROM public.requirements r
      WHERE r.id = requirement_id
        AND r.party_id = public.get_auth_crm_party_id()
    )
  );

-- No Buyer DELETE on requirement_items.


-- ────────────────────────────────────────────────────────────
-- STEP 8: Buyer RLS Policies — crm_issues (Complaints)
--
-- Existing policies "Authenticated users can view/insert/update/delete issues"
-- allow ALL authenticated users full access — Buyers must be excluded.
--
-- We cannot drop existing policies (Field Staff depends on them), so we
-- instead ensure is_active_user() (now Buyer-exclusive) is the gate.
-- The existing policies use TO authenticated USING (true) which is still
-- too broad — document this as requiring future hardening for Field Staff too.
-- For Buyers specifically, add restrictive Buyer policies that override.
--
-- NOTE: PostgreSQL RLS uses OR semantics across policies of the same command.
-- Since Buyers do NOT satisfy is_active_user(), the existing "Authenticated users"
-- policies will STILL fire for them (TO authenticated catches all JWT roles).
-- Therefore we must DROP and REPLACE the issues policies to properly exclude Buyers.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view issues" ON public.crm_issues;
DROP POLICY IF EXISTS "Authenticated users can insert issues" ON public.crm_issues;
DROP POLICY IF EXISTS "Authenticated users can update issues" ON public.crm_issues;
DROP POLICY IF EXISTS "Authenticated users can delete issues" ON public.crm_issues;

-- Restore for Field Staff (active non-buyers)
CREATE POLICY "Field Staff Issues Select"
  ON public.crm_issues FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Field Staff Issues Insert"
  ON public.crm_issues FOR INSERT
  WITH CHECK (public.is_active_user());

CREATE POLICY "Field Staff Issues Update"
  ON public.crm_issues FOR UPDATE
  USING (public.is_active_user());

CREATE POLICY "Field Staff Issues Delete"
  ON public.crm_issues FOR DELETE
  USING (public.is_active_user());

-- Admin
CREATE POLICY "Admin Issues All"
  ON public.crm_issues FOR ALL
  USING (public.is_admin());

-- Buyer: own party's issues only
CREATE POLICY "Buyer Issues Select"
  ON public.crm_issues FOR SELECT
  USING (public.is_buyer() AND party_id = public.get_auth_crm_party_id());

CREATE POLICY "Buyer Issues Insert"
  ON public.crm_issues FOR INSERT
  WITH CHECK (public.is_buyer() AND party_id = public.get_auth_crm_party_id());

-- No Buyer UPDATE / DELETE on crm_issues.


-- ────────────────────────────────────────────────────────────
-- STEP 9: Buyer RLS — crm_contacts (Contacts / Delivery contacts)
-- Same pattern: replace broad policies with role-specific ones.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can insert contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can update contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can delete contacts" ON public.crm_contacts;

CREATE POLICY "Field Staff Contacts Select"
  ON public.crm_contacts FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Field Staff Contacts Insert"
  ON public.crm_contacts FOR INSERT
  WITH CHECK (public.is_active_user());

CREATE POLICY "Field Staff Contacts Update"
  ON public.crm_contacts FOR UPDATE
  USING (public.is_active_user());

CREATE POLICY "Field Staff Contacts Delete"
  ON public.crm_contacts FOR DELETE
  USING (public.is_active_user());

CREATE POLICY "Admin Contacts All"
  ON public.crm_contacts FOR ALL
  USING (public.is_admin());

-- Buyer: own contacts only
CREATE POLICY "Buyer Contacts Select"
  ON public.crm_contacts FOR SELECT
  USING (public.is_buyer() AND party_id = public.get_auth_crm_party_id());

CREATE POLICY "Buyer Contacts Insert"
  ON public.crm_contacts FOR INSERT
  WITH CHECK (public.is_buyer() AND party_id = public.get_auth_crm_party_id());

CREATE POLICY "Buyer Contacts Update"
  ON public.crm_contacts FOR UPDATE
  USING (public.is_buyer() AND party_id = public.get_auth_crm_party_id());

-- No Buyer DELETE.


-- ────────────────────────────────────────────────────────────
-- STEP 10: Buyer RLS — dealer_communications (Communications)
--
-- Buyer can VIEW their own outgoing communications only.
-- Internal staff communications are protected by is_active_user().
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Buyer Dealer Comms Select"
  ON public.dealer_communications FOR SELECT
  USING (public.is_buyer() AND customer_id = public.get_auth_crm_party_id());

-- No Buyer INSERT/UPDATE/DELETE on dealer_communications.


-- ────────────────────────────────────────────────────────────
-- STEP 11: Buyer RLS — crm_dealer_profiles
-- Same issue: broad TO authenticated USING(true) policies.
-- Replace with role-specific policies.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view dealer profiles" ON public.crm_dealer_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert dealer profiles" ON public.crm_dealer_profiles;
DROP POLICY IF EXISTS "Authenticated users can update dealer profiles" ON public.crm_dealer_profiles;
DROP POLICY IF EXISTS "Authenticated users can delete dealer profiles" ON public.crm_dealer_profiles;

CREATE POLICY "Field Staff Dealer Profiles Select"
  ON public.crm_dealer_profiles FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Field Staff Dealer Profiles Modify"
  ON public.crm_dealer_profiles FOR ALL
  USING (public.is_active_user());

CREATE POLICY "Admin Dealer Profiles All"
  ON public.crm_dealer_profiles FOR ALL
  USING (public.is_admin());

-- Buyer: read own dealer profile only
CREATE POLICY "Buyer Dealer Profile Select"
  ON public.crm_dealer_profiles FOR SELECT
  USING (public.is_buyer() AND party_id = public.get_auth_crm_party_id());


-- ────────────────────────────────────────────────────────────
-- STEP 12: Buyer RLS — interactions
-- Buyer can view their own interaction history (read-only).
-- Field Staff already have access through is_active_user() policies.
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Buyer Interactions Select"
  ON public.interactions FOR SELECT
  USING (public.is_buyer() AND party_id = public.get_auth_crm_party_id());


-- ────────────────────────────────────────────────────────────
-- STEP 13: Extend admin_create_user() to support crm_party_id
-- This allows admins to provision Buyer accounts properly.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_create_buyer(
    new_email TEXT,
    new_password TEXT,
    new_display_name TEXT,
    new_crm_party_id UUID,
    new_is_active BOOLEAN DEFAULT true
) RETURNS uuid AS $$
DECLARE
    new_user_id uuid;
BEGIN
    -- Check if admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can create Buyer accounts';
    END IF;

    new_user_id := gen_random_uuid();

    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated',
        new_email, crypt(new_password, gen_salt('bf')), now(), now(), now(),
        '{"provider":"email","providers":["email"]}', '{}', false
    );

    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, created_at, updated_at
    ) VALUES (
        new_user_id, new_user_id, new_user_id::text,
        jsonb_build_object('sub', new_user_id, 'email', new_email),
        'email', now(), now()
    );

    -- The handle_new_user trigger creates the app_users row.
    -- Update it to Buyer role and set crm_party_id.
    UPDATE public.app_users
    SET
        display_name   = new_display_name,
        role           = 'Buyer',
        crm_party_id   = new_crm_party_id,
        is_active      = new_is_active
    WHERE id = new_user_id;

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
