const fs = require('fs');
const fileContent = fs.readFileSync('VoucherBookCRM.txt', 'utf16le');
const lines = fileContent.split('\n');
const processed = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i].trim();
  if (line.includes('-2022') || line.includes('-2023') || line.includes('-2024')) {
    // 1-4-2022,"Wages Expenses A/C","Pymt",-6200.00,,
    // Parse it using a simple regex since Papa is not available here easily
    // match: date, "ledger", "type", debit, credit
    const matches = line.match(/^([^,]+),\"([^\"]+)\",\"([^\"]+)\",([^,]*),([^,]*)/);
    if (matches) {
      let date = matches[1];
      let ledger = matches[2];
      let type = matches[3];
      let debit = matches[4] ? matches[4].replace(/-/g, '') : '';
      let credit = matches[5] ? matches[5].replace(/-/g, '') : '';
      
      let voucherNo = '';
      if (i + 1 < lines.length && lines[i+1].includes('(No.')) {
         voucherNo = lines[i+1].match(/\(No\. :(.+?)\)/)?.[1]?.trim() || '';
      }
      processed.push({ date, ledger, type, debit, credit, voucherNo });
    }
  }
}

let sql = 'DO $$\nDECLARE\n  p_id UUID;\nBEGIN\n';
processed.forEach(p => {
  if (p.ledger !== 'Wages Expenses A/C' && p.ledger !== 'Tour & Travel' && p.ledger !== 'Convence Expensece') {
     let amount = p.debit || p.credit || '0';
     let isCredit = p.credit ? 'true' : 'false';
     
     // Date parsing (1-4-2022 to 2022-04-01)
     let dParts = p.date.split('-');
     let formattedDate = `${dParts[2]}-${dParts[1].padStart(2, '0')}-${dParts[0].padStart(2, '0')}`;
     
     let safeLedger = p.ledger.replace(/'/g, "''");
     
     sql += `  SELECT id INTO p_id FROM crm_parties WHERE display_name ILIKE '%${safeLedger}%' OR legal_or_core_name ILIKE '%${safeLedger}%' LIMIT 1;\n`;
     sql += `  IF p_id IS NOT NULL THEN\n`;
     sql += `    INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)\n`;
     sql += `    VALUES (p_id, '${formattedDate}', '${safeLedger}', '${p.type}', '${p.voucherNo}', ${amount}, ${isCredit})\n`;
     sql += `    ON CONFLICT (tally_ledger_name, voucher_type, voucher_no, voucher_date) DO NOTHING;\n`;
     sql += `  END IF;\n\n`;
  }
});
sql += 'END $$;';

fs.writeFileSync('07_seed_vouchers.sql', sql);
console.log('Created 07_seed_vouchers.sql with ' + processed.length + ' records');
