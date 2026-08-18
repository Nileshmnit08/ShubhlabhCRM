import React, { useState } from 'react';
import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { supabase } from '../../lib/supabase';
import { UploadCloud, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2, Users, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function DataImport() {
  const [importType, setImportType] = useState('party'); // 'party' | 'voucher'
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [columns, setColumns] = useState([]);
  
  // Mapping state: UI Label -> CSV Column Name
  const [partyMapping, setPartyMapping] = useState({ ledger_name: '', group: '', location: '' });
  const [voucherMapping, setVoucherMapping] = useState({ voucher_date: '', ledger_name: '', voucher_type: '', voucher_no: '', debit_amount: '', credit_amount: '' });

  const [importResult, setImportResult] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      parseFile(selected);
    }
  };

  const parseMultilineVoucherCsv = (text) => {
    const results = Papa.parse(text, { skipEmptyLines: true });
    const data = results.data;
    
    const processed = [];
    for(let i=0; i < data.length; i++) {
       const row = data[i];
       // Basic check: row[0] looks like a date (e.g. 1-4-2022 or 01/04/2022)
       if (row.length >= 3 && row[0] && (row[0].includes('-') || row[0].includes('/'))) {
           let voucherNo = '';
           // Check next row for voucher no
           if (i+1 < data.length && data[i+1][0] && data[i+1][0].includes('(No.')) {
              voucherNo = data[i+1][0].replace('(No. :', '').replace('(No.', '').replace(')', '').trim();
           }
           
           processed.push({
              voucher_date: row[0],
              ledger_name: row[1],
              voucher_type: row[2],
              debit_amount: row[3] ? row[3].replace(/-/g, '') : '',
              credit_amount: row[4] ? row[4].replace(/-/g, '') : '',
              voucher_no: voucherNo
           });
       }
    }
    
    setParsedData(processed);
    setColumns(['voucher_date', 'ledger_name', 'voucher_type', 'debit_amount', 'credit_amount', 'voucher_no']);
    
    setVoucherMapping({
      voucher_date: 'voucher_date',
      ledger_name: 'ledger_name',
      voucher_type: 'voucher_type',
      voucher_no: 'voucher_no',
      debit_amount: 'debit_amount',
      credit_amount: 'credit_amount'
    });
    
    setParsing(false);
  };

  const parseFile = (file) => {
    setParsing(true);
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      parsePdf(file);
      return;
    }

    if (importType === 'voucher') {
       const reader = new FileReader();
       reader.onload = (e) => {
         parseMultilineVoucherCsv(e.target.result);
       };
       reader.readAsText(file, 'UTF-16LE');
       return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedData(results.data);
        if (results.meta.fields) {
          setColumns(results.meta.fields);
          
          if (importType === 'party') {
            const guessMapping = { ...partyMapping };
            results.meta.fields.forEach(f => {
              const lower = f.toLowerCase();
              if (lower.includes('ledger') || lower.includes('party') || lower.includes('name')) guessMapping.ledger_name = f;
              else if (lower.includes('group') || lower.includes('parent')) guessMapping.group = f;
              else if (lower.includes('state') || lower.includes('city') || lower.includes('location')) guessMapping.location = f;
            });
            setPartyMapping(guessMapping);
          }
        }
        setParsing(false);
      },
      error: (error) => {
        console.error("Parse Error:", error);
        alert("Failed to parse CSV");
        setParsing(false);
      }
    });
  };

  const parsePdf = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let allTextLines = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        textContent.items.forEach(item => {
          const text = item.str.trim();
          if (text.length > 2 && !/^[0-9]+$/.test(text)) {
            allTextLines.push({ raw_text: text });
          }
        });
      }
      setParsedData(allTextLines);
      setColumns(['raw_text']);
      if (importType === 'party') setPartyMapping(prev => ({ ...prev, ledger_name: 'raw_text' }));
      else setVoucherMapping(prev => ({ ...prev, ledger_name: 'raw_text' }));
      setParsing(false);
    } catch (err) {
      alert("Failed to parse PDF file.");
      setParsing(false);
      setFile(null);
    }
  };

  const runPartyImport = async (importJob) => {
    const rawParties = parsedData.map(row => {
      const ledgerName = row[partyMapping.ledger_name];
      const isOld = ledgerName && ledgerName.toUpperCase().includes('(OLD)');
      return {
        tally_import_id: importJob.id,
        tally_ledger_name: ledgerName,
        tally_group: partyMapping.group ? row[partyMapping.group] : null,
        raw_location: partyMapping.location ? row[partyMapping.location] : null,
        tally_status: isOld ? 'OLD' : 'Active',
        raw_payload_or_source_reference: row
      };
    }).filter(p => p.tally_ledger_name);

    const chunkSize = 500;
    for (let i = 0; i < rawParties.length; i += chunkSize) {
      const chunk = rawParties.slice(i, i + chunkSize);
      const { error: rawError } = await supabase.from('tally_raw_parties').insert(chunk);
      if (rawError) throw rawError;
    }

    // Run identity resolution
    const { data: crmParties } = await supabase.from('crm_parties').select('id, display_name, legal_or_core_name');
    const { data: insertedRawParties } = await supabase.from('tally_raw_parties')
      .select('id, tally_ledger_name')
      .eq('tally_import_id', importJob.id);
    
    if (crmParties && insertedRawParties) {
      const linksToInsert = [];
      const reviewQueueToInsert = [];

      const normalize = (str) => {
        if (!str) return '';
        return str.toUpperCase().replace(/\(OLD\)/g, '').replace(/[^A-Z0-9]/g, '').trim();
      };

      insertedRawParties.forEach(rawP => {
        const rawNorm = normalize(rawP.tally_ledger_name);
        let bestMatch = null;
        let highestScore = 0;

        crmParties.forEach(crmP => {
          const crmNorm = normalize(crmP.display_name);
          const legalNorm = normalize(crmP.legal_or_core_name);
          
          if (rawNorm === crmNorm || rawNorm === legalNorm) {
            bestMatch = crmP; highestScore = 1.0;
          } else if (rawNorm.includes(crmNorm) || crmNorm.includes(rawNorm)) {
            if (highestScore < 0.8) { bestMatch = crmP; highestScore = 0.8; }
          }
        });

        if (highestScore === 1.0) {
          linksToInsert.push({ crm_party_id: bestMatch.id, tally_raw_party_id: rawP.id, match_type: 'System Generated', confidence: 1.0, resolution_status: 'Resolved', reason: 'Exact normalized name match' });
        } else if (highestScore > 0.5) {
          reviewQueueToInsert.push({ tally_raw_party_id: rawP.id, candidate_crm_party_id: bestMatch.id, match_reason: 'Partial name match detected', confidence: highestScore });
        } else {
          reviewQueueToInsert.push({ tally_raw_party_id: rawP.id, candidate_crm_party_id: null, match_reason: 'No matching CRM party found', confidence: 0 });
        }
      });

      if (linksToInsert.length > 0) {
        for (let i = 0; i < linksToInsert.length; i += chunkSize) {
          const chunk = linksToInsert.slice(i, i + chunkSize);
          const { error: linkErr } = await supabase.from('party_identity_links').insert(chunk);
          if (linkErr) throw linkErr;
        }
      }
      if (reviewQueueToInsert.length > 0) {
        for (let i = 0; i < reviewQueueToInsert.length; i += chunkSize) {
          const chunk = reviewQueueToInsert.slice(i, i + chunkSize);
          const { error: revErr } = await supabase.from('identity_review_queue').insert(chunk);
          if (revErr) throw revErr;
        }
      }
    }
    return rawParties.length;
  };

  const runVoucherImport = async (importJob) => {
    // 1. Prepare raw transactions
    const rawTxns = parsedData.map(row => {
      const ledgerName = row[voucherMapping.ledger_name];
      const dAmt = parseFloat(row[voucherMapping.debit_amount]) || 0;
      const cAmt = parseFloat(row[voucherMapping.credit_amount]) || 0;
      let dateVal = row[voucherMapping.voucher_date];
      
      // Simple date parsing if it exists, Tally dates can be weird e.g. "1-Apr-24"
      if (dateVal) {
        try { dateVal = new Date(dateVal).toISOString().split('T')[0]; } 
        catch (e) { dateVal = null; }
      }

      return {
        import_id: importJob.id,
        voucher_date: dateVal || null,
        particulars: ledgerName || 'Unknown',
        voucher_type: voucherMapping.voucher_type ? row[voucherMapping.voucher_type] : null,
        voucher_no: voucherMapping.voucher_no ? row[voucherMapping.voucher_no] : null,
        debit_amount: dAmt,
        credit_amount: cAmt,
        raw_data: row
      };
    }).filter(t => t.particulars && t.particulars !== 'Unknown' && (t.debit_amount > 0 || t.credit_amount > 0));

    // 2. Insert raw transactions
    const { error: rawErr } = await supabase.from('tally_raw_transactions').insert(rawTxns);
    if (rawErr) throw rawErr;

    // 3. Process to clean tally_transactions
    // Find all crm_parties to exact match on name
    const { data: crmParties } = await supabase.from('crm_parties').select('id, display_name, legal_or_core_name');
    
    if (crmParties) {
      const normalize = (str) => {
        if (!str) return '';
        return str.toUpperCase().replace(/\(OLD\)/g, '').replace(/[^A-Z0-9]/g, '').trim();
      };
      
      const cleanTxns = [];
      rawTxns.forEach(raw => {
        const rawNorm = normalize(raw.particulars);
        const match = crmParties.find(c => normalize(c.display_name) === rawNorm || normalize(c.legal_or_core_name) === rawNorm);
        
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
        }
      });

      if (cleanTxns.length > 0) {
        // Use UPSERT or ignore duplicates on the unique constraint (tally_ledger_name, voucher_type, voucher_no, voucher_date)
        const { error: cleanErr } = await supabase.from('tally_transactions').upsert(cleanTxns, { onConflict: 'tally_ledger_name, voucher_type, voucher_no, voucher_date', ignoreDuplicates: true });
        if (cleanErr) console.error("Clean error: ", cleanErr);
      }
    }
    return rawTxns.length;
  };

  const runImport = async () => {
    if (importType === 'party' && !partyMapping.ledger_name) {
      alert("Please map the Ledger Name column."); return;
    }
    if (importType === 'voucher' && !voucherMapping.ledger_name) {
      alert("Please map the Ledger Name column."); return;
    }

    setImporting(true);
    try {
      const { data: importJob, error: importError } = await supabase
        .from('tally_imports')
        .insert([{ source_file_name: file.name, source_type: 'CSV', record_count: parsedData.length, status: 'Processing' }])
        .select().single();

      if (importError) throw importError;

      let count = 0;
      if (importType === 'party') {
        count = await runPartyImport(importJob);
      } else {
        count = await runVoucherImport(importJob);
      }

      await supabase.from('tally_imports').update({ status: 'Completed', success_count: count }).eq('id', importJob.id);
      
      if (importType === 'party') {
        // Automatically redirect to review queue for parties
        navigate('/data/review');
      } else {
        setImportResult({ success: true, count, type: importType });
      }
    } catch (err) {
      console.error(err);
      setImportResult({ success: false, error: err.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{marginBottom: '2rem'}}>
        <div>
          <h1>Tally Data Import</h1>
          <p className="text-secondary" style={{marginTop: '0.25rem'}}>
            Safely import and stage Tally ledger data and vouchers.
          </p>
        </div>
        <Link to="/data/review" className="btn btn-secondary">
          Go to Identity Review Queue
        </Link>
      </div>

      {!file ? (
        <div style={{display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px'}}>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button className={`glass-panel ${importType === 'party' ? 'active-border' : ''}`} style={{flex: 1, padding: '2rem', textAlign: 'center', borderColor: importType === 'party' ? 'var(--primary)' : 'transparent', cursor: 'pointer', transition: 'all 0.2s'}} onClick={() => setImportType('party')}>
              <Users size={32} className={importType === 'party' ? 'text-primary' : 'text-secondary'} style={{margin: '0 auto 1rem'}} />
              <h3>Party Ledgers</h3>
              <p className="text-secondary" style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>Import customer masters, addresses, and balances from Tally.</p>
            </button>
            <button className={`glass-panel ${importType === 'voucher' ? 'active-border' : ''}`} style={{flex: 1, padding: '2rem', textAlign: 'center', borderColor: importType === 'voucher' ? 'var(--primary)' : 'transparent', cursor: 'pointer', transition: 'all 0.2s'}} onClick={() => setImportType('voucher')}>
              <FileText size={32} className={importType === 'voucher' ? 'text-primary' : 'text-secondary'} style={{margin: '0 auto 1rem'}} />
              <h3>Voucher / Daybook</h3>
              <p className="text-secondary" style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>Import sales, receipts, and payments history for BI insights.</p>
            </button>
          </div>

          <div className="glass-panel" style={{padding: '4rem 2rem', textAlign: 'center', borderStyle: 'dashed'}}>
            <input type="file" accept=".csv, .pdf, application/pdf, text/csv" onChange={handleFileChange} style={{display: 'none'}} id="file-upload" />
            <label htmlFor="file-upload" style={{cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'}}>
              <UploadCloud size={48} className="text-primary" />
              <div>
                <h3>Upload Tally Export</h3>
                <p className="text-secondary">Drag and drop your CSV here for {importType === 'party' ? 'Party Masters' : 'Vouchers'}.</p>
              </div>
              <div className="btn btn-primary">Browse File</div>
            </label>
          </div>
        </div>
      ) : importResult ? (
        <div className="glass-panel" style={{padding: '3rem', textAlign: 'center'}}>
          {importResult.success ? (
            <>
              <CheckCircle2 size={48} style={{color: 'var(--success)', margin: '0 auto 1rem'}} />
              <h2>Import Successful!</h2>
              <p className="text-secondary" style={{marginTop: '0.5rem', marginBottom: '2rem'}}>
                Staged {importResult.count} {importResult.type === 'party' ? 'Parties' : 'Transactions'}.
              </p>
              <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
                <button className="btn btn-secondary" onClick={() => { setFile(null); setImportResult(null); }}>Import Another</button>
                {importResult.type === 'party' && <Link to="/data/review" className="btn btn-primary">Proceed to Review Queue</Link>}
              </div>
            </>
          ) : (
            <>
              <AlertTriangle size={48} style={{color: 'var(--danger)', margin: '0 auto 1rem'}} />
              <h2>Import Failed</h2>
              <p className="text-danger" style={{marginTop: '0.5rem'}}>{importResult.error}</p>
              <button className="btn btn-secondary" style={{marginTop: '1.5rem'}} onClick={() => { setFile(null); setImportResult(null); }}>Try Again</button>
            </>
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{padding: '2rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem'}}>
            <FileSpreadsheet size={32} className="text-primary" />
            <div>
              <h3 style={{margin: 0}}>{file.name}</h3>
              <p className="text-secondary" style={{fontSize: '0.85rem'}}>
                {parsing ? 'Parsing...' : `${parsedData.length} rows detected`}
              </p>
            </div>
            <button className="btn btn-secondary" style={{marginLeft: 'auto'}} onClick={() => setFile(null)} disabled={importing}>
              Cancel
            </button>
          </div>

          <div style={{background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--radius-md)'}}>
            <h4 style={{marginBottom: '1rem'}}>Map Columns ({importType === 'party' ? 'Party' : 'Voucher'} Mode)</h4>
            
            {importType === 'party' ? (
              <div style={{display: 'grid', gap: '1rem', maxWidth: '500px'}}>
                <div><label>Ledger Name (Required)</label><select value={partyMapping.ledger_name} onChange={e => setPartyMapping(p => ({...p, ledger_name: e.target.value}))}><option value="">-- Select --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label>Parent Group</label><select value={partyMapping.group} onChange={e => setPartyMapping(p => ({...p, group: e.target.value}))}><option value="">-- Select --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label>Location (State/City)</label><select value={partyMapping.location} onChange={e => setPartyMapping(p => ({...p, location: e.target.value}))}><option value="">-- Select --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
            ) : (
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '800px'}}>
                <div><label>Voucher Date</label><select value={voucherMapping.voucher_date} onChange={e => setVoucherMapping(p => ({...p, voucher_date: e.target.value}))}><option value="">-- Select --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label>Ledger / Particulars (Required)</label><select value={voucherMapping.ledger_name} onChange={e => setVoucherMapping(p => ({...p, ledger_name: e.target.value}))}><option value="">-- Select --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label>Voucher Type</label><select value={voucherMapping.voucher_type} onChange={e => setVoucherMapping(p => ({...p, voucher_type: e.target.value}))}><option value="">-- Select --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label>Voucher No</label><select value={voucherMapping.voucher_no} onChange={e => setVoucherMapping(p => ({...p, voucher_no: e.target.value}))}><option value="">-- Select --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label>Debit Amount</label><select value={voucherMapping.debit_amount} onChange={e => setVoucherMapping(p => ({...p, debit_amount: e.target.value}))}><option value="">-- Select --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label>Credit Amount</label><select value={voucherMapping.credit_amount} onChange={e => setVoucherMapping(p => ({...p, credit_amount: e.target.value}))}><option value="">-- Select --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
            )}
          </div>

          <div style={{marginTop: '2rem', display: 'flex', justifyContent: 'flex-end'}}>
            <button className="btn btn-primary" onClick={runImport} disabled={importing || parsing || (importType==='party' ? !partyMapping.ledger_name : !voucherMapping.ledger_name)}>
              {importing ? <><Loader2 size={18} className="animate-spin" /> Importing...</> : 'Run Import Pipeline'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
