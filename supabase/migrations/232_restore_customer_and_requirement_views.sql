-- Migration: 232_restore_customer_and_requirement_views.sql
-- Micro-Sprint: CRM-CUSTOMERS-REQUIREMENTS-SCHEMA-RECOVERY-02
-- Description: Restores canonical contracts for v_customer_master and v_board_requirements,
--              along with canonical v_requirement_dispatch_summary, without dropping any business data.

-- ============================================================================
-- 0. PRE-CLEANUP (NON-CASCADING)
-- ============================================================================
-- Drop dependent view first so v_requirement_dispatch_summary can be safely recreated
-- without 42P16 column type mismatch errors.
DROP VIEW IF EXISTS public.v_board_requirements;
DROP VIEW IF EXISTS public.v_requirement_dispatch_summary;

-- ============================================================================
-- 1. RESTORE v_requirement_dispatch_summary (Migration 102 Canonical Contract)
-- ============================================================================
CREATE VIEW public.v_requirement_dispatch_summary WITH (security_invoker = true) AS
SELECT 
    r.id AS requirement_id,
    COALESCE(r.quantity, (SELECT COALESCE(SUM(qi.quantity), 0)::integer FROM public.requirement_items qi WHERE qi.requirement_id = r.id), 0)::integer AS required_quantity,
    COALESCE(r.unit, 'Bags') AS unit,
    COALESCE(SUM(
        CASE 
            WHEN rd.status = 'Cancelled' THEN 0
            ELSE rd.quantity - COALESCE(rd.return_quantity, 0)
        END
    ), 0)::integer AS total_dispatched_quantity,
    GREATEST(0, COALESCE(r.quantity, (SELECT COALESCE(SUM(qi.quantity), 0)::integer FROM public.requirement_items qi WHERE qi.requirement_id = r.id), 0)::integer - COALESCE(SUM(
        CASE 
            WHEN rd.status = 'Cancelled' THEN 0
            ELSE rd.quantity - COALESCE(rd.return_quantity, 0)
        END
    ), 0)::integer)::integer AS pending_quantity,
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
        WHEN COALESCE(SUM(CASE WHEN rd.status = 'Cancelled' THEN 0 ELSE rd.quantity - COALESCE(rd.return_quantity, 0) END), 0) < COALESCE(r.quantity, (SELECT COALESCE(SUM(qi.quantity), 0)::integer FROM public.requirement_items qi WHERE qi.requirement_id = r.id), 0) THEN 'Partially Dispatched'
        ELSE 'Fully Dispatched'
    END AS dispatch_progress
FROM public.requirements r
LEFT JOIN public.requirement_dispatches rd ON r.id = rd.requirement_id
GROUP BY r.id, r.quantity, r.unit;

GRANT SELECT ON public.v_requirement_dispatch_summary TO authenticated;
GRANT SELECT ON public.v_requirement_dispatch_summary TO anon;

-- ============================================================================
-- 2. RESTORE public.v_board_requirements (Migration 105 Canonical Contract)
-- ============================================================================
-- Resolves PostgREST PGRST205 on /requirements and Today.jsx

CREATE VIEW public.v_board_requirements WITH (security_invoker = true) AS
SELECT 
    r.id,
    r.party_id,
    r.demand_ref,
    r.notes,
    r.product_type,
    COALESCE(r.quantity, (SELECT COALESCE(SUM(qi.quantity), 0)::integer FROM public.requirement_items qi WHERE qi.requirement_id = r.id), 0)::integer AS required_quantity,
    COALESCE(r.unit, 'Bags') AS unit,
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
    COALESCE(s.total_dispatched_quantity, 0)::integer AS total_dispatched_quantity,
    COALESCE(s.pending_quantity, COALESCE(r.quantity, (SELECT COALESCE(SUM(qi.quantity), 0)::integer FROM public.requirement_items qi WHERE qi.requirement_id = r.id), 0))::integer AS pending_quantity,
    COALESCE(s.dispatch_progress, 'Not Dispatched') AS dispatch_progress,
    s.latest_dispatch_date,
    
    -- Pending logic enforcer
    CASE 
        -- If it's explicitly completed/lost/won
        WHEN r.status IN ('Closed', 'Fulfilled', 'Completed', 'Cancelled', 'Lost', 'Won') THEN false
        -- If it has been fully dispatched (pending balance <= 0)
        WHEN COALESCE(s.pending_quantity, COALESCE(r.quantity, (SELECT COALESCE(SUM(qi.quantity), 0)::integer FROM public.requirement_items qi WHERE qi.requirement_id = r.id), 0)) <= 0 THEN false
        -- Otherwise it's pending
        ELSE true
    END AS is_pending

