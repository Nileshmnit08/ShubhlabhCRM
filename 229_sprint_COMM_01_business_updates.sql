-- SPRINT COMM-01: Business Updates

CREATE TABLE IF NOT EXISTS public.business_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, ARCHIVED
    audience_type VARCHAR(50) DEFAULT 'ALL', -- ALL, SELECTED
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    image_url TEXT,
    attachment_url TEXT
);

CREATE TABLE IF NOT EXISTS public.business_update_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    update_id UUID REFERENCES public.business_updates(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    delivered_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(update_id, customer_id)
);

ALTER TABLE public.business_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_update_recipients ENABLE ROW LEVEL SECURITY;

-- CRM Internal Users Policies
DROP POLICY IF EXISTS "Internal users manage business_updates" ON public.business_updates;
CREATE POLICY "Internal users manage business_updates" ON public.business_updates FOR ALL USING (public.is_active_user());

DROP POLICY IF EXISTS "Internal users manage business_update_recipients" ON public.business_update_recipients;
CREATE POLICY "Internal users manage business_update_recipients" ON public.business_update_recipients FOR ALL USING (public.is_active_user());

-- Buyer App Policies
DROP POLICY IF EXISTS "Buyers view published updates" ON public.business_updates;
CREATE POLICY "Buyers view published updates" ON public.business_updates 
FOR SELECT USING (
    status = 'PUBLISHED' AND (
        audience_type = 'ALL' OR 
        id IN (
            SELECT update_id FROM public.business_update_recipients r 
            JOIN public.app_users au ON r.customer_id = au.crm_party_id 
            WHERE au.id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Buyers view own recipients" ON public.business_update_recipients;
CREATE POLICY "Buyers view own recipients" ON public.business_update_recipients 
FOR SELECT USING (
    customer_id IN (SELECT crm_party_id FROM public.app_users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Buyers update own read status" ON public.business_update_recipients;
CREATE POLICY "Buyers update own read status" ON public.business_update_recipients 
FOR UPDATE USING (
    customer_id IN (SELECT crm_party_id FROM public.app_users WHERE id = auth.uid())
);

-- We need to ensure that when a buyer reads an 'ALL' update, they have a recipient record if they want to track read state.
-- Instead of dynamically inserting, they can insert their own recipient record for tracking 'ALL' updates.
DROP POLICY IF EXISTS "Buyers insert own recipients for tracking" ON public.business_update_recipients;
CREATE POLICY "Buyers insert own recipients for tracking" ON public.business_update_recipients 
FOR INSERT WITH CHECK (
    customer_id IN (SELECT crm_party_id FROM public.app_users WHERE id = auth.uid())
);
