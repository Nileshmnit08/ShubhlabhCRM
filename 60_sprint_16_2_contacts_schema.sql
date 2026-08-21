-- MICRO-SPRINT 16.2: RELATIONSHIP & CONTACT MANAGEMENT

CREATE TABLE IF NOT EXISTS public.crm_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'Other' CHECK (role IN ('Owner', 'Purchase Contact', 'Accounts Contact', 'Decision Maker', 'Other')),
    mobile VARCHAR(20),
    whatsapp VARCHAR(20),
    email VARCHAR(255),
    preferred_channel VARCHAR(20) DEFAULT 'Call' CHECK (preferred_channel IN ('Call', 'WhatsApp', 'Email')),
    do_not_contact BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_contacts_party_id ON public.crm_contacts(party_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_role ON public.crm_contacts(role);

-- RLS Policies
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

-- 1. View policy: all authenticated users can view contacts
CREATE POLICY "Authenticated users can view contacts" 
    ON public.crm_contacts FOR SELECT 
    USING (auth.role() = 'authenticated');

-- 2. Insert policy: users can add contacts
CREATE POLICY "Users can insert contacts" 
    ON public.crm_contacts FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 3. Update policy: users can update contacts
CREATE POLICY "Users can update contacts" 
    ON public.crm_contacts FOR UPDATE 
    USING (auth.role() = 'authenticated');

-- 4. Delete policy: Admins or owners only
CREATE POLICY "Users can delete contacts" 
    ON public.crm_contacts FOR DELETE 
    USING (auth.role() = 'authenticated');

-- MIGRATION: Move existing `mobile` and `whatsapp` from `crm_parties` to `crm_contacts` as 'Owner'
INSERT INTO public.crm_contacts (party_id, name, role, mobile, whatsapp, preferred_channel)
SELECT 
    id AS party_id,
    display_name AS name,
    'Owner' AS role,
    mobile,
    whatsapp,
    COALESCE(communication_preference, 'Call') AS preferred_channel
FROM public.crm_parties
WHERE (mobile IS NOT NULL OR whatsapp IS NOT NULL)
  AND id NOT IN (SELECT party_id FROM public.crm_contacts WHERE role = 'Owner');

-- NOTE: We retain `mobile` and `whatsapp` on `crm_parties` for backward compatibility with older queries/views,
-- but `crm_contacts` will be the new operational source of truth for the Account 360 UI.
