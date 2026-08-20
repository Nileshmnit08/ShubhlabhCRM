import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function DataQuality() {
  const { userProfile } = useContext(AuthContext);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    if (userProfile?.role === 'Admin') {
      fetchIssues();
    }
  }, [userProfile]);

  async function fetchIssues() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('v_data_quality_issues').select('*');
      if (error) throw error;
      setIssues(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (userProfile?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  // Derived summaries
  const highPriority = issues.filter(i => i.severity === 'High');
  const mediumPriority = issues.filter(i => i.severity === 'Medium');
  const lowPriority = issues.filter(i => i.severity === 'Low');

  const filteredIssues = filter === 'All' ? issues : issues.filter(i => i.severity === filter);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      
      {/* Header Area */}
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={24} className="text-warning" /> Data Quality Control
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
            Identify and resolve missing, stale, or conflicting records without altering raw source data.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Main Work Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Summary Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="glass-panel" onClick={() => setFilter('High')} style={{ padding: '1.5rem', background: 'var(--danger-light)', border: '1px solid var(--danger)', cursor: 'pointer', opacity: filter === 'High' || filter === 'All' ? 1 : 0.5 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600, textTransform: 'uppercase' }}>High Priority</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)' }}>{highPriority.length}</div>
            </div>
            <div className="glass-panel" onClick={() => setFilter('Medium')} style={{ padding: '1.5rem', background: 'var(--warning-light)', border: '1px solid var(--warning)', cursor: 'pointer', opacity: filter === 'Medium' || filter === 'All' ? 1 : 0.5 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--warning)', fontWeight: 600, textTransform: 'uppercase' }}>Medium Priority</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>{mediumPriority.length}</div>
            </div>
            <div className="glass-panel" onClick={() => setFilter('Low')} style={{ padding: '1.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer', opacity: filter === 'Low' || filter === 'All' ? 1 : 0.5 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Low Priority</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{lowPriority.length}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Action Items ({filteredIssues.length})</h2>
            {filter !== 'All' && (
              <button className="btn btn-secondary" onClick={() => setFilter('All')} style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}>Clear Filter</button>
            )}
          </div>

          <div className="glass-panel" style={{ background: 'var(--bg-surface)' }}>
            {loading ? (
               <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Scanning system data...</div>
            ) : filteredIssues.length === 0 ? (
               <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                 <CheckCircle2 size={48} className="text-success" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                 <h3 style={{ fontSize: '1.25rem' }}>System Healthy</h3>
                 <p className="text-secondary">No data quality issues found matching this filter.</p>
               </div>
            ) : (
               <div style={{ overflowX: 'auto' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                   <thead>
                     <tr style={{ borderBottom: '1px solid var(--border)' }}>
                       <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Issue</th>
                       <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Entity</th>
                       <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Description</th>
                       <th style={{ padding: '1rem', width: '50px' }}></th>
                     </tr>
                   </thead>
                   <tbody>
                     {filteredIssues.map((issue, idx) => (
                       <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                         <td style={{ padding: '1rem' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                             {issue.severity === 'High' && <AlertTriangle size={16} className="text-danger" />}
                             {issue.severity === 'Medium' && <AlertCircle size={16} className="text-warning" />}
                             {issue.severity === 'Low' && <Info size={16} className="text-muted" />}
                             <span style={{ fontWeight: 600 }}>{issue.issue_type}</span>
                           </div>
                         </td>
                         <td style={{ padding: '1rem' }}>
                           <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{issue.entity_name}</div>
                           <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{issue.entity_type}</div>
                         </td>
                         <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                           {issue.description}
                         </td>
                         <td style={{ padding: '1rem', textAlign: 'right' }}>
                           {issue.issue_type === 'Unresolved Identity' ? (
                             <Link to="/data/review" className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>Resolve</Link>
                           ) : issue.party_id ? (
                             <Link to={`/customers/${issue.party_id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>View Profile</Link>
                           ) : (
                             <span className="text-muted" style={{ fontSize: '0.8rem' }}>System</span>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            )}
          </div>

        </div>

        {/* Action Plan & SOP Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
             <h2 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '1rem', marginTop: 0 }}>Standard Operating Procedures</h2>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
               
               <div>
                 <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Missing Contact Info (High)</div>
                 <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                   <strong>Owner:</strong> Sales Operations<br/>
                   <strong>Action:</strong> Open the profile and update the Mobile Number. Do not delete active customers.
                 </div>
               </div>

               <div>
                 <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Unassigned Account (High)</div>
                 <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                   <strong>Owner:</strong> Admin<br/>
                   <strong>Action:</strong> Assign an owner to active customers to ensure follow-ups occur.
                 </div>
               </div>

               <div>
                 <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Stale Tasks (Medium)</div>
                 <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                   <strong>Owner:</strong> Assigned Staff<br/>
                   <strong>Action:</strong> Navigate to the profile and mark the task as Complete or Postpone it.
                 </div>
               </div>

               <div>
                 <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Unresolved Identity (Low)</div>
                 <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                   <strong>Owner:</strong> Admin<br/>
                   <strong>Action:</strong> Use the Data Import Review Queue. <strong>Never</strong> modify raw Tally data. Always map the identity via the matching interface.
                 </div>
               </div>
               
             </div>
          </div>

        </div>

      </div>

    </div>
  );
}
