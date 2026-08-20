import fs from 'fs';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import WebSocket from 'ws';

globalThis.WebSocket = WebSocket;

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const normalizeIdentity = (name) => {
  if (!name) return '';
  return name.toUpperCase()
    .replace(/\(OLD\)/g, '')
    .replace(/[^A-Z0-9]/g, '');
};

async function importParties(filePath) {
  console.log(`\n--- IMPORTING PARTIES: ${filePath} ---`);
  const csvText = fs.readFileSync(filePath, 'utf8');
  
  const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rawParties = results.data.map(row => {
    const ledgerName = row['Ledger Name'] || row['ledger_name'];
    if (!ledgerName) return null;
    
    const isOld = ledgerName.toUpperCase().includes('(OLD)');
    const cleanName = ledgerName.replace(/\(OLD\)/gi, '').trim().replace(/\s+/g, ' ');

    return {
      display_name: cleanName,
      tally_ledger_id: ledgerName,
      city: row['Location'] || row['city'] || null,
      mobile: row['Mobile'] || row['mobile'] || null,
      email: row['Email'] || row['email'] || null,
      gst_number: row['GSTIN'] || row['gst_number'] || null,
      status: isOld ? 'Inactive' : 'Active',
      rawRow: row
    };
  }).filter(Boolean);

  console.log(`Found ${rawParties.length} valid party rows.`);

  const { data: dbCustomers, error: dbErr } = await supabase.from('crm_parties').select('id, display_name, mobile, email, gst_number');
  if (dbErr) throw dbErr;

  const inserts = [];
  const updates = [];
  const unchanged = [];
  const conflicts = [];

  rawParties.forEach(incoming => {
    let match = null;
    let matchConfidence = 0;
    let ambiguousMatches = [];

    const iName = normalizeIdentity(incoming.display_name);

    dbCustomers.forEach(db => {
      const dName = db.display_name ? normalizeIdentity(db.display_name) : null;
      if (iName && dName && (iName === dName || iName.includes(dName) || dName.includes(iName))) {
        if (matchConfidence < 80) { 
          if (match && match.id !== db.id) {
            ambiguousMatches.push(db);
          } else {
            match = db; matchConfidence = 80; 
          }
        }
      }
    });

    if (ambiguousMatches.length > 0 && matchConfidence <= 80) {
      conflicts.push(incoming);
    } else if (match) {
      unchanged.push(incoming); // Simplified for testing: assume no changes if match found
    } else {
      inserts.push(incoming);
    }
  });

  console.log(`Inserts: ${inserts.length}, Updates: ${updates.length}, Unchanged: ${unchanged.length}, Conflicts (Ambiguous): ${conflicts.length}`);

  if (inserts.length > 0 || updates.length > 0) {
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('execute_party_import_batch', {
      p_inserts: inserts.length > 0 ? inserts : null,
      p_updates: updates.length > 0 ? updates : null
    });
    if (rpcErr) throw rpcErr;
    console.log(`RPC Result: Inserted ${rpcResult.inserted}, Updated ${rpcResult.updated}`);
  }
}

