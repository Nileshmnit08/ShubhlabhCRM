-- Fix for requirement quantity calculation

DROP VIEW IF EXISTS public.v_board_requirements;
DROP VIEW IF EXISTS public.v_requirement_dispatch_summary;

CREATE OR REPLACE VIEW public.v_requirement_dispatch_summary WITH (security_invoker = true) AS
SELECT 
    r.id AS requirement_id,
    COALESCE(r.quantity, (SELECT SUM(quantity) FROM public.requirement_items WHERE requirement_id = r.id), 0) AS required_quantity,
    r.unit,
    COALESCE(SUM(
        CASE 
            WHEN rd.status = 'Cancelled' THEN 0
            ELSE rd.quantity - COALESCE(rd.return_quantity, 0)
        END
    ), 0) AS total_dispatched_quantity,
    GREATEST(0, COALESCE(r.quantity, (SELECT SUM(quantity) FROM public.requirement_items WHERE requirement_id = r.id), 0) - COALESCE(SUM(
        CASE 
            WHEN rd.status = 'Cancelled' THEN 0
            ELSE rd.quantity - COALESCE(rd.return_quantity, 0)
        END
    ), 0)) AS pending_quantity,
    MAX(rd.dispatch_date) AS latest_dispatch_date,
    (
        SELECT truck_number 
        FROM public.requirement_dispatches 
        WHERE requirement_id = r.id AND status != 'Cancelled' 
        ORDER BY dispatch_date DESC, created_at DESC LIMIT 1
    ) AS latest_truck_number,
    (
        SELECT driver_mobile 
        FROM public.requirement_dispatches 
        WHERE requirement_id = r.id AND status != 'Cancelled' 
        ORDER BY dispatch_date DESC, created_at DESC LIMIT 1
    ) AS latest_driver_mobile,
    CASE
        WHEN COALESCE(SUM(CASE WHEN rd.status = 'Cancelled' THEN 0 ELSE rd.quantity - COALESCE(rd.return_quantity, 0) END), 0) = 0 THEN 'Not Dispatched'
        WHEN COALESCE(SUM(CASE WHEN rd.status = 'Cancelled' THEN 0 ELSE rd.quantity - COALESCE(rd.return_quantity, 0) END), 0) < COALESCE(r.quantity, (SELECT SUM(quantity) FROM public.requirement_items WHERE requirement_id = r.id), 0) THEN 'Partially Dispatched'
        ELSE 'Fully Dispatched'
    END AS dispatch_progress
FROM public.requirements r
LEFT JOIN public.requirement_dispatches rd ON r.id = rd.requirement_id
GROUP BY r.id, r.quantity, r.unit;

GRANT SELECT ON public.v_requirement_dispatch_summary TO authenticated;
GRANT SELECT ON public.v_requirement_dispatch_summary TO anon;

CREATE OR REPLACE VIEW public.v_board_requirements WITH (security_invoker = true) AS
SELECT 
    r.id,
    r.party_id,
    r.demand_ref,
    r.notes,
    r.product_type,
    COALESCE(r.quantity, (SELECT SUM(quantity) FROM public.requirement_items WHERE requirement_id = r.id), 0) AS required_quantity,
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
    COALESCE(s.pending_quantity, COALESCE(r.quantity, (SELECT SUM(quantity) FROM public.requirement_items WHERE requirement_id = r.id), 0)) AS pending_quantity,
    COALESCE(s.dispatch_progress, 'Not Dispatched') AS dispatch_progress,
    s.latest_dispatch_date,
    
    -- Pending logic enforcer
    CASE 
        -- If it's explicitly completed/lost/won
        WHEN r.status IN ('Closed', 'Fulfilled', 'Completed', 'Cancelled', 'Lost', 'Won') THEN false
        -- If it has been fully dispatched (pending balance <= 0)
        WHEN COALESCE(s.pending_quantity, COALESCE(r.quantity, (SELECT SUM(quantity) FROM public.requirement_items WHERE requirement_id = r.id), 0)) <= 0 THEN false
        -- Otherwise it's pending
        ELSE true
    END AS is_pending

FROM public.requirements r
LEFT JOIN public.crm_parties p ON r.party_id = p.id
LEFT JOIN public.app_users u ON r.assigned_to = u.id
LEFT JOIN public.v_requirement_dispatch_summary s ON r.id = s.requirement_id;

GRANT SELECT ON public.v_board_requirements TO authenticated;
GRANT SELECT ON public.v_board_requirements TO anon;
