import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Phone, User, Calendar, AlertCircle, PhoneIncoming, PhoneOutgoing, X, RefreshCw, CheckCircle2, Printer, DownloadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function MissedFollowUps() {
  const { userProfile } = useContext(AuthContext);
  
  // Filters
  const [periodFilter, setPeriodFilter] = useState('30');
  const [customDate, setCustomDate] = useState('');
  const [staffFilter, setStaffFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data
  const [allStaff, setAllStaff] = useState([]);
  const [missedCustomers, setMissedCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  // Stats
  const [stats, setStats] = useState({ totalMissed: 0, neverCalled: 0, overdue: 0, staffCount: 0 });

  // Load Staff for filter
  useEffect(() => {
    const loadStaff = async () => {
      const { data } = await supabase.from('app_users').select('id, display_name').order('display_name');
      if (data) setAllStaff(data);
    };
    loadStaff();
  }, []);

  useEffect(() => {
    fetchMissedFollowUps();
  }, [periodFilter, customDate, staffFilter, statusFilter]);

  const fetchMissedFollowUps = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the newly created view or equivalent query
      let query = supabase.from('v_missed_followups').select('*');

      // Staff Filter
      if (staffFilter !== 'All') {
        query = query.eq('assigned_owner_id', staffFilter);
      }

      // Customer Status Filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Active') {
            // Assume Active means anything except Lead or specific inactive states
            // If the system has a specific 'Active' string, use it. For now, exclude Lead/Inactive.
            query = query.not('crm_status', 'eq', 'Lead').not('crm_status', 'eq', 'Inactive');
        } else {
            query = query.eq('crm_status', statusFilter);
        }
      }

      const { data, error: queryErr } = await query;
      if (queryErr) throw queryErr;
      
      if (!data) {
          setMissedCustomers([]);
          setFilteredCustomers([]);
          return;
      }

      // Filter by period
      let result = [];
      const now = new Date();
      
      let thresholdDate = null;
      
      if (periodFilter === 'Never') {
          // Special pseudo-period just for never called
          result = data.filter(c => !c.latest_call_at);
      } else if (periodFilter === 'Custom' && customDate) {
          thresholdDate = new Date(customDate);
          thresholdDate.setHours(23, 59, 59, 999);
      } else if (periodFilter !== 'Custom' && periodFilter !== 'Never') {
          const days = parseInt(periodFilter, 10);
          thresholdDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      }

      if (periodFilter !== 'Never') {
          result = data.filter(c => {
              if (!c.latest_call_at) return true; // Never called always shown unless specifically excluded
              const callDate = new Date(c.latest_call_at);
              return thresholdDate && callDate < thresholdDate;
          });
      }

      setMissedCustomers(result);
    } catch (err) {
      console.error('Error fetching missed follow-ups:', err);
      setError('Unable to load call history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = [...missedCustomers];

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        (c.customer_name || '').toLowerCase().includes(q) ||
        (c.mobile || '').includes(q)
      );
    }

    // Sort by: 1. Never Called, 2. Oldest Last Called Date first
    result.sort((a, b) => {
      const aNever = !a.latest_call_at;
      const bNever = !b.latest_call_at;
      if (aNever && !bNever) return -1;
      if (!aNever && bNever) return 1;
      if (aNever && bNever) return 0;
      return new Date(a.latest_call_at) - new Date(b.latest_call_at);
    });

    setFilteredCustomers(result);

    // Calculate metrics based on the filtered result
    let never = 0;
    let overdue = 0;
    let uniqueStaff = new Set();
    
    result.forEach(c => {
        if (!c.latest_call_at) never++;
        else overdue++;
        if (c.assigned_owner_id) uniqueStaff.add(c.assigned_owner_id);
    });

    setStats({
        totalMissed: result.length,
        neverCalled: never,
        overdue: overdue,
        staffCount: uniqueStaff.size
    });

  }, [missedCustomers, searchQuery]);

  const calculateDaysSince = (dateString) => {
      if (!dateString) return 'Never';
      const callDate = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - callDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return '1 day';
      return `${diffDays} days`;
  };

  const generateMissedFollowUpsPdf = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('SHUBH LABH CRM', pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text('MISSED FOLLOW-UPS', pageWidth / 2, 22, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Report Date: ${new Date().toLocaleDateString('en-GB')}`, 14, 32);
      
      let periodText = `${periodFilter} Days`;
      if (periodFilter === 'Custom') periodText = `Custom (Before ${customDate})`;
      if (periodFilter === 'Never') periodText = 'Never Called Only';
      doc.text(`Selected Period: ${periodText}`, 14, 38);
      
      if (staffFilter !== 'All') {
        const staffName = allStaff.find(s => s.id === staffFilter)?.display_name || staffFilter;
        doc.text(`Staff: ${staffName}`, 14, 44);
      }
      
      const tableColumns = ['S. No.', 'Customer Name', 'Phone Number', 'Last Called Date'];
      let startY = staffFilter !== 'All' ? 50 : 44;

      if (staffFilter === 'All') {
        // Group by Staff
        const grouped = {};
        filteredCustomers.forEach(c => {
          const staff = c.staff_name || 'Unassigned';
          if (!grouped[staff]) grouped[staff] = [];
          grouped[staff].push(c);
        });

        Object.keys(grouped).sort().forEach((staff, index) => {
          const staffData = grouped[staff].map((c, i) => [
            i + 1,
            c.customer_name || 'Unknown',
            c.mobile || 'N/A',
            c.latest_call_at ? new Date(c.latest_call_at).toLocaleDateString('en-GB') : 'Never Called'
          ]);

          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`${staff.toUpperCase()} — MISSED FOLLOW-UPS`, 14, startY);
          startY += 4;

          doc.autoTable({
            startY: startY,
            head: [tableColumns],
            body: staffData,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
            margin: { top: 15 }
          });
          startY = doc.lastAutoTable.finalY + 15;
          
          // Add new page if space is low
          if (startY > doc.internal.pageSize.height - 30 && index < Object.keys(grouped).length - 1) {
              doc.addPage();
              startY = 20;
          }
        });
      } else {
        const tableData = filteredCustomers.map((c, i) => [
          i + 1,
          c.customer_name || 'Unknown',
          c.mobile || 'N/A',
          c.latest_call_at ? new Date(c.latest_call_at).toLocaleDateString('en-GB') : 'Never Called'
        ]);

        doc.autoTable({
          startY: startY,
          head: [tableColumns],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          margin: { top: 15 }
        });
      }

      return doc;
    } catch (err) {
      console.error('Error in generateMissedFollowUpsPdf:', err);
      throw err;
    }
  };

  const handleDownloadPDF = () => {
    if (filteredCustomers.length === 0) return;
    setPdfLoading(true);
    setPdfError(null);
    
    // Use short timeout to allow loading state to render
    setTimeout(() => {
      try {
        const doc = generateMissedFollowUpsPdf();
        const filename = `ShubhLabh_Missed_FollowUps_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
      } catch (err) {
        console.error('Download PDF error:', err);
        setPdfError("Unable to generate PDF. Please try again.");
      } finally {
        setPdfLoading(false);
      }
    }, 10);
  };

  const handlePrintPDF = () => {
    if (filteredCustomers.length === 0) return;
    setPdfLoading(true);
    setPdfError(null);
    
    // Synchronous execution is preferred to avoid popup blockers,
    // but React state updates batching means we might block the UI.
    // If popup is blocked, we catch it.
    try {
      const doc = generateMissedFollowUpsPdf();
      doc.autoPrint();
      
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      
      const printWindow = window.open(blobUrl, '_blank');
      
      if (!printWindow) {
        setPdfError("Popup blocked by browser. Please allow popups or use Download PDF.");
      }
      
      // We do not revoke the URL immediately because the new window needs time to load it.
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 60000);
      
    } catch (err) {
      console.error('Print PDF error:', err);
      setPdfError("Unable to generate PDF for printing. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ flex: 1 }}></div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>
            <AlertCircle size={24} /> Missed Follow-ups
          </h2>
          <p className="text-secondary">Customers assigned to staff with no recent qualifying phone calls.</p>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleDownloadPDF} 
            disabled={pdfLoading || filteredCustomers.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {pdfLoading ? <RefreshCw size={16} className="spin" /> : <DownloadCloud size={16} />}
            {pdfLoading ? 'Generating...' : 'Download PDF'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handlePrintPDF} 
            disabled={pdfLoading || filteredCustomers.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {pdfLoading ? <RefreshCw size={16} className="spin" /> : <Printer size={16} />}
            {pdfLoading ? 'Generating...' : 'Print'}
          </button>
        </div>
      </div>
      
      {pdfError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} /> {pdfError}
        </div>
      )}

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Period</label>
            <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} className="form-control">
              <option value="7">7 Days</option>
              <option value="15">15 Days</option>
              <option value="30">30 Days</option>
              <option value="60">60 Days</option>
              <option value="90">90 Days</option>
              <option value="Custom">Custom Date</option>
              <option value="Never">Never Called Only</option>
            </select>
          </div>
          
          {periodFilter === 'Custom' && (
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Last Contacted Before</label>
              <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="form-control" />
            </div>
          )}

          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Staff</label>
            <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} className="form-control">
              <option value="All">All Staff</option>
              {allStaff.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
            </select>
          </div>

          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Customer Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-control">
              <option value="All">All Statuses</option>
              <option value="Active">Active Customers</option>
              <option value="Lead">Leads</option>
            </select>
          </div>

          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Customer Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} className="text-secondary" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Search by name or mobile..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '2rem' }}
              />
            </div>
          </div>
        </div>

        {/* Summary Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Missed</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{stats.totalMissed}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Never Called</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--danger)' }}>{stats.neverCalled}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Overdue</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{stats.overdue}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Staff Count</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{stats.staffCount}</div>
          </div>
        </div>
      </div>

      <div className="data-table-container">
        {error ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger)' }}>
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={fetchMissedFollowUps} style={{ marginTop: '1rem' }}>Retry</button>
          </div>
        ) : loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading authoritative call data...</div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} className="text-success" />
            <h3>No missed follow-ups found.</h3>
            <p>All selected customers have been contacted within the required timeframe.</p>
          </div>
        ) : (
          <table className="data-table" style={{ width: '100%', minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{ width: '25%' }}>CUSTOMER</th>
                <th style={{ width: '15%' }}>ASSIGNED STAFF</th>
                <th style={{ width: '15%' }}>LAST CALL</th>
                <th style={{ width: '10%' }}>DAYS SINCE CALL</th>
                <th style={{ width: '10%' }}>LAST CALL TYPE</th>
                <th style={{ width: '15%' }}>LAST FOLLOW-UP</th>
                <th style={{ width: '10%' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(c => {
                const daysSince = calculateDaysSince(c.latest_call_at);
                const isNever = daysSince === 'Never';
                
                return (
                  <tr key={c.customer_id} style={{ borderLeft: isNever ? '3px solid var(--danger)' : '3px solid transparent' }}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{c.customer_name}</div>
                      <div className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{c.mobile}</div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{c.staff_name || 'Unknown'}</span>
                    </td>
                    <td>
                      {c.latest_call_at ? new Date(c.latest_call_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="text-danger">Never</span>}
                    </td>
                    <td style={{ fontWeight: 500, color: isNever ? 'var(--danger)' : 'inherit' }}>
                      {daysSince}
                    </td>
                    <td>
                      {c.latest_call_type ? (
                          c.latest_call_type === 'INCOMING' ? 'Incoming' :
                          c.latest_call_type === 'OUTGOING' ? 'Outgoing' :
                          c.latest_call_type === 'MISSED' ? 'Missed' : c.latest_call_type
                      ) : '—'}
                    </td>
                    <td>
                      {c.latest_followup_reason ? (
                        <div style={{ fontSize: '0.85rem' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }} title={c.latest_followup_reason}>{c.latest_followup_reason}</div>
                          <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{c.latest_followup_status}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <Link to={`/customers/${c.customer_id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
