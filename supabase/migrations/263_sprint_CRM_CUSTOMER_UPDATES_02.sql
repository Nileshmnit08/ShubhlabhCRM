-- Migration 263: Customer Updates - App Visibility & Soft Deactivation
-- Sprint: CRM-CUSTOMER-UPDATES-02
-- Objective: Add independent Customer App visibility control and soft-deactivation tracking to business_updates

-- 1. Add columns to public.business_updates
ALTER TABLE public.business_updates 
  ADD COLUMN IF NOT EXISTS is_visible_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deactivated_by UUID NULL REFERENCES auth.users(id);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_business_updates_active_visible ON public.business_updates (is_active, is_visible_in_app, status);
CREATE INDEX IF NOT EXISTS idx_business_updates_published_visible ON public.business_updates (published_at DESC) WHERE is_active = TRUE AND is_visible_in_app = TRUE;

-- 3. Update Row Level Security (RLS) for Customer Order App buyers
-- Only active, visible updates targeted to ALL or the specific authenticated buyer are accessible
DROP POLICY IF EXISTS "Buyers view published updates" ON public.business_updates;
CREATE POLICY "Buyers view published updates" ON public.business_updates 
FOR SELECT USING (
    is_active = TRUE AND 
    is_visible_in_app = TRUE AND 
    status IN ('PUBLISHED', 'CLOSED') AND (
        audience_type = 'ALL' OR 
        id IN (
            SELECT update_id FROM public.business_update_recipients r 
            JOIN public.app_users au ON r.customer_id = au.crm_party_id 
            WHERE au.id = auth.uid()
        )
    )
);

-- 4. Documentation comments
COMMENT ON COLUMN public.business_updates.is_visible_in_app IS 'Controls whether this update is visible to customers in the Customer Order App.';
COMMENT ON COLUMN public.business_updates.is_active IS 'Soft deactivation flag. False indicates the update has been deactivated/archived.';
COMMENT ON COLUMN public.business_updates.deactivated_at IS 'Timestamp when the update was soft-deactivated.';
COMMENT ON COLUMN public.business_updates.deactivated_by IS 'User ID who soft-deactivated the update.';

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
