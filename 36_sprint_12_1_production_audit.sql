-- MICRO-SPRINT 12.1: PRODUCTION DATA HEALTH AUDIT
-- Create comprehensive views to audit production data health without modifying underlying records.

CREATE OR REPLACE VIEW public.v_audit_customer_health WITH (security_invoker = true) AS
SELECT 
    COUNT(*) as total_customers,
    SUM(CASE WHEN crm_status = 'Active' THEN 1 ELSE 0 END) as active_customers,
    SUM(CASE WHEN mobile IS NULL OR mobile = '' THEN 1 ELSE 0 END) as missing_mobile,
    SUM(CASE WHEN whatsapp IS NULL OR whatsapp = '' THEN 1 ELSE 0 END) as missing_whatsapp,
    SUM(CASE WHEN assigned_owner_id IS NULL AND crm_status = 'Active' THEN 1 ELSE 0 END) as unassigned_active_customers,
    SUM(CASE WHEN display_name ILIKE '%(OLD)%' THEN 1 ELSE 0 END) as old_ledgers,
    (SELECT COUNT(*) FROM (SELECT LOWER(TRIM(display_name)) FROM public.crm_parties GROUP BY 1 HAVING COUNT(*) > 1) d) as potential_duplicates
FROM public.crm_parties;

CREATE OR REPLACE VIEW public.v_audit_tally_identity_health WITH (security_invoker = true) AS
SELECT 
    COUNT(*) as total_raw_parties,
    SUM(CASE WHEN tally_status = 'Active (Voucher)' THEN 1 ELSE 0 END) as active_voucher_parties,
    (SELECT COUNT(*) FROM public.party_identity_links) as resolved_identities,
    (SELECT COUNT(*) FROM public.identity_review_queue WHERE status = 'Pending') as pending_review,
    (SELECT COUNT(*) FROM public.identity_review_queue WHERE status = 'Ambiguous') as ambiguous_identities
FROM public.tally_raw_parties;

CREATE OR REPLACE VIEW public.v_audit_voucher_health WITH (security_invoker = true) AS
SELECT 
    COUNT(*) as total_vouchers,
    SUM(CASE WHEN crm_party_id IS NULL THEN 1 ELSE 0 END) as unlinked_vouchers,
    SUM(CASE WHEN amount IS NULL OR amount <= 0 THEN 1 ELSE 0 END) as invalid_amount_vouchers,
    COUNT(DISTINCT crm_party_id) as parties_with_vouchers
FROM public.tally_transactions;

CREATE OR REPLACE VIEW public.v_audit_follow_up_health WITH (security_invoker = true) AS
SELECT 
    COUNT(*) as total_follow_ups,
    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as open_follow_ups,
    SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_follow_ups,
    SUM(CASE WHEN status = 'Pending' AND due_at < CURRENT_DATE THEN 1 ELSE 0 END) as overdue_follow_ups,
    SUM(CASE WHEN status = 'Pending' AND due_at < (CURRENT_DATE - INTERVAL '14 days') THEN 1 ELSE 0 END) as stale_follow_ups,
    SUM(CASE WHEN party_id IS NULL THEN 1 ELSE 0 END) as orphan_follow_ups
FROM public.follow_ups;

CREATE OR REPLACE VIEW public.v_audit_activity_health WITH (security_invoker = true) AS
SELECT 
    COUNT(*) as total_activities,
    SUM(CASE WHEN party_id IS NULL THEN 1 ELSE 0 END) as orphan_activities,
    COUNT(DISTINCT party_id) as parties_with_activities
FROM public.interactions;

CREATE OR REPLACE VIEW public.v_audit_requirement_health WITH (security_invoker = true) AS
SELECT 
    COUNT(*) as total_requirements,
    SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open_requirements,
    SUM(CASE WHEN assigned_to IS NULL THEN 1 ELSE 0 END) as missing_owner_requirements,
    SUM(CASE WHEN party_id IS NULL THEN 1 ELSE 0 END) as orphan_requirements
FROM public.requirements;

-- Provide select access to anon/authenticated users for dashboard integration
GRANT SELECT ON public.v_audit_customer_health TO authenticated;
GRANT SELECT ON public.v_audit_tally_identity_health TO authenticated;
GRANT SELECT ON public.v_audit_voucher_health TO authenticated;
GRANT SELECT ON public.v_audit_follow_up_health TO authenticated;
GRANT SELECT ON public.v_audit_activity_health TO authenticated;
GRANT SELECT ON public.v_audit_requirement_health TO authenticated;

-- For development testing (matches Sprint 1 configuration)
GRANT SELECT ON public.v_audit_customer_health TO anon;
GRANT SELECT ON public.v_audit_tally_identity_health TO anon;
GRANT SELECT ON public.v_audit_voucher_health TO anon;
GRANT SELECT ON public.v_audit_follow_up_health TO anon;
GRANT SELECT ON public.v_audit_activity_health TO anon;
GRANT SELECT ON public.v_audit_requirement_health TO anon;
