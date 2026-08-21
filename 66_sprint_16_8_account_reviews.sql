-- MICRO-SPRINT 16.8: ACCOUNT REVIEW & ACTION PLANNING

-- 1. Add next_review_date to crm_parties for fast querying
ALTER TABLE public.crm_parties 
ADD COLUMN IF NOT EXISTS next_review_date DATE;

-- 2. Create the Account Reviews log table
CREATE TABLE IF NOT EXISTS public.crm_account_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    reviewed_by_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    review_date DATE NOT NULL DEFAULT CURRENT_DATE,
    next_review_date DATE,
    notes TEXT NOT NULL,
    next_actions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_account_reviews_party_id ON public.crm_account_reviews(party_id);
CREATE INDEX IF NOT EXISTS idx_crm_account_reviews_review_date ON public.crm_account_reviews(review_date);

-- 3. Row Level Security for Account Reviews
ALTER TABLE public.crm_account_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view account reviews" ON public.crm_account_reviews;
CREATE POLICY "Authenticated users can view account reviews" 
ON public.crm_account_reviews FOR SELECT 
TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert account reviews" ON public.crm_account_reviews;
CREATE POLICY "Authenticated users can insert account reviews" 
ON public.crm_account_reviews FOR INSERT 
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update account reviews" ON public.crm_account_reviews;
CREATE POLICY "Authenticated users can update account reviews" 
ON public.crm_account_reviews FOR UPDATE 
TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete account reviews" ON public.crm_account_reviews;
CREATE POLICY "Authenticated users can delete account reviews" 
ON public.crm_account_reviews FOR DELETE 
TO authenticated USING (true);

-- 4. Trigger to automatically update next_review_date on crm_parties
CREATE OR REPLACE FUNCTION public.trg_update_party_next_review_date()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.crm_parties
    SET next_review_date = NEW.next_review_date
    WHERE id = NEW.party_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_party_next_review_date_trigger ON public.crm_account_reviews;
CREATE TRIGGER update_party_next_review_date_trigger
AFTER INSERT OR UPDATE ON public.crm_account_reviews
FOR EACH ROW
EXECUTE FUNCTION public.trg_update_party_next_review_date();

-- 5. Add next_review_date to v_customer_master
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
LEFT JOIN public.v_customer_financials f ON c.id = f.party_id
LEFT JOIN LatestNotification ln ON c.id = ln.customer_id
LEFT JOIN public.v_customer_health ch ON c.id = ch.party_id;
