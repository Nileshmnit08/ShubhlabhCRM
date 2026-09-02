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

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

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
        <div className="card bg-white border border-base rounded-xl shadow-sm max-w-2xl overflow-hidden">
           <MasterDataSectionHeader 
             title="General Settings" 
             description="Manage reporting defaults and operational thresholds." 
           />
           {loading ? (
             <div className="p-6 animate-pulse space-y-6">
                <div className="h-10 bg-base/50 rounded w-full"></div>
                <div className="h-10 bg-base/50 rounded w-full"></div>
             </div>
           ) : (
             <div className="p-6 space-y-8">
                
                {/* Group 1 */}
                <div>
                  <h4 className="font-semibold text-sm text-primary uppercase tracking-wider mb-4 pb-2 border-b border-base">Report Preferences</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-secondary mb-1.5 block">Default Report Selection Method</label>
                      <select 
                        className="input w-full bg-surface border-base/80 rounded-lg focus:border-emerald-500 transition-colors"
                        value={settings.default_selection_method || 'latest'}
                        onChange={e => setSettings({...settings, default_selection_method: e.target.value})}
                      >
                        <option value="latest">Latest Entered Price</option>
                        <option value="lowest">Lowest Quoted Price</option>
                        <option value="average">Average Price</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-secondary mb-1.5 block">Alert Threshold (%)</label>
                      <input 
                        type="number" 
                        className="input w-full bg-surface border-base/80 rounded-lg focus:border-emerald-500 transition-colors" 
                        step="0.1"
                        value={settings.alert_threshold_percentage || 3}
                        onChange={e => setSettings({...settings, alert_threshold_percentage: e.target.value})}
                      />
                      <p className="text-xs text-muted mt-1.5">Triggers 'Sharp' increase/decrease warning</p>
                    </div>
                  </div>
                </div>

                {/* Group 2 */}
                <div>
                  <h4 className="font-semibold text-sm text-primary uppercase tracking-wider mb-4 pb-2 border-b border-base">WhatsApp Defaults</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-base/10 rounded-lg border border-base/50">
                      <div>
                        <label className="font-medium text-sm text-primary">Show Broker Name</label>
                        <p className="text-xs text-secondary mt-0.5">Include broker details in the final message</p>
                      </div>
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-base/80 text-emerald-600 focus:ring-emerald-500 bg-surface"
                        checked={settings.show_broker_in_report || false}
                        onChange={e => setSettings({...settings, show_broker_in_report: e.target.checked})}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-base/10 rounded-lg border border-base/50">
                      <div>
                        <label className="font-medium text-sm text-primary">Compare with Previous Day</label>
                        <p className="text-xs text-secondary mt-0.5">Show price difference versus yesterday</p>
                      </div>
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-base/80 text-emerald-600 focus:ring-emerald-500 bg-surface"
                        checked={settings.show_previous_day_change || false}
                        onChange={e => setSettings({...settings, show_previous_day_change: e.target.checked})}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex justify-end border-t border-base">
                  <button 
                    className="btn btn-primary flex items-center gap-2 px-6 py-2.5 shadow-sm"
                    onClick={handleSettingsSave}
                  >
                    <Save size={16} /> Save Changes
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
