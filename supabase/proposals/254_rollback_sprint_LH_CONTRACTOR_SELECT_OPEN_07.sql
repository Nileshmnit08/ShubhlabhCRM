-- 254_rollback_sprint_LH_CONTRACTOR_SELECT_OPEN_07.sql
-- PROPOSAL — NOT APPLIED. Removes open selection. Memberships created by selection are KEPT
-- (they carry work history and audit); an Owner/admin can deactivate them with lh_set_member.
-- The lh_operators list and the source column are kept (closed to clients) for audit.

BEGIN;

DROP FUNCTION IF EXISTS public.lh_select_contractor(uuid);
DROP FUNCTION IF EXISTS public.lh_list_active_contractors();
DROP FUNCTION IF EXISTS public.lh_set_operator(text, boolean);
DROP FUNCTION IF EXISTS public.lh_is_operator();
REVOKE ALL ON public.lh_operators FROM PUBLIC, anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
