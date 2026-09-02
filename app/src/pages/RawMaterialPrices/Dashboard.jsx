import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format, subDays } from 'date-fns';

import PriceKpiCards from './components/PriceKpiCards';
import TodaysMarketPricesTable from './components/TodaysMarketPricesTable';
import PriceTrendChart from './components/PriceTrendChart';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    updatedToday: 0,
    totalEntriesToday: 0,
    pendingToday: 0,
  });
  const [todayPrices, setTodayPrices] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [materials, setMaterials] = useState([]);

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
          fetchTrendData(mats[0].id);
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

      const updatedMats = new Set((entries || []).map(e => e.raw_material_id));
      const trackingMats = (mats || []).filter(m => m.daily_tracking_required);
      
      setStats({
        updatedToday: updatedMats.size,
        totalEntriesToday: entries?.length || 0,
        pendingToday: Math.max(0, trackingMats.length - updatedMats.size),
      });

      setTodayPrices(entries || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async (materialId) => {
    if (!materialId) return;
    try {
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      
      const { data } = await supabase
        .from('raw_material_price_entries')
        .select('entry_date, price, brokers(broker_name)')
        .eq('raw_material_id', materialId)
        .eq('is_deleted', false)
        .gte('entry_date', thirtyDaysAgo)
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
        price: Math.round(g.sum / g.count)
      }));

      setTrendData(chartData);
    } catch (error) {
      console.error('Error fetching trend data', error);
    }
  };

  const handleMaterialChange = (id) => {
    setSelectedMaterial(id);
    fetchTrendData(id);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-secondary">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mr-3 mb-4"></div>
        <p className="font-medium text-lg">Loading dashboard...</p>
        <p className="text-sm opacity-70 mt-1">Fetching latest market prices</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-8">
      {/* KPI Cards Component */}
      <PriceKpiCards stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
        {/* Today's Market Prices */}
        <div className="xl:col-span-2 flex">
          <TodaysMarketPricesTable prices={todayPrices} />
        </div>

        {/* 30-Day Trend Chart */}
        <div className="xl:col-span-1 flex">
          <PriceTrendChart 
            materials={materials} 
            selectedMaterial={selectedMaterial}
            onMaterialChange={handleMaterialChange}
            trendData={trendData}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
