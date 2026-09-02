import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageCircle, Copy, Check, RefreshCw, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const WhatsAppUpdate = () => {
  const [loading, setLoading] = useState(true);
  const [reportDate, setReportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [settings, setSettings] = useState({
    showBroker: false,
    showPreviousDayChange: true,
    selectionMethod: 'latest'
  });
  
  const [reportData, setReportData] = useState(null);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Recipient Management State
  const [recipients, setRecipients] = useState([]);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientPhone, setNewRecipientPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [sendState, setSendState] = useState('idle'); // 'idle', 'loading', 'success', 'error'

  useEffect(() => {
    generateReport();
  }, [reportDate, settings]);

  const generateReport = async () => {
    setLoading(true);
    try {
      // Fetch today's entries
      const { data: currentData } = await supabase
        .from('raw_material_price_entries')
        .select(`
          price, market_location, unit, price_type,
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

      // For previous day comparison
      const prevDate = format(new Date(new Date(reportDate).getTime() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const { data: prevData } = await supabase
        .from('raw_material_price_entries')
        .select('price, raw_material_id')
        .eq('entry_date', prevDate)
        .eq('is_deleted', false);
        
      const prevGrouped = (prevData || []).reduce((acc, curr) => {
        if (!acc[curr.raw_material_id]) acc[curr.raw_material_id] = [];
        acc[curr.raw_material_id].push(curr);
        return acc;
      }, {});

      // Process materials
      const processed = [];
      let increased = 0;
      let decreased = 0;
      let stable = 0;

      Object.keys(grouped).forEach((matId, index) => {
        const entries = grouped[matId];
        let selectedEntry = entries[0];
        
        if (settings.selectionMethod === 'lowest') {
          selectedEntry = entries.reduce((min, e) => Number(e.price) < Number(min.price) ? e : min, entries[0]);
        }
        
        const mat = selectedEntry.raw_materials;
        const quality = selectedEntry.material_quality_grades?.grade_name_hi || selectedEntry.material_quality_grades?.grade_name || 'साफ माल';
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
          
          if (diff > 0) { direction = 'तेजी'; increased++; }
          else if (diff < 0) { direction = 'मंदी'; decreased++; }
          else { direction = 'स्थिर'; stable++; }
        } else {
          stable++;
        }

        processed.push({
          matName: mat.name_hi || mat.name_en,
          quality,
          price,
          unit: (selectedEntry.rm_units?.unit_name || selectedEntry.unit) === 'Quintal' ? 'क्विंटल' : (selectedEntry.rm_units?.unit_name || selectedEntry.unit),
          location: selectedEntry.market_location,
          broker: selectedEntry.brokers?.broker_name,
          diff: Math.abs(diff),
          perc: Math.abs(perc),
          direction
        });
      });

      // Construct Text Message
      const displayDate = format(new Date(reportDate), 'dd-MM-yyyy');
      let msg = `नमस्कार सर,\n\nदिनांक: ${displayDate}\n\nआज के पशु आहार कच्चे माल के भाव निम्नानुसार हैं:\n\n`;

      if (processed.length === 0) {
        msg += "आज के लिए कोई भाव उपलब्ध नहीं हैं।\n\n";
      } else {
        processed.forEach((item, idx) => {
          msg += `${idx + 1}. ${item.matName} (${item.quality})\n`;
          msg += `भाव: ₹${item.price.toLocaleString('en-IN')} प्रति ${item.unit}\n`;
          if (item.location) msg += `बाजार: ${item.location}\n`;
          if (settings.showBroker && item.broker) msg += `स्रोत: ${item.broker}\n`;
          
          if (settings.showPreviousDayChange && item.direction && item.diff > 0) {
            msg += `कल के मुकाबले: ${item.direction} ₹${item.diff.toFixed(2)} (${item.perc.toFixed(2)}%)\n`;
          }
          msg += '\n';
        });

        // Summary
        msg += `कुल स्थिति:\n`;
        
        const incNames = processed.filter(p => p.direction === 'तेजी').map(p => p.matName).join(', ') || 'कोई नहीं';
        const decNames = processed.filter(p => p.direction === 'मंदी').map(p => p.matName).join(', ') || 'कोई नहीं';
        const staNames = processed.filter(p => !p.direction || p.direction === 'स्थिर').map(p => p.matName).join(', ') || 'कोई नहीं';
        
        msg += `- तेजी वाले माल: ${incNames}\n`;
        msg += `- मंदी वाले माल: ${decNames}\n`;
        msg += `- स्थिर माल: ${staNames}\n\n`;
      }

      msg += `धन्यवाद।\nShubh Labh CRM`;

      setGeneratedMessage(msg);
      setReportData({ processed, increased, decreased, stable });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddRecipient = () => {
    setPhoneError('');
    const digits = newRecipientPhone.replace(/\D/g, '');
    
    if (!digits) {
      setPhoneError('Mobile number is required');
      return;
    }
    
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number');
      return;
    }
    
    const normalizedPhone = '+91' + digits;
    
    if (recipients.some(r => r.phone === normalizedPhone)) {
      setPhoneError('This mobile number is already added');
      return;
    }
    
    setRecipients([...recipients, { 
      id: Date.now().toString(), 
      name: newRecipientName.trim(), 
      phone: normalizedPhone 
    }]);
    
    setNewRecipientName('');
    setNewRecipientPhone('');
  };

  const handleRemoveRecipient = (id) => {
    setRecipients(recipients.filter(r => r.id !== id));
  };

  const handleBatchSend = async () => {
    if (recipients.length === 0 || !generatedMessage) return;
    setSendState('loading');
    
    try {
      const encoded = encodeURIComponent(generatedMessage);
      
      // Open WhatsApp Web/API for each recipient. 
      // Note: Browsers may block multiple popups. 
      // The user must allow popups for this domain if sending to many.
      recipients.forEach(r => {
        const phoneDigits = r.phone.replace('+', '');
        window.open(`https://wa.me/${phoneDigits}?text=${encoded}`, '_blank');
      });
      
      setSendState('success');
      setTimeout(() => setSendState('idle'), 3000);
    } catch (error) {
      console.error("Error dispatching WhatsApp tabs", error);
      setSendState('error');
      setTimeout(() => setSendState('idle'), 3000);
    }
  };

  const formatPhoneNumber = (phoneStr) => {
    // format +91XXXXXXXXXX to +91 XXXXX XXXXX
    return phoneStr.replace(/(\+91)(\d{5})(\d{5})/, '$1 $2 $3');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-primary">WhatsApp Price Update</h1>
        <p className="text-secondary mt-1">Generate and send the daily raw-material price report through WhatsApp.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Settings & Recipients */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card bg-surface p-5">
            <h3 className="font-semibold mb-4 border-b border-base pb-2 text-primary">Report Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-secondary mb-1 block">Report Date</label>
                <input 
                  type="date" 
                  className="input w-full"
                  value={reportDate}
                  onChange={e => setReportDate(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-secondary mb-1 block">Price Selection</label>
                <select 
                  className="input w-full"
                  value={settings.selectionMethod}
                  onChange={e => setSettings({...settings, selectionMethod: e.target.value})}
                >
                  <option value="latest">Latest Entered</option>
                  <option value="lowest">Lowest Quoted</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-base/50">
                <label className="text-sm font-medium text-primary">Show Broker Name</label>
                <input 
                  type="checkbox" 
                  checked={settings.showBroker}
                  onChange={e => setSettings({...settings, showBroker: e.target.checked})}
                  className="w-4 h-4 rounded border-base text-primary focus:ring-primary"
                />
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-base/50">
                <label className="text-sm font-medium text-primary">Include vs Yesterday Change</label>
                <input 
                  type="checkbox" 
                  checked={settings.showPreviousDayChange}
                  onChange={e => setSettings({...settings, showPreviousDayChange: e.target.checked})}
                  className="w-4 h-4 rounded border-base text-primary focus:ring-primary"
                />
              </div>

              <button 
                className="btn btn-secondary w-full flex items-center justify-center gap-2"
                onClick={generateReport}
              >
                <RefreshCw size={16} /> Regenerate Report
              </button>
            </div>
          </div>

          <div className="card bg-surface p-5">
            <h3 className="font-semibold mb-4 border-b border-base pb-2 text-primary">Recipients</h3>
            
            <div className="space-y-4 mb-5">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-secondary mb-1 block">Recipient Name <span className="text-muted font-normal">(Optional)</span></label>
                  <input 
                    type="text" 
                    className="input w-full"
                    placeholder="e.g., Director Sir"
                    value={newRecipientName}
                    onChange={e => setNewRecipientName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-secondary mb-1 block">Mobile Number <span className="text-danger">*</span></label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-base bg-base text-secondary text-sm font-medium">
                      +91
                    </span>
                    <input 
                      type="tel" 
                      className={`input rounded-l-none w-full ${phoneError ? 'border-danger focus:ring-danger/50' : ''}`}
                      placeholder="e.g., 9876543210"
                      value={newRecipientPhone}
                      onChange={e => {
                        setNewRecipientPhone(e.target.value.replace(/\D/g, '').substring(0, 10));
                        if (phoneError) setPhoneError('');
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddRecipient();
                      }}
                    />
                  </div>
                  {phoneError && <p className="text-danger text-xs mt-1.5 font-medium">{phoneError}</p>}
                </div>
              </div>
              
              <div className="flex justify-end">
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddRecipient}
                  disabled={!newRecipientPhone || newRecipientPhone.length < 10}
                >
                  <Plus size={14} className="mr-1" /> Add Recipient
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {recipients.length === 0 ? (
                <div className="text-center p-4 rounded-lg bg-base border border-dashed border-base text-secondary text-[13px]">
                  Add at least one recipient to send the WhatsApp update.
                </div>
              ) : (
                recipients.map(r => (
                  <div key={r.id} className="flex justify-between items-center bg-base/50 p-2.5 rounded-lg border border-base">
                    <div>
                      {r.name && <div className="font-medium text-sm text-primary">{r.name}</div>}
                      <div className={`text-[13px] font-medium font-mono tracking-wide ${r.name ? 'text-secondary' : 'text-primary'}`}>
                        {formatPhoneNumber(r.phone)}
                      </div>
                    </div>
                    <button 
                      className="text-muted hover:text-danger p-1.5 rounded-md transition-colors hover:bg-white"
                      onClick={() => handleRemoveRecipient(r.id)}
                      title="Remove Recipient"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Send Action */}
            <div className="pt-4 border-t border-base">
              <button 
                className={`btn w-full py-2.5 flex justify-center items-center gap-2 ${
                  sendState === 'success' ? 'btn-outline border-success text-success bg-success/5 hover:bg-success/10' : 
                  sendState === 'error' ? 'btn-outline border-danger text-danger bg-danger/5 hover:bg-danger/10' : 
                  'btn-primary'
                }`}
                onClick={handleBatchSend}
                disabled={recipients.length === 0 || !generatedMessage || sendState === 'loading'}
              >
                {sendState === 'loading' ? (
                  <><RefreshCw size={16} className="animate-spin" /> Sending update…</>
                ) : sendState === 'success' ? (
                  <><Check size={16} /> WhatsApp update sent successfully.</>
                ) : sendState === 'error' ? (
                  <><AlertTriangle size={16} /> Unable to send update. Please try again.</>
                ) : (
                  <><MessageCircle size={16} /> Send WhatsApp Update</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Preview Panel */}
        <div className="lg:col-span-2">
          <div className="card bg-surface flex flex-col h-full border border-base">
            <div className="p-4 border-b border-base bg-base/20 flex justify-between items-center">
              <h3 className="font-semibold text-primary">Message Preview (Hindi)</h3>
              <div className="flex gap-2">
                <button 
                  className={`btn btn-sm flex items-center gap-1 ${copied ? 'btn-outline border-success text-success bg-success/5 hover:bg-success/10' : 'btn-outline'}`}
                  onClick={copyToClipboard}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />} 
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>
              </div>
            </div>
            
            <div className="p-6 flex-1 bg-[url('https://raw.githubusercontent.com/stripe/stripe-terminal-ios/master/Example/Images.xcassets/stripe-logo.imageset/stripe-logo.png')] bg-opacity-5">
              {loading ? (
                <div className="flex justify-center items-center h-full text-secondary">Generating message...</div>
              ) : (
                <div className="bg-[#e1f3db] dark:bg-[#0b141a] p-4 rounded-xl rounded-tl-none max-w-2xl mx-auto shadow-sm border border-black/5 dark:border-white/10 relative">
                   <div className="absolute top-0 left-[-8px] w-0 h-0 border-t-[8px] border-t-[#e1f3db] dark:border-t-[#0b141a] border-l-[8px] border-l-transparent"></div>
                   <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-[#111b21] dark:text-[#e9edef]" style={{fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'}}>
                     {generatedMessage}
                   </pre>
                   <div className="text-[11px] text-[#667781] dark:text-[#8696a0] text-right mt-2 flex justify-end items-center gap-1">
                     {format(new Date(), 'HH:mm')} <Check size={12} />
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppUpdate;
