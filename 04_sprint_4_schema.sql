-- SPRINT 4: One-Tap WhatsApp + Requirements Capture Schema

CREATE TABLE IF NOT EXISTS public.requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE NOT NULL,
    product_type VARCHAR(255) NOT NULL, -- e.g. "Premium Mix", "Standard Feed"
    quantity INTEGER NOT NULL,
    expected_date DATE,
    status VARCHAR(50) DEFAULT 'Open', -- 'Open', 'Fulfilled', 'Lost'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for requirements updated_at
DROP TRIGGER IF EXISTS update_requirements_modtime ON public.requirements;
CREATE TRIGGER update_requirements_modtime
BEFORE UPDATE ON public.requirements
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- RLS Development Policies
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on requirements" ON public.requirements FOR ALL USING (true) WITH CHECK (true);
