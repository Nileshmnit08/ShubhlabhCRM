CREATE TABLE IF NOT EXISTS public.transporter_metadata (
    transporter_name VARCHAR(255) PRIMARY KEY,
    is_fraud BOOLEAN DEFAULT false,
    added_locations TEXT[] DEFAULT '{}',
    removed_locations TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.transporter_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on transporter_metadata" ON public.transporter_metadata FOR ALL USING (true) WITH CHECK (true);
