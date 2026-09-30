import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Save, FileEdit, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
import { format } from 'date-fns';

const DailyPriceEntry = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [brokerMaterials, setBrokerMaterials] = useState([]);
  const [qualityGrades, setQualityGrades] = useState([]);
  const [units, setUnits] = useState([]);
  const [allowedUnits, setAllowedUnits] = useState([]);
  const [priceTypes, setPriceTypes] = useState([]);
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState({ ready: [], errors: [], unused: 0 });
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const [entryDate, setEntryDate] = useState(today);

  // Toggle for overriding broker material mapping
  const [showAllBrokers, setShowAllBrokers] = useState(false);

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const [matsRes, brokersRes, gradesRes, unitsRes, pTypesRes, brkMatsRes, allowedUnitsRes] = await Promise.all([
        supabase.from('raw_materials').select('*').eq('active', true).order('display_order'),
        supabase.from('brokers').select('*').eq('active', true).order('broker_name'),
        supabase.from('material_quality_grades').select('*').eq('active', true).order('display_order'),
        supabase.from('rm_units').select('*').eq('active', true).order('display_order'),
        supabase.from('rm_price_types').select('*').eq('active', true).order('display_order'),
        supabase.from('broker_materials').select('*'),
        supabase.from('rm_allowed_units').select('*')
      ]);

      setMaterials(matsRes.data || []);
      setBrokers(brokersRes.data || []);
      setQualityGrades(gradesRes.data || []);
      setUnits(unitsRes.data || []);
      setAllowedUnits(allowedUnitsRes.data || []);
      setPriceTypes(pTypesRes.data || []);
      setBrokerMaterials(brkMatsRes.data || []);
      
      // Initialize with tracking required materials
      if (matsRes.data) {
        const defaultEntries = matsRes.data
          .filter(m => m.daily_tracking_required)
          .map(m => createEmptyEntry(m.id, m.default_unit_id, m.default_price_type_id));
        
        if (defaultEntries.length > 0) {
          setEntries(defaultEntries);
        } else {
          setEntries([createEmptyEntry()]);
        }
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
      setMessage({ type: 'error', text: 'Failed to load master configuration.' });
    } finally {
      setLoading(false);
    }
  };

  const createEmptyEntry = (materialId = '', unitId = '', priceTypeId = '') => ({
    id: `temp-${Date.now()}-${Math.random()}`,
    raw_material_id: materialId,
    quality_grade_id: '',
    broker_id: '',
    market_location: '',
    price: '',
    unit_id: unitId,
    price_type_id: priceTypeId,
    remarks: '',
    status: 'Official'
  });

  const handleAddRow = () => {
    setEntries([...entries, createEmptyEntry()]);
  };

  const handleDuplicateRow = (index) => {
    const toDuplicate = entries[index];
    const isUnused = !toDuplicate.price && !toDuplicate.broker_id && !toDuplicate.market_location && !toDuplicate.remarks;
    if (isUnused) {
      setMessage({ type: 'error', text: 'Enter at least one value before duplicating this row.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setEntries([
      ...entries.slice(0, index + 1),
      { ...toDuplicate, id: `temp-${Date.now()}-${Math.random()}`, price: '' },
      ...entries.slice(index + 1)
    ]);
  };

  const handleRemoveRow = (id) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const handleChange = (id, field, value) => {
    setEntries(entries.map(e => {
      if (e.id === id) {
        const updated = { ...e, [field]: value };
        // Auto-fill defaults when material changes
        if (field === 'raw_material_id') {
          const mat = materials.find(m => m.id === value);
          if (mat) {
            updated.unit_id = mat.default_unit_id || '';
            updated.price_type_id = mat.default_price_type_id || '';
          }
          
          // Auto-select first quality grade if available, or 'Standard/Any'
          const grades = qualityGrades.filter(q => q.raw_material_id === value);
          if (grades.length > 0) {
            updated.quality_grade_id = grades[0].id;
          } else {
            updated.quality_grade_id = '';
          }
        }
        // Auto-fill location when broker changes
        if (field === 'broker_id' && value && !e.market_location) {
           const broker = brokers.find(b => b.id === value);
           if (broker) {
             updated.market_location = broker.market_location || '';
           }
        }
        return updated;
      }
      return e;
    }));
  };

  const validateEntries = () => {
    const ready = [];
    const errors = [];
    let unused = 0;

    entries.forEach((e, index) => {
      const isUnused = !e.price && !e.broker_id && !e.market_location && !e.remarks;
      if (isUnused) {
        unused++;
        return;
      }

      const rowErrors = [];
      if (!e.raw_material_id) rowErrors.push('Material required');
      if (!e.price || Number(e.price) <= 0) rowErrors.push('Rate must be > 0');
      if (!e.unit_id) rowErrors.push('Unit required');
      if (!e.price_type_id) rowErrors.push('Price Type required');

      if (rowErrors.length > 0) {
        errors.push({ row: index + 1, material: e.raw_material_id, errors: rowErrors, data: e });
      } else {
        ready.push(e);
      }
    });

    return { ready, errors, unused };
  };

  const handleSaveClick = () => {
    const validation = validateEntries();
    if (validation.ready.length === 0 && validation.errors.length === 0) {
      setMessage({ type: 'error', text: 'No entries to save. Please enter at least one rate.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setReviewData(validation);
    setShowReview(true);
  };

  const confirmSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const recordsToInsert = reviewData.ready.map(e => ({
        entry_date: entryDate,
        raw_material_id: e.raw_material_id,
        quality_grade_id: e.quality_grade_id || null,
        broker_id: e.broker_id || null,
        market_location: e.market_location || null,
        price: Number(e.price),
        unit_id: e.unit_id,
        price_type_id: e.price_type_id,
        remarks: e.remarks || null,
        status: e.status,
        source: 'Manual Entry'
      }));

      const { error } = await supabase.from('raw_material_price_entries').insert(recordsToInsert);

      if (error) throw error;

      setMessage({ type: 'success', text: `Successfully saved ${recordsToInsert.length} price entries.` });
      
      const remaining = entries.filter(e => !reviewData.ready.find(r => r.id === e.id));
      setEntries(remaining.length > 0 ? remaining : [createEmptyEntry()]);
      setShowReview(false);
      
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Error saving entries:', error);
      
      let errorMsg = error.message || 'Failed to save entries.';
      if (errorMsg.includes('duplicate key value violates unique constraint')) {
         errorMsg = 'A duplicate quote for the same material and location on this date already exists. Please verify your entries.';
      }
      
      setMessage({ type: 'error', text: errorMsg });
      setShowReview(false);
    } finally {
      setSaving(false);
    }
  };

  const getAvailableBrokers = (materialId) => {
    if (showAllBrokers || !materialId) return brokers;
    const mappedBrokerIds = brokerMaterials.filter(bm => bm.raw_material_id === materialId).map(bm => bm.broker_id);
    if (mappedBrokerIds.length === 0) return brokers; // If no mapping exists for this material, show all
    return brokers.filter(b => mappedBrokerIds.includes(b.id));
  };

  const intendedCount = entries.filter(e => e.price || e.broker_id || e.market_location || e.remarks).length;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        Loading master configuration...
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-16 animate-fade-in">
      
      {/* Review Modal */}
      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-space-lg border-b border-surface-container-low flex items-center justify-between">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Review Price Entries</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Review {reviewData.ready.length + reviewData.errors.length} entries for {format(parseISO(entryDate), 'dd MMM yyyy')}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold">{reviewData.ready.length} Ready</span>
                <span className="px-3 py-1 rounded-full bg-error/10 text-error font-semibold">{reviewData.errors.length} Errors</span>
                <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-semibold">{reviewData.unused} Unused</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-space-lg bg-surface-container-lowest">
              {reviewData.errors.length > 0 && (
                <div className="mb-6 p-4 rounded-lg bg-error-container text-on-error-container border border-error/20">
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><AlertTriangle size={18} /> Cannot save until errors are fixed</h3>
                  <ul className="list-disc pl-8 space-y-1 text-sm">
                    {reviewData.errors.map((err, i) => {
                       const matName = materials.find(m => m.id === err.material)?.name_en || `Row ${err.row}`;
                       return <li key={i}><strong>{matName}</strong>: {err.errors.join(', ')}</li>
                    })}
                  </ul>
                </div>
              )}

              {reviewData.ready.length > 0 && (
                <div>
                  <h3 className="font-label-md text-label-md uppercase text-on-surface-variant font-semibold mb-3">Entries Ready to Save</h3>
                  <div className="border border-surface-container-low rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase">
                        <tr>
                          <th className="py-2 px-3">Material</th>
                          <th className="py-2 px-3">Grade</th>
                          <th className="py-2 px-3">Rate</th>
                          <th className="py-2 px-3">Unit</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Broker</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-low text-sm">
                        {reviewData.ready.map(entry => (
                          <tr key={entry.id}>
                            <td className="py-2 px-3 font-medium">{materials.find(m => m.id === entry.raw_material_id)?.name_en}</td>
                            <td className="py-2 px-3">{qualityGrades.find(q => q.id === entry.quality_grade_id)?.grade_name || 'Standard'}</td>
                            <td className="py-2 px-3 font-bold">₹{entry.price}</td>
                            <td className="py-2 px-3">{units.find(u => u.id === entry.unit_id)?.unit_name}</td>
                            <td className="py-2 px-3">{priceTypes.find(p => p.id === entry.price_type_id)?.type_name}</td>
                            <td className="py-2 px-3">{brokers.find(b => b.id === entry.broker_id)?.broker_name || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-space-md border-t border-surface-container-low bg-surface-container flex items-center justify-end gap-3 rounded-b-xl">
              <button 
                className="px-6 py-2 rounded-lg font-semibold hover:bg-surface-container-highest transition-colors text-on-surface"
                onClick={() => setShowReview(false)}
                disabled={saving}
              >
                Cancel & Edit
              </button>
              <button 
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-on-primary font-bold shadow-sm hover:bg-surface-tint transition-colors disabled:opacity-50"
                onClick={confirmSave}
                disabled={saving || reviewData.errors.length > 0 || reviewData.ready.length === 0}
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Rapid Key-Entry Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-space-md py-space-xs bg-surface-container rounded-lg mb-space-md shadow-sm gap-2">
        <div className="flex items-center gap-space-sm">
          <span className="flex items-center justify-center w-6 h-6 rounded bg-primary text-on-primary">
            <span className="material-symbols-outlined text-[15px]">keyboard</span>
          </span>
          <p className="font-body-sm text-body-sm text-on-surface">
            <strong className="font-semibold text-primary">Rapid Key-Entry:</strong>
            Press <kbd className="px-1.5 py-0.5 rounded bg-surface-container-lowest text-on-surface shadow-sm font-mono text-[11px]">Tab</kbd> to jump between rates.
          </p>
        </div>
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-tertiary-fixed-dim animate-pulse"></span>
            <span className="font-label-sm text-label-sm text-tertiary font-semibold uppercase tracking-wider">Draft Session Unlocked</span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 shadow-sm mb-4 ${
          message.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 
          'bg-red-500/10 text-red-600 border border-red-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {message.text}
        </div>
      )}

      {/* Configuration Header */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md mb-space-md shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-lg flex-wrap">
            <div className="flex items-center gap-space-sm bg-surface-container-low px-space-sm py-1.5 rounded-lg shadow-sm">
              <span className="material-symbols-outlined text-primary text-[20px]">calendar_month</span>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant leading-none">Effective Benchmark Date</span>
                <input 
                  type="date" 
                  className="bg-transparent font-headline-sm text-headline-sm text-on-surface leading-tight focus:outline-none"
                  value={entryDate}
                  max={today}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-surface-container-low px-space-sm py-2 rounded-lg shadow-sm h-full group relative" title="Allows this entry to bypass the configured source-to-material mapping to show all brokers.">
              <label className="font-label-sm text-label-sm text-on-surface-variant leading-none flex items-center gap-1 cursor-help">
                 Override mappings
                 <span className="material-symbols-outlined text-[14px] text-on-surface-variant opacity-70">info</span>
              </label>
              <input 
                type="checkbox" 
                className="w-4 h-4 text-primary focus:ring-0 cursor-pointer accent-primary"
                checked={showAllBrokers}
                onChange={(e) => setShowAllBrokers(e.target.checked)}
              />
            </div>

            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-tertiary-fixed text-on-tertiary-fixed shadow-sm font-label-md text-label-md">
              <span className="material-symbols-outlined text-[16px] text-tertiary">notification_important</span>
              <span>Draft • {intendedCount} Entries</span>
            </div>
          </div>
          
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-xs px-space-sm py-1 bg-surface-container rounded-lg">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Feeds Tracked:</span>
              <span className="font-label-md text-label-md text-on-surface font-bold">{materials.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="sticky top-28 z-30 bg-surface-container-lowest/95 backdrop-blur-md p-space-sm rounded-xl mb-space-md shadow-md flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <button 
            className="group flex items-center gap-space-sm px-space-lg py-2 rounded-lg bg-primary text-on-primary hover:bg-surface-tint shadow-sm transition-all transform active:scale-95 disabled:opacity-50" 
            onClick={handleSaveClick} 
            disabled={saving}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span className="font-label-lg text-label-lg font-bold tracking-wide">
              {saving ? 'SAVING...' : "SAVE TODAY'S PRICES"}
            </span>
          </button>
          
          <button 
            className="flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-label-md text-label-md transition-colors" 
            onClick={handleAddRow}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Add Row</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-md  min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface-container-high text-secondary uppercase font-label-md text-label-md">
                <th className="py-2.5 px-space-sm font-semibold tracking-wider">Raw Material</th>
                <th className="py-2.5 px-space-sm font-semibold tracking-wider">Quality Grade</th>
                <th className="py-2.5 px-space-sm font-semibold tracking-wider w-44">Today Input Rate (₹)</th>
                <th className="py-2.5 px-space-sm font-semibold tracking-wider">Unit / Price Type</th>
                <th className="py-2.5 px-space-sm font-semibold tracking-wider">Supplier Broker</th>
                <th className="py-2.5 px-space-sm font-semibold tracking-wider w-44">Mandi Source (Location)</th>
                <th className="py-2.5 px-space-sm font-semibold tracking-wider">Commercial Notes</th>
                <th className="py-2.5 px-space-sm w-16 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md text-on-surface divide-y-0">
              {entries.map((entry, index) => {
                const materialOptions = materials;
                const brokerOptions = getAvailableBrokers(entry.raw_material_id);
                const gradeOptions = qualityGrades.filter(q => q.raw_material_id === entry.raw_material_id);
                
                let materialUnitIds = allowedUnits.filter(au => au.raw_material_id === entry.raw_material_id).map(au => au.unit_id);
                const matRecord = materials.find(m => m.id === entry.raw_material_id);
                if (matRecord && matRecord.default_unit_id && !materialUnitIds.includes(matRecord.default_unit_id)) {
                  materialUnitIds.push(matRecord.default_unit_id);
                }
                const unitOptions = entry.raw_material_id ? units.filter(u => materialUnitIds.includes(u.id)) : units;

                return (
                  <tr key={entry.id} className="group hover:bg-surface-container-low transition-colors duration-100 bg-surface-container-lowest border-b border-surface-container-low">
                    {/* Material */}
                    <td className="py-2 px-space-sm">
                      <select 
                        className="w-full bg-surface-container-low text-on-surface py-1.5 px-2 rounded-lg font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary border border-transparent focus:border-primary"
                        value={entry.raw_material_id}
                        onChange={(e) => handleChange(entry.id, 'raw_material_id', e.target.value)}
                      >
                        <option value="">Select Material...</option>
                        {materialOptions.map(m => (
                          <option key={m.id} value={m.id}>{m.name_en} {m.name_hi ? `(${m.name_hi})` : ''}</option>
                        ))}
                      </select>
                    </td>

                    {/* Grade */}
                    <td className="py-2 px-space-sm">
                      <select 
                        className="w-full bg-surface-container-low text-on-surface py-1.5 px-2 rounded-lg font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary border border-transparent focus:border-primary"
                        value={entry.quality_grade_id || ''}
                        onChange={(e) => handleChange(entry.id, 'quality_grade_id', e.target.value)}
                      >
                        <option value="">Standard / Any</option>
                        {gradeOptions.map(q => (
                          <option key={q.id} value={q.id}>{q.grade_name}</option>
                        ))}
                      </select>
                    </td>

                    {/* Price Input */}
                    <td className="py-2 px-space-sm">
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-on-surface-variant font-label-md text-label-md font-semibold">₹</span>
                        <input 
                          type="number" 
                          step="0.01"
                          className="w-full pl-6 pr-2 py-1.5 bg-surface-container-lowest focus:bg-surface-container text-on-surface font-headline-sm text-headline-sm font-bold rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all border border-outline-variant"
                          value={entry.price}
                          onChange={(e) => handleChange(entry.id, 'price', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </td>

                    {/* Unit & Price Type */}
                    <td className="py-2 px-space-sm">
                      <div className="flex items-center gap-1">
                        <select 
                          className="w-full bg-surface-container-low text-on-surface py-1.5 px-2 rounded-lg font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary border border-transparent focus:border-primary"
                          value={entry.unit_id}
                          onChange={(e) => handleChange(entry.id, 'unit_id', e.target.value)}
                        >
                          <option value="">Unit...</option>
                          {unitOptions.map(u => (
                            <option key={u.id} value={u.id}>{u.unit_name}</option>
                          ))}
                        </select>
                        <select 
                          className="w-full bg-surface-container-low text-on-surface py-1.5 px-2 rounded-lg font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary border border-transparent focus:border-primary"
                          value={entry.price_type_id}
                          onChange={(e) => handleChange(entry.id, 'price_type_id', e.target.value)}
                        >
                          <option value="">Type...</option>
                          {priceTypes.map(p => (
                            <option key={p.id} value={p.id}>{p.type_name}</option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Broker */}
                    <td className="py-2 px-space-sm">
                      <select 
                        className="w-full bg-surface-container-low text-on-surface py-1.5 px-2 rounded-lg font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary border border-transparent focus:border-primary"
                        value={entry.broker_id}
                        onChange={(e) => handleChange(entry.id, 'broker_id', e.target.value)}
                      >
                        <option value="">Select Broker...</option>
                        {brokerOptions.map(b => (
                          <option key={b.id} value={b.id}>{b.broker_name}</option>
                        ))}
                      </select>
                    </td>

                    {/* Market Location */}
                    <td className="py-2 px-space-sm">
                      <input 
                        type="text" 
                        className="w-full bg-surface-container-low text-on-surface py-1.5 px-2 rounded-lg font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary border border-transparent focus:border-primary"
                        value={entry.market_location}
                        onChange={(e) => handleChange(entry.id, 'market_location', e.target.value)}
                        placeholder="Location"
                      />
                    </td>

                    {/* Remarks */}
                    <td className="py-2 px-space-sm">
                      <input 
                        className="w-full bg-transparent border border-transparent text-on-surface placeholder:text-outline py-1.5 px-1.5 font-body-sm text-body-sm focus:bg-surface-container-lowest focus:ring-1 focus:ring-outline focus:border-outline rounded" 
                        placeholder="Add remark..." 
                        type="text" 
                        value={entry.remarks}
                        onChange={(e) => handleChange(entry.id, 'remarks', e.target.value)}
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-space-sm text-center">
                      <div className="flex items-center justify-center gap-1 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="p-1 rounded hover:bg-surface-container hover:text-primary transition-colors" 
                          title="Duplicate Row" 
                          type="button"
                          onClick={() => handleDuplicateRow(index)}
                        >
                          <Copy size={16} />
                        </button>
                        <button 
                          className="p-1 rounded hover:bg-error-container hover:text-error transition-colors" 
                          title="Remove Row" 
                          type="button"
                          onClick={() => handleRemoveRow(entry.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div className="p-4 flex items-center justify-center border-t border-surface-container-low bg-surface-container-lowest">
             <button 
                className="flex items-center gap-1.5 px-space-lg py-1.5 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container hover:text-primary transition-colors text-sm font-semibold border border-outline-variant shadow-sm"
                onClick={handleAddRow}
                type="button"
             >
                <Plus size={16} /> Add Another Entry
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyPriceEntry;
