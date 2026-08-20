DO $$
DECLARE
  p_id UUID;
  t_id UUID;
  r_id UUID;
BEGIN
  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-04', 'Choudhary Pashu Aahar  Parbatsar', 'Receipt', '493', 25000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-04', 'Godha Enterprises (Hingoniya)', 'Receipt', '494', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Uttam Agencies Sambriya' OR legal_or_core_name ILIKE 'Uttam Agencies Sambriya' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-04', 'Uttam Agencies Sambriya', 'Sales', '2720/25-26', 47492, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-05', 'Wages Expenses A/C', 'Payment', '553', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-05', 'Tour & Travel', 'Payment', '554', 1850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-05', 'Office Expenses', 'Payment', '555', 155, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-05', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '495', 13213, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-05', 'Godha Enterprises (Hingoniya)', 'Receipt', '496', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Brothers - Renwal' OR legal_or_core_name ILIKE 'Vinayak Brothers - Renwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-05', 'Vinayak Brothers - Renwal', 'Sales', '2721/25-26', 91840, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-05', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2722/25-26', 31850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-05', 'Kharwash Trading Company (Muhana )', 'Sales', '2723/25-26', 64075, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' OR legal_or_core_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-05', 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur', 'Sales', '2724/25-26', 26955, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-06', 'Wages Expenses A/C', 'Payment', '556', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-06', 'Tour & Travel', 'Payment', '557', 2000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'J.S. Packers - Jaipur' OR legal_or_core_name ILIKE 'J.S. Packers - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-06', 'J.S. Packers - Jaipur', 'Payment', '558', 41440, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-06', 'Kharwash Trading Company (Muhana )', 'Receipt', '497', 547284, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-06', 'Godha Enterprises (Hingoniya)', 'Receipt', '498', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-06', 'Haritwal Pashu Ahar Vatika', 'Sales', '2725/25-26', 72870, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Indastrises  Didwana' OR legal_or_core_name ILIKE 'Balaji Indastrises  Didwana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-06', 'Balaji Indastrises  Didwana', 'Sales', '2726/25-26', 66040, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S M Sales Corporation  Jaipur' OR legal_or_core_name ILIKE 'S M Sales Corporation  Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-06', 'S M Sales Corporation  Jaipur', 'Purchase', '95', 3822, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' OR legal_or_core_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-06', 'Mangal Treding Company Kukerkheda Mhandi', 'Purchase', '96', 7428.48, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'DILIP UDYOUG' OR legal_or_core_name ILIKE 'DILIP UDYOUG' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-06', 'DILIP UDYOUG', 'Purchase', '97', 40986, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nilesh Kumar Khandelwal' OR legal_or_core_name ILIKE 'Nilesh Kumar Khandelwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-07', 'Nilesh Kumar Khandelwal', 'Payment', '559', 9500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-07', 'Wages Expenses A/C', 'Payment', '560', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-07', 'Convence Expensece', 'Payment', '561', 3000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Hari Shanker Khandelwal' OR legal_or_core_name ILIKE 'Shri Hari Shanker Khandelwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-07', 'Shri Hari Shanker Khandelwal', 'Payment', '562', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-07', 'Godha Enterprises (Hingoniya)', 'Receipt', '499', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' OR legal_or_core_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-07', 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur', 'Receipt', '500', 26900, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rakesh Kirana Store - Khejroli' OR legal_or_core_name ILIKE 'Rakesh Kirana Store - Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-07', 'Rakesh Kirana Store - Khejroli', 'Sales', '2727/25-26', 32964, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-07', 'Kharwash Trading Company (Muhana )', 'Sales', '2728/25-26', 57810, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-07', 'Choudhary Pashu Aahar  Parbatsar', 'Sales', '2729/25-26', 74775, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rajendra Kumar Pawan Kumar Fhagi' OR legal_or_core_name ILIKE 'Rajendra Kumar Pawan Kumar Fhagi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-07', 'Rajendra Kumar Pawan Kumar Fhagi', 'Sales', '2730/25-26', 28564, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Agro Industries - Muhana' OR legal_or_core_name ILIKE 'Shri Balaji Agro Industries - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-07', 'Shri Balaji Agro Industries - Muhana', 'Sales', '2731/25-26', 26923, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nilesh Kumar Khandelwal' OR legal_or_core_name ILIKE 'Nilesh Kumar Khandelwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-08', 'Nilesh Kumar Khandelwal', 'Payment', '563', 9500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-08', 'Wages Expenses A/C', 'Payment', '564', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-08', 'Machinery Reparing', 'Payment', '565', 2211, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' OR legal_or_core_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-08', 'Mangal Treding Company Kukerkheda Mhandi', 'Payment', '566', 4872, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-08', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Receipt', '501', 115873, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anjani Trading Company  -(Beawar)' OR legal_or_core_name ILIKE 'Anjani Trading Company  -(Beawar)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-08', 'Anjani Trading Company  -(Beawar)', 'Receipt', '503', 55394, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-08', 'Godha Enterprises (Hingoniya)', 'Receipt', '504', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-08', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '505', 31850, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-08', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2732/25-26', 17535, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-08', 'Lavik Traders', 'Sales', '2733/25-26', 38596, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jain & Brothers - Muhana Mandi' OR legal_or_core_name ILIKE 'Jain & Brothers - Muhana Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-08', 'Jain & Brothers - Muhana Mandi', 'Sales', '2734/25-26', 62716, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Sunny Industries Sitapura Jaipur' OR legal_or_core_name ILIKE 'Sunny Industries Sitapura Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-08', 'Sunny Industries Sitapura Jaipur', 'Purchase', '98', 31560, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ramkishor Pawan Kumar-Surajpool' OR legal_or_core_name ILIKE 'Ramkishor Pawan Kumar-Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-08', 'Ramkishor Pawan Kumar-Surajpool', 'Purchase', '99', 26460, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-09', 'Wages Expenses A/C', 'Payment', '567', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-09', 'Office Expenses', 'Payment', '568', 2650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-09', 'Godha Enterprises (Hingoniya)', 'Receipt', '506', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rajendra Kumar Pawan Kumar Fhagi' OR legal_or_core_name ILIKE 'Rajendra Kumar Pawan Kumar Fhagi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-10', 'Rajendra Kumar Pawan Kumar Fhagi', 'Receipt', '507', 28564, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Agro Industries - Muhana' OR legal_or_core_name ILIKE 'Shri Balaji Agro Industries - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-10', 'Shri Balaji Agro Industries - Muhana', 'Receipt', '508', 21387, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-10', 'Godha Enterprises (Hingoniya)', 'Receipt', '509', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-11', 'Wages Expenses A/C', 'Payment', '569', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-11', 'Tour & Travel', 'Payment', '570', 2000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Electricity and Water Expenses' OR legal_or_core_name ILIKE 'Electricity and Water Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-11', 'Electricity and Water Expenses', 'Payment', '571', 236, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Sunny Industries Sitapura Jaipur' OR legal_or_core_name ILIKE 'Sunny Industries Sitapura Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-11', 'Sunny Industries Sitapura Jaipur', 'Payment', '572', 31560, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'DILIP UDYOUG' OR legal_or_core_name ILIKE 'DILIP UDYOUG' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-11', 'DILIP UDYOUG', 'Payment', '573', 40986, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-11', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '510', 17535, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Prakash Enterprises - Phulera' OR legal_or_core_name ILIKE 'Prakash Enterprises - Phulera' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-11', 'Prakash Enterprises - Phulera', 'Receipt', '511', 78595, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jitender Baat Bhandhar - Jhobner' OR legal_or_core_name ILIKE 'Jitender Baat Bhandhar - Jhobner' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-11', 'Jitender Baat Bhandhar - Jhobner', 'Receipt', '512', 5000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-11', 'Godha Enterprises (Hingoniya)', 'Receipt', '513', 5000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Subham Pasu Aahar Badanwada' OR legal_or_core_name ILIKE 'Subham Pasu Aahar Badanwada' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-11', 'Subham Pasu Aahar Badanwada', 'Receipt', '514', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-11', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2735/25-26', 18760, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-12', 'Wages Expenses A/C', 'Payment', '574', 7500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-12', 'Tour & Travel', 'Payment', '575', 2850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-12', 'Choudhary Pashu Aahar  Parbatsar', 'Receipt', '515', 19725, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-12', 'Lavik Traders', 'Receipt', '516', 42998, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' OR legal_or_core_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-12', 'SHRI BALAJI ENTERPRISES-TIGARIYA', 'Sales', '2736/25-26', 68992, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Badri Lal Dwaraka Parsad Nasirabad' OR legal_or_core_name ILIKE 'Badri Lal Dwaraka Parsad Nasirabad' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-12', 'Badri Lal Dwaraka Parsad Nasirabad', 'Sales', '2737/25-26', 106720, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rambilas Ishwardas - Kukerkeda' OR legal_or_core_name ILIKE 'Rambilas Ishwardas - Kukerkeda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-12', 'Rambilas Ishwardas - Kukerkeda', 'Purchase', '100', 3753, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-13', 'Wages Expenses A/C', 'Payment', '576', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-13', 'Convence Expensece', 'Payment', '577', 2300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-13', 'Choudhary Pashu Aahar  Parbatsar', 'Receipt', '517', 20000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Indastrises  Didwana' OR legal_or_core_name ILIKE 'Balaji Indastrises  Didwana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-13', 'Balaji Indastrises  Didwana', 'Receipt', '518', 66040, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dera Sachha Sodha' OR legal_or_core_name ILIKE 'Dera Sachha Sodha' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-13', 'Dera Sachha Sodha', 'Receipt', '519', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Dera Sachha Sodha', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Dera Sachha Sodha';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jain & Brothers - Muhana Mandi' OR legal_or_core_name ILIKE 'Jain & Brothers - Muhana Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-13', 'Jain & Brothers - Muhana Mandi', 'Receipt', '520', 62717, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Patel Enterprises  Rojda' OR legal_or_core_name ILIKE 'Patel Enterprises  Rojda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-13', 'Patel Enterprises  Rojda', 'Sales', '2738/25-26', 61900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading  Company  - Lalshot' OR legal_or_core_name ILIKE 'Balaji Trading  Company  - Lalshot' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-13', 'Balaji Trading  Company  - Lalshot', 'Sales', '2739/25-26', 76146, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-13', 'Ishwar and Company Surajpool', 'Sales', '2740/25-26', 94500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Abhishek Treding Company  Fathenegar' OR legal_or_core_name ILIKE 'Abhishek Treding Company  Fathenegar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-13', 'Abhishek Treding Company  Fathenegar', 'Sales', '2741/25-26', 243000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Om Prakash Rajesh Kumar - Jaipur' OR legal_or_core_name ILIKE 'Om Prakash Rajesh Kumar - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-13', 'Om Prakash Rajesh Kumar - Jaipur', 'Purchase', '101', 111720, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S M Sales Corporation  Jaipur' OR legal_or_core_name ILIKE 'S M Sales Corporation  Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-13', 'S M Sales Corporation  Jaipur', 'Purchase', '102', 2547, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' OR legal_or_core_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-13', 'Mangal Treding Company Kukerkheda Mhandi', 'Purchase', '103', 1746, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-14', 'Wages Expenses A/C', 'Payment', '578', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Electricity and Water Expenses' OR legal_or_core_name ILIKE 'Electricity and Water Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-14', 'Electricity and Water Expenses', 'Payment', '579', 74853, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Printing & Stationary' OR legal_or_core_name ILIKE 'Printing & Stationary' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-14', 'Printing & Stationary', 'Payment', '580', 2640, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Hari Shanker Khandelwal' OR legal_or_core_name ILIKE 'Shri Hari Shanker Khandelwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-14', 'Shri Hari Shanker Khandelwal', 'Payment', '581', 150000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-14', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '521', 18760, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading  Company  - Lalshot' OR legal_or_core_name ILIKE 'Balaji Trading  Company  - Lalshot' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-14', 'Balaji Trading  Company  - Lalshot', 'Receipt', '522', 76146, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Abhishek Treding Company  Fathenegar' OR legal_or_core_name ILIKE 'Abhishek Treding Company  Fathenegar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-14', 'Abhishek Treding Company  Fathenegar', 'Receipt', '523', 243000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dera Sachha Sodha' OR legal_or_core_name ILIKE 'Dera Sachha Sodha' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-14', 'Dera Sachha Sodha', 'Receipt', '524', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-14', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2742/25-26', 18760, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-14', 'Kharwash Trading Company (Muhana )', 'Sales', '2743/25-26', 66760, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-16', 'Wages Expenses A/C', 'Payment', '582', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-16', 'Tour & Travel', 'Payment', '583', 2160, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'BUSINESS PROMOTION EXPENSES' OR legal_or_core_name ILIKE 'BUSINESS PROMOTION EXPENSES' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-16', 'BUSINESS PROMOTION EXPENSES', 'Payment', '584', 23849, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dera Sachha Sodha' OR legal_or_core_name ILIKE 'Dera Sachha Sodha' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-16', 'Dera Sachha Sodha', 'Receipt', '525', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trandig Company' OR legal_or_core_name ILIKE 'Manish Trandig Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-16', 'Manish Trandig Company', 'Receipt', '526', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-16', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '527', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-16', 'Lavik Traders', 'Sales', '2744/25-26', 50370, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anjani Trading Company  -(Beawar)' OR legal_or_core_name ILIKE 'Anjani Trading Company  -(Beawar)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-16', 'Anjani Trading Company  -(Beawar)', 'Sales', '2745/25-26', 51715, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dera Sachha Sodha' OR legal_or_core_name ILIKE 'Dera Sachha Sodha' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-16', 'Dera Sachha Sodha', 'Sales', '2746/25-26', 54900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jurashik Minral' OR legal_or_core_name ILIKE 'Jurashik Minral' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-16', 'Jurashik Minral', 'Purchase', '104', 35913, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dinesh Baat Bhandar  (Dhabash)' OR legal_or_core_name ILIKE 'Dinesh Baat Bhandar  (Dhabash)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-17', 'Dinesh Baat Bhandar  (Dhabash)', 'Receipt', '528', 38988, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mehta Baat Bhandhar - GovindPura' OR legal_or_core_name ILIKE 'Mehta Baat Bhandhar - GovindPura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-17', 'Mehta Baat Bhandhar - GovindPura', 'Sales', '2747/25-26', 56160, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-17', 'Godha Enterprises (Hingoniya)', 'Sales', '2748/25-26', 106275, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-18', 'Wages Expenses A/C', 'Payment', '585', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-18', 'Office Expenses', 'Payment', '586', 1860, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Fright Exp' OR legal_or_core_name ILIKE 'Fright Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-18', 'Fright Exp', 'Payment', '587', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S M Sales Corporation  Jaipur' OR legal_or_core_name ILIKE 'S M Sales Corporation  Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-18', 'S M Sales Corporation  Jaipur', 'Payment', '588', 3822, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dera Sachha Sodha' OR legal_or_core_name ILIKE 'Dera Sachha Sodha' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-18', 'Dera Sachha Sodha', 'Receipt', '529', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trandig Company' OR legal_or_core_name ILIKE 'Manish Trandig Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-18', 'Manish Trandig Company', 'Receipt', '530', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-18', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '531', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-18', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2749/25-26', 3940, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-19', 'Wages Expenses A/C', 'Payment', '589', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-19', 'Tour & Travel', 'Payment', '590', 2000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Fright Exp' OR legal_or_core_name ILIKE 'Fright Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-19', 'Fright Exp', 'Payment', '591', 8940, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-19', 'G.K.N - Industries', 'Receipt', '532', 71000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dera Sachha Sodha' OR legal_or_core_name ILIKE 'Dera Sachha Sodha' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-19', 'Dera Sachha Sodha', 'Receipt', '533', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trandig Company' OR legal_or_core_name ILIKE 'Manish Trandig Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-19', 'Manish Trandig Company', 'Receipt', '534', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-19', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '535', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Pashupati Trading Company' OR legal_or_core_name ILIKE 'Pashupati Trading Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-19', 'Pashupati Trading Company', 'Sales', '2750/25-26', 63740, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Maa  Devi Traders (Jahanabad) Bihar' OR legal_or_core_name ILIKE 'Jai Maa  Devi Traders (Jahanabad) Bihar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-19', 'Jai Maa  Devi Traders (Jahanabad) Bihar', 'Purchase', '105', 83410, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Jai Maa  Devi Traders (Jahanabad) Bihar', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Jai Maa  Devi Traders (Jahanabad) Bihar';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Agrasen Industries Jaitpura' OR legal_or_core_name ILIKE 'Agrasen Industries Jaitpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-19', 'Agrasen Industries Jaitpura', 'Purchase', '106', 158660, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Agrasen Industries Jaitpura', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Agrasen Industries Jaitpura';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-20', 'Wages Expenses A/C', 'Payment', '592', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-20', 'Convence Expensece', 'Payment', '593', 2000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S M Sales Corporation  Jaipur' OR legal_or_core_name ILIKE 'S M Sales Corporation  Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-20', 'S M Sales Corporation  Jaipur', 'Payment', '594', 2547, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dera Sachha Sodha' OR legal_or_core_name ILIKE 'Dera Sachha Sodha' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-20', 'Dera Sachha Sodha', 'Receipt', '536', 7400, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Pashupati Trading Company' OR legal_or_core_name ILIKE 'Pashupati Trading Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-20', 'Pashupati Trading Company', 'Receipt', '537', 41497, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trandig Company' OR legal_or_core_name ILIKE 'Manish Trandig Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-20', 'Manish Trandig Company', 'Receipt', '538', 3000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-20', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '539', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-20', 'Haritwal Pashu Ahar Vatika', 'Receipt', '540', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-20', 'Kharwash Trading Company (Muhana )', 'Sales', '2751/25-26', 57810, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Agro Industries - Muhana' OR legal_or_core_name ILIKE 'Shri Balaji Agro Industries - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-20', 'Shri Balaji Agro Industries - Muhana', 'Sales', '2752/25-26', 27900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-20', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Sales', '2753/25-26', 116165, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mahavr Mills Kekri' OR legal_or_core_name ILIKE 'Mahavr Mills Kekri' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-20', 'Mahavr Mills Kekri', 'Purchase', '107', 123190, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Maa  Devi Traders (Jahanabad) Bihar' OR legal_or_core_name ILIKE 'Jai Maa  Devi Traders (Jahanabad) Bihar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Jai Maa  Devi Traders (Jahanabad) Bihar', 'Payment', '595', 83410, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Insurance Exp' OR legal_or_core_name ILIKE 'Insurance Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Insurance Exp', 'Payment', '596', 29371, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Insurance Exp', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Insurance Exp';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mahavr Mills Kekri' OR legal_or_core_name ILIKE 'Mahavr Mills Kekri' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Mahavr Mills Kekri', 'Payment', '597', 123190, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Agrasen Industries Jaitpura' OR legal_or_core_name ILIKE 'Agrasen Industries Jaitpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Agrasen Industries Jaitpura', 'Payment', '598', 158660, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jurashik Minral' OR legal_or_core_name ILIKE 'Jurashik Minral' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Jurashik Minral', 'Payment', '599', 35913, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Pritiya Organics - Jaipur' OR legal_or_core_name ILIKE 'Pritiya Organics - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Pritiya Organics - Jaipur', 'Payment', '600', 16900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Pritiya Organics - Jaipur', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Pritiya Organics - Jaipur';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Wages Expenses A/C', 'Payment', '601', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Fright Exp' OR legal_or_core_name ILIKE 'Fright Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Fright Exp', 'Payment', '602', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Hariyana Baat  Bhandar Dolaitpura' OR legal_or_core_name ILIKE 'Hariyana Baat  Bhandar Dolaitpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Hariyana Baat  Bhandar Dolaitpura', 'Receipt', '541', 11000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Ishwar and Company Surajpool', 'Receipt', '542', 96000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Babulal Ji Yadav - Mahaswas' OR legal_or_core_name ILIKE 'Babulal Ji Yadav - Mahaswas' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Babulal Ji Yadav - Mahaswas', 'Receipt', '543', 81000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '544', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Haritwal Pashu Ahar Vatika', 'Receipt', '545', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Bhagwati Trading Company BANDIKUI' OR legal_or_core_name ILIKE 'Maa Bhagwati Trading Company BANDIKUI' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Maa Bhagwati Trading Company BANDIKUI', 'Sales', '.2754/2025-2026', 62003, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Maa Bhagwati Trading Company BANDIKUI', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Maa Bhagwati Trading Company BANDIKUI';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Pritiya Organics - Jaipur' OR legal_or_core_name ILIKE 'Pritiya Organics - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Pritiya Organics - Jaipur', 'Purchase', '108', 16900, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading Company MUHANA' OR legal_or_core_name ILIKE 'Balaji Trading Company MUHANA' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Balaji Trading Company MUHANA', 'Purchase', '109', 58905, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Balaji Trading Company MUHANA', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Balaji Trading Company MUHANA';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jain & Brothers - Muhana Mandi' OR legal_or_core_name ILIKE 'Jain & Brothers - Muhana Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Jain & Brothers - Muhana Mandi', 'Purchase', '110', 16930, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'National Traders Uttarakhand' OR legal_or_core_name ILIKE 'National Traders Uttarakhand' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'National Traders Uttarakhand', 'Purchase', '111', 481270, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('National Traders Uttarakhand', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'National Traders Uttarakhand';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Agri Channel Overseas Tonk Rood Jaipur' OR legal_or_core_name ILIKE 'Agri Channel Overseas Tonk Rood Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Agri Channel Overseas Tonk Rood Jaipur', 'Purchase', '112', 431399, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Agri Channel Overseas Tonk Rood Jaipur', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Agri Channel Overseas Tonk Rood Jaipur';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Padmawati Trading Co.' OR legal_or_core_name ILIKE 'Padmawati Trading Co.' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Padmawati Trading Co.', 'Purchase', '113', 851834, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Agro Industries - Muhana' OR legal_or_core_name ILIKE 'Shri Balaji Agro Industries - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-21', 'Shri Balaji Agro Industries - Muhana', 'Purchase', '114', 1881, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-22', 'Office Expenses', 'Payment', '603', 50, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-22', 'Wages Expenses A/C', 'Payment', '604', 6300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-22', 'Convence Expensece', 'Payment', '605', 4500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-22', 'Tour & Travel', 'Payment', '606', 2290, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Fright Exp' OR legal_or_core_name ILIKE 'Fright Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-22', 'Fright Exp', 'Payment', '607', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Blue Diamond Food Production' OR legal_or_core_name ILIKE 'Blue Diamond Food Production' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-22', 'Blue Diamond Food Production', 'Receipt', '546', 17240, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-22', 'Lavik Traders', 'Receipt', '547', 38780, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-22', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '548', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-22', 'Haritwal Pashu Ahar Vatika', 'Receipt', '549', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ganesh Pashuahar Chaksu' OR legal_or_core_name ILIKE 'Ganesh Pashuahar Chaksu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-22', 'Ganesh Pashuahar Chaksu', 'Sales', '2755/2025-2026', 106353, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-23', 'Wages Expenses A/C', 'Payment', '608', 6850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-23', 'Tour & Travel', 'Payment', '609', 3210, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-23', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '550', 6800, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-23', 'Haritwal Pashu Ahar Vatika', 'Receipt', '551', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Namokaar Trading Company' OR legal_or_core_name ILIKE 'Shri Namokaar Trading Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-23', 'Shri Namokaar Trading Company', 'Receipt', '552', 5000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dinesh Baat Bhandar  (Dhabash)' OR legal_or_core_name ILIKE 'Dinesh Baat Bhandar  (Dhabash)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-23', 'Dinesh Baat Bhandar  (Dhabash)', 'Sales', '2756/25-26', 33650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-23', 'Lavik Traders', 'Sales', '2757/25-26', 33138, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-23', 'Kharwash Trading Company (Muhana )', 'Sales', '2758/25-26', 63853, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-23', 'G.K.N - Industries', 'Sales', '2759/25-26', 61945, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Om Prakash Rajesh Kumar - Jaipur' OR legal_or_core_name ILIKE 'Om Prakash Rajesh Kumar - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-25', 'Om Prakash Rajesh Kumar - Jaipur', 'Payment', '610', 111720, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-25', 'Office Expenses', 'Payment', '611', 1940, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-25', 'Wages Expenses A/C', 'Payment', '612', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Fright Exp' OR legal_or_core_name ILIKE 'Fright Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-25', 'Fright Exp', 'Payment', '613', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-25', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '553', 22095, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Giriraj Enterprises - Kalu Ka Baas' OR legal_or_core_name ILIKE 'Giriraj Enterprises - Kalu Ka Baas' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-25', 'Giriraj Enterprises - Kalu Ka Baas', 'Receipt', '554', 44887, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' OR legal_or_core_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-25', 'SHRI BALAJI ENTERPRISES-TIGARIYA', 'Receipt', '555', 61298, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anjani Trading Company  -(Beawar)' OR legal_or_core_name ILIKE 'Anjani Trading Company  -(Beawar)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-25', 'Anjani Trading Company  -(Beawar)', 'Receipt', '556', 51625, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-25', 'Haritwal Pashu Ahar Vatika', 'Receipt', '557', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jain & Brothers - Muhana Mandi' OR legal_or_core_name ILIKE 'Jain & Brothers - Muhana Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-25', 'Jain & Brothers - Muhana Mandi', 'Sales', '2760/25-26', 62715, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-25', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2761/25-26', 17900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anjani Trading Company  -(Beawar)' OR legal_or_core_name ILIKE 'Anjani Trading Company  -(Beawar)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-25', 'Anjani Trading Company  -(Beawar)', 'Sales', '2762/25-26', 52608, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'National Traders Uttarakhand' OR legal_or_core_name ILIKE 'National Traders Uttarakhand' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'National Traders Uttarakhand', 'Payment', '614', 481270, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Agri Channel Overseas Tonk Rood Jaipur' OR legal_or_core_name ILIKE 'Agri Channel Overseas Tonk Rood Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'Agri Channel Overseas Tonk Rood Jaipur', 'Payment', '615', 431399, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading Company MUHANA' OR legal_or_core_name ILIKE 'Balaji Trading Company MUHANA' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'Balaji Trading Company MUHANA', 'Payment', '616', 58905, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Padmawati Trading Co.' OR legal_or_core_name ILIKE 'Padmawati Trading Co.' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'Padmawati Trading Co.', 'Payment', '617', 843714, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'Wages Expenses A/C', 'Payment', '618', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'Tour & Travel', 'Payment', '619', 1000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Fright Exp' OR legal_or_core_name ILIKE 'Fright Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'Fright Exp', 'Payment', '620', 4250, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'Haritwal Pashu Ahar Vatika', 'Receipt', '558', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tarachand Ji -Yadav Khejroli' OR legal_or_core_name ILIKE 'Tarachand Ji -Yadav Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'Tarachand Ji -Yadav Khejroli', 'Receipt', '559', 44900, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Brothers - Renwal' OR legal_or_core_name ILIKE 'Vinayak Brothers - Renwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'Vinayak Brothers - Renwal', 'Receipt', '560', 94180, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Discount Given' OR legal_or_core_name ILIKE 'Discount Given' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'Discount Given', 'Journal', '10', 146, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'Kharwash Trading Company (Muhana )', 'Sales', '2763/25-26', 57810, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' OR legal_or_core_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'SHRI BALAJI ENTERPRISES-TIGARIYA', 'Sales', '2764/25-26', 69121, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tarachand Ji -Yadav Khejroli' OR legal_or_core_name ILIKE 'Tarachand Ji -Yadav Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'Tarachand Ji -Yadav Khejroli', 'Sales', '2765/25-26', 44900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Chand Pasu Aahar Malpura' OR legal_or_core_name ILIKE 'Shri Chand Pasu Aahar Malpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'Shri Chand Pasu Aahar Malpura', 'Sales', '2766/25-26', 97512, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'DILIP UDYOUG' OR legal_or_core_name ILIKE 'DILIP UDYOUG' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'DILIP UDYOUG', 'Purchase', '115', 40986, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Sanjay Chura Mill - Bihar' OR legal_or_core_name ILIKE 'Sanjay Chura Mill - Bihar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-26', 'Sanjay Chura Mill - Bihar', 'Purchase', '116', 248253, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Sanjay Chura Mill - Bihar', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Sanjay Chura Mill - Bihar';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Telephone Exp' OR legal_or_core_name ILIKE 'Telephone Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-27', 'Telephone Exp', 'Payment', '621', 1049, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-27', 'Wages Expenses A/C', 'Payment', '622', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-27', 'Convence Expensece', 'Payment', '623', 2500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-27', 'Haritwal Pashu Ahar Vatika', 'Receipt', '561', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jain & Brothers - Muhana Mandi' OR legal_or_core_name ILIKE 'Jain & Brothers - Muhana Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-27', 'Jain & Brothers - Muhana Mandi', 'Receipt', '562', 62717, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-27', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '563', 17900, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-27', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2767/25-26', 18805, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shiv Trading Comnay Vatika' OR legal_or_core_name ILIKE 'Shiv Trading Comnay Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-27', 'Shiv Trading Comnay Vatika', 'Sales', '2768/25-26', 73385, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'KAMAL TRADING CO Dudu' OR legal_or_core_name ILIKE 'KAMAL TRADING CO Dudu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-27', 'KAMAL TRADING CO Dudu', 'Sales', '2769/25-26', 51500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rambilas Ishwardas - Kukerkeda' OR legal_or_core_name ILIKE 'Rambilas Ishwardas - Kukerkeda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-28', 'Rambilas Ishwardas - Kukerkeda', 'Payment', '624', 3753, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-28', 'Wages Expenses A/C', 'Payment', '625', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-28', 'Machinery Reparing', 'Payment', '626', 1850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anukumar Mukesh Kumar Malpura' OR legal_or_core_name ILIKE 'Anukumar Mukesh Kumar Malpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-28', 'Anukumar Mukesh Kumar Malpura', 'Receipt', '564', 90000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shiv Trading Comnay Vatika' OR legal_or_core_name ILIKE 'Shiv Trading Comnay Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-28', 'Shiv Trading Comnay Vatika', 'Receipt', '565', 73170, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-28', 'Choudhary Pashu Aahar  Parbatsar', 'Receipt', '566', 40000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'J P Fresh Mills - Jairampura' OR legal_or_core_name ILIKE 'J P Fresh Mills - Jairampura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-28', 'J P Fresh Mills - Jairampura', 'Receipt', '567', 17000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'J P Fresh Mills - Jairampura' OR legal_or_core_name ILIKE 'J P Fresh Mills - Jairampura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-28', 'J P Fresh Mills - Jairampura', 'Receipt', '568', 300, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-28', 'Haritwal Pashu Ahar Vatika', 'Receipt', '569', 6870, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Ji Yadav' OR legal_or_core_name ILIKE 'Shyam Ji Yadav' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-28', 'Shyam Ji Yadav', 'Sales', '2770/25-26', 63798, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Shyam Ji Yadav', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Shyam Ji Yadav';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Babulal Ji Yadav - Mahaswas' OR legal_or_core_name ILIKE 'Babulal Ji Yadav - Mahaswas' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-28', 'Babulal Ji Yadav - Mahaswas', 'Sales', '2771/25-26', 78600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-29', 'Vetkind Animal Health India', 'Payment', '627', 143000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-29', 'Wages Expenses A/C', 'Payment', '628', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-29', 'Tour & Travel', 'Payment', '629', 1750, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anjani Trading Company  -(Beawar)' OR legal_or_core_name ILIKE 'Anjani Trading Company  -(Beawar)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-29', 'Anjani Trading Company  -(Beawar)', 'Receipt', '570', 52608, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Agro Industries - Muhana' OR legal_or_core_name ILIKE 'Shri Balaji Agro Industries - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-29', 'Shri Balaji Agro Industries - Muhana', 'Receipt', '571', 26920, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rajendra Kumar Pawan Kumar Fhagi' OR legal_or_core_name ILIKE 'Rajendra Kumar Pawan Kumar Fhagi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-29', 'Rajendra Kumar Pawan Kumar Fhagi', 'Sales', '2772/25-26', 26012, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rajendra Kumar Pawan Kumar Fhagi' OR legal_or_core_name ILIKE 'Rajendra Kumar Pawan Kumar Fhagi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-29', 'Rajendra Kumar Pawan Kumar Fhagi', 'Sales', '2773/25-26', 21681, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-29', 'Kharwash Trading Company (Muhana )', 'Sales', '2774/25-26', 60000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'J.S. Packers - Jaipur' OR legal_or_core_name ILIKE 'J.S. Packers - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-29', 'J.S. Packers - Jaipur', 'Purchase', '117', 30975, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Agrasen Industries Jaitpura' OR legal_or_core_name ILIKE 'Agrasen Industries Jaitpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-29', 'Agrasen Industries Jaitpura', 'Purchase', '118', 50422, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Car Loan - Hyrider' OR legal_or_core_name ILIKE 'Car Loan - Hyrider' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-30', 'Car Loan - Hyrider', 'Payment', '630', 48357, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Sanjay Chura Mill - Bihar' OR legal_or_core_name ILIKE 'Sanjay Chura Mill - Bihar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-30', 'Sanjay Chura Mill - Bihar', 'Payment', '631', 248253, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'DILIP UDYOUG' OR legal_or_core_name ILIKE 'DILIP UDYOUG' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-30', 'DILIP UDYOUG', 'Payment', '632', 40986, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-30', 'Wages Expenses A/C', 'Payment', '633', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Printing & Stationary' OR legal_or_core_name ILIKE 'Printing & Stationary' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-30', 'Printing & Stationary', 'Payment', '634', 1910, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-30', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '572', 18805, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'KAMAL TRADING CO Dudu' OR legal_or_core_name ILIKE 'KAMAL TRADING CO Dudu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-30', 'KAMAL TRADING CO Dudu', 'Receipt', '573', 60000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-30', 'Lavik Traders', 'Receipt', '574', 50443, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-30', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2775/25-26', 17535, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maruti Trading Company Kalwar' OR legal_or_core_name ILIKE 'Maruti Trading Company Kalwar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-30', 'Maruti Trading Company Kalwar', 'Sales', '2776/25-26', 62100, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-30', 'Vetkind Animal Health India', 'Purchase', '119', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-30', 'Vetkind Animal Health India', 'Purchase', '120', 24000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-30', 'Vetkind Animal Health India', 'Purchase', '121', 70000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Chand Pasu Aahar Malpura' OR legal_or_core_name ILIKE 'Shri Chand Pasu Aahar Malpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-31', 'Shri Chand Pasu Aahar Malpura', 'Receipt', '575', 102517, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-31', 'Ishwar and Company Surajpool', 'Sales', '2777/25-26', 78750, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' OR legal_or_core_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-01', 'Mangal Treding Company Kukerkheda Mhandi', 'Payment', '635', 9174, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-01', 'Wages Expenses A/C', 'Payment', '636', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-01', 'Machinery Reparing', 'Payment', '637', 1850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-01', 'Convence Expensece', 'Payment', '638', 2000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rajendra Kumar Pawan Kumar Fhagi' OR legal_or_core_name ILIKE 'Rajendra Kumar Pawan Kumar Fhagi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-01', 'Rajendra Kumar Pawan Kumar Fhagi', 'Receipt', '576', 47693, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nakoda Trading Company  Nimbaheda' OR legal_or_core_name ILIKE 'Nakoda Trading Company  Nimbaheda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-01', 'Nakoda Trading Company  Nimbaheda', 'Receipt', '577', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Brothers - Renwal' OR legal_or_core_name ILIKE 'Vinayak Brothers - Renwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-01', 'Vinayak Brothers - Renwal', 'Sales', '2778/25-26', 93894, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' OR legal_or_core_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-01', 'Jai Jagdamba Treding Company Nangal Bhirda', 'Sales', '2779/25-26', 65589, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nakoda Trading Company  Nimbaheda' OR legal_or_core_name ILIKE 'Nakoda Trading Company  Nimbaheda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-01', 'Nakoda Trading Company  Nimbaheda', 'Sales', '2780/25-26', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Chitarmal Manoj Kumar' OR legal_or_core_name ILIKE 'Chitarmal Manoj Kumar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-02', 'Chitarmal Manoj Kumar', 'Payment', '639', 32943, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Chitarmal Manoj Kumar', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Chitarmal Manoj Kumar';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Agrasen Industries Jaitpura' OR legal_or_core_name ILIKE 'Agrasen Industries Jaitpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-02', 'Agrasen Industries Jaitpura', 'Payment', '640', 50422, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'BUSINESS PROMOTION EXPENSES' OR legal_or_core_name ILIKE 'BUSINESS PROMOTION EXPENSES' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-02', 'BUSINESS PROMOTION EXPENSES', 'Payment', '641', 39750, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-02', 'Wages Expenses A/C', 'Payment', '642', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-02', 'Tour & Travel', 'Payment', '643', 2210, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-02', 'Choudhary Pashu Aahar  Parbatsar', 'Receipt', '578', 21880, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Badri Lal Dwaraka Parsad Nasirabad' OR legal_or_core_name ILIKE 'Badri Lal Dwaraka Parsad Nasirabad' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-02', 'Badri Lal Dwaraka Parsad Nasirabad', 'Receipt', '579', 106890, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-02', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Receipt', '580', 115587, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Giriraj Enterprises - Kalu Ka Baas' OR legal_or_core_name ILIKE 'Giriraj Enterprises - Kalu Ka Baas' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-02', 'Giriraj Enterprises - Kalu Ka Baas', 'Sales', '2781/25-26', 58354, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri RamDev Enterprises - Masoda' OR legal_or_core_name ILIKE 'Shri RamDev Enterprises - Masoda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-02', 'Shri RamDev Enterprises - Masoda', 'Sales', '2782/25-26', 264463, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-02', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Sales', '2783/25-26', 60465, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Chitarmal Manoj Kumar' OR legal_or_core_name ILIKE 'Chitarmal Manoj Kumar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-02', 'Chitarmal Manoj Kumar', 'Purchase', '122', 32943, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Swastik Agro Industries Harayana' OR legal_or_core_name ILIKE 'Swastik Agro Industries Harayana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-02', 'Swastik Agro Industries Harayana', 'Purchase', '123', 567930, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Swastik Agro Industries Harayana', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Swastik Agro Industries Harayana';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Padmawati Trading Co.' OR legal_or_core_name ILIKE 'Padmawati Trading Co.' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-03', 'Padmawati Trading Co.', 'Payment', '644', 3120, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-03', 'Wages Expenses A/C', 'Payment', '645', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-03', 'Office Expenses', 'Payment', '646', 2350, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S Kumar & Company - Navalgarh' OR legal_or_core_name ILIKE 'S Kumar & Company - Navalgarh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-03', 'S Kumar & Company - Navalgarh', 'Receipt', '581', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-03', 'G.K.N - Industries', 'Receipt', '582', 62077, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jain & Brothers - Muhana Mandi' OR legal_or_core_name ILIKE 'Jain & Brothers - Muhana Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-03', 'Jain & Brothers - Muhana Mandi', 'Receipt', '583', 62717, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Discount Given' OR legal_or_core_name ILIKE 'Discount Given' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-03', 'Discount Given', 'Journal', '11', 578, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jaipur Packers - Rajasthan' OR legal_or_core_name ILIKE 'Jaipur Packers - Rajasthan' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-03', 'Jaipur Packers - Rajasthan', 'Purchase', '124', 219869, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Khandelwal Steel Jaipur - Jaipur' OR legal_or_core_name ILIKE 'Khandelwal Steel Jaipur - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-04', 'Khandelwal Steel Jaipur - Jaipur', 'Payment', '647', 6561, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Khandelwal Steel Jaipur - Jaipur', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Khandelwal Steel Jaipur - Jaipur';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-04', 'Wages Expenses A/C', 'Payment', '648', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-04', 'Convence Expensece', 'Payment', '649', 2300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-04', 'Ishwar and Company Surajpool', 'Receipt', '584', 104000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-04', 'Lavik Traders', 'Sales', '2784/25-26', 65650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-05', 'Wages Expenses A/C', 'Payment', '650', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-05', 'Machinery Reparing', 'Payment', '651', 2550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Giriraj Enterprises - Kalu Ka Baas' OR legal_or_core_name ILIKE 'Giriraj Enterprises - Kalu Ka Baas' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-05', 'Giriraj Enterprises - Kalu Ka Baas', 'Receipt', '585', 800, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-05', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '586', 17535, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dugya Cattle Feed - Muhana' OR legal_or_core_name ILIKE 'Dugya Cattle Feed - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-05', 'Dugya Cattle Feed - Muhana', 'Receipt', '587', 72700, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-05', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2785/25-26', 18148, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dugya Cattle Feed - Muhana' OR legal_or_core_name ILIKE 'Dugya Cattle Feed - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-05', 'Dugya Cattle Feed - Muhana', 'Sales', '2786/25-26', 66276, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Murlidhar Ji Yadav- Khejroli' OR legal_or_core_name ILIKE 'Murlidhar Ji Yadav- Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-05', 'Murlidhar Ji Yadav- Khejroli', 'Sales', '2787/25-26', 46100, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Ram Cattle Feed  Industrises Jaitpura' OR legal_or_core_name ILIKE 'Shri Ram Cattle Feed  Industrises Jaitpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-05', 'Shri Ram Cattle Feed  Industrises Jaitpura', 'Purchase', '125', 76332, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Shri Ram Cattle Feed  Industrises Jaitpura', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Shri Ram Cattle Feed  Industrises Jaitpura';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ajay Kumar' OR legal_or_core_name ILIKE 'Ajay Kumar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-06', 'Ajay Kumar', 'Payment', '652', 15000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-06', 'Wages Expenses A/C', 'Payment', '653', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-06', 'Tour & Travel', 'Payment', '654', 2070, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ratan Lal and Company     Khejroli' OR legal_or_core_name ILIKE 'Ratan Lal and Company     Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-06', 'Ratan Lal and Company     Khejroli', 'Sales', '2788/25-26', 64170, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Prakash Enterprises - Phulera' OR legal_or_core_name ILIKE 'Prakash Enterprises - Phulera' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-06', 'Prakash Enterprises - Phulera', 'Sales', '2789/25-26', 71253, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jhandewalas Foods Limited Jaipur' OR legal_or_core_name ILIKE 'Jhandewalas Foods Limited Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-06', 'Jhandewalas Foods Limited Jaipur', 'Purchase', '126', 6816, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Jhandewalas Foods Limited Jaipur', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Jhandewalas Foods Limited Jaipur';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

END $$;