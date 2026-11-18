-- Rollback Migration 260
-- Sprint: SL-PRODUCTION-STATUS-01 & SL-PRODUCTION-STATUS-02

DROP INDEX IF EXISTS idx_requirement_items_req_prod;
DROP INDEX IF EXISTS idx_requirement_items_production;

ALTER TABLE public.requirement_items
  DROP COLUMN IF EXISTS production_done_by,
  DROP COLUMN IF EXISTS production_done_at,
  DROP COLUMN IF EXISTS production_done;

NOTIFY pgrst, 'reload schema';
