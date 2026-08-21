-- MICRO-SPRINT 16.5: CUSTOMER SERVICE & ISSUE TRACKING

-- 1. Create crm_issues table
CREATE TABLE IF NOT EXISTS public.crm_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    assigned_owner_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General Service',
    priority VARCHAR(50) NOT NULL DEFAULT 'Normal',
    status VARCHAR(50) NOT NULL DEFAULT 'Open',
    description TEXT NOT NULL,
    resolution_notes TEXT,
    linked_requirement_id UUID REFERENCES public.requirements(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_issues_party_id ON public.crm_issues(party_id);
CREATE INDEX IF NOT EXISTS idx_crm_issues_assigned_owner ON public.crm_issues(assigned_owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_issues_status ON public.crm_issues(status);

-- 3. Triggers for updated_at
DROP TRIGGER IF EXISTS update_crm_issues_modtime ON public.crm_issues;
CREATE TRIGGER update_crm_issues_modtime
BEFORE UPDATE ON public.crm_issues
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- 4. Row Level Security
ALTER TABLE public.crm_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view issues" 
ON public.crm_issues FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert issues" 
ON public.crm_issues FOR INSERT 
TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update issues" 
ON public.crm_issues FOR UPDATE 
TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete issues" 
ON public.crm_issues FOR DELETE 
TO authenticated USING (true);
