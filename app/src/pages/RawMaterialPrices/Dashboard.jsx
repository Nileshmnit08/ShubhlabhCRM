import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, TrendingUp, TrendingDown, Clock, Search, X, 
  FileText, Plus, Database, Activity, Package, AlertCircle, RefreshCw
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeMaterials: 0,
    trackedMaterials: 0,
    updatedToday: 0,
    totalEntriesToday: 0,
    pendingToday: 0,
    latestPriceDate: null,
  });
  const [todayPrices, setTodayPrices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch active materials
      const { data: mats } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('active', true)
        .order('display_order');
      
      // Fetch today's entries
      const { data: entries } = await supabase
        .from('raw_material_price_entries')
        .select(`
          *,
          raw_materials (name_en, name_hi, category),
          brokers (broker_name),
          material_quality_grades (grade_name),
          rm_units (unit_name),
          rm_price_types (type_name)
        `)
        .eq('entry_date', today)
        .eq('is_deleted', false);

      // Fetch latest price date overall
      const { data: latestEntry } = await supabase
        .from('raw_material_price_entries')
        .select('entry_date')
        .eq('is_deleted', false)
        .order('entry_date', { ascending: false })
        .limit(1);

      // Fetch past entries to find the previous available price for movement calculation
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: pastEntries } = await supabase
         .from('raw_material_price_entries')
         .select('raw_material_id, broker_id, quality_grade_id, price, entry_date')
         .lt('entry_date', today)
         .gte('entry_date', thirtyDaysAgo.toISOString().split('T')[0])
         .eq('is_deleted', false)
         .order('entry_date', { ascending: false });

      // Build a map of the most recent previous price for each unique combo
      const previousPricesMap = {};
      if (pastEntries) {
        for (const p of pastEntries) {
          const key = `${p.raw_material_id}-${p.broker_id}-${p.quality_grade_id || 'null'}`;
          if (!previousPricesMap[key]) {
             previousPricesMap[key] = p;
          }
        }
      }

      // Attach previous price to today's entries
      const entriesWithMovement = (entries || []).map(entry => {
         const key = `${entry.raw_material_id}-${entry.broker_id}-${entry.quality_grade_id || 'null'}`;
         const prev = previousPricesMap[key];
         return {
            ...entry,
            previous_price: prev ? prev.price : null,
            previous_date: prev ? prev.entry_date : null
         };
      });

      const updatedMats = new Set((entries || []).map(e => e.raw_material_id));
      const trackingMats = (mats || []).filter(m => m.daily_tracking_required);
      const pendingCount = Math.max(0, trackingMats.length - updatedMats.size);
      
      setStats({
        activeMaterials: (mats || []).length,
        trackedMaterials: trackingMats.length,
        updatedToday: updatedMats.size,
        totalEntriesToday: entries?.length || 0,
        pendingToday: pendingCount,
        latestPriceDate: latestEntry?.[0]?.entry_date || null
      });

      setTodayPrices(entriesWithMovement);

      // --- Attention Center Logic ---
      const { data: settings } = await supabase.from('raw_material_price_settings').select('alert_threshold_percentage').single();
      const threshold = settings?.alert_threshold_percentage || 3.0; // Default to 3% if not set
      
      const newAlerts = [];

      // Alert 1: Missing Daily Tracking
      if (pendingCount > 0) {
        const missingMatNames = trackingMats
          .filter(m => !updatedMats.has(m.id))
          .map(m => m.name_en)
          .slice(0, 3)
          .join(', ');
        const remainder = pendingCount > 3 ? ` and ${pendingCount - 3} others` : '';
        
        newAlerts.push({
          title: `${pendingCount} Tracked Material${pendingCount > 1 ? 's' : ''} Missing Today's Price`,
          description: `Missing updates for: ${missingMatNames}${remainder}.`,
          icon: Clock,
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          actionText: 'Add Prices',
          actionLink: '/raw-material-prices/daily-entry'
        });
      }

      // Alert 2: Sharp Movements
      entriesWithMovement.forEach(entry => {
        if (entry.previous_price && entry.price) {
          const prev = Number(entry.previous_price);
          const curr = Number(entry.price);
          if (prev > 0) {
            const diff = curr - prev;
            const pct = (Math.abs(diff) / prev) * 100;
            
            if (pct >= threshold) {
              const matName = entry.raw_materials?.name_en || 'Material';
              const direction = diff > 0 ? 'jumped' : 'dropped';
              const Icon = diff > 0 ? TrendingUp : TrendingDown;
              const color = diff > 0 ? 'text-danger' : 'text-success';
              const bg = diff > 0 ? 'bg-red-50' : 'bg-green-50';

              newAlerts.push({
                title: `Sharp Price Movement: ${matName}`,
                description: `The price quoted by ${entry.brokers?.broker_name || 'Broker'} has ${direction} by ${pct.toFixed(1)}% (₹${Math.abs(diff).toFixed(2)}) compared to the last available price.`,
                icon: Icon,
                iconBg: bg,
                iconColor: color,
                actionText: 'View History',
                actionLink: `/raw-material-prices/history?material=${entry.raw_material_id}`
              });
            }
          }
        }
      });

      setAlerts(newAlerts);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrices = todayPrices.filter(entry => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.raw_materials?.name_en?.toLowerCase().includes(q) ||
      entry.raw_materials?.name_hi?.toLowerCase().includes(q) ||
      entry.brokers?.broker_name?.toLowerCase().includes(q) ||
      entry.market_location?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="card bg-white border border-base rounded-xl shadow-sm overflow-hidden flex flex-col mb-8 animate-fade-in">
      {/* 1. Header */}
      <div className="p-6 border-b border-base bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary">Raw Material Prices Dashboard</h2>
          <p className="text-sm text-secondary mt-1">Overview of today's market prices and active alerts.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link to="/raw-material-prices/analysis" className="btn btn-secondary shadow-sm py-2 px-4 whitespace-nowrap flex items-center justify-center">
            <Activity size={16} className="mr-1.5" />
            Analysis
          </Link>
          <Link to="/raw-material-prices/daily-entry" className="btn btn-primary shadow-sm py-2 px-4 whitespace-nowrap flex items-center justify-center">
            <Plus size={16} className="mr-1.5" />
            Daily Entry
          </Link>
        </div>
      </div>

      {/* 2. Compact Statistics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-base border-b border-base bg-slate-50">
        <div className="p-4 flex flex-col">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">Active Materials</span>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-primary leading-none">{stats.activeMaterials}</span>
            <span className="text-sm text-muted font-medium mb-0.5">Tracking {stats.trackedMaterials} daily</span>
          </div>
        </div>
        <div className="p-4 flex flex-col">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">Updated Today</span>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-primary leading-none">{stats.updatedToday}</span>
            <span className="text-sm text-muted font-medium mb-0.5">/ {stats.trackedMaterials} required</span>
          </div>
        </div>
        <div className="p-4 flex flex-col">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">Total Entries</span>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-primary leading-none">{stats.totalEntriesToday}</span>
            <span className="text-sm text-muted font-medium mb-0.5">Recorded today</span>
          </div>
        </div>
        <div className="p-4 flex flex-col">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">Pending Updates</span>
          <div className="flex items-end gap-2">
            <span className={`text-2xl font-bold leading-none ${stats.pendingToday > 0 ? 'text-warning' : 'text-success'}`}>{stats.pendingToday}</span>
            <span className="text-sm text-muted font-medium mb-0.5">{stats.pendingToday === 0 ? 'All updated' : 'Missing prices'}</span>
          </div>
        </div>
      </div>

      {/* 3. Collapsible / Compact Alert Banner */}
      {!loading && alerts.length > 0 && (
        <div className="bg-amber-50/50 border-b border-amber-100 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-amber-600">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800">Action Required ({alerts.length})</h3>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-lg border border-amber-100/50 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${alert.iconBg || 'bg-amber-100'} ${alert.iconColor || 'text-amber-600'}`}>
                        <alert.icon size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary line-clamp-1">{alert.title}</p>
                        <p className="text-[13px] text-secondary mt-0.5 line-clamp-1">{alert.description}</p>
                      </div>
                    </div>
                    <Link to={alert.actionLink} className="text-[13px] font-semibold text-primary whitespace-nowrap hover:underline pl-11 sm:pl-0 shrink-0">
                      {alert.actionText} &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Toolbar (Search) */}
      <div className="p-4 bg-white border-b border-base flex flex-col sm:flex-row gap-4 justify-between items-center">
        <h3 className="font-semibold text-primary">Today's Market Prices</h3>
        <div className="relative w-full sm:w-[300px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text"
            className="input w-full pl-9"
            placeholder="Search material or broker..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 5. Full Width Data Table */}
      <div className="data-table-container border-0 rounded-none flex-1">
        <table className="data-table mobile-cards-table w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4">Material</th>
              <th className="px-6 py-4">Quality/Grade</th>
              <th className="px-6 py-4">Broker</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4 text-right">Price (₹)</th>
              <th className="px-6 py-4">Unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base">
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
                  <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                  <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-200 rounded"></div></td>
                  <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                  <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded ml-auto"></div></td>
                  <td className="px-6 py-4"><div className="h-4 w-12 bg-slate-200 rounded"></div></td>
                </tr>
              ))
            ) : filteredPrices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-secondary">
                  {searchQuery ? `No results found for "${searchQuery}"` : "No prices recorded today."}
                </td>
              </tr>
            ) : (
              filteredPrices.map((entry, idx) => {
                const diff = entry.previous_price ? Number(entry.price) - Number(entry.previous_price) : null;
                const perc = diff && entry.previous_price ? (Math.abs(diff) / entry.previous_price) * 100 : null;
                
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4" data-label="Material">
                      <span className="font-medium text-primary">{entry.raw_materials?.name_en || '-'}</span>
                      {entry.raw_materials?.name_hi && <span className="text-secondary font-normal ml-1">({entry.raw_materials?.name_hi})</span>}
                    </td>
                    <td className="px-6 py-4 text-secondary" data-label="Quality/Grade">{entry.material_quality_grades?.grade_name || 'Standard'}</td>
                    <td className="px-6 py-4 text-secondary" data-label="Broker">{entry.brokers?.broker_name || '-'}</td>
                    <td className="px-6 py-4 text-secondary" data-label="Location">{entry.market_location || '-'}</td>
                    <td className="px-6 py-4 text-right" data-label="Price (₹)">
                      <div className="font-semibold text-primary flex items-center justify-end sm:justify-end gap-2">
                        {diff !== null && diff !== 0 && (
                          <span className={`flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded-md ${diff > 0 ? 'bg-red-50 text-danger' : 'bg-green-50 text-success'}`}>
                            {diff > 0 ? <TrendingUp size={12} className="mr-0.5"/> : <TrendingDown size={12} className="mr-0.5"/>}
                            {perc.toFixed(1)}%
                          </span>
                        )}
                        ₹{Number(entry.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-secondary text-sm" data-label="Unit">{entry.rm_units?.unit_name || '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
