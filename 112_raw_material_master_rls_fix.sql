-- Migration: 112_raw_material_master_rls_fix.sql
-- Description: Fixes RLS bypass (USING (true)) for raw material prices master and operational tables, enforcing authenticated user access.

DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'raw_materials',
            'material_quality_grades',
            'brokers',
            'broker_materials',
            'raw_material_price_entries',
            'whatsapp_price_reports',
            'whatsapp_price_report_recipients',
            'raw_material_price_settings',
            'raw_material_price_audit_logs',
            'rm_units',
            'rm_price_types',
            'rm_allowed_units'
        ])
    LOOP
        -- Drop the overly permissive policies
        EXECUTE format('DROP POLICY IF EXISTS "Allow all on %s" ON public.%I;', t_name, t_name);
        
        -- Enable RLS (in case it wasn't)
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);

        -- Create a proper authenticated policy
        EXECUTE format('CREATE POLICY "Auth users can access %s" ON public.%I FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'');', t_name, t_name);
    END LOOP;
END $$;
