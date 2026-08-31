import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Upload, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Papa from 'papaparse'; // Using papaparse for CSV parsing

export default function ImportDealersModal({ onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  const downloadTemplate = () => {
    const headers = ['display_name', 'mobile', 'city', 'state', 'gstin', 'email', 'contact_person', 'notes'];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + "Acme Corp,9876543210,Mumbai,Maharashtra,27AAAAA0000A1Z5,contact@acme.com,John Doe,VIP Dealer";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "shubhlabh_dealers_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    
    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Failed to parse CSV. Please ensure it follows the template format.');
        } else {
          validatePreview(results.data);
        }
      }
    });
  };

  const validatePreview = (data) => {
    const validatedData = data.map((row, index) => {
      let status = 'Valid';
      let message = '';
      
      const mobile = (row.mobile || '').replace(/\D/g, '');
      if (!row.display_name) {
        status = 'Error';
        message = 'Missing dealer name';
      } else if (mobile.length < 10) {
        status = 'Error';
        message = 'Invalid mobile number';
      }
      
      return { ...row, _status: status, _message: message, mobile: mobile };
    });
    setPreview(validatedData);
  };

  const handleImport = async () => {
    const validRows = preview.filter(r => r._status === 'Valid');
    if (validRows.length === 0) {
      setError('No valid rows to import.');
      return;
    }
    
    setLoading(true);
    setError('');
    let successCount = 0;
    let failCount = 0;

    try {
      // Basic insert loop for demo/MVP
      // In production, you might want to do batch inserts or use an edge function
      for (const row of validRows) {
        const { error: insertErr } = await supabase.from('crm_parties').insert({
          display_name: row.display_name,
          party_type: 'Organization',
          mobile: row.mobile,
          city: row.city,
          state: row.state,
          gstin: row.gstin,
          email: row.email,
          contact_person: row.contact_person,
          notes: row.notes,
          crm_status: 'Active'
        });
        
        if (insertErr) {
          failCount++;
        } else {
          successCount++;
        }
      }
      
      setSummary({ success: successCount, failed: failCount });
      if (onSave && successCount > 0) onSave();
    } catch (err) {
      setError(err.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 1000, 
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="animate-fade-in" style={{
        background: 'var(--bg-surface)', width: '100%', maxWidth: '800px',
        maxHeight: '90vh', borderRadius: '12px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 12px 32px rgba(0,0,0,0.2)'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={20} className="text-primary" /> Import Dealers
          </h2>
          <button className="btn cv-btn-subtle" style={{ padding: '0.25rem' }} onClick={onClose}><X size={20} /></button>
        </div>
        
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          
          {summary ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <CheckCircle2 size={48} className="text-success" style={{ marginBottom: '1rem' }} />
              <h3>Import Complete</h3>
              <p>Successfully imported <strong>{summary.success}</strong> dealers.</p>
              {summary.failed > 0 && <p className="text-danger">Failed to import {summary.failed} dealers.</p>}
              <button className="btn btn-primary" onClick={onClose} style={{ marginTop: '1rem' }}>Close</button>
            </div>
          ) : (
            <>
              {error && (
                <div style={{ padding: '1rem', background: 'rgba(231,76,60,0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  {error}
                </div>
              )}
              
              {!file && (
                <div style={{ border: '2px dashed var(--border)', borderRadius: '8px', padding: '3rem 2rem', textAlign: 'center' }}>
                  <FileText size={48} className="text-muted" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <h3 style={{ marginBottom: '0.5rem' }}>Upload CSV File</h3>
                  <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
                    Ensure your file matches the required template format to avoid import errors.
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="btn cv-btn-subtle" onClick={downloadTemplate}>Download Template</button>
                    <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                      Select File
                      <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>
              )}

              {file && preview.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Preview Data ({preview.length} rows)</h3>
                    <div style={{ fontSize: '0.85rem' }}>
                      <span className="text-success" style={{ marginRight: '1rem' }}>{preview.filter(r => r._status === 'Valid').length} Valid</span>
                      <span className="text-danger">{preview.filter(r => r._status === 'Error').length} Errors</span>
                    </div>
                  </div>
                  
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '0.75rem' }}>Status</th>
                          <th style={{ padding: '0.75rem' }}>Name</th>
                          <th style={{ padding: '0.75rem' }}>Mobile</th>
                          <th style={{ padding: '0.75rem' }}>City</th>
                          <th style={{ padding: '0.75rem' }}>Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(0, 50).map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.75rem' }}>
                              {row._status === 'Valid' ? <CheckCircle2 size={16} className="text-success" /> : <AlertTriangle size={16} className="text-danger" />}
                            </td>
                            <td style={{ padding: '0.75rem' }}>{row.display_name}</td>
                            <td style={{ padding: '0.75rem' }}>{row.mobile}</td>
                            <td style={{ padding: '0.75rem' }}>{row.city}</td>
                            <td style={{ padding: '0.75rem', color: row._status === 'Error' ? 'var(--danger)' : 'inherit' }}>{row._message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.length > 50 && <div style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Showing first 50 rows...</div>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!summary && (
          <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button className="btn cv-btn-subtle" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn btn-primary" onClick={handleImport} disabled={loading || !file || preview.filter(r => r._status === 'Valid').length === 0}>
              {loading ? 'Importing...' : 'Import Valid Rows'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
