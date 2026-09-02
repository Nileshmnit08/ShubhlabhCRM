import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Edit2, CheckCircle, AlertTriangle, PackageOpen, LayoutList, Users, Ruler, IndianRupee } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import ConfigurationNav from './components/ConfigurationNav';
import MasterDataSectionHeader from './components/MasterDataSectionHeader';
import StatusBadge from './components/StatusBadge';
import EmptyState from './components/EmptyState';
import MasterDataTable from './components/MasterDataTable';

const Configuration = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'raw-materials';

  const [loading, setLoading] = useState(true);
  
  const [materials, setMaterials] = useState([]);
  const [qualityGrades, setQualityGrades] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [units, setUnits] = useState([]);
  const [priceTypes, setPriceTypes] = useState([]);
  const [settings, setSettings] = useState({});
  const [originalSettings, setOriginalSettings] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
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
      if (sets.data) {
        setSettings(sets.data);
        setOriginalSettings(sets.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSave = async () => {
    setIsSaving(true);
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
      
      setOriginalSettings(settings);
      showMessage('success', 'General settings saved successfully.');
    } catch (error) {
      showMessage('error', 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const isDirty = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const renderSkeleton = (columns) => (
    <MasterDataTable>
      <thead className="bg-slate-50 text-secondary border-b border-base">
        <tr>
          {Array(columns).fill(0).map((_, idx) => (
            <th key={idx} className="p-4 font-semibold uppercase tracking-wider text-xs">Loading...</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-base">
        {[1, 2, 3, 4, 5].map(i => (
          <tr key={i} className="animate-pulse">
            {Array(columns).fill(0).map((_, idx) => (
              <td key={idx} className="p-4"><div className="h-4 bg-base/50 rounded w-full max-w-[120px]"></div></td>
            ))}
          </tr>
        ))}
      </tbody>
    </MasterDataTable>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      <ConfigurationNav activeTab={activeTab} onTabChange={handleTabChange} />

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {message.text}
        </div>
      )}

      {/* RAW MATERIALS TAB */}
      {activeTab === 'raw-materials' && (
        <div className="card bg-white border border-base rounded-xl shadow-sm overflow-hidden">
          <MasterDataSectionHeader 
            title="Raw Material Master" 
            description="Manage all cattle-feed raw materials and their default properties." 
            buttonText="Add Material" 
          />
          {loading ? renderSkeleton(7) : materials.length === 0 ? (
            <EmptyState icon={PackageOpen} title="No Raw Materials" description="You haven't defined any raw materials yet." actionText="Add Material" />
          ) : (
            <MasterDataTable>
              <thead className="bg-slate-50 text-secondary border-b border-base">
                <tr>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs w-24">Code</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Name (EN/HI)</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Category</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Def. Unit</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Daily Track</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {materials.map(m => (
                  <tr key={m.id} className="hover:bg-base/30 transition-colors">
                    <td className="p-4 text-secondary font-medium" data-label="Code">{m.code || '-'}</td>
                    <td className="p-4" data-label="Name (EN/HI)">
                      <div className="font-semibold text-primary">{m.name_en}</div>
                      <div className="text-xs text-secondary mt-0.5">{m.name_hi}</div>
                    </td>
                    <td className="p-4 text-secondary" data-label="Category">{m.category}</td>
                    <td className="p-4 text-secondary" data-label="Def. Unit">{m.default_unit?.unit_name || m.default_unit || '-'}</td>
                    <td className="p-4" data-label="Daily Track">
                      {m.daily_tracking_required 
                        ? <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-medium">Yes</span>
                        : <span className="px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 rounded text-xs font-medium">No</span>}
                    </td>
                    <td className="p-4" data-label="Status">
                      <StatusBadge active={m.active} />
                    </td>
                    <td className="p-4 flex justify-end gap-2" data-label="Actions">
                      <button className="btn-icon p-1.5 text-secondary hover:text-primary bg-base/50 hover:bg-base rounded-md transition-colors"><Edit2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </MasterDataTable>
          )}
        </div>
      )}

      {/* QUALITY PARAMETERS TAB */}
      {activeTab === 'quality-parameters' && (
        <div className="card bg-white border border-base rounded-xl shadow-sm overflow-hidden">
          <MasterDataSectionHeader 
            title="Quality & Grade Master" 
            description="Define specific quality parameters or grades for raw materials." 
            buttonText="Add Parameter" 
          />
          {loading ? renderSkeleton(6) : qualityGrades.length === 0 ? (
            <EmptyState icon={LayoutList} title="No Quality Parameters" description="You haven't defined any quality grades or parameters." actionText="Add Parameter" />
          ) : (
            <MasterDataTable>
              <thead className="bg-slate-50 text-secondary border-b border-base">
                <tr>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Material</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Parameter/Grade</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Type</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Limits</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {qualityGrades.map(q => (
                  <tr key={q.id} className="hover:bg-base/30 transition-colors">
                    <td className="p-4 font-medium text-primary" data-label="Material">{q.raw_materials?.name_en}</td>
                    <td className="p-4" data-label="Parameter/Grade">
                      <div className="font-semibold text-primary">{q.grade_name}</div>
                      {q.grade_name_hi && <div className="text-xs text-secondary mt-0.5">{q.grade_name_hi}</div>}
                    </td>
                    <td className="p-4 text-secondary" data-label="Type">{q.parameter_type || 'Grade'}</td>
                    <td className="p-4 text-secondary" data-label="Limits">
                      {q.min_value || q.max_value 
                        ? `${q.min_value || 'Min'} - ${q.max_value || 'Max'} ${q.uom || ''}`
                        : 'N/A'
                      }
                    </td>
                    <td className="p-4" data-label="Status">
                      <StatusBadge active={q.active} />
                    </td>
                    <td className="p-4 flex justify-end gap-2" data-label="Actions">
                      <button className="btn-icon p-1.5 text-secondary hover:text-primary bg-base/50 hover:bg-base rounded-md transition-colors"><Edit2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </MasterDataTable>
          )}
        </div>
      )}

      {/* BROKERS TAB */}
      {activeTab === 'brokers' && (
        <div className="card bg-white border border-base rounded-xl shadow-sm overflow-hidden">
          <MasterDataSectionHeader 
            title="Broker Master" 
            description="Manage brokers and their contact information." 
            buttonText="Add Broker" 
          />
          {loading ? renderSkeleton(6) : brokers.length === 0 ? (
            <EmptyState icon={Users} title="No Brokers" description="Add brokers to start tracking prices from them." actionText="Add Broker" />
          ) : (
            <MasterDataTable>
              <thead className="bg-slate-50 text-secondary border-b border-base">
                <tr>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Broker Name</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Firm Name</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Mobile / WhatsApp</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Location</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {brokers.map(b => (
                  <tr key={b.id} className="hover:bg-base/30 transition-colors">
                    <td className="p-4 font-semibold text-primary" data-label="Broker Name">{b.broker_name}</td>
                    <td className="p-4 text-secondary" data-label="Firm Name">{b.firm_name || '-'}</td>
                    <td className="p-4" data-label="Contact">
                      <div className="font-medium text-secondary">{b.mobile}</div>
                      {b.whatsapp_number && b.whatsapp_number !== b.mobile && <div className="text-xs text-muted mt-0.5 flex items-center gap-1">WA: {b.whatsapp_number}</div>}
                    </td>
                    <td className="p-4 text-secondary" data-label="Location">{b.market_location}</td>
                    <td className="p-4" data-label="Status">
                      <StatusBadge active={b.active} />
                    </td>
                    <td className="p-4 flex justify-end gap-2" data-label="Actions">
                      <button className="btn-icon p-1.5 text-secondary hover:text-primary bg-base/50 hover:bg-base rounded-md transition-colors"><Edit2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </MasterDataTable>
          )}
        </div>
      )}

      {/* UNITS TAB */}
      {activeTab === 'units' && (
        <div className="card bg-white border border-base rounded-xl shadow-sm overflow-hidden max-w-4xl">
          <MasterDataSectionHeader 
            title="Units Master" 
            description="Manage units of measurement (e.g., Kg, Quintal, Ton)." 
            buttonText="Add Unit" 
          />
          {loading ? renderSkeleton(4) : units.length === 0 ? (
            <EmptyState icon={Ruler} title="No Units" description="Define standard units for your raw materials." actionText="Add Unit" />
          ) : (
            <MasterDataTable>
              <thead className="bg-slate-50 text-secondary border-b border-base">
                <tr>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs w-24">Order</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Unit Name</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs w-32">Status</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {units.map(u => (
                  <tr key={u.id} className="hover:bg-base/30 transition-colors">
                    <td className="p-4 text-secondary tabular-nums" data-label="Order">{u.display_order}</td>
                    <td className="p-4 font-semibold text-primary" data-label="Unit Name">{u.unit_name}</td>
                    <td className="p-4" data-label="Status">
                      <StatusBadge active={u.active} />
                    </td>
                    <td className="p-4 flex justify-end gap-2" data-label="Actions">
                      <button className="btn-icon p-1.5 text-secondary hover:text-primary bg-base/50 hover:bg-base rounded-md transition-colors"><Edit2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </MasterDataTable>
          )}
        </div>
      )}

      {/* PRICE TYPES TAB */}
      {activeTab === 'price-types' && (
        <div className="card bg-white border border-base rounded-xl shadow-sm overflow-hidden max-w-4xl">
          <MasterDataSectionHeader 
            title="Price Types Master" 
            description="Create and manage price classifications used in daily market entries." 
            buttonText="Add Price Type" 
          />
          {loading ? renderSkeleton(4) : priceTypes.length === 0 ? (
            <EmptyState icon={IndianRupee} title="No Price Types" description="Define types of prices you receive from brokers (e.g., Factory Delivery, Ex-Mill)." actionText="Add Price Type" />
          ) : (
            <MasterDataTable>
              <thead className="bg-slate-50 text-secondary border-b border-base">
                <tr>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs w-24">Order</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Type Name</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs w-32">Status</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {priceTypes.map(pt => (
                  <tr key={pt.id} className="hover:bg-base/30 transition-colors">
                    <td className="p-4 text-secondary tabular-nums" data-label="Order">{pt.display_order}</td>
                    <td className="p-4 font-semibold text-primary" data-label="Type Name">{pt.type_name}</td>
                    <td className="p-4" data-label="Status">
                      <StatusBadge active={pt.active} />
                    </td>
                    <td className="p-4 flex justify-end gap-2" data-label="Actions">
                      <button className="btn-icon p-1.5 text-secondary hover:text-primary bg-base/50 hover:bg-base rounded-md transition-colors"><Edit2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </MasterDataTable>
          )}
        </div>
      )}

      {/* GENERAL SETTINGS TAB */}
      {activeTab === 'general' && (
        <div className="max-w-[1100px] w-full mx-auto">
           {loading ? (
             <div className="p-6 animate-pulse space-y-6 card bg-white border border-base rounded-xl shadow-sm">
                <div className="h-10 bg-base/50 rounded w-full"></div>
                <div className="h-10 bg-base/50 rounded w-full"></div>
             </div>
           ) : (
             <div className="bg-transparent space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  
                  {/* Card 1: Report Preferences */}
                  <div className="card bg-white border border-base rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="p-6 border-b border-base bg-white">
                      <h4 className="font-semibold text-lg text-primary tracking-tight">Report Preferences</h4>
                      <p className="text-sm text-secondary mt-1">Choose how prices are selected and monitored in reports.</p>
                    </div>
                    <div className="p-6 space-y-6 flex-1">
                      <div>
                        <label className="text-sm font-medium text-primary mb-1 block">Default report price</label>
                        <p className="text-sm text-secondary mb-3">Choose the price used by default when generating reports.</p>
                        <select 
                          className="input w-full bg-surface border-base/80 rounded-lg focus:border-emerald-500 transition-colors h-[42px]"
                          value={settings.default_selection_method || 'latest'}
                          onChange={e => setSettings({...settings, default_selection_method: e.target.value})}
                        >
                          <option value="latest">Latest Entered Price</option>
                          <option value="lowest">Lowest Quoted Price</option>
                          <option value="average">Average Price</option>
                        </select>
                      </div>
                      <div className="pt-2">
                        <label className="text-sm font-medium text-primary mb-1 block">Sharp movement alert threshold</label>
                        <p className="text-sm text-secondary mb-3">Show a warning when the price changes by this percentage or more from the previous entry.</p>
                        <div className="relative">
                          <input 
                            type="number" 
                            className="input w-full bg-surface border-base/80 rounded-lg focus:border-emerald-500 transition-colors h-[42px] pr-10" 
                            step="0.1"
                            min="0.1"
                            value={settings.alert_threshold_percentage || ''}
                            onChange={e => setSettings({...settings, alert_threshold_percentage: e.target.value})}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary font-medium pointer-events-none">%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: WhatsApp Defaults */}
                  <div className="card bg-white border border-base rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="p-6 border-b border-base bg-white">
                      <h4 className="font-semibold text-lg text-primary tracking-tight">WhatsApp Defaults</h4>
                      <p className="text-sm text-secondary mt-1">Control the information included in generated price updates.</p>
                    </div>
                    <div className="flex-1 flex flex-col divide-y divide-base bg-white">
                      {/* Toggle 1 */}
                      <label className="flex items-start sm:items-center justify-between p-6 cursor-pointer hover:bg-base/30 transition-colors group">
                        <div className="pr-4">
                          <span className="font-medium text-[15px] text-primary block mb-1">Show Broker Name</span>
                          <span className="text-sm text-secondary">Include the broker name alongside each quoted price in WhatsApp updates.</span>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-1 sm:mt-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={settings.show_broker_in_report || false}
                            onChange={e => setSettings({...settings, show_broker_in_report: e.target.checked})}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 shadow-inner"></div>
                        </div>
                      </label>

                      {/* Toggle 2 */}
                      <label className="flex items-start sm:items-center justify-between p-6 cursor-pointer hover:bg-base/30 transition-colors group">
                        <div className="pr-4">
                          <span className="font-medium text-[15px] text-primary block mb-1">Compare with Previous Day</span>
                          <span className="text-sm text-secondary">Show the increase or decrease compared with the previous day’s price.</span>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-1 sm:mt-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={settings.show_previous_day_change || false}
                            onChange={e => setSettings({...settings, show_previous_day_change: e.target.checked})}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 shadow-inner"></div>
                        </div>
                      </label>
                    </div>
                  </div>

                </div>

                {/* Sticky Action Bar */}
                <div className="sticky bottom-0 z-10 -mx-4 sm:mx-0 p-4 sm:p-5 mt-6 bg-white/95 backdrop-blur-sm border-t border-base shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sm:rounded-xl sm:border flex justify-end">
                  <button 
                    className="btn btn-primary flex items-center gap-2 px-6 py-2.5 shadow-sm min-w-[140px] justify-center w-full sm:w-auto"
                    onClick={handleSettingsSave}
                    disabled={!isDirty || isSaving}
                  >
                    {isSaving ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <><Save size={16} /> Save Changes</>
                    )}
                  </button>
                </div>
             </div>
           )}
        </div>
      )}

    </div>
  );
};

export default Configuration;
