-- SPRINT 21: Role-Based Visibility Fix for CRM Parties
-- Restricts CRM party access at the Row Level Security (RLS) layer.
-- Admins can view/update/delete all customers.
-- Non-Admins (Operators) can only view/update/delete customers assigned to them.

-- 1. Drop existing permissive policies
DROP POLICY IF EXISTS "Active users CRM Select" ON public.crm_parties;
DROP POLICY IF EXISTS "Active users CRM Update" ON public.crm_parties;
DROP POLICY IF EXISTS "Active users CRM Delete" ON public.crm_parties;

-- 2. Create new strict role-based policies
CREATE POLICY "Role-based CRM Select" ON public.crm_parties 
FOR SELECT USING (
    public.is_admin() OR assigned_owner_id = auth.uid()
);

CREATE POLICY "Role-based CRM Update" ON public.crm_parties 
FOR UPDATE USING (
    public.is_admin() OR assigned_owner_id = auth.uid()
);

CREATE POLICY "Role-based CRM Delete" ON public.crm_parties 
FOR DELETE USING (
    public.is_admin()
);
