-- MICRO-SPRINT 17.2: TERRITORY & COVERAGE MANAGEMENT

-- 1. Create Territories Table
CREATE TABLE IF NOT EXISTS public.crm_territories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    region VARCHAR(100),
    assigned_manager_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_territories_manager ON public.crm_territories(assigned_manager_id);
CREATE INDEX IF NOT EXISTS idx_crm_territories_status ON public.crm_territories(status);

-- 2. RLS for Territories
ALTER TABLE public.crm_territories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view territories" ON public.crm_territories;
CREATE POLICY "Authenticated users can view territories" 
ON public.crm_territories FOR SELECT 
TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert territories" ON public.crm_territories;
CREATE POLICY "Admins can insert territories" 
ON public.crm_territories FOR INSERT 
TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'Admin'));

DROP POLICY IF EXISTS "Admins can update territories" ON public.crm_territories;
CREATE POLICY "Admins can update territories" 
ON public.crm_territories FOR UPDATE 
TO authenticated USING (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'Admin'));

DROP POLICY IF EXISTS "Admins can delete territories" ON public.crm_territories;
CREATE POLICY "Admins can delete territories" 
ON public.crm_territories FOR DELETE 
TO authenticated USING (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'Admin'));

-- 3. Add territory_id to crm_parties
ALTER TABLE public.crm_parties 
ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES public.crm_territories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_parties_territory ON public.crm_parties(territory_id);

-- 4. Drop old territory string from crm_dealer_profiles if it exists
-- We must first drop the view that depends on it
DROP VIEW IF EXISTS public.v_dealership_network;
ALTER TABLE public.crm_dealer_profiles DROP COLUMN IF EXISTS territory;

-- 5. Update v_customer_master to include territory details
-- We must drop cascade because c.* expansion in the view statically locked the column order
-- and adding territory_id shifts the projection order for owner_name etc.
DROP VIEW IF EXISTS public.v_customer_master CASCADE;
CREATE OR REPLACE VIEW public.v_customer_master WITH (security_invoker = true) AS
WITH LatestNotification AS (
    SELECT DISTINCT ON (customer_id) 
        customer_id, 
        delivery_status, 
        created_at
    FROM public.owner_whatsapp_notifications
    ORDER BY customer_id, created_at DESC
)
SELECT 
    c.*,
    u.display_name AS owner_name,
    t.name AS territory_name,
    t.assigned_manager_id AS territory_manager_id,
    tu.display_name AS territory_manager_name,
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
    ln.delivery_status AS assignment_notification_status,
    ch.health_status,
    ch.health_reason,
    ch.risk_factors
FROM public.crm_parties c
LEFT JOIN public.app_users u ON c.assigned_owner_id = u.id
LEFT JOIN public.crm_territories t ON c.territory_id = t.id
LEFT JOIN public.app_users tu ON t.assigned_manager_id = tu.id
LEFT JOIN public.v_customer_financials f ON c.id = f.party_id
LEFT JOIN LatestNotification ln ON c.id = ln.customer_id
LEFT JOIN public.v_customer_health ch ON c.id = ch.party_id;

GRANT SELECT ON public.v_customer_master TO authenticated;

-- 6. RESTORE DEPENDENT VIEWS DESTROYED BY CASCADE

-- 6a. Restore v_dealership_network
CREATE OR REPLACE VIEW public.v_dealership_network WITH (security_invoker = true) AS
SELECT 
    cm.*,
    dp.dealer_classification,
    dp.operating_status AS dealer_operating_status
FROM public.v_customer_master cm
JOIN public.crm_dealer_profiles dp ON cm.id = dp.party_id
WHERE cm.relationship_type = 'Dealer';

GRANT SELECT ON public.v_dealership_network TO authenticated;

-- 6b. Restore v_management_account_control
CREATE OR REPLACE VIEW public.v_management_account_control WITH (security_invoker = true) AS
SELECT 
    cm.id AS party_id,
    cm.display_name,
    cm.owner_name,
    cm.assigned_owner_id,
    cm.crm_status,
    cm.relationship_type,
    cm.health_status,
    cm.health_reason,
    cm.risk_factors,
    cm.outstanding_balance,
    cm.last_payment_date,
    (SELECT COUNT(*) FROM public.v_customer_opportunities o WHERE o.party_id = cm.id) AS open_opportunities_count,
    pfw.next_payment_followup_date,
    pfw.next_payment_followup_status
FROM public.v_customer_master cm
LEFT JOIN LATERAL (
    SELECT follow_up_date AS next_payment_followup_date, status AS next_payment_followup_status
    FROM public.follow_ups
    WHERE party_id = cm.id AND follow_up_type = 'Payment'
    ORDER BY created_at DESC
    LIMIT 1
) pfw ON true
WHERE cm.crm_status != 'Unknown';

GRANT SELECT ON public.v_management_account_control TO authenticated;
GRANT SELECT ON public.v_management_account_control TO anon;

-- 6c. Restore v_payment_followup_workspace
CREATE OR REPLACE VIEW public.v_payment_followup_workspace WITH (security_invoker = true) AS
WITH LatestPaymentFollowUp AS (
    SELECT DISTINCT ON (party_id)
        id, party_id, follow_up_date, reason, status, priority, sequence_id, created_at
    FROM public.follow_ups
    WHERE follow_up_type = 'Payment'
    ORDER BY party_id, created_at DESC
),
LatestPaymentInteraction AS (
    SELECT DISTINCT ON (party_id)
        id, party_id, channel, outcome, note, created_at
    FROM public.interactions
    ORDER BY party_id, created_at DESC
)
SELECT 
    c.id AS party_id,
    c.display_name,
    c.mobile,
    c.whatsapp,
    c.owner_name,
    c.assigned_owner_id,
    c.outstanding_balance,
    c.last_payment_date,
    c.last_order_date,
    c.city,
    f.follow_up_date AS next_payment_followup_date,
    f.reason AS next_payment_followup_reason,
    f.status AS next_payment_followup_status,
    f.id AS next_payment_followup_id,
    i.created_at AS last_interaction_date,
    i.outcome AS last_interaction_outcome,
    i.channel AS last_interaction_channel
FROM public.v_customer_master c
LEFT JOIN LatestPaymentFollowUp f ON c.id = f.party_id
LEFT JOIN LatestPaymentInteraction i ON c.id = i.party_id
WHERE c.outstanding_balance > 0;

GRANT SELECT ON public.v_payment_followup_workspace TO authenticated;
