-- SPRINT 1: CRM Foundation
-- Small-Scale Feed CRM Database Schema

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Core Customers Table (crm_parties)
CREATE TABLE IF NOT EXISTS public.crm_parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_name VARCHAR(255) NOT NULL,
    legal_or_core_name VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    mobile VARCHAR(50),
    whatsapp VARCHAR(50),
    communication_preference VARCHAR(50) DEFAULT 'WhatsApp',
    preferred_channel VARCHAR(50),
    preferred_contact_time VARCHAR(100),
    crm_status VARCHAR(50) DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Apply trigger to crm_parties
DROP TRIGGER IF EXISTS update_crm_parties_modtime ON public.crm_parties;
CREATE TRIGGER update_crm_parties_modtime
BEFORE UPDATE ON public.crm_parties
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- 4. Minimal Row Level Security (RLS) for Development
-- We will enable RLS but create open policies for Sprint 1 to allow easy frontend integration.
-- In production/subsequent sprints, this must be restricted to authenticated users.

ALTER TABLE public.crm_parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select for development" 
ON public.crm_parties FOR SELECT 
USING (true);

CREATE POLICY "Allow anonymous insert for development" 
ON public.crm_parties FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow anonymous update for development" 
ON public.crm_parties FOR UPDATE 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous delete for development" 
ON public.crm_parties FOR DELETE 
USING (true);
