-- Migration: 94_sprint_21_collections_tower_schema.sql

-- 1. Create collection_commitments table
CREATE TABLE IF NOT EXISTS public.collection_commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL,
    promised_date DATE NOT NULL,
    payment_mode VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Upcoming', -- Upcoming, Due Today, Kept, Broken, Cancelled
    source_activity_id UUID REFERENCES public.interactions(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coll_commit_customer ON public.collection_commitments(customer_id);

-- 2. Create collection_disputes table
CREATE TABLE IF NOT EXISTS public.collection_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    disputed_amount NUMERIC(15,2) NOT NULL,
    dispute_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Open', -- Open, Investigating, Resolved, Rejected
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_resolution_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coll_dispute_customer ON public.collection_disputes(customer_id);

-- 3. Extend crm_parties
ALTER TABLE public.crm_parties 
ADD COLUMN IF NOT EXISTS ledger_classification VARCHAR(100) DEFAULT 'Trade Customer',
ADD COLUMN IF NOT EXISTS data_quality_flags TEXT[];

-- 4. Extend follow_ups
ALTER TABLE public.follow_ups 
ADD COLUMN IF NOT EXISTS expected_collection_amount NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS collection_action_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_related BOOLEAN DEFAULT false;

-- Auto-flag existing payment follow-ups
UPDATE public.follow_ups SET payment_related = true WHERE follow_up_type = 'Payment';

-- 5. Create Views
DROP VIEW IF EXISTS public.v_collections_control_tower CASCADE;
CREATE OR REPLACE VIEW public.v_collections_control_tower WITH (security_invoker = true) AS
WITH LatestPaymentFollowUp AS (
    SELECT DISTINCT ON (party_id)
        id, party_id, follow_up_date, reason, status, priority, sequence_id, expected_collection_amount, collection_action_type
    FROM public.follow_ups
    WHERE payment_related = true AND status = 'Pending'
    ORDER BY party_id, follow_up_date ASC
),
LatestCommitment AS (
    SELECT DISTINCT ON (customer_id)
        id, customer_id, amount, promised_date, status, payment_mode
    FROM public.collection_commitments
    WHERE status IN ('Upcoming', 'Due Today', 'Broken')
    ORDER BY customer_id, promised_date ASC
),
LatestDispute AS (
    SELECT DISTINCT ON (customer_id)
        id, customer_id, disputed_amount, dispute_type, status, target_resolution_date
    FROM public.collection_disputes
    WHERE status IN ('Open', 'Investigating')
    ORDER BY customer_id, created_at DESC
),
LatestInteraction AS (
    SELECT DISTINCT ON (party_id)
        id, party_id, channel, outcome, note, created_at
    FROM public.interactions
    ORDER BY party_id, created_at DESC
)
SELECT 
    c.id AS party_id,
    c.display_name,
    c.mobile,
    c.owner_name,
    c.assigned_owner_id,
    c.territory_name,
    c.outstanding_balance,
    c.last_payment_date,
    cp.ledger_classification,
    cp.data_quality_flags,
    
    f.follow_up_date AS next_action_date,
    f.reason AS next_action_reason,
    f.expected_collection_amount,
    f.collection_action_type,
    f.status AS next_action_status,
    f.priority AS next_action_priority,
    
    com.amount AS promised_amount,
    com.promised_date,
    com.status AS promise_status,
    
    d.disputed_amount,
    d.dispute_type,
    d.status AS dispute_status,
    
    i.created_at AS last_interaction_date,
    i.outcome AS last_interaction_outcome,
    i.channel AS last_interaction_channel
FROM public.v_customer_master c
JOIN public.crm_parties cp ON c.id = cp.id
LEFT JOIN LatestPaymentFollowUp f ON c.id = f.party_id
LEFT JOIN LatestCommitment com ON c.id = com.customer_id
LEFT JOIN LatestDispute d ON c.id = d.customer_id
LEFT JOIN LatestInteraction i ON c.id = i.party_id;

GRANT SELECT ON public.v_collections_control_tower TO authenticated;
