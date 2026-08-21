-- MICRO-SPRINT 17.1: DEALER ACCOUNT FOUNDATION

-- 1. Create the Dealer Profiles Extension Table
CREATE TABLE IF NOT EXISTS public.crm_dealer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL UNIQUE REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    dealer_classification VARCHAR(50) DEFAULT 'Retailer',
    territory VARCHAR(100),
    operating_status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_dealer_profiles_party_id ON public.crm_dealer_profiles(party_id);
CREATE INDEX IF NOT EXISTS idx_crm_dealer_profiles_territory ON public.crm_dealer_profiles(territory);

-- 2. Row Level Security for Dealer Profiles
ALTER TABLE public.crm_dealer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view dealer profiles" ON public.crm_dealer_profiles;
CREATE POLICY "Authenticated users can view dealer profiles" 
ON public.crm_dealer_profiles FOR SELECT 
TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert dealer profiles" ON public.crm_dealer_profiles;
CREATE POLICY "Authenticated users can insert dealer profiles" 
ON public.crm_dealer_profiles FOR INSERT 
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update dealer profiles" ON public.crm_dealer_profiles;
CREATE POLICY "Authenticated users can update dealer profiles" 
ON public.crm_dealer_profiles FOR UPDATE 
TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete dealer profiles" ON public.crm_dealer_profiles;
CREATE POLICY "Authenticated users can delete dealer profiles" 
ON public.crm_dealer_profiles FOR DELETE 
TO authenticated USING (true);

-- 3. Create updated_at trigger for dealer profiles
DROP TRIGGER IF EXISTS trg_update_crm_dealer_profiles_updated_at ON public.crm_dealer_profiles;
CREATE TRIGGER trg_update_crm_dealer_profiles_updated_at
BEFORE UPDATE ON public.crm_dealer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();

-- 4. Create View for Dealership Network
DROP VIEW IF EXISTS public.v_dealership_network CASCADE;
CREATE OR REPLACE VIEW public.v_dealership_network WITH (security_invoker = true) AS
SELECT 
    cm.*,
    dp.dealer_classification,
    dp.territory,
    dp.operating_status AS dealer_operating_status
FROM public.v_customer_master cm
JOIN public.crm_dealer_profiles dp ON cm.id = dp.party_id
WHERE cm.relationship_type = 'Dealer';

GRANT SELECT ON public.v_dealership_network TO authenticated;
