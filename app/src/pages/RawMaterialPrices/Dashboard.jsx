import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  AlertCircle,
  Clock,
  Filter
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    updatedToday: 0,
    totalEntriesToday: 0,
    pendingToday: 0,
    highestIncrease: null,
    highestDecrease: null,
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
          material_quality_grades (grade_name)
        `)
        .eq('entry_date', today)
        .eq('is_deleted', false);

      const updatedMats = new Set((entries || []).map(e => e.raw_material_id));
      const trackingMats = (mats || []).filter(m => m.daily_tracking_required);
      
      setStats({
        updatedToday: updatedMats.size,
        totalEntriesToday: entries?.length || 0,
        pendingToday: Math.max(0, trackingMats.length - updatedMats.size),
        highestIncrease: null, // Would require previous day comparison logic
        highestDecrease: null,
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

  const handleMaterialChange = (e) => {
    const id = e.target.value;
    setSelectedMaterial(id);
    fetchTrendData(id);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-surface p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-secondary">Materials Updated Today</p>
              <h3 className="text-2xl font-bold">{stats.updatedToday}</h3>
            </div>
          </div>
        </div>
        
        <div className="card bg-surface p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm text-secondary">Total Entries Today</p>
              <h3 className="text-2xl font-bold">{stats.totalEntriesToday}</h3>
            </div>
          </div>
        </div>

        <div className="card bg-surface p-5 border-l-4 border-amber-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm text-secondary">Pending Tracking</p>
              <h3 className="text-2xl font-bold">{stats.pendingToday}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Entries Table */}
        <div className="lg:col-span-2 card bg-surface flex flex-col">
          <div className="p-4 border-b border-base flex justify-between items-center">
            <h3 className="font-semibold text-lg">Today's Market Prices</h3>
            <button className="btn btn-secondary btn-sm">
              <Filter size={16} /> Filters
            </button>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-base/50 text-secondary text-sm">
                  <th className="p-3 font-medium">Material</th>
                  <th className="p-3 font-medium">Quality/Grade</th>
                  <th className="p-3 font-medium">Broker</th>
                  <th className="p-3 font-medium text-right">Price (₹)</th>
                  <th className="p-3 font-medium">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {todayPrices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-secondary">
                      No price entries for today yet.
                    </td>
                  </tr>
                ) : (
                  todayPrices.map(entry => (
                    <tr key={entry.id} className="hover:bg-base/30 transition-colors">
                      <td className="p-3">
                        <div className="font-medium">{entry.raw_materials?.name_en}</div>
                        <div className="text-xs text-secondary">{entry.raw_materials?.name_hi}</div>
                      </td>
                      <td className="p-3 text-sm text-secondary">{entry.material_quality_grades?.grade_name || entry.quality_description || '-'}</td>
                      <td className="p-3 text-sm">{entry.brokers?.broker_name}</td>
                      <td className="p-3 text-right font-semibold">₹{Number(entry.price).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-sm text-secondary">{entry.unit}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="card bg-surface flex flex-col">
          <div className="p-4 border-b border-base">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Price Trend (30 Days)</h3>
            </div>
            <select 
              className="input w-full bg-base"
              value={selectedMaterial || ''}
              onChange={handleMaterialChange}
            >
              {materials.map(m => (
                <option key={m.id} value={m.id}>{m.name_en} ({m.name_hi})</option>
              ))}
            </select>
          </div>
          <div className="p-4 flex-1 min-h-[300px]">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 12, fill: 'var(--text-secondary)'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 12, fill: 'var(--text-secondary)'}} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                    itemStyle={{ color: 'var(--primary)' }}
                    formatter={(value) => [`₹${value}`, 'Price']}
                  />
                  <Line type="monotone" dataKey="price" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-secondary text-sm">
                No trend data available for selected material.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
