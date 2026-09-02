import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Save, Plus, Trash2, Edit2, CheckCircle } from 'lucide-react';

const Configuration = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('materials'); // materials, brokers, settings
  
  const [materials, setMaterials] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [settings, setSettings] = useState({});
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mats, brks, sets] = await Promise.all([
        supabase.from('raw_materials').select('*').order('display_order'),
        supabase.from('brokers').select('*').order('broker_name'),
        supabase.from('raw_material_price_settings').select('*').limit(1).single()
      ]);

      setMaterials(mats.data || []);
      setBrokers(brks.data || []);
      if (sets.data) setSettings(sets.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSave = async () => {
    try {
      const { error } = await supabase
        .from('raw_material_price_settings')
        .update({
          whatsapp_reminder_time: settings.whatsapp_reminder_time,
          alert_threshold_percentage: settings.alert_threshold_percentage,
          default_selection_method: settings.default_selection_method,
          show_broker_in_report: settings.show_broker_in_report,
          show_previous_day_change: settings.show_previous_day_change
        })
        .eq('id', settings.id);
        
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Settings saved successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-secondary">Loading configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex border-b border-base">
        <button 
          className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'materials' ? 'text-primary border-b-2 border-primary' : 'text-secondary hover:text-primary'}`}
          onClick={() => setActiveTab('materials')}
        >
          Raw Materials
        </button>
        <button 
          className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'brokers' ? 'text-primary border-b-2 border-primary' : 'text-secondary hover:text-primary'}`}
          onClick={() => setActiveTab('brokers')}
        >
          Brokers
        </button>
        <button 
          className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'settings' ? 'text-primary border-b-2 border-primary' : 'text-secondary hover:text-primary'}`}
          onClick={() => setActiveTab('settings')}
        >
          General Settings
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
        }`}>
          <CheckCircle size={20} /> {message.text}
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="card bg-surface overflow-hidden">
          <div className="p-4 border-b border-base flex justify-between items-center bg-base/20">
             <h3 className="font-semibold">Raw Material Master</h3>
             <button className="btn btn-primary btn-sm flex items-center gap-2">
               <Plus size={16} /> Add Material
             </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-base/50 text-secondary">
              <tr>
                <th className="p-3">Name (EN)</th>
                <th className="p-3">Name (HI)</th>
                <th className="p-3">Category</th>
                <th className="p-3">Def. Unit</th>
                <th className="p-3">Daily Track</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {materials.map(m => (
                <tr key={m.id} className="hover:bg-base/30">
                  <td className="p-3 font-medium">{m.name_en}</td>
                  <td className="p-3 text-secondary">{m.name_hi}</td>
                  <td className="p-3 text-secondary">{m.category}</td>
                  <td className="p-3 text-secondary">{m.default_unit}</td>
                  <td className="p-3">
                    {m.daily_tracking_required 
                      ? <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded text-xs">Yes</span>
                      : <span className="px-2 py-0.5 bg-gray-500/10 text-gray-600 rounded text-xs">No</span>}
                  </td>
                  <td className="p-3">
                    {m.active 
                      ? <span className="px-2 py-0.5 bg-green-500/10 text-green-600 rounded text-xs">Active</span>
                      : <span className="px-2 py-0.5 bg-red-500/10 text-red-600 rounded text-xs">Inactive</span>}
                  </td>
                  <td className="p-3 flex justify-end gap-2">
                    <button className="btn-icon p-1.5 text-secondary hover:text-primary"><Edit2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'brokers' && (
        <div className="card bg-surface overflow-hidden">
          <div className="p-4 border-b border-base flex justify-between items-center bg-base/20">
             <h3 className="font-semibold">Broker Master</h3>
             <button className="btn btn-primary btn-sm flex items-center gap-2">
               <Plus size={16} /> Add Broker
             </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-base/50 text-secondary">
              <tr>
                <th className="p-3">Broker Name</th>
                <th className="p-3">Firm Name</th>
                <th className="p-3">Mobile</th>
                <th className="p-3">Location</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {brokers.map(b => (
                <tr key={b.id} className="hover:bg-base/30">
                  <td className="p-3 font-medium">{b.broker_name}</td>
                  <td className="p-3 text-secondary">{b.firm_name || '-'}</td>
                  <td className="p-3 text-secondary">{b.mobile}</td>
                  <td className="p-3 text-secondary">{b.market_location}</td>
                  <td className="p-3">
                    {b.active 
                      ? <span className="px-2 py-0.5 bg-green-500/10 text-green-600 rounded text-xs">Active</span>
                      : <span className="px-2 py-0.5 bg-red-500/10 text-red-600 rounded text-xs">Inactive</span>}
                  </td>
                  <td className="p-3 flex justify-end gap-2">
                    <button className="btn-icon p-1.5 text-secondary hover:text-primary"><Edit2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="card bg-surface max-w-2xl">
           <div className="p-4 border-b border-base bg-base/20">
             <h3 className="font-semibold">General Settings</h3>
           </div>
           <div className="p-6 space-y-6">
              
              <div className="grid grid-cols-2 gap-6 border-b border-base pb-6">
                <div>
                  <label className="text-sm font-medium text-secondary mb-1 block">Default Report Selection Method</label>
                  <select 
                    className="input w-full"
                    value={settings.default_selection_method || 'latest'}
                    onChange={e => setSettings({...settings, default_selection_method: e.target.value})}
                  >
                    <option value="latest">Latest Entered Price</option>
                    <option value="lowest">Lowest Quoted Price</option>
                    <option value="average">Average Price</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-secondary mb-1 block">Alert Threshold (%)</label>
                  <input 
                    type="number" 
                    className="input w-full" 
                    step="0.1"
                    value={settings.alert_threshold_percentage || 3}
                    onChange={e => setSettings({...settings, alert_threshold_percentage: e.target.value})}
                  />
                  <p className="text-xs text-secondary mt-1">Triggers 'Sharp' increase/decrease warning</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-sm text-secondary">WhatsApp Report Defaults</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Show Broker Name</label>
                    <p className="text-xs text-secondary">Include broker details in the final message</p>
                  </div>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-base text-primary focus:ring-primary"
                    checked={settings.show_broker_in_report || false}
                    onChange={e => setSettings({...settings, show_broker_in_report: e.target.checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Compare with Previous Day</label>
                    <p className="text-xs text-secondary">Show price difference versus yesterday</p>
                  </div>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-base text-primary focus:ring-primary"
                    checked={settings.show_previous_day_change || false}
                    onChange={e => setSettings({...settings, show_previous_day_change: e.target.checked})}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  className="btn btn-primary flex items-center gap-2"
                  onClick={handleSettingsSave}
                >
                  <Save size={16} /> Save Settings
                </button>
              </div>

           </div>
        </div>
      )}

    </div>
  );
};

export default Configuration;
