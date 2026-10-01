import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Plus, Trash2, Save, AlertTriangle, CheckCircle,
  Edit2, X, Package, Search, Calendar, ChevronDown
} from 'lucide-react';
import { format, subDays } from 'date-fns';

/* ─── Helpers ─────────────────────────────────────────────── */
const formatPrice = (price) =>
  Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY_FORM = {
  raw_material_id: '',
  quality_grade_id: '',
  broker_id: '',
  market_location: '',
  price: '',
  unit_id: '',
  price_type_id: '',
  remarks: '',
};

/* ─── Searchable Material Selector ───────────────────────── */
const MaterialSelector = ({ materials, value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  const selected = materials.find(m => m.id === value);

  const filtered = query
    ? materials.filter(m =>
        m.name_en?.toLowerCase().includes(query.toLowerCase()) ||
        m.name_hi?.includes(query)
      )
    : materials;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className="w-full h-[42px] px-3 border border-[#E2E8F0] rounded-lg text-[15px] bg-white text-left flex items-center justify-between gap-2 hover:border-[#CBD5E1] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selected ? 'text-[#0F172A] font-medium' : 'text-[#94A3B8]'}>
          {selected
            ? `${selected.name_en}${selected.name_hi ? ` (${selected.name_hi})` : ''}`
            : '— Choose material —'}
        </span>
        <ChevronDown size={15} className={`text-[#94A3B8] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-lg border border-[#E2E8F0] shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-[#E2E8F0]">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search material..."
                className="w-full h-[34px] pl-8 pr-3 border border-[#E2E8F0] rounded-md text-[14px] focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>
          {/* Clear option */}
          <div className="max-h-56 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect('')}
              className="w-full text-left px-3 py-2 text-[14px] text-[#94A3B8] hover:bg-[#F8FAFC] transition-colors"
            >
              — Clear selection —
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-[13px] text-[#94A3B8] text-center">No materials found</div>
            ) : (
              filtered.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m.id)}
                  className={`w-full text-left px-3 py-2.5 text-[14px] transition-colors flex items-center justify-between gap-2 ${
                    m.id === value ? 'bg-primary/5 text-primary font-semibold' : 'text-[#0F172A] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <span>{m.name_en}</span>
                  {m.name_hi && <span className="text-[12px] text-[#94A3B8]">{m.name_hi}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Price Input with ₹ prefix ───────────────────────────── */
const PriceInput = ({ value, onChange, hasError, placeholder = '0.00' }) => (
  <div className={`flex h-[42px] border ${hasError ? 'border-red-400' : 'border-[#E2E8F0]'} rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-shadow bg-white`}>
    <span className="inline-flex items-center px-3 bg-[#F8FAFC] border-r border-[#E2E8F0] text-[#475569] text-[15px] font-semibold shrink-0 select-none">
      ₹
    </span>
    <input
      type="number"
      className="flex-1 px-3 text-[15px] font-semibold text-right text-[#0F172A] outline-none bg-white"
      placeholder={placeholder}
      min="0"
      step="0.01"
      value={value}
      onChange={onChange}
    />
  </div>
);

/* ─── Inline delete confirm ───────────────────────────────── */
const DeleteConfirmButton = ({ onConfirm }) => {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          className="px-2 py-1 text-[11px] font-semibold rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
          onClick={() => { setConfirming(false); onConfirm(); }}
        >
          Delete
        </button>
        <button
          className="px-2 py-1 text-[11px] font-semibold rounded border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] transition-colors"
          onClick={() => setConfirming(false)}
        >
          Keep
        </button>
      </div>
    );
  }
  return (
    <button
      className="btn-icon text-[#475569] hover:text-red-500"
      title="Delete"
      onClick={() => setConfirming(true)}
    >
      <Trash2 size={15} />
    </button>
  );
};

/* ─── Price Type Badge ────────────────────────────────────── */
const PriceTypeBadge = ({ typeId, priceTypes }) => {
  const pt = priceTypes.find(p => p.id === typeId);
  if (!pt) return <span className="text-[#94A3B8] text-[13px]">—</span>;
  const name = pt.type_name || '';
  const isDelivered = name.toLowerCase().includes('delivered');
  const cls = isDelivered
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-violet-50 text-violet-700 border-violet-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11.5px] font-semibold border ${cls}`}>
      {name}
    </span>
  );
};

/* ─── Main Component ──────────────────────────────────────── */
const DailyPriceEntry = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  /* master data */
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [brokerMaterials, setBrokerMaterials] = useState([]);
  const [qualityGrades, setQualityGrades] = useState([]);
  const [units, setUnits] = useState([]);
  const [priceTypes, setPriceTypes] = useState([]);

  /* page state */
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState(null);
  const [entryDate, setEntryDate] = useState(today);
  const [showAllBrokers, setShowAllBrokers] = useState(false);

  /* add-entry form */
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [formState, setFormState] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  /* edit modal */
  const [editingEntry, setEditingEntry] = useState(null);
  const [editErrors, setEditErrors] = useState({});

  /* ─── Fetch ────────────────────────────────────────────── */
  useEffect(() => { fetchMasterData(); }, []);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const [matsRes, brokersRes, gradesRes, unitsRes, pTypesRes, brkMatsRes] = await Promise.all([
        supabase.from('raw_materials').select('*').eq('active', true).order('display_order'),
        supabase.from('brokers').select('*').eq('active', true).order('broker_name'),
        supabase.from('material_quality_grades').select('*').eq('active', true).order('display_order'),
        supabase.from('rm_units').select('*').eq('active', true).order('display_order'),
        supabase.from('rm_price_types').select('*').eq('active', true).order('display_order'),
        supabase.from('broker_materials').select('*'),
      ]);
      setMaterials(matsRes.data || []);
      setBrokers(brokersRes.data || []);
      setQualityGrades(gradesRes.data || []);
      setUnits(unitsRes.data || []);
      setPriceTypes(pTypesRes.data || []);
      setBrokerMaterials(brkMatsRes.data || []);
    } catch (err) {
      console.error('Error fetching master data:', err);
      setMessage({ type: 'error', text: 'Failed to load configuration. Please refresh.' });
    } finally {
      setLoading(false);
    }
  };

  /* ─── Helpers ──────────────────────────────────────────── */
  const getAvailableBrokers = (materialId) => {
    if (showAllBrokers || !materialId) return brokers;
    const mapped = brokerMaterials.filter(bm => bm.raw_material_id === materialId).map(bm => bm.broker_id);
    return mapped.length === 0 ? brokers : brokers.filter(b => mapped.includes(b.id));
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    if (type === 'success') setTimeout(() => setMessage(null), 5000);
  };

  /* ─── Date change protection ───────────────────────────── */
  const handleDateChange = (newDate) => {
    if (entries.length > 0) {
      if (!window.confirm(
        'You have unsaved entries for the current date. Changing the date will clear them. Continue?'
      )) return;
      setEntries([]);
      setSelectedMaterialId('');
      setFormState(null);
      setFormErrors({});
    }
    setEntryDate(newDate);
  };

  /* ─── Material select ──────────────────────────────────── */
  const handleSelectMaterial = (matId) => {
    setSelectedMaterialId(matId);
    if (!matId) { setFormState(null); setFormErrors({}); return; }
    const mat = materials.find(m => m.id === matId);
    const grades = qualityGrades.filter(q => q.raw_material_id === matId);
    setFormState({
      ...EMPTY_FORM,
      raw_material_id: matId,
      quality_grade_id: grades.length > 0 ? grades[0].id : '',
      unit_id: mat?.default_unit_id || '',
      price_type_id: mat?.default_price_type_id || '',
    });
    setFormErrors({});
  };

  /* ─── Generic field updater ────────────────────────────── */
  const applyField = (setter, field, value) => {
    setter(prev => {
      if (!prev) return prev;
      const next = { ...prev, [field]: value };
      if (field === 'broker_id' && value && !prev.market_location) {
        const broker = brokers.find(b => b.id === value);
        if (broker?.market_location) next.market_location = broker.market_location;
      }
      return next;
    });
  };

  /* ─── Validation ───────────────────────────────────────── */
  const validate = (entry, excludeId = null) => {
    const errs = {};
    if (!entryDate) errs.entryDate = 'Required';
    if (!entry.broker_id) errs.broker_id = 'Required';
    if (!entry.price) {
      errs.price = 'Required';
    } else if (isNaN(Number(entry.price)) || Number(entry.price) <= 0) {
      errs.price = 'Must be a positive number';
    }
    if (!entry.unit_id) errs.unit_id = 'Required';
    if (!entry.price_type_id) errs.price_type_id = 'Required';
    const dup = entries.some(e =>
      e.id !== excludeId &&
      e.raw_material_id === entry.raw_material_id &&
      e.broker_id === entry.broker_id
    );
    if (dup) errs._form = 'An entry for this material and broker already exists in this session.';
    return errs;
  };

  /* ─── Add entry ────────────────────────────────────────── */
  const handleAddEntry = () => {
    const errs = validate(formState);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    const mat = materials.find(m => m.id === formState.raw_material_id);
    setEntries(prev => [...prev, { ...formState, id: `entry-${Date.now()}-${Math.random()}` }]);
    showMessage('success', `Price entry added for ${mat?.name_en || 'material'}.`);
    setSelectedMaterialId('');
    setFormState(null);
    setFormErrors({});
  };

  /* ─── Edit ─────────────────────────────────────────────── */
  const openEdit = (entry) => { setEditingEntry({ ...entry }); setEditErrors({}); };
  const handleSaveEdit = () => {
    const errs = validate(editingEntry, editingEntry.id);
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    setEntries(prev => prev.map(e => e.id === editingEntry.id ? editingEntry : e));
    setEditingEntry(null);
  };

  /* ─── Delete ───────────────────────────────────────────── */
  const handleDelete = (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  /* ─── Clear All ────────────────────────────────────────── */
  const handleClearAll = () => {
    if (entries.length === 0) return;
    if (window.confirm('Clear all unsaved entries?')) {
      setEntries([]);
      setSelectedMaterialId('');
      setFormState(null);
      setFormErrors({});
    }
  };

  /* ─── Save All ─────────────────────────────────────────── */
  const handleSaveAll = async () => {
    if (!entryDate) { showMessage('error', 'Entry date is missing.'); return; }
    if (entries.length === 0) { showMessage('error', 'No entries to save.'); return; }
    setSaving(true);
    setMessage(null);
    try {
      const records = entries.map(e => ({
        entry_date: entryDate,
        raw_material_id: e.raw_material_id,
        quality_grade_id: e.quality_grade_id || null,
        broker_id: e.broker_id || null,
        market_location: e.market_location || null,
        price: Number(e.price),
        unit_id: e.unit_id,
        price_type_id: e.price_type_id,
        remarks: e.remarks || null,
      }));
      const { error } = await supabase.from('raw_material_price_entries').insert(records);
      if (error) {
        if (error.code === '23505') throw new Error('A duplicate entry already exists in the database for this material, broker, and date.');
        throw error;
      }
      showMessage('success', `${records.length} price ${records.length === 1 ? 'entry' : 'entries'} saved successfully.`);
      setEntries([]);
      setSelectedMaterialId('');
      setFormState(null);
      setFormErrors({});
    } catch (err) {
      console.error('Save error:', err);
      showMessage('error', err.message || 'Failed to save entries. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Form fields (shared by Add + Edit) ──────────────── */
  const renderFormFields = (state, setState, errors) => {
    const availableGrades = qualityGrades.filter(q => q.raw_material_id === state.raw_material_id);
    const availableBrokers = getAvailableBrokers(state.raw_material_id);

    const selectCls = (errKey) =>
      `w-full h-[42px] px-3 border ${errors[errKey] ? 'border-red-400 bg-red-50' : 'border-[#E2E8F0]'} rounded-lg text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-white text-[#0F172A]`;

    const inputCls = (errKey) =>
      `w-full h-[42px] px-3 border ${errors[errKey] ? 'border-red-400 bg-red-50' : 'border-[#E2E8F0]'} rounded-lg text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-white text-[#0F172A]`;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
        {/* Quality/Grade */}
        <div>
          <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
            Quality / Grade
          </label>
          <select
            className={selectCls('quality_grade_id')}
            value={state.quality_grade_id}
            onChange={e => setState(prev => ({ ...prev, quality_grade_id: e.target.value }))}
          >
            <option value="">Standard / Any</option>
            {availableGrades.map(q => (
              <option key={q.id} value={q.id}>{q.grade_name}</option>
            ))}
          </select>
        </div>

        {/* Broker */}
        <div>
          <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
            Broker <span className="text-red-500">*</span>
          </label>
          <select
            className={selectCls('broker_id')}
            value={state.broker_id}
            onChange={e => applyField(setState, 'broker_id', e.target.value)}
          >
            <option value="">Select Broker...</option>
            {availableBrokers.map(b => (
              <option key={b.id} value={b.id}>{b.broker_name}</option>
            ))}
          </select>
          {errors.broker_id && <p className="text-[12px] text-red-500 mt-1">{errors.broker_id}</p>}
        </div>

        {/* Location */}
        <div>
          <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
            Location
          </label>
          <input
            type="text"
            className={inputCls('market_location')}
            placeholder="e.g. Jaipur Mandi"
            value={state.market_location}
            onChange={e => setState(prev => ({ ...prev, market_location: e.target.value }))}
          />
        </div>

        {/* Price */}
        <div>
          <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
            Price <span className="text-red-500">*</span>
          </label>
          <PriceInput
            value={state.price}
            onChange={e => setState(prev => ({ ...prev, price: e.target.value }))}
            hasError={!!errors.price}
          />
          {errors.price && <p className="text-[12px] text-red-500 mt-1">{errors.price}</p>}
        </div>

        {/* Unit */}
        <div>
          <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
            Unit <span className="text-red-500">*</span>
          </label>
          <select
            className={selectCls('unit_id')}
            value={state.unit_id}
            onChange={e => setState(prev => ({ ...prev, unit_id: e.target.value }))}
          >
            <option value="">Select Unit...</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.unit_name}</option>
            ))}
          </select>
          {errors.unit_id && <p className="text-[12px] text-red-500 mt-1">{errors.unit_id}</p>}
        </div>

        {/* Price Type */}
        <div>
          <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
            Price Type <span className="text-red-500">*</span>
          </label>
          <select
            className={selectCls('price_type_id')}
            value={state.price_type_id}
            onChange={e => setState(prev => ({ ...prev, price_type_id: e.target.value }))}
          >
            <option value="">Select Type...</option>
            {priceTypes.map(pt => (
              <option key={pt.id} value={pt.id}>{pt.type_name}</option>
            ))}
          </select>
          {errors.price_type_id && <p className="text-[12px] text-red-500 mt-1">{errors.price_type_id}</p>}
        </div>

        {/* Remarks — full width */}
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
            Remarks
          </label>
          <input
            type="text"
            className={inputCls('remarks')}
            placeholder="Optional notes..."
            value={state.remarks}
            onChange={e => setState(prev => ({ ...prev, remarks: e.target.value }))}
          />
        </div>
      </div>
    );
  };

  /* ─── Loading screen ───────────────────────────────────── */
  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-[#64748B]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
        <p className="text-[15px] font-medium">Loading configuration...</p>
      </div>
    );
  }

  const selectedMat = materials.find(m => m.id === selectedMaterialId);

  /* ─── Render ───────────────────────────────────────────── */
  return (
    <div className="space-y-4">

      {/* ── Global message banner ── */}
      {message && (
        <div className={`flex items-center gap-3 p-3.5 rounded-xl border text-[14.5px] font-medium shadow-sm ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success'
            ? <CheckCircle size={17} className="shrink-0" />
            : <AlertTriangle size={17} className="shrink-0" />}
          <span className="flex-1">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-current opacity-50 hover:opacity-100 transition-opacity"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">

        {/* ── LEFT: Entry Controls (xl: 2/5 width) ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Date + Material card */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <h3 className="text-[15px] font-bold text-[#0F172A]">Entry Controls</h3>
              <label
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#64748B] cursor-pointer select-none"
                title="Show all brokers regardless of material-to-broker mapping"
              >
                <input
                  type="checkbox"
                  checked={showAllBrokers}
                  onChange={e => setShowAllBrokers(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-primary"
                />
                All brokers
              </label>
            </div>

            <div className="p-4 space-y-4">
              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
                  Entry Date
                </label>
                <input
                  type="date"
                  className="w-full h-[42px] px-3 border border-[#E2E8F0] rounded-lg text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-white text-[#0F172A]"
                  value={entryDate}
                  max={today}
                  onChange={e => handleDateChange(e.target.value)}
                />
                {/* Quick date shortcuts */}
                <div className="flex gap-2 mt-2">
                  {[
                    { label: 'Today', val: today },
                    { label: 'Yesterday', val: yesterday },
                  ].map(({ label, val }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleDateChange(val)}
                      className={`text-[12px] px-2.5 py-1 rounded-md border font-medium transition-colors ${
                        entryDate === val
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  {entryDate && (
                    <span className="text-[12px] text-[#94A3B8] flex items-center gap-1 ml-auto">
                      <Calendar size={12} />
                      {format(new Date(entryDate), 'dd MMM yyyy')}
                    </span>
                  )}
                </div>
              </div>

              {/* Material */}
              <div>
                <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
                  Raw Material
                </label>
                <MaterialSelector
                  materials={materials}
                  value={selectedMaterialId}
                  onChange={handleSelectMaterial}
                />
              </div>
            </div>
          </div>

          {/* Add Entry Form */}
          {formState && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <h3 className="text-[15px] font-bold text-[#0F172A]">Add New Entry</h3>
                <p className="text-[12.5px] text-[#64748B] mt-0.5">
                  <span className="font-semibold text-primary">{selectedMat?.name_en}</span>
                  {selectedMat?.name_hi && <span className="ml-1.5 text-[#94A3B8]">({selectedMat.name_hi})</span>}
                </p>
              </div>

              <div className="p-4">
                {formErrors._form && (
                  <div className="flex items-center gap-2 mb-3 text-[12.5px] text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg">
                    <AlertTriangle size={14} className="shrink-0" />
                    {formErrors._form}
                  </div>
                )}
                {renderFormFields(formState, setFormState, formErrors)}
              </div>

              <div className="flex justify-end gap-2.5 px-4 py-3.5 border-t border-[#E2E8F0] bg-[#F8FAFC]">
                <button
                  className="h-[38px] px-4 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] font-medium rounded-lg shadow-sm transition-colors text-[14px]"
                  onClick={() => { setFormState(null); setSelectedMaterialId(''); setFormErrors({}); }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary h-[38px] px-5 text-[14px]"
                  onClick={handleAddEntry}
                >
                  <Plus size={16} />
                  Add Entry
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Today's Entries (xl: 3/5 width) ── */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[15px] font-bold text-[#0F172A]">Today's Entries</h3>
                {entries.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    {entries.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {entryDate && (
                  <span className="text-[12px] text-[#94A3B8] hidden sm:block">
                    {format(new Date(entryDate), 'dd MMM yyyy')}
                  </span>
                )}
                {entries.length > 0 && (
                  <button
                    className="text-[12.5px] font-medium text-red-400 hover:text-red-600 transition-colors"
                    onClick={handleClearAll}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Empty state */}
            {entries.length === 0 ? (
              <div className="py-14 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] mb-3.5">
                  <Package size={22} />
                </div>
                <h4 className="text-[15px] font-bold text-[#0F172A] mb-1">No entries yet</h4>
                <p className="text-[13.5px] text-[#64748B] max-w-[220px]">
                  Select a raw material on the left to add a price entry.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left data-table hidden md:table" style={{ minWidth: '580px' }}>
                    <thead>
                      <tr>
                        <th className="py-3 px-4 text-xs font-semibold text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0] bg-white w-8 text-center">#</th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0] bg-white">Material</th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0] bg-white">Broker</th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0] bg-white text-right">Price</th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0] bg-white">Type</th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0] bg-white text-center w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {entries.map((entry, idx) => {
                        const mat = materials.find(m => m.id === entry.raw_material_id);
                        const broker = brokers.find(b => b.id === entry.broker_id);
                        const unit = units.find(u => u.id === entry.unit_id);
                        const grade = qualityGrades.find(q => q.id === entry.quality_grade_id);
                        return (
                          <tr key={entry.id} className="hover:bg-[#F8FAFC] transition-colors group">
                            <td className="py-3 px-4 text-[#94A3B8] text-[13px] text-center">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-primary text-[14px]">{mat?.name_en}</div>
                              <div className="text-[12px] text-[#94A3B8] mt-0.5">
                                {[grade?.grade_name, entry.market_location].filter(Boolean).join(' · ') || '—'}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-[14px] text-[#0F172A]">{broker?.broker_name || '—'}</td>
                            <td className="py-3 px-4 text-right">
                              <div className="font-bold text-primary text-[15px]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                ₹{formatPrice(entry.price)}
                              </div>
                              <div className="text-[11.5px] text-[#94A3B8]">{unit?.unit_name}</div>
                            </td>
                            <td className="py-3 px-4">
                              <PriceTypeBadge typeId={entry.price_type_id} priceTypes={priceTypes} />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  className="btn-icon text-[#475569] hover:text-primary"
                                  title="Edit"
                                  onClick={() => openEdit(entry)}
                                >
                                  <Edit2 size={14} />
                                </button>
                                <DeleteConfirmButton onConfirm={() => handleDelete(entry.id)} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Mobile stacked cards */}
                  <div className="md:hidden divide-y divide-[#F1F5F9]">
                    {entries.map((entry, idx) => {
                      const mat = materials.find(m => m.id === entry.raw_material_id);
                      const broker = brokers.find(b => b.id === entry.broker_id);
                      const unit = units.find(u => u.id === entry.unit_id);
                      const grade = qualityGrades.find(q => q.id === entry.quality_grade_id);
                      return (
                        <div key={entry.id} className="p-4 hover:bg-[#F8FAFC] transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <div className="font-semibold text-primary text-[15px]">{mat?.name_en}</div>
                              {grade && <div className="text-[12.5px] text-[#64748B] mt-0.5">{grade.grade_name}</div>}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-primary text-[17px]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                ₹{formatPrice(entry.price)}
                              </div>
                              <div className="text-[12px] text-[#94A3B8]">{unit?.unit_name}</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-[#475569] mb-3">
                            {broker && <span>Broker: <span className="font-medium text-[#0F172A]">{broker.broker_name}</span></span>}
                            {entry.market_location && <span>Location: <span className="font-medium text-[#0F172A]">{entry.market_location}</span></span>}
                            {entry.remarks && <span className="text-[#94A3B8] italic">{entry.remarks}</span>}
                          </div>
                          <div className="flex items-center justify-between">
                            <PriceTypeBadge typeId={entry.price_type_id} priceTypes={priceTypes} />
                            <div className="flex items-center gap-2">
                              <button
                                className="text-[13px] font-medium text-[#475569] hover:text-primary flex items-center gap-1 transition-colors"
                                onClick={() => openEdit(entry)}
                              >
                                <Edit2 size={13} /> Edit
                              </button>
                              <DeleteConfirmButton onConfirm={() => handleDelete(entry.id)} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer: Save */}
                <div className="px-4 py-3.5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between gap-3">
                  <p className="text-[13px] text-[#94A3B8]">
                    {entries.length} unsaved {entries.length === 1 ? 'entry' : 'entries'}
                  </p>
                  <button
                    className="btn btn-primary h-[38px] px-6 text-[14px] shadow-md"
                    onClick={handleSaveAll}
                    disabled={saving}
                  >
                    <Save size={15} />
                    {saving ? 'Saving...' : 'Save All'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editingEntry && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] rounded-t-xl">
              <div>
                <h3 className="text-[15px] font-bold text-[#0F172A]">Edit Entry</h3>
                <p className="text-[12.5px] text-[#64748B] mt-0.5">
                  {materials.find(m => m.id === editingEntry.raw_material_id)?.name_en}
                </p>
              </div>
              <button
                className="btn-icon text-[#94A3B8] hover:text-[#0F172A]"
                onClick={() => setEditingEntry(null)}
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              {editErrors._form && (
                <div className="flex items-center gap-2 mb-4 text-[12.5px] text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
                  <AlertTriangle size={14} className="shrink-0" />
                  {editErrors._form}
                </div>
              )}
              {renderFormFields(editingEntry, setEditingEntry, editErrors)}
            </div>

            <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-xl">
              <button
                className="h-[38px] px-4 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] font-medium rounded-lg shadow-sm transition-colors text-[14px]"
                onClick={() => setEditingEntry(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary h-[38px] px-5 text-[14px]"
                onClick={handleSaveEdit}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyPriceEntry;
