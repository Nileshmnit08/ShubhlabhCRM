import React, { useEffect, useState, useContext, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { AuthContext } from '../../../AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { TrendingUp, RefreshCw, AlertCircle, Gift } from 'lucide-react';

import Filters from './components/Filters';
import KPIGrid from './components/KPIGrid';
// Lists (placeholders, to be built)
import ActiveCustomersList from './components/Lists/ActiveCustomersList';
import ActiveSchemesList from './components/Lists/ActiveSchemesList';
import EligibleRewardsList from './components/Lists/EligibleRewardsList';
import RewardsApprovalList from './components/Lists/RewardsApprovalList';
import RewardsFulfillmentList from './components/Lists/RewardsFulfillmentList';
import FollowUpList from './components/Lists/FollowUpList';
import SchemesClosingList from './components/Lists/SchemesClosingList';

export default function DealerGrowthHub() {
  const { userProfile } = useContext(AuthContext);
  const isAdmin = userProfile?.role === 'Admin';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data State
  const [performanceRecords, setPerformanceRecords] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [eligibleRewards, setEligibleRewards] = useState([]);
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScheme, setFilterScheme] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [dateRange, setDateRange] = useState('Current Scheme Period');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Active View State
  const [activeView, setActiveView] = useState('Dashboard'); // Dashboard, Active Customers, Active Schemes, etc.

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [userProfile, dateRange, startDate, endDate]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Schemes based on Date Filter
      // We'll fetch all schemes, then filter them on client side or we can just fetch all and use the date range to determine "Active"
      const { data: sData, error: sErr } = await supabase.from('dealer_schemes').select('*');
      if (sErr) throw sErr;
      
      let filteredSchemes = sData || [];
      const today = new Date();
      let refStart = null;
      let refEnd = null;

      if (dateRange === 'Today') {
        refStart = today; refEnd = today;
      } else if (dateRange === 'This Week') {
        const first = today.getDate() - today.getDay();
        refStart = new Date(today.setDate(first));
        refEnd = new Date(today.setDate(first + 6));
      } else if (dateRange === 'This Month') {
        refStart = new Date(today.getFullYear(), today.getMonth(), 1);
        refEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      } else if (dateRange === 'Last Month') {
        refStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        refEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      } else if (dateRange === 'Custom' && startDate && endDate) {
        refStart = new Date(startDate);
        refEnd = new Date(endDate);
      }

      if (dateRange !== 'Current Scheme Period' && dateRange !== 'All Time' && refStart && refEnd) {
        // Only include schemes that overlap with this date range
        filteredSchemes = filteredSchemes.filter(s => {
          const sStart = new Date(s.start_date);
          const sEnd = new Date(s.end_date);
          return (sStart <= refEnd && sEnd >= refStart);
        });
      }
      setSchemes(filteredSchemes);

      // 2. Fetch Performance Records (RPC uses CURRENT_DATE by default for some logic, 
      // but scheme date ranges rule the eligibility)
      const { data: pData, error: pErr } = await supabase.rpc('get_customer_scheme_performance');
      if (pErr) throw pErr;
      
      setPerformanceRecords(pData || []);

      // 3. Fetch Rewards Eligibility (for approvals/fulfillments)
      const { data: rData, error: rErr } = await supabase
        .from('dealer_reward_eligibility')
        .select(`
          *,
          dealer_schemes (name, start_date, end_date),
          dealer_scheme_slabs (slab_name, reward_description, reward_value),
          crm_parties (display_name, mobile, city)
        `);
      if (rErr) throw rErr;
      
      setEligibleRewards(rData || []);

    } catch (err) {
      console.error(err);
      setError("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  // Derived filtered data
  const filteredRecords = useMemo(() => {
    return performanceRecords.filter(r => {
      // If a specific scheme is selected, only show that
      if (filterScheme !== 'All' && r.scheme_id !== filterScheme) return false;
      // If "All Schemes" is selected, only show records belonging to the filteredSchemes list
      if (filterScheme === 'All' && !schemes.some(s => s.id === r.scheme_id)) return false;

      if (filterStatus !== 'All' && r.status !== filterStatus) return false;
      
      if (searchQuery) {
        const sq = searchQuery.toLowerCase();
        const searchStr = `${r.customer_name} ${r.mobile} ${r.city} ${r.owner_name} ${r.customer_id}`.toLowerCase();
        if (!searchStr.includes(sq)) return false;
      }
      return true;
    });
  }, [performanceRecords, filterScheme, filterStatus, searchQuery, schemes]);

  // KPIs
  const uniqueCustomers = new Set(filteredRecords.map(r => r.customer_id)).size;
  const activeSchemesCount = schemes.filter(s => s.status === 'Active').length;
  
  const eligibleUnique = new Set(
    eligibleRewards
      .filter(r => r.status === 'Eligible' && (filterScheme === 'All' || r.scheme_id === filterScheme))
      .map(r => r.customer_id)
  ).size;

  const kpi = {
    activeCustomers: uniqueCustomers,
    activeSchemes: activeSchemesCount,
    eligibleRewards: eligibleUnique,
    pendingApproval: eligibleRewards.filter(r => r.status === 'Pending Approval' && (filterScheme === 'All' || r.scheme_id === filterScheme)).length,
    pendingFulfillment: eligibleRewards.filter(r => r.status === 'Approved' && (filterScheme === 'All' || r.scheme_id === filterScheme)).length,
    nearTarget: filteredRecords.filter(r => r.status === 'near_next_slab').length,
    nearMonthly: filteredRecords.filter(r => r.status === 'near_monthly_target').length,
    atRisk: filteredRecords.filter(r => r.status === 'at_risk').length,
    closingSoon: schemes.filter(s => {
       if (s.status !== 'Active') return false;
       const remaining = Math.ceil((new Date(s.end_date) - new Date()) / (1000 * 60 * 60 * 24));
       return remaining >= 0 && remaining <= 15;
    }).length,
    noActivity: filteredRecords.filter(r => r.status === 'no_activity').length
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleKpiClick = (viewName) => {
    setActiveView(viewName);
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={24} className="text-primary" /> Customer Scheme & Growth Hub
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem', maxWidth: '650px' }}>
            Track scheme eligibility, purchase pace, rewards, and customer follow-up opportunities automatically.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="text-muted" style={{fontSize: '0.85rem', marginRight: '0.5rem'}}>
            Last synced: {new Date().toLocaleTimeString()}
          </span>
          <button className="btn btn-secondary" onClick={fetchData}><RefreshCw size={16} /> Sync Data</button>
        </div>
      </div>

      <Filters 
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        filterScheme={filterScheme} setFilterScheme={setFilterScheme}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        schemes={schemes}
        dateRange={dateRange} setDateRange={setDateRange}
        startDate={startDate} setStartDate={setStartDate}
        endDate={endDate} setEndDate={setEndDate}
      />

      {error ? (
        <div className="cv-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <AlertCircle size={48} className="text-danger" style={{ opacity: 0.8, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{error}</h3>
          <button className="btn btn-primary" onClick={fetchData}><RefreshCw size={16} /> Retry</button>
        </div>
      ) : loading ? (
        <div style={{padding: '3rem', textAlign: 'center'}} className="text-muted">Loading Hub Data...</div>
      ) : (
        <>
          <KPIGrid kpi={kpi} onKpiClick={handleKpiClick} />

          {/* Render Active View */}
          <div className="glass-panel" style={{minHeight: '400px'}}>
             {activeView === 'Dashboard' && (
                <div style={{padding: '4rem 2rem', textAlign: 'center'}}>
                  <Gift size={48} className="text-muted" style={{ opacity: 0.5, marginBottom: '1rem' }} />
                  <h3>Select a KPI card above to view details</h3>
                  <p className="text-secondary">Explore active customers, reward approvals, fulfillments, and more.</p>
                </div>
             )}
             
             {activeView === 'Active Customers' && <ActiveCustomersList records={filteredRecords} onBack={() => setActiveView('Dashboard')} />}
             {activeView === 'Active Schemes' && <ActiveSchemesList schemes={schemes.filter(s => s.status === 'Active')} onBack={() => setActiveView('Dashboard')} />}
             
             {activeView === 'Eligible for Rewards' && (
                <EligibleRewardsList 
                  rewards={eligibleRewards.filter(r => r.status === 'Eligible' && (filterScheme === 'All' || r.scheme_id === filterScheme))} 
                  onRefresh={fetchData} 
                  onBack={() => setActiveView('Dashboard')} 
                />
             )}
             
             {activeView === 'Rewards Pending Approval' && (
                <RewardsApprovalList 
                  rewards={eligibleRewards.filter(r => r.status === 'Pending Approval' && (filterScheme === 'All' || r.scheme_id === filterScheme))} 
                  onRefresh={fetchData} 
                  onBack={() => setActiveView('Dashboard')} 
                />
             )}
             
             {activeView === 'Rewards Pending Fulfillment' && (
                <RewardsFulfillmentList 
                  rewards={eligibleRewards.filter(r => r.status === 'Approved' && (filterScheme === 'All' || r.scheme_id === filterScheme))} 
                  onRefresh={fetchData} 
                  onBack={() => setActiveView('Dashboard')} 
                />
             )}

             {activeView === 'Near Next Slab' && (
                <FollowUpList 
                  title="Near Next Slab"
                  records={filteredRecords.filter(r => r.status === 'near_next_slab')} 
                  onBack={() => setActiveView('Dashboard')} 
                />
             )}

             {activeView === 'Near Monthly Target' && (
                <FollowUpList 
                  title="Near Monthly Target"
                  records={filteredRecords.filter(r => r.status === 'near_monthly_target')} 
                  onBack={() => setActiveView('Dashboard')} 
                />
             )}

             {activeView === 'At Risk' && (
                <FollowUpList 
                  title="At Risk of Missing Target"
                  records={filteredRecords.filter(r => r.status === 'at_risk')} 
                  onBack={() => setActiveView('Dashboard')} 
                />
             )}

             {activeView === 'Closing Soon' && (
                <SchemesClosingList 
                  schemes={schemes.filter(s => {
                    if (s.status !== 'Active') return false;
                    const remaining = Math.ceil((new Date(s.end_date) - new Date()) / (1000 * 60 * 60 * 24));
                    return remaining >= 0 && remaining <= 15;
                  })}
                  onBack={() => setActiveView('Dashboard')} 
                />
             )}

             {activeView === 'No Activity' && (
                <FollowUpList 
                  title="No Activity Customers"
                  records={filteredRecords.filter(r => r.status === 'no_activity')} 
                  onBack={() => setActiveView('Dashboard')} 
                />
             )}
          </div>
        </>
      )}
    </div>
  );
}
