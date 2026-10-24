-- ============================================================================
-- PROPOSED MIGRATION: 244_sprint_ATTENDANCE_LOCATION_ACCESS_01.sql
-- SPRINT: FA-ATTENDANCE-LOCATION-03 remediation — coordinates readable by admins only
--
-- STATUS: PROPOSED — NOT APPLIED — REQUIRES PRODUCT OWNER APPROVAL
-- Rollback: supabase/proposals/244_rollback_sprint_ATTENDANCE_LOCATION_ACCESS_01.sql
--
-- PROBLEM (code-verified, live confirmation pending):
--   staff_attendance location coordinates are columns on the employee's own row.
--   Row-level policy "Staff can view own attendance" plus the default table-level
--   SELECT grant lets an employee read their own latitude/longitude through the
--   API. Field Assist itself reads them today:
--     mobileFieldStaff/src/services/AttendanceService.js
--       :110 probe selects check_in_latitude / check_out_latitude
--       :124 fetchServerDay  select('*')
--       :144 fetchHistory    select('*')
--   Requirement: only authorised managers/admins may read precise coordinates.
--
-- DESIGN: column privileges, not RLS changes.
--   - authenticated keeps SELECT on every column EXCEPT the four coordinates.
--     (accuracy, capture time and status stay readable: not precise location.)
--   - INSERT/UPDATE grants and all RLS policies are unchanged, so employees still
--     write their own coordinates at check-in/out.
--   - Admins read coordinates only through admin_attendance_locations(), which
--     checks is_admin() server-side (SECURITY DEFINER, fixed search_path) and
--     limits each call to a 0-92 day window. An expired or missing session has
--     auth.uid() = NULL, so is_admin() is false and the call is refused (42501).
--     The function bypasses RLS by design, guarded only by is_admin(); it returns
--     location fields keyed by attendance_id and nothing else.
--
-- REQUIRED ORDER (otherwise older app builds break with 42501 on select('*')):
--   1. Ship the Field Assist update that never selects coordinate columns.
--      IMPLEMENTED in FA-LOCATION-FINAL-02 (mobileFieldStaff/src/utils/attendance.js
--      ATTENDANCE_READ_COLUMNS / LOCATION_PROBE_COLUMNS; merge keeps the locally
--      captured check-in location for the check-out upsert). Install that APK on
--      EVERY staff device before step 3; older builds still use select('*').
--      The CRM Attendance Register reads coordinates only via the function below.
--   2. Validate on a staging copy (MANDATORY): an app upsert ON CONFLICT
--      (staff_id, business_date) DO UPDATE SET <coordinate> = EXCLUDED.<coordinate>
--      must still succeed for an employee without SELECT on the coordinate
--      columns. If PostgreSQL requires SELECT for the EXCLUDED references, use the
--      alternative design below instead of this file.
--   3. Apply this file. 4. Build the CRM location view against the function.
--
-- ALTERNATIVE DESIGN (if step 2 fails): separate table
--   staff_attendance_locations(attendance_id, event, latitude, longitude, ...)
--   RLS: INSERT own; SELECT is_admin() only. Changes the app write path.
-- ============================================================================

-- 1. Column-level read access: everything except the four coordinates.
REVOKE SELECT ON public.staff_attendance FROM authenticated;
GRANT SELECT (
    id, staff_id, business_date, check_in_at, check_out_at, status,
    check_in_server_received_at, check_out_server_received_at, created_at, updated_at,
    check_in_accuracy_m, check_in_location_at, check_in_location_status,
    check_out_accuracy_m, check_out_location_at, check_out_location_status
) ON public.staff_attendance TO authenticated;
-- anon: unchanged (no access). INSERT/UPDATE: unchanged.

-- 2. Admin-only coordinate read path.
CREATE OR REPLACE FUNCTION public.admin_attendance_locations(
    p_from date,
    p_to date,
    p_staff uuid DEFAULT NULL
)
RETURNS TABLE (
    attendance_id uuid,
    staff_id uuid,
    business_date date,
    check_in_latitude double precision,
    check_in_longitude double precision,
    check_in_accuracy_m real,
    check_in_location_at timestamptz,
    check_in_location_status text,
    check_out_latitude double precision,
    check_out_longitude double precision,
    check_out_accuracy_m real,
    check_out_location_at timestamptz,
    check_out_location_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Not authorised to read attendance locations' USING ERRCODE = '42501';
    END IF;
    IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 92 THEN
        RAISE EXCEPTION 'Date range must be 0-92 days' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY
        SELECT a.id, a.staff_id, a.business_date,
               a.check_in_latitude, a.check_in_longitude, a.check_in_accuracy_m,
               a.check_in_location_at, a.check_in_location_status,
               a.check_out_latitude, a.check_out_longitude, a.check_out_accuracy_m,
               a.check_out_location_at, a.check_out_location_status
        FROM public.staff_attendance a
        WHERE a.business_date BETWEEN p_from AND p_to
          AND (p_staff IS NULL OR a.staff_id = p_staff);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_attendance_locations(date, date, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_attendance_locations(date, date, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_attendance_locations(date, date, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Verification after applying (read-only, run as an employee session and an admin session):
--   employee: select check_in_latitude from staff_attendance limit 1   -> 42501
--   employee: select check_in_location_status from staff_attendance    -> own rows only
--   employee: rpc admin_attendance_locations                           -> 42501
--   admin:    rpc admin_attendance_locations(from, to)                 -> coordinates
