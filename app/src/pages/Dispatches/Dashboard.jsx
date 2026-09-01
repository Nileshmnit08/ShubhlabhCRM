import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Activity, Truck, Package, DollarSign, Users, AlertCircle, FileText, CheckCircle2, Navigation } from 'lucide-react';

export default function DispatchDashboard() {
  const [loading, setLoading] = useState(true);
  const [dispatches, setDispatches] = useState([]);
  const [kpis, setKpis] = useState({
    total: 0,
    quantity: 0,
    value: 0,
    uniqueDealers: 0,
    missingInfo: 0,
    fullyDispatchedReqs: 0,
    partiallyDispatchedReqs: 0
  });

  // Basic filters
  const [dateRange, setDateRange] = useState('This Month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, startDate, endDate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('requirement_dispatches').select(`
        *,
        requirements (
          quantity, 
          crm_parties (id, display_name, territory_name, city, state)
        )
      `).neq('status', 'Cancelled');

      // Date Filtering Logic
      const today = new Date();
      let filterStart = null;
      let filterEnd = null;

      if (dateRange === 'Today') {
        filterStart = new Date(today.setHours(0,0,0,0)).toISOString();
        filterEnd = new Date(today.setHours(23,59,59,999)).toISOString();
      } else if (dateRange === 'This Month') {
        filterStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        filterEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();
      } else if (dateRange === 'Custom' && startDate && endDate) {
        filterStart = new Date(startDate).toISOString();
        filterEnd = new Date(endDate + 'T23:59:59').toISOString();
      }

      if (filterStart && filterEnd) {
        query = query.gte('dispatch_date', filterStart).lte('dispatch_date', filterEnd);
      }

      const { data, error } = await query;
      if (error) throw error;

      setDispatches(data || []);

      // Calculate KPIs
      const uniqueDealers = new Set();
      let qty = 0;
      let val = 0;
      let missing = 0;

      data?.forEach(d => {
        qty += Number(d.quantity);
        val += Number(d.quantity) * (d.requirements?.expected_rate || 0); // Approx value if rate exists
        if (d.requirements?.crm_parties?.id) {
          uniqueDealers.add(d.requirements.crm_parties.id);
        }
        if (!d.invoice_number || !d.lr_bilty_number || !d.truck_number) {
          missing += 1;
        }
      });

      // To calculate fully vs partially dispatched, we'd ideally query v_requirement_dispatch_summary,
      // but for a quick KPI we can fetch summary for requirements related to these dispatches.
      const reqIds = [...new Set(data?.map(d => d.requirement_id) || [])];
      let fully = 0;
      let partially = 0;

      if (reqIds.length > 0) {
        const { data: summaryData } = await supabase
          .from('v_requirement_dispatch_summary')
          .select('dispatch_progress')
          .in('requirement_id', reqIds);
          
        summaryData?.forEach(s => {
          if (s.dispatch_progress === 'Fully Dispatched') fully++;
          else if (s.dispatch_progress === 'Partially Dispatched') partially++;
        });
      }

      setKpis({
        total: data?.length || 0,
        quantity: qty,
        value: val,
        uniqueDealers: uniqueDealers.size,
        missingInfo: missing,
        fullyDispatchedReqs: fully,
        partiallyDispatchedReqs: partially
      });

    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <h1 style={{margin: 0}}>Dispatch Dashboard</h1>
          <p className="text-secondary">Track requirement fulfillments and logistics.</p>
        </div>
        <div style={{display: 'flex', gap: '1rem'}}>
          <Link to="/dispatches/list" className="btn btn-secondary">
            <Navigation size={16} /> View All Dispatches
          </Link>
        </div>
      </div>

      <div className="glass-panel" style={{padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end'}}>
        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem'}} className="text-muted">Date Range</label>
          <select 
            value={dateRange} onChange={(e) => setDateRange(e.target.value)}
            style={{padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
          >
            <option value="Today">Today</option>
            <option value="This Month">This Month</option>
            <option value="Last Month">Last Month</option>
            <option value="All Time">All Time</option>
            <option value="Custom">Custom Date Range</option>
          </select>
        </div>
        
        {dateRange === 'Custom' && (
          <>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem'}} className="text-muted">From</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
              />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem'}} className="text-muted">To</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                style={{padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
              />
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div style={{textAlign: 'center', padding: '3rem'}} className="text-muted">Loading metrics...</div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem'}}>
          
          <div className="glass-panel" style={{padding: '1.5rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem'}}>
              <div style={{padding: '0.75rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6'}}>
                <Truck size={24} />
              </div>
              <div>
                <h4 style={{margin: 0, fontWeight: 500}} className="text-muted">Total Dispatches</h4>
                <div style={{fontSize: '1.75rem', fontWeight: 700}}>{kpis.total}</div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{padding: '1.5rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem'}}>
              <div style={{padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981'}}>
                <Package size={24} />
              </div>
              <div>
                <h4 style={{margin: 0, fontWeight: 500}} className="text-muted">Dispatched Qty</h4>
                <div style={{fontSize: '1.75rem', fontWeight: 700}}>{kpis.quantity.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{padding: '1.5rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem'}}>
              <div style={{padding: '0.75rem', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6'}}>
                <Users size={24} />
              </div>
              <div>
                <h4 style={{margin: 0, fontWeight: 500}} className="text-muted">Unique Dealers</h4>
                <div style={{fontSize: '1.75rem', fontWeight: 700}}>{kpis.uniqueDealers}</div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{padding: '1.5rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem'}}>
              <div style={{padding: '0.75rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'}}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h4 style={{margin: 0, fontWeight: 500}} className="text-muted">Missing LR/Invoice</h4>
                <div style={{fontSize: '1.75rem', fontWeight: 700, color: 'var(--danger)'}}>{kpis.missingInfo}</div>
              </div>
            </div>
          </div>
          
          <div className="glass-panel" style={{padding: '1.5rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem'}}>
              <div style={{padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981'}}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 style={{margin: 0, fontWeight: 500}} className="text-muted">Fully Dispatched Reqs</h4>
                <div style={{fontSize: '1.75rem', fontWeight: 700}}>{kpis.fullyDispatchedReqs}</div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
