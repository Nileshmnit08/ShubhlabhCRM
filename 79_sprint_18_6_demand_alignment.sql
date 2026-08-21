-- MICRO-SPRINT 18.6: DEMAND VS OPPORTUNITY ALIGNMENT
-- Creates mapping table to link demand signals to requirements.

CREATE TABLE IF NOT EXISTS public.requirement_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    signal_source_id TEXT NOT NULL,
    signal_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    UNIQUE(requirement_id, signal_source_id)
);

-- Enable RLS
ALTER TABLE public.requirement_signals ENABLE ROW LEVEL SECURITY;

-- Policies for requirement_signals
-- Users can view linked signals if they can view the requirement's party
CREATE POLICY "View linked signals based on party visibility" ON public.requirement_signals
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.requirements r
            JOIN public.crm_parties p ON r.party_id = p.id
            WHERE r.id = requirement_signals.requirement_id
              AND (
                  (SELECT role FROM public.app_users WHERE id = auth.uid()) = 'Admin'
                  OR p.assigned_owner_id = auth.uid()
              )
        )
    );

-- Users can link/unlink signals if they own the party or are admin
CREATE POLICY "Manage linked signals based on party ownership" ON public.requirement_signals
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.requirements r
            JOIN public.crm_parties p ON r.party_id = p.id
            WHERE r.id = requirement_signals.requirement_id
              AND (
                  (SELECT role FROM public.app_users WHERE id = auth.uid()) = 'Admin'
                  OR p.assigned_owner_id = auth.uid()
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.requirements r
            JOIN public.crm_parties p ON r.party_id = p.id
            WHERE r.id = requirement_signals.requirement_id
              AND (
                  (SELECT role FROM public.app_users WHERE id = auth.uid()) = 'Admin'
                  OR p.assigned_owner_id = auth.uid()
              )
        )
    );

-- Create a view to easily join linked signals with their demand signal evidence
CREATE OR REPLACE VIEW public.v_requirement_linked_signals WITH (security_invoker = true) AS
SELECT 
    rs.id AS link_id,
    rs.requirement_id,
    rs.signal_source_id,
    rs.signal_type,
    rs.created_at AS linked_at,
    ds.signal_date,
    ds.description,
    ds.product_reference
FROM public.requirement_signals rs
JOIN public.v_demand_signals ds ON rs.signal_source_id = ds.source_id;

GRANT SELECT ON public.v_requirement_linked_signals TO authenticated;
GRANT SELECT ON public.v_requirement_linked_signals TO anon;
