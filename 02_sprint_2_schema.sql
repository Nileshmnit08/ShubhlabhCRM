-- SPRINT 2: Tally Import & Identity Resolution Schema

-- 1. Tally Imports Table
CREATE TABLE IF NOT EXISTS public.tally_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_file_name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) DEFAULT 'CSV',
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    imported_by UUID, -- References user
    record_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Processing',
    notes TEXT
);

-- 2. Tally Raw Parties
CREATE TABLE IF NOT EXISTS public.tally_raw_parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tally_import_id UUID REFERENCES public.tally_imports(id) ON DELETE CASCADE,
    tally_source_id VARCHAR(255),
    tally_ledger_name VARCHAR(255) NOT NULL,
    tally_group VARCHAR(255),
    tally_status VARCHAR(50) DEFAULT 'Unknown',
    raw_location VARCHAR(255),
    raw_payload_or_source_reference JSONB,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Party Identity Links
CREATE TABLE IF NOT EXISTS public.party_identity_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crm_party_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    tally_raw_party_id UUID REFERENCES public.tally_raw_parties(id) ON DELETE CASCADE,
    match_type VARCHAR(50) NOT NULL, -- 'Exact', 'Manual', 'System Generated'
    confidence FLOAT,
    resolution_status VARCHAR(50) DEFAULT 'Resolved',
    reason TEXT,
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tally_raw_party_id) -- A raw party maps to at most one CRM party
);

-- 4. Identity Review Queue
CREATE TABLE IF NOT EXISTS public.identity_review_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tally_raw_party_id UUID REFERENCES public.tally_raw_parties(id) ON DELETE CASCADE,
    candidate_crm_party_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    match_reason TEXT,
    confidence FLOAT,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS Development Policies (Open for now)
ALTER TABLE public.tally_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tally_raw_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_identity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on tally_imports" ON public.tally_imports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tally_raw_parties" ON public.tally_raw_parties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on party_identity_links" ON public.party_identity_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on identity_review_queue" ON public.identity_review_queue FOR ALL USING (true) WITH CHECK (true);
