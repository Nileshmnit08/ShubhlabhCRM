DO $$
DECLARE
  p_id UUID;
  t_id UUID;
  r_id UUID;
BEGIN
  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-21', 'Ishwar and Company Surajpool', 'Receipt', '58', 94080, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jain & Brothers - Muhana Mandi' OR legal_or_core_name ILIKE 'Jain & Brothers - Muhana Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-21', 'Jain & Brothers - Muhana Mandi', 'Receipt', '59', 59560, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dishu Pashu Aahar' OR legal_or_core_name ILIKE 'Dishu Pashu Aahar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-21', 'Dishu Pashu Aahar', 'Receipt', '60', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Dishu Pashu Aahar', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Dishu Pashu Aahar';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Narendar Kumar Khejroli' OR legal_or_core_name ILIKE 'Narendar Kumar Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-21', 'Narendar Kumar Khejroli', 'Receipt', '61', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-21', 'Maa Karni Baat Bhander Sodala', 'Sales', '2448/25-26', 8330, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-21', 'Ishwar and Company Surajpool', 'Sales', '2449/25-26', 43904, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tarachand Ji -Yadav Khejroli' OR legal_or_core_name ILIKE 'Tarachand Ji -Yadav Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-21', 'Tarachand Ji -Yadav Khejroli', 'Sales', '2450/25-26', 65320, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'J.S. Packers - Jaipur' OR legal_or_core_name ILIKE 'J.S. Packers - Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-21', 'J.S. Packers - Jaipur', 'Purchase', '18', 17587, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Prem Industries (Hingoniya)' OR legal_or_core_name ILIKE 'Prem Industries (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-22', 'Prem Industries (Hingoniya)', 'Payment', '71', 120568, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-22', 'Wages Expenses A/C', 'Payment', '72', 7450, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-22', 'Convence Expensece', 'Payment', '73', 2500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tarachand Ji -Yadav Khejroli' OR legal_or_core_name ILIKE 'Tarachand Ji -Yadav Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-22', 'Tarachand Ji -Yadav Khejroli', 'Receipt', '62', 44900, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nakoda Trading Company  Nimbaheda' OR legal_or_core_name ILIKE 'Nakoda Trading Company  Nimbaheda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-22', 'Nakoda Trading Company  Nimbaheda', 'Receipt', '63', 13500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shiv Trading Comnay Vatika' OR legal_or_core_name ILIKE 'Shiv Trading Comnay Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-22', 'Shiv Trading Comnay Vatika', 'Receipt', '64', 73170, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-22', 'Kharwash Trading Company (Muhana )', 'Receipt', '65', 1000000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-22', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '66', 24812, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Babulal Ji Yadav - Mahaswas' OR legal_or_core_name ILIKE 'Babulal Ji Yadav - Mahaswas' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-22', 'Babulal Ji Yadav - Mahaswas', 'Receipt', '67', 149400, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dishu Pashu Aahar' OR legal_or_core_name ILIKE 'Dishu Pashu Aahar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-22', 'Dishu Pashu Aahar', 'Receipt', '68', 1500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-22', 'Haritwal Pashu Ahar Vatika', 'Receipt', '69', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Narendar Kumar Khejroli' OR legal_or_core_name ILIKE 'Narendar Kumar Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-22', 'Narendar Kumar Khejroli', 'Receipt', '70', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Brothers - Renwal' OR legal_or_core_name ILIKE 'Vinayak Brothers - Renwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-22', 'Vinayak Brothers - Renwal', 'Sales', '2451/25-26', 93694, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'KAMAL TRADING CO Dudu' OR legal_or_core_name ILIKE 'KAMAL TRADING CO Dudu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-22', 'KAMAL TRADING CO Dudu', 'Sales', '2452/25-26', 73360, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nakoda Trading Company  Nimbaheda' OR legal_or_core_name ILIKE 'Nakoda Trading Company  Nimbaheda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-22', 'Nakoda Trading Company  Nimbaheda', 'Sales', '2453/25-26', 13500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Goyal Solvents Punjab' OR legal_or_core_name ILIKE 'Goyal Solvents Punjab' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-22', 'Goyal Solvents Punjab', 'Purchase', '19', 326763, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Goyal Solvents Punjab', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Goyal Solvents Punjab';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'EMAMI AGROTECH LIMITED MOJMAMABAD' OR legal_or_core_name ILIKE 'EMAMI AGROTECH LIMITED MOJMAMABAD' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-23', 'EMAMI AGROTECH LIMITED MOJMAMABAD', 'Payment', '74', 478800, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('EMAMI AGROTECH LIMITED MOJMAMABAD', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'EMAMI AGROTECH LIMITED MOJMAMABAD';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Aadishakti Rice Mill Mirzapur Up' OR legal_or_core_name ILIKE 'Aadishakti Rice Mill Mirzapur Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-23', 'Aadishakti Rice Mill Mirzapur Up', 'Payment', '75', 168011, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-23', 'Wages Expenses A/C', 'Payment', '76', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-23', 'Tour & Travel', 'Payment', '77', 1850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Fright Exp' OR legal_or_core_name ILIKE 'Fright Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-23', 'Fright Exp', 'Payment', '78', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Fright Exp', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Fright Exp';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Blue Diamond Food Production' OR legal_or_core_name ILIKE 'Blue Diamond Food Production' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-23', 'Blue Diamond Food Production', 'Receipt', '71', 43000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Balaji Agro Industries - Muhana' OR legal_or_core_name ILIKE 'Shri Balaji Agro Industries - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-23', 'Shri Balaji Agro Industries - Muhana', 'Receipt', '72', 30170, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Enterprises - Kalu Ka Baas' OR legal_or_core_name ILIKE 'Shri Shyam Enterprises - Kalu Ka Baas' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-23', 'Shri Shyam Enterprises - Kalu Ka Baas', 'Receipt', '73', 7352, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Shri Shyam Enterprises - Kalu Ka Baas', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Shri Shyam Enterprises - Kalu Ka Baas';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-23', 'Ishwar and Company Surajpool', 'Sales', '2454/25-26', 78400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dishu Pashu Aahar' OR legal_or_core_name ILIKE 'Dishu Pashu Aahar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-23', 'Dishu Pashu Aahar', 'Sales', '2455/25-26', 15927, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-23', 'Choudhary Pashu Aahar  Parbatsar', 'Sales', '2456/25-26', 46830, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' OR legal_or_core_name ILIKE 'Choudhary Pashu Aahar  Parbatsar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-23', 'Choudhary Pashu Aahar  Parbatsar', 'Sales', '2457/25-26', 44725, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Babulal Ji Yadav - Mahaswas' OR legal_or_core_name ILIKE 'Babulal Ji Yadav - Mahaswas' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-23', 'Babulal Ji Yadav - Mahaswas', 'Sales', '2458/25-26', 82500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-24', 'Wages Expenses A/C', 'Payment', '79', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-24', 'Office Expenses', 'Payment', '80', 1850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Fright Exp' OR legal_or_core_name ILIKE 'Fright Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-24', 'Fright Exp', 'Payment', '81', 4800, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-24', 'Haritwal Pashu Ahar Vatika', 'Receipt', '78', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-24', 'G.K.N - Industries', 'Sales', '2459/25-26', 44330, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ankit Trading Company Fulera' OR legal_or_core_name ILIKE 'Ankit Trading Company Fulera' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-24', 'Ankit Trading Company Fulera', 'Sales', '2460/25-26', 33138, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Chand Pasu Aahar Malpura' OR legal_or_core_name ILIKE 'Shri Chand Pasu Aahar Malpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-24', 'Shri Chand Pasu Aahar Malpura', 'Sales', '2461/25-26', 96080, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Goyal Solvents Punjab' OR legal_or_core_name ILIKE 'Goyal Solvents Punjab' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-25', 'Goyal Solvents Punjab', 'Payment', '82', 326763, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-25', 'Wages Expenses A/C', 'Payment', '83', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-25', 'Machinery Reparing', 'Payment', '84', 2150, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Rakesh Kirana Store - Khejroli' OR legal_or_core_name ILIKE 'Rakesh Kirana Store - Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-25', 'Rakesh Kirana Store - Khejroli', 'Receipt', '80', 18081, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-25', 'Haritwal Pashu Ahar Vatika', 'Receipt', '81', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-25', 'Haritwal Pashu Ahar Vatika', 'Sales', '2462/25-26', 72870, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Blue Diamond Food Production' OR legal_or_core_name ILIKE 'Blue Diamond Food Production' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-25', 'Blue Diamond Food Production', 'Sales', '2463/25-26', 67150, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-25', 'Kharwash Trading Company (Muhana )', 'Sales', '2464/25-26', 57810, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-25', 'Kharwash Trading Company (Muhana )', 'Sales', '2465/25-26', 66764, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Giriraj Trading Company - Alwar' OR legal_or_core_name ILIKE 'Giriraj Trading Company - Alwar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-25', 'Giriraj Trading Company - Alwar', 'Sales', '2466/25-26', 76320, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Giriraj Trading Company - Alwar', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Giriraj Trading Company - Alwar';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ganesh Pashuahar Chaksu' OR legal_or_core_name ILIKE 'Ganesh Pashuahar Chaksu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-25', 'Ganesh Pashuahar Chaksu', 'Sales', '2467/25-26', 117618, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'EMAMI AGROTECH LIMITED MOJMAMABAD' OR legal_or_core_name ILIKE 'EMAMI AGROTECH LIMITED MOJMAMABAD' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-25', 'EMAMI AGROTECH LIMITED MOJMAMABAD', 'Purchase', '20', 478800, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-26', 'Wages Expenses A/C', 'Payment', '85', 7450, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-26', 'Convence Expensece', 'Payment', '86', 2200, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-26', 'Haritwal Pashu Ahar Vatika', 'Receipt', '83', 2870, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Namokaar Trading Company' OR legal_or_core_name ILIKE 'Shri Namokaar Trading Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-26', 'Shri Namokaar Trading Company', 'Receipt', '84', 5000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Shri Namokaar Trading Company', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Shri Namokaar Trading Company';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' OR legal_or_core_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-26', 'Krishna Baat Bhandhar- Sirsi Mode', 'Sales', '2468/25-26', 17000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Krishna Baat Bhandhar- Sirsi Mode', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Krishna Baat Bhandhar- Sirsi Mode';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Enterprises - Kalu Ka Baas' OR legal_or_core_name ILIKE 'Shri Shyam Enterprises - Kalu Ka Baas' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-26', 'Shri Shyam Enterprises - Kalu Ka Baas', 'Sales', '2469/25-26', 53865, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Keer Industries' OR legal_or_core_name ILIKE 'Keer Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-26', 'Keer Industries', 'Sales', '2470/25-26', 168525, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Keer Industries', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Keer Industries';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Moti Ratan Trading Company Bhilwara' OR legal_or_core_name ILIKE 'Moti Ratan Trading Company Bhilwara' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-27', 'Moti Ratan Trading Company Bhilwara', 'Sales', '2471/25-26', 328200, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Moti Ratan Trading Company Bhilwara', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Moti Ratan Trading Company Bhilwara';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Sunny Industries Sitapura Jaipur' OR legal_or_core_name ILIKE 'Sunny Industries Sitapura Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-27', 'Sunny Industries Sitapura Jaipur', 'Purchase', '21', 35292, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'BUSINESS PROMOTION EXPENSES' OR legal_or_core_name ILIKE 'BUSINESS PROMOTION EXPENSES' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-28', 'BUSINESS PROMOTION EXPENSES', 'Payment', '87', 23849, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-28', 'Wages Expenses A/C', 'Payment', '88', 7650, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-28', 'Tour & Travel', 'Payment', '89', 2300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' OR legal_or_core_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-28', 'Jai Jagdamba Treding Company Nangal Bhirda', 'Receipt', '90', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ankit Trading Company Fulera' OR legal_or_core_name ILIKE 'Ankit Trading Company Fulera' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-28', 'Ankit Trading Company Fulera', 'Receipt', '91', 60437, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Pashupati Trading Company' OR legal_or_core_name ILIKE 'Pashupati Trading Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-28', 'Pashupati Trading Company', 'Receipt', '92', 75164, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-28', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2472/25-26', 18148, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-28', 'Maa Karni Baat Bhander Sodala', 'Sales', '2473/25-26', 24860, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Pashupati Trading Company' OR legal_or_core_name ILIKE 'Pashupati Trading Company' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-28', 'Pashupati Trading Company', 'Sales', '2475/25-26', 60310, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading  Company  - Lalshot' OR legal_or_core_name ILIKE 'Balaji Trading  Company  - Lalshot' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-28', 'Balaji Trading  Company  - Lalshot', 'Sales', '2474/25-26', 72690, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Aadinath Traders Pratapgarh' OR legal_or_core_name ILIKE 'Aadinath Traders Pratapgarh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-28', 'Aadinath Traders Pratapgarh', 'Purchase', '22', 997922, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Aadinath Traders Pratapgarh', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Aadinath Traders Pratapgarh';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-29', 'Wages Expenses A/C', 'Payment', '90', 7550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-29', 'Convence Expensece', 'Payment', '91', 3020, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-29', 'Maa Karni Baat Bhander Sodala', 'Receipt', '93', 6020, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-29', 'Maa Karni Baat Bhander Sodala', 'Receipt', '94', 9840, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' OR legal_or_core_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-29', 'Jai Jagdamba Treding Company Nangal Bhirda', 'Receipt', '95', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Trading  Company  - Lalshot' OR legal_or_core_name ILIKE 'Balaji Trading  Company  - Lalshot' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-29', 'Balaji Trading  Company  - Lalshot', 'Receipt', '96', 72690, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-29', 'Ishwar and Company Surajpool', 'Sales', '2476/25-26', 101920, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' OR legal_or_core_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-29', 'SHRI RAM INDUSTRIES  (PHULERA)', 'Purchase', '23', 191387, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('SHRI RAM INDUSTRIES  (PHULERA)', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'SHRI RAM INDUSTRIES  (PHULERA)';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Sunny Industries Sitapura Jaipur' OR legal_or_core_name ILIKE 'Sunny Industries Sitapura Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-30', 'Sunny Industries Sitapura Jaipur', 'Payment', '92', 35292, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-30', 'Tour & Travel', 'Payment', '93', 1830, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-30', 'Wages Expenses A/C', 'Payment', '94', 7600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Car Loan - Hyrider' OR legal_or_core_name ILIKE 'Car Loan - Hyrider' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-30', 'Car Loan - Hyrider', 'Payment', '95', 48357, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Car Loan - Hyrider', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Car Loan - Hyrider';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' OR legal_or_core_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-30', 'Jai Jagdamba Treding Company Nangal Bhirda', 'Receipt', '97', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-30', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '98', 18148, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-30', 'Kharwash Trading Company (Muhana )', 'Sales', '2477/25-26', 79893, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Treding Company Khejroli' OR legal_or_core_name ILIKE 'Shri Shyam Treding Company Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-30', 'Shri Shyam Treding Company Khejroli', 'Sales', '2478/25-26', 95550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Narendar Kumar Khejroli' OR legal_or_core_name ILIKE 'Narendar Kumar Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-30', 'Narendar Kumar Khejroli', 'Sales', '2479/25-26', 77780, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anjani Trading Company  -(Beawar)' OR legal_or_core_name ILIKE 'Anjani Trading Company  -(Beawar)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-30', 'Anjani Trading Company  -(Beawar)', 'Sales', '3428/25-26', 219465, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-04-30', 'Vetkind Animal Health India', 'Purchase', '24', 24000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-01', 'Wages Expenses A/C', 'Payment', '96', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-01', 'Wages Expenses A/C', 'Payment', '97', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-01', 'Convence Expensece', 'Payment', '98', 2200, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-01', 'Wages Expenses A/C', 'Payment', '99', 4950, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' OR legal_or_core_name ILIKE 'SHRI RAM INDUSTRIES  (PHULERA)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-01', 'SHRI RAM INDUSTRIES  (PHULERA)', 'Payment', '100', 191387, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Aadinath Traders Pratapgarh' OR legal_or_core_name ILIKE 'Aadinath Traders Pratapgarh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-01', 'Aadinath Traders Pratapgarh', 'Payment', '101', 994562, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' OR legal_or_core_name ILIKE 'Krishna Baat Bhandhar- Sirsi Mode' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-01', 'Krishna Baat Bhandhar- Sirsi Mode', 'Receipt', '102', 9000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-01', 'Godha Enterprises (Hingoniya)', 'Receipt', '103', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-01', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2481/25-26', 30863, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' OR legal_or_core_name ILIKE 'Jai Jagdamba Treding Company Nangal Bhirda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-01', 'Jai Jagdamba Treding Company Nangal Bhirda', 'Sales', '2482/25-26', 65288, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-01', 'Kharwash Trading Company (Muhana )', 'Sales', '2483/25-26', 67734, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S Kumar & Company - Navalgarh' OR legal_or_core_name ILIKE 'S Kumar & Company - Navalgarh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-01', 'S Kumar & Company - Navalgarh', 'Sales', '2485', 274390, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('S Kumar & Company - Navalgarh', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'S Kumar & Company - Navalgarh';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-02', 'Wages Expenses A/C', 'Payment', '102', 4800, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-02', 'Wages Expenses A/C', 'Payment', '103', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-02', 'Wages Expenses A/C', 'Payment', '104', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-02', 'Machinery Reparing', 'Payment', '105', 1560, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Brokrage' OR legal_or_core_name ILIKE 'Brokrage' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-02', 'Brokrage', 'Payment', '106', 4325, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Brokrage' OR legal_or_core_name ILIKE 'Brokrage' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-02', 'Brokrage', 'Payment', '107', 2300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-02', 'G.K.N - Industries', 'Payment', '108', 86515, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-02', 'Tour & Travel', 'Payment', '109', 1000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-02', 'Office Expenses', 'Payment', '110', 1025, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dugya Cattle Feed - Muhana' OR legal_or_core_name ILIKE 'Dugya Cattle Feed - Muhana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-02', 'Dugya Cattle Feed - Muhana', 'Sales', '2486/25-26', 71350, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Agerwal Treding Company Mojamabad' OR legal_or_core_name ILIKE 'Agerwal Treding Company Mojamabad' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-02', 'Agerwal Treding Company Mojamabad', 'Sales', '2487/25-26', 60000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Agerwal Treding Company Mojamabad', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Agerwal Treding Company Mojamabad';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Damodher Ji Sharma Choop' OR legal_or_core_name ILIKE 'Damodher Ji Sharma Choop' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-02', 'Damodher Ji Sharma Choop', 'Sales', '2489/2025/26', 87480, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-03', 'Wages Expenses A/C', 'Payment', '111', 4950, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-03', 'Wages Expenses A/C', 'Payment', '112', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-03', 'Wages Expenses A/C', 'Payment', '113', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-03', 'Machinery Reparing', 'Payment', '114', 1750, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vetkind Animal Health India' OR legal_or_core_name ILIKE 'Vetkind Animal Health India' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-03', 'Vetkind Animal Health India', 'Payment', '115', 48447, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-03', 'Kharwash Trading Company (Muhana )', 'Sales', '2490/25-26', 57810, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ankit Trading Company Fulera' OR legal_or_core_name ILIKE 'Ankit Trading Company Fulera' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-03', 'Ankit Trading Company Fulera', 'Sales', '2491/25-26', 58413, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-03', 'G.K.N - Industries', 'Sales', '2492/25-26', 44330, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maruti Trading Company Kalwar' OR legal_or_core_name ILIKE 'Maruti Trading Company Kalwar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-03', 'Maruti Trading Company Kalwar', 'Sales', '2493/25-26', 59850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Maruti Trading Company Kalwar', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Maruti Trading Company Kalwar';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-03', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Sales', '2495', 249525, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SAMRIDI TRADERS' OR legal_or_core_name ILIKE 'SAMRIDI TRADERS' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-03', 'SAMRIDI TRADERS', 'Sales', '2496/25-26', 60000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'DILIP UDYOUG' OR legal_or_core_name ILIKE 'DILIP UDYOUG' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-03', 'DILIP UDYOUG', 'Purchase', '25', 68310, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('DILIP UDYOUG', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'DILIP UDYOUG';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S M Sales Corporation  Jaipur' OR legal_or_core_name ILIKE 'S M Sales Corporation  Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-03', 'S M Sales Corporation  Jaipur', 'Purchase', '26', 18424, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ram Singh Rajawat' OR legal_or_core_name ILIKE 'Ram Singh Rajawat' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-03', 'Ram Singh Rajawat', 'Purchase', '27', 25980, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Ram Singh Rajawat', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Ram Singh Rajawat';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SAMRIDI TRADERS' OR legal_or_core_name ILIKE 'SAMRIDI TRADERS' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-04', 'SAMRIDI TRADERS', 'Receipt', '114', 59911, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-04', 'Godha Enterprises (Hingoniya)', 'Receipt', '115', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-05', 'Wages Expenses A/C', 'Payment', '116', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-05', 'Wages Expenses A/C', 'Payment', '117', 4900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-05', 'Wages Expenses A/C', 'Payment', '118', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-05', 'Tour & Travel', 'Payment', '119', 2100, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Aadinath Traders Pratapgarh' OR legal_or_core_name ILIKE 'Aadinath Traders Pratapgarh' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-05', 'Aadinath Traders Pratapgarh', 'Payment', '120', 3360, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-05', 'Ishwar and Company Surajpool', 'Sales', '2497/25-26', 78400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-05', 'Maa Karni Baat Bhander Sodala', 'Sales', '2498/25-26', 22450, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jain & Brothers - Muhana Mandi' OR legal_or_core_name ILIKE 'Jain & Brothers - Muhana Mandi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-05', 'Jain & Brothers - Muhana Mandi', 'Sales', '2499/25-26', 62820, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Abhishek Treding Company  Fathenegar' OR legal_or_core_name ILIKE 'Abhishek Treding Company  Fathenegar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-05', 'Abhishek Treding Company  Fathenegar', 'Sales', '2500/25-26', 236000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-06', 'Wages Expenses A/C', 'Payment', '121', 4850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-06', 'Wages Expenses A/C', 'Payment', '122', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-06', 'Wages Expenses A/C', 'Payment', '123', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-06', 'Convence Expensece', 'Payment', '124', 2400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'DILIP UDYOUG' OR legal_or_core_name ILIKE 'DILIP UDYOUG' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-06', 'DILIP UDYOUG', 'Payment', '125', 68310, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-06', 'Maa Karni Baat Bhander Sodala', 'Receipt', '120', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-06', 'Godha Enterprises (Hingoniya)', 'Receipt', '126', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-06', 'G.K.N - Industries', 'Sales', '2501/25-26', 47992, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-06', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2502/25-26', 22225, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-06', 'Shyam Baat Bhandar - Kanwarpura', 'Sales', '2503/25-26', 61070, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-06', 'G.K.N - Industries', 'Sales', '2504/25-26', 44330, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-06', 'Kharwash Trading Company (Muhana )', 'Sales', '2505/25-26', 63450, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-07', 'Wages Expenses A/C', 'Payment', '126', 4850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-07', 'Wages Expenses A/C', 'Payment', '127', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-07', 'Wages Expenses A/C', 'Payment', '128', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-07', 'Office Expenses', 'Payment', '129', 2450, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ajay Kumar' OR legal_or_core_name ILIKE 'Ajay Kumar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-07', 'Ajay Kumar', 'Payment', '130', 12000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Piccadily Agro Industries Ltd' OR legal_or_core_name ILIKE 'Piccadily Agro Industries Ltd' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-07', 'Piccadily Agro Industries Ltd', 'Payment', '131', 385000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Piccadily Agro Industries Ltd', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Piccadily Agro Industries Ltd';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nilesh Kumar Khandelwal' OR legal_or_core_name ILIKE 'Nilesh Kumar Khandelwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-07', 'Nilesh Kumar Khandelwal', 'Payment', '132', 9500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-07', 'Kharwash Trading Company (Muhana )', 'Sales', '2506/25-26', 66764, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' OR legal_or_core_name ILIKE 'SHRI BALAJI ENTERPRISES-TIGARIYA' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-07', 'SHRI BALAJI ENTERPRISES-TIGARIYA', 'Sales', '2507/25-26', 67470, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Anukumar Mukesh Kumar Malpura' OR legal_or_core_name ILIKE 'Anukumar Mukesh Kumar Malpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-07', 'Anukumar Mukesh Kumar Malpura', 'Sales', '2508/2025-2026', 59940, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nakoda Trading Company  Nimbaheda' OR legal_or_core_name ILIKE 'Nakoda Trading Company  Nimbaheda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-07', 'Nakoda Trading Company  Nimbaheda', 'Sales', '2509/25-26', 27000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-08', 'Wages Expenses A/C', 'Payment', '133', 4950, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-08', 'Wages Expenses A/C', 'Payment', '134', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-08', 'Tour & Travel', 'Payment', '135', 2100, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-08', 'Wages Expenses A/C', 'Payment', '136', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Electricity and Water Expenses' OR legal_or_core_name ILIKE 'Electricity and Water Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-08', 'Electricity and Water Expenses', 'Payment', '137', 85775, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'BUSINESS PROMOTION EXPENSES' OR legal_or_core_name ILIKE 'BUSINESS PROMOTION EXPENSES' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-08', 'BUSINESS PROMOTION EXPENSES', 'Payment', '138', 23849, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jaipur Packers - Rajasthan' OR legal_or_core_name ILIKE 'Jaipur Packers - Rajasthan' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-08', 'Jaipur Packers - Rajasthan', 'Payment', '139', 188600, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ram Singh Rajawat' OR legal_or_core_name ILIKE 'Ram Singh Rajawat' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-08', 'Ram Singh Rajawat', 'Payment', '140', 25980, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Hari Shanker Khandelwal' OR legal_or_core_name ILIKE 'Shri Hari Shanker Khandelwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-08', 'Shri Hari Shanker Khandelwal', 'Payment', '141', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Nilesh Kumar Khandelwal' OR legal_or_core_name ILIKE 'Nilesh Kumar Khandelwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-08', 'Nilesh Kumar Khandelwal', 'Payment', '142', 9500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-08', 'Maa Karni Baat Bhander Sodala', 'Receipt', '132', 3450, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kedar Kirana Stor Benadamod' OR legal_or_core_name ILIKE 'Kedar Kirana Stor Benadamod' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-08', 'Kedar Kirana Stor Benadamod', 'Sales', '2510/25-26', 50250, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-08', 'Kharwash Trading Company (Muhana )', 'Sales', '2511/25-26', 57810, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Goyal Treders Fhagi' OR legal_or_core_name ILIKE 'Goyal Treders Fhagi' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-08', 'Goyal Treders Fhagi', 'Sales', '2512/25-26', 62182, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mahavr Mills Kekri' OR legal_or_core_name ILIKE 'Mahavr Mills Kekri' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-08', 'Mahavr Mills Kekri', 'Purchase', '28', 68080, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Mahavr Mills Kekri', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Mahavr Mills Kekri';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'Wages Expenses A/C', 'Payment', '143', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'Wages Expenses A/C', 'Payment', '144', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'Wages Expenses A/C', 'Payment', '145', 4950, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Telephone Exp' OR legal_or_core_name ILIKE 'Telephone Exp' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'Telephone Exp', 'Payment', '146', 1070, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Telephone Exp', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Telephone Exp';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'Tour & Travel', 'Payment', '147', 1500, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '137', 22225, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'KAMAL TRADING CO Dudu' OR legal_or_core_name ILIKE 'KAMAL TRADING CO Dudu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'KAMAL TRADING CO Dudu', 'Receipt', '138', 60800, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Abhishek Treding Company  Fathenegar' OR legal_or_core_name ILIKE 'Abhishek Treding Company  Fathenegar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'Abhishek Treding Company  Fathenegar', 'Receipt', '139', 236000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'Haritwal Pashu Ahar Vatika', 'Receipt', '140', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '141', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'Godha Enterprises (Hingoniya)', 'Receipt', '142', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Patel Enterprises  Rojda' OR legal_or_core_name ILIKE 'Patel Enterprises  Rojda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'Patel Enterprises  Rojda', 'Sales', '2513/25-26', 61900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2514/25-26', 26915, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'G.K.N - Industries', 'Sales', '2515/25-26', 74169, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' OR legal_or_core_name ILIKE 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'Kailash Chand Deen Dayal - Kasera, Shreemodhopur', 'Sales', '2516/25-26', 53860, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ganesh Pashuahar Chaksu' OR legal_or_core_name ILIKE 'Ganesh Pashuahar Chaksu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'Ganesh Pashuahar Chaksu', 'Sales', '2517/25-26', 99608, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kaithal Solvent Pvt Ltd - Haryana' OR legal_or_core_name ILIKE 'Kaithal Solvent Pvt Ltd - Haryana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'Kaithal Solvent Pvt Ltd - Haryana', 'Purchase', '29', 453655, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Kaithal Solvent Pvt Ltd - Haryana', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Kaithal Solvent Pvt Ltd - Haryana';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jurashik Minral' OR legal_or_core_name ILIKE 'Jurashik Minral' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-09', 'Jurashik Minral', 'Purchase', '30', 36195, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Jurashik Minral', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Jurashik Minral';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-10', 'Wages Expenses A/C', 'Payment', '148', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-10', 'Wages Expenses A/C', 'Payment', '149', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-10', 'Wages Expenses A/C', 'Payment', '150', 4900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-10', 'Office Expenses', 'Payment', '151', 2250, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Patel Enterprises  Rojda' OR legal_or_core_name ILIKE 'Patel Enterprises  Rojda' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-10', 'Patel Enterprises  Rojda', 'Receipt', '143', 61900, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kedar Kirana Stor Benadamod' OR legal_or_core_name ILIKE 'Kedar Kirana Stor Benadamod' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-10', 'Kedar Kirana Stor Benadamod', 'Receipt', '144', 46000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-10', 'Maa Karni Baat Bhander Sodala', 'Receipt', '145', 4160, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-10', 'Haritwal Pashu Ahar Vatika', 'Receipt', '146', 6370, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' OR legal_or_core_name ILIKE 'Arihant  Kumar Rahul Kumar  Medta Seety - S' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-10', 'Arihant  Kumar Rahul Kumar  Medta Seety - S', 'Receipt', '147', 249525, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-10', 'Maa Karni Baat Bhander Sodala', 'Sales', '2518/25-26', 4160, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ankit Trading Company Fulera' OR legal_or_core_name ILIKE 'Ankit Trading Company Fulera' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-10', 'Ankit Trading Company Fulera', 'Sales', '2519/25-26', 36658, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'KAMAL TRADING CO Dudu' OR legal_or_core_name ILIKE 'KAMAL TRADING CO Dudu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-10', 'KAMAL TRADING CO Dudu', 'Sales', '2520/25-26', 58615, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Godha Enterprises (Hingoniya)' OR legal_or_core_name ILIKE 'Godha Enterprises (Hingoniya)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-11', 'Godha Enterprises (Hingoniya)', 'Receipt', '150', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Treding Company Khejroli' OR legal_or_core_name ILIKE 'Shri Shyam Treding Company Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-11', 'Shri Shyam Treding Company Khejroli', 'Sales', '2522/25-26', 96250, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-11', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Sales', '2523/25-26', 19250, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-12', 'Wages Expenses A/C', 'Payment', '152', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-12', 'Wages Expenses A/C', 'Payment', '153', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-12', 'Wages Expenses A/C', 'Payment', '154', 4850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mahavr Mills Kekri' OR legal_or_core_name ILIKE 'Mahavr Mills Kekri' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-12', 'Mahavr Mills Kekri', 'Payment', '155', 68080, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kaithal Solvent Pvt Ltd - Haryana' OR legal_or_core_name ILIKE 'Kaithal Solvent Pvt Ltd - Haryana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-12', 'Kaithal Solvent Pvt Ltd - Haryana', 'Payment', '156', 453655, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Brokrage' OR legal_or_core_name ILIKE 'Brokrage' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-12', 'Brokrage', 'Payment', '157', 7000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Brokrage' OR legal_or_core_name ILIKE 'Brokrage' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-12', 'Brokrage', 'Payment', '158', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-12', 'Tour & Travel', 'Payment', '159', 2020, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Agerwal Treding Company Mojamabad' OR legal_or_core_name ILIKE 'Agerwal Treding Company Mojamabad' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-12', 'Agerwal Treding Company Mojamabad', 'Receipt', '151', 60000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Haritwal Pashu Ahar Vatika' OR legal_or_core_name ILIKE 'Haritwal Pashu Ahar Vatika' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-12', 'Haritwal Pashu Ahar Vatika', 'Sales', '2521/25-26', 72870, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-12', 'Kharwash Trading Company (Muhana )', 'Sales', '2524/25-26', 60000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-13', 'Wages Expenses A/C', 'Payment', '160', 4900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-13', 'Wages Expenses A/C', 'Payment', '161', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Brokrage' OR legal_or_core_name ILIKE 'Brokrage' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-13', 'Brokrage', 'Payment', '163', 5836, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'S M Sales Corporation  Jaipur' OR legal_or_core_name ILIKE 'S M Sales Corporation  Jaipur' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-13', 'S M Sales Corporation  Jaipur', 'Payment', '164', 18424, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-13', 'Convence Expensece', 'Payment', '165', 2000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-13', 'Tour & Travel', 'Payment', '166', 930, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-13', 'Ishwar and Company Surajpool', 'Receipt', '156', 80000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Chand Pasu Aahar Malpura' OR legal_or_core_name ILIKE 'Shri Chand Pasu Aahar Malpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-13', 'Shri Chand Pasu Aahar Malpura', 'Receipt', '157', 169990, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-13', 'G.K.N - Industries', 'Receipt', '158', 85622, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-13', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '159', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Brothers - Renwal' OR legal_or_core_name ILIKE 'Vinayak Brothers - Renwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-13', 'Vinayak Brothers - Renwal', 'Sales', '2525/25-26', 93694, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ishwar and Company Surajpool' OR legal_or_core_name ILIKE 'Ishwar and Company Surajpool' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-13', 'Ishwar and Company Surajpool', 'Sales', '2526/25-26', 104000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Chand Pasu Aahar Malpura' OR legal_or_core_name ILIKE 'Shri Chand Pasu Aahar Malpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-13', 'Shri Chand Pasu Aahar Malpura', 'Sales', '2527/25-26', 90342, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-14', 'Wages Expenses A/C', 'Payment', '167', 4750, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-14', 'Wages Expenses A/C', 'Payment', '168', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-14', 'Wages Expenses A/C', 'Payment', '169', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Brokrage' OR legal_or_core_name ILIKE 'Brokrage' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-14', 'Brokrage', 'Payment', '170', 9000, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'BUSINESS PROMOTION EXPENSES' OR legal_or_core_name ILIKE 'BUSINESS PROMOTION EXPENSES' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-14', 'BUSINESS PROMOTION EXPENSES', 'Payment', '171', 31799, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-14', 'Office Expenses', 'Payment', '172', 1510, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maruti Trading Company Kalwar' OR legal_or_core_name ILIKE 'Maruti Trading Company Kalwar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-14', 'Maruti Trading Company Kalwar', 'Receipt', '162', 60000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Satyenarayan Kunj Bihari  Ude' OR legal_or_core_name ILIKE 'Satyenarayan Kunj Bihari  Ude' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-14', 'Satyenarayan Kunj Bihari  Ude', 'Receipt', '163', 35000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' OR legal_or_core_name ILIKE 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-14', 'Shri Shyam Baat Bhandar (Bad Ke Bala Ji )', 'Receipt', '164', 19250, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jitender Baat Bhandhar - Jhobner' OR legal_or_core_name ILIKE 'Jitender Baat Bhandhar - Jhobner' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-14', 'Jitender Baat Bhandhar - Jhobner', 'Receipt', '165', 5000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Jitender Baat Bhandhar - Jhobner', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Jitender Baat Bhandhar - Jhobner';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jai Bhawani Trading Company - Achrol' OR legal_or_core_name ILIKE 'Jai Bhawani Trading Company - Achrol' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-14', 'Jai Bhawani Trading Company - Achrol', 'Receipt', '166', 45000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Jai Bhawani Trading Company - Achrol', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Jai Bhawani Trading Company - Achrol';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-14', 'Maa Karni Baat Bhander Sodala', 'Sales', '2528/25-26', 8330, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kaithal Solvent Pvt Ltd - Haryana' OR legal_or_core_name ILIKE 'Kaithal Solvent Pvt Ltd - Haryana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-14', 'Kaithal Solvent Pvt Ltd - Haryana', 'Purchase', '31', 403340, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ashok Traders  Up' OR legal_or_core_name ILIKE 'Ashok Traders  Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-14', 'Ashok Traders  Up', 'Purchase', '32', 169420, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Ashok Traders  Up', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Ashok Traders  Up';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-15', 'Wages Expenses A/C', 'Payment', '173', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-15', 'Wages Expenses A/C', 'Payment', '174', 4950, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tour & Travel' OR legal_or_core_name ILIKE 'Tour & Travel' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-15', 'Tour & Travel', 'Payment', '175', 2400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Uttam Agencies Sambriya' OR legal_or_core_name ILIKE 'Uttam Agencies Sambriya' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-15', 'Uttam Agencies Sambriya', 'Receipt', '170', 50917, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-15', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '171', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'G.K.N - Industries' OR legal_or_core_name ILIKE 'G.K.N - Industries' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-15', 'G.K.N - Industries', 'Sales', '2529/25-26', 44330, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Balaji Indastrises  Didwana' OR legal_or_core_name ILIKE 'Balaji Indastrises  Didwana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-15', 'Balaji Indastrises  Didwana', 'Sales', '2530/25-26', 67142, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ganesh Pashuahar Chaksu' OR legal_or_core_name ILIKE 'Ganesh Pashuahar Chaksu' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-15', 'Ganesh Pashuahar Chaksu', 'Sales', '2531/25-26', 108475, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-16', 'Wages Expenses A/C', 'Payment', '176', 4850, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-16', 'Wages Expenses A/C', 'Payment', '177', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-16', 'Wages Expenses A/C', 'Payment', '178', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Convence Expensece' OR legal_or_core_name ILIKE 'Convence Expensece' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-16', 'Convence Expensece', 'Payment', '179', 2350, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kaithal Solvent Pvt Ltd - Haryana' OR legal_or_core_name ILIKE 'Kaithal Solvent Pvt Ltd - Haryana' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-16', 'Kaithal Solvent Pvt Ltd - Haryana', 'Payment', '180', 403340, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Tarachand Ji -Yadav Khejroli' OR legal_or_core_name ILIKE 'Tarachand Ji -Yadav Khejroli' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-16', 'Tarachand Ji -Yadav Khejroli', 'Receipt', '172', 20200, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Giriraj Trading Company - Alwar' OR legal_or_core_name ILIKE 'Giriraj Trading Company - Alwar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-16', 'Giriraj Trading Company - Alwar', 'Receipt', '173', 100000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' OR legal_or_core_name ILIKE 'Shyam Baat Bhandar - Kanwarpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-16', 'Shyam Baat Bhandar - Kanwarpura', 'Receipt', '174', 6500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Vinayak Genral Stor Ranwal' OR legal_or_core_name ILIKE 'Vinayak Genral Stor Ranwal' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-16', 'Vinayak Genral Stor Ranwal', 'Receipt', '175', 9500, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Vinayak Genral Stor Ranwal', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Vinayak Genral Stor Ranwal';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Dinesh Baat Bhandar  (Dhabash)' OR legal_or_core_name ILIKE 'Dinesh Baat Bhandar  (Dhabash)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-16', 'Dinesh Baat Bhandar  (Dhabash)', 'Sales', '2532/25-26', 21550, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Dinesh Baat Bhandar  (Dhabash)', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Dinesh Baat Bhandar  (Dhabash)';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Kharwash Trading Company (Muhana )' OR legal_or_core_name ILIKE 'Kharwash Trading Company (Muhana )' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-16', 'Kharwash Trading Company (Muhana )', 'Sales', '2533/25-26', 57810, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ashok Traders  Up' OR legal_or_core_name ILIKE 'Ashok Traders  Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-16', 'Ashok Traders  Up', 'Purchase', '33', 140730, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Mahaveer Galla Bhandhar' OR legal_or_core_name ILIKE 'Mahaveer Galla Bhandhar' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-16', 'Mahaveer Galla Bhandhar', 'Purchase', '34', 677368, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Mahaveer Galla Bhandhar', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Mahaveer Galla Bhandhar';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jaipur Packers - Rajasthan' OR legal_or_core_name ILIKE 'Jaipur Packers - Rajasthan' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-16', 'Jaipur Packers - Rajasthan', 'Purchase', '35', 34864, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Jaipur Packers - Rajasthan' OR legal_or_core_name ILIKE 'Jaipur Packers - Rajasthan' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-16', 'Jaipur Packers - Rajasthan', 'Purchase', '36', 124523, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'BABOSA ENTERPRISES ( DHAGA)' OR legal_or_core_name ILIKE 'BABOSA ENTERPRISES ( DHAGA)' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-16', 'BABOSA ENTERPRISES ( DHAGA)', 'Purchase', '37', 11648, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('BABOSA ENTERPRISES ( DHAGA)', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'BABOSA ENTERPRISES ( DHAGA)';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-17', 'Wages Expenses A/C', 'Payment', '181', 1300, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-17', 'Wages Expenses A/C', 'Payment', '182', 1400, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Wages Expenses A/C' OR legal_or_core_name ILIKE 'Wages Expenses A/C' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-17', 'Wages Expenses A/C', 'Payment', '183', 4900, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Machinery Reparing' OR legal_or_core_name ILIKE 'Machinery Reparing' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-17', 'Machinery Reparing', 'Payment', '184', 1950, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ashok Traders  Up' OR legal_or_core_name ILIKE 'Ashok Traders  Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-17', 'Ashok Traders  Up', 'Payment', '185', 140730, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Ashok Traders  Up' OR legal_or_core_name ILIKE 'Ashok Traders  Up' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-17', 'Ashok Traders  Up', 'Payment', '186', 169420, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Office Expenses' OR legal_or_core_name ILIKE 'Office Expenses' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-17', 'Office Expenses', 'Payment', '187', 2260, false)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Hariyana Baat  Bhandar Dolaitpura' OR legal_or_core_name ILIKE 'Hariyana Baat  Bhandar Dolaitpura' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-17', 'Hariyana Baat  Bhandar Dolaitpura', 'Receipt', '176', 20000, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('Hariyana Baat  Bhandar Dolaitpura', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;
    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = 'Hariyana Baat  Bhandar Dolaitpura';
    IF r_id IS NOT NULL THEN
      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)
      VALUES (r_id, 'No matching CRM party found', 0)
      ON CONFLICT (tally_raw_party_id) DO NOTHING;
    END IF;
  END IF;

  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE 'Maa Karni Baat Bhander Sodala' OR legal_or_core_name ILIKE 'Maa Karni Baat Bhander Sodala' LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
    VALUES (p_id, '2025-05-17', 'Maa Karni Baat Bhander Sodala', 'Receipt', '177', 8330, true)
    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;
  ELSE
  END IF;

END $$;
