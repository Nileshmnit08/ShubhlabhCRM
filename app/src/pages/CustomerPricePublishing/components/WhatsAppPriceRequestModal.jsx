import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  Users,
  Settings,
  MessageCircle,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  History,
  Info
} from 'lucide-react';
import {
  normalizeIndianPhone,
  isValidIndianPhone,
  getIndiaDateFormatted,
  generatePriceRequestId,
  formatINRValue,
  buildPriceRequestMessage,
  buildWhatsAppLink,
  loadProcurementConfig,
  saveProcurementConfig,
  loadPriceRequestHistory,
  recordPriceRequest
} from '../utils/whatsappPriceRequest';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/activityLogger';

export default function WhatsAppPriceRequestModal({
  isOpen,
  onClose,
  materials = [],
  latestPrices = {},
  userProfile = null
}) {
  // Tabs: 'composer' | 'history'
  const [activeTab, setActiveTab] = useState('composer');

  // Contact Configuration State
  const [procurementConfig, setProcurementConfig] = useState(loadProcurementConfig);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editManagerName, setEditManagerName] = useState('');
  const [editManagerPhone, setEditManagerPhone] = useState('');
  const [crmStaffList, setCrmStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Commodity Selection State (Keyed by material ID: true/false)
  const [selectedIds, setSelectedIds] = useState({});
  const [searchFilter, setSearchFilter] = useState('');

  // Live Generated Message & Reference ID
  const [currentRequestId, setCurrentRequestId] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendNotice, setSendNotice] = useState(null);

  // Tracking History
  const [historyList, setHistoryList] = useState([]);

  // Initialize modal state on open
  useEffect(() => {
    if (isOpen) {
      const config = loadProcurementConfig();
      setProcurementConfig(config);
      setEditManagerName(config.managerName || 'Procurement Manager');
      setEditManagerPhone(config.phone || '');
      setIsEditingContact(!config.phone); // Auto-open edit mode if phone not configured

      // Select all active materials by default
      const initialSelection = {};
      materials.forEach(m => {
        initialSelection[m.id] = true;
      });
      setSelectedIds(initialSelection);
      setCurrentRequestId(generatePriceRequestId());
      setSendNotice(null);
      setCopied(false);
      setHistoryList(loadPriceRequestHistory());

      fetchCrmStaff();
    }
  }, [isOpen, materials]);

  // Fetch active staff from app_users for quick manager selection
  const fetchCrmStaff = async () => {
    try {
      setLoadingStaff(true);
      const { data, error } = await supabase
        .from('app_users')
        .select('id, display_name, email, role, mobile, whatsapp')
        .neq('role', 'Buyer')
        .eq('is_active', true)
        .order('display_name');

      if (!error && data) {
        setCrmStaffList(data);
      }
    } catch (err) {
      console.warn('Could not fetch staff list for procurement dropdown:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Handle Staff Selection from dropdown
  const handleSelectStaff = (e) => {
    const staffId = e.target.value;
    if (!staffId) return;
    const staff = crmStaffList.find(s => s.id === staffId);
    if (staff) {
      setEditManagerName(staff.display_name || staff.email);
      const phone = normalizeIndianPhone(staff.whatsapp || staff.mobile || '');
      setEditManagerPhone(phone);
    }
  };

  // Save Contact Changes
  const handleSaveContact = () => {
    const cleanPhone = normalizeIndianPhone(editManagerPhone);
    const updated = {
      managerName: editManagerName.trim() || 'Procurement Manager',
      phone: cleanPhone,
      notes: ''
    };
    saveProcurementConfig(updated);
    setProcurementConfig(updated);
    setIsEditingContact(false);
  };

  // Selection Toggles
  const handleToggleCommodity = (id) => {
    setSelectedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectAll = () => {
    const next = {};
    materials.forEach(m => {
      next[m.id] = true;
    });
    setSelectedIds(next);
  };

  const handleClearAll = () => {
    setSelectedIds({});
  };

  // Prepare selected commodities with strictly SAVED database prices and units
  const selectedCommoditiesList = useMemo(() => {
    return materials
      .filter(m => selectedIds[m.id])
      .map(m => {
        const lp = latestPrices[m.id];
        return {
          id: m.id,
          name_en: m.name_en,
          name_hi: m.name_hi,
          savedPrice: lp ? lp.price : null,
          savedUnit: lp ? lp.unit : 'Quintal'
        };
      });
  }, [materials, selectedIds, latestPrices]);

  // Filtered materials for checklist display
  const displayedMaterials = useMemo(() => {
    if (!searchFilter.trim()) return materials;
    const query = searchFilter.trim().toLowerCase();
    return materials.filter(m => {
      return (
        m.name_en.toLowerCase().includes(query) ||
        (m.name_hi && m.name_hi.toLowerCase().includes(query))
      );
    });
  }, [materials, searchFilter]);

  // Formatted date string for today in IST
  const todayIST = useMemo(() => getIndiaDateFormatted(), []);

  // Live generated message
  const generatedMessage = useMemo(() => {
    return buildPriceRequestMessage({
      dateStr: todayIST,
      requestId: currentRequestId || 'PR-PENDING',
      selectedCommodities: selectedCommoditiesList,
      managerName: procurementConfig.managerName
    });
  }, [todayIST, currentRequestId, selectedCommoditiesList, procurementConfig.managerName]);

  // Copy to clipboard
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // WhatsApp Action
  const handleOpenWhatsApp = async () => {
    const rawPhone = procurementConfig.phone;
    if (!isValidIndianPhone(rawPhone)) {
      setIsEditingContact(true);
      return;
    }

    if (selectedCommoditiesList.length === 0) {
      alert('कृपया कम से कम एक कमोडिटी का चयन करें (Please select at least one commodity).');
      return;
    }

    const { url, webUrl } = buildWhatsAppLink(rawPhone, generatedMessage);

    // Record tracking entry
    const newRecord = {
      id: currentRequestId,
      createdAt: new Date().toISOString(),
      dateIST: todayIST,
      itemCount: selectedCommoditiesList.length,
      commodities: selectedCommoditiesList.map(c => ({
        name_en: c.name_en,
        name_hi: c.name_hi,
        price: c.savedPrice,
        unit: c.savedUnit
      })),
      requestedBy: userProfile?.display_name || userProfile?.email || 'CRM Admin',
      managerName: procurementConfig.managerName,
      managerPhone: rawPhone,
      status: 'WhatsApp Opened'
    };
    const updatedHistory = recordPriceRequest(newRecord);
    setHistoryList(updatedHistory);

    // Log to CRM Activity Logs
    try {
      await logActivity({
        module: 'CustomerPricePublishing',
        actionType: 'WHATSAPP_PRICE_REQUEST_INITIATED',
        summary: `Market price request initiated for ${selectedCommoditiesList.length} commodities via WhatsApp to ${procurementConfig.managerName} (${rawPhone})`,
        metadata: {
          requestId: currentRequestId,
          commoditiesCount: selectedCommoditiesList.length,
          managerPhone: rawPhone
        }
      });
    } catch (e) {
      console.warn('Could not log activity:', e);
    }

    // Open WhatsApp
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }

    setSendNotice({
      type: 'success',
      text: `WhatsApp विंडो खोली गई है (Phone: +91 ${normalizeIndianPhone(rawPhone)})। कृपया WhatsApp में मैसेज की जांच करके "Send" बटन दबाएं।`
    });
  };

  if (!isOpen) return null;

  const isPhoneConfigured = isValidIndianPhone(procurementConfig.phone);
  const selectedCount = selectedCommoditiesList.length;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '92vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        
        {/* ─── MODAL HEADER ────────────────────────────────────────────── */}
        <div style={{
          padding: '1.1rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #a7f3d0'
            }}>
              <MessageCircle size={22} style={{ color: '#059669' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Request Today's Market Prices
                </h3>
                <span style={{
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #bbf7d0'
                }}>
                  WhatsApp
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                आज के बाजार भाव प्रोक्योरमेंट मैनेजर से मंगवाएं (Request fresh rates from Procurement Manager)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* View Switcher Tabs */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#e2e8f0',
              padding: '0.2rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('composer')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  backgroundColor: activeTab === 'composer' ? '#ffffff' : 'transparent',
                  color: activeTab === 'composer' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: activeTab === 'composer' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Compose Request
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  backgroundColor: activeTab === 'history' ? '#ffffff' : 'transparent',
                  color: activeTab === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: activeTab === 'history' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <History size={12} />
                <span>History ({historyList.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ─── MODAL BODY ──────────────────────────────────────────────── */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Global Send Notice */}
          {sendNotice && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <CheckCircle size={18} style={{ color: '#059669', flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{sendNotice.text}</span>
              <button onClick={() => setSendNotice(null)} style={{ cursor: 'pointer', color: '#065f46' }}>
                <X size={14} />
              </button>
            </div>
          )}

          {activeTab === 'history' ? (
            /* ─── TAB: REQUEST HISTORY ────────────────────────────────── */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Recent WhatsApp Price Requests
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Stored locally on this device
                </span>
              </div>

              {historyList.length === 0 ? (
                <div style={{
                  padding: '3rem 1rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  border: '1px dashed var(--border)',
                  borderRadius: '12px'
                }}>
                  <Clock size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No price requests recorded yet</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Requests opened via WhatsApp will be tracked here for reference.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {historyList.map(item => (
                    <div
                      key={item.id}
                      style={{
                        padding: '0.9rem 1.1rem',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                            #{item.id}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            • {item.dateIST}
                          </span>
                        </div>
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0'
                        }}>
                          {item.status || 'WhatsApp Opened'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Recipient: <strong>{item.managerName}</strong> (+91 {item.managerPhone}) • <strong>{item.itemCount}</strong> commodities requested by {item.requestedBy}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Items: {item.commodities?.map(c => c.name_en).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ─── TAB: COMPOSER ───────────────────────────────────────── */
            <>
              {/* 1. Procurement Manager WhatsApp Contact Bar */}
              <div style={{
                padding: '0.9rem 1.1rem',
                borderRadius: '12px',
                border: isPhoneConfigured ? '1px solid var(--border)' : '1px solid #fecaca',
                backgroundColor: isPhoneConfigured ? '#f8fafc' : '#fef2f2',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Users size={18} style={{ color: isPhoneConfigured ? 'var(--primary)' : '#dc2626' }} />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Procurement Manager Contact
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {procurementConfig.managerName}
                        {isPhoneConfigured ? (
                          <span style={{ fontWeight: 600, color: '#059669', marginLeft: '0.5rem', fontFamily: 'monospace' }}>
                            +91 {procurementConfig.phone}
                          </span>
                        ) : (
                          <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, marginLeft: '0.5rem' }}>
                            (WhatsApp Number Not Configured)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingContact(prev => !prev)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: '#ffffff',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Settings size={13} />
                    <span>{isEditingContact ? 'Hide Config' : 'Change Contact'}</span>
                  </button>
                </div>

                {!isPhoneConfigured && !isEditingContact && (
                  <div style={{ fontSize: '0.8rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={14} style={{ color: '#dc2626' }} />
                    <span>प्रोक्योरमेंट मैनेजर का WhatsApp नंबर कॉन्फ़िगर नहीं है। कृपया "Change Contact" पर क्लिक करके नंबर दर्ज करें।</span>
                  </div>
                )}

                {/* Inline Contact Editor */}
                {isEditingContact && (
                  <div style={{
                    marginTop: '0.25rem',
                    padding: '0.9rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Configure Procurement Contact:
                    </div>

                    {crmStaffList.length > 0 && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          Select from Active CRM Staff:
                        </label>
                        <select
                          onChange={handleSelectStaff}
                          defaultValue=""
                          style={{
                            width: '100%',
                            height: '34px',
                            fontSize: '0.8rem',
                            padding: '0 0.5rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border)'
                          }}
                        >
                          <option value="">-- Choose Staff Member (or enter custom number below) --</option>
                          {crmStaffList.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.display_name} ({s.role}) - {s.whatsapp || s.mobile || 'No phone'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          Manager / Contact Name:
                        </label>
                        <input
                          type="text"
                          value={editManagerName}
                          onChange={(e) => setEditManagerName(e.target.value)}
                          placeholder="e.g. Procurement Team / Vishnu ji"
                          style={{
                            width: '100%',
                            height: '34px',
                            fontSize: '0.8rem',
                            padding: '0 0.6rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border)'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          WhatsApp Mobile (10 Digits):
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{
                            height: '34px',
                            padding: '0 0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid var(--border)',
                            borderRight: 'none',
                            borderRadius: '6px 0 0 6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)'
                          }}>
                            +91
                          </span>
                          <input
                            type="text"
                            maxLength={10}
                            value={editManagerPhone}
                            onChange={(e) => setEditManagerPhone(e.target.value)}
                            placeholder="10-digit mobile number"
                            style={{
                              flex: 1,
                              height: '34px',
                              fontSize: '0.8rem',
                              padding: '0 0.6rem',
                              borderRadius: '0 6px 6px 0',
                              border: '1px solid var(--border)'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => setIsEditingContact(false)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveContact}
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 1rem', fontSize: '0.75rem' }}
                      >
                        Save Contact
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Commodity Selection Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Select Commodities to Request ({selectedCount} of {materials.length} Selected)
                    </h4>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Showing saved benchmark published prices from the live commodity master.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      style={{
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        backgroundColor: '#ffffff',
                        color: 'var(--primary)',
                        cursor: 'pointer'
                      }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      style={{
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        backgroundColor: '#ffffff',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Filter Search Bar */}
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search commodities to include..."
                    style={{
                      paddingLeft: '2.2rem',
                      height: '34px',
                      fontSize: '0.8rem',
                      borderRadius: '8px'
                    }}
                  />
                  {searchFilter && (
                    <button
                      onClick={() => setSearchFilter('')}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Commodities Checklist Grid */}
                <div style={{
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  backgroundColor: '#ffffff'
                }}>
                  {displayedMaterials.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No commodities match "{searchFilter}"
                    </div>
                  ) : (
                    displayedMaterials.map(m => {
                      const isSelected = Boolean(selectedIds[m.id]);
                      const lp = latestPrices[m.id];
                      const savedRate = lp ? formatINRValue(lp.price) : null;
                      const savedUnit = lp ? lp.unit : 'Quintal';

                      return (
                        <div
                          key={m.id}
                          onClick={() => handleToggleCommodity(m.id)}
                          style={{
                            padding: '0.6rem 0.9rem',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(15, 118, 110, 0.05)' : '#ffffff',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Controlled by container onClick
                              style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                            />
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {m.name_hi ? `${m.name_hi} (${m.name_en})` : m.name_en}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            {savedRate ? (
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                {savedRate} <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {savedUnit}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                No rate
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 3. Live WhatsApp Message Preview Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <MessageCircle size={15} style={{ color: '#059669' }} />
                    <span>WhatsApp Message Preview (Pre-filled):</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      backgroundColor: copied ? '#ecfdf5' : '#ffffff',
                      color: copied ? '#059669' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>

                <div style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  backgroundColor: '#efeae2', // WhatsApp chat background tone
                  border: '1px solid #d1d7db',
                  maxHeight: '230px',
                  overflowY: 'auto'
                }}>
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    boxShadow: '0 1px 1px rgba(0,0,0,0.06)',
                    fontSize: '0.8rem',
                    lineHeight: '1.5',
                    color: '#111b21',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}>
                    {generatedMessage}
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* ─── MODAL FOOTER ────────────────────────────────────────────── */}
        <div style={{
          padding: '1rem 1.5rem',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            * WhatsApp क्लिक करने पर नया टैब खुलेगा। आपको WhatsApp में स्वयं 'Send' दबाना होगा।
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={!isPhoneConfigured || selectedCount === 0}
              style={{
                backgroundColor: (isPhoneConfigured && selectedCount > 0) ? '#25D366' : '#94a3b8',
                color: '#ffffff',
                padding: '0.55rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                boxShadow: (isPhoneConfigured && selectedCount > 0) ? '0 2px 4px rgba(37, 211, 102, 0.3)' : 'none',
                cursor: (isPhoneConfigured && selectedCount > 0) ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease'
              }}
              title={
                !isPhoneConfigured
                  ? 'Please configure Procurement Manager WhatsApp number'
                  : selectedCount === 0
                  ? 'Please select at least one commodity'
                  : ''
              }
            >
              <Send size={15} />
              <span>Send Request on WhatsApp</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
