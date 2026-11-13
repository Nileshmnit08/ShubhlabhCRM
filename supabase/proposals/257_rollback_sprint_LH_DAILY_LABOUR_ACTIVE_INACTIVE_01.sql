-- 257_rollback_sprint_LH_DAILY_LABOUR_ACTIVE_INACTIVE_01.sql
-- Rollback for 257_sprint_LH_DAILY_LABOUR_ACTIVE_INACTIVE_01.sql

BEGIN;

DROP FUNCTION IF EXISTS public.lh_set_labourer_day_status(uuid, date, uuid, boolean, text) CASCADE;
DROP TABLE IF EXISTS public.labour_daily_labourer_status CASCADE;

COMMIT;

