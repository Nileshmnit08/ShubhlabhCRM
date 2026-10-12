-- Rollback Migration: 232_rollback_customer_and_requirement_views.sql
-- Micro-Sprint: CRM-CUSTOMERS-REQUIREMENTS-SCHEMA-RECOVERY-01
-- Reverts changes applied by 232_restore_customer_and_requirement_views.sql

-- 1. Drop restored v_board_requirements view
DROP VIEW IF EXISTS public.v_board_requirements;

-- 2. Revert v_customer_master to bootstrap baseline definition
DROP VIEW IF EXISTS public.v_customer_master;

CREATE OR REPLACE VIEW public.v_customer_master AS
SELECT 
    c.id,
    c.display_name,
    COALESCE(c.mobile, '') AS mobile,
    COALESCE(c.city, '') AS city,
    COALESCE(c.territory_name, 'Default Territory') AS territory_name,
    COALESCE(c.owner_name, 'Unassigned') AS owner_name,
    COALESCE(c.crm_status, 'Active') AS crm_status
FROM public.crm_parties c;

GRANT SELECT ON public.v_customer_master TO authenticated;
GRANT SELECT ON public.v_customer_master TO anon;

-- 3. Revert v_requirement_dispatch_summary to bootstrap baseline definition
CREATE OR REPLACE VIEW public.v_requirement_dispatch_summary AS
SELECT 
    r.id AS requirement_id,
    COALESCE(r.quantity, 0) AS required_quantity,
    COALESCE(r.unit, 'Bags') AS unit,
    COALESCE(SUM(
        CASE WHEN rd.status = 'Cancelled' THEN 0 ELSE rd.quantity - COALESCE(rd.return_quantity, 0) END
    ), 0) AS total_dispatched_quantity,
    GREATEST(0, COALESCE(r.quantity, 0) - COALESCE(SUM(
        CASE WHEN rd.status = 'Cancelled' THEN 0 ELSE rd.quantity - COALESCE(rd.return_quantity, 0) END
    ), 0)) AS pending_quantity
FROM public.requirements r
LEFT JOIN public.requirement_dispatches rd ON r.id = rd.requirement_id
GROUP BY r.id, r.quantity, r.unit;

GRANT SELECT ON public.v_requirement_dispatch_summary TO authenticated;
GRANT SELECT ON public.v_requirement_dispatch_summary TO anon;

NOTIFY pgrst, 'reload schema';
