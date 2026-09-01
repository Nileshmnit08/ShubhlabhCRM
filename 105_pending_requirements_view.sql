-- Migration: 105_pending_requirements_view.sql
-- Description: Creates a flat view of requirements with pending status logic enforced for the Requirements Board

CREATE OR REPLACE VIEW public.v_board_requirements WITH (security_invoker = true) AS
SELECT 
    r.id,
    r.party_id,
    r.product_type,
    r.quantity AS required_quantity,
    r.unit,
    r.expected_date,
    r.expected_rate,
    r.status,
    r.priority,
    r.assigned_to,
    r.intent_type,
    r.created_at,
    r.updated_at,
    
    -- CRM Party details
    p.display_name AS customer_name,
    p.city AS customer_city,
    p.mobile AS customer_mobile,
    p.whatsapp AS customer_whatsapp,
    
    -- User details
    u.email AS owner_email,
    
    -- Dispatch summary details
    COALESCE(s.total_dispatched_quantity, 0) AS total_dispatched_quantity,
    COALESCE(s.pending_quantity, r.quantity) AS pending_quantity,
    COALESCE(s.dispatch_progress, 'Not Dispatched') AS dispatch_progress,
    s.latest_dispatch_date,
    
    -- Pending logic enforcer
    CASE 
        -- If it's explicitly completed/lost/won
        WHEN r.status IN ('Closed', 'Fulfilled', 'Completed', 'Cancelled', 'Lost', 'Won') THEN false
        -- If it has been fully dispatched (pending balance <= 0)
        WHEN COALESCE(s.pending_quantity, r.quantity) <= 0 THEN false
        -- Otherwise it's pending
        ELSE true
    END AS is_pending

FROM public.requirements r
LEFT JOIN public.crm_parties p ON r.party_id = p.id
LEFT JOIN public.app_users u ON r.assigned_to = u.id
LEFT JOIN public.v_requirement_dispatch_summary s ON r.id = s.requirement_id;

GRANT SELECT ON public.v_board_requirements TO authenticated;
GRANT SELECT ON public.v_board_requirements TO anon;
