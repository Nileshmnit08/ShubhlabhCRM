DO $$
DECLARE
  p_id UUID;
  t_id UUID;
  r_id UUID;
BEGIN
  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' OR legal_or_core_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-06', 'SHRI RAM INDUSTRIES  (PHULERA)', 'Purchase', '127', 133875, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rakesh Kirana Store - Khejroli' OR legal_or_core_name ILIKE 'Rakesh Kirana Store - Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-07', 'Rakesh Kirana Store - Khejroli', 'Sales', '2790/25-26', 47400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Swastik Agro Industries Harayana' OR legal_or_core_name ILIKE 'Swastik Agro Industries Harayana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-08', 'Swastik Agro Industries Harayana', 'Payment', '655', 567680, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-08', 'Wages Expenses A/C', 'Payment', '656', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-08', 'Office Expenses', 'Payment', '657', 1960, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Hari Shanker Khandelwal' OR legal_or_core_name ILIKE 'Shri Hari Shanker Khandelwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-08', 'Shri Hari Shanker Khandelwal', 'Payment', '658', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nilesh Kumar Khandelwal' OR legal_or_core_name ILIKE 'Nilesh Kumar Khandelwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-08', 'Nilesh Kumar Khandelwal', 'Payment', '659', 9500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-08', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '588', 18148, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-08', 'Choudhary Pashu Aahar  Parbatsar', 'Receipt', '589', 20000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ramnarayan  Girraj Jaipur' OR legal_or_core_name ILIKE 'Ramnarayan  Girraj Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-08', 'Ramnarayan  Girraj Jaipur', 'Sales', '2791/25-26', 24717, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-08', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2792/25-26', 22468, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' OR legal_or_core_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-08', 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur', 'Sales', '2793/25-26', 22415, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-08', 'G.K.N - Industries', 'Sales', '2794/25-26', 42811, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'J.S. Packers - Jaipur' OR legal_or_core_name ILIKE 'J.S. Packers - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-08', 'J.S. Packers - Jaipur', 'Purchase', '128', 20486, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Ram Cattle Feed  Industrises Jaitpura' OR legal_or_core_name ILIKE 'Shri Ram Cattle Feed  Industrises Jaitpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-09', 'Shri Ram Cattle Feed  Industrises Jaitpura', 'Payment', '660', 76332, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' OR legal_or_core_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-09', 'SHRI RAM INDUSTRIES  (PHULERA)', 'Payment', '661', 133875, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-09', 'Wages Expenses A/C', 'Payment', '662', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-09', 'Tour & Travel', 'Payment', '663', 2010, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nilesh Kumar Khandelwal' OR legal_or_core_name ILIKE 'Nilesh Kumar Khandelwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-09', 'Nilesh Kumar Khandelwal', 'Payment', '664', 9500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Patel Enterprises  Rojda' OR legal_or_core_name ILIKE 'Patel Enterprises  Rojda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-09', 'Patel Enterprises  Rojda', 'Receipt', '590', 123800, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-09', 'Lavik Traders', 'Receipt', '591', 33318, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-09', 'Kharwash Trading Company (Muhana )', 'Receipt', '592', 362905, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading  Company  - Lalshot' OR legal_or_core_name ILIKE 'Balaji Trading  Company  - Lalshot' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-09', 'Balaji Trading  Company  - Lalshot', 'Sales', '2795/25-26', 74432, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-09', 'Ishwar and Company Surajpool', 'Sales', '2796/25-26', 78750, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-09', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Sales', '2797/25-26', 112458, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-09', 'Choudhary Pashu Aahar  Parbatsar', 'Sales', '2798/25-26', 76065, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-10', 'Wages Expenses A/C', 'Payment', '665', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Printing & Stationary' OR legal_or_core_name ILIKE 'Printing & Stationary' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-10', 'Printing & Stationary', 'Payment', '666', 1750, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-10', 'Convence Expensece', 'Payment', '667', 2000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-10', 'Tour & Travel', 'Payment', '668', 1000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S Kumar & Company - Navalgarh' OR legal_or_core_name ILIKE 'S Kumar & Company - Navalgarh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-10', 'S Kumar & Company - Navalgarh', 'Receipt', '593', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-10', 'G.K.N - Industries', 'Receipt', '594', 65000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' OR legal_or_core_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-10', 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur', 'Receipt', '595', 22415, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jain & Brothers - Muhana Mandi' OR legal_or_core_name ILIKE 'Jain & Brothers - Muhana Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-10', 'Jain & Brothers - Muhana Mandi', 'Sales', '2799/25-26', 62717, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anjani Trading Company  -(Beawar)' OR legal_or_core_name ILIKE 'Anjani Trading Company  -(Beawar)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-10', 'Anjani Trading Company  -(Beawar)', 'Sales', '2800/25-26', 51716, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-11', 'Wages Expenses A/C', 'Payment', '669', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Electricity and Water Expenses' OR legal_or_core_name ILIKE 'Electricity and Water Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-11', 'Electricity and Water Expenses', 'Payment', '670', 67878, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jhandewalas Foods Limited Jaipur' OR legal_or_core_name ILIKE 'Jhandewalas Foods Limited Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-11', 'Jhandewalas Foods Limited Jaipur', 'Payment', '671', 6816, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-11', 'Convence Expensece', 'Payment', '672', 3100, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading  Company  - Lalshot' OR legal_or_core_name ILIKE 'Balaji Trading  Company  - Lalshot' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-11', 'Balaji Trading  Company  - Lalshot', 'Receipt', '596', 74432, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-11', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '597', 22468, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Agro Industries - Muhana' OR legal_or_core_name ILIKE 'Shri Balaji Agro Industries - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-11', 'Shri Balaji Agro Industries - Muhana', 'Sales', '2801/25-26', 27663, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-11', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2802/25-26', 17780, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-11', 'G.K.N - Industries', 'Sales', '2803/25-26', 47992, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Uttam Agencies Sambriya' OR legal_or_core_name ILIKE 'Uttam Agencies Sambriya' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-11', 'Uttam Agencies Sambriya', 'Sales', '2804/25-26', 50314, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Agrasen Industries Jaitpura' OR legal_or_core_name ILIKE 'Agrasen Industries Jaitpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-11', 'Agrasen Industries Jaitpura', 'Purchase', '129', 52415, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Veer Enterprises Msinpuri  Up' OR legal_or_core_name ILIKE 'Shri Veer Enterprises Msinpuri  Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-12', 'Shri Veer Enterprises Msinpuri  Up', 'Payment', '673', 2000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Shri Veer Enterprises Msinpuri  Up', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Shri Veer Enterprises Msinpuri  Up';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-12', 'Wages Expenses A/C', 'Payment', '674', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-12', 'Machinery Reparing', 'Payment', '675', 2190, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'PRABHA MAHILA KISSAN PRODUSER KHANDER' OR legal_or_core_name ILIKE 'PRABHA MAHILA KISSAN PRODUSER KHANDER' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-12', 'PRABHA MAHILA KISSAN PRODUSER KHANDER', 'Receipt', '598', 28000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Uttam Agencies Sambriya' OR legal_or_core_name ILIKE 'Uttam Agencies Sambriya' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-12', 'Uttam Agencies Sambriya', 'Receipt', '599', 47490, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Abhishek Treding Company  Fathenegar' OR legal_or_core_name ILIKE 'Abhishek Treding Company  Fathenegar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-12', 'Abhishek Treding Company  Fathenegar', 'Sales', '2805/25-26', 302000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'KAMAL TRADING CO Dudu' OR legal_or_core_name ILIKE 'KAMAL TRADING CO Dudu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-12', 'KAMAL TRADING CO Dudu', 'Sales', '2806/25-26', 61182, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'J.S. Packers - Jaipur' OR legal_or_core_name ILIKE 'J.S. Packers - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-12', 'J.S. Packers - Jaipur', 'Purchase', '130', 32205, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Agrasen Industries Jaitpura' OR legal_or_core_name ILIKE 'Agrasen Industries Jaitpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-12', 'Agrasen Industries Jaitpura', 'Purchase', '131', 42138, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-13', 'Wages Expenses A/C', 'Payment', '676', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-13', 'Tour & Travel', 'Payment', '677', 2240, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Abhishek Treding Company  Fathenegar' OR legal_or_core_name ILIKE 'Abhishek Treding Company  Fathenegar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-13', 'Abhishek Treding Company  Fathenegar', 'Receipt', '600', 302000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-13', 'Kharwash Trading Company (Muhana )', 'Sales', '2807/25-26', 57810, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Chand Pasu Aahar Malpura' OR legal_or_core_name ILIKE 'Shri Chand Pasu Aahar Malpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-13', 'Shri Chand Pasu Aahar Malpura', 'Sales', '2808/25-26', 108000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anukumar Mukesh Kumar Malpura' OR legal_or_core_name ILIKE 'Anukumar Mukesh Kumar Malpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-13', 'Anukumar Mukesh Kumar Malpura', 'Sales', '2809/25-26', 69740, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-13', 'G.K.N - Industries', 'Sales', '2810/25-26', 44330, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Indastrises  Didwana' OR legal_or_core_name ILIKE 'Balaji Indastrises  Didwana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-13', 'Balaji Indastrises  Didwana', 'Sales', '2811/25-26', 63798, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S M Sales Corporation  Jaipur' OR legal_or_core_name ILIKE 'S M Sales Corporation  Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-13', 'S M Sales Corporation  Jaipur', 'Purchase', '132', 14165, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Khandelwal Bardana Bhandhar' OR legal_or_core_name ILIKE 'Khandelwal Bardana Bhandhar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-13', 'Khandelwal Bardana Bhandhar', 'Purchase', '133', 10655, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Khandelwal Bardana Bhandhar', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Khandelwal Bardana Bhandhar';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Veer Enterprises Msinpuri  Up' OR legal_or_core_name ILIKE 'Shri Veer Enterprises Msinpuri  Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-13', 'Shri Veer Enterprises Msinpuri  Up', 'Purchase', '134', 544479, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' OR legal_or_core_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-13', 'Mangal Treding Company Kukerkheda Mhandi', 'Purchase', '135', 17666, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-15', 'Wages Expenses A/C', 'Payment', '678', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-15', 'Office Expenses', 'Payment', '679', 1750, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-15', 'Godha Enterprises (Hingoniya)', 'Receipt', '601', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Ji Yadav' OR legal_or_core_name ILIKE 'Shyam Ji Yadav' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-15', 'Shyam Ji Yadav', 'Receipt', '602', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'PRABHA MAHILA KISSAN PRODUSER KHANDER' OR legal_or_core_name ILIKE 'PRABHA MAHILA KISSAN PRODUSER KHANDER' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-15', 'PRABHA MAHILA KISSAN PRODUSER KHANDER', 'Sales', '2812/25-26', 63350, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Pashupati Trading Company' OR legal_or_core_name ILIKE 'Pashupati Trading Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-15', 'Pashupati Trading Company', 'Sales', '2813/25-26', 61950, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Khandelwal Steel Jaipur - Jaipur' OR legal_or_core_name ILIKE 'Khandelwal Steel Jaipur - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-15', 'Khandelwal Steel Jaipur - Jaipur', 'Purchase', '136', 6561, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Agrasen Industries Jaitpura' OR legal_or_core_name ILIKE 'Agrasen Industries Jaitpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Agrasen Industries Jaitpura', 'Payment', '680', 94553, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Office Expenses', 'Payment', '681', 1025, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Wages Expenses A/C', 'Payment', '682', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Convence Expensece', 'Payment', '683', 2000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Bhawani Trading Company - Achrol' OR legal_or_core_name ILIKE 'Jai Bhawani Trading Company - Achrol' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Jai Bhawani Trading Company - Achrol', 'Receipt', '603', 35770, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Ishwar and Company Surajpool', 'Receipt', '604', 92000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Ishwar and Company Surajpool', 'Receipt', '605', 80000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '606', 17780, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maruti Trading Company Kalwar' OR legal_or_core_name ILIKE 'Maruti Trading Company Kalwar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Maruti Trading Company Kalwar', 'Receipt', '607', 50100, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Godha Enterprises (Hingoniya)', 'Receipt', '608', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Ji Yadav' OR legal_or_core_name ILIKE 'Shyam Ji Yadav' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Shyam Ji Yadav', 'Receipt', '609', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Brothers - Renwal' OR legal_or_core_name ILIKE 'Vinayak Brothers - Renwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Vinayak Brothers - Renwal', 'Receipt', '610', 91850, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Agro Industries - Muhana' OR legal_or_core_name ILIKE 'Shri Balaji Agro Industries - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Shri Balaji Agro Industries - Muhana', 'Receipt', '611', 27900, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Lavik Traders', 'Sales', '2814/25-26', 61383, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2815/25-26', 18148, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Giriraj Trading Company - Alwar' OR legal_or_core_name ILIKE 'Giriraj Trading Company - Alwar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Giriraj Trading Company - Alwar', 'Sales', '2816/25-26', 79790, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Goyal Treders Fhagi' OR legal_or_core_name ILIKE 'Goyal Treders Fhagi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Goyal Treders Fhagi', 'Sales', '2817/25-26', 85497, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shiv Trading Comnay Vatika' OR legal_or_core_name ILIKE 'Shiv Trading Comnay Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Shiv Trading Comnay Vatika', 'Sales', '2818/25-26', 73845, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Agrasen Industries Jaitpura' OR legal_or_core_name ILIKE 'Agrasen Industries Jaitpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'Agrasen Industries Jaitpura', 'Purchase', '137', 55400, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'DILIP UDYOUG' OR legal_or_core_name ILIKE 'DILIP UDYOUG' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-16', 'DILIP UDYOUG', 'Purchase', '138', 40986, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tha Karnal Coop Sugar Mills Haryana' OR legal_or_core_name ILIKE 'Tha Karnal Coop Sugar Mills Haryana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-17', 'Tha Karnal Coop Sugar Mills Haryana', 'Payment', '684', 482764, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Tha Karnal Coop Sugar Mills Haryana', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Tha Karnal Coop Sugar Mills Haryana';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S M Sales Corporation  Jaipur' OR legal_or_core_name ILIKE 'S M Sales Corporation  Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-17', 'S M Sales Corporation  Jaipur', 'Payment', '685', 14165, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-17', 'Wages Expenses A/C', 'Payment', '686', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-17', 'Convence Expensece', 'Payment', '687', 2350, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri RamDev Enterprises - Masoda' OR legal_or_core_name ILIKE 'Shri RamDev Enterprises - Masoda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-17', 'Shri RamDev Enterprises - Masoda', 'Receipt', '612', 264463, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Pashupati Trading Company' OR legal_or_core_name ILIKE 'Pashupati Trading Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-17', 'Pashupati Trading Company', 'Receipt', '613', 60000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-17', 'Godha Enterprises (Hingoniya)', 'Receipt', '614', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Ji Yadav' OR legal_or_core_name ILIKE 'Shyam Ji Yadav' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-17', 'Shyam Ji Yadav', 'Receipt', '615', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Khandelwal Bardana Bhandhar' OR legal_or_core_name ILIKE 'Khandelwal Bardana Bhandhar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-18', 'Khandelwal Bardana Bhandhar', 'Payment', '688', 10655, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Agrasen Industries Jaitpura' OR legal_or_core_name ILIKE 'Agrasen Industries Jaitpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-18', 'Agrasen Industries Jaitpura', 'Payment', '689', 55400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'DILIP UDYOUG' OR legal_or_core_name ILIKE 'DILIP UDYOUG' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-18', 'DILIP UDYOUG', 'Payment', '690', 40986, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-18', 'Wages Expenses A/C', 'Payment', '691', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-18', 'Tour & Travel', 'Payment', '692', 1800, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-18', 'Godha Enterprises (Hingoniya)', 'Receipt', '616', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ranjeet Singh' OR legal_or_core_name ILIKE 'Ranjeet Singh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-18', 'Ranjeet Singh', 'Receipt', '617', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Ranjeet Singh', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Ranjeet Singh';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Ji Yadav' OR legal_or_core_name ILIKE 'Shyam Ji Yadav' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-18', 'Shyam Ji Yadav', 'Receipt', '618', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anjani Trading Company  -(Beawar)' OR legal_or_core_name ILIKE 'Anjani Trading Company  -(Beawar)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-18', 'Anjani Trading Company  -(Beawar)', 'Receipt', '619', 51716, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' OR legal_or_core_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-18', 'SHRI BALAJI ENTERPRISES-TIGARIYA', 'Sales', '2819/2025-2026', 60488, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ranjeet Singh' OR legal_or_core_name ILIKE 'Ranjeet Singh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-18', 'Ranjeet Singh', 'Sales', '2820/25-26', 16660, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Swastik Agro Industries Harayana' OR legal_or_core_name ILIKE 'Swastik Agro Industries Harayana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-18', 'Swastik Agro Industries Harayana', 'Purchase', '139', 525220, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tha Karnal Coop Sugar Mills Haryana' OR legal_or_core_name ILIKE 'Tha Karnal Coop Sugar Mills Haryana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-18', 'Tha Karnal Coop Sugar Mills Haryana', 'Purchase', '140', 482764, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jaipur Packers - Rajasthan' OR legal_or_core_name ILIKE 'Jaipur Packers - Rajasthan' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-19', 'Jaipur Packers - Rajasthan', 'Payment', '693', 155907, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'BUSINESS PROMOTION EXPENSES' OR legal_or_core_name ILIKE 'BUSINESS PROMOTION EXPENSES' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-19', 'BUSINESS PROMOTION EXPENSES', 'Payment', '694', 44747, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-19', 'Wages Expenses A/C', 'Payment', '695', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Pashupati Trading Company' OR legal_or_core_name ILIKE 'Pashupati Trading Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-19', 'Pashupati Trading Company', 'Receipt', '620', 3130, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-19', 'Godha Enterprises (Hingoniya)', 'Receipt', '621', 27500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-19', 'Godha Enterprises (Hingoniya)', 'Receipt', '622', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-19', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Receipt', '623', 112458, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-19', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Receipt', '624', 60465, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jain & Brothers - Muhana Mandi' OR legal_or_core_name ILIKE 'Jain & Brothers - Muhana Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-19', 'Jain & Brothers - Muhana Mandi', 'Receipt', '625', 45787, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-19', 'Lavik Traders', 'Receipt', '626', 65558, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ranjeet Singh' OR legal_or_core_name ILIKE 'Ranjeet Singh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-19', 'Ranjeet Singh', 'Receipt', '627', 7600, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Ji Yadav' OR legal_or_core_name ILIKE 'Shyam Ji Yadav' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-19', 'Shyam Ji Yadav', 'Receipt', '628', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-19', 'Godha Enterprises (Hingoniya)', 'Sales', '2821/25-26', 78500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-20', 'Wages Expenses A/C', 'Payment', '696', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-20', 'Machinery Reparing', 'Payment', '697', 2250, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Giriraj Enterprises - Kalu Ka Baas' OR legal_or_core_name ILIKE 'Giriraj Enterprises - Kalu Ka Baas' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-20', 'Giriraj Enterprises - Kalu Ka Baas', 'Receipt', '629', 48576, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-20', 'Godha Enterprises (Hingoniya)', 'Receipt', '630', 6000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-20', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '631', 18148, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Ji Yadav' OR legal_or_core_name ILIKE 'Shyam Ji Yadav' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-20', 'Shyam Ji Yadav', 'Receipt', '632', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-20', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2822/25-26', 18148, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ganesh Pashuahar Chaksu' OR legal_or_core_name ILIKE 'Ganesh Pashuahar Chaksu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-20', 'Ganesh Pashuahar Chaksu', 'Sales', '2823/25-26', 95248, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-20', 'Ishwar and Company Surajpool', 'Sales', '2824/25-26', 78750, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Vaibhav Metacast Pvt Ltd Unit' OR legal_or_core_name ILIKE 'Shri Vaibhav Metacast Pvt Ltd Unit' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-20', 'Shri Vaibhav Metacast Pvt Ltd Unit', 'Sales', '2825/25-26', 29400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Shri Vaibhav Metacast Pvt Ltd Unit', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Shri Vaibhav Metacast Pvt Ltd Unit';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rajendra Kumar Pawan Kumar Fhagi' OR legal_or_core_name ILIKE 'Rajendra Kumar Pawan Kumar Fhagi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-20', 'Rajendra Kumar Pawan Kumar Fhagi', 'Sales', '2826/25-26', 37357, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Pulses Pvt  Ltd Rd No 15' OR legal_or_core_name ILIKE 'Shri Shyam Pulses Pvt  Ltd Rd No 15' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-20', 'Shri Shyam Pulses Pvt  Ltd Rd No 15', 'Purchase', '141', 50379, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Shri Shyam Pulses Pvt  Ltd Rd No 15', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Shri Shyam Pulses Pvt  Ltd Rd No 15';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-22', 'Wages Expenses A/C', 'Payment', '698', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-22', 'Convence Expensece', 'Payment', '699', 3000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Indastrises  Didwana' OR legal_or_core_name ILIKE 'Balaji Indastrises  Didwana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-22', 'Balaji Indastrises  Didwana', 'Receipt', '633', 63798, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' OR legal_or_core_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-22', 'SHRI BALAJI ENTERPRISES-TIGARIYA', 'Receipt', '635', 63030, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rajendra Kumar Pawan Kumar Fhagi' OR legal_or_core_name ILIKE 'Rajendra Kumar Pawan Kumar Fhagi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-22', 'Rajendra Kumar Pawan Kumar Fhagi', 'Receipt', '636', 37357, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Ji Yadav' OR legal_or_core_name ILIKE 'Shyam Ji Yadav' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-22', 'Shyam Ji Yadav', 'Receipt', '637', 6800, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dera Sachha Sodha' OR legal_or_core_name ILIKE 'Dera Sachha Sodha' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-22', 'Dera Sachha Sodha', 'Receipt', '638', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Swastik Agro Industries Harayana' OR legal_or_core_name ILIKE 'Swastik Agro Industries Harayana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-23', 'Swastik Agro Industries Harayana', 'Payment', '700', 525220, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-23', 'Wages Expenses A/C', 'Payment', '701', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-23', 'Tour & Travel', 'Payment', '702', 1630, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shiv Trading Comnay Vatika' OR legal_or_core_name ILIKE 'Shiv Trading Comnay Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-23', 'Shiv Trading Comnay Vatika', 'Receipt', '639', 73233, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S K Dairy - Mukunpura' OR legal_or_core_name ILIKE 'S K Dairy - Mukunpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-23', 'S K Dairy - Mukunpura', 'Receipt', '640', 10000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nakoda Trading Company  Nimbaheda' OR legal_or_core_name ILIKE 'Nakoda Trading Company  Nimbaheda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-23', 'Nakoda Trading Company  Nimbaheda', 'Receipt', '641', 18000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tarachand Ji -Yadav Khejroli' OR legal_or_core_name ILIKE 'Tarachand Ji -Yadav Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-23', 'Tarachand Ji -Yadav Khejroli', 'Receipt', '642', 44900, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rakesh Kirana Store - Khejroli' OR legal_or_core_name ILIKE 'Rakesh Kirana Store - Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-23', 'Rakesh Kirana Store - Khejroli', 'Receipt', '643', 32965, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dera Sachha Sodha' OR legal_or_core_name ILIKE 'Dera Sachha Sodha' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-23', 'Dera Sachha Sodha', 'Receipt', '644', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Patel Enterprises  Rojda' OR legal_or_core_name ILIKE 'Patel Enterprises  Rojda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-23', 'Patel Enterprises  Rojda', 'Sales', '2827/25-26', 61900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nakoda Trading Company  Nimbaheda' OR legal_or_core_name ILIKE 'Nakoda Trading Company  Nimbaheda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-23', 'Nakoda Trading Company  Nimbaheda', 'Sales', '2828/25-26', 18000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Sagar Feed Bilwada' OR legal_or_core_name ILIKE 'Sagar Feed Bilwada' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-23', 'Sagar Feed Bilwada', 'Sales', '2829/25-26', 85530, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Agro Industries - Muhana' OR legal_or_core_name ILIKE 'Shri Balaji Agro Industries - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-23', 'Shri Balaji Agro Industries - Muhana', 'Sales', '2830/25-26', 27094, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'J.S. Packers - Jaipur' OR legal_or_core_name ILIKE 'J.S. Packers - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-23', 'J.S. Packers - Jaipur', 'Purchase', '142', 46640, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Bina Enterprises - Jaipur' OR legal_or_core_name ILIKE 'Bina Enterprises - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-23', 'Bina Enterprises - Jaipur', 'Purchase', '143', 199025, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Bina Enterprises - Jaipur', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Bina Enterprises - Jaipur';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Swastik Agro Industries Harayana' OR legal_or_core_name ILIKE 'Swastik Agro Industries Harayana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-23', 'Swastik Agro Industries Harayana', 'Purchase', '144', 565003, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' OR legal_or_core_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-24', 'Mangal Treding Company Kukerkheda Mhandi', 'Payment', '703', 17666, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Pulses Pvt  Ltd Rd No 15' OR legal_or_core_name ILIKE 'Shri Shyam Pulses Pvt  Ltd Rd No 15' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-24', 'Shri Shyam Pulses Pvt  Ltd Rd No 15', 'Payment', '704', 50379, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Veer Enterprises Msinpuri  Up' OR legal_or_core_name ILIKE 'Shri Veer Enterprises Msinpuri  Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-24', 'Shri Veer Enterprises Msinpuri  Up', 'Payment', '705', 542479, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-24', 'Wages Expenses A/C', 'Payment', '706', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-24', 'Office Expenses', 'Payment', '707', 2340, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dera Sachha Sodha' OR legal_or_core_name ILIKE 'Dera Sachha Sodha' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-24', 'Dera Sachha Sodha', 'Receipt', '645', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Namokaar Trading Company' OR legal_or_core_name ILIKE 'Shri Namokaar Trading Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-24', 'Shri Namokaar Trading Company', 'Receipt', '646', 5000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Brothers - Renwal' OR legal_or_core_name ILIKE 'Vinayak Brothers - Renwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-24', 'Vinayak Brothers - Renwal', 'Sales', '2831/25-26', 94397, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kedar Kirana Stor Benadamod' OR legal_or_core_name ILIKE 'Kedar Kirana Stor Benadamod' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-24', 'Kedar Kirana Stor Benadamod', 'Sales', '2832/25-26', 50200, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ankit Trading Company Fulera' OR legal_or_core_name ILIKE 'Ankit Trading Company Fulera' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-24', 'Ankit Trading Company Fulera', 'Sales', '2833/25-26', 65283, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tarachand Ji -Yadav Khejroli' OR legal_or_core_name ILIKE 'Tarachand Ji -Yadav Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-24', 'Tarachand Ji -Yadav Khejroli', 'Sales', '2834/25-26', 44900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Swastik Agro Industries Harayana' OR legal_or_core_name ILIKE 'Swastik Agro Industries Harayana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-25', 'Swastik Agro Industries Harayana', 'Payment', '708', 565003, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-25', 'Wages Expenses A/C', 'Payment', '709', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Car Repairing' OR legal_or_core_name ILIKE 'Car Repairing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-25', 'Car Repairing', 'Payment', '710', 2430, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'KAMAL TRADING CO Dudu' OR legal_or_core_name ILIKE 'KAMAL TRADING CO Dudu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-25', 'KAMAL TRADING CO Dudu', 'Receipt', '647', 65000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Goyal Treders Fhagi' OR legal_or_core_name ILIKE 'Goyal Treders Fhagi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-25', 'Goyal Treders Fhagi', 'Receipt', '648', 86279, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dera Sachha Sodha' OR legal_or_core_name ILIKE 'Dera Sachha Sodha' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-25', 'Dera Sachha Sodha', 'Receipt', '649', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Murlidhar Ji Yadav- Khejroli' OR legal_or_core_name ILIKE 'Murlidhar Ji Yadav- Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-25', 'Murlidhar Ji Yadav- Khejroli', 'Receipt', '650', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' OR legal_or_core_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-25', 'SHRI BALAJI ENTERPRISES-TIGARIYA', 'Sales', '2836/2025-2026', 21690, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rambilas Ishwardas - Kukerkeda' OR legal_or_core_name ILIKE 'Rambilas Ishwardas - Kukerkeda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-25', 'Rambilas Ishwardas - Kukerkeda', 'Purchase', '145', 17825, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S M Sales Corporation  Jaipur' OR legal_or_core_name ILIKE 'S M Sales Corporation  Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-25', 'S M Sales Corporation  Jaipur', 'Purchase', '146', 13010, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Astik Maharaj Traders Mainpuri Up' OR legal_or_core_name ILIKE 'Shri Astik Maharaj Traders Mainpuri Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-25', 'Shri Astik Maharaj Traders Mainpuri Up', 'Purchase', '147', 841056, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Shri Astik Maharaj Traders Mainpuri Up', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Shri Astik Maharaj Traders Mainpuri Up';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' OR legal_or_core_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-25', 'SHRI RAM INDUSTRIES  (PHULERA)', 'Purchase', '148', 190094, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Sunny Industries Sitapura Jaipur' OR legal_or_core_name ILIKE 'Sunny Industries Sitapura Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-25', 'Sunny Industries Sitapura Jaipur', 'Purchase', '149', 38830, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Electricity and Water Expenses' OR legal_or_core_name ILIKE 'Electricity and Water Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-26', 'Electricity and Water Expenses', 'Payment', '711', 3589, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Telephone Exp' OR legal_or_core_name ILIKE 'Telephone Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-26', 'Telephone Exp', 'Payment', '712', 1070, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' OR legal_or_core_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-26', 'SHRI RAM INDUSTRIES  (PHULERA)', 'Payment', '713', 190094, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-26', 'Wages Expenses A/C', 'Payment', '714', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S Kumar & Company - Navalgarh' OR legal_or_core_name ILIKE 'S Kumar & Company - Navalgarh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-26', 'S Kumar & Company - Navalgarh', 'Receipt', '651', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-26', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '652', 18148, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dera Sachha Sodha' OR legal_or_core_name ILIKE 'Dera Sachha Sodha' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-26', 'Dera Sachha Sodha', 'Receipt', '653', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Bhagwati Trading Company BANDIKUI' OR legal_or_core_name ILIKE 'Maa Bhagwati Trading Company BANDIKUI' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-26', 'Maa Bhagwati Trading Company BANDIKUI', 'Receipt', '654', 63897, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Murlidhar Ji Yadav- Khejroli' OR legal_or_core_name ILIKE 'Murlidhar Ji Yadav- Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-26', 'Murlidhar Ji Yadav- Khejroli', 'Receipt', '655', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-26', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2837/2025-2026', 18148, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dinesh Baat Bhandar  (Dhabash)' OR legal_or_core_name ILIKE 'Dinesh Baat Bhandar  (Dhabash)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-26', 'Dinesh Baat Bhandar  (Dhabash)', 'Sales', '2838/25-26', 12000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Ji Yadav' OR legal_or_core_name ILIKE 'Shyam Ji Yadav' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-26', 'Shyam Ji Yadav', 'Sales', '2839/25-26', 62550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Priyanka Oil Mill Ganedi Dadu' OR legal_or_core_name ILIKE 'Priyanka Oil Mill Ganedi Dadu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-26', 'Priyanka Oil Mill Ganedi Dadu', 'Sales', '2840/25-26', 228552, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Priyanka Oil Mill Ganedi Dadu', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Priyanka Oil Mill Ganedi Dadu';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-26', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Sales', '2841/25-26', 79506, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anjani Trading Company  -(Beawar)' OR legal_or_core_name ILIKE 'Anjani Trading Company  -(Beawar)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-26', 'Anjani Trading Company  -(Beawar)', 'Sales', '2842/25-26', 52608, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-27', 'Wages Expenses A/C', 'Payment', '715', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-27', 'Tour & Travel', 'Payment', '716', 2260, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ranjeet Singh' OR legal_or_core_name ILIKE 'Ranjeet Singh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-27', 'Ranjeet Singh', 'Receipt', '656', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dera Sachha Sodha' OR legal_or_core_name ILIKE 'Dera Sachha Sodha' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-27', 'Dera Sachha Sodha', 'Receipt', '657', 9400, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Murlidhar Ji Yadav- Khejroli' OR legal_or_core_name ILIKE 'Murlidhar Ji Yadav- Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-27', 'Murlidhar Ji Yadav- Khejroli', 'Receipt', '658', 2000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ranjeet Singh' OR legal_or_core_name ILIKE 'Ranjeet Singh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-27', 'Ranjeet Singh', 'Sales', '2843/2025-2026', 16230, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'KAMAL TRADING CO Dudu' OR legal_or_core_name ILIKE 'KAMAL TRADING CO Dudu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-27', 'KAMAL TRADING CO Dudu', 'Sales', '2844/25-26', 20600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'KAMAL TRADING CO Dudu' OR legal_or_core_name ILIKE 'KAMAL TRADING CO Dudu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-27', 'KAMAL TRADING CO Dudu', 'Sales', '2845/25-26', 45900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-27', 'Ishwar and Company Surajpool', 'Sales', '2846/25-26', 58275, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading  Company  - Lalshot' OR legal_or_core_name ILIKE 'Balaji Trading  Company  - Lalshot' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-28', 'Balaji Trading  Company  - Lalshot', 'Sales', '2847/25-26', 62415, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Sunny Industries Sitapura Jaipur' OR legal_or_core_name ILIKE 'Sunny Industries Sitapura Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-29', 'Sunny Industries Sitapura Jaipur', 'Payment', '717', 38830, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Car Loan - Hyrider' OR legal_or_core_name ILIKE 'Car Loan - Hyrider' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-29', 'Car Loan - Hyrider', 'Payment', '718', 48357, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'J.S. Packers - Jaipur' OR legal_or_core_name ILIKE 'J.S. Packers - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-29', 'J.S. Packers - Jaipur', 'Payment', '719', 29480, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-29', 'Wages Expenses A/C', 'Payment', '720', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-29', 'Convence Expensece', 'Payment', '721', 3100, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ganesh Pashuahar Chaksu' OR legal_or_core_name ILIKE 'Ganesh Pashuahar Chaksu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-29', 'Ganesh Pashuahar Chaksu', 'Receipt', '659', 200000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Agro Industries - Muhana' OR legal_or_core_name ILIKE 'Shri Balaji Agro Industries - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-29', 'Shri Balaji Agro Industries - Muhana', 'Receipt', '660', 27544, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ranjeet Singh' OR legal_or_core_name ILIKE 'Ranjeet Singh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-29', 'Ranjeet Singh', 'Receipt', '661', 7230, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' OR legal_or_core_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-29', 'Krishna Baat Bhandhar- Sirsi Mode', 'Sales', '2848/25-26', 17000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' OR legal_or_core_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-29', 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur', 'Sales', '2849/25-26', 70083, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dera Sachha Sodha' OR legal_or_core_name ILIKE 'Dera Sachha Sodha' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-29', 'Dera Sachha Sodha', 'Sales', '2850/25-26', 54900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-30', 'Machinery Reparing', 'Payment', '722', 1865, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rambilas Ishwardas - Kukerkeda' OR legal_or_core_name ILIKE 'Rambilas Ishwardas - Kukerkeda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-30', 'Rambilas Ishwardas - Kukerkeda', 'Payment', '723', 17825, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S M Sales Corporation  Jaipur' OR legal_or_core_name ILIKE 'S M Sales Corporation  Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-30', 'S M Sales Corporation  Jaipur', 'Payment', '724', 13010, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-30', 'Wages Expenses A/C', 'Payment', '725', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-30', 'Tour & Travel', 'Payment', '726', 2000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Brothers - Renwal' OR legal_or_core_name ILIKE 'Vinayak Brothers - Renwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-30', 'Vinayak Brothers - Renwal', 'Receipt', '662', 93700, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Greenfield' OR legal_or_core_name ILIKE 'Greenfield' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-30', 'Greenfield', 'Receipt', '663', 182000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Discount Given' OR legal_or_core_name ILIKE 'Discount Given' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-30', 'Discount Given', 'Journal', '12', 1160, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Bina Enterprises - Jaipur' OR legal_or_core_name ILIKE 'Bina Enterprises - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-30', 'Bina Enterprises - Jaipur', 'Purchase', '150', 162427, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-30', 'Vetkind Animal Health India', 'Purchase', '151', 17500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-30', 'Vetkind Animal Health India', 'Purchase', '152', 24000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-09-30', 'Vetkind Animal Health India', 'Purchase', '153', 30375, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Astik Maharaj Traders Mainpuri Up' OR legal_or_core_name ILIKE 'Shri Astik Maharaj Traders Mainpuri Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-01', 'Shri Astik Maharaj Traders Mainpuri Up', 'Payment', '727', 837736, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-01', 'Wages Expenses A/C', 'Payment', '728', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-01', 'Office Expenses', 'Payment', '729', 800, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-01', 'Tour & Travel', 'Payment', '730', 1860, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Bina Enterprises - Jaipur' OR legal_or_core_name ILIKE 'Bina Enterprises - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-01', 'Bina Enterprises - Jaipur', 'Payment', '731', 162497, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Bina Enterprises - Jaipur' OR legal_or_core_name ILIKE 'Bina Enterprises - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-01', 'Bina Enterprises - Jaipur', 'Payment', '732', 197025, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-01', 'Choudhary Pashu Aahar  Parbatsar', 'Receipt', '664', 40000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ganesh Pashuahar Chaksu' OR legal_or_core_name ILIKE 'Ganesh Pashuahar Chaksu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-01', 'Ganesh Pashuahar Chaksu', 'Receipt', '665', 250000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dugya Cattle Feed - Muhana' OR legal_or_core_name ILIKE 'Dugya Cattle Feed - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-01', 'Dugya Cattle Feed - Muhana', 'Receipt', '666', 72100, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-01', 'Ishwar and Company Surajpool', 'Receipt', '667', 44800, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' OR legal_or_core_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-01', 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur', 'Receipt', '668', 69865, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Babulal Ji Yadav - Mahaswas' OR legal_or_core_name ILIKE 'Babulal Ji Yadav - Mahaswas' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-01', 'Babulal Ji Yadav - Mahaswas', 'Sales', '2851/25-26', 78000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-01', 'G.K.N - Industries', 'Sales', '2852/25-26', 64150, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'DILIP UDYOUG' OR legal_or_core_name ILIKE 'DILIP UDYOUG' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-01', 'DILIP UDYOUG', 'Purchase', '154', 40986, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-02', 'Wages Expenses A/C', 'Payment', '733', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-02', 'Machinery Reparing', 'Payment', '734', 1950, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-02', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '669', 18148, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trandig Company' OR legal_or_core_name ILIKE 'Manish Trandig Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-02', 'Manish Trandig Company', 'Receipt', '670', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-02', 'Lavik Traders', 'Receipt', '671', 61393, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dugya Cattle Feed - Muhana' OR legal_or_core_name ILIKE 'Dugya Cattle Feed - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-02', 'Dugya Cattle Feed - Muhana', 'Sales', '2854/25-26', 60464, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-02', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2855/25-26', 13458, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-02', 'Ishwar and Company Surajpool', 'Sales', '2853/25-26', 94500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jain & Brothers - Muhana Mandi' OR legal_or_core_name ILIKE 'Jain & Brothers - Muhana Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-02', 'Jain & Brothers - Muhana Mandi', 'Sales', '2856/25-26', 62717, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Giriraj Enterprises - Kalu Ka Baas' OR legal_or_core_name ILIKE 'Giriraj Enterprises - Kalu Ka Baas' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-02', 'Giriraj Enterprises - Kalu Ka Baas', 'Sales', '2857/25-26', 51172, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-02', 'Choudhary Pashu Aahar  Parbatsar', 'Sales', '2858/25-26', 80760, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-03', 'Office Expenses', 'Payment', '735', 2250, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-03', 'Wages Expenses A/C', 'Payment', '736', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'J.S. Packers - Jaipur' OR legal_or_core_name ILIKE 'J.S. Packers - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-03', 'J.S. Packers - Jaipur', 'Payment', '737', 20076, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading  Company  - Lalshot' OR legal_or_core_name ILIKE 'Balaji Trading  Company  - Lalshot' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-03', 'Balaji Trading  Company  - Lalshot', 'Receipt', '672', 62415, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-03', 'Choudhary Pashu Aahar  Parbatsar', 'Receipt', '673', 25625, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anjani Trading Company  -(Beawar)' OR legal_or_core_name ILIKE 'Anjani Trading Company  -(Beawar)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-03', 'Anjani Trading Company  -(Beawar)', 'Receipt', '675', 52608, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ratan Lal and Company     Khejroli' OR legal_or_core_name ILIKE 'Ratan Lal and Company     Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-03', 'Ratan Lal and Company     Khejroli', 'Receipt', '676', 64732, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Sagar Feed Bilwada' OR legal_or_core_name ILIKE 'Sagar Feed Bilwada' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-03', 'Sagar Feed Bilwada', 'Receipt', '677', 85350, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trandig Company' OR legal_or_core_name ILIKE 'Manish Trandig Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-03', 'Manish Trandig Company', 'Receipt', '678', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Navin Pashu Aahar   Malpura Rood Mandi Ke Samne' OR legal_or_core_name ILIKE 'Navin Pashu Aahar   Malpura Rood Mandi Ke Samne' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-03', 'Navin Pashu Aahar   Malpura Rood Mandi Ke Samne', 'Receipt', '679', 4000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Navin Pashu Aahar   Malpura Rood Mandi Ke Samne', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Navin Pashu Aahar   Malpura Rood Mandi Ke Samne';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Discount Given' OR legal_or_core_name ILIKE 'Discount Given' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-03', 'Discount Given', 'Journal', '14', 180, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Khandelwal Kirana  Store - Nindar' OR legal_or_core_name ILIKE 'Khandelwal Kirana  Store - Nindar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-03', 'Khandelwal Kirana  Store - Nindar', 'Sales', '2859/2025-2026', 25800, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Khandelwal Kirana  Store - Nindar', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Khandelwal Kirana  Store - Nindar';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Agro Industries - Muhana' OR legal_or_core_name ILIKE 'Shri Balaji Agro Industries - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-03', 'Shri Balaji Agro Industries - Muhana', 'Sales', '2861/25-26', 28770, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-03', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Sales', '2862/25-26', 117000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-04', 'Vetkind Animal Health India', 'Payment', '738', 176000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'DILIP UDYOUG' OR legal_or_core_name ILIKE 'DILIP UDYOUG' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-04', 'DILIP UDYOUG', 'Payment', '739', 40986, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Insurance Exp' OR legal_or_core_name ILIKE 'Insurance Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-04', 'Insurance Exp', 'Payment', '740', 8998, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-04', 'Wages Expenses A/C', 'Payment', '741', 7400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-04', 'Tour & Travel', 'Payment', '742', 1500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Blue Diamond Food Production' OR legal_or_core_name ILIKE 'Blue Diamond Food Production' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-04', 'Blue Diamond Food Production', 'Receipt', '680', 10000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-04', 'Kharwash Trading Company (Muhana )', 'Receipt', '681', 255419, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Manish Trandig Company' OR legal_or_core_name ILIKE 'Manish Trandig Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-04', 'Manish Trandig Company', 'Receipt', '682', 7500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' OR legal_or_core_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-04', 'Krishna Baat Bhandhar- Sirsi Mode', 'Receipt', '683', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Discount Given' OR legal_or_core_name ILIKE 'Discount Given' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-04', 'Discount Given', 'Journal', '15', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-04', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2863/25-26', 9380, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ankit Trading Company Fulera' OR legal_or_core_name ILIKE 'Ankit Trading Company Fulera' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-04', 'Ankit Trading Company Fulera', 'Sales', '2864/25-26', 46053, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Ram Cattle Feed  Industrises Jaitpura' OR legal_or_core_name ILIKE 'Shri Ram Cattle Feed  Industrises Jaitpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-04', 'Shri Ram Cattle Feed  Industrises Jaitpura', 'Purchase', '155', 82170, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-05', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '684', 13458, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' OR legal_or_core_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-05', 'Krishna Baat Bhandhar- Sirsi Mode', 'Receipt', '685', 8000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ramnarayan  Girraj Jaipur' OR legal_or_core_name ILIKE 'Ramnarayan  Girraj Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-05', 'Ramnarayan  Girraj Jaipur', 'Receipt', '686', 7200, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Brothers - Renwal' OR legal_or_core_name ILIKE 'Vinayak Brothers - Renwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-05', 'Vinayak Brothers - Renwal', 'Sales', '2865/25-26', 92500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'BUSINESS PROMOTION EXPENSES' OR legal_or_core_name ILIKE 'BUSINESS PROMOTION EXPENSES' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-06', 'BUSINESS PROMOTION EXPENSES', 'Payment', '743', 31801, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-06', 'Wages Expenses A/C', 'Payment', '744', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-06', 'Convence Expensece', 'Payment', '745', 3010, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-06', 'G.K.N - Industries', 'Receipt', '687', 57789, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-06', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2866/25-26', 17535, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Treding Company Khejroli' OR legal_or_core_name ILIKE 'Shri Shyam Treding Company Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-06', 'Shri Shyam Treding Company Khejroli', 'Sales', '2867/25-26', 78000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Sehri Agro Oils Pvt Ltd  Kukar Kheda Mandi' OR legal_or_core_name ILIKE 'Sehri Agro Oils Pvt Ltd  Kukar Kheda Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-06', 'Sehri Agro Oils Pvt Ltd  Kukar Kheda Mandi', 'Purchase', '156', 31902, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Sehri Agro Oils Pvt Ltd  Kukar Kheda Mandi', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Sehri Agro Oils Pvt Ltd  Kukar Kheda Mandi';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Sehri Agro Oils Pvt Ltd  Kukar Kheda Mandi' OR legal_or_core_name ILIKE 'Sehri Agro Oils Pvt Ltd  Kukar Kheda Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-06', 'Sehri Agro Oils Pvt Ltd  Kukar Kheda Mandi', 'Purchase', '157', 17300, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S M Sales Corporation  Jaipur' OR legal_or_core_name ILIKE 'S M Sales Corporation  Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-06', 'S M Sales Corporation  Jaipur', 'Purchase', '158', 14014, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Ram Cattle Feed  Industrises Jaitpura' OR legal_or_core_name ILIKE 'Shri Ram Cattle Feed  Industrises Jaitpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-07', 'Shri Ram Cattle Feed  Industrises Jaitpura', 'Payment', '746', 82170, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-10-07', 'Wages Expenses A/C', 'Payment', '747', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

END $$;
