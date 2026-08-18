import React, { useState, useContext } from 'react';
import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { AuthContext } from '../../AuthContext';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/activityLogger';
import { UploadCloud, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2, Users, FileText, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { normalizeIdentity } from '../../utils/normalizer';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function DataImport() {
  const { user } = useContext(AuthContext);
  const [importType, setImportType] = useState('party'); // 'party' | 'voucher'
  const [importMode, setImportMode] = useState('upsert'); // 'upsert' | 'insert_only' | 'update_only' | 'preview_only'
  
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [columns, setColumns] = useState([]);
  
  // Mapping state: UI Label -> CSV Column Name
  const [partyMapping, setPartyMapping] = useState({ ledger_name: '', group: '', location: '', mobile: '', email: '', gstin: '' });
  const [voucherMapping, setVoucherMapping] = useState({ voucher_date: '', ledger_name: '', voucher_type: '', voucher_no: '', debit_amount: '', credit_amount: '' });

  const [importResult, setImportResult] = useState(null);
  const [previewSummary, setPreviewSummary] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      const ext = selected.name.split('.').pop().toLowerCase();
      if (ext !== 'csv' && ext !== 'pdf') {
        alert("Unsupported file format. Please upload a .csv or .pdf file.");
        e.target.value = null;
        return;
      }
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
       if (row.length >= 3 && row[0] && (row[0].includes('-') || row[0].includes('/'))) {
           let voucherNo = '';
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
    setVoucherMapping({ voucher_date: 'voucher_date', ledger_name: 'ledger_name', voucher_type: 'voucher_type', voucher_no: 'voucher_no', debit_amount: 'debit_amount', credit_amount: 'credit_amount' });
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
       reader.onload = (e) => parseMultilineVoucherCsv(e.target.result);
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
              else if (lower.includes('mob') || lower.includes('phone')) guessMapping.mobile = f;
              else if (lower.includes('email') || lower.includes('mail')) guessMapping.email = f;
              else if (lower.includes('gst') || lower.includes('tin')) guessMapping.gstin = f;
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

  const dedupeRowsWithinImport = (rows) => {
    const deduped = [];
    const grouped = {};
    let mergedCount = 0;

    rows.forEach(r => {
      // Create a deterministic key prioritizing GSTIN > Mobile > Name
      const normGst = r.gst_number ? r.gst_number.trim().toUpperCase() : null;
      const normMob = r.mobile ? r.mobile.replace(/\\D/g, '').slice(-10) : null;
      const normName = r.display_name ? normalizeIdentity(r.display_name) : null;

      const key = normGst || normMob || normName;
      if (!key) {
        deduped.push(r); // Cannot dedupe
        return;
      }

      if (grouped[key]) {
        // Merge sparse values (incoming keeps non-empty values)
        const existing = grouped[key];
        existing.city = existing.city || r.city;
        existing.mobile = existing.mobile || r.mobile;
        existing.email = existing.email || r.email;
        existing.gst_number = existing.gst_number || r.gst_number;
        mergedCount++;
      } else {
        grouped[key] = r;
      }
    });

    Object.values(grouped).forEach(v => deduped.push(v));
    return { deduped, mergedCount };
  };

  const runPartyImport = async () => {
    if (!partyMapping.ledger_name) {
      alert("Please map the Ledger Name column."); return;
    }
    
    setImporting(true);
    setImportResult(null);

    try {
      // 1. Build Raw Objects
      const rawParties = parsedData.map(row => {
        const ledgerName = row[partyMapping.ledger_name];
        if (!ledgerName) return null;
        
        let city = partyMapping.location ? row[partyMapping.location] : null;
        if (city) city = city.trim().replace(/\\s+/g, ' ');

        let mobile = partyMapping.mobile ? row[partyMapping.mobile] : null;
        if (mobile) mobile = mobile.replace(/[^0-9+]/g, '');

        let email = partyMapping.email ? row[partyMapping.email] : null;
        if (email) email = email.trim().toLowerCase();

        let gstin = partyMapping.gstin ? row[partyMapping.gstin] : null;
        if (gstin) gstin = gstin.trim().toUpperCase();

        const isOld = ledgerName.toUpperCase().includes('(OLD)');
        const cleanName = ledgerName.replace(/\\(OLD\\)/gi, '').trim().replace(/\\s+/g, ' ');

        return {
          display_name: cleanName,
          tally_ledger_id: ledgerName, // We use original name as external ref fallback
          city,
          mobile,
          email,
          gst_number: gstin,
          status: isOld ? 'Inactive' : 'Active',
          rawRow: row
        };
      }).filter(Boolean);

      // 2. Dedupe within the file
      const { deduped: uniqueIncoming, mergedCount } = dedupeRowsWithinImport(rawParties);

      // 3. Fetch existing DB Customers to compare
      const { data: dbCustomers, error: dbErr } = await supabase.from('crm_parties').select('id, display_name, mobile, email, gst_number');
      if (dbErr) throw dbErr;

      const inserts = [];
      const updates = [];
      const unchanged = [];
      const conflicts = []; // Ambiguous needs review

      // 4. Identity Matching Logic
      uniqueIncoming.forEach(incoming => {
        let match = null;
        let matchConfidence = 0;
        let ambiguousMatches = [];

        // Normalize incoming for matching
        const iGst = incoming.gst_number;
        const iMob = incoming.mobile ? incoming.mobile.slice(-10) : null;
        const iEmail = incoming.email;
        const iName = normalizeIdentity(incoming.display_name);

        dbCustomers.forEach(db => {
          const dGst = db.gst_number;
          const dMob = db.mobile ? db.mobile.slice(-10) : null;
          const dEmail = db.email;
          const dName = db.display_name ? normalizeIdentity(db.display_name) : null;

          if (iGst && dGst && iGst === dGst) {
            match = db; matchConfidence = 100;
          } else if (iMob && dMob && iMob === dMob) {
            if (matchConfidence < 90) { match = db; matchConfidence = 90; }
          } else if (iEmail && dEmail && iEmail === dEmail) {
            if (matchConfidence < 90) { match = db; matchConfidence = 90; }
          } else if (iName && dName && (iName === dName || iName.includes(dName) || dName.includes(iName))) {
            if (matchConfidence < 80) { 
              if (match && match.id !== db.id) {
                // We found multiple fuzzy matches! Ambiguous!
                ambiguousMatches.push(db);
              } else {
                match = db; matchConfidence = 80; 
              }
            }
          }
        });

        // 5. Diff & Assign Action
        if (ambiguousMatches.length > 0 && matchConfidence <= 80) {
          conflicts.push(incoming);
        } else if (match) {
          // Check if data actually changed
          let hasChanges = false;
          if (incoming.mobile && incoming.mobile !== match.mobile) hasChanges = true;
          if (incoming.email && incoming.email !== match.email) hasChanges = true;
          if (incoming.city && incoming.city !== match.city) hasChanges = true;
          if (incoming.gst_number && incoming.gst_number !== match.gst_number) hasChanges = true;

          if (hasChanges) {
            if (importMode === 'upsert' || importMode === 'update_only') {
              updates.push({ ...incoming, id: match.id });
            } else {
              unchanged.push(incoming);
            }
          } else {
            unchanged.push(incoming);
          }
        } else {
          if (importMode === 'upsert' || importMode === 'insert_only') {
            inserts.push(incoming);
          } else {
            unchanged.push(incoming);
          }
        }
      });

      // 6. Present Preview OR Execute
      if (importMode === 'preview_only') {
        setPreviewSummary({
          totalParsed: rawParties.length,
          mergedInFile: mergedCount,
          inserts: inserts.length,
          updates: updates.length,
          unchanged: unchanged.length,
          conflicts: conflicts.length
        });
        setImporting(false);
        return;
      }

      // 7. Execute Upsert via RPC in transaction
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('execute_party_import_batch', {
        p_inserts: inserts.length > 0 ? inserts : null,
        p_updates: updates.length > 0 ? updates : null
      });

      if (rpcErr) throw rpcErr;

      // 8. Stage conflicts to review queue if any
      let queuedCount = 0;
      if (conflicts.length > 0) {
        queuedCount = conflicts.length;
        const rawPToInsert = conflicts.map(c => ({
          tally_ledger_name: c.display_name,
          raw_location: c.city,
          tally_status: 'Active (Conflict)',
          raw_payload_or_source_reference: c.rawRow
        }));
        const { error: rawErr } = await supabase.from('tally_raw_parties').upsert(rawPToInsert, { onConflict: 'tally_ledger_name', ignoreDuplicates: true });
        if (!rawErr) {
           const { data: insertedRaw } = await supabase.from('tally_raw_parties').select('id, tally_ledger_name').in('tally_ledger_name', conflicts.map(c => c.display_name));
           if (insertedRaw) {
              const reviewQueueToInsert = insertedRaw.map(rp => ({
                tally_raw_party_id: rp.id,
                match_reason: 'Ambiguous fuzzy match across multiple existing customers',
                confidence: 0
              }));
              await supabase.from('identity_review_queue').upsert(reviewQueueToInsert, { onConflict: 'tally_raw_party_id' });
           }
        }
      }

      logActivity({
        userId: user?.id,
        module: 'DataSync',
        actionType: 'IMPORT',
        summary: `Smart Imported Party Ledgers. Inserted: ${rpcResult.inserted}, Updated: ${rpcResult.updated}.`
      });

      setImportResult({ 
        success: true, 
        insertedCount: rpcResult.inserted, 
        updatedCount: rpcResult.updated,
        unchangedCount: unchanged.length,
        mergedInFileCount: mergedCount,
        queuedCount, 
        errorCount: rpcResult.failed, 
        type: 'party', 
        date: new Date().toLocaleDateString() 
      });

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
            Safely import and smart-upsert Tally ledger data and vouchers.
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
              <p className="text-secondary" style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>Import and smart-upsert customer masters and balances from Tally.</p>
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
              <div style={{display: 'flex', gap: '2rem', justifyContent: 'center', margin: '2rem 0'}}>
                <div style={{padding: '1rem', background: 'var(--bg-surface-hover)', borderRadius: '8px', minWidth: '120px'}}>
                  <div style={{fontSize: '2rem', fontWeight: 700, color: 'var(--success)'}}>{importResult.insertedCount}</div>
                  <div className="text-secondary" style={{fontSize: '0.85rem'}}>Inserted</div>
                </div>
                <div style={{padding: '1rem', background: 'var(--bg-surface-hover)', borderRadius: '8px', minWidth: '120px'}}>
                  <div style={{fontSize: '2rem', fontWeight: 700, color: 'var(--primary)'}}>{importResult.updatedCount}</div>
                  <div className="text-secondary" style={{fontSize: '0.85rem'}}>Updated</div>
                </div>
                <div style={{padding: '1rem', background: 'var(--bg-surface-hover)', borderRadius: '8px', minWidth: '120px'}}>
                  <div style={{fontSize: '2rem', fontWeight: 700, color: 'var(--text-secondary)'}}>{importResult.unchangedCount}</div>
                  <div className="text-secondary" style={{fontSize: '0.85rem'}}>Unchanged (No-op)</div>
                </div>
              </div>
              <p className="text-secondary" style={{marginTop: '0.5rem', marginBottom: '2rem'}}>
                File merged {importResult.mergedInFileCount} sparse duplicates natively. 
                {importResult.queuedCount > 0 && <span style={{display: 'block', color: 'var(--warning)', marginTop: '0.5rem'}}>{importResult.queuedCount} ambiguous conflicts sent to Review Queue.</span>}
              </p>
              
              <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
                <button className="btn btn-secondary" onClick={() => { setFile(null); setImportResult(null); }}>Import Another</button>
                {importResult.queuedCount > 0 && <Link to="/data/review" className="btn btn-warning">Proceed to Review Queue</Link>}
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
      ) : previewSummary ? (
        <div className="glass-panel" style={{padding: '3rem', textAlign: 'center'}}>
          <Settings size={48} style={{color: 'var(--primary)', margin: '0 auto 1rem'}} />
          <h2>Import Preview Summary</h2>
          <p className="text-secondary" style={{marginBottom: '2rem'}}>Review the projected impact of this import file.</p>
          
          <table style={{margin: '0 auto 2rem', textAlign: 'left', minWidth: '300px'}}>
            <tbody>
              <tr><td style={{padding: '0.5rem'}}>Total Parsed Rows:</td><td style={{fontWeight: 600, textAlign: 'right'}}>{previewSummary.totalParsed}</td></tr>
              <tr><td style={{padding: '0.5rem'}}>Duplicates Merged In-File:</td><td style={{fontWeight: 600, textAlign: 'right', color: 'var(--warning)'}}>{previewSummary.mergedInFile}</td></tr>
              <tr style={{borderTop: '1px solid var(--border)'}}><td style={{padding: '0.5rem'}}>Expected Inserts (New):</td><td style={{fontWeight: 600, textAlign: 'right', color: 'var(--success)'}}>{previewSummary.inserts}</td></tr>
              <tr><td style={{padding: '0.5rem'}}>Expected Updates (Existing):</td><td style={{fontWeight: 600, textAlign: 'right', color: 'var(--primary)'}}>{previewSummary.updates}</td></tr>
              <tr><td style={{padding: '0.5rem'}}>Unchanged (No-op):</td><td style={{fontWeight: 600, textAlign: 'right'}}>{previewSummary.unchanged}</td></tr>
              <tr><td style={{padding: '0.5rem'}}>Ambiguous Conflicts:</td><td style={{fontWeight: 600, textAlign: 'right', color: 'var(--danger)'}}>{previewSummary.conflicts}</td></tr>
            </tbody>
          </table>

          <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
            <button className="btn btn-secondary" onClick={() => setPreviewSummary(null)}>Back to Settings</button>
            <button className="btn btn-primary" onClick={() => { setPreviewSummary(null); setImportMode('upsert'); runPartyImport(); }}>
              Confirm & Execute Upsert
            </button>
          </div>
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

          <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap'}}>
            {/* Import Mode Settings */}
            {importType === 'party' && (
              <div style={{flex: 1, minWidth: '300px', background: 'var(--bg-surface-hover)', padding: '1.5rem', borderRadius: 'var(--radius-md)'}}>
                <h4 style={{marginBottom: '1rem'}}>Import Mode</h4>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                    <input type="radio" name="mode" checked={importMode === 'upsert'} onChange={() => setImportMode('upsert')} />
                    <span><strong>Insert + Update</strong> (Smart Upsert - Default)</span>
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                    <input type="radio" name="mode" checked={importMode === 'update_only'} onChange={() => setImportMode('update_only')} />
                    <span><strong>Update Existing Only</strong> (Skip new ledgers)</span>
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                    <input type="radio" name="mode" checked={importMode === 'insert_only'} onChange={() => setImportMode('insert_only')} />
                    <span><strong>Insert Only</strong> (Skip existing ledgers)</span>
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                    <input type="radio" name="mode" checked={importMode === 'preview_only'} onChange={() => setImportMode('preview_only')} />
                    <span><strong>Preview Conflicts Only</strong> (Dry Run)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Column Mapping */}
            <div style={{flex: 2, background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--radius-md)'}}>
              <h4 style={{marginBottom: '1rem'}}>Map Columns</h4>
              
              {importType === 'party' ? (
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div><label>Ledger Name (Required)</label><select value={partyMapping.ledger_name} onChange={e => setPartyMapping(p => ({...p, ledger_name: e.target.value}))}><option value="">-- Select --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label>Mobile Number</label><select value={partyMapping.mobile} onChange={e => setPartyMapping(p => ({...p, mobile: e.target.value}))}><option value="">-- Select --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label>Email</label><select value={partyMapping.email} onChange={e => setPartyMapping(p => ({...p, email: e.target.value}))}><option value="">-- Select --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label>GSTIN</label><select value={partyMapping.gstin} onChange={e => setPartyMapping(p => ({...p, gstin: e.target.value}))}><option value="">-- Select --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label>Location (State/City)</label><select value={partyMapping.location} onChange={e => setPartyMapping(p => ({...p, location: e.target.value}))}><option value="">-- Select --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label>Parent Group</label><select value={partyMapping.group} onChange={e => setPartyMapping(p => ({...p, group: e.target.value}))}><option value="">-- Select --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
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
          </div>

          <div style={{marginTop: '2rem', display: 'flex', justifyContent: 'flex-end'}}>
            <button className="btn btn-primary" onClick={importType === 'party' ? runPartyImport : () => alert('Voucher import unchanged in this sprint.')} disabled={importing || parsing || (importType==='party' ? !partyMapping.ledger_name : !voucherMapping.ledger_name)}>
              {importing ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : (importMode === 'preview_only' ? 'Preview Dry Run' : 'Execute Import')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
