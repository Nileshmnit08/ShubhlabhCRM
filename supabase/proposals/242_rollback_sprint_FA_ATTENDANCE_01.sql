-- ============================================================================
-- ROLLBACK for PROPOSED 242_sprint_FA_ATTENDANCE_01.sql
-- STATUS: PROPOSED — NOT APPLIED
--
-- WARNING: Dropping these tables deletes all attendance and leave records.
-- Before running in production, export both tables, e.g.:
--   COPY public.staff_attendance TO STDOUT WITH CSV HEADER;
--   COPY public.staff_leave_requests TO STDOUT WITH CSV HEADER;
-- ============================================================================

DROP TRIGGER IF EXISTS trg_fa_attendance_enforce ON public.staff_attendance;
DROP TRIGGER IF EXISTS trg_fa_leave_enforce ON public.staff_leave_requests;

DROP FUNCTION IF EXISTS public.fa_attendance_enforce();
DROP FUNCTION IF EXISTS public.fa_leave_enforce();

DROP TABLE IF EXISTS public.staff_attendance;
DROP TABLE IF EXISTS public.staff_leave_requests;

NOTIFY pgrst, 'reload schema';
