import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageCircle, Copy, Check, RefreshCw, Plus, Trash2, AlertTriangle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { AuthContext } from '../../AuthContext';
import { normalizeMobile, validateMobile } from '../../utils/phoneUtils';

const WhatsAppUpdate = () => {
  const { crmSettings } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [reportDate, setReportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [settings, setSettings] = useState({
    showBroker: false,
    showPreviousDayChange: true,
    selectionMethod: 'latest',
    customTerms: 'Prices ex-Indore Godown, loading free, GST extra as applicable. Valid till 5:00 PM today.'
  });
  
  const [reportData, setReportData] = useState(null);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Recipient Management State
  const [recipients, setRecipients] = useState([
     { id: 'preset1', name: 'Feed Millers & Dealers', selected: true, count: 42, type: 'preset' },
     { id: 'preset2', name: 'Poultry Network', selected: false, count: 28, type: 'preset' },
     { id: 'preset3', name: 'Mandi Traders', selected: false, count: 16, type: 'preset' }
  ]);
  const [customRecipients, setCustomRecipients] = useState([]);
  
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientPhone, setNewRecipientPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [sendState, setSendState] = useState('idle'); // 'idle', 'loading', 'success', 'deep-link', 'error', 'setup-required'
  
  // Selected materials for broadcast
  const [selectedMaterials, setSelectedMaterials] = useState({}); // { matId: boolean }

  useEffect(() => {
    generateReport();
  }, [reportDate, settings.selectionMethod]);
  
  useEffect(() => {
     generateMessageString();
  }, [reportData, selectedMaterials, settings]);

  const generateReport = async () => {
    setLoading(true);
    try {
      // Fetch all daily tracked materials
      const { data: trackedMaterials } = await supabase
        .from('raw_materials')
        .select('id, name_en, name_hi, daily_tracking_required')
        .eq('active', true)
        .eq('daily_tracking_required', true);

      // Fetch today's entries
      const { data: currentData } = await supabase
        .from('raw_material_price_entries')
        .select(`
          price, market_location, unit, price_type, status,
          raw_material_id,
          raw_materials(id, name_en, name_hi, daily_tracking_required),
          brokers(broker_name),
          material_quality_grades(grade_name_hi, grade_name),
          rm_units(unit_name),
          rm_price_types(type_name)
        `)
        .eq('entry_date', reportDate)
        .eq('is_deleted', false);

      // Group by material for selection logic
      const grouped = (currentData || []).reduce((acc, curr) => {
        const matId = curr.raw_materials.id;
        if (!acc[matId]) acc[matId] = [];
        acc[matId].push(curr);
        return acc;
      }, {});

      // For previous day comparison (strictly Official)
      const prevDate = format(new Date(new Date(reportDate).getTime() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const { data: prevData } = await supabase
        .from('raw_material_price_entries')
        .select('price, raw_material_id')
        .eq('entry_date', prevDate)
        .eq('status', 'Official')
        .eq('is_deleted', false);
        
      const prevGrouped = (prevData || []).reduce((acc, curr) => {
        if (!acc[curr.raw_material_id]) acc[curr.raw_material_id] = [];
        acc[curr.raw_material_id].push(curr);
        return acc;
      }, {});

      // Process materials
      const processed = [];
      const missing = [];
      const unverified = [];
      
      let increased = 0;
      let decreased = 0;
      let stable = 0;

      (trackedMaterials || []).forEach(mat => {
        const matId = mat.id;
        const entries = grouped[matId] || [];
        
        const officialEntries = entries.filter(e => e.status === 'Official');
        const pendingEntries = entries.filter(e => e.status === 'Pending');

        if (officialEntries.length === 0) {
          if (pendingEntries.length > 0) {
            unverified.push(mat.name_hi || mat.name_en);
          } else {
            missing.push(mat.name_hi || mat.name_en);
          }
          return;
        }

        let selectedEntry = officialEntries[0];
        
        if (settings.selectionMethod === 'lowest') {
          selectedEntry = officialEntries.reduce((min, e) => Number(e.price) < Number(min.price) ? e : min, officialEntries[0]);
        }
        
        const quality = selectedEntry.material_quality_grades?.grade_name_hi || selectedEntry.material_quality_grades?.grade_name || 'Standard';
        const price = Number(selectedEntry.price);
        
        // Find prev price
        let prevPrice = null;
        let diff = 0;
        let perc = 0;
        let direction = '';
        
        if (prevGrouped[matId] && prevGrouped[matId].length > 0) {
          const prevEntries = prevGrouped[matId];
          let pEntry = prevEntries[0];
          if (settings.selectionMethod === 'lowest') {
            pEntry = prevEntries.reduce((min, e) => Number(e.price) < Number(min.price) ? e : min, prevEntries[0]);
          }
          prevPrice = Number(pEntry.price);
          diff = price - prevPrice;
          perc = (diff / prevPrice) * 100;
          
          if (diff > 0) { direction = 'UP'; increased++; }
          else if (diff < 0) { direction = 'DOWN'; decreased++; }
          else { direction = 'STABLE'; stable++; }
        } else {
          stable++;
          direction = 'STABLE';
        }

        processed.push({
          id: matId,
          matName: mat.name_hi || mat.name_en,
          quality,
          price,
          unit: (selectedEntry.rm_units?.unit_name || selectedEntry.unit) === 'Quintal' ? 'क्विंटल' : (selectedEntry.rm_units?.unit_name || selectedEntry.unit),
          location: selectedEntry.market_location,
          broker: selectedEntry.brokers?.broker_name,
          diff: diff,
          perc: Math.abs(perc),
          direction
        });
      });
      
      // Auto-select all processed materials initially
      const initialSelection = {};
      processed.forEach(p => initialSelection[p.id] = true);
      setSelectedMaterials(initialSelection);

      setReportData({ processed, missing, unverified, increased, decreased, stable });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  const generateMessageString = () => {
     if(!reportData) return;
     
     const { processed, missing, unverified } = reportData;
     const selectedProcessed = processed.filter(p => selectedMaterials[p.id]);
     
      // Construct Text Message
      const displayDate = format(new Date(reportDate), 'dd-MM-yyyy');
      let msg = `नमस्कार सर,\n\nदिनांक: ${displayDate}\n\nआज के प्रमाणित (Verified) पशु आहार कच्चे माल के भाव निम्नानुसार हैं:\n\n`;

      if (selectedProcessed.length === 0) {
        msg += "आज के लिए कोई प्रमाणित भाव उपलब्ध नहीं हैं।\n\n";
      } else {
        selectedProcessed.forEach((item, idx) => {
          msg += `${idx + 1}. ${item.matName} (${item.quality})\n`;
          msg += `भाव: ₹${item.price.toLocaleString('en-IN')} प्रति ${item.unit}\n`;
          if (item.location) msg += `बाजार: ${item.location}\n`;
          if (settings.showBroker && item.broker) msg += `स्रोत: ${item.broker}\n`;
          
          if (settings.showPreviousDayChange && item.direction && Math.abs(item.diff) > 0) {
             const dirStr = item.direction === 'UP' ? 'तेजी' : 'मंदी';
            msg += `कल के मुकाबले: ${dirStr} ₹${Math.abs(item.diff).toFixed(2)} (${item.perc.toFixed(2)}%)\n`;
          }
          msg += '\n';
        });

        // Summary
        msg += `कुल स्थिति:\n`;
        
        const incNames = selectedProcessed.filter(p => p.direction === 'UP').map(p => p.matName).join(', ') || 'कोई नहीं';
        const decNames = selectedProcessed.filter(p => p.direction === 'DOWN').map(p => p.matName).join(', ') || 'कोई नहीं';
        const staNames = selectedProcessed.filter(p => p.direction === 'STABLE').map(p => p.matName).join(', ') || 'कोई नहीं';
        
        msg += `- तेजी वाले माल: ${incNames}\n`;
        msg += `- मंदी वाले माल: ${decNames}\n`;
        msg += `- स्थिर माल: ${staNames}\n\n`;
      }
      
      if(settings.customTerms) {
         msg += `नियम एवं शर्तें:\n${settings.customTerms}\n\n`;
      }

      if (missing.length > 0 || unverified.length > 0) {
        msg += `⚠️ ध्यान दें (Missing / Unverified):\n`;
        if (unverified.length > 0) {
          msg += `- अप्रमाणित (Pending Verification): ${unverified.join(', ')}\n`;
        }
        if (missing.length > 0) {
          msg += `- अप्राप्त (No Data Today): ${missing.join(', ')}\n`;
        }
        msg += `\n`;
      }

      msg += `धन्यवाद।\nShubh Labh CRM`;

      setGeneratedMessage(msg);
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleTogglePreset = (id) => {
     setRecipients(prev => prev.map(r => r.id === id ? {...r, selected: !r.selected} : r));
  };

  const handleAddRecipient = () => {
    setPhoneError('');
    const norm = normalizeMobile(newRecipientPhone);
    
    if (!norm) {
      setPhoneError('Mobile number is required');
      return;
    }
    
    if (!validateMobile(norm)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number');
      return;
    }
    
    const normalizedPhone = '+91' + norm;
    
    if (customRecipients.some(r => r.phone === normalizedPhone)) {
      setPhoneError('This mobile number is already added');
      return;
    }
    
    setCustomRecipients([...customRecipients, { 
      id: Date.now().toString(), 
      name: newRecipientName.trim() || 'Custom Contact', 
      phone: normalizedPhone 
    }]);
    
    setNewRecipientName('');
    setNewRecipientPhone('');
  };

  const handleRemoveRecipient = (id) => {
    setCustomRecipients(customRecipients.filter(r => r.id !== id));
  };

  const handleBatchSend = async () => {
    const hasPresetSelected = recipients.some(r => r.selected);
    if (!generatedMessage || (!hasPresetSelected && customRecipients.length === 0)) return;
    setSendState('loading');
    
    try {
      const encoded = encodeURIComponent(generatedMessage);
      
      // Usually would integrate with WhatsApp Business API here (e.g. Twilio/Gupshup)
      // Since this is CRM UI, we'll simulate it, or use the web deep link for one-offs.
      
      if(hasPresetSelected && !crmSettings?.whatsapp_api_key) {
         setSendState('setup-required');
         return;
      }
      
      if(customRecipients.length === 1 && !hasPresetSelected) {
          // Fallback to wa.me for single custom number
          const phone = customRecipients[0].phone.replace('+', '');
          window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
          setSendState('deep-link');
      } else {
         // Mock API send
         setTimeout(() => {
            setSendState('success');
            setTimeout(() => setSendState('idle'), 3000);
         }, 1500);
      }

    } catch (error) {
      console.error(error);
      setSendState('error');
    }
  };

  const handleSelectAllMaterials = () => {
     if(!reportData) return;
     const allSelected = {};
     reportData.processed.forEach(p => allSelected[p.id] = true);
     setSelectedMaterials(allSelected);
  }
  
  const handleClearAllMaterials = () => {
     setSelectedMaterials({});
  }

  const handleToggleMaterial = (id) => {
     setSelectedMaterials(prev => ({...prev, [id]: !prev[id]}));
  }

  const selectedCount = Object.values(selectedMaterials).filter(Boolean).length;

  return (
    <div className="flex flex-col w-full animate-fade-in pb-16">
      <div className="mb-space-lg flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="font-label-md text-label-md uppercase tracking-wider text-primary font-semibold">Broadcast Center</span>
            <span className="text-on-surface-variant font-label-md text-label-md">/</span>
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">Daily WhatsApp Rate Broadcast Generator</span>
          </div>
          <div className="flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[15px] text-tertiary">lock_reset</span>
            <span>Manual Copy / Share Workflow • No automated outbound spam</span>
          </div>
        </div>
        
        {/* Step Indicator */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md relative">
            <div className="flex items-center gap-space-sm">
              <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm text-label-sm font-bold">1</div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md font-semibold text-primary truncate">Date &amp; Session</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate">Morning Closing Mandi</span>
              </div>
            </div>
            <div className="flex items-center gap-space-sm">
              <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm text-label-sm font-bold">2</div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md font-semibold text-primary truncate">Recipient Presets</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate">Millers &amp; Dealers</span>
              </div>
            </div>
            <div className="flex items-center gap-space-sm">
              <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm text-label-sm font-bold">3</div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md font-semibold text-primary truncate">Select Materials</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate" id="selected-count-badge">{selectedCount} Commodities Active</span>
              </div>
            </div>
            <div className="flex items-center gap-space-sm">
              <div className="w-7 h-7 rounded-full bg-surface-container-highest text-primary flex items-center justify-center font-label-sm text-label-sm font-bold">4</div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md font-semibold text-on-surface truncate">Preview &amp; Broadcast</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate">Copy or Dispatch</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        
        {/* Left Column (Steps 1-3) */}
        <div className="col-span-1 xl:col-span-7 flex flex-col gap-space-md">
          
          {/* Step 1: Schedule & Target */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">1. Schedule &amp; Target Distribution</h2>
              </div>
              <span className="font-label-sm text-label-sm px-space-xs py-0.5 rounded bg-surface-container text-secondary font-semibold uppercase">Mandi Verified</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Effective Rate Date</label>
                <div className="flex items-center justify-between px-space-sm py-2 rounded-lg bg-surface-container-low text-on-surface border border-transparent focus-within:border-primary">
                  <div className="flex items-center gap-space-xs w-full">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">calendar_today</span>
                    <input 
                       type="date" 
                       className="font-numeric-table text-numeric-table font-semibold bg-transparent border-none focus:outline-none w-full" 
                       value={reportDate}
                       onChange={e => setReportDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Origin Mandi / Depot</label>
                <div className="flex items-center gap-space-xs px-space-sm py-2 rounded-lg bg-surface-container-low text-on-surface">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">warehouse</span>
                  <span className="font-body-md text-body-md font-medium">Central Indore APMC Depot</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-space-xs pt-space-xs">
              <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Audience Preset Segment</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
                 {recipients.map(r => (
                    <label 
                       key={r.id} 
                       className={`flex items-start gap-space-xs p-space-sm rounded-lg cursor-pointer transition-colors ${r.selected ? 'bg-secondary-container/30' : 'bg-surface-container-low hover:bg-surface-container'}`}
                    >
                      <input 
                         checked={r.selected} 
                         onChange={() => handleTogglePreset(r.id)} 
                         className="mt-0.5 w-3.5 h-3.5 accent-primary cursor-pointer" 
                         type="checkbox"
                      />
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md font-semibold text-on-surface">{r.name}</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Preset ({r.count})</span>
                      </div>
                    </label>
                 ))}
              </div>
            </div>
          </div>

          {/* Step 2: Checklist */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">checklist</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">2. Raw Material Checklist &amp; Rates</h2>
              </div>
              <div className="flex items-center gap-space-sm">
                <button className="font-label-md text-label-md text-primary font-semibold hover:underline" onClick={handleSelectAllMaterials} type="button">Select All</button>
                <span className="text-on-surface-variant text-[11px]">•</span>
                <button className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:underline" onClick={handleClearAllMaterials} type="button">Clear</button>
              </div>
            </div>
            <div className="flex flex-col space-y-1">
              {loading ? (
                 <div className="py-4 text-center text-on-surface-variant">Loading price data...</div>
              ) : reportData?.processed.length === 0 ? (
                 <div className="py-4 text-center text-on-surface-variant">No official price records found for this date.</div>
              ) : (
                 reportData?.processed.map(item => (
                    <label key={item.id} className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer group">
                      <div className="flex items-center gap-space-sm">
                        <input 
                           checked={!!selectedMaterials[item.id]}
                           onChange={() => handleToggleMaterial(item.id)}
                           className="commodity-toggle w-4 h-4 accent-primary cursor-pointer" 
                           type="checkbox"
                        />
                        <div className="flex flex-col">
                          <span className="font-body-md text-body-md font-semibold text-on-surface">{item.matName}</span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">{item.quality}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-space-md">
                        <span className="font-numeric-table text-numeric-table font-semibold text-on-surface">₹{item.price.toFixed(2)} / {item.unit}</span>
                        <span className={`px-space-xs py-0.5 rounded text-label-sm font-label-sm font-semibold flex items-center gap-0.5 min-w-[70px] justify-center ${
                           item.direction === 'UP' ? 'bg-error-container text-on-error-container' : // For purchasing, price UP is bad (red)
                           item.direction === 'DOWN' ? 'bg-primary-fixed text-on-primary-fixed' : // price DOWN is good (green)
                           'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {item.direction === 'UP' && <span className="material-symbols-outlined text-[13px]">arrow_upward</span>}
                          {item.direction === 'DOWN' && <span className="material-symbols-outlined text-[13px]">arrow_downward</span>}
                          {item.direction === 'STABLE' && <span className="material-symbols-outlined text-[13px]">horizontal_rule</span>}
                          {item.direction !== 'STABLE' ? `₹${item.diff.toFixed(2)}` : 'Stable'}
                        </span>
                      </div>
                    </label>
                 ))
              )}
            </div>
          </div>

          {/* Broadcast Remarks */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
              <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Broadcast Remarks &amp; Commercial Terms</label>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Appends to message bottom</span>
            </div>
            <textarea 
               className="w-full p-space-sm bg-surface-container-low border border-transparent focus:border-primary rounded-lg font-body-md text-body-md text-on-surface focus:outline-none transition-colors resize-none" 
               rows="3"
               value={settings.customTerms}
               onChange={e => setSettings({...settings, customTerms: e.target.value})}
            />
          </div>
          
          {/* Recent History Placeholder */}
          <div className="p-space-md rounded-xl bg-surface-container-low flex items-center justify-between opacity-70">
            <div className="flex items-center gap-space-sm">
              <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">history_toggle_off</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md font-semibold text-on-surface">Last Broadcast Dispatched</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Yesterday, 5:30 PM by Admin</span>
              </div>
            </div>
            <button className="text-primary font-label-md text-label-md hover:underline font-medium" type="button">View Logs</button>
          </div>

        </div>

        {/* Right Column (Step 4 Preview) */}
        <div className="col-span-1 xl:col-span-5 flex flex-col gap-space-md">
          
          {/* Quick Settings */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between">
             <div className="flex flex-col gap-1">
                <span className="font-label-md text-label-md font-semibold text-on-surface">Include Yesterday's Change</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Shows Δ diff from previous close</span>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
                <input 
                   type="checkbox" 
                   className="sr-only peer" 
                   checked={settings.showPreviousDayChange}
                   onChange={e => setSettings({...settings, showPreviousDayChange: e.target.checked})}
                />
                <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
             </label>
          </div>

          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col h-full flex-grow border border-surface-container">
            <div className="flex items-center justify-between pb-space-md mb-space-md border-b border-surface-container">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">forum</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Preview &amp; Send</h2>
              </div>
              <button 
                 className={`p-1.5 rounded-full transition-colors ${copied ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'}`}
                 onClick={copyToClipboard}
                 title="Copy to Clipboard"
              >
                <span className="material-symbols-outlined text-[18px]">{copied ? 'check' : 'content_copy'}</span>
              </button>
            </div>
            
            {/* Phone Mockup Container */}
            <div className="flex-grow flex flex-col">
              <div className="bg-[#e4ddd6] rounded-xl overflow-hidden border border-[#d1c9c0] shadow-inner flex flex-col flex-grow relative" style={{backgroundImage: "url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')", backgroundSize: '400px'}}>
                {/* Mock Header */}
                <div className="bg-[#075e54] text-white px-3 py-2 flex items-center gap-2 shadow-md z-10">
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[18px]">campaign</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-[15px] truncate leading-tight">Shubh Labh CRM Broadcast</span>
                    <span className="text-[11px] text-white/80 leading-tight">
                       {recipients.filter(r => r.selected).length + customRecipients.length} groups/contacts
                    </span>
                  </div>
                </div>
                
                {/* Scrollable Message Area */}
                <div className="flex-grow p-4 overflow-y-auto max-h-[500px]">
                  <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm inline-block max-w-[95%] relative">
                    <pre className="font-body-md text-body-md text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {generatedMessage}
                    </pre>
                    <div className="text-[10px] text-gray-400 text-right mt-1 font-sans">{format(new Date(), 'HH:mm')}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Area */}
            <div className="pt-space-md mt-space-md border-t border-surface-container">
              {sendState === 'setup-required' ? (
                <div className="bg-error-container/30 text-on-surface p-3 rounded-lg mb-3 flex items-start gap-2">
                   <AlertTriangle size={18} className="text-error mt-0.5 flex-shrink-0" />
                   <div className="flex flex-col">
                      <span className="font-semibold text-sm">WhatsApp API Not Configured</span>
                      <span className="text-xs mt-1">To use Audience Presets (bulk sending), you need to configure the WhatsApp Business API in CRM Settings.</span>
                   </div>
                </div>
              ) : sendState === 'deep-link' ? (
                 <div className="text-center py-2 text-sm text-on-surface-variant">Opening WhatsApp Web...</div>
              ) : null}

              <button 
                 className={`w-full py-3 rounded-lg font-label-lg text-label-lg font-semibold text-white shadow-sm transition-all flex justify-center items-center gap-2 ${
                    !generatedMessage || selectedCount === 0 ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed' :
                    sendState === 'loading' ? 'bg-[#128c7e] opacity-80 cursor-wait' :
                    sendState === 'success' ? 'bg-primary' :
                    'bg-[#128c7e] hover:bg-[#0f776a]'
                 }`}
                 onClick={handleBatchSend}
                 disabled={!generatedMessage || selectedCount === 0 || sendState === 'loading'}
              >
                 {sendState === 'loading' ? (
                    <><RefreshCw size={18} className="animate-spin" /> Sending...</>
                 ) : sendState === 'success' ? (
                    <><Check size={18} /> Dispatched Successfully</>
                 ) : (
                    <><span className="material-symbols-outlined text-[20px]">send</span> Dispatch via WhatsApp API</>
                 )}
              </button>
              
              <div className="text-center mt-3">
                 <button 
                    className="text-primary font-label-md text-label-md hover:underline inline-flex items-center gap-1"
                    onClick={copyToClipboard}
                 >
                    <Copy size={14} /> Just copy text instead
                 </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppUpdate;
