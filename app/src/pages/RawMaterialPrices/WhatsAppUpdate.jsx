import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import {
  MessageCircle, Copy, Check, RefreshCw, Plus, Trash2,
  AlertTriangle, ExternalLink, Calendar, Settings2, Users, Send
} from 'lucide-react';
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
  const [sendState, setSendState] = useState('idle'); // 'idle', 'loading', 'success', 'deep-link', 'error', 'setup-required'

  useEffect(() => {
    generateReport();
  }, [reportDate, settings]);

  /* ─── Functional contracts (unchanged) ─────────────────── */

  const generateReport = async () => {
    setLoading(true);
    try {
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

      const grouped = (currentData || []).reduce((acc, curr) => {
        const matId = curr.raw_materials.id;
        if (!acc[matId]) acc[matId] = [];
        acc[matId].push(curr);
        return acc;
      }, {});

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

      const processed = [];
      let increased = 0;
      let decreased = 0;
      let stable = 0;

      Object.keys(grouped).forEach((matId) => {
        const entries = grouped[matId];
        let selectedEntry = entries[0];

        if (settings.selectionMethod === 'lowest') {
          selectedEntry = entries.reduce((min, e) => Number(e.price) < Number(min.price) ? e : min, entries[0]);
        }

        const mat = selectedEntry.raw_materials;
        const quality = selectedEntry.material_quality_grades?.grade_name_hi || selectedEntry.material_quality_grades?.grade_name || 'साफ माल';
        const price = Number(selectedEntry.price);

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
          matNameEn: mat.name_en,
          quality,
          price,
          unit: (selectedEntry.rm_units?.unit_name || selectedEntry.unit) === 'Quintal' ? 'क्विंटल' : (selectedEntry.rm_units?.unit_name || selectedEntry.unit),
          unitEn: selectedEntry.rm_units?.unit_name || selectedEntry.unit,
          location: selectedEntry.market_location,
          broker: selectedEntry.brokers?.broker_name,
          diff: Math.abs(diff),
          perc: Math.abs(perc),
          direction,
          prevPrice
        });
      });

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
    const norm = normalizeMobile(newRecipientPhone);
    if (!norm) { setPhoneError('Mobile number is required'); return; }
    if (!validateMobile(norm)) { setPhoneError('Enter a valid 10-digit Indian mobile number'); return; }
    const normalizedPhone = '+91' + norm;
    if (recipients.some(r => r.phone === normalizedPhone)) { setPhoneError('This number is already added'); return; }
    setRecipients([...recipients, { id: Date.now().toString(), name: newRecipientName.trim(), phone: normalizedPhone }]);
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
      if (crmSettings?.whatsapp_provider) {
        setSendState('success');
        setTimeout(() => setSendState('idle'), 5000);
      } else {
        setSendState('setup-required');
        setTimeout(() => {
          recipients.forEach(r => {
            const phoneDigits = r.phone.replace('+', '');
            window.open(`https://wa.me/${phoneDigits}?text=${encoded}`, '_blank');
          });
          setSendState('deep-link');
          setTimeout(() => setSendState('idle'), 5000);
        }, 1500);
      }
    } catch (error) {
      console.error("Error dispatching WhatsApp update", error);
      setSendState('error');
      setTimeout(() => setSendState('idle'), 3000);
    }
  };

  const formatPhoneNumber = (phoneStr) =>
    phoneStr.replace(/(\+91)(\d{5})(\d{5})/, '$1 $2 $3');

  /* ─── Derived stats ─────────────────────────────────────── */
  const totalMaterials = reportData?.processed?.length ?? 0;
  const formattedDate = reportDate
    ? format(new Date(reportDate), 'dd MMM yyyy')
    : '—';

  /* ─── Send button label ─────────────────────────────────── */
  const SendButtonContent = () => {
    if (sendState === 'loading') return <><RefreshCw size={16} className="animate-spin" /> Preparing…</>;
    if (sendState === 'success') return <><Check size={16} /> Delivered</>;
    if (sendState === 'setup-required') return <><AlertTriangle size={16} /> Opening Tabs…</>;
    if (sendState === 'deep-link') return <><ExternalLink size={16} /> Tabs Opened</>;
    if (sendState === 'error') return <><AlertTriangle size={16} /> Error — Retry</>;
    return <><Send size={16} /> Send WhatsApp Update</>;
  };

  const sendBtnCls = {
    success: 'h-[42px] px-5 rounded-lg font-medium border border-emerald-300 bg-emerald-50 text-emerald-700 flex items-center gap-2 transition-colors w-full justify-center',
    'deep-link': 'h-[42px] px-5 rounded-lg font-medium border border-primary/30 bg-primary/5 text-primary flex items-center gap-2 transition-colors w-full justify-center',
    'setup-required': 'h-[42px] px-5 rounded-lg font-medium border border-amber-300 bg-amber-50 text-amber-700 flex items-center gap-2 transition-colors w-full justify-center',
    error: 'h-[42px] px-5 rounded-lg font-medium border border-red-300 bg-red-50 text-red-700 flex items-center gap-2 transition-colors w-full justify-center',
  };

  const sendBtnClass = sendBtnCls[sendState] || 'btn btn-primary h-[42px] px-5 w-full justify-center';

  /* ─── Direction badge ───────────────────────────────────── */
  const DirectionBadge = ({ direction }) => {
    if (!direction) return null;
    const map = {
      'तेजी': { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: '↑ तेजी' },
      'मंदी': { cls: 'bg-red-50 text-red-600 border-red-200', label: '↓ मंदी' },
      'स्थिर': { cls: 'bg-slate-50 text-slate-600 border-slate-200', label: '→ स्थिर' },
    };
    const d = map[direction];
    if (!d) return null;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${d.cls}`}>
        {d.label}
      </span>
    );
  };

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* ── Stats row ── */}
      {!loading && reportData && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-lg px-4 py-2.5 shadow-sm">
            <Calendar size={15} className="text-[#64748B]" />
            <span className="text-[13px] font-semibold text-[#0F172A]">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-lg px-4 py-2.5 shadow-sm">
            <span className="text-[13px] text-[#64748B]">Materials</span>
            <span className="text-[13px] font-bold text-[#0F172A]">{totalMaterials}</span>
          </div>
          {reportData.increased > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
              <span className="text-[13px] font-semibold text-emerald-700">↑ तेजी: {reportData.increased}</span>
            </div>
          )}
          {reportData.decreased > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              <span className="text-[13px] font-semibold text-red-600">↓ मंदी: {reportData.decreased}</span>
            </div>
          )}
          {reportData.stable > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 border border-[#E2E8F0] rounded-lg px-4 py-2.5">
              <span className="text-[13px] font-semibold text-[#475569]">→ स्थिर: {reportData.stable}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Main 2-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: Settings + Recipients ── */}
        <div className="lg:col-span-1 space-y-5">

          {/* Settings Card */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <Settings2 size={15} className="text-[#64748B]" />
              <h3 className="text-[15px] font-bold text-[#0F172A]">Report Settings</h3>
            </div>
            <div className="p-5 space-y-4">

              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
                  Report Date
                </label>
                <input
                  type="date"
                  className="w-full h-[42px] px-3 border border-[#E2E8F0] rounded-lg text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-white text-[#0F172A]"
                  value={reportDate}
                  onChange={e => setReportDate(e.target.value)}
                />
              </div>

              {/* Price Selection */}
              <div>
                <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
                  Price Selection
                </label>
                <select
                  className="w-full h-[42px] px-3 border border-[#E2E8F0] rounded-lg text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-white text-[#0F172A]"
                  value={settings.selectionMethod}
                  onChange={e => setSettings({ ...settings, selectionMethod: e.target.value })}
                >
                  <option value="latest">Latest Entered</option>
                  <option value="lowest">Lowest Quoted</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="space-y-1 pt-1">
                <label className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer border border-transparent hover:border-[#E2E8F0]">
                  <span className="text-[14px] font-medium text-[#0F172A]">Show Broker Name</span>
                  <input
                    type="checkbox"
                    checked={settings.showBroker}
                    onChange={e => setSettings({ ...settings, showBroker: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary"
                  />
                </label>
                <label className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer border border-transparent hover:border-[#E2E8F0]">
                  <span className="text-[14px] font-medium text-[#0F172A]">Include Yesterday's Change</span>
                  <input
                    type="checkbox"
                    checked={settings.showPreviousDayChange}
                    onChange={e => setSettings({ ...settings, showPreviousDayChange: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary"
                  />
                </label>
              </div>

              {/* Regenerate */}
              <button
                className="w-full h-[42px] flex items-center justify-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] rounded-lg font-medium text-[14px] transition-colors shadow-sm"
                onClick={generateReport}
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                Regenerate Report
              </button>
            </div>
          </div>

          {/* Recipients Card */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <Users size={15} className="text-[#64748B]" />
              <h3 className="text-[15px] font-bold text-[#0F172A]">Recipients</h3>
              {recipients.length > 0 && (
                <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  {recipients.length}
                </span>
              )}
            </div>
            <div className="p-5 space-y-4">

              {/* Add form */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
                    Name <span className="font-normal normal-case text-[#94A3B8]">(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full h-[42px] px-3 border border-[#E2E8F0] rounded-lg text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-white text-[#0F172A]"
                    placeholder="e.g., Director Sir"
                    value={newRecipientName}
                    onChange={e => setNewRecipientName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
                    Mobile <span className="text-red-500">*</span>
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 h-[42px] rounded-l-lg border border-r-0 border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] text-[14px] font-semibold shrink-0">
                      +91
                    </span>
                    <input
                      type="tel"
                      className={`flex-1 h-[42px] px-3 border ${phoneError ? 'border-red-400' : 'border-[#E2E8F0]'} rounded-r-lg text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-white text-[#0F172A]`}
                      placeholder="9876543210"
                      value={newRecipientPhone}
                      onChange={e => {
                        setNewRecipientPhone(e.target.value.replace(/\D/g, '').substring(0, 10));
                        if (phoneError) setPhoneError('');
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddRecipient(); }}
                    />
                  </div>
                  {phoneError && <p className="text-[12px] text-red-500 mt-1">{phoneError}</p>}
                </div>
                <button
                  className="w-full h-[38px] flex items-center justify-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] rounded-lg font-medium text-[14px] transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={handleAddRecipient}
                  disabled={!newRecipientPhone || newRecipientPhone.length < 10}
                >
                  <Plus size={15} />
                  Add Recipient
                </button>
              </div>

              {/* Recipient list */}
              {recipients.length === 0 ? (
                <div className="text-center py-5 rounded-lg border border-dashed border-[#E2E8F0] bg-[#F8FAFC]">
                  <p className="text-[13px] text-[#94A3B8]">No recipients yet</p>
                  <p className="text-[12px] text-[#CBD5E1] mt-0.5">Add a number to send the update</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recipients.map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-[#F8FAFC] px-3 py-2.5 rounded-lg border border-[#E2E8F0] group">
                      <div className="min-w-0">
                        {r.name && <div className="text-[13px] font-semibold text-[#0F172A] truncate">{r.name}</div>}
                        <div className={`text-[13px] font-mono tracking-wide ${r.name ? 'text-[#64748B]' : 'text-[#0F172A] font-semibold'}`}>
                          {formatPhoneNumber(r.phone)}
                        </div>
                      </div>
                      <button
                        className="shrink-0 ml-2 p-1.5 rounded-md text-[#94A3B8] hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        onClick={() => handleRemoveRecipient(r.id)}
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Send button */}
              <div className="pt-2 border-t border-[#E2E8F0]">
                <button
                  className={sendBtnClass}
                  onClick={handleBatchSend}
                  disabled={recipients.length === 0 || !generatedMessage || sendState === 'loading' || sendState === 'setup-required'}
                >
                  <SendButtonContent />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Price data + Preview ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Price data card */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <div>
                <h3 className="text-[15px] font-bold text-[#0F172A]">Price Data</h3>
                <p className="text-[13px] text-[#64748B] mt-0.5">
                  {loading ? 'Loading…' : totalMaterials === 0 ? 'No data for this date' : `${totalMaterials} material${totalMaterials !== 1 ? 's' : ''} · ${formattedDate}`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-14 flex flex-col items-center justify-center text-[#64748B]">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary mb-3" />
                <p className="text-[14px] font-medium">Loading prices…</p>
              </div>
            ) : !reportData || reportData.processed.length === 0 ? (
              <div className="py-14 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] mb-4">
                  <MessageCircle size={22} />
                </div>
                <h4 className="text-[15px] font-bold text-[#0F172A] mb-1">No price data available</h4>
                <p className="text-[13px] text-[#64748B] max-w-xs">
                  There are no raw material prices for the selected date. Go to Daily Price Entry to add prices.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {reportData.processed.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors">
                    {/* Index */}
                    <span className="text-[13px] text-[#94A3B8] font-medium w-5 shrink-0 text-center">{idx + 1}</span>

                    {/* Material info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[15px] font-semibold text-[#0F172A]">{item.matName}</span>
                        {item.matNameEn && item.matName !== item.matNameEn && (
                          <span className="text-[12px] text-[#94A3B8]">({item.matNameEn})</span>
                        )}
                        {settings.showPreviousDayChange && item.direction && (
                          <DirectionBadge direction={item.direction} />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[12.5px] text-[#64748B]">{item.quality}</span>
                        {item.location && (
                          <>
                            <span className="text-[#CBD5E1]">·</span>
                            <span className="text-[12.5px] text-[#64748B]">{item.location}</span>
                          </>
                        )}
                        {settings.showBroker && item.broker && (
                          <>
                            <span className="text-[#CBD5E1]">·</span>
                            <span className="text-[12.5px] text-[#64748B]">{item.broker}</span>
                          </>
                        )}
                      </div>
                      {settings.showPreviousDayChange && item.diff > 0 && (
                        <div className={`text-[12px] mt-0.5 font-medium ${item.direction === 'तेजी' ? 'text-emerald-600' : item.direction === 'मंदी' ? 'text-red-500' : 'text-[#64748B]'}`}>
                          {item.direction === 'तेजी' ? '+' : item.direction === 'मंदी' ? '-' : ''}₹{item.diff.toFixed(2)} vs yesterday ({item.perc.toFixed(1)}%)
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <div className="text-[16px] font-bold text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        ₹{item.price.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[12px] text-[#64748B]">/ {item.unitEn || item.unit}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* WhatsApp Preview Card */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="flex items-center gap-2.5">
                <MessageCircle size={15} className="text-[#25D366]" />
                <h3 className="text-[15px] font-bold text-[#0F172A]">WhatsApp Preview</h3>
                {!loading && generatedMessage && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Ready
                  </span>
                )}
              </div>
              <button
                className={`h-[34px] px-4 flex items-center gap-1.5 rounded-lg border text-[13px] font-medium transition-colors shadow-sm ${
                  copied
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]'
                }`}
                onClick={copyToClipboard}
                disabled={!generatedMessage || loading}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Chat bubble preview */}
            <div className="p-5 bg-[#F0F2F5]" style={{ minHeight: '200px' }}>
              {loading ? (
                <div className="flex items-center justify-center py-8 text-[#64748B]">
                  <RefreshCw size={16} className="animate-spin mr-2" />
                  <span className="text-[14px]">Generating message…</span>
                </div>
              ) : !generatedMessage ? (
                <div className="text-center py-8 text-[#94A3B8] text-[14px]">No message to preview</div>
              ) : (
                <div className="max-w-lg mx-auto">
                  {/* WhatsApp bubble */}
                  <div className="relative bg-white rounded-xl rounded-tl-sm shadow-sm p-4 border border-black/5">
                    <div className="absolute top-0 left-[-6px] w-0 h-0 border-t-[6px] border-t-white border-l-[6px] border-l-transparent" />
                    <pre
                      className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#111B21] overflow-auto"
                      style={{
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                        maxHeight: '400px'
                      }}
                    >
                      {generatedMessage}
                    </pre>
                    <div className="text-[11px] text-[#94A3B8] text-right mt-2 flex justify-end items-center gap-1">
                      {format(new Date(), 'HH:mm')} <Check size={12} />
                    </div>
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
