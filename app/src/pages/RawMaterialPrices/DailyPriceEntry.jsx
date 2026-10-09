import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Save, AlertTriangle, CheckCircle, Edit2, X, Package } from 'lucide-react';
import { format } from 'date-fns';

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

/* ─── Main Component ──────────────────────────────────────── */
const DailyPriceEntry = () => {
  const today = format(new Date(), 'yyyy-MM-dd');

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
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: string }
  const [entryDate, setEntryDate] = useState(today);
  const [showAllBrokers, setShowAllBrokers] = useState(false);

  /* add-entry form */
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [formState, setFormState] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  /* edit modal */
  const [editingEntry, setEditingEntry] = useState(null);
  const [editErrors, setEditErrors] = useState({});

  /* ─── Fetch ─────────────────────────────────────────────── */
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

  /* ─── Helpers ───────────────────────────────────────────── */
  const getAvailableBrokers = (materialId) => {
    if (showAllBrokers || !materialId) return brokers;
    const mapped = brokerMaterials.filter(bm => bm.raw_material_id === materialId).map(bm => bm.broker_id);
    return mapped.length === 0 ? brokers : brokers.filter(b => mapped.includes(b.id));
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    if (type === 'success') setTimeout(() => setMessage(null), 5000);
  };

  /* ─── Date change protection ─────────────────────────────── */
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

  /* ─── Material select ────────────────────────────────────── */
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

  /* ─── Generic field updater ──────────────────────────────── */
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

  /* ─── Validation ─────────────────────────────────────────── */
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
    if (dup) errs._form = 'An entry for this material and broker already exists.';
    return errs;
  };

  /* ─── Add entry ──────────────────────────────────────────── */
  const handleAddEntry = () => {
    const errs = validate(formState);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setEntries(prev => [...prev, { ...formState, id: `entry-${Date.now()}-${Math.random()}` }]);
    setSelectedMaterialId('');
    setFormState(null);
    setFormErrors({});
  };

  /* ─── Edit ───────────────────────────────────────────────── */
  const openEdit = (entry) => { setEditingEntry({ ...entry }); setEditErrors({}); };
  const handleSaveEdit = () => {
    const errs = validate(editingEntry, editingEntry.id);
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    setEntries(prev => prev.map(e => e.id === editingEntry.id ? editingEntry : e));
    setEditingEntry(null);
  };

  /* ─── Delete ─────────────────────────────────────────────── */
  const handleDelete = (id) => {
    if (window.confirm('Remove this entry?')) {
      setEntries(prev => prev.filter(e => e.id !== id));
    }
  };

  /* ─── Clear All ──────────────────────────────────────────── */
  const handleClearAll = () => {
    if (entries.length === 0) return;
    if (window.confirm('Clear all unsaved entries?')) {
      setEntries([]);
      setSelectedMaterialId('');
      setFormState(null);
      setFormErrors({});
    }
  };

  /* ─── Save All ───────────────────────────────────────────── */
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

  /* ─── Price type badge ───────────────────────────────────── */
  const PriceTypeBadge = ({ typeId }) => {
    const pt = priceTypes.find(p => p.id === typeId);
    if (!pt) return <span className="text-muted text-[14px]">-</span>;
    const name = pt.type_name || '';
    const isDelivered = name.toLowerCase().includes('delivered');
    const cls = isDelivered
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-violet-50 text-violet-700 border-violet-200';
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold border ${cls}`}>
        {name}
      </span>
    );
  };

  /* ─── Form fields (shared by Add + Edit) ─────────────────── */
  const renderFormFields = (state, setState, errors) => {
    const availableGrades = qualityGrades.filter(q => q.raw_material_id === state.raw_material_id);
    const availableBrokers = getAvailableBrokers(state.raw_material_id);

    const fieldCls = (errKey) =>
      `w-full h-[42px] px-3 border ${errors[errKey] ? 'border-red-400 bg-red-50' : 'border-[#E2E8F0]'} rounded-lg text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-white text-[#0F172A]`;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
        {/* Quality/Grade */}
        <div>
          <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
            Quality / Grade
          </label>
          <select
            className={fieldCls('quality_grade_id')}
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
            className={fieldCls('broker_id')}
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
            className={fieldCls('market_location')}
            placeholder="e.g. Jaipur Mandi"
            value={state.market_location}
            onChange={e => setState(prev => ({ ...prev, market_location: e.target.value }))}
          />
        </div>

        {/* Price */}
        <div>
          <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
            Price (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            className={`${fieldCls('price')} text-right font-semibold`}
            placeholder="0.00"
            min="0"
            step="0.01"
            value={state.price}
            onChange={e => setState(prev => ({ ...prev, price: e.target.value }))}
          />
          {errors.price && <p className="text-[12px] text-red-500 mt-1">{errors.price}</p>}
        </div>

        {/* Unit */}
        <div>
          <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
            Unit <span className="text-red-500">*</span>
          </label>
          <select
            className={fieldCls('unit_id')}
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
            className={fieldCls('price_type_id')}
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
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
            Remarks
          </label>
          <input
            type="text"
            className={fieldCls('remarks')}
            placeholder="Optional notes..."
            value={state.remarks}
            onChange={e => setState(prev => ({ ...prev, remarks: e.target.value }))}
          />
        </div>
      </div>
    );
  };

  /* ─── Loading screen ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-[#64748B]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
        <p className="text-[15px] font-medium">Loading configuration...</p>
      </div>
    );
  }

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* ── Global message banner ── */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border text-[15px] font-medium shadow-sm ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success'
            ? <CheckCircle size={18} className="shrink-0" />
            : <AlertTriangle size={18} className="shrink-0" />}
          <span className="flex-1">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-current opacity-50 hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── CARD 1: Date + Material selector ── */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h2 className="text-[17px] font-bold text-[#0F172A]">Customer Price Publishing</h2>
            <p className="text-[14px] text-[#64748B] mt-0.5">Select a date and material to begin entering prices</p>
          </div>
          {/* Override mapping toggle */}
          <label
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[#475569] cursor-pointer select-none"
            title="Show all brokers regardless of material-to-broker mapping"
          >
            <input
              type="checkbox"
              checked={showAllBrokers}
              onChange={e => setShowAllBrokers(e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            Override broker mapping
          </label>
        </div>

        <div className="flex flex-col sm:flex-row gap-5">
          {/* Entry Date */}
          <div className="sm:w-48">
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
          </div>

          {/* Raw Material */}
          <div className="flex-1 max-w-sm">
            <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">
              Raw Material
            </label>
            <select
              className="w-full h-[42px] px-3 border border-[#E2E8F0] rounded-lg text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-white text-[#0F172A]"
              value={selectedMaterialId}
              onChange={e => handleSelectMaterial(e.target.value)}
            >
              <option value="">— Choose material —</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name_en}{m.name_hi ? ` (${m.name_hi})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── CARD 2: Add New Entry form ── */}
      {formState && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div>
              <h3 className="text-[15px] font-bold text-[#0F172A]">Add New Entry</h3>
              <p className="text-[13px] text-[#64748B] mt-0.5">
                Material: <span className="font-semibold text-primary">{materials.find(m => m.id === selectedMaterialId)?.name_en}</span>
              </p>
            </div>
          </div>

          <div className="p-5">
            {/* Form-level error */}
            {formErrors._form && (
              <div className="flex items-center gap-2 mb-4 text-[13px] text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
                <AlertTriangle size={15} className="shrink-0" />
                {formErrors._form}
              </div>
            )}
            {renderFormFields(formState, setFormState, formErrors)}
          </div>

          <div className="flex justify-end gap-3 px-5 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
            <button
              className="h-[42px] px-5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] font-medium rounded-lg shadow-sm transition-colors text-[15px]"
              onClick={() => { setFormState(null); setSelectedMaterialId(''); setFormErrors({}); }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary h-[42px] px-6 text-[15px]"
              onClick={handleAddEntry}
            >
              <Plus size={17} />
              Add Entry
            </button>
          </div>
        </div>
      )}

      {/* ── CARD 3: Today's Entries ── */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <h3 className="text-[15px] font-bold text-[#0F172A]">Today's Entries</h3>
            {entries.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-primary/10 text-primary border border-primary/20">
                {entries.length}
              </span>
            )}
          </div>
          {entries.length > 0 && (
            <button
              className="text-[13px] font-medium text-red-500 hover:text-red-700 transition-colors"
              onClick={handleClearAll}
            >
              Clear All
            </button>
          )}
        </div>

        {/* Empty state */}
        {entries.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-full bg-slate-50 border border-[#E2E8F0] flex items-center justify-center text-[#64748B] mb-4">
              <Package size={24} />
            </div>
            <h4 className="text-[16px] font-bold text-[#0F172A] mb-1.5">No price entries yet</h4>
            <p className="text-[14px] text-[#64748B] max-w-xs">
              Select a raw material above to add today's market price.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="data-table-container" style={{ maxHeight: 'none', border: 'none', borderRadius: 0, boxShadow: 'none' }}>
              <table className="data-table mobile-cards-table" style={{ minWidth: '900px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                    <th>Material</th>
                    <th>Quality</th>
                    <th>Broker</th>
                    <th>Location</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th>Unit</th>
                    <th>Price Type</th>
                    <th>Remarks</th>
                    <th style={{ textAlign: 'center', width: '90px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {entries.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-[#F8FAFC] transition-colors group">
                      <td data-label="#" style={{ textAlign: 'center' }} className="text-[#94A3B8] text-[14px]">
                        {idx + 1}
                      </td>
                      <td data-label="Material">
                        <div className="font-semibold text-primary text-[14.5px]">
                          {materials.find(m => m.id === entry.raw_material_id)?.name_en}
                        </div>
                        {materials.find(m => m.id === entry.raw_material_id)?.name_hi && (
                          <div className="text-[12px] text-[#94A3B8] mt-0.5">
                            {materials.find(m => m.id === entry.raw_material_id)?.name_hi}
                          </div>
                        )}
                      </td>
                      <td data-label="Quality" className="text-[#475569] text-[14.5px]">
                        {qualityGrades.find(q => q.id === entry.quality_grade_id)?.grade_name || (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td data-label="Broker" className="font-medium text-[#0F172A] text-[14.5px]">
                        {brokers.find(b => b.id === entry.broker_id)?.broker_name || (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td data-label="Location" className="text-[#475569] text-[14.5px]">
                        {entry.market_location || <span className="text-muted">-</span>}
                      </td>
                      <td data-label="Price" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} className="font-bold text-primary text-[15px]">
                        ₹{formatPrice(entry.price)}
                      </td>
                      <td data-label="Unit" className="text-[#475569] text-[14.5px]">
                        {units.find(u => u.id === entry.unit_id)?.unit_name || '-'}
                      </td>
                      <td data-label="Price Type">
                        <PriceTypeBadge typeId={entry.price_type_id} />
                      </td>
                      <td data-label="Remarks" className="text-[#475569] text-[14px]">
                        <div className="truncate max-w-[150px]" title={entry.remarks || ''}>
                          {entry.remarks || <span className="text-muted">-</span>}
                        </div>
                      </td>
                      <td data-label="Actions" style={{ textAlign: 'center' }}>
                        <div className="flex items-center justify-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button
                            className="btn-icon text-[#475569] hover:text-primary"
                            title="Edit"
                            onClick={() => openEdit(entry)}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            className="btn-icon text-[#475569] hover:text-red-500"
                            title="Delete"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Save / Clear footer */}
            <div className="px-5 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end">
              <button
                className="btn btn-primary h-[42px] px-7 text-[15px] shadow-md"
                onClick={handleSaveAll}
                disabled={saving}
              >
                <Save size={17} />
                {saving ? 'Saving...' : 'Save All Entries'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editingEntry && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] rounded-t-xl">
              <div>
                <h3 className="text-[16px] font-bold text-[#0F172A]">Edit Entry</h3>
                <p className="text-[13px] text-[#64748B] mt-0.5">
                  {materials.find(m => m.id === editingEntry.raw_material_id)?.name_en}
                </p>
              </div>
              <button
                className="btn-icon text-[#94A3B8] hover:text-[#0F172A]"
                onClick={() => setEditingEntry(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {editErrors._form && (
                <div className="flex items-center gap-2 mb-4 text-[13px] text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
                  <AlertTriangle size={15} className="shrink-0" />
                  {editErrors._form}
                </div>
              )}
              {renderFormFields(editingEntry, setEditingEntry, editErrors)}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-xl">
              <button
                className="h-[42px] px-5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] font-medium rounded-lg shadow-sm transition-colors text-[15px]"
                onClick={() => setEditingEntry(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary h-[42px] px-6 text-[15px]"
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
