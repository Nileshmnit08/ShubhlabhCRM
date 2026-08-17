-- SPRINT 3: Today's Work & Daily Follow-up Schema

-- 1. Interactions / Activity Table
CREATE TABLE IF NOT EXISTS public.interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE NOT NULL,
    user_id UUID, -- References authenticated user
    channel VARCHAR(50) NOT NULL, -- 'WhatsApp', 'Call', 'Meeting', 'Note'
    interaction_type VARCHAR(100),
    outcome TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    next_action VARCHAR(255),
    next_action_date TIMESTAMP WITH TIME ZONE
);

-- 2. Follow-ups Table
CREATE TABLE IF NOT EXISTS public.follow_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    follow_up_date DATE NOT NULL,
    priority VARCHAR(50) DEFAULT 'Normal', -- 'High', 'Normal', 'Low'
    assigned_to UUID,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Completed', 'Postponed', 'Cancelled'
    notes TEXT,
    created_by UUID,
    completed_by UUID,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for follow_ups updated_at
DROP TRIGGER IF EXISTS update_follow_ups_modtime ON public.follow_ups;
CREATE TRIGGER update_follow_ups_modtime
BEFORE UPDATE ON public.follow_ups
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- RLS Development Policies (Open for now)
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on interactions" ON public.interactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on follow_ups" ON public.follow_ups FOR ALL USING (true) WITH CHECK (true);