FROM public.requirements r
LEFT JOIN public.crm_parties p ON r.party_id = p.id
LEFT JOIN public.app_users u ON r.assigned_to = u.id
LEFT JOIN public.v_requirement_dispatch_summary s ON r.id = s.requirement_id;

GRANT SELECT ON public.v_board_requirements TO authenticated;
GRANT SELECT ON public.v_board_requirements TO anon;

-- ============================================================================
-- 3. RESTORE public.v_customer_master (Sprint 13 / Sprint 18 Canonical Contract)
-- ============================================================================
-- Resolves PostgreSQL 42703 (created_at does not exist) on /customers

DROP VIEW IF EXISTS public.v_customer_master;

CREATE VIEW public.v_customer_master WITH (security_invoker = true) AS
WITH LatestNotification AS (
    SELECT DISTINCT ON (customer_id) 
        customer_id, 
        delivery_status, 
        created_at
    FROM public.owner_whatsapp_notifications
    ORDER BY customer_id, created_at DESC
)
SELECT 
    c.id,
    c.display_name,
    c.legal_or_core_name,
    c.city,
    c.state,
    c.mobile,
    c.whatsapp,
    c.communication_preference,
    c.preferred_channel,
    c.preferred_contact_time,
    c.crm_status,
    c.notes,
    c.created_at,
    c.updated_at,
    c.relationship_type,
    c.gst_number,
    c.assigned_owner_id,
    c.credit_limit,
    c.email,
    c.tally_ledger_id,
    c.lead_source,
    c.converted_to_party_id,
    c.customer_type,
    c.product_interests,
    c.business_context,
    c.next_review_date,
    c.territory_id,
    c.do_not_contact,
    c.ledger_classification,
    c.data_quality_flags,
    c.latitude,
    c.longitude,
    c.location_accuracy,
    c.location_captured_at,
    c.is_priority,
    c.customer_code,
    COALESCE(t.name, c.territory_name) AS territory_name,
    COALESCE(u.display_name, c.owner_name) AS owner_name,
    f.total_billed,
    f.total_received,
    f.outstanding_balance,
    f.last_payment_date,
    f.last_order_date,
    (
        (CASE WHEN c.display_name IS NOT NULL AND c.display_name != '' THEN 20 ELSE 0 END) +
        (CASE WHEN c.mobile IS NOT NULL AND c.mobile != '' THEN 20 ELSE 0 END) +
        (CASE WHEN c.city IS NOT NULL AND c.city != '' THEN 20 ELSE 0 END) +
        (CASE WHEN c.gst_number IS NOT NULL AND c.gst_number != '' THEN 20 ELSE 0 END) +
        (CASE WHEN c.assigned_owner_id IS NOT NULL THEN 20 ELSE 0 END)
    ) AS profile_completeness,
    ln.delivery_status AS assignment_notification_status
FROM public.crm_parties c
LEFT JOIN public.app_users u ON c.assigned_owner_id = u.id
LEFT JOIN public.crm_territories t ON c.territory_id = t.id
LEFT JOIN public.v_customer_financials f ON c.id = f.party_id
LEFT JOIN LatestNotification ln ON c.id = ln.customer_id;

GRANT SELECT ON public.v_customer_master TO authenticated;
GRANT SELECT ON public.v_customer_master TO anon;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
