import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../AuthContext';
import {
  Save,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Filter,
  History,
  Users,
  RefreshCw,
  X,
  Copy,
  Calendar,
  Send,
  Eye,
  RotateCcw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const INITIAL_MATERIALS = [
  'Khal', 'Makka Daliya', 'Jaggery', 'Oil', 'Chana Churi', 
  'Soya Churi', 'Kakde', 'Kakde Khal', 'Mustard Khal',
  'Chapad', 'Methi', 'Ajwain', 'Chaadi Kakda'
];

// Helper to format currency in Indian numbering format
const formatINR = (value) => {
  if (value === null || value === undefined || value === '' || isNaN(value)) return '-';
  const num = Number(value);
  return '₹' + num.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: num % 1 === 0 ? 0 : 2
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, hh:mm a');
  } catch {
    return dateStr;
  }
};

const formatDateOnly = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
};

export default function CustomerPricePublishing() {
  const { userProfile } = React.useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [latestPrices, setLatestPrices] = useState({});
  const [previousPrices, setPreviousPrices] = useState({});
  const [formData, setFormData] = useState({});
  const [publicationHistory, setPublicationHistory] = useState([]);
  const [lastPublishedAt, setLastPublishedAt] = useState(null);
  
  // UI States
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'changed', 'drafts', 'selected'
  const [showHistory, setShowHistory] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingPublishItems, setPendingPublishItems] = useState([]);
  const [batchDate, setBatchDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 6000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Materials (including Hindi names for bilingual clarity)
      const { data: rmData, error: rmError } = await supabase
        .from('raw_materials')
        .select('id, name_en, name_hi')
        .in('name_en', INITIAL_MATERIALS)
        .eq('active', true);

      if (rmError) throw rmError;

      // Maintain consistent order as defined in INITIAL_MATERIALS
      const orderedMaterials = INITIAL_MATERIALS.map(name => 
        rmData.find(rm => rm.name_en === name)
      ).filter(Boolean);

      setMaterials(orderedMaterials);

      // 2. Fetch Customer Published Prices
      const { data: lpData, error: lpError } = await supabase
        .from('customer_published_prices')
        .select('id, raw_material_id, price, unit, effective_date, is_published, remarks, created_at, created_by')
        .order('effective_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (lpError) throw lpError;

      const latest = {};
      const previous = {};
      const drafts = {};
      const publishedRecords = [];

      lpData.forEach(p => {
        if (p.is_published) {
          publishedRecords.push(p);
          if (!latest[p.raw_material_id]) {
            latest[p.raw_material_id] = p;
          } else if (!previous[p.raw_material_id]) {
            previous[p.raw_material_id] = p; // 2nd most recent published rate
          }
        } else {
          if (!drafts[p.raw_material_id]) {
            drafts[p.raw_material_id] = p; // Most recent draft
          }
        }
      });

      setLatestPrices(latest);
      setPreviousPrices(previous);
      setPublicationHistory(publishedRecords.slice(0, 20));
      
      if (publishedRecords.length > 0) {
        setLastPublishedAt(publishedRecords[0].created_at || publishedRecords[0].effective_date);
      }

      // 3. Initialize Form Data
      const initForm = {};
      orderedMaterials.forEach(m => {
        const draft = drafts[m.id];
        initForm[m.id] = {
          price: draft ? draft.price.toString() : '',
          unit: draft ? draft.unit : (latest[m.id] ? latest[m.id].unit : 'Quintal'),
          effective_date: draft ? draft.effective_date : format(new Date(), 'yyyy-MM-dd'),
          remarks: draft ? (draft.remarks || '') : '',
          selected: false,
          draftId: draft ? draft.id : null,
          error: null
        };
      });
      setFormData(initForm);

    } catch (err) {
      console.error('Error fetching market data:', err);
      showMessage('error', 'Failed to load customer price publishing data.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
        error: field === 'price' && Number(value) < 0 ? 'Price cannot be negative' : null
      }
    }));
  };

  // Helper to check if a row has unsaved/modified data compared to current published
  const isRowModified = (materialId) => {
    const row = formData[materialId];
    const lp = latestPrices[materialId];
    if (!row) return false;
    if (row.draftId) return true;
    if (!row.price) return false;
    if (!lp) return true; // Newly added price
    return Number(row.price) !== Number(lp.price) || row.unit !== lp.unit;
  };

  // Calculate price delta vs current published rate
  const getPriceDelta = (materialId) => {
    const row = formData[materialId];
    const lp = latestPrices[materialId];
    if (!row || !row.price || !lp) return null;
    
    // Only comparable if units match
    if (row.unit !== lp.unit) {
      return { unitMismatch: true };
    }

    const currentVal = Number(lp.price);
    const newVal = Number(row.price);
    const diff = newVal - currentVal;
    const percent = currentVal > 0 ? (diff / currentVal) * 100 : 0;

    return {
      diff,
      percent,
      isIncrease: diff > 0,
      isDecrease: diff < 0,
      isUnchanged: diff === 0
    };
  };

  // Summary counts
  const summaryMetrics = useMemo(() => {
    let changed = 0;
    let draftCount = 0;
    let selectedCount = 0;

    materials.forEach(m => {
      const row = formData[m.id];
      if (!row) return;
      if (row.selected) selectedCount++;
      if (row.draftId) draftCount++;
      if (isRowModified(m.id)) changed++;
    });

    return {
      total: materials.length,
      changed,
      draftCount,
      selectedCount
    };
  }, [materials, formData, latestPrices]);

  // Filtered materials based on search and tab filter
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const row = formData[m.id];
      if (!row) return false;

      // Text search in English and Hindi name
      const query = searchQuery.trim().toLowerCase();
      const matchName = m.name_en.toLowerCase().includes(query) ||
        (m.name_hi && m.name_hi.toLowerCase().includes(query));
      if (!matchName) return false;

      // Tab filters
      if (activeFilter === 'changed') return isRowModified(m.id);
      if (activeFilter === 'drafts') return !!row.draftId;
      if (activeFilter === 'selected') return row.selected;

      return true;
    });
  }, [materials, formData, latestPrices, searchQuery, activeFilter]);

  // Bulk action: Select all visible
  const handleSelectAllVisible = (e) => {
    const checked = e.target.checked;
    setFormData(prev => {
      const next = { ...prev };
      filteredMaterials.forEach(m => {
        if (next[m.id]) {
          next[m.id] = { ...next[m.id], selected: checked };
        }
      });
      return next;
    });
  };

  // Bulk action: Apply effective date to all
  const handleApplyBatchDate = () => {
    if (!batchDate) return;
    setFormData(prev => {
      const next = { ...prev };
      materials.forEach(m => {
        if (next[m.id]) {
          next[m.id] = { ...next[m.id], effective_date: batchDate };
        }
      });
      return next;
    });
    showMessage('info', `Applied effective date ${formatDateOnly(batchDate)} to all commodities.`);
  };

  // Bulk action: Prefill empty prices from latest published
  const handlePrefillCurrent = () => {
    let count = 0;
    setFormData(prev => {
      const next = { ...prev };
      materials.forEach(m => {
        const lp = latestPrices[m.id];
        if (next[m.id] && !next[m.id].price && lp) {
          next[m.id] = {
            ...next[m.id],
            price: lp.price.toString(),
            unit: lp.unit
          };
          count++;
        }
      });
      return next;
    });
    showMessage('info', count > 0 ? `Prefilled ${count} commodities from current published rates.` : 'No empty prices to prefill.');
  };

  // Row action: Reset row to current published values
  const handleResetRow = (materialId) => {
    const lp = latestPrices[materialId];
    setFormData(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        price: lp ? lp.price.toString() : '',
        unit: lp ? lp.unit : 'Quintal',
        effective_date: format(new Date(), 'yyyy-MM-dd'),
        remarks: ''
      }
    }));
  };

  // Open Publish Review Dialog
  const initiatePublish = (onlySelected = false) => {
    const targetMaterials = onlySelected
      ? materials.filter(m => formData[m.id]?.selected)
      : materials;

    if (targetMaterials.length === 0) {
      showMessage('error', 'Please select at least one commodity to publish.');
      return;
    }

    // Filter items that have a price specified
    const itemsToPublish = [];
    const invalidItems = [];

    targetMaterials.forEach(m => {
      const row = formData[m.id];
      if (!row || !row.price || isNaN(row.price) || Number(row.price) <= 0) {
        if (onlySelected) {
          invalidItems.push(m.name_en);
        }
        return;
      }

      const lp = latestPrices[m.id];
      const delta = getPriceDelta(m.id);

      itemsToPublish.push({
        materialId: m.id,
        name_en: m.name_en,
        name_hi: m.name_hi,
        newPrice: Number(row.price),
        unit: row.unit,
        effective_date: row.effective_date,
        remarks: row.remarks,
        currentPrice: lp ? Number(lp.price) : null,
        currentUnit: lp ? lp.unit : null,
        draftId: row.draftId,
        delta
      });
    });

    if (invalidItems.length > 0 && onlySelected) {
      showMessage('error', `Please enter a valid positive price for selected: ${invalidItems.join(', ')}`);
      return;
    }

    if (itemsToPublish.length === 0) {
      showMessage('error', 'No valid prices found to publish. Please enter prices first.');
      return;
    }

    setPendingPublishItems(itemsToPublish);
    setShowConfirmModal(true);
  };

  // Execute Save Draft or Publish to Supabase
  const executeSave = async (isPublish = false, publishItems = null) => {
    try {
      setSaving(true);
      const payload = [];
      const draftsToUpdate = [];

      if (isPublish && publishItems) {
        // Publish verified items from modal
        for (const item of publishItems) {
          const record = {
            raw_material_id: item.materialId,
            price: Number(item.newPrice),
            unit: item.unit,
            effective_date: item.effective_date,
            is_published: true,
            remarks: item.remarks || null,
            created_by: userProfile?.id || null
          };

          if (item.draftId) {
            draftsToUpdate.push({ id: item.draftId, ...record });
          } else {
            payload.push(record);
          }
        }
      } else {
        // Save as Drafts
        for (const m of materials) {
          const row = formData[m.id];
          if (!row || !row.price) continue;

          const record = {
            raw_material_id: m.id,
            price: Number(row.price),
            unit: row.unit,
            effective_date: row.effective_date,
            is_published: false,
            remarks: row.remarks || null,
            created_by: userProfile?.id || null
          };

          if (row.draftId) {
            draftsToUpdate.push({ id: row.draftId, ...record });
          } else {
            payload.push(record);
          }
        }
      }

      if (payload.length === 0 && draftsToUpdate.length === 0) {
        showMessage('info', 'No changes to save.');
        setShowConfirmModal(false);
        setSaving(false);
        return;
      }

      if (payload.length > 0) {
        const { error } = await supabase.from('customer_published_prices').insert(payload);
        if (error) throw error;
      }

      if (draftsToUpdate.length > 0) {
        const { error } = await supabase.from('customer_published_prices').upsert(draftsToUpdate);
        if (error) throw error;
      }

      setShowConfirmModal(false);
      showMessage(
        'success',
        isPublish 
          ? `Successfully published ${payload.length + draftsToUpdate.length} commodity prices to the Buyer App!`
          : `Saved ${payload.length + draftsToUpdate.length} draft price entries.`
      );

      await fetchData();

    } catch (err) {
      console.error('Save error:', err);
      showMessage('error', err.message || 'Failed to process prices. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
        <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Loading Customer Price Publishing...</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Connecting to commodity catalog and live market rates</p>
      </div>
    );
  }

  const allVisibleSelected = filteredMaterials.length > 0 && 
    filteredMaterials.every(m => formData[m.id]?.selected);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem 1rem 4rem 1rem' }}>
      
      {/* ─── PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="page-header" style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.75rem 0 1.25rem',
        borderBottom: '1px solid var(--border)',
        marginBottom: '1.25rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.25rem, 3.5vw, 1.65rem)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
              Customer Price Publishing
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              Live Feed
            </span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '750px' }}>
            Manage and broadcast public-facing market rates to registered cattle-feed dealers and buyers on the Shubh Labh Buyer App.
          </p>
          {lastPublishedAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 500 }}>
              <Clock size={13} style={{ color: 'var(--text-muted)' }} />
              <span>Last Published: {formatDateTime(lastPublishedAt)}</span>
            </div>
          )}
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            onClick={() => executeSave(false)}
            disabled={saving}
            className="btn btn-secondary"
            style={{
              padding: '0.625rem 1rem',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: saving ? 0.6 : 1
            }}
          >
            <Save size={16} />
            <span>Save Drafts</span>
          </button>

          <button
            onClick={() => initiatePublish(true)}
            disabled={saving || summaryMetrics.selectedCount === 0}
            style={{
              backgroundColor: '#d97706',
              color: '#ffffff',
              padding: '0.625rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: (saving || summaryMetrics.selectedCount === 0) ? 0.45 : 1,
              cursor: (saving || summaryMetrics.selectedCount === 0) ? 'not-allowed' : 'pointer',
              border: '1px solid #b45309',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            title={summaryMetrics.selectedCount === 0 ? 'Select rows using checkboxes to publish' : ''}
          >
            <CheckCircle size={16} />
            <span>Publish Selected ({summaryMetrics.selectedCount})</span>
          </button>

          <button
            onClick={() => initiatePublish(false)}
            disabled={saving}
            className="btn btn-primary"
            style={{
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            <span>Publish Prices</span>
            {summaryMetrics.changed > 0 && (
              <span style={{
                marginLeft: '0.25rem',
                padding: '0.15rem 0.5rem',
                fontSize: '0.75rem',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontWeight: 700
              }}>
                {summaryMetrics.changed}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── GLOBAL ALERT NOTIFICATIONS ───────────────────────────────── */}
      {message && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.9rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.9rem',
          fontWeight: 500,
          marginBottom: '1.25rem',
          backgroundColor: message.type === 'success' ? '#ecfdf5' : message.type === 'info' ? '#eff6ff' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#a7f3d0' : message.type === 'info' ? '#bfdbfe' : '#fecaca'}`,
          color: message.type === 'success' ? '#065f46' : message.type === 'info' ? '#1e40af' : '#991b1b',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {message.type === 'success' ? (
            <CheckCircle size={18} style={{ color: '#059669', flexShrink: 0 }} />
          ) : message.type === 'info' ? (
            <AlertCircle size={18} style={{ color: '#2563eb', flexShrink: 0 }} />
          ) : (
            <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
          )}
          <span style={{ flex: 1 }}>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            style={{ color: 'currentColor', opacity: 0.6, padding: '0.25rem', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ─── SUMMARY KPI CARDS ────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        
        {/* Card 1: Total Commodities */}
        <div className="glass-panel" style={{
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface)'
        }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Active Commodities
            </p>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem', lineHeight: 1.2 }}>
              {summaryMetrics.total}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Configured raw materials</p>
          </div>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-base)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)'
          }}>
            <Eye size={22} />
          </div>
        </div>

        {/* Card 2: Prices Changed / Pending */}
        <div className="glass-panel" style={{
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface)'
        }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Prices Modified
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {summaryMetrics.changed}
              </span>
              {summaryMetrics.draftCount > 0 && (
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#d97706' }}>
                  ({summaryMetrics.draftCount} in draft)
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Ready for publication</p>
          </div>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: summaryMetrics.changed > 0 ? '#fef3c7' : 'var(--bg-base)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: summaryMetrics.changed > 0 ? '#d97706' : 'var(--text-secondary)'
          }}>
            <TrendingUp size={22} />
          </div>
        </div>

        {/* Card 3: Target Audience */}
        <div className="glass-panel" style={{
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface)'
        }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Target Audience
            </p>
            <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.35rem', lineHeight: 1.2 }}>
              All Active Buyers
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Buyer App Market Feed
            </p>
          </div>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(15, 118, 110, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <Users size={22} />
          </div>
        </div>

        {/* Card 4: Last Publication Date */}
        <div className="glass-panel" style={{
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface)'
        }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Last Broadcast
            </p>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.35rem', lineHeight: 1.2 }}>
              {lastPublishedAt ? formatDateOnly(lastPublishedAt) : 'No records yet'}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <CheckCircle size={12} /> Published live
            </p>
          </div>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#ecfdf5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#059669'
          }}>
            <Clock size={22} />
          </div>
        </div>

      </div>

      {/* ─── AUDIENCE TARGETING INFORMATION BANNER ────────────────────── */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            padding: '0.5rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(15, 118, 110, 0.12)',
            color: 'var(--primary)',
            display: 'flex'
          }}>
            <Users size={18} />
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Audience Targeting Notice: </strong>
            Customer price updates published on this page are broadcast to <strong>all registered buyers and cattle-feed dealers</strong> on the Shubh Labh Buyer App across Rajasthan & Gujarat.
          </div>
        </div>
        <div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.3rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            fontWeight: 600,
            fontSize: '0.75rem',
            color: 'var(--text-primary)'
          }}>
            Scope: Global Market Watchlist
          </span>
        </div>
      </div>

      {/* ─── CONTROLS & FILTER TOOLBAR ─────────────────────────────────── */}
      <div className="glass-panel" style={{
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        backgroundColor: 'var(--bg-surface)'
      }}>
        
        {/* Search & Filter Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', flex: '1 1 400px' }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '240px', maxWidth: '320px', flex: '1 1 auto' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search commodity (English / Hindi)..."
              style={{
                paddingLeft: '2.25rem',
                paddingRight: searchQuery ? '2rem' : '0.75rem',
                height: '38px',
                fontSize: '0.85rem'
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem',
            backgroundColor: 'var(--bg-base)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            fontSize: '0.8rem',
            fontWeight: 600
          }}>
            <button
              onClick={() => setActiveFilter('all')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: activeFilter === 'all' ? '#ffffff' : 'transparent',
                color: activeFilter === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeFilter === 'all' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer'
              }}
            >
              All ({materials.length})
            </button>
            <button
              onClick={() => setActiveFilter('changed')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: activeFilter === 'changed' ? '#ffffff' : 'transparent',
                color: activeFilter === 'changed' ? 'var(--primary)' : 'var(--text-secondary)',
                boxShadow: activeFilter === 'changed' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer'
              }}
            >
              Changed ({summaryMetrics.changed})
            </button>
            {summaryMetrics.draftCount > 0 && (
              <button
                onClick={() => setActiveFilter('drafts')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeFilter === 'drafts' ? '#ffffff' : 'transparent',
                  color: activeFilter === 'drafts' ? '#d97706' : 'var(--text-secondary)',
                  boxShadow: activeFilter === 'drafts' ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Drafts ({summaryMetrics.draftCount})
              </button>
            )}
            <button
              onClick={() => setActiveFilter('selected')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: activeFilter === 'selected' ? '#ffffff' : 'transparent',
                color: activeFilter === 'selected' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeFilter === 'selected' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer'
              }}
            >
              Selected ({summaryMetrics.selectedCount})
            </button>
          </div>
        </div>

        {/* Batch Operations Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
          
          {/* Quick Prefill Button */}
          <button
            onClick={handlePrefillCurrent}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-base)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer'
            }}
            title="Fill blank price fields with current published prices"
          >
            <Copy size={13} />
            <span>Prefill Current</span>
          </button>

          {/* Batch Date Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: 'var(--bg-base)',
            border: '1px solid var(--border)',
            padding: '0.2rem 0.35rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <input
              type="date"
              value={batchDate}
              onChange={(e) => setBatchDate(e.target.value)}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.8rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#ffffff',
                width: '130px',
                height: '30px'
              }}
            />
            <button
              onClick={handleApplyBatchDate}
              style={{
                padding: '0.3rem 0.6rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--primary)',
                cursor: 'pointer'
              }}
            >
              Apply All
            </button>
          </div>

          {/* Toggle History View */}
          <button
            onClick={() => setShowHistory(prev => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: showHistory ? 'var(--text-primary)' : '#ffffff',
              color: showHistory ? '#ffffff' : 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <History size={13} />
            <span>{showHistory ? 'Hide History' : 'View History'}</span>
          </button>

        </div>

      </div>

      {/* ─── COMMODITY PRICE MANAGEMENT TABLE ──────────────────────────── */}
      <div className="data-table-container" style={{ margin: '0 0 1.5rem 0' }}>
        <table className="data-table mobile-cards-table" style={{ width: '100%', minWidth: '950px' }}>
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={handleSelectAllVisible}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  title="Select all visible commodities"
                />
              </th>
              <th style={{ width: '180px' }}>Commodity</th>
              <th style={{ width: '140px', textAlign: 'right' }}>Current Published</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Previous Rate</th>
              <th style={{ width: '140px' }}>New Price (₹)</th>
              <th style={{ width: '110px' }}>Unit</th>
              <th style={{ width: '140px', textAlign: 'center' }}>Price Delta</th>
              <th style={{ width: '140px' }}>Effective Date</th>
              <th style={{ width: '200px' }}>Status & Notes</th>
              <th style={{ width: '50px', textAlign: 'center' }}>Reset</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>No commodities match the selected filter</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Try clearing your search query or switching tabs.</p>
                </td>
              </tr>
            ) : (
              filteredMaterials.map(m => {
                const lp = latestPrices[m.id];
                const prevPrice = previousPrices[m.id];
                const row = formData[m.id];
                const hasDraft = !!row?.draftId;
                const delta = getPriceDelta(m.id);
                const isModified = isRowModified(m.id);

                return (
                  <tr 
                    key={m.id} 
                    style={{
                      backgroundColor: row?.selected 
                        ? 'rgba(15, 118, 110, 0.05)' 
                        : isModified 
                        ? 'rgba(245, 158, 11, 0.05)' 
                        : undefined
                    }}
                  >
                    {/* 1. Selection Checkbox */}
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '0.75rem 0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={row?.selected || false}
                        onChange={(e) => handleChange(m.id, 'selected', e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </td>

                    {/* 2. Commodity Name */}
                    <td style={{ verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {m.name_en}
                      </div>
                      {m.name_hi && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          {m.name_hi}
                        </div>
                      )}
                    </td>

                    {/* 3. Current Published Price */}
                    <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                      {lp ? (
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                            {formatINR(lp.price)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            per {lp.unit} • {formatDateOnly(lp.effective_date)}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No published price</span>
                      )}
                    </td>

                    {/* 4. Previous Benchmark Price */}
                    <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                      {prevPrice ? (
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {formatINR(prevPrice.price)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            {formatDateOnly(prevPrice.effective_date)}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>

                    {/* 5. New Price Input */}
                    <td style={{ verticalAlign: 'middle' }}>
                      <div style={{ position: 'relative', width: '130px' }}>
                        <span style={{
                          position: 'absolute',
                          left: '0.65rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--text-muted)',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}>
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row?.price || ''}
                          onChange={(e) => handleChange(m.id, 'price', e.target.value)}
                          placeholder={lp ? lp.price.toString() : 'Enter rate'}
                          style={{
                            paddingLeft: '1.65rem',
                            paddingRight: '0.5rem',
                            height: '36px',
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            borderColor: row?.error ? 'var(--danger)' : isModified ? '#f59e0b' : 'var(--border)',
                            backgroundColor: isModified ? '#fffbeb' : '#ffffff'
                          }}
                        />
                      </div>
                      {row?.error && (
                        <p style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: '0.2rem' }}>{row.error}</p>
                      )}
                    </td>

                    {/* 6. Unit Selector */}
                    <td style={{ verticalAlign: 'middle' }}>
                      <select
                        value={row?.unit || 'Quintal'}
                        onChange={(e) => handleChange(m.id, 'unit', e.target.value)}
                        style={{ height: '36px', fontSize: '0.8rem', padding: '0 0.5rem', width: '100px' }}
                      >
                        <option value="Quintal">Quintal</option>
                        <option value="Kg">Kg</option>
                        <option value="Tonne">Tonne</option>
                        <option value="Litre">Litre</option>
                      </select>
                    </td>

                    {/* 7. Price Change Delta Indicator */}
                    <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                      {delta ? (
                        delta.unitMismatch ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: '#eff6ff',
                            color: '#1e40af',
                            border: '1px solid #bfdbfe'
                          }}>
                            Unit Changed
                          </span>
                        ) : delta.isIncrease ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#ecfdf5',
                            color: '#065f46',
                            border: '1px solid #a7f3d0'
                          }}>
                            <TrendingUp size={12} style={{ color: '#059669' }} />
                            +{formatINR(delta.diff)} (+{delta.percent.toFixed(1)}%)
                          </span>
                        ) : delta.isDecrease ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#fef2f2',
                            color: '#991b1b',
                            border: '1px solid #fecaca'
                          }}>
                            <TrendingDown size={12} style={{ color: '#dc2626' }} />
                            -{formatINR(Math.abs(delta.diff))} ({delta.percent.toFixed(1)}%)
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #e2e8f0'
                          }}>
                            <Minus size={11} style={{ color: '#94a3b8' }} />
                            Unchanged
                          </span>
                        )
                      ) : row?.price ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: 'rgba(15, 118, 110, 0.1)',
                          color: 'var(--primary)',
                          border: '1px solid rgba(15, 118, 110, 0.2)'
                        }}>
                          New Rate
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>

                    {/* 8. Effective Date Picker */}
                    <td style={{ verticalAlign: 'middle' }}>
                      <input
                        type="date"
                        value={row?.effective_date || ''}
                        onChange={(e) => handleChange(m.id, 'effective_date', e.target.value)}
                        style={{ height: '36px', fontSize: '0.8rem', width: '135px', padding: '0 0.5rem' }}
                      />
                    </td>

                    {/* 9. Status & Internal Notes */}
                    <td style={{ verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div>
                          {hasDraft ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a'
                            }}>
                              <Clock size={11} /> Draft Saved
                            </span>
                          ) : isModified ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe'
                            }}>
                              Unsaved Edit
                            </span>
                          ) : lp ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0'
                            }}>
                              <CheckCircle size={11} /> Published
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.7rem',
                              fontWeight: 500,
                              backgroundColor: '#f1f5f9',
                              color: '#64748b'
                            }}>
                              Pending Rate
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={row?.remarks || ''}
                          onChange={(e) => handleChange(m.id, 'remarks', e.target.value)}
                          placeholder="Internal note (optional)..."
                          style={{
                            height: '28px',
                            fontSize: '0.75rem',
                            padding: '0 0.5rem',
                            backgroundColor: 'var(--bg-base)',
                            border: '1px solid var(--border)'
                          }}
                        />
                      </div>
                    </td>

                    {/* 10. Row Action (Reset) */}
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      {isModified ? (
                        <button
                          onClick={() => handleResetRow(m.id)}
                          style={{ padding: '0.4rem', color: 'var(--text-muted)', cursor: 'pointer' }}
                          title="Discard unsaved edits and reset to published rate"
                        >
                          <RotateCcw size={15} />
                        </button>
                      ) : (
                        <span style={{ color: 'var(--border)' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Table Footer Helper */}
        <div style={{
          padding: '0.9rem 1.25rem',
          backgroundColor: 'var(--bg-base)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}>
          <div>
            Showing <strong>{filteredMaterials.length}</strong> of {materials.length} configured commodities.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} /> Published Live
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} /> Pending / Draft
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} /> Unsaved Edits
            </span>
          </div>
        </div>
      </div>

      {/* ─── PUBLICATION HISTORY SECTION ───────────────────────────────── */}
      {showHistory && (
        <div className="glass-panel" style={{
          backgroundColor: 'var(--bg-surface)',
          overflow: 'hidden',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--bg-base)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} style={{ color: 'var(--text-primary)' }} />
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Recent Publication History (Last {publicationHistory.length} Published Updates)
              </h2>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Published Timestamp</th>
                  <th style={{ width: '20%' }}>Commodity</th>
                  <th style={{ width: '18%', textAlign: 'right' }}>Published Rate</th>
                  <th style={{ width: '15%' }}>Effective Date</th>
                  <th style={{ width: '12%' }}>Status</th>
                  <th style={{ width: '13%' }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {publicationHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No publication history found in database.
                    </td>
                  </tr>
                ) : (
                  publicationHistory.map(hist => {
                    const material = materials.find(m => m.id === hist.raw_material_id);
                    return (
                      <tr key={hist.id}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {formatDateTime(hist.created_at)}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {material ? material.name_en : hist.raw_material_id}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatINR(hist.price)} / {hist.unit}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {formatDateOnly(hist.effective_date)}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            backgroundColor: '#ecfdf5',
                            color: '#065f46',
                            border: '1px solid #a7f3d0'
                          }}>
                            <CheckCircle size={10} /> Published
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {hist.remarks || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── PUBLICATION REVIEW & CONFIRMATION MODAL ────────────────────── */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-glow), 0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            maxWidth: '640px',
            width: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh'
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--bg-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Review & Confirm Price Publication
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Verify the commodity rates before broadcasting to the Shubh Labh Buyer App.
                </p>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={saving}
                style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Audience Confirmation Badge */}
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(15, 118, 110, 0.08)',
                border: '1px solid rgba(15, 118, 110, 0.25)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.8rem',
                color: 'var(--primary)'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Users size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Target Audience: All Registered App Buyers</div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    Upon confirmation, these updated rates will immediately replace current rates across all buyer watchlists.
                  </div>
                </div>
              </div>

              {/* Items Summary Table */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Commodity</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>Current Rate</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>New Published Rate</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>Change</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Effective Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPublishItems.map(item => (
                      <tr key={item.materialId} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.name_en}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {item.currentPrice ? `${formatINR(item.currentPrice)} / ${item.currentUnit}` : '-'}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatINR(item.newPrice)} / {item.unit}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                          {item.delta ? (
                            item.delta.isIncrease ? (
                              <span style={{ color: '#059669', fontWeight: 700 }}>
                                +{formatINR(item.delta.diff)}
                              </span>
                            ) : item.delta.isDecrease ? (
                              <span style={{ color: '#dc2626', fontWeight: 700 }}>
                                -{formatINR(Math.abs(item.delta.diff))}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Unchanged</span>
                            )
                          ) : (
                            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>New</span>
                          )}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>
                          {formatDateOnly(item.effective_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                * Unchanged commodity prices that are not modified will retain their current published rates.
              </p>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--bg-base)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={saving}
                className="btn btn-secondary"
                style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
              >
                Cancel & Edit
              </button>

              <button
                type="button"
                onClick={() => executeSave(true, pendingPublishItems)}
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
              >
                {saving ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Confirm & Publish {pendingPublishItems.length} Prices</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
