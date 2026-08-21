-- MICRO-SPRINT 15.9: SALES DATA QUALITY & RECONCILIATION
-- Identifies data integrity issues across the Phase 14 & 15 architectures.

CREATE OR REPLACE VIEW public.v_sales_data_quality_report WITH (security_invoker = true) AS

-- 1. Orphaned Requirements
SELECT 
    'Orphaned Record' AS issue_category,
    'CRITICAL' AS severity,
    'Requirement' AS record_type,
    r.id::text AS record_id,
    'Requirement ' || r.id || ' points to missing party_id ' || r.party_id AS issue_description,
    'Delete requirement or map to valid customer.' AS resolution_action
FROM public.requirements r 
LEFT JOIN public.crm_parties p ON r.party_id = p.id 
WHERE p.id IS NULL

UNION ALL

-- 2. Orphaned Follow-ups
SELECT 
    'Orphaned Record',
    'CRITICAL',
    'Follow-up',
    f.id::text,
    'Follow-up ' || f.id || ' points to missing party_id ' || f.party_id,
    'Delete follow-up or map to valid customer.'
FROM public.follow_ups f 
LEFT JOIN public.crm_parties p ON f.party_id = p.id 
WHERE p.id IS NULL

UNION ALL

-- 3. Missing Owners (Customers)
SELECT 
    'Missing Owner',
    'WARNING',
    'Customer',
    id::text,
    'Customer ' || display_name || ' has no assigned owner.',
    'Assign an owner via the CRM.'
FROM public.crm_parties 
WHERE assigned_owner_id IS NULL AND crm_status != 'Lead'

UNION ALL

-- 4. Duplicate Pending Tasks (Same type for same customer)
SELECT 
    'Duplicate Record',
    'WARNING',
    'Follow-up',
    party_id::text,
    'Party ' || party_id || ' has ' || COUNT(*) || ' pending ' || follow_up_type || ' tasks.',
    'Complete or cancel duplicate tasks.'
FROM public.follow_ups 
WHERE status = 'Pending' 
GROUP BY party_id, follow_up_type 
HAVING COUNT(*) > 1

UNION ALL

-- 5. Commercial Intents Missing Context
SELECT 
    'Missing Context',
    'WARNING',
    'Requirement',
    id::text,
    'Intent is ' || intent_type || ' but expected_rate/notes are empty.',
    'Add pricing context or detailed notes.'
FROM public.requirements 
WHERE intent_type IN ('Quotation Requested', 'Price Discussion') 
  AND expected_rate IS NULL 
  AND (notes IS NULL OR TRIM(notes) = '')

UNION ALL

-- 6. Tally Transaction Reconciliation (Missing Customer mapping)
SELECT 
    'Tally Reconciliation',
    'CRITICAL',
    'Tally Transaction',
    t.id::text,
    'Tally Tx ' || t.id || ' (Voucher ' || t.voucher_no || ') points to missing crm_party_id ' || t.crm_party_id,
    'Fix Tally Sync mapping.'
FROM public.tally_transactions t 
LEFT JOIN public.crm_parties p ON t.crm_party_id = p.id 
WHERE p.id IS NULL

UNION ALL

-- 7. Stale Pending Tasks (> 30 days overdue)
SELECT 
    'Stale Record',
    'INFO',
    'Follow-up',
    id::text,
    'Task is pending but was due ' || (CURRENT_DATE - follow_up_date) || ' days ago.',
    'Complete, postpone, or cancel task.'
FROM public.follow_ups 
WHERE status = 'Pending' AND follow_up_date < (CURRENT_DATE - 30)

UNION ALL

-- 8. Invalid Transitions / Desync
SELECT 
    'Invalid Transition',
    'WARNING',
    'Requirement',
    r.id::text,
    'Requirement ' || r.id || ' is ' || r.status || ' but customer has pending Commercial tasks.',
    'Close related follow-ups.'
FROM public.requirements r 
JOIN public.follow_ups f ON r.party_id = f.party_id 
WHERE r.status IN ('Confirmed', 'Closed', 'Lost') 
  AND f.status = 'Pending' 
  AND f.follow_up_type = 'Commercial';

GRANT SELECT ON public.v_sales_data_quality_report TO authenticated;
GRANT SELECT ON public.v_sales_data_quality_report TO anon;
