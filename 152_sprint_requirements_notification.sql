-- Centralized Requirement Management and Notification System

CREATE TABLE IF NOT EXISTS public.crm_internal_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'Medium', -- Low, Medium, High, Critical
    status VARCHAR(50) DEFAULT 'New', -- New, Under Review, Assigned, In Progress, Completed, Rejected
    source_module VARCHAR(100) NOT NULL, -- The origin of the requirement
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for crm_internal_requirements
ALTER TABLE public.crm_internal_requirements ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to insert requirements
CREATE POLICY "Users can insert requirements" ON public.crm_internal_requirements
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow all authenticated users to view their own or admins to view all
CREATE POLICY "Users can view requirements" ON public.crm_internal_requirements
    FOR SELECT TO authenticated USING (
        created_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'Admin')
    );

-- Allow admins to update requirements
CREATE POLICY "Admins can update requirements" ON public.crm_internal_requirements
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'Admin')
    );

-- Allow users to delete their own if 'New' or admins to delete any
CREATE POLICY "Users or Admins can delete requirements" ON public.crm_internal_requirements
    FOR DELETE TO authenticated USING (
        (created_by = auth.uid() AND status = 'New') OR 
        EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'Admin')
    );

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_crm_internal_req_modtime ON public.crm_internal_requirements;
CREATE TRIGGER update_crm_internal_req_modtime
BEFORE UPDATE ON public.crm_internal_requirements
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();

-- Function to notify admins on new requirement
CREATE OR REPLACE FUNCTION public.fn_notify_admin_on_new_requirement()
RETURNS trigger AS $$
DECLARE
    admin_record RECORD;
    creator_name VARCHAR;
BEGIN
    SELECT name INTO creator_name FROM public.app_users WHERE id = NEW.created_by;
    IF creator_name IS NULL THEN
        creator_name := 'Staff';
    END IF;

    -- Find all admins
    FOR admin_record IN 
        SELECT id FROM public.app_users WHERE role = 'Admin'
    LOOP
        INSERT INTO public.crm_notifications (
            user_id, entity_type, entity_id, notification_type, title, message, link_url
        ) VALUES (
            admin_record.id,
            'crm_internal_requirements',
            NEW.id,
            'REQUIREMENT_CREATED',
            'New Requirement: ' || NEW.title,
            'Submitted by: ' || creator_name || ' • Module: ' || NEW.source_module,
            '/system-requirements?id=' || NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_new_internal_requirement ON public.crm_internal_requirements;
CREATE TRIGGER trg_on_new_internal_requirement
AFTER INSERT ON public.crm_internal_requirements
FOR EACH ROW
EXECUTE FUNCTION public.fn_notify_admin_on_new_requirement();