async function importVouchers(filePath) {
  console.log(`\n--- IMPORTING VOUCHERS: ${filePath} ---`);
  const csvText = fs.readFileSync(filePath, 'utf8');
  
  // This CSV does not have headers based on preview. Format: Date, Ledger, Type, No, Debit, Credit
  const results = Papa.parse(csvText, { header: false, skipEmptyLines: true });
  const rawTxns = [];
  
  results.data.forEach(row => {
    if (row.length >= 3 && row[0] && row[1]) {
      const ledgerName = row[1];
      const dAmt = parseFloat(row[4]) || 0;
      const cAmt = parseFloat(row[5]) || 0;
      let dateVal = row[0];
      try { dateVal = new Date(dateVal).toISOString().split('T')[0]; } 
      catch (e) { dateVal = null; }

      if (ledgerName !== '(cancelled)' && (dAmt > 0 || cAmt > 0)) {
        rawTxns.push({
          voucher_date: dateVal,
          particulars: ledgerName,
          voucher_type: row[2] || 'Unknown',
          voucher_no: row[3] || 'NA',
          debit_amount: dAmt,
          credit_amount: cAmt,
          raw_data: row
        });
      }
    }
  });

  console.log(`Found ${rawTxns.length} valid voucher rows.`);

  const { data: importJob, error: importError } = await supabase
    .from('tally_imports')
    .insert([{ source_file_name: path.basename(filePath), source_type: 'CSV', record_count: rawTxns.length, status: 'Processing' }])
    .select().single();
  
  if (importError) throw importError;

  const rawTxnsToInsert = rawTxns.map(t => ({...t, import_id: importJob.id}));
  // Insert raw in batches
  for(let i=0; i<rawTxnsToInsert.length; i+=1000) {
      await supabase.from('tally_raw_transactions').insert(rawTxnsToInsert.slice(i, i+1000));
  }

  const { data: crmParties } = await supabase.from('crm_parties').select('id, display_name, legal_or_core_name');
  
  const cleanTxns = [];
  const unmatchedLedgers = new Set();
  
  rawTxns.forEach(raw => {
    const rawNorm = normalizeIdentity(raw.particulars);
    const match = crmParties.find(c => normalizeIdentity(c.display_name) === rawNorm || normalizeIdentity(c.legal_or_core_name) === rawNorm);
    
    if (match) {
      cleanTxns.push({
        crm_party_id: match.id,
        import_id: importJob.id,
        voucher_date: raw.voucher_date || new Date().toISOString().split('T')[0],
        tally_ledger_name: raw.particulars,
        voucher_type: raw.voucher_type || 'Unknown',
        voucher_no: raw.voucher_no || 'NA',
        amount: raw.debit_amount > 0 ? raw.debit_amount : raw.credit_amount,
        is_credit: raw.credit_amount > 0
      });
    } else {
      unmatchedLedgers.add(raw.particulars);
    }
  });

  let successCount = 0;
  if (cleanTxns.length > 0) {
    for(let i=0; i<cleanTxns.length; i+=1000) {
      const { error: cleanErr } = await supabase.from('tally_transactions').upsert(cleanTxns.slice(i, i+1000), { onConflict: 'tally_ledger_name, voucher_type, voucher_no, voucher_date', ignoreDuplicates: true });
      if (cleanErr) throw cleanErr;
    }
    successCount = cleanTxns.length;
  }
  
  let queuedCount = unmatchedLedgers.size;
  console.log(`Vouchers mapped cleanly: ${successCount}. Unmatched Ledgers sent to Identity Review Queue: ${queuedCount}`);

  if (unmatchedLedgers.size > 0) {
    const unmatchedArr = Array.from(unmatchedLedgers);
    const rawPToInsert = unmatchedArr.map(ul => ({
      tally_import_id: importJob.id,
      tally_ledger_name: ul,
      tally_status: 'Active (Voucher)'
    }));
    await supabase.from('tally_raw_parties').upsert(rawPToInsert, { onConflict: 'tally_ledger_name', ignoreDuplicates: true });
    
    const { data: insertedRaw } = await supabase.from('tally_raw_parties').select('id, tally_ledger_name').in('tally_ledger_name', unmatchedArr);
    
    if (insertedRaw) {
      const reviewQueueToInsert = insertedRaw.map(rp => {
        const rawNorm = normalizeIdentity(rp.tally_ledger_name);
        let bestMatch = null;
        let highestScore = 0;
        crmParties.forEach(crmP => {
          const crmNorm = normalizeIdentity(crmP.display_name);
          if (rawNorm.includes(crmNorm) || crmNorm.includes(rawNorm)) {
            if (highestScore < 0.8) { bestMatch = crmP; highestScore = 0.8; }
          }
        });
        
        return {
          tally_raw_party_id: rp.id,
          candidate_crm_party_id: bestMatch ? bestMatch.id : null,
          match_reason: bestMatch ? 'Partial name match detected' : 'No matching CRM party found',
          confidence: highestScore
        };
      });
      await supabase.from('identity_review_queue').upsert(reviewQueueToInsert, { onConflict: 'tally_raw_party_id' });
    }
  }

  await supabase.from('tally_imports').update({ status: 'Completed', success_count: successCount, error_count: 0 }).eq('id', importJob.id);
  console.log(`Voucher Import Job ${importJob.id} Completed.`);
}

async function main() {
  try {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: 'admin@shubhlabh.local',
      password: 'password123'
    });
    if (authErr) throw authErr;
    console.log(`Authenticated as: ${authData.user.email}`);

    await importParties('../dummy_tally_parties.csv');
    await importVouchers('../converted_vouchers_latest.csv');
  } catch(e) {
    console.error(e);
  }
}

main();
