DO $$
DECLARE
  p_id UUID;
  t_id UUID;
  r_id UUID;
BEGIN
  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nilesh Kumar Khandelwal' OR legal_or_core_name ILIKE 'Nilesh Kumar Khandelwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-07', 'Nilesh Kumar Khandelwal', 'Payment', '22', 9500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Vaibhav Metacast Pvt Ltd Unit' OR legal_or_core_name ILIKE 'Shri Vaibhav Metacast Pvt Ltd Unit' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-07', 'Shri Vaibhav Metacast Pvt Ltd Unit', 'Receipt', '28', 30940, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Murlidhar Ji Yadav- Khejroli' OR legal_or_core_name ILIKE 'Murlidhar Ji Yadav- Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-07', 'Murlidhar Ji Yadav- Khejroli', 'Receipt', '29', 19990, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Harsit Kotari' OR legal_or_core_name ILIKE 'Harsit Kotari' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-07', 'Harsit Kotari', 'Receipt', '30', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-07', 'Ishwar and Company Surajpool', 'Receipt', '31', 78750, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Genral Stor Ranwal' OR legal_or_core_name ILIKE 'Vinayak Genral Stor Ranwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-07', 'Vinayak Genral Stor Ranwal', 'Receipt', '32', 5700, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S K Dairy - Mukunpura' OR legal_or_core_name ILIKE 'S K Dairy - Mukunpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-07', 'S K Dairy - Mukunpura', 'Receipt', '33', 5000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' OR legal_or_core_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-07', 'Krishna Baat Bhandhar- Sirsi Mode', 'Sales', '3476/25-26', 17000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-07', 'Lavik Traders', 'Sales', '3477/25-26', 50550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Abhishek Treding Company  Fathenegar' OR legal_or_core_name ILIKE 'Abhishek Treding Company  Fathenegar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-07', 'Abhishek Treding Company  Fathenegar', 'Sales', '3478/25-26', 237600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kaithal Solvent Pvt Ltd - Haryana' OR legal_or_core_name ILIKE 'Kaithal Solvent Pvt Ltd - Haryana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-07', 'Kaithal Solvent Pvt Ltd - Haryana', 'Purchase', '6', 609762, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' OR legal_or_core_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-08', 'SHRI RAM INDUSTRIES  (PHULERA)', 'Payment', '23', 120045, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-08', 'Wages Expenses A/C', 'Payment', '24', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-08', 'Machinery Reparing', 'Payment', '25', 2350, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nilesh Kumar Khandelwal' OR legal_or_core_name ILIKE 'Nilesh Kumar Khandelwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-08', 'Nilesh Kumar Khandelwal', 'Payment', '26', 9500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S K Dairy - Mukunpura' OR legal_or_core_name ILIKE 'S K Dairy - Mukunpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-08', 'S K Dairy - Mukunpura', 'Receipt', '34', 5000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Yasika Agro Feed Industries Merta City' OR legal_or_core_name ILIKE 'Yasika Agro Feed Industries Merta City' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-08', 'Yasika Agro Feed Industries Merta City', 'Receipt', '35', 100000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Abhishek Treding Company  Fathenegar' OR legal_or_core_name ILIKE 'Abhishek Treding Company  Fathenegar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-08', 'Abhishek Treding Company  Fathenegar', 'Receipt', '36', 237600, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-08', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '37', 13825, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Harsit Kotari' OR legal_or_core_name ILIKE 'Harsit Kotari' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-08', 'Harsit Kotari', 'Receipt', '38', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-08', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '3479/25-26', 13825, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' OR legal_or_core_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-08', 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur', 'Sales', '3480/25-26', 56800, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Giriraj Enterprises - Kalu Ka Baas' OR legal_or_core_name ILIKE 'Giriraj Enterprises - Kalu Ka Baas' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-08', 'Giriraj Enterprises - Kalu Ka Baas', 'Sales', '3481/25-26', 64417, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Laxmiroto Packers Pvt Ltd' OR legal_or_core_name ILIKE 'Laxmiroto Packers Pvt Ltd' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-08', 'Laxmiroto Packers Pvt Ltd', 'Purchase', '7', 6549, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Electricity and Water Expenses' OR legal_or_core_name ILIKE 'Electricity and Water Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-09', 'Electricity and Water Expenses', 'Payment', '27', 90124, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'DILIP UDYOUG' OR legal_or_core_name ILIKE 'DILIP UDYOUG' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-09', 'DILIP UDYOUG', 'Payment', '28', 39649, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-09', 'Wages Expenses A/C', 'Payment', '29', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-09', 'Office Expenses', 'Payment', '30', 2400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' OR legal_or_core_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-09', 'Krishna Baat Bhandhar- Sirsi Mode', 'Receipt', '39', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Harsit Kotari' OR legal_or_core_name ILIKE 'Harsit Kotari' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-09', 'Harsit Kotari', 'Sales', '3482/25-26', 273775, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Prakash Enterprises - Phulera' OR legal_or_core_name ILIKE 'Prakash Enterprises - Phulera' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-09', 'Prakash Enterprises - Phulera', 'Sales', '3483/25-26', 43420, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nagarmal Pramod Kumar - Chidawa' OR legal_or_core_name ILIKE 'Nagarmal Pramod Kumar - Chidawa' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-09', 'Nagarmal Pramod Kumar - Chidawa', 'Sales', '3484/25-26', 88704, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' OR legal_or_core_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-09', 'SHRI RAM INDUSTRIES  (PHULERA)', 'Purchase', '8', 159656, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mittal Trading Company - Nainva' OR legal_or_core_name ILIKE 'Mittal Trading Company - Nainva' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-09', 'Mittal Trading Company - Nainva', 'Purchase', '9', 80925, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dinesh Kumar Tarun Kumar Bardana' OR legal_or_core_name ILIKE 'Dinesh Kumar Tarun Kumar Bardana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-10', 'Dinesh Kumar Tarun Kumar Bardana', 'Payment', '31', 6825, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-10', 'Wages Expenses A/C', 'Payment', '32', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-10', 'Convence Expensece', 'Payment', '33', 2150, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-10', 'Office Expenses', 'Payment', '34', 2900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-10', 'Choudhary Pashu Aahar  Parbatsar', 'Receipt', '40', 32025, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Harsit Kotari' OR legal_or_core_name ILIKE 'Harsit Kotari' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-10', 'Harsit Kotari', 'Receipt', '41', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Deepak Trading Compay   Hingoniya' OR legal_or_core_name ILIKE 'Deepak Trading Compay   Hingoniya' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-10', 'Deepak Trading Compay   Hingoniya', 'Receipt', '42', 89500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S Kumar & Company - Navalgarh' OR legal_or_core_name ILIKE 'S Kumar & Company - Navalgarh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-10', 'S Kumar & Company - Navalgarh', 'Receipt', '43', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jain & Brothers - Muhana Mandi' OR legal_or_core_name ILIKE 'Jain & Brothers - Muhana Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-10', 'Jain & Brothers - Muhana Mandi', 'Receipt', '44', 64226, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dugya Cattle Feed - Muhana' OR legal_or_core_name ILIKE 'Dugya Cattle Feed - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-10', 'Dugya Cattle Feed - Muhana', 'Receipt', '45', 69300, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' OR legal_or_core_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-10', 'Krishna Baat Bhandhar- Sirsi Mode', 'Receipt', '46', 8000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-10', 'Maa Karni Baat Bhander Sodala', 'Sales', '3485/25-26', 20260, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-10', 'Godha Enterprises (Hingoniya)', 'Sales', '3486/25-26', 89750, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-11', 'Wages Expenses A/C', 'Payment', '35', 7100, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-11', 'Tour & Travel', 'Payment', '36', 2660, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nagarmal Pramod Kumar - Chidawa' OR legal_or_core_name ILIKE 'Nagarmal Pramod Kumar - Chidawa' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-11', 'Nagarmal Pramod Kumar - Chidawa', 'Receipt', '47', 88704, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' OR legal_or_core_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-11', 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur', 'Receipt', '48', 56800, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-11', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '3487/25-26', 14438, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' OR legal_or_core_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-11', 'SHRI BALAJI ENTERPRISES-TIGARIYA', 'Sales', '3488/25-26', 74967, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dugya Cattle Feed - Muhana' OR legal_or_core_name ILIKE 'Dugya Cattle Feed - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-11', 'Dugya Cattle Feed - Muhana', 'Sales', '3489/25-26', 66695, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Packers - Jaipur' OR legal_or_core_name ILIKE 'Balaji Packers - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-11', 'Balaji Packers - Jaipur', 'Purchase', '10', 71044, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Radha Krishan  Cattal Feed Mp' OR legal_or_core_name ILIKE 'Radha Krishan  Cattal Feed Mp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-11', 'Radha Krishan  Cattal Feed Mp', 'Purchase', '11', 885195, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Radha Krishan  Cattal Feed Mp', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Radha Krishan  Cattal Feed Mp';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ajay Kumar' OR legal_or_core_name ILIKE 'Ajay Kumar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-12', 'Ajay Kumar', 'Payment', '37', 15000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Treding Company Khejroli' OR legal_or_core_name ILIKE 'Shri Shyam Treding Company Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-12', 'Shri Shyam Treding Company Khejroli', 'Sales', '3490/25-26', 78750, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Hanuman Treders Up' OR legal_or_core_name ILIKE 'Jai Hanuman Treders Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-12', 'Jai Hanuman Treders Up', 'Purchase', '12', 244190, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ms G D  Agro Bundi' OR legal_or_core_name ILIKE 'Ms G D  Agro Bundi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-12', 'Ms G D  Agro Bundi', 'Purchase', '13', 325813, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Ms G D  Agro Bundi', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Ms G D  Agro Bundi';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Bina Enterprises - Jaipur' OR legal_or_core_name ILIKE 'Bina Enterprises - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-12', 'Bina Enterprises - Jaipur', 'Purchase', '14', 221330, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' OR legal_or_core_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-13', 'SHRI RAM INDUSTRIES  (PHULERA)', 'Payment', '38', 159656, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kaithal Solvent Pvt Ltd - Haryana' OR legal_or_core_name ILIKE 'Kaithal Solvent Pvt Ltd - Haryana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-13', 'Kaithal Solvent Pvt Ltd - Haryana', 'Payment', '39', 609762, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Hanuman Treders Up' OR legal_or_core_name ILIKE 'Jai Hanuman Treders Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-13', 'Jai Hanuman Treders Up', 'Payment', '40', 244190, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Khandelwal Steel Jaipur - Jaipur' OR legal_or_core_name ILIKE 'Khandelwal Steel Jaipur - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-13', 'Khandelwal Steel Jaipur - Jaipur', 'Payment', '41', 20400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-13', 'Wages Expenses A/C', 'Payment', '42', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Printing & Stationary' OR legal_or_core_name ILIKE 'Printing & Stationary' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-13', 'Printing & Stationary', 'Payment', '43', 2230, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ganesh Pashuahar Chaksu' OR legal_or_core_name ILIKE 'Ganesh Pashuahar Chaksu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-13', 'Ganesh Pashuahar Chaksu', 'Receipt', '50', 300000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Patel Enterprises  Rojda' OR legal_or_core_name ILIKE 'Patel Enterprises  Rojda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-13', 'Patel Enterprises  Rojda', 'Sales', '3491/25-26', 61900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading  Company  - Lalshot' OR legal_or_core_name ILIKE 'Balaji Trading  Company  - Lalshot' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-13', 'Balaji Trading  Company  - Lalshot', 'Sales', '3492/25-26', 60752, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'M Choudhry Trading Company - Jalpali' OR legal_or_core_name ILIKE 'M Choudhry Trading Company - Jalpali' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-13', 'M Choudhry Trading Company - Jalpali', 'Sales', '3493/25-26', 61100, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Sehri Agro Oils Pvt Ltd  Kukar Kheda Mandi' OR legal_or_core_name ILIKE 'Sehri Agro Oils Pvt Ltd  Kukar Kheda Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-13', 'Sehri Agro Oils Pvt Ltd  Kukar Kheda Mandi', 'Purchase', '15', 54035, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-14', 'Wages Expenses A/C', 'Payment', '44', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-14', 'Convence Expensece', 'Payment', '45', 2350, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-14', 'Maa Karni Baat Bhander Sodala', 'Receipt', '51', 20260, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tarachand Ji -Yadav Khejroli' OR legal_or_core_name ILIKE 'Tarachand Ji -Yadav Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-14', 'Tarachand Ji -Yadav Khejroli', 'Receipt', '52', 38700, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maruti Trading Company Kalwar' OR legal_or_core_name ILIKE 'Maruti Trading Company Kalwar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-14', 'Maruti Trading Company Kalwar', 'Receipt', '53', 58450, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' OR legal_or_core_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-14', 'Radha Baat Bhandhar - Lalchandpura', 'Receipt', '54', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Brothers - Renwal' OR legal_or_core_name ILIKE 'Vinayak Brothers - Renwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-14', 'Vinayak Brothers - Renwal', 'Sales', '3494/25-26', 98160, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-14', 'G.K.N - Industries', 'Sales', '3495/25-26', 45849, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shiv Trading Comnay Vatika' OR legal_or_core_name ILIKE 'Shiv Trading Comnay Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-14', 'Shiv Trading Comnay Vatika', 'Sales', '3496/25-26', 79975, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' OR legal_or_core_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-14', 'Radha Baat Bhandhar - Lalchandpura', 'Sales', '3497/2026-27', 73600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-14', 'Ishwar and Company Surajpool', 'Sales', '3498/2026-2027', 81250, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Bestcure Levis Healthcare Pvt.Ltd.' OR legal_or_core_name ILIKE 'Bestcure Levis Healthcare Pvt.Ltd.' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-14', 'Bestcure Levis Healthcare Pvt.Ltd.', 'Sales', '3499/2026-27', 54510, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Bestcure Levis Healthcare Pvt.Ltd.', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Bestcure Levis Healthcare Pvt.Ltd.';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'BUSINESS PROMOTION EXPENSES' OR legal_or_core_name ILIKE 'BUSINESS PROMOTION EXPENSES' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'BUSINESS PROMOTION EXPENSES', 'Payment', '46', 89504, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Telephone Exp' OR legal_or_core_name ILIKE 'Telephone Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Telephone Exp', 'Payment', '47', 1049, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Laxmiroto Packers Pvt Ltd' OR legal_or_core_name ILIKE 'Laxmiroto Packers Pvt Ltd' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Laxmiroto Packers Pvt Ltd', 'Payment', '48', 6549, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Wages Expenses A/C', 'Payment', '49', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Tour & Travel', 'Payment', '50', 2450, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Printing & Stationary' OR legal_or_core_name ILIKE 'Printing & Stationary' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Printing & Stationary', 'Payment', '51', 1500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'J.R.Trading  Com. Jupa' OR legal_or_core_name ILIKE 'J.R.Trading  Com. Jupa' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'J.R.Trading  Com. Jupa', 'Receipt', '55', 66000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Harsit Kotari' OR legal_or_core_name ILIKE 'Harsit Kotari' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Harsit Kotari', 'Receipt', '56', 25000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Babulal Ji Yadav - Mahaswas' OR legal_or_core_name ILIKE 'Babulal Ji Yadav - Mahaswas' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Babulal Ji Yadav - Mahaswas', 'Receipt', '57', 78750, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Mahaveer Treding Company Rayla' OR legal_or_core_name ILIKE 'Shri Mahaveer Treding Company Rayla' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Shri Mahaveer Treding Company Rayla', 'Receipt', '58', 89100, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mehta Baat Bhandhar - GovindPura' OR legal_or_core_name ILIKE 'Mehta Baat Bhandhar - GovindPura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Mehta Baat Bhandhar - GovindPura', 'Receipt', '59', 56160, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading  Company  - Lalshot' OR legal_or_core_name ILIKE 'Balaji Trading  Company  - Lalshot' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Balaji Trading  Company  - Lalshot', 'Receipt', '60', 60752, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Yasika Agro Feed Industries Merta City' OR legal_or_core_name ILIKE 'Yasika Agro Feed Industries Merta City' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Yasika Agro Feed Industries Merta City', 'Receipt', '61', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Bestcure Levis Healthcare Pvt.Ltd.' OR legal_or_core_name ILIKE 'Bestcure Levis Healthcare Pvt.Ltd.' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Bestcure Levis Healthcare Pvt.Ltd.', 'Receipt', '62', 54510, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Khandelwal Kirana  Store - Nindar' OR legal_or_core_name ILIKE 'Khandelwal Kirana  Store - Nindar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Khandelwal Kirana  Store - Nindar', 'Receipt', '63', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' OR legal_or_core_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Radha Baat Bhandhar - Lalchandpura', 'Receipt', '64', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Giriraj Trading Company - Alwar' OR legal_or_core_name ILIKE 'Giriraj Trading Company - Alwar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Giriraj Trading Company - Alwar', 'Receipt', '65', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Khandelwal Kirana  Store - Nindar' OR legal_or_core_name ILIKE 'Khandelwal Kirana  Store - Nindar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Khandelwal Kirana  Store - Nindar', 'Sales', '3500/2026-2027', 29400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Pashupati Trading Company' OR legal_or_core_name ILIKE 'Pashupati Trading Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Pashupati Trading Company', 'Sales', '3501/2026-27', 66400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' OR legal_or_core_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur', 'Sales', '3502/2026-27', 37900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nagarmal Pramod Kumar - Chidawa' OR legal_or_core_name ILIKE 'Nagarmal Pramod Kumar - Chidawa' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-15', 'Nagarmal Pramod Kumar - Chidawa', 'Sales', '3503/2026-27', 75455, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Radha Krishan  Cattal Feed Mp' OR legal_or_core_name ILIKE 'Radha Krishan  Cattal Feed Mp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-16', 'Radha Krishan  Cattal Feed Mp', 'Payment', '52', 885195, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Deep Solvents Pvt Ltd Punjab' OR legal_or_core_name ILIKE 'Deep Solvents Pvt Ltd Punjab' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-16', 'Deep Solvents Pvt Ltd Punjab', 'Payment', '53', 5638, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Electricity and Water Expenses' OR legal_or_core_name ILIKE 'Electricity and Water Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-16', 'Electricity and Water Expenses', 'Payment', '54', 12000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mittal Trading Company - Nainva' OR legal_or_core_name ILIKE 'Mittal Trading Company - Nainva' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-16', 'Mittal Trading Company - Nainva', 'Payment', '55', 79650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-16', 'Wages Expenses A/C', 'Payment', '56', 7500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-16', 'Machinery Reparing', 'Payment', '57', 1885, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nagarmal Pramod Kumar - Chidawa' OR legal_or_core_name ILIKE 'Nagarmal Pramod Kumar - Chidawa' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-16', 'Nagarmal Pramod Kumar - Chidawa', 'Receipt', '66', 75455, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anjani Trading Company  -(Beawar)' OR legal_or_core_name ILIKE 'Anjani Trading Company  -(Beawar)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-16', 'Anjani Trading Company  -(Beawar)', 'Receipt', '67', 290174, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Khandelwal Kirana  Store - Nindar' OR legal_or_core_name ILIKE 'Khandelwal Kirana  Store - Nindar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-16', 'Khandelwal Kirana  Store - Nindar', 'Receipt', '68', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Bansidhar Ji Tatla - Nangal Koju' OR legal_or_core_name ILIKE 'Bansidhar Ji Tatla - Nangal Koju' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-16', 'Bansidhar Ji Tatla - Nangal Koju', 'Receipt', '69', 2000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' OR legal_or_core_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-16', 'Radha Baat Bhandhar - Lalchandpura', 'Receipt', '70', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-16', 'Maa Karni Baat Bhander Sodala', 'Sales', '3504/2026-27', 17870, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Vaibhav Metacast Pvt Ltd Unit' OR legal_or_core_name ILIKE 'Shri Vaibhav Metacast Pvt Ltd Unit' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-16', 'Shri Vaibhav Metacast Pvt Ltd Unit', 'Sales', '3505/2026-27', 27960, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ms G D  Agro Bundi' OR legal_or_core_name ILIKE 'Ms G D  Agro Bundi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-17', 'Ms G D  Agro Bundi', 'Payment', '58', 324373, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-17', 'Machinery Reparing', 'Payment', '59', 1070, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-17', 'Wages Expenses A/C', 'Payment', '60', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-17', 'Tour & Travel', 'Payment', '61', 1000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-17', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Receipt', '71', 240951, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ramnarayan Ji Yadev  Dhanota' OR legal_or_core_name ILIKE 'Ramnarayan Ji Yadev  Dhanota' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-17', 'Ramnarayan Ji Yadev  Dhanota', 'Receipt', '72', 47000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-17', 'Ishwar and Company Surajpool', 'Receipt', '73', 78750, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-17', 'Maa Karni Baat Bhander Sodala', 'Receipt', '74', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Khandelwal Kirana  Store - Nindar' OR legal_or_core_name ILIKE 'Khandelwal Kirana  Store - Nindar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-17', 'Khandelwal Kirana  Store - Nindar', 'Receipt', '75', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' OR legal_or_core_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-17', 'Radha Baat Bhandhar - Lalchandpura', 'Receipt', '76', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' OR legal_or_core_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-17', 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur', 'Receipt', '77', 37850, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Uttam Agencies Sambriya' OR legal_or_core_name ILIKE 'Uttam Agencies Sambriya' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-17', 'Uttam Agencies Sambriya', 'Sales', '3506/2026-27', 18710, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-18', 'Wages Expenses A/C', 'Payment', '62', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-18', 'Tour & Travel', 'Payment', '63', 2000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Harsit Kotari' OR legal_or_core_name ILIKE 'Harsit Kotari' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-18', 'Harsit Kotari', 'Receipt', '78', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-18', 'Lavik Traders', 'Receipt', '79', 62956, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-18', 'Maa Karni Baat Bhander Sodala', 'Receipt', '80', 8870, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-18', 'Ishwar and Company Surajpool', 'Receipt', '81', 23625, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Khandelwal Kirana  Store - Nindar' OR legal_or_core_name ILIKE 'Khandelwal Kirana  Store - Nindar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-18', 'Khandelwal Kirana  Store - Nindar', 'Receipt', '82', 900, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' OR legal_or_core_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-18', 'Radha Baat Bhandhar - Lalchandpura', 'Receipt', '83', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trading Company - Khejroli - MM' OR legal_or_core_name ILIKE 'Manish Trading Company - Khejroli - MM' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-18', 'Manish Trading Company - Khejroli - MM', 'Receipt', '84', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ankit Trading Company Fulera' OR legal_or_core_name ILIKE 'Ankit Trading Company Fulera' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-18', 'Ankit Trading Company Fulera', 'Sales', '3507/2026-27', 36225, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Grow More Trade Links Jaipur' OR legal_or_core_name ILIKE 'Grow More Trade Links Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-19', 'Grow More Trade Links Jaipur', 'Purchase', '16', 554983, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Bina Enterprises - Jaipur' OR legal_or_core_name ILIKE 'Bina Enterprises - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-20', 'Bina Enterprises - Jaipur', 'Payment', '64', 221330, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Brokrage' OR legal_or_core_name ILIKE 'Brokrage' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-20', 'Brokrage', 'Payment', '65', 4336, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-20', 'Wages Expenses A/C', 'Payment', '66', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-20', 'Office Expenses', 'Payment', '67', 1850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Fright Exp' OR legal_or_core_name ILIKE 'Fright Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-20', 'Fright Exp', 'Payment', '68', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-20', 'Ishwar and Company Surajpool', 'Receipt', '85', 94500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Brothers - Renwal' OR legal_or_core_name ILIKE 'Vinayak Brothers - Renwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-20', 'Vinayak Brothers - Renwal', 'Receipt', '86', 93000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Pashupati Trading Company' OR legal_or_core_name ILIKE 'Pashupati Trading Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-20', 'Pashupati Trading Company', 'Receipt', '87', 60357, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' OR legal_or_core_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-20', 'Radha Baat Bhandhar - Lalchandpura', 'Receipt', '88', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trading Company - Khejroli - MM' OR legal_or_core_name ILIKE 'Manish Trading Company - Khejroli - MM' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-20', 'Manish Trading Company - Khejroli - MM', 'Receipt', '89', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jain & Brothers - Muhana Mandi' OR legal_or_core_name ILIKE 'Jain & Brothers - Muhana Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-20', 'Jain & Brothers - Muhana Mandi', 'Sales', '3508/2026/27', 64610, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S.S.Indurest' OR legal_or_core_name ILIKE 'S.S.Indurest' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-20', 'S.S.Indurest', 'Sales', '3509/2026-27', 60732, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('S.S.Indurest', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'S.S.Indurest';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dinesh Kumar Tarun Kumar Bardana' OR legal_or_core_name ILIKE 'Dinesh Kumar Tarun Kumar Bardana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-20', 'Dinesh Kumar Tarun Kumar Bardana', 'Purchase', '17', 6825, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Sehri Agro Oils Pvt Ltd  Kukar Kheda Mandi' OR legal_or_core_name ILIKE 'Sehri Agro Oils Pvt Ltd  Kukar Kheda Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-21', 'Sehri Agro Oils Pvt Ltd  Kukar Kheda Mandi', 'Payment', '69', 58214, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-21', 'Wages Expenses A/C', 'Payment', '70', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-21', 'Convence Expensece', 'Payment', '71', 2200, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Fright Exp' OR legal_or_core_name ILIKE 'Fright Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-21', 'Fright Exp', 'Payment', '72', 1270, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Brothers - Renwal' OR legal_or_core_name ILIKE 'Vinayak Brothers - Renwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-21', 'Vinayak Brothers - Renwal', 'Receipt', '90', 93000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Brothers - Renwal' OR legal_or_core_name ILIKE 'Vinayak Brothers - Renwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-21', 'Vinayak Brothers - Renwal', 'Receipt', '91', 99500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-21', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '92', 13825, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' OR legal_or_core_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-21', 'Radha Baat Bhandhar - Lalchandpura', 'Receipt', '93', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trading Company - Khejroli - MM' OR legal_or_core_name ILIKE 'Manish Trading Company - Khejroli - MM' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-21', 'Manish Trading Company - Khejroli - MM', 'Receipt', '94', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-21', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '3510/2026-27', 18638, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Uttam Agencies Sambriya' OR legal_or_core_name ILIKE 'Uttam Agencies Sambriya' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-21', 'Uttam Agencies Sambriya', 'Sales', '3511/2026-27', 21064, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-21', 'Shyam Baat Bhandar - Kanwarpura', 'Sales', '3512/2026-27', 69220, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Subham Pasu Aahar Badanwada' OR legal_or_core_name ILIKE 'Subham Pasu Aahar Badanwada' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-21', 'Subham Pasu Aahar Badanwada', 'Sales', '3513/2026-27', 155953, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Packers - Jaipur' OR legal_or_core_name ILIKE 'Balaji Packers - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-22', 'Balaji Packers - Jaipur', 'Payment', '73', 70810, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Grow More Trade Links Jaipur' OR legal_or_core_name ILIKE 'Grow More Trade Links Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-22', 'Grow More Trade Links Jaipur', 'Payment', '74', 554983, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-22', 'Wages Expenses A/C', 'Payment', '75', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-22', 'Tour & Travel', 'Payment', '76', 1950, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Fright Exp' OR legal_or_core_name ILIKE 'Fright Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-22', 'Fright Exp', 'Payment', '77', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tarachand Ji -Yadav Khejroli' OR legal_or_core_name ILIKE 'Tarachand Ji -Yadav Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-22', 'Tarachand Ji -Yadav Khejroli', 'Receipt', '95', 25000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Yasika Agro Feed Industries Merta City' OR legal_or_core_name ILIKE 'Yasika Agro Feed Industries Merta City' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-22', 'Yasika Agro Feed Industries Merta City', 'Receipt', '96', 49000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-22', 'G.K.N - Industries', 'Receipt', '97', 80590, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trading Company - Khejroli - MM' OR legal_or_core_name ILIKE 'Manish Trading Company - Khejroli - MM' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-22', 'Manish Trading Company - Khejroli - MM', 'Receipt', '98', 11000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' OR legal_or_core_name ILIKE 'Radha Baat Bhandhar - Lalchandpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-22', 'Radha Baat Bhandhar - Lalchandpura', 'Receipt', '99', 7100, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trading Company - Khejroli - MM' OR legal_or_core_name ILIKE 'Manish Trading Company - Khejroli - MM' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-22', 'Manish Trading Company - Khejroli - MM', 'Receipt', '100', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mamraj Treding Company Khejroli' OR legal_or_core_name ILIKE 'Mamraj Treding Company Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-22', 'Mamraj Treding Company Khejroli', 'Sales', '3514/2026-27', 78750, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Mamraj Treding Company Khejroli', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Mamraj Treding Company Khejroli';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maruti Trading Company Kalwar' OR legal_or_core_name ILIKE 'Maruti Trading Company Kalwar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-22', 'Maruti Trading Company Kalwar', 'Sales', '3515/2026-27', 51030, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dinesh Kumar Tarun Kumar Bardana' OR legal_or_core_name ILIKE 'Dinesh Kumar Tarun Kumar Bardana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-23', 'Dinesh Kumar Tarun Kumar Bardana', 'Payment', '78', 6825, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-23', 'Wages Expenses A/C', 'Payment', '79', 7200, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-23', 'Convence Expensece', 'Payment', '80', 3200, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Fright Exp' OR legal_or_core_name ILIKE 'Fright Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-23', 'Fright Exp', 'Payment', '81', 7900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jain & Brothers - Muhana Mandi' OR legal_or_core_name ILIKE 'Jain & Brothers - Muhana Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-23', 'Jain & Brothers - Muhana Mandi', 'Receipt', '101', 64612, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-23', 'Lavik Traders', 'Receipt', '102', 50815, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trading Company - Khejroli - MM' OR legal_or_core_name ILIKE 'Manish Trading Company - Khejroli - MM' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-23', 'Manish Trading Company - Khejroli - MM', 'Receipt', '103', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anu Baat Bhandhar - Bheru Khejda' OR legal_or_core_name ILIKE 'Anu Baat Bhandhar - Bheru Khejda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-23', 'Anu Baat Bhandhar - Bheru Khejda', 'Receipt', '104', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading  Company  - Lalshot' OR legal_or_core_name ILIKE 'Balaji Trading  Company  - Lalshot' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-23', 'Balaji Trading  Company  - Lalshot', 'Sales', '3516/2026-27', 64125, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-23', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Sales', '3517/2026-27', 121170, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-23', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Sales', '3518/2026/27', 124740, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kanish Enterprises Jaipur' OR legal_or_core_name ILIKE 'Kanish Enterprises Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-23', 'Kanish Enterprises Jaipur', 'Purchase', '18', 21736, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Kanish Enterprises Jaipur', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Kanish Enterprises Jaipur';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S M Sales Corporation  Jaipur' OR legal_or_core_name ILIKE 'S M Sales Corporation  Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-23', 'S M Sales Corporation  Jaipur', 'Purchase', '19', 40568, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-24', 'Wages Expenses A/C', 'Payment', '82', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-24', 'Office Expenses', 'Payment', '83', 2160, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading  Company  - Lalshot' OR legal_or_core_name ILIKE 'Balaji Trading  Company  - Lalshot' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-24', 'Balaji Trading  Company  - Lalshot', 'Receipt', '105', 64125, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-24', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '106', 14438, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Harsit Kotari' OR legal_or_core_name ILIKE 'Harsit Kotari' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-24', 'Harsit Kotari', 'Receipt', '107', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trading Company - Khejroli - MM' OR legal_or_core_name ILIKE 'Manish Trading Company - Khejroli - MM' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-24', 'Manish Trading Company - Khejroli - MM', 'Receipt', '108', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anu Baat Bhandhar - Bheru Khejda' OR legal_or_core_name ILIKE 'Anu Baat Bhandhar - Bheru Khejda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-24', 'Anu Baat Bhandhar - Bheru Khejda', 'Receipt', '109', 6000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-24', 'Maa Karni Baat Bhander Sodala', 'Sales', '3519/2026-27', 27525, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-24', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '3520/2026-27', 14438, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Indastrises  Didwana' OR legal_or_core_name ILIKE 'Balaji Indastrises  Didwana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-24', 'Balaji Indastrises  Didwana', 'Sales', '3521/2026-27', 67530, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tarachand Ji -Yadav Khejroli' OR legal_or_core_name ILIKE 'Tarachand Ji -Yadav Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-24', 'Tarachand Ji -Yadav Khejroli', 'Sales', '3522/2026-27', 63800, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-25', 'Wages Expenses A/C', 'Payment', '84', 7150, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-25', 'Machinery Reparing', 'Payment', '85', 2640, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shiv Trading Comnay Vatika' OR legal_or_core_name ILIKE 'Shiv Trading Comnay Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-25', 'Shiv Trading Comnay Vatika', 'Receipt', '110', 81549, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trading Company - Khejroli - MM' OR legal_or_core_name ILIKE 'Manish Trading Company - Khejroli - MM' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-25', 'Manish Trading Company - Khejroli - MM', 'Receipt', '111', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'M M Trading Company - Khejroli' OR legal_or_core_name ILIKE 'M M Trading Company - Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-25', 'M M Trading Company - Khejroli', 'Receipt', '112', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Murlidhar Ji Yadav- Khejroli' OR legal_or_core_name ILIKE 'Murlidhar Ji Yadav- Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-25', 'Murlidhar Ji Yadav- Khejroli', 'Receipt', '113', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-25', 'G.K.N - Industries', 'Sales', '3523/2026-27', 45850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ankit Trading Company Fulera' OR legal_or_core_name ILIKE 'Ankit Trading Company Fulera' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-25', 'Ankit Trading Company Fulera', 'Sales', '3524/2026-27', 44510, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-25', 'G.K.N - Industries', 'Sales', '3525/2026-27', 49535, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Chand Pasu Aahar Malpura' OR legal_or_core_name ILIKE 'Shri Chand Pasu Aahar Malpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-25', 'Shri Chand Pasu Aahar Malpura', 'Sales', '3526/2026-27', 111218, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nagarmal Pramod Kumar - Chidawa' OR legal_or_core_name ILIKE 'Nagarmal Pramod Kumar - Chidawa' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-25', 'Nagarmal Pramod Kumar - Chidawa', 'Sales', '3527/2026-27', 79928, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'DILIP UDYOUG' OR legal_or_core_name ILIKE 'DILIP UDYOUG' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-25', 'DILIP UDYOUG', 'Purchase', '20', 66082, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Chitarmal Manoj Kumar' OR legal_or_core_name ILIKE 'Chitarmal Manoj Kumar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-25', 'Chitarmal Manoj Kumar', 'Purchase', '21', 41093, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'Vetkind Animal Health India', 'Payment', '86', 155000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'Vetkind Animal Health India', 'Payment', '87', 43625, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Brokrage' OR legal_or_core_name ILIKE 'Brokrage' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'Brokrage', 'Payment', '88', 6852, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'Wages Expenses A/C', 'Payment', '89', 7500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'Convence Expensece', 'Payment', '90', 2000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anu Baat Bhandhar - Bheru Khejda' OR legal_or_core_name ILIKE 'Anu Baat Bhandhar - Bheru Khejda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'Anu Baat Bhandhar - Bheru Khejda', 'Receipt', '114', 35000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'Maa Karni Baat Bhander Sodala', 'Receipt', '115', 27525, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' OR legal_or_core_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'SHRI BALAJI ENTERPRISES-TIGARIYA', 'Receipt', '116', 70000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Yasika Agro Feed Industries Merta City' OR legal_or_core_name ILIKE 'Yasika Agro Feed Industries Merta City' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'Yasika Agro Feed Industries Merta City', 'Receipt', '117', 60000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Chand Pasu Aahar Malpura' OR legal_or_core_name ILIKE 'Shri Chand Pasu Aahar Malpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'Shri Chand Pasu Aahar Malpura', 'Receipt', '118', 142540, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trading Company - Khejroli - MM' OR legal_or_core_name ILIKE 'Manish Trading Company - Khejroli - MM' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'Manish Trading Company - Khejroli - MM', 'Receipt', '119', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S.S.Indurest' OR legal_or_core_name ILIKE 'S.S.Indurest' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'S.S.Indurest', 'Receipt', '120', 60732, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'M M Trading Company - Khejroli' OR legal_or_core_name ILIKE 'M M Trading Company - Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'M M Trading Company - Khejroli', 'Receipt', '121', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Murlidhar Ji Yadav- Khejroli' OR legal_or_core_name ILIKE 'Murlidhar Ji Yadav- Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'Murlidhar Ji Yadav- Khejroli', 'Receipt', '122', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nagarmal Pramod Kumar - Chidawa' OR legal_or_core_name ILIKE 'Nagarmal Pramod Kumar - Chidawa' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'Nagarmal Pramod Kumar - Chidawa', 'Sales', '3528/2026-27', 37620, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jaipur Packers - Rajasthan' OR legal_or_core_name ILIKE 'Jaipur Packers - Rajasthan' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'Jaipur Packers - Rajasthan', 'Purchase', '22', 55086, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' OR legal_or_core_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-27', 'SHRI RAM INDUSTRIES  (PHULERA)', 'Purchase', '23', 196312, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Fabriks Badharna' OR legal_or_core_name ILIKE 'Vinayak Fabriks Badharna' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-28', 'Vinayak Fabriks Badharna', 'Payment', '91', 35383, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Brokrage' OR legal_or_core_name ILIKE 'Brokrage' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-28', 'Brokrage', 'Payment', '92', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-28', 'Wages Expenses A/C', 'Payment', '93', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-28', 'Tour & Travel', 'Payment', '94', 2350, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nagarmal Pramod Kumar - Chidawa' OR legal_or_core_name ILIKE 'Nagarmal Pramod Kumar - Chidawa' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-28', 'Nagarmal Pramod Kumar - Chidawa', 'Receipt', '123', 77970, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trading Company - Khejroli - MM' OR legal_or_core_name ILIKE 'Manish Trading Company - Khejroli - MM' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-28', 'Manish Trading Company - Khejroli - MM', 'Receipt', '124', 3620, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'M M Trading Company - Khejroli' OR legal_or_core_name ILIKE 'M M Trading Company - Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-28', 'M M Trading Company - Khejroli', 'Receipt', '126', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Murlidhar Ji Yadav- Khejroli' OR legal_or_core_name ILIKE 'Murlidhar Ji Yadav- Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-28', 'Murlidhar Ji Yadav- Khejroli', 'Receipt', '127', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-28', 'Ishwar and Company Surajpool', 'Sales', '3529/2026-27', 97500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dinesh Baat Bhandar  (Dhabash)' OR legal_or_core_name ILIKE 'Dinesh Baat Bhandar  (Dhabash)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-28', 'Dinesh Baat Bhandar  (Dhabash)', 'Sales', '3530/2026-27', 8325, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ramnarayan Ji Yadev  Dhanota' OR legal_or_core_name ILIKE 'Ramnarayan Ji Yadev  Dhanota' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-28', 'Ramnarayan Ji Yadev  Dhanota', 'Sales', '3531/2026-27', 58750, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' OR legal_or_core_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-28', 'SHRI BALAJI ENTERPRISES-TIGARIYA', 'Sales', '3532/2026-27', 70128, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'J.S. Packers - Jaipur' OR legal_or_core_name ILIKE 'J.S. Packers - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-28', 'J.S. Packers - Jaipur', 'Purchase', '24', 10596, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Brokrage' OR legal_or_core_name ILIKE 'Brokrage' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-29', 'Brokrage', 'Payment', '95', 13620, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ms G D  Agro Bundi' OR legal_or_core_name ILIKE 'Ms G D  Agro Bundi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-29', 'Ms G D  Agro Bundi', 'Payment', '96', 1440, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-29', 'Wages Expenses A/C', 'Payment', '97', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Printing & Stationary' OR legal_or_core_name ILIKE 'Printing & Stationary' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-29', 'Printing & Stationary', 'Payment', '98', 1430, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Goyal Treders Fhagi' OR legal_or_core_name ILIKE 'Goyal Treders Fhagi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-29', 'Goyal Treders Fhagi', 'Receipt', '128', 95887, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dinesh Baat Bhandar  (Dhabash)' OR legal_or_core_name ILIKE 'Dinesh Baat Bhandar  (Dhabash)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-29', 'Dinesh Baat Bhandar  (Dhabash)', 'Receipt', '129', 28500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'M M Trading Company - Khejroli' OR legal_or_core_name ILIKE 'M M Trading Company - Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-29', 'M M Trading Company - Khejroli', 'Receipt', '130', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Murlidhar Ji Yadav- Khejroli' OR legal_or_core_name ILIKE 'Murlidhar Ji Yadav- Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-29', 'Murlidhar Ji Yadav- Khejroli', 'Receipt', '131', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Hanuman Treders Up' OR legal_or_core_name ILIKE 'Jai Hanuman Treders Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-29', 'Jai Hanuman Treders Up', 'Purchase', '25', 237945, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Chitarmal Manoj Kumar' OR legal_or_core_name ILIKE 'Chitarmal Manoj Kumar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'Chitarmal Manoj Kumar', 'Payment', '99', 41093, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'DILIP UDYOUG' OR legal_or_core_name ILIKE 'DILIP UDYOUG' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'DILIP UDYOUG', 'Payment', '100', 66082, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' OR legal_or_core_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'SHRI RAM INDUSTRIES  (PHULERA)', 'Payment', '101', 196312, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Brokrage' OR legal_or_core_name ILIKE 'Brokrage' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'Brokrage', 'Payment', '102', 13500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Car Loan - Hyrider' OR legal_or_core_name ILIKE 'Car Loan - Hyrider' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'Car Loan - Hyrider', 'Payment', '103', 48357, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'BANK  EXPENSES- PNB BANK' OR legal_or_core_name ILIKE 'BANK  EXPENSES- PNB BANK' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'BANK  EXPENSES- PNB BANK', 'Payment', '104', 49.85, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'Wages Expenses A/C', 'Payment', '105', 7500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'Office Expenses', 'Payment', '106', 1960, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nagarmal Pramod Kumar - Chidawa' OR legal_or_core_name ILIKE 'Nagarmal Pramod Kumar - Chidawa' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'Nagarmal Pramod Kumar - Chidawa', 'Receipt', '132', 37620, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Yasika Agro Feed Industries Merta City' OR legal_or_core_name ILIKE 'Yasika Agro Feed Industries Merta City' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'Yasika Agro Feed Industries Merta City', 'Receipt', '133', 41000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'M Choudhry Trading Company - Jalpali' OR legal_or_core_name ILIKE 'M Choudhry Trading Company - Jalpali' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'M Choudhry Trading Company - Jalpali', 'Receipt', '134', 59600, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'M M Trading Company - Khejroli' OR legal_or_core_name ILIKE 'M M Trading Company - Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'M M Trading Company - Khejroli', 'Receipt', '135', 2000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Murlidhar Ji Yadav- Khejroli' OR legal_or_core_name ILIKE 'Murlidhar Ji Yadav- Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'Murlidhar Ji Yadav- Khejroli', 'Receipt', '136', 2000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rakesh Kirana Store - Khejroli' OR legal_or_core_name ILIKE 'Rakesh Kirana Store - Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'Rakesh Kirana Store - Khejroli', 'Sales', '3533/2026-27', 37925, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Uttam Agencies Sambriya' OR legal_or_core_name ILIKE 'Uttam Agencies Sambriya' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'Uttam Agencies Sambriya', 'Sales', '3534/2026-27', 52078, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'Maa Karni Baat Bhander Sodala', 'Sales', '3535/2026-27', 11110, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'DILIP UDYOUG' OR legal_or_core_name ILIKE 'DILIP UDYOUG' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'DILIP UDYOUG', 'Purchase', '26', 40986, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-04-30', 'Vetkind Animal Health India', 'Purchase', '27', 22500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Hanuman Treders Up' OR legal_or_core_name ILIKE 'Jai Hanuman Treders Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-01', 'Jai Hanuman Treders Up', 'Payment', '107', 237945, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kanish Enterprises Jaipur' OR legal_or_core_name ILIKE 'Kanish Enterprises Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-01', 'Kanish Enterprises Jaipur', 'Payment', '108', 21736, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S M Sales Corporation  Jaipur' OR legal_or_core_name ILIKE 'S M Sales Corporation  Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-01', 'S M Sales Corporation  Jaipur', 'Payment', '109', 40568, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-01', 'Wages Expenses A/C', 'Payment', '110', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-01', 'Tour & Travel', 'Payment', '111', 1915, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Laxmipati Traders' OR legal_or_core_name ILIKE 'Laxmipati Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-01', 'Laxmipati Traders', 'Receipt', '137', 73560, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trandig Company' OR legal_or_core_name ILIKE 'Manish Trandig Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-01', 'Manish Trandig Company', 'Receipt', '138', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' OR legal_or_core_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-01', 'Krishna Baat Bhandhar- Sirsi Mode', 'Receipt', '139', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' OR legal_or_core_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-01', 'Krishna Baat Bhandhar- Sirsi Mode', 'Sales', '3536/2026-27', 17000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Shanker Rice and  Gen Mill' OR legal_or_core_name ILIKE 'Jai Shanker Rice and  Gen Mill' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-01', 'Jai Shanker Rice and  Gen Mill', 'Purchase', '28', 585177, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-02', 'Wages Expenses A/C', 'Payment', '112', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-02', 'Machinery Reparing', 'Payment', '113', 2350, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-02', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '140', 18638, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Harsit Kotari' OR legal_or_core_name ILIKE 'Harsit Kotari' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-02', 'Harsit Kotari', 'Receipt', '141', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rakesh Kirana Store - Khejroli' OR legal_or_core_name ILIKE 'Rakesh Kirana Store - Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-02', 'Rakesh Kirana Store - Khejroli', 'Receipt', '142', 11445, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trandig Company' OR legal_or_core_name ILIKE 'Manish Trandig Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-02', 'Manish Trandig Company', 'Receipt', '143', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' OR legal_or_core_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-02', 'Krishna Baat Bhandhar- Sirsi Mode', 'Receipt', '144', 8000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Brothers - Renwal' OR legal_or_core_name ILIKE 'Vinayak Brothers - Renwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-02', 'Vinayak Brothers - Renwal', 'Sales', '3537/2026-27', 98160, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-02', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '3538/2026-27', 18638, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ganesh Pashuahar Chaksu' OR legal_or_core_name ILIKE 'Ganesh Pashuahar Chaksu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-02', 'Ganesh Pashuahar Chaksu', 'Sales', '3539/2026-27', 106194, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Prakash Enterprises - Phulera' OR legal_or_core_name ILIKE 'Prakash Enterprises - Phulera' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-02', 'Prakash Enterprises - Phulera', 'Sales', '3540/226-27', 69270, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'PRABHA MAHILA KISSAN PRODUSER KHANDER' OR legal_or_core_name ILIKE 'PRABHA MAHILA KISSAN PRODUSER KHANDER' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-02', 'PRABHA MAHILA KISSAN PRODUSER KHANDER', 'Sales', '3541/2026-27', 66500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Raghav Corporation Dis Baran' OR legal_or_core_name ILIKE 'Raghav Corporation Dis Baran' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-02', 'Raghav Corporation Dis Baran', 'Purchase', '29', 836190, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Raghav Corporation Dis Baran', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Raghav Corporation Dis Baran';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Hanuman Treders Up' OR legal_or_core_name ILIKE 'Jai Hanuman Treders Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-02', 'Jai Hanuman Treders Up', 'Purchase', '30', 223208, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jaipur Packers - Rajasthan' OR legal_or_core_name ILIKE 'Jaipur Packers - Rajasthan' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-02', 'Jaipur Packers - Rajasthan', 'Purchase', '31', 88934, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-03', 'Maa Karni Baat Bhander Sodala', 'Receipt', '145', 11110, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-04', 'Wages Expenses A/C', 'Payment', '114', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-04', 'Tour & Travel', 'Payment', '115', 2300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Harsit Kotari' OR legal_or_core_name ILIKE 'Harsit Kotari' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-04', 'Harsit Kotari', 'Receipt', '146', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Prakash Enterprises - Phulera' OR legal_or_core_name ILIKE 'Prakash Enterprises - Phulera' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-04', 'Prakash Enterprises - Phulera', 'Receipt', '147', 43420, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-04', 'Choudhary Pashu Aahar  Parbatsar', 'Receipt', '148', 60000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Yasika Agro Feed Industries Merta City' OR legal_or_core_name ILIKE 'Yasika Agro Feed Industries Merta City' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-04', 'Yasika Agro Feed Industries Merta City', 'Receipt', '149', 12057, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2026-05-04', 'Ishwar and Company Surajpool', 'Receipt', '150', 94500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

END $$;