-- ============================================================================
-- ROLLBACK for PROPOSED 244_sprint_ATTENDANCE_LOCATION_ACCESS_01.sql
-- STATUS: PROPOSED — NOT APPLIED
-- Restores table-level SELECT for authenticated (employees can again read the
-- coordinates on their own rows) and removes the admin function. No data loss.
-- ============================================================================

DROP FUNCTION IF EXISTS public.admin_attendance_locations(date, date, uuid);

-- Column-level grants are superseded by the table-level grant.
REVOKE SELECT ON public.staff_attendance FROM authenticated;
GRANT SELECT ON public.staff_attendance TO authenticated;

NOTIFY pgrst, 'reload schema';
