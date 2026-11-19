-- Rollback Migration 263
-- Sprint: CRM-CUSTOMER-UPDATES-02

-- 1. Restore original RLS policy
DROP POLICY IF EXISTS "Buyers view published updates" ON public.business_updates;
CREATE POLICY "Buyers view published updates" ON public.business_updates 
FOR SELECT USING (
    status = 'PUBLISHED' AND (
        audience_type = 'ALL' OR 
        id IN (
            SELECT update_id FROM public.business_update_recipients r 
            JOIN public.app_users au ON r.customer_id = au.crm_party_id 
            WHERE au.id = auth.uid()
        )
    )
);

-- 2. Drop indexes
DROP INDEX IF EXISTS idx_business_updates_published_visible;
DROP INDEX IF EXISTS idx_business_updates_active_visible;

-- 3. Drop columns
ALTER TABLE public.business_updates
  DROP COLUMN IF EXISTS deactivated_by,
  DROP COLUMN IF EXISTS deactivated_at,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS is_visible_in_app;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
