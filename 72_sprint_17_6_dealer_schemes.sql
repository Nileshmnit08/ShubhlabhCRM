-- MICRO-SPRINT 17.6: DEALER SCHEME & INCENTIVE TRACKING

-- 1. Create Dealer Schemes table
CREATE TABLE IF NOT EXISTS public.dealer_schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    eligibility_criteria TEXT,
    milestones JSONB,
    status VARCHAR(50) DEFAULT 'Active', -- Active, Closed, Draft
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for dealer_schemes updated_at
DROP TRIGGER IF EXISTS update_dealer_schemes_modtime ON public.dealer_schemes;
CREATE TRIGGER update_dealer_schemes_modtime
BEFORE UPDATE ON public.dealer_schemes
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- 2. Create Dealer Scheme Participations table
CREATE TABLE IF NOT EXISTS public.dealer_scheme_participations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_id UUID REFERENCES public.dealer_schemes(id) ON DELETE CASCADE,
    party_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Enrolled', -- Enrolled, Target Achieved, Claimed, Verified
    notes TEXT,
    milestone_progress JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scheme_id, party_id)
);

-- Trigger for dealer_scheme_participations updated_at
DROP TRIGGER IF EXISTS update_dealer_scheme_participations_modtime ON public.dealer_scheme_participations;
CREATE TRIGGER update_dealer_scheme_participations_modtime
BEFORE UPDATE ON public.dealer_scheme_participations
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- RLS Development Policies
ALTER TABLE public.dealer_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_scheme_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on dealer_schemes" ON public.dealer_schemes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on dealer_scheme_participations" ON public.dealer_scheme_participations FOR ALL USING (true) WITH CHECK (true);

-- 3. Insert a sample scheme for testing
INSERT INTO public.dealer_schemes (name, start_date, end_date, eligibility_criteria, description, status)
VALUES (
    'Q3 Monsoon Bonanza 2026', 
    '2026-07-01', 
    '2026-09-30', 
    'Minimum 50 MT Feed Order', 
    'Target based incentive for premium cattle feed.',
    'Active'
) ON CONFLICT DO NOTHING;
