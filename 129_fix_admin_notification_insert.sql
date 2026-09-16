-- MICRO-SPRINT CRM-NOTIFY-01-FIX-01
-- Allow Admins to insert notifications for any user

-- Create a policy to allow Admins to insert into crm_notifications
CREATE POLICY "Admins can insert notifications" ON public.crm_notifications
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.app_users 
            WHERE app_users.id = auth.uid() 
              AND app_users.role = 'Admin'
        )
    );
