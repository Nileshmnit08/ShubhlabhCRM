-- MICRO-SPRINT FA-14-FIX-01: My Work Assignment Visibility Fix
-- Modifies crm_parties RLS to grant authorized Field Staff JIT (Just-In-Time) 
-- visibility to customer records when they have a legitimate active, pending follow-up 
-- assigned to them for that customer.

-- 1. Create a secure, non-recursive helper function
-- SECURITY DEFINER prevents infinite recursion and securely checks the follow_ups table
-- without invoking the query-calling user's RLS constraints on follow_ups.
CREATE OR REPLACE FUNCTION public.has_assigned_work(customer_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.follow_ups 
    WHERE party_id = customer_id 
    AND assigned_to = auth.uid() 
    AND status = 'Pending'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Safely replace the Select policy
DROP POLICY IF EXISTS "Role-based CRM Select" ON public.crm_parties;

CREATE POLICY "Role-based CRM Select" ON public.crm_parties 
FOR SELECT USING (
    public.is_admin() OR 
    assigned_owner_id = auth.uid() OR
    public.has_assigned_work(id)
);
