DO $$
DECLARE
  p_id UUID;
  t_id UUID;
  r_id UUID;
BEGIN
  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Chand Pasu Aahar Malpura' OR legal_or_core_name ILIKE 'Shri Chand Pasu Aahar Malpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-04', 'Shri Chand Pasu Aahar Malpura', 'Receipt', '390', 96520, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'KAMAL TRADING CO Dudu' OR legal_or_core_name ILIKE 'KAMAL TRADING CO Dudu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-04', 'KAMAL TRADING CO Dudu', 'Receipt', '391', 60000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Murlidhar Ji Yadav- Khejroli' OR legal_or_core_name ILIKE 'Murlidhar Ji Yadav- Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-04', 'Murlidhar Ji Yadav- Khejroli', 'Receipt', '392', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Treding Company Khejroli' OR legal_or_core_name ILIKE 'Shri Shyam Treding Company Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-04', 'Shri Shyam Treding Company Khejroli', 'Receipt', '393', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-04', 'Godha Enterprises (Hingoniya)', 'Receipt', '394', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Agro Industries - Muhana' OR legal_or_core_name ILIKE 'Shri Balaji Agro Industries - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-04', 'Shri Balaji Agro Industries - Muhana', 'Receipt', '395', 17623, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Prakash Enterprises - Phulera' OR legal_or_core_name ILIKE 'Prakash Enterprises - Phulera' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-04', 'Prakash Enterprises - Phulera', 'Sales', '2661/25-26', 78595, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'M S Industries' OR legal_or_core_name ILIKE 'M S Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-04', 'M S Industries', 'Sales', '2663/2025-2026', 549847, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('M S Industries', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'M S Industries';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-05', 'Wages Expenses A/C', 'Payment', '430', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-05', 'Wages Expenses A/C', 'Payment', '431', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-05', 'Wages Expenses A/C', 'Payment', '432', 4950, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-05', 'Convence Expensece', 'Payment', '433', 2100, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading  Company  - Lalshot' OR legal_or_core_name ILIKE 'Balaji Trading  Company  - Lalshot' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-05', 'Balaji Trading  Company  - Lalshot', 'Receipt', '396', 57332, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Babulal Ji Yadav - Mahaswas' OR legal_or_core_name ILIKE 'Babulal Ji Yadav - Mahaswas' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-05', 'Babulal Ji Yadav - Mahaswas', 'Receipt', '397', 80000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Murlidhar Ji Yadav- Khejroli' OR legal_or_core_name ILIKE 'Murlidhar Ji Yadav- Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-05', 'Murlidhar Ji Yadav- Khejroli', 'Receipt', '398', 2000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Treding Company Khejroli' OR legal_or_core_name ILIKE 'Shri Shyam Treding Company Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-05', 'Shri Shyam Treding Company Khejroli', 'Receipt', '399', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-05', 'Godha Enterprises (Hingoniya)', 'Receipt', '400', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading  Company  - Lalshot' OR legal_or_core_name ILIKE 'Balaji Trading  Company  - Lalshot' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-05', 'Balaji Trading  Company  - Lalshot', 'Sales', '2664/25-26', 57332, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'EMAMI AGROTECH LIMITED MOJMAMABAD' OR legal_or_core_name ILIKE 'EMAMI AGROTECH LIMITED MOJMAMABAD' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-05', 'EMAMI AGROTECH LIMITED MOJMAMABAD', 'Purchase', '77', 546480, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-06', 'G.K.N - Industries', 'Receipt', '401', 46448, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' OR legal_or_core_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-06', 'SHRI BALAJI ENTERPRISES-TIGARIYA', 'Receipt', '402', 64290, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-07', 'Tour & Travel', 'Payment', '434', 1930, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-07', 'Wages Expenses A/C', 'Payment', '435', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-07', 'Wages Expenses A/C', 'Payment', '436', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-07', 'Wages Expenses A/C', 'Payment', '437', 4900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Padmawati Trading Co.' OR legal_or_core_name ILIKE 'Padmawati Trading Co.' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-07', 'Padmawati Trading Co.', 'Payment', '438', 3312, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'R S Solvent Extractions Ltd Kaithal' OR legal_or_core_name ILIKE 'R S Solvent Extractions Ltd Kaithal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-07', 'R S Solvent Extractions Ltd Kaithal', 'Payment', '439', 260456, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Sk Trading Company Kurukshetra' OR legal_or_core_name ILIKE 'Sk Trading Company Kurukshetra' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-07', 'Sk Trading Company Kurukshetra', 'Payment', '440', 301250, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tha Panipat Co Operative Sugar Mills Ltd' OR legal_or_core_name ILIKE 'Tha Panipat Co Operative Sugar Mills Ltd' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-07', 'Tha Panipat Co Operative Sugar Mills Ltd', 'Payment', '441', 460000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Tha Panipat Co Operative Sugar Mills Ltd', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Tha Panipat Co Operative Sugar Mills Ltd';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Hari Shanker Khandelwal' OR legal_or_core_name ILIKE 'Shri Hari Shanker Khandelwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-07', 'Shri Hari Shanker Khandelwal', 'Payment', '442', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nilesh Kumar Khandelwal' OR legal_or_core_name ILIKE 'Nilesh Kumar Khandelwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-07', 'Nilesh Kumar Khandelwal', 'Payment', '443', 9500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Treding Company Khejroli' OR legal_or_core_name ILIKE 'Shri Shyam Treding Company Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-07', 'Shri Shyam Treding Company Khejroli', 'Receipt', '403', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-07', 'Godha Enterprises (Hingoniya)', 'Receipt', '404', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-07', 'Kharwash Trading Company (Muhana )', 'Sales', '2665/25-26', 57810, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Wages Expenses A/C', 'Payment', '444', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Wages Expenses A/C', 'Payment', '445', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Wages Expenses A/C', 'Payment', '446', 4950, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tha Panipat Co Operative Sugar Mills Ltd' OR legal_or_core_name ILIKE 'Tha Panipat Co Operative Sugar Mills Ltd' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Tha Panipat Co Operative Sugar Mills Ltd', 'Payment', '447', 13047, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nilesh Kumar Khandelwal' OR legal_or_core_name ILIKE 'Nilesh Kumar Khandelwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Nilesh Kumar Khandelwal', 'Payment', '448', 9500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Treding Company Khejroli' OR legal_or_core_name ILIKE 'Shri Shyam Treding Company Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Shri Shyam Treding Company Khejroli', 'Receipt', '405', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '406', 17535, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Godha Enterprises (Hingoniya)', 'Receipt', '407', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2666/25-26', 17730, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'G.K.N - Industries', 'Sales', '2667/25-26', 46449, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Babulal Ji Yadav - Mahaswas' OR legal_or_core_name ILIKE 'Babulal Ji Yadav - Mahaswas' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Babulal Ji Yadav - Mahaswas', 'Sales', '2668/25-26', 76500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Godha Enterprises (Hingoniya)', 'Sales', '2669/25-26', 87725, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Kharwash Trading Company (Muhana )', 'Sales', '2670/25-26', 66760, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Sales', '2671/25-26', 34000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Sales', '2672/25-26', 58608, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Sales', '2673/25-26', 181559, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shree Balaji Foods Bassi Jaipur' OR legal_or_core_name ILIKE 'Shree Balaji Foods Bassi Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Shree Balaji Foods Bassi Jaipur', 'Purchase', '78', 45432, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Shree Balaji Foods Bassi Jaipur', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Shree Balaji Foods Bassi Jaipur';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' OR legal_or_core_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-08', 'Mangal Treding Company Kukerkheda Mhandi', 'Purchase', '79', 9510, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-09', 'Wages Expenses A/C', 'Payment', '449', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-09', 'Wages Expenses A/C', 'Payment', '450', 4800, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-09', 'Machinery Reparing', 'Payment', '451', 14952, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-09', 'Convence Expensece', 'Payment', '452', 2000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-09', 'Tour & Travel', 'Payment', '453', 1200, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Treding Company Khejroli' OR legal_or_core_name ILIKE 'Shri Shyam Treding Company Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-09', 'Shri Shyam Treding Company Khejroli', 'Receipt', '408', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Prakash Enterprises - Phulera' OR legal_or_core_name ILIKE 'Prakash Enterprises - Phulera' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-09', 'Prakash Enterprises - Phulera', 'Receipt', '409', 84800, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-09', 'Godha Enterprises (Hingoniya)', 'Receipt', '410', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'M S Industries' OR legal_or_core_name ILIKE 'M S Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-09', 'M S Industries', 'Receipt', '411', 549847, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Uttam Agencies Sambriya' OR legal_or_core_name ILIKE 'Uttam Agencies Sambriya' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-09', 'Uttam Agencies Sambriya', 'Receipt', '412', 51018, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-09', 'Lavik Traders', 'Sales', '2674/25-26', 44510, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-09', 'Ishwar and Company Surajpool', 'Sales', '2675/25-26', 86240, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Chand Pasu Aahar Malpura' OR legal_or_core_name ILIKE 'Shri Chand Pasu Aahar Malpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-09', 'Shri Chand Pasu Aahar Malpura', 'Sales', '2676/25-26', 87470, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anjani Trading Company  -(Beawar)' OR legal_or_core_name ILIKE 'Anjani Trading Company  -(Beawar)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-09', 'Anjani Trading Company  -(Beawar)', 'Sales', '2677/25-26', 52162, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-10', 'Wages Expenses A/C', 'Payment', '454', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-10', 'Wages Expenses A/C', 'Payment', '455', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-10', 'Wages Expenses A/C', 'Payment', '456', 4950, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-10', 'Machinery Reparing', 'Payment', '457', 1850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ajay Kumar' OR legal_or_core_name ILIKE 'Ajay Kumar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-10', 'Ajay Kumar', 'Payment', '458', 15000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Treding Company Khejroli' OR legal_or_core_name ILIKE 'Shri Shyam Treding Company Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-10', 'Shri Shyam Treding Company Khejroli', 'Receipt', '413', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-10', 'Godha Enterprises (Hingoniya)', 'Receipt', '414', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dugya Cattle Feed - Muhana' OR legal_or_core_name ILIKE 'Dugya Cattle Feed - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-10', 'Dugya Cattle Feed - Muhana', 'Receipt', '415', 77450, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tha Panipat Co Operative Sugar Mills Ltd' OR legal_or_core_name ILIKE 'Tha Panipat Co Operative Sugar Mills Ltd' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-10', 'Tha Panipat Co Operative Sugar Mills Ltd', 'Purchase', '80', 473047, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-11', 'Wages Expenses A/C', 'Payment', '459', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-11', 'Wages Expenses A/C', 'Payment', '460', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-11', 'Wages Expenses A/C', 'Payment', '461', 4900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-11', 'Office Expenses', 'Payment', '462', 1940, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-11', 'Machinery Reparing', 'Payment', '463', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Treding Company Khejroli' OR legal_or_core_name ILIKE 'Shri Shyam Treding Company Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-11', 'Shri Shyam Treding Company Khejroli', 'Receipt', '416', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-11', 'Godha Enterprises (Hingoniya)', 'Receipt', '417', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-11', 'Choudhary Pashu Aahar  Parbatsar', 'Receipt', '418', 25075, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-11', 'Ishwar and Company Surajpool', 'Receipt', '419', 80000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ganesh Pashuahar Chaksu' OR legal_or_core_name ILIKE 'Ganesh Pashuahar Chaksu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-11', 'Ganesh Pashuahar Chaksu', 'Receipt', '420', 400000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-11', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '421', 17730, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Love General Stor    Tunga' OR legal_or_core_name ILIKE 'Love General Stor    Tunga' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-11', 'Love General Stor    Tunga', 'Receipt', '422', 35000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-11', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2678/25-26', 17903, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-11', 'Choudhary Pashu Aahar  Parbatsar', 'Sales', '2679/25-26', 83345, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'R S Oil Mils' OR legal_or_core_name ILIKE 'R S Oil Mils' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-11', 'R S Oil Mils', 'Purchase', '81', 23627, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'R S Oil Mils' OR legal_or_core_name ILIKE 'R S Oil Mils' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-11', 'R S Oil Mils', 'Purchase', '82', 25274, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-12', 'Tour & Travel', 'Payment', '464', 2240, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-12', 'Wages Expenses A/C', 'Payment', '465', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-12', 'Wages Expenses A/C', 'Payment', '466', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-12', 'Wages Expenses A/C', 'Payment', '467', 4850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-12', 'Machinery Reparing', 'Payment', '468', 4801, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Treding Company Khejroli' OR legal_or_core_name ILIKE 'Shri Shyam Treding Company Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-12', 'Shri Shyam Treding Company Khejroli', 'Receipt', '423', 4900, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-12', 'Godha Enterprises (Hingoniya)', 'Receipt', '424', 5000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' OR legal_or_core_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-12', 'Jai Jagdamba Treding Company Nangal Bhirda', 'Receipt', '425', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-12', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '426', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Abhishek Treding Company  Fathenegar' OR legal_or_core_name ILIKE 'Abhishek Treding Company  Fathenegar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-12', 'Abhishek Treding Company  Fathenegar', 'Sales', '2680/25-26', 238000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Singal Dall Mill  Jaipur' OR legal_or_core_name ILIKE 'Singal Dall Mill  Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-12', 'Singal Dall Mill  Jaipur', 'Purchase', '83', 46050, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Singal Dall Mill  Jaipur', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Singal Dall Mill  Jaipur';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ms Manoj Kumar Navratan Up' OR legal_or_core_name ILIKE 'Ms Manoj Kumar Navratan Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-13', 'Ms Manoj Kumar Navratan Up', 'Purchase', '84', 793633, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Ms Manoj Kumar Navratan Up', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Ms Manoj Kumar Navratan Up';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-14', 'Wages Expenses A/C', 'Payment', '469', 4900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-14', 'Wages Expenses A/C', 'Payment', '470', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-14', 'Wages Expenses A/C', 'Payment', '471', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shree Balaji Foods Bassi Jaipur' OR legal_or_core_name ILIKE 'Shree Balaji Foods Bassi Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-14', 'Shree Balaji Foods Bassi Jaipur', 'Payment', '472', 45432, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-14', 'Machinery Reparing', 'Payment', '473', 14160, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-14', 'Convence Expensece', 'Payment', '474', 2200, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tarachand Ji -Yadav Khejroli' OR legal_or_core_name ILIKE 'Tarachand Ji -Yadav Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-14', 'Tarachand Ji -Yadav Khejroli', 'Receipt', '427', 44900, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Abhishek Treding Company  Fathenegar' OR legal_or_core_name ILIKE 'Abhishek Treding Company  Fathenegar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-14', 'Abhishek Treding Company  Fathenegar', 'Receipt', '428', 238000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-14', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '429', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' OR legal_or_core_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-14', 'Jai Jagdamba Treding Company Nangal Bhirda', 'Receipt', '430', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Brothers - Renwal' OR legal_or_core_name ILIKE 'Vinayak Brothers - Renwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-14', 'Vinayak Brothers - Renwal', 'Sales', '2681/25-26', 94180, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Vindyavaisni Pashu Ahar Kendra' OR legal_or_core_name ILIKE 'Maa Vindyavaisni Pashu Ahar Kendra' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-14', 'Maa Vindyavaisni Pashu Ahar Kendra', 'Purchase', '85', 226567, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Maa Vindyavaisni Pashu Ahar Kendra', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Maa Vindyavaisni Pashu Ahar Kendra';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Enterprises - Uttar Pradesh' OR legal_or_core_name ILIKE 'Shri Balaji Enterprises - Uttar Pradesh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-14', 'Shri Balaji Enterprises - Uttar Pradesh', 'Purchase', '86', 170337, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-15', 'Wages Expenses A/C', 'Payment', '475', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-15', 'Wages Expenses A/C', 'Payment', '476', 4950, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-15', 'Wages Expenses A/C', 'Payment', '477', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-15', 'Machinery Reparing', 'Payment', '478', 2150, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Electricity and Water Expenses' OR legal_or_core_name ILIKE 'Electricity and Water Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-15', 'Electricity and Water Expenses', 'Payment', '479', 66276, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'BUSINESS PROMOTION EXPENSES' OR legal_or_core_name ILIKE 'BUSINESS PROMOTION EXPENSES' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-15', 'BUSINESS PROMOTION EXPENSES', 'Payment', '480', 39848, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'R S Oil Mils' OR legal_or_core_name ILIKE 'R S Oil Mils' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-15', 'R S Oil Mils', 'Payment', '481', 48901, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jurashik Minral' OR legal_or_core_name ILIKE 'Jurashik Minral' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-15', 'Jurashik Minral', 'Payment', '482', 35675, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Singal Dall Mill  Jaipur' OR legal_or_core_name ILIKE 'Singal Dall Mill  Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-15', 'Singal Dall Mill  Jaipur', 'Payment', '483', 46050, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-15', 'G.K.N - Industries', 'Receipt', '431', 42811, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'PRABHA MAHILA KISSAN PRODUSER KHANDER' OR legal_or_core_name ILIKE 'PRABHA MAHILA KISSAN PRODUSER KHANDER' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-15', 'PRABHA MAHILA KISSAN PRODUSER KHANDER', 'Receipt', '432', 35000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-15', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '433', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' OR legal_or_core_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-15', 'Jai Jagdamba Treding Company Nangal Bhirda', 'Receipt', '434', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-15', 'Vetkind Animal Health India', 'Purchase', '87', 24000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-15', 'Vetkind Animal Health India', 'Purchase', '88', 155000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-15', 'Vetkind Animal Health India', 'Purchase', '89', 25000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-16', 'Wages Expenses A/C', 'Payment', '484', 4800, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-16', 'Wages Expenses A/C', 'Payment', '485', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-16', 'Wages Expenses A/C', 'Payment', '486', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-16', 'Vetkind Animal Health India', 'Payment', '487', 47490, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-16', 'Convence Expensece', 'Payment', '488', 1500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-16', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '435', 17903, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Hariyana Baat  Bhandar Dolaitpura' OR legal_or_core_name ILIKE 'Hariyana Baat  Bhandar Dolaitpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-16', 'Hariyana Baat  Bhandar Dolaitpura', 'Receipt', '436', 10000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-16', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '437', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' OR legal_or_core_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-16', 'Jai Jagdamba Treding Company Nangal Bhirda', 'Receipt', '438', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Patel Enterprises  Rojda' OR legal_or_core_name ILIKE 'Patel Enterprises  Rojda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-16', 'Patel Enterprises  Rojda', 'Sales', '2682/25-26', 61900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' OR legal_or_core_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-16', 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur', 'Sales', '2683/25-26', 53860, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-16', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2684/25-26', 22838, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-16', 'Kharwash Trading Company (Muhana )', 'Sales', '2685/25-26', 57810, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jain & Brothers - Muhana Mandi' OR legal_or_core_name ILIKE 'Jain & Brothers - Muhana Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-16', 'Jain & Brothers - Muhana Mandi', 'Sales', '2686/25-26', 62715, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-17', 'Wages Expenses A/C', 'Payment', '489', 4950, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-17', 'Wages Expenses A/C', 'Payment', '490', 620, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-17', 'Wages Expenses A/C', 'Payment', '491', 1100, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-17', 'Tour & Travel', 'Payment', '492', 2540, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ms Manoj Kumar Navratan Up' OR legal_or_core_name ILIKE 'Ms Manoj Kumar Navratan Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-17', 'Ms Manoj Kumar Navratan Up', 'Payment', '493', 790657, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Vindyavaisni Pashu Ahar Kendra' OR legal_or_core_name ILIKE 'Maa Vindyavaisni Pashu Ahar Kendra' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-17', 'Maa Vindyavaisni Pashu Ahar Kendra', 'Payment', '494', 226567, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Enterprises - Uttar Pradesh' OR legal_or_core_name ILIKE 'Shri Balaji Enterprises - Uttar Pradesh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-17', 'Shri Balaji Enterprises - Uttar Pradesh', 'Payment', '495', 170337, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-17', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Receipt', '439', 274167, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anjani Trading Company  -(Beawar)' OR legal_or_core_name ILIKE 'Anjani Trading Company  -(Beawar)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-17', 'Anjani Trading Company  -(Beawar)', 'Receipt', '440', 52162, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-17', 'Lavik Traders', 'Receipt', '441', 58725, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Patel Enterprises  Rojda' OR legal_or_core_name ILIKE 'Patel Enterprises  Rojda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-17', 'Patel Enterprises  Rojda', 'Receipt', '442', 123800, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kedar Kirana Stor Benadamod' OR legal_or_core_name ILIKE 'Kedar Kirana Stor Benadamod' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-17', 'Kedar Kirana Stor Benadamod', 'Receipt', '443', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-17', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '444', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' OR legal_or_core_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-17', 'Jai Jagdamba Treding Company Nangal Bhirda', 'Receipt', '445', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-18', 'Wages Expenses A/C', 'Payment', '496', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-18', 'Wages Expenses A/C', 'Payment', '497', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-18', 'Wages Expenses A/C', 'Payment', '498', 4850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-18', 'Office Expenses', 'Payment', '499', 2260, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Telephone Exp' OR legal_or_core_name ILIKE 'Telephone Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-18', 'Telephone Exp', 'Payment', '500', 1070, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jaipur Packers - Rajasthan' OR legal_or_core_name ILIKE 'Jaipur Packers - Rajasthan' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-18', 'Jaipur Packers - Rajasthan', 'Payment', '501', 147498, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jaipur Packers - Rajasthan' OR legal_or_core_name ILIKE 'Jaipur Packers - Rajasthan' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-18', 'Jaipur Packers - Rajasthan', 'Payment', '502', 22166, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' OR legal_or_core_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-18', 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur', 'Receipt', '446', 53860, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-18', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '447', 6145, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' OR legal_or_core_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-18', 'Jai Jagdamba Treding Company Nangal Bhirda', 'Receipt', '448', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-18', 'G.K.N - Industries', 'Sales', '2687/25-26', 42811, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-18', 'Shyam Baat Bhandar - Kanwarpura', 'Sales', '2688/25-26', 63800, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-19', 'Wages Expenses A/C', 'Payment', '503', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-19', 'Wages Expenses A/C', 'Payment', '504', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-19', 'Wages Expenses A/C', 'Payment', '505', 4900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Printing & Stationary' OR legal_or_core_name ILIKE 'Printing & Stationary' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-19', 'Printing & Stationary', 'Payment', '506', 2115, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dugya Cattle Feed - Muhana' OR legal_or_core_name ILIKE 'Dugya Cattle Feed - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-19', 'Dugya Cattle Feed - Muhana', 'Receipt', '449', 75000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-19', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '450', 22838, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' OR legal_or_core_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-19', 'Jai Jagdamba Treding Company Nangal Bhirda', 'Receipt', '451', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-19', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2689/25-26', 17535, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' OR legal_or_core_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-19', 'SHRI BALAJI ENTERPRISES-TIGARIYA', 'Sales', '2690/25-26', 68745, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-19', 'G.K.N - Industries', 'Sales', '2691/25-26', 37167, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Enterprises - Uttar Pradesh' OR legal_or_core_name ILIKE 'Shri Balaji Enterprises - Uttar Pradesh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-19', 'Shri Balaji Enterprises - Uttar Pradesh', 'Purchase', '90', 166870, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'DILIP UDYOUG' OR legal_or_core_name ILIKE 'DILIP UDYOUG' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-19', 'DILIP UDYOUG', 'Purchase', '91', 40986, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Goyal Treders Fhagi' OR legal_or_core_name ILIKE 'Goyal Treders Fhagi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-20', 'Goyal Treders Fhagi', 'Sales', '2692/25-26', 77418, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ms Manoj Kumar Navratan Up' OR legal_or_core_name ILIKE 'Ms Manoj Kumar Navratan Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-21', 'Ms Manoj Kumar Navratan Up', 'Payment', '507', 2976, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-21', 'Wages Expenses A/C', 'Payment', '508', 7500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-21', 'Tour & Travel', 'Payment', '509', 2350, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' OR legal_or_core_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-21', 'Jai Jagdamba Treding Company Nangal Bhirda', 'Receipt', '452', 8990, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading  Company  - Lalshot' OR legal_or_core_name ILIKE 'Balaji Trading  Company  - Lalshot' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-21', 'Balaji Trading  Company  - Lalshot', 'Sales', '2693/25-26', 71818, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-21', 'Lavik Traders', 'Sales', '2694/25-26', 36344, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Agro Industries - Muhana' OR legal_or_core_name ILIKE 'Shri Balaji Agro Industries - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-21', 'Shri Balaji Agro Industries - Muhana', 'Sales', '2695/25-26', 21650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Enterprises - Uttar Pradesh' OR legal_or_core_name ILIKE 'Shri Balaji Enterprises - Uttar Pradesh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-22', 'Shri Balaji Enterprises - Uttar Pradesh', 'Payment', '510', 166870, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'DILIP UDYOUG' OR legal_or_core_name ILIKE 'DILIP UDYOUG' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-22', 'DILIP UDYOUG', 'Payment', '511', 40986, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-22', 'Wages Expenses A/C', 'Payment', '512', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-22', 'Convence Expensece', 'Payment', '513', 3000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-22', 'Office Expenses', 'Payment', '514', 150, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading  Company  - Lalshot' OR legal_or_core_name ILIKE 'Balaji Trading  Company  - Lalshot' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-22', 'Balaji Trading  Company  - Lalshot', 'Receipt', '453', 71818, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anjani Trading Company  -(Beawar)' OR legal_or_core_name ILIKE 'Anjani Trading Company  -(Beawar)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-22', 'Anjani Trading Company  -(Beawar)', 'Sales', '2696/25-26', 58450, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-23', 'Wages Expenses A/C', 'Payment', '515', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-23', 'Tour & Travel', 'Payment', '516', 2210, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rakesh Kirana Store - Khejroli' OR legal_or_core_name ILIKE 'Rakesh Kirana Store - Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-23', 'Rakesh Kirana Store - Khejroli', 'Receipt', '454', 70890, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-23', 'Choudhary Pashu Aahar  Parbatsar', 'Receipt', '455', 20000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anukumar Mukesh Kumar Malpura' OR legal_or_core_name ILIKE 'Anukumar Mukesh Kumar Malpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-23', 'Anukumar Mukesh Kumar Malpura', 'Receipt', '456', 40000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-23', 'Lavik Traders', 'Sales', '2697/25-26', 41423, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-23', 'Kharwash Trading Company (Muhana )', 'Sales', '2698/25-26', 57810, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Murlidhar Ji Yadav- Khejroli' OR legal_or_core_name ILIKE 'Murlidhar Ji Yadav- Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-23', 'Murlidhar Ji Yadav- Khejroli', 'Sales', '2699/25-26', 12700, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tarachand Ji -Yadav Khejroli' OR legal_or_core_name ILIKE 'Tarachand Ji -Yadav Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-23', 'Tarachand Ji -Yadav Khejroli', 'Sales', '2700/25-26', 44900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-23', 'Ishwar and Company Surajpool', 'Sales', '2701/25-26', 77175, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-24', 'Machinery Reparing', 'Payment', '517', 18338, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-24', 'Wages Expenses A/C', 'Payment', '518', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-24', 'Tour & Travel', 'Payment', '519', 1500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-24', 'Office Expenses', 'Payment', '520', 1450, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S Kumar & Company - Navalgarh' OR legal_or_core_name ILIKE 'S Kumar & Company - Navalgarh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-24', 'S Kumar & Company - Navalgarh', 'Receipt', '457', 70000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-24', 'Haritwal Pashu Ahar Vatika', 'Receipt', '458', 9900, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-25', 'Wages Expenses A/C', 'Payment', '521', 7500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-25', 'Machinery Reparing', 'Payment', '522', 1650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Chand Pasu Aahar Malpura' OR legal_or_core_name ILIKE 'Shri Chand Pasu Aahar Malpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-25', 'Shri Chand Pasu Aahar Malpura', 'Receipt', '459', 193628, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-25', 'Haritwal Pashu Ahar Vatika', 'Receipt', '460', 9900, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Electricity and Water Expenses' OR legal_or_core_name ILIKE 'Electricity and Water Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-26', 'Electricity and Water Expenses', 'Payment', '523', 2393, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-26', 'Wages Expenses A/C', 'Payment', '524', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-26', 'Office Expenses', 'Payment', '525', 1960, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-26', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '461', 17535, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Genral Stor Ranwal' OR legal_or_core_name ILIKE 'Vinayak Genral Stor Ranwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-26', 'Vinayak Genral Stor Ranwal', 'Receipt', '462', 54500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Genral Stor Ranwal' OR legal_or_core_name ILIKE 'Vinayak Genral Stor Ranwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-26', 'Vinayak Genral Stor Ranwal', 'Receipt', '463', 15178, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Moti Ratan Trading Company Bhilwara' OR legal_or_core_name ILIKE 'Moti Ratan Trading Company Bhilwara' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-26', 'Moti Ratan Trading Company Bhilwara', 'Receipt', '464', 100000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-26', 'Haritwal Pashu Ahar Vatika', 'Receipt', '465', 9900, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Namokaar Trading Company' OR legal_or_core_name ILIKE 'Shri Namokaar Trading Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-26', 'Shri Namokaar Trading Company', 'Receipt', '466', 5000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-26', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2702/25-26', 18393, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Genral Stor Ranwal' OR legal_or_core_name ILIKE 'Vinayak Genral Stor Ranwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-26', 'Vinayak Genral Stor Ranwal', 'Sales', '2703/25-26', 69678, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'M Choudhry Trading Company - Jalpali' OR legal_or_core_name ILIKE 'M Choudhry Trading Company - Jalpali' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-26', 'M Choudhry Trading Company - Jalpali', 'Sales', '2704/25-26', 59600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'KAMAL TRADING CO Dudu' OR legal_or_core_name ILIKE 'KAMAL TRADING CO Dudu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-26', 'KAMAL TRADING CO Dudu', 'Sales', '2705/25-26', 60800, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Chand Pasu Aahar Malpura' OR legal_or_core_name ILIKE 'Shri Chand Pasu Aahar Malpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-26', 'Shri Chand Pasu Aahar Malpura', 'Sales', '2707/2024-2025', 114720, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Khandelwal Jaipur' OR legal_or_core_name ILIKE 'Shyam Khandelwal Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-26', 'Shyam Khandelwal Jaipur', 'Sales', '2706/2024-25', 60940, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Shyam Khandelwal Jaipur', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Shyam Khandelwal Jaipur';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' OR legal_or_core_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-26', 'Mangal Treding Company Kukerkheda Mhandi', 'Purchase', '92', 4872, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' OR legal_or_core_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-27', 'SHRI BALAJI ENTERPRISES-TIGARIYA', 'Receipt', '467', 61036, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Love General Stor    Tunga' OR legal_or_core_name ILIKE 'Love General Stor    Tunga' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-27', 'Love General Stor    Tunga', 'Receipt', '468', 20000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-28', 'Wages Expenses A/C', 'Payment', '526', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-28', 'Tour & Travel', 'Payment', '527', 2070, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Murlidhar Ji Yadav- Khejroli' OR legal_or_core_name ILIKE 'Murlidhar Ji Yadav- Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-28', 'Murlidhar Ji Yadav- Khejroli', 'Receipt', '469', 10000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Giriraj Trading Company - Alwar' OR legal_or_core_name ILIKE 'Giriraj Trading Company - Alwar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-28', 'Giriraj Trading Company - Alwar', 'Receipt', '470', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-28', 'Haritwal Pashu Ahar Vatika', 'Receipt', '471', 9900, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-29', 'Machinery Reparing', 'Payment', '528', 78880, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-29', 'Wages Expenses A/C', 'Payment', '529', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-29', 'Convence Expensece', 'Payment', '530', 2300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-29', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '472', 18393, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-29', 'Haritwal Pashu Ahar Vatika', 'Receipt', '473', 9900, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-29', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2708/25-26', 14070, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-29', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Sales', '2709/25-26', 115873, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ganesh Pashuahar Chaksu' OR legal_or_core_name ILIKE 'Ganesh Pashuahar Chaksu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-29', 'Ganesh Pashuahar Chaksu', 'Sales', '2710/25-26', 175760, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'R S Oil Mils' OR legal_or_core_name ILIKE 'R S Oil Mils' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-29', 'R S Oil Mils', 'Purchase', '93', 67910, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Car Loan - Hyrider' OR legal_or_core_name ILIKE 'Car Loan - Hyrider' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-30', 'Car Loan - Hyrider', 'Payment', '531', 48357, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-30', 'Wages Expenses A/C', 'Payment', '532', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-30', 'Machinery Reparing', 'Payment', '533', 2350, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'KAMAL TRADING CO Dudu' OR legal_or_core_name ILIKE 'KAMAL TRADING CO Dudu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-30', 'KAMAL TRADING CO Dudu', 'Receipt', '474', 65000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Brothers - Renwal' OR legal_or_core_name ILIKE 'Vinayak Brothers - Renwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-30', 'Vinayak Brothers - Renwal', 'Receipt', '475', 93700, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-30', 'G.K.N - Industries', 'Receipt', '476', 42811, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dadu Dayal Pasu Aahar Sambhar' OR legal_or_core_name ILIKE 'Dadu Dayal Pasu Aahar Sambhar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-30', 'Dadu Dayal Pasu Aahar Sambhar', 'Receipt', '477', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'M Choudhry Trading Company - Jalpali' OR legal_or_core_name ILIKE 'M Choudhry Trading Company - Jalpali' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-30', 'M Choudhry Trading Company - Jalpali', 'Receipt', '478', 59700, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anjani Trading Company  -(Beawar)' OR legal_or_core_name ILIKE 'Anjani Trading Company  -(Beawar)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-30', 'Anjani Trading Company  -(Beawar)', 'Receipt', '479', 58385, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Lavik Traders' OR legal_or_core_name ILIKE 'Lavik Traders' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-30', 'Lavik Traders', 'Receipt', '480', 81140, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-30', 'Haritwal Pashu Ahar Vatika', 'Receipt', '481', 8370, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Love General Stor    Tunga' OR legal_or_core_name ILIKE 'Love General Stor    Tunga' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-30', 'Love General Stor    Tunga', 'Sales', '2711/25-26', 58400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shiv Trading Comnay Vatika' OR legal_or_core_name ILIKE 'Shiv Trading Comnay Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-30', 'Shiv Trading Comnay Vatika', 'Sales', '2712/25-26', 73170, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'R S Oil Mils' OR legal_or_core_name ILIKE 'R S Oil Mils' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-31', 'R S Oil Mils', 'Payment', '534', 67910, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' OR legal_or_core_name ILIKE 'Mangal Treding Company Kukerkheda Mhandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-31', 'Mangal Treding Company Kukerkheda Mhandi', 'Payment', '535', 9510, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-31', 'Machinery Reparing', 'Payment', '536', 9800, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'BANK  EXPENSES- PNB BANK' OR legal_or_core_name ILIKE 'BANK  EXPENSES- PNB BANK' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-31', 'BANK  EXPENSES- PNB BANK', 'Payment', '537', 222.17, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-31', 'Wages Expenses A/C', 'Payment', '538', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Printing & Stationary' OR legal_or_core_name ILIKE 'Printing & Stationary' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-31', 'Printing & Stationary', 'Payment', '539', 1860, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Goyal Treders Fhagi' OR legal_or_core_name ILIKE 'Goyal Treders Fhagi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-31', 'Goyal Treders Fhagi', 'Receipt', '482', 77700, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dugya Cattle Feed - Muhana' OR legal_or_core_name ILIKE 'Dugya Cattle Feed - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-31', 'Dugya Cattle Feed - Muhana', 'Sales', '2713/25-26', 68100, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-31', 'G.K.N - Industries', 'Sales', '2714/25-26', 42811, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anjani Trading Company  -(Beawar)' OR legal_or_core_name ILIKE 'Anjani Trading Company  -(Beawar)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-07-31', 'Anjani Trading Company  -(Beawar)', 'Sales', '2715/25-26', 55394, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-01', 'Machinery Reparing', 'Payment', '540', 4062, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-01', 'Machinery Reparing', 'Payment', '541', 5054, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-01', 'Office Expenses', 'Payment', '542', 13110, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-01', 'Office Expenses', 'Payment', '543', 1850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-01', 'Wages Expenses A/C', 'Payment', '544', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'BUSINESS PROMOTION EXPENSES' OR legal_or_core_name ILIKE 'BUSINESS PROMOTION EXPENSES' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-01', 'BUSINESS PROMOTION EXPENSES', 'Payment', '545', 23849, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-01', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '483', 14070, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-01', 'Choudhary Pashu Aahar  Parbatsar', 'Receipt', '484', 25600, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-01', 'Godha Enterprises (Hingoniya)', 'Receipt', '485', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-01', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2716/25-26', 13213, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-01', 'Kharwash Trading Company (Muhana )', 'Sales', '2717/25-26', 66764, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Natural Guar Gum Pvt Lted Khairthal' OR legal_or_core_name ILIKE 'Natural Guar Gum Pvt Lted Khairthal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-01', 'Natural Guar Gum Pvt Lted Khairthal', 'Purchase', '94', 201287, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Natural Guar Gum Pvt Lted Khairthal', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Natural Guar Gum Pvt Lted Khairthal';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-02', 'Convence Expensece', 'Payment', '546', 3000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-02', 'Tour & Travel', 'Payment', '547', 1470, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-02', 'Wages Expenses A/C', 'Payment', '548', 7100, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Natural Guar Gum Pvt Lted Khairthal' OR legal_or_core_name ILIKE 'Natural Guar Gum Pvt Lted Khairthal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-02', 'Natural Guar Gum Pvt Lted Khairthal', 'Payment', '549', 201287, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mahesh Pashu Aahar  Doaultpura' OR legal_or_core_name ILIKE 'Mahesh Pashu Aahar  Doaultpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-02', 'Mahesh Pashu Aahar  Doaultpura', 'Receipt', '486', 2000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Mahesh Pashu Aahar  Doaultpura', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Mahesh Pashu Aahar  Doaultpura';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-02', 'Godha Enterprises (Hingoniya)', 'Receipt', '487', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jain & Brothers - Muhana Mandi' OR legal_or_core_name ILIKE 'Jain & Brothers - Muhana Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-02', 'Jain & Brothers - Muhana Mandi', 'Receipt', '488', 62717, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Greenfield' OR legal_or_core_name ILIKE 'Greenfield' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-02', 'Greenfield', 'Sales', '2718/25-26', 183160, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Greenfield', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Greenfield';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-03', 'Godha Enterprises (Hingoniya)', 'Receipt', '489', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-03', 'Ishwar and Company Surajpool', 'Sales', '2719/25-26', 78750, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-04', 'Wages Expenses A/C', 'Payment', '550', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-04', 'Tour & Travel', 'Payment', '551', 2400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'BANK  EXPENSES - HDFC BANK' OR legal_or_core_name ILIKE 'BANK  EXPENSES - HDFC BANK' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-04', 'BANK  EXPENSES - HDFC BANK', 'Payment', '552', 590, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('BANK  EXPENSES - HDFC BANK', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'BANK  EXPENSES - HDFC BANK';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Khandelwal Jaipur' OR legal_or_core_name ILIKE 'Shyam Khandelwal Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-04', 'Shyam Khandelwal Jaipur', 'Receipt', '490', 60940, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S Kumar & Company - Navalgarh' OR legal_or_core_name ILIKE 'S Kumar & Company - Navalgarh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-04', 'S Kumar & Company - Navalgarh', 'Receipt', '491', 50000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jamidara Treding Company Chidawa' OR legal_or_core_name ILIKE 'Jamidara Treding Company Chidawa' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-08-04', 'Jamidara Treding Company Chidawa', 'Receipt', '492', 5000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Jamidara Treding Company Chidawa', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Jamidara Treding Company Chidawa';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

END $$;
