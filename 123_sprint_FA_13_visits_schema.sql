-- SPRINT FA-13: Field Assistant Visit Mode
-- Creates authoritative crm_visits table for recording Field Staff Visits

CREATE TABLE IF NOT EXISTS public.crm_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE NOT NULL,
    staff_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_seconds INTEGER,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    outcomes JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_crm_visits_modtime ON public.crm_visits;
CREATE TRIGGER update_crm_visits_modtime
BEFORE UPDATE ON public.crm_visits
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_visits_party_id ON public.crm_visits(party_id);
CREATE INDEX IF NOT EXISTS idx_crm_visits_staff_id ON public.crm_visits(staff_id);
CREATE INDEX IF NOT EXISTS idx_crm_visits_created_at ON public.crm_visits(created_at DESC);

-- RLS Policies
ALTER TABLE public.crm_visits ENABLE ROW LEVEL SECURITY;

-- Staff can insert their own visits
CREATE POLICY "Allow staff to insert their own visits" 
ON public.crm_visits FOR INSERT 
TO authenticated 
WITH CHECK (
    -- If staff_id is provided, it must match the authenticated user
    (staff_id IS NULL) OR (staff_id = auth.uid())
);

-- Staff can view visits they created, or visits for parties they are assigned to
CREATE POLICY "Allow staff to view visits" 
ON public.crm_visits FOR SELECT 
TO authenticated 
USING (
    staff_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.crm_parties p 
        WHERE p.id = crm_visits.party_id 
        AND p.assigned_owner_id = auth.uid()
    )
);

-- Allow updates (e.g. for fixing incomplete syncs if necessary)
CREATE POLICY "Allow staff to update their own visits" 
ON public.crm_visits FOR UPDATE 
TO authenticated 
USING (staff_id = auth.uid())
WITH CHECK (staff_id = auth.uid());
