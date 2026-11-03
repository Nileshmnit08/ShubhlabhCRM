-- ============================================================================
-- DEVELOPMENT-ONLY DEMO SEED for 249/250 — NEVER RUN ON PRODUCTION
--
-- All names and phone numbers below are FICTIONAL. They mirror the LabourHisaab
-- sample screens (6 labourers, Mix entry 10,000 kg @ ₹21/100 kg, etc.).
--
-- Guard: refuses to run unless the session opts in first:
--     SET lh.allow_demo_seed = 'on';
-- Runs as the database owner (bypasses RLS). Idempotent: fixed ids + ON CONFLICT DO NOTHING.
-- ============================================================================

BEGIN;

DO $$
BEGIN
    IF COALESCE(current_setting('lh.allow_demo_seed', true), '') <> 'on' THEN
        RAISE EXCEPTION 'Demo seed refused: development only. SET lh.allow_demo_seed = ''on'' to run it on a dev database.';
    END IF;
END $$;

INSERT INTO public.contractors (id, name, business_name, phone)
VALUES ('c0000000-0000-0000-0000-000000000001', 'DEMO शुभ लाभ लेबर कांट्रेक्टर', 'DEMO शुभ लाभ कांट्रेक्टिंग सर्विस', '0000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.labour_rates (id, contractor_id, work_type, rate, rate_unit, is_editable_rate, effective_from) VALUES
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Mix',                21.00, 'Per 100 kg', false, '2026-08-01'),
('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Pallet',             21.00, 'Per 100 kg', false, '2026-08-01'),
('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Maize Daliya',       15.00, 'Per 100 kg', false, '2026-08-01'),
('a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Maize Flour',        15.00, 'Per 100 kg', false, '2026-08-01'),
('a0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'Chana Churi',        15.00, 'Per 100 kg', false, '2026-08-01'),
('a0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000001', 'Unloading (Weight)', 45.00, 'Per 100 kg', false, '2026-08-01'),
('a0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000001', 'Unloading (Bag)',     2.00, 'Per bag',    false, '2026-08-01'),
('a0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000001', 'Bag Stitching',       0.30, 'Per bag',    true,  '2026-08-01'),
('a0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000001', 'Material Transfer',   2.00, 'Per bag',    false, '2026-08-01'),
('a0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000001', 'Premix',            300.00, 'Per batch',  false, '2026-08-01'),
('a0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000001', 'Paddy Labour',       25.00, 'Per 100 kg', true,  '2026-08-01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.labourers (id, contractor_id, local_id, name, phone, role) VALUES
('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'LH_LAB_001', 'DEMO गोलू',    '0000000011', 'मजदूर'),
('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'LH_LAB_002', 'DEMO सतीश',    '0000000012', 'मजदूर'),
('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'LH_LAB_003', 'DEMO आंग्रेश',  '0000000013', 'मजदूर'),
('b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'LH_LAB_004', 'DEMO राहुल',   '0000000014', 'मजदूर'),
('b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'LH_LAB_005', 'DEMO सोनू',    '0000000015', 'मजदूर'),
('b0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000001', 'LH_LAB_006', 'DEMO आदित्य',  '0000000016', 'मजदूर')
ON CONFLICT (id) DO NOTHING;

-- Mix: 160 × 50 kg + 50 × 40 kg = 10,000 kg @ ₹21/100 kg = ₹2,100, split equally among 3.
INSERT INTO public.daily_work_entries (id, contractor_id, work_date, work_type, rate_id, rate_snapshot, rate_unit_snapshot,
                                       total_weight_kg, total_bags, calculated_labour_amount, notes)
VALUES ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2026-10-15', 'Mix',
        'a0000000-0000-0000-0000-000000000001', 21.00, 'Per 100 kg', 10000.00, 210, 2100.00, 'DEMO सुबह शिफ्ट मिक्सिंग')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.daily_work_details (id, work_entry_id, contractor_id, bag_weight_kg, bag_count) VALUES
('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 50.00, 160),
('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 40.00, 50)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.labour_work_allocations (id, work_entry_id, contractor_id, labourer_id, allocated_amount, allocation_method) VALUES
('f1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 700.00, 'Equal'),
('f1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 700.00, 'Equal'),
('f1000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 700.00, 'Equal')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.labour_payments (id, contractor_id, labourer_id, payment_date, amount, payment_method, notes)
VALUES ('f2000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
        '2026-10-15', 1000.00, 'Cash', 'DEMO दैनिक भुगतान नकद')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service_expenses (id, contractor_id, expense_date, expense_category, expense_name, amount, allocation_scope, notes)
VALUES ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2026-10-15', 'Food / Meals',
        'DEMO दोपहर का भोजन', 300.00, 'Group expense', 'DEMO')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service_expense_allocations (id, expense_id, contractor_id, labourer_id, allocated_amount) VALUES
('f3000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 150.00),
('f3000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 150.00)
ON CONFLICT (id) DO NOTHING;

COMMIT;
