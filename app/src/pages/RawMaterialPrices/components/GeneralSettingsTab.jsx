import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Save, AlertCircle, RefreshCw, Settings, ShieldCheck, Bell, Monitor, Database } from 'lucide-react';
import MasterDataSectionHeader from './MasterDataSectionHeader';

export default function GeneralSettingsTab({ settings, loading, onRefresh, showMessage }) {
  const [formData, setFormData] = useState({
    id: null,
    whatsapp_reminder_time: '18:00:00',
    timezone: 'Asia/Kolkata',
    alert_threshold_percentage: 3.00,
    default_selection_method: 'latest',
    show_broker_in_report: false,
    show_previous_day_change: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Initialize form data when settings arrive
  useEffect(() => {
    if (settings) {
      setFormData({
        id: settings.id,
        whatsapp_reminder_time: settings.whatsapp_reminder_time || '18:00:00',
        timezone: settings.timezone || 'Asia/Kolkata',
        alert_threshold_percentage: settings.alert_threshold_percentage || 3.00,
        default_selection_method: settings.default_selection_method || 'latest',
        show_broker_in_report: !!settings.show_broker_in_report,
        show_previous_day_change: !!settings.show_previous_day_change
      });
      setIsDirty(false);
    }
  }, [settings]);

  // Unsaved changes protection (Browser level)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        const msg = "You have unsaved changes. Are you sure you want to leave?";
        e.returnValue = msg;
        return msg;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      if (!formData.id) throw new Error("No settings record found to update.");

      const payload = {
        whatsapp_reminder_time: formData.whatsapp_reminder_time,
        timezone: formData.timezone,
        alert_threshold_percentage: Number(formData.alert_threshold_percentage),
        default_selection_method: formData.default_selection_method,
        show_broker_in_report: formData.show_broker_in_report,
        show_previous_day_change: formData.show_previous_day_change
      };

      const { error } = await supabase.from('raw_material_price_settings').update(payload).eq('id', formData.id);
      if (error) throw error;

      showMessage('success', 'General settings saved successfully.');
      setIsDirty(false);
      onRefresh();
    } catch (err) {
      showMessage('error', err.message || 'An error occurred while saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (settings) {
      setFormData({
        id: settings.id,
        whatsapp_reminder_time: settings.whatsapp_reminder_time || '18:00:00',
        timezone: settings.timezone || 'Asia/Kolkata',
        alert_threshold_percentage: settings.alert_threshold_percentage || 3.00,
        default_selection_method: settings.default_selection_method || 'latest',
        show_broker_in_report: !!settings.show_broker_in_report,
        show_previous_day_change: !!settings.show_previous_day_change
      });
      setIsDirty(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <div className="page-header">
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <div>
              <h1>General Settings</h1>
              <p className="text-secondary" style={{marginTop: '0.25rem'}}>
                Configure module-wide settings, default values, and operational rules.
              </p>
            </div>
          </div>
        </div>
        <div className="glass-panel" style={{padding: '2rem'}}>
          <div className="space-y-8">
             {[1,2,3].map(i => (
               <div key={i} className="space-y-4">
                 <div className="h-6 w-48 bg-slate-100 rounded animate-pulse"></div>
                 <div className="h-12 bg-slate-50 rounded-lg animate-pulse border border-base/50"></div>
               </div>
             ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto relative">
      <div className="page-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div>
            <h1>General Settings</h1>
            <p className="text-secondary" style={{marginTop: '0.25rem'}}>
              Configure module-wide settings, default values, and operational rules.
            </p>
          </div>
        </div>
      </div>
      
      {/* Sticky Save Bar if dirty */}
      {isDirty && (
        <div className="sticky top-0 z-20 bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle size={18} />
            <span className="text-sm font-semibold">You have unsaved changes.</span>
          </div>
          <div className="flex gap-3">
            <button 
              type="button" 
              className="btn btn-outline bg-white border-amber-200 text-amber-800 hover:bg-amber-100 px-4 py-1.5 text-sm"
              onClick={handleDiscard}
            >
              Discard
            </button>
            <button 
              type="button" 
              className="btn bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 text-sm shadow-sm flex items-center gap-1.5"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{padding: '2rem'}}>
        <form onSubmit={handleSave} className="space-y-10">
          
          {/* Price Entry Rules */}
          <section>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-base">
              <Settings size={18} className="text-emerald-600" />
              <h3 className="font-bold text-lg text-primary">Price Entry Rules</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-5 rounded-xl border border-base">
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">Price Fluctuation Alert Threshold (%)</label>
                <p className="text-xs text-muted mb-2">Triggers a warning if daily price moves beyond this percentage.</p>
                <input 
                  type="number" 
                  step="0.01"
                  className="input w-full md:w-64 shadow-sm" 
                  value={formData.alert_threshold_percentage}
                  onChange={(e) => handleChange('alert_threshold_percentage', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Approval Rules */}
          <section>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-base">
              <ShieldCheck size={18} className="text-blue-600" />
              <h3 className="font-bold text-lg text-primary">Approval Rules</h3>
            </div>
            <div className="bg-slate-50/50 p-6 rounded-xl border border-base border-dashed flex flex-col items-center text-center">
               <ShieldCheck size={32} className="text-slate-300 mb-2" />
               <p className="text-sm font-medium text-secondary">Approval workflows are disabled.</p>
               <p className="text-xs text-muted max-w-sm mt-1">Automatic publishing is enabled. Approval workflows and multi-tier verification are not currently active for this environment.</p>
            </div>
          </section>

          {/* Notifications */}
          <section>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-base">
              <Bell size={18} className="text-orange-500" />
              <h3 className="font-bold text-lg text-primary">Notifications</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-5 rounded-xl border border-base">
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">WhatsApp Reminder Time</label>
                <p className="text-xs text-muted mb-2">Default time to generate daily WhatsApp updates.</p>
                <input 
                  type="time" 
                  className="input w-full md:w-64 shadow-sm" 
                  value={formData.whatsapp_reminder_time}
                  onChange={(e) => handleChange('whatsapp_reminder_time', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">System Timezone</label>
                <p className="text-xs text-muted mb-2">Timezone used for timestamps and reminders.</p>
                <select 
                  className="input w-full md:w-64 shadow-sm"
                  value={formData.timezone}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                >
                  <option value="Asia/Kolkata">India Standard Time (IST)</option>
                  <option value="UTC">Coordinated Universal Time (UTC)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Display & Calculation */}
          <section>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-base">
              <Monitor size={18} className="text-purple-600" />
              <h3 className="font-bold text-lg text-primary">Display & Calculation</h3>
            </div>
            <div className="space-y-6 bg-slate-50/50 p-5 rounded-xl border border-base">
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">Default Report Selection Method</label>
                <p className="text-xs text-muted mb-2">How prices are selected when generating daily reports.</p>
                <select 
                  className="input w-full md:w-64 shadow-sm"
                  value={formData.default_selection_method}
                  onChange={(e) => handleChange('default_selection_method', e.target.value)}
                >
                  <option value="latest">Latest Entry</option>
                  <option value="highest">Highest Price</option>
                  <option value="lowest">Lowest Price</option>
                  <option value="average">Average Price</option>
                </select>
              </div>
              
              <div className="pt-2">
                <label className="flex items-start cursor-pointer group p-3 bg-white rounded-lg border border-base shadow-sm max-w-xl transition-colors hover:border-emerald-200">
                  <div className="relative inline-flex items-center shrink-0 mt-0.5 mr-3">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formData.show_broker_in_report}
                      onChange={e => handleChange('show_broker_in_report', e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-primary block">Show Broker Names in Reports</span>
                    <span className="text-xs text-secondary mt-0.5 block">Include the reporting broker's name alongside prices in WhatsApp updates.</span>
                  </div>
                </label>
              </div>

              <div>
                <label className="flex items-start cursor-pointer group p-3 bg-white rounded-lg border border-base shadow-sm max-w-xl transition-colors hover:border-emerald-200">
                  <div className="relative inline-flex items-center shrink-0 mt-0.5 mr-3">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formData.show_previous_day_change}
                      onChange={e => handleChange('show_previous_day_change', e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-primary block">Show Previous Day Variance</span>
                    <span className="text-xs text-secondary mt-0.5 block">Calculate and display price changes compared to the previous day in reports.</span>
                  </div>
                </label>
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-base">
              <Database size={18} className="text-red-500" />
              <h3 className="font-bold text-lg text-primary">Data Management</h3>
            </div>
            <div className="bg-slate-50/50 p-6 rounded-xl border border-base border-dashed flex flex-col items-center text-center">
               <Database size={32} className="text-slate-300 mb-2" />
               <p className="text-sm font-medium text-secondary">Data retention policies are managed globally.</p>
               <p className="text-xs text-muted max-w-sm mt-1">Archiving rules and audit log retention are handled by the core system administrators.</p>
            </div>
          </section>

          
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
             <button 
               type="submit" 
               className="btn btn-primary min-w-[150px] shadow-sm flex items-center justify-center"
               disabled={!isDirty || isSaving}
             >
               {isSaving ? <RefreshCw size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
               {isSaving ? 'Saving...' : 'Save Settings'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
