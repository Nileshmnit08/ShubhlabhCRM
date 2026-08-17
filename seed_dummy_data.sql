-- 1. Create a dummy party to attach follow-ups to
INSERT INTO public.crm_parties (id, display_name, mobile, whatsapp, crm_status, city)
VALUES (
    uuid_generate_v4(), 
    'AgriTech Farms (Dummy)', 
    '9876543210', 
    '9876543210', 
    'Active', 
    'Pune'
) ON CONFLICT DO NOTHING;

-- 2. Insert dummy Interactions (Activity)
INSERT INTO public.interactions (party_id, channel, outcome, note)
SELECT id, 'Call', 'Discussed new feed rates', 'Customer is happy with the pricing.'
FROM public.crm_parties
WHERE display_name = 'AgriTech Farms (Dummy)'
LIMIT 1;

INSERT INTO public.interactions (party_id, channel, outcome, note)
SELECT id, 'WhatsApp', 'Sent catalog', 'Waiting for them to read.'
FROM public.crm_parties
WHERE display_name = 'AgriTech Farms (Dummy)'
LIMIT 1;

-- 3. Insert dummy Follow-ups
-- Overdue (Yesterday)
INSERT INTO public.follow_ups (party_id, reason, follow_up_date, priority, status, notes)
SELECT id, 'Call regarding overdue payment', CURRENT_DATE - INTERVAL '1 day', 'High', 'Pending', 'They promised to pay last week.'
FROM public.crm_parties
WHERE display_name = 'AgriTech Farms (Dummy)'
LIMIT 1;

-- Today High Priority
INSERT INTO public.follow_ups (party_id, reason, follow_up_date, priority, status, notes)
SELECT id, 'Follow up on PDF catalog sent', CURRENT_DATE, 'High', 'Pending', 'Ensure we get a yes/no on the premium mix.'
FROM public.crm_parties
WHERE display_name = 'AgriTech Farms (Dummy)'
LIMIT 1;

-- Today Normal Priority
INSERT INTO public.follow_ups (party_id, reason, follow_up_date, priority, status, notes)
SELECT id, 'Check next week feed requirement', CURRENT_DATE, 'Normal', 'Pending', 'Usually orders 50 bags.'
FROM public.crm_parties
WHERE display_name = 'AgriTech Farms (Dummy)'
LIMIT 1;
