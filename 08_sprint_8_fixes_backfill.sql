-- Backfill existing users into app_users table
INSERT INTO public.app_users (id, email, role, is_active)
SELECT id, email, 'Admin', true
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.app_users);
