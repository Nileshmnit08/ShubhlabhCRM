-- MICRO-SPRINT 14.4: FOLLOW-UP SEQUENCE ENGINE
-- Create a lightweight controlled multi-step follow-up model.

CREATE TABLE public.crm_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.crm_sequence_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID REFERENCES public.crm_sequences(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    delay_days INTEGER NOT NULL DEFAULT 1,
    action_type VARCHAR(50) NOT NULL, -- e.g. 'Call', 'WhatsApp', 'Email'
    reason_template TEXT NOT NULL,
    UNIQUE(sequence_id, step_number)
);

ALTER TABLE public.follow_ups
ADD COLUMN IF NOT EXISTS sequence_id UUID REFERENCES public.crm_sequences(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sequence_step_number INTEGER;

-- RLS
ALTER TABLE public.crm_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read sequences" ON public.crm_sequences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read sequence steps" ON public.crm_sequence_steps FOR SELECT TO authenticated USING (true);

-- Admin management policies
CREATE POLICY "Allow admin manage sequences" ON public.crm_sequences FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'Admin'));
CREATE POLICY "Allow admin manage sequence steps" ON public.crm_sequence_steps FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'Admin'));

-- Seed a standard sequence
INSERT INTO public.crm_sequences (id, name, description) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Onboarding Sequence', 'Standard 3-step sequence for new customers');

INSERT INTO public.crm_sequence_steps (sequence_id, step_number, delay_days, action_type, reason_template) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1, 1, 'WhatsApp', 'Welcome & Intro'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2, 3, 'Call', 'First Week Check-in'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 3, 7, 'WhatsApp', 'Request Feedback');
