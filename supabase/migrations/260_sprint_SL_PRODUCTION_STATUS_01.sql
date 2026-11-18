-- Migration 260: Production Status Tracking on requirement_items
-- Sprint: SL-PRODUCTION-STATUS-01 & SL-PRODUCTION-STATUS-02
-- Objective: Introduce production completion tracking on requirement items without modifying dispatch status.

-- 1. Add columns to public.requirement_items
ALTER TABLE public.requirement_items
  ADD COLUMN IF NOT EXISTS production_done BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS production_done_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS production_done_by UUID NULL REFERENCES public.app_users(id) ON DELETE SET NULL;

-- 2. Performance indexes for production queries and item lookups
CREATE INDEX IF NOT EXISTS idx_requirement_items_production ON public.requirement_items (production_done);
CREATE INDEX IF NOT EXISTS idx_requirement_items_req_prod ON public.requirement_items (requirement_id, production_done);

-- 3. Comments for documentation
COMMENT ON COLUMN public.requirement_items.production_done IS 'True when factory production for this line item has been completed.';
COMMENT ON COLUMN public.requirement_items.production_done_at IS 'Timestamp when production was marked completed.';
COMMENT ON COLUMN public.requirement_items.production_done_by IS 'Staff user (app_users.id) who marked production completed.';

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
