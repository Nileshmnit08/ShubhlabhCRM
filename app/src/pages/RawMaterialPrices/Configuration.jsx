import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Plus, Trash2, Edit2, CheckCircle, AlertTriangle } from 'lucide-react';

const Configuration = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('materials'); 
  
  const [materials, setMaterials] = useState([]);
  const [qualityGrades, setQualityGrades] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [units, setUnits] = useState([]);
  const [priceTypes, setPriceTypes] = useState([]);
  const [settings, setSettings] = useState({});
  
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mats, grades, brks, un, pt, sets] = await Promise.all([
        supabase.from('raw_materials').select(`*, default_unit:rm_units(unit_name)`).order('display_order'),
        supabase.from('material_quality_grades').select(`*, raw_materials(name_en)`).order('display_order'),
        supabase.from('brokers').select('*').order('broker_name'),
        supabase.from('rm_units').select('*').order('display_order'),
        supabase.from('rm_price_types').select('*').order('display_order'),
        supabase.from('raw_material_price_settings').select('*').limit(1).single()
      ]);

      setMaterials(mats.data || []);
      setQualityGrades(grades.data || []);
      setBrokers(brks.data || []);
      setUnits(un.data || []);
      setPriceTypes(pt.data || []);
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
      
      showMessage('success', 'Settings saved successfully.');
    } catch (error) {
      showMessage('error', 'Failed to save settings.');
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        Loading configuration...
      </div>
    );
  }

  const tabs = [
    { id: 'materials', label: 'Raw Materials' },
    { id: 'quality', label: 'Quality Parameters' },
    { id: 'brokers', label: 'Brokers' },
    { id: 'units', label: 'Units' },
    { id: 'price_types', label: 'Price Types' },
    { id: 'settings', label: 'General Settings' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex overflow-x-auto border-b border-base hide-scrollbar">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-secondary hover:text-primary'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {message.text}
        </div>
      )}

      {/* RAW MATERIALS TAB */}
      {activeTab === 'materials' && (
        <div className="card bg-surface overflow-hidden">
          <div className="p-4 border-b border-base flex justify-between items-center bg-base/20">
             <h3 className="font-semibold">Raw Material Master</h3>
             <button className="btn btn-primary btn-sm flex items-center gap-2">
               <Plus size={16} /> Add Material
             </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-base/50 text-secondary">
                <tr>
                  <th className="p-3 font-medium">Code</th>
                  <th className="p-3 font-medium">Name (EN/HI)</th>
                  <th className="p-3 font-medium">Category</th>
                  <th className="p-3 font-medium">Def. Unit</th>
                  <th className="p-3 font-medium">Daily Track</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {materials.map(m => (
                  <tr key={m.id} className="hover:bg-base/30">
                    <td className="p-3 text-secondary">{m.code || '-'}</td>
                    <td className="p-3">
                      <div className="font-medium">{m.name_en}</div>
                      <div className="text-xs text-secondary">{m.name_hi}</div>
                    </td>
                    <td className="p-3 text-secondary">{m.category}</td>
                    <td className="p-3 text-secondary">{m.default_unit?.unit_name || m.default_unit || '-'}</td>
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
                      <button className="btn-icon p-1.5 text-secondary hover:text-primary" title="Edit"><Edit2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUALITY PARAMETERS TAB */}
      {activeTab === 'quality' && (
        <div className="card bg-surface overflow-hidden">
          <div className="p-4 border-b border-base flex justify-between items-center bg-base/20">
             <h3 className="font-semibold">Quality & Grade Master</h3>
             <button className="btn btn-primary btn-sm flex items-center gap-2">
               <Plus size={16} /> Add Parameter
             </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-base/50 text-secondary">
                <tr>
                  <th className="p-3 font-medium">Material</th>
                  <th className="p-3 font-medium">Parameter/Grade</th>
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3 font-medium">Limits</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {qualityGrades.map(q => (
                  <tr key={q.id} className="hover:bg-base/30">
                    <td className="p-3 font-medium">{q.raw_materials?.name_en}</td>
                    <td className="p-3">
                      <div className="font-medium">{q.grade_name}</div>
                      {q.grade_name_hi && <div className="text-xs text-secondary">{q.grade_name_hi}</div>}
                    </td>
                    <td className="p-3 text-secondary">{q.parameter_type || 'Grade'}</td>
                    <td className="p-3 text-secondary">
                      {q.min_value || q.max_value 
                        ? `${q.min_value || 'Min'} - ${q.max_value || 'Max'} ${q.uom || ''}`
                        : 'N/A'
                      }
                    </td>
                    <td className="p-3">
                      {q.active 
                        ? <span className="px-2 py-0.5 bg-green-500/10 text-green-600 rounded text-xs">Active</span>
                        : <span className="px-2 py-0.5 bg-red-500/10 text-red-600 rounded text-xs">Inactive</span>}
                    </td>
                    <td className="p-3 flex justify-end gap-2">
                      <button className="btn-icon p-1.5 text-secondary hover:text-primary"><Edit2 size={16}/></button>
                    </td>
                  </tr>
                ))}
                {qualityGrades.length === 0 && (
                  <tr><td colSpan="6" className="p-4 text-center text-secondary">No quality parameters defined.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BROKERS TAB */}
      {activeTab === 'brokers' && (
        <div className="card bg-surface overflow-hidden">
          <div className="p-4 border-b border-base flex justify-between items-center bg-base/20">
             <h3 className="font-semibold">Broker Master</h3>
             <button className="btn btn-primary btn-sm flex items-center gap-2">
               <Plus size={16} /> Add Broker
             </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-base/50 text-secondary">
                <tr>
                  <th className="p-3 font-medium">Broker Name</th>
                  <th className="p-3 font-medium">Firm Name</th>
                  <th className="p-3 font-medium">Mobile / WhatsApp</th>
                  <th className="p-3 font-medium">Location</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {brokers.map(b => (
                  <tr key={b.id} className="hover:bg-base/30">
                    <td className="p-3 font-medium">{b.broker_name}</td>
                    <td className="p-3 text-secondary">{b.firm_name || '-'}</td>
                    <td className="p-3 text-secondary">
                      <div>{b.mobile}</div>
                      {b.whatsapp_number && b.whatsapp_number !== b.mobile && <div className="text-xs">WA: {b.whatsapp_number}</div>}
                    </td>
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
        </div>
      )}

      {/* UNITS TAB */}
      {activeTab === 'units' && (
        <div className="card bg-surface overflow-hidden max-w-4xl">
          <div className="p-4 border-b border-base flex justify-between items-center bg-base/20">
             <h3 className="font-semibold">Units Master</h3>
             <button className="btn btn-primary btn-sm flex items-center gap-2">
               <Plus size={16} /> Add Unit
             </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-base/50 text-secondary">
              <tr>
                <th className="p-3 font-medium">Order</th>
                <th className="p-3 font-medium">Unit Name</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {units.map(u => (
                <tr key={u.id} className="hover:bg-base/30">
                  <td className="p-3 text-secondary">{u.display_order}</td>
                  <td className="p-3 font-medium">{u.unit_name}</td>
                  <td className="p-3">
                    {u.active ? <span className="text-success">Active</span> : <span className="text-danger">Inactive</span>}
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

      {/* PRICE TYPES TAB */}
      {activeTab === 'price_types' && (
        <div className="card bg-surface overflow-hidden max-w-4xl">
          <div className="p-4 border-b border-base flex justify-between items-center bg-base/20">
             <h3 className="font-semibold">Price Types Master</h3>
             <button className="btn btn-primary btn-sm flex items-center gap-2">
               <Plus size={16} /> Add Price Type
             </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-base/50 text-secondary">
              <tr>
                <th className="p-3 font-medium">Order</th>
                <th className="p-3 font-medium">Type Name</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {priceTypes.map(pt => (
                <tr key={pt.id} className="hover:bg-base/30">
                  <td className="p-3 text-secondary">{pt.display_order}</td>
                  <td className="p-3 font-medium">{pt.type_name}</td>
                  <td className="p-3">
                    {pt.active ? <span className="text-success">Active</span> : <span className="text-danger">Inactive</span>}
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

      {/* GENERAL SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="card bg-surface max-w-2xl">
           <div className="p-4 border-b border-base bg-base/20">
             <h3 className="font-semibold">General Settings</h3>
           </div>
           <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-base pb-6">
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
                <h4 className="font-medium text-sm text-secondary uppercase tracking-wider">WhatsApp Report Defaults</h4>
                
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
