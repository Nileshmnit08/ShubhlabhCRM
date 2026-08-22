import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Map, AlertTriangle, ShieldAlert, ArrowRight, Layers } from 'lucide-react';

export default function CoverageIntelligence() {
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGaps();
  }, []);

  const fetchGaps = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase.from('v_coverage_gaps').select('*');
      if (err) throw err;
      
      // Group by gap type
      const grouped = (data || []).reduce((acc, curr) => {
        if (!acc[curr.gap_type]) acc[curr.gap_type] = [];
        acc[curr.gap_type].push(curr);
        return acc;
      }, {});
      
      setGaps(grouped);
    } catch (err) {
      console.error("Coverage Intelligence fetch error:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        raw: err
      });
      
      const errorMessage = err?.message || '';
      if (errorMessage.toLowerCase().includes('schema cache') || errorMessage.toLowerCase().includes('could not find the table') || err?.code === 'PGRST205' || errorMessage.includes('404')) {
        setError("Coverage view missing – please run the database migration (73_sprint_17_8_coverage_gaps.sql) or contact an admin.");
      } else {
        setError("Failed to load coverage intelligence. Service may be temporarily unavailable.");
      }
    } finally {
      setLoading(false);
    }
  };

  const gapKeys = Object.keys(gaps);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Coverage Intelligence</h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem' }}>Deterministic identification of territory gaps and orphaned dealers.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Scanning coverage gaps...</div>
      ) : error ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
      ) : gapKeys.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Layers size={48} className="text-success" style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Perfect Coverage</h3>
          <p className="text-muted" style={{ maxWidth: '400px', margin: '0 auto' }}>No orphaned dealers, unassigned territories, or neglected active intents found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          
          {/* Unassigned Territories */}
          {gaps['Unassigned Territory'] && (
            <div className="cv-panel" style={{ borderLeft: '4px solid var(--danger)' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Map size={20} className="text-danger" />
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>Unassigned Territories ({gaps['Unassigned Territory'].length})</h3>
              </div>
              <div style={{ padding: '1.5rem 2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {gaps['Unassigned Territory'].map((gap, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{gap.entity_name}</strong>
                        <span className="text-muted text-sm">{gap.evidence}</span>
                      </div>
                      <Link to="/settings/territories" className="btn btn-secondary">Assign Manager</Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Orphaned Dealers */}
          {gaps['Orphaned Dealer'] && (
            <div className="cv-panel" style={{ borderLeft: '4px solid var(--warning)' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShieldAlert size={20} className="text-warning" />
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>Orphaned Dealers ({gaps['Orphaned Dealer'].length})</h3>
              </div>
              <div style={{ padding: '1.5rem 2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {gaps['Orphaned Dealer'].map((gap, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{gap.entity_name}</strong>
                        <span className="text-muted text-sm">{gap.evidence}</span>
                      </div>
                      <Link to={`/customers/${gap.entity_id}`} className="btn btn-secondary">Assign Owner</Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Neglected Active Intents */}
          {gaps['Neglected Dealer (Active Intent)'] && (
            <div className="cv-panel" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle size={20} className="text-primary" />
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>Neglected Intents ({gaps['Neglected Dealer (Active Intent)'].length})</h3>
              </div>
              <div style={{ padding: '1.5rem 2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {gaps['Neglected Dealer (Active Intent)'].map((gap, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{gap.entity_name}</strong>
                        <span className="text-muted text-sm">{gap.evidence}</span>
                      </div>
                      <Link to={`/customers/${gap.entity_id}`} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>View 360 <ArrowRight size={14} /></Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
