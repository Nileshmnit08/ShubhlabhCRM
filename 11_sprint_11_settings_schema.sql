-- SPRINT 11: Settings Engine Schema Updates

-- 1. Update app_users table with profile fields
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS mobile VARCHAR(50),
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS notification_rules JSONB DEFAULT '{"email": true, "in_app": true}'::jsonb;

-- Users can update their own profiles
CREATE POLICY "Users can update own profile" 
ON public.app_users 
FOR UPDATE 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());

-- 2. Create Global CRM Settings Table (Singleton)
CREATE TABLE IF NOT EXISTS public.crm_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Enforce single row
    default_reminder_minutes INTEGER DEFAULT 15,
    work_hours_start TIME DEFAULT '09:00:00',
    work_hours_end TIME DEFAULT '18:00:00',
    priority_labels JSONB DEFAULT '["High", "Normal", "Low"]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert the default singleton row if it doesn't exist
INSERT INTO public.crm_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 3. RLS for crm_settings
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view settings
CREATE POLICY "Auth users can view settings" 
ON public.crm_settings 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Only Admins can update settings (using the existing is_admin function)
CREATE POLICY "Admins can update settings" 
ON public.crm_settings 
FOR UPDATE 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());
