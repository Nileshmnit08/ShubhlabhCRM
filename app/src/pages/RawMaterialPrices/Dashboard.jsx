import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format, subDays } from 'date-fns';

import PriceKpiCards from './components/PriceKpiCards';
import TodaysMarketPricesTable from './components/TodaysMarketPricesTable';
import PriceTrendChart from './components/PriceTrendChart';
import DashboardQuickActions from './components/DashboardQuickActions';
import AttentionCenter from './components/AttentionCenter';
import { AlertTriangle, TrendingUp, TrendingDown, Clock } from 'lucide-react';

const Dashboard = () => {
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
  const [trendData, setTrendData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [timeRange, setTimeRange] = useState(30);

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
      
      if (mats) {
        setMaterials(mats);
        if (mats.length > 0 && !selectedMaterial) {
          setSelectedMaterial(mats[0].id);
          fetchTrendData(mats[0].id, 30);
        }
      }

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
          // Using quality_grade_id or 'null' to ensure safe mapping
          const key = `${p.raw_material_id}-${p.broker_id}-${p.quality_grade_id || 'null'}`;
          if (!previousPricesMap[key]) {
             previousPricesMap[key] = p; // since it's ordered by desc, the first we see is the latest
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
          description: `Missing updates for: ${missingMatNames}${remainder}. These materials are configured to require mandatory daily tracking.`,
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
              const color = diff > 0 ? 'text-red-600' : 'text-emerald-600';
              const bg = diff > 0 ? 'bg-red-100' : 'bg-emerald-100';

              newAlerts.push({
                title: `Sharp Price Movement: ${matName}`,
                description: `The price quoted by ${entry.brokers?.broker_name || 'Broker'} has ${direction} by ${pct.toFixed(1)}% (₹${Math.abs(diff).toFixed(2)}) compared to the last available price. This exceeds the ${threshold}% alert threshold.`,
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

  const fetchTrendData = async (materialId, days = timeRange) => {
    if (!materialId) return;
    try {
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      
      const { data } = await supabase
        .from('raw_material_price_entries')
        .select('entry_date, price, brokers(broker_name)')
        .eq('raw_material_id', materialId)
        .eq('is_deleted', false)
        .gte('entry_date', startDate)
        .order('entry_date');

      // Group by date to average if multiple entries exist per day
      const grouped = (data || []).reduce((acc, curr) => {
        if (!acc[curr.entry_date]) {
          acc[curr.entry_date] = { date: curr.entry_date, sum: 0, count: 0 };
        }
        acc[curr.entry_date].sum += Number(curr.price);
        acc[curr.entry_date].count += 1;
        return acc;
      }, {});

      const chartData = Object.values(grouped).map(g => ({
        date: format(new Date(g.date), 'dd MMM'),
        price: Math.round(g.sum / g.count),
        rawDate: g.date
      })).sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));

      setTrendData(chartData);
    } catch (error) {
      console.error('Error fetching trend data', error);
    }
  };

  const handleMaterialChange = (id) => {
    setSelectedMaterial(id);
    fetchTrendData(id, timeRange);
  };

  const handleTimeRangeChange = (days) => {
    setTimeRange(days);
    fetchTrendData(selectedMaterial, days);
  };

  return (
    <div className="animate-fade-in pb-8">
      {/* Quick Actions Component */}
      <DashboardQuickActions />

      {/* KPI Cards Component */}
      <PriceKpiCards stats={stats} loading={loading} />

      {/* Attention Center */}
      <AttentionCenter alerts={alerts} loading={loading} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
        {/* Today's Market Prices */}
        <div className="xl:col-span-2 flex">
          <TodaysMarketPricesTable prices={todayPrices} loading={loading} />
        </div>

        {/* 30-Day Trend Chart */}
        <div className="xl:col-span-1 flex">
          <PriceTrendChart 
            materials={materials} 
            selectedMaterial={selectedMaterial}
            onMaterialChange={handleMaterialChange}
            trendData={trendData}
            loading={loading}
            timeRange={timeRange}
            onTimeRangeChange={handleTimeRangeChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
