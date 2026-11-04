-- 252_rollback_sprint_LH_DAILY_REGISTER_APPROVAL_01.sql
-- PROPOSAL — NOT APPLIED. Stops the daily-register workflow without losing data:
-- the triggers, decision function and CRM view are removed; the registers, their event log,
-- the entry correction history and the recorded_at / work_completed_at values are KEPT
-- (closed to clients) so no approval or audit record disappears. Re-applying 252 resumes.

BEGIN;

DROP TRIGGER IF EXISTS lh_96_register ON public.daily_work_entries;
DROP TRIGGER IF EXISTS lh_96_register ON public.labour_work_allocations;
DROP TRIGGER IF EXISTS lh_96_register ON public.daily_work_details;
DROP TRIGGER IF EXISTS lh_95_history ON public.daily_work_entries;
DROP TRIGGER IF EXISTS lh_06_keep_recorded_at ON public.daily_work_entries;

DROP VIEW IF EXISTS public.v_lh_daily_registers;
DROP FUNCTION IF EXISTS public.lh_decide_daily_register(uuid, date, varchar, int, text);
DROP FUNCTION IF EXISTS public.lh_entry_register_trigger();
DROP FUNCTION IF EXISTS public.lh_child_register_trigger();
DROP FUNCTION IF EXISTS public.lh_register_changed(uuid, date);
DROP FUNCTION IF EXISTS public.lh_log_entry_history();
DROP FUNCTION IF EXISTS public.lh_keep_recorded_at();

REVOKE ALL ON public.labour_daily_registers, public.labour_daily_register_events, public.lh_work_entry_history
    FROM PUBLIC, anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
