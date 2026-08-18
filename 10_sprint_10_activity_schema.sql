-- SPRINT 10: Activity Engine Schema

-- 1. Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL, -- Nullable for system events
    module VARCHAR(100) NOT NULL, -- e.g., 'Customers', 'FollowUps', 'DataSync', 'Auth'
    action_type VARCHAR(100) NOT NULL, -- e.g., 'CREATED', 'UPDATED', 'COMPLETED', 'LOGIN'
    entity_type VARCHAR(100), -- e.g., 'crm_parties', 'follow_ups'
    entity_id VARCHAR(255),
    summary TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON public.activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON public.activity_logs(module);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to insert activity logs
CREATE POLICY "Allow authenticated inserts" ON public.activity_logs 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- Allow all authenticated users to view activity logs (For transparency across the team)
CREATE POLICY "Allow authenticated selects" ON public.activity_logs 
FOR SELECT TO authenticated 
USING (true);
