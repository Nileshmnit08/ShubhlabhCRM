import fs from 'fs';
import Papa from 'papaparse';

function normalizeIdentity(name) {
  if (!name) return '';
  return name.toUpperCase()
    .replace(/\(OLD\)/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

function generateSql() {
  let sql = '-- MICRO-SPRINT 11.2 REAL TALLY DATA ONBOARDING\n';
  sql += 'DO $$\nDECLARE\n  p_id UUID;\n  t_id UUID;\n  r_id UUID;\nBEGIN\n';

  // 1. Process Parties
  const partiesCsv = fs.readFileSync('../dummy_tally_parties.csv', 'utf8');
  const parties = Papa.parse(partiesCsv, { header: true, skipEmptyLines: true }).data;
  
  sql += '\n  -- IMPORTING PARTIES\n';
  
  parties.forEach(row => {
    const ledgerName = row['Ledger Name'] || row['ledger_name'];
    if (!ledgerName) return;
    
    const isOld = ledgerName.toUpperCase().includes('(OLD)');
    const cleanName = ledgerName.replace(/\(OLD\)/gi, '').trim().replace(/\s+/g, ' ');
    const safeName = cleanName.replace(/'/g, "''");
    const safeTallyName = ledgerName.replace(/'/g, "''");
    const city = (row['Location'] || row['city'] || '').replace(/'/g, "''");
    
    const status = isOld ? 'Inactive' : 'Active';

    sql += `  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE '${safeName}' LIMIT 1;\n`;
    sql += `  IF p_id IS NULL THEN\n`;
    sql += `    INSERT INTO crm_parties (display_name, legal_or_core_name, crm_status, city, created_at, updated_at)\n`;
    sql += `    VALUES ('${safeName}', '${safeName}', 'Lead', '${city}', NOW(), NOW())\n`;
    sql += `    RETURNING id INTO p_id;\n`;
    sql += `  END IF;\n\n`;
  });

  // 2. Process Vouchers
  const vouchersCsv = fs.readFileSync('../converted_vouchers_latest.csv', 'utf8');
  const vouchers = Papa.parse(vouchersCsv, { header: false, skipEmptyLines: true }).data;
  
  sql += '\n  -- IMPORTING VOUCHERS & QUEUING IDENTITIES\n';
  
  // Track unique missing ledgers so we only queue them once in the script execution
  const uniqueMissing = new Set();
  
  vouchers.forEach(row => {
    if (row.length < 3 || !row[0] || !row[1]) return;
    const ledgerName = row[1];
    const safeLedger = ledgerName.replace(/'/g, "''");
    
    const dAmt = parseFloat(row[4]) || 0;
    const cAmt = parseFloat(row[5]) || 0;
    let dateVal = row[0];
    try { dateVal = new Date(dateVal).toISOString().split('T')[0]; } 
    catch (e) { dateVal = null; }

    if (ledgerName !== '(cancelled)' && (dAmt > 0 || cAmt > 0) && dateVal) {
      const type = row[2] || 'Unknown';
      const no = row[3] || 'NA';
      const amount = dAmt > 0 ? dAmt : cAmt;
      const isCredit = cAmt > 0 ? 'true' : 'false';

      sql += `  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE '${safeLedger}' OR legal_or_core_name ILIKE '${safeLedger}' LIMIT 1;\n`;
      sql += `  IF p_id IS NOT NULL THEN\n`;
      sql += `    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)\n`;
      sql += `    VALUES (p_id, '${dateVal}', '${safeLedger}', '${type}', '${no}', ${amount}, ${isCredit})\n`;
      sql += `    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;\n`;
      sql += `  ELSE\n`;
      // Push to review queue
      if (!uniqueMissing.has(safeLedger)) {
        uniqueMissing.add(safeLedger);
        sql += `    INSERT INTO tally_raw_parties (tally_ledger_name, tally_status) VALUES ('${safeLedger}', 'Active (Voucher)') ON CONFLICT (tally_ledger_name) DO NOTHING;\n`;
        sql += `    SELECT id INTO r_id FROM tally_raw_parties WHERE tally_ledger_name = '${safeLedger}';\n`;
        sql += `    IF r_id IS NOT NULL THEN\n`;
        sql += `      INSERT INTO identity_review_queue (tally_raw_party_id, match_reason, confidence)\n`;
        sql += `      VALUES (r_id, 'No matching CRM party found', 0)\n`;
        sql += `      ON CONFLICT (tally_raw_party_id) DO NOTHING;\n`;
        sql += `    END IF;\n`;
      }
      sql += `  END IF;\n\n`;
    }
  });

  sql += 'END $$;\n';

  fs.writeFileSync('30_sprint_11_2_data_onboarding.sql', sql);
  console.log(`Generated 30_sprint_11_2_data_onboarding.sql successfully.`);
  console.log(`Parties Processed: ${parties.length}`);
  console.log(`Vouchers Processed: ${vouchers.length}`);
  console.log(`Unique Unmatched Ledgers Identifiable in SQL: ${uniqueMissing.size}`);
}

generateSql();
