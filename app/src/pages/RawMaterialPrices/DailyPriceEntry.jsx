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
  const [priceTypes, setPriceTypes] = useState([]);
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState(null);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const [entryDate, setEntryDate] = useState(today);

  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState({ ready: [], errors: [], unused: 0 });

  // Toggle for overriding broker material mapping
  const [showAllBrokers, setShowAllBrokers] = useState(false);

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const [matsRes, brokersRes, gradesRes, unitsRes, pTypesRes, brkMatsRes] = await Promise.all([
        supabase.from('raw_materials').select('*').eq('active', true).order('display_order'),
        supabase.from('brokers').select('*').eq('active', true).order('broker_name'),
        supabase.from('material_quality_grades').select('*').eq('active', true).order('display_order'),
        supabase.from('rm_units').select('*').eq('active', true).order('display_order'),
        supabase.from('rm_price_types').select('*').eq('active', true).order('display_order'),
        supabase.from('broker_materials').select('*')
      ]);

      setMaterials(matsRes.data || []);
      setBrokers(brokersRes.data || []);
      setQualityGrades(gradesRes.data || []);
      setUnits(unitsRes.data || []);
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
    remarks: ''
  });

  const handleAddRow = () => {
    setEntries([...entries, createEmptyEntry()]);
  };

  const handleDuplicateRow = (index) => {
    const toDuplicate = entries[index];
    const isCompletelyEmpty = !toDuplicate.raw_material_id && !toDuplicate.broker_id && !toDuplicate.price;
    if (isCompletelyEmpty) {
      setMessage({ type: 'error', text: 'Cannot duplicate an empty row.' });
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

    entries.forEach((e, idx) => {
      const isUnused = !e.raw_material_id && !e.broker_id && !e.price && !e.market_location && !e.remarks;
      if (isUnused) {
        unused++;
        return;
      }

      const rowErrors = [];
      if (!e.raw_material_id) rowErrors.push('Missing Material');
      if (!e.price) {
        rowErrors.push('Missing Rate');
      } else if (Number(e.price) <= 0) {
        rowErrors.push('Rate must be > 0');
      }
      if (!e.unit_id) rowErrors.push('Missing Unit');
      if (!e.price_type_id) rowErrors.push('Missing Price Type');

      if (rowErrors.length > 0) {
        errors.push({ ...e, row: idx + 1, errors: rowErrors });
      } else {
        ready.push(e);
      }
    });

    return { ready, errors, unused };
  };

  const handleSaveClick = () => {
    const validation = validateEntries();
    if (validation.ready.length === 0 && validation.errors.length === 0) {
      setMessage({ type: 'error', text: 'No entries to save.' });
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
        market_location: e.market_location,
        price: Number(e.price),
        unit_id: e.unit_id,
        price_type_id: e.price_type_id,
        remarks: e.remarks
      }));

      const { error } = await supabase.from('raw_material_price_entries').insert(recordsToInsert);

      if (error) {
        if (error.code === '23505') {
          throw new Error('A duplicate price entry already exists for this material, broker, and date.');
        }
        throw error;
      }

      setMessage({ type: 'success', text: `Successfully saved ${recordsToInsert.length} price entries.` });
      
      setShowReview(false);
      const remaining = entries.filter(e => !reviewData.ready.find(r => r.id === e.id));
      setEntries(remaining.length > 0 ? remaining : [createEmptyEntry()]);
      
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Error saving entries:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save entries.' });
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

  const intendedCount = entries.filter(e => e.raw_material_id || e.broker_id || e.price || e.market_location || e.remarks).length;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        Loading master configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-5 rounded-xl border border-base shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-primary">Daily Price Entry</h2>
          <p className="text-sm text-secondary">Log broker quotes for cattle-feed raw materials</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-base/50 p-1.5 rounded-lg border border-base" title="Allows this entry to bypass the configured source-to-material mapping to show all brokers.">
            <label className="text-sm font-medium text-secondary pl-2 cursor-help flex items-center gap-1">
              Override mappings
            </label>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="showAllBrokers"
                checked={showAllBrokers}
                onChange={(e) => setShowAllBrokers(e.target.checked)}
                className="w-4 h-4 ml-2 mr-2"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-50 text-blue-700 shadow-sm font-medium text-sm border border-blue-200">
            <span>Draft • {intendedCount} Entries</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-secondary">Entry Date:</label>
            <input 
              type="date" 
              className="input max-w-[160px] shadow-sm font-medium"
              value={entryDate}
              max={today}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 shadow-sm ${
          message.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 
          'bg-red-500/10 text-red-600 border border-red-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-base shadow-sm overflow-hidden flex flex-col">
        <div className="data-table-container">
          <table className="data-table mobile-cards-table" style={{minWidth: '1200px'}}>
            <thead>
              <tr>
                <th style={{width: '40px', textAlign: 'center'}}>#</th>
                <th style={{minWidth: '200px'}}>Raw Material *</th>
                <th style={{minWidth: '180px'}}>Quality/Grade</th>
                <th style={{minWidth: '200px'}}>Broker *</th>
                <th style={{minWidth: '150px'}}>Location</th>
                <th style={{width: '130px'}}>Price (₹) *</th>
                <th style={{width: '130px'}}>Unit *</th>
                <th style={{width: '160px'}}>Price Type *</th>
                <th style={{minWidth: '200px'}}>Remarks</th>
                <th style={{width: '100px', textAlign: 'center'}}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {entries.map((entry, index) => {
                const availableGrades = qualityGrades.filter(q => q.raw_material_id === entry.raw_material_id);
                const availableBrokers = getAvailableBrokers(entry.raw_material_id);
                
                return (
                  <tr key={entry.id} className="hover:bg-base/20 transition-colors group">
                    <td data-label="#" style={{textAlign: 'center'}} className="text-secondary text-sm">{index + 1}</td>
                    <td data-label="Raw Material">
                      <select 
                        className={`input w-full text-sm ${!entry.raw_material_id ? 'border-red-300' : ''}`}
                        value={entry.raw_material_id}
                        onChange={(e) => handleChange(entry.id, 'raw_material_id', e.target.value)}
                      >
                        <option value="">Select Material...</option>
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>{m.name_en} {m.name_hi ? `(${m.name_hi})` : ''}</option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Quality/Grade">
                      <select 
                        className="input w-full text-sm"
                        value={entry.quality_grade_id}
                        onChange={(e) => handleChange(entry.id, 'quality_grade_id', e.target.value)}
                        disabled={!entry.raw_material_id}
                      >
                        <option value="">Standard/Any</option>
                        {availableGrades.map(q => (
                          <option key={q.id} value={q.id}>{q.grade_name}</option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Broker">
                      <select 
                        className={`input w-full text-sm ${!entry.broker_id ? 'border-red-300' : ''}`}
                        value={entry.broker_id}
                        onChange={(e) => handleChange(entry.id, 'broker_id', e.target.value)}
                      >
                        <option value="">Select Broker...</option>
                        {availableBrokers.map(b => (
                          <option key={b.id} value={b.id}>{b.broker_name}</option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Location">
                      <input 
                        type="text" 
                        className="input w-full text-sm"
                        placeholder="Location"
                        value={entry.market_location}
                        onChange={(e) => handleChange(entry.id, 'market_location', e.target.value)}
                      />
                    </td>
                    <td data-label="Price (₹)">
                      <input 
                        type="number" 
                        className={`input w-full text-sm text-right font-medium ${!entry.price ? 'border-red-300' : ''}`}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={entry.price}
                        onChange={(e) => handleChange(entry.id, 'price', e.target.value)}
                      />
                    </td>
                    <td data-label="Unit">
                      <select 
                        className={`input w-full text-sm ${!entry.unit_id ? 'border-red-300' : ''}`}
                        value={entry.unit_id}
                        onChange={(e) => handleChange(entry.id, 'unit_id', e.target.value)}
                      >
                        <option value="">Unit...</option>
                        {units.map(u => (
                          <option key={u.id} value={u.id}>{u.unit_name}</option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Price Type">
                      <select 
                        className={`input w-full text-sm ${!entry.price_type_id ? 'border-red-300' : ''}`}
                        value={entry.price_type_id}
                        onChange={(e) => handleChange(entry.id, 'price_type_id', e.target.value)}
                      >
                        <option value="">Price Type...</option>
                        {priceTypes.map(pt => (
                          <option key={pt.id} value={pt.id}>{pt.type_name}</option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Remarks">
                      <input 
                        type="text" 
                        className="input w-full text-sm"
                        placeholder="Notes..."
                        value={entry.remarks}
                        onChange={(e) => handleChange(entry.id, 'remarks', e.target.value)}
                      />
                    </td>
                    <td data-label="Actions" style={{textAlign: 'center'}}>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', opacity: 0.5}} className="group-hover:opacity-100 transition-opacity">
                        <button 
                          className="btn-icon text-secondary hover:text-primary" style={{padding: '4px'}}
                          onClick={() => handleDuplicateRow(index)}
                          title="Duplicate Row"
                        >
                          <Copy size={16} />
                        </button>
                        <button 
                          className="btn-icon text-secondary hover:text-danger" style={{padding: '4px'}}
                          onClick={() => handleRemoveRow(entry.id)}
                          title="Remove Row"
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
        </div>
        
        <div className="p-4 border-t border-base bg-base/20 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-b-lg">
          <button 
            className="btn btn-secondary flex items-center gap-2"
            onClick={handleAddRow}
          >
            <Plus size={16} /> Add Blank Row
          </button>
          
          <button 
            className="btn btn-primary flex items-center gap-2"
            onClick={handleSaveClick}
            disabled={saving}
          >
            <Save size={16} /> 
            {saving ? 'Saving...' : 'Save All Entries'}
          </button>
        </div>
      </div>

      {/* Review Modal */}
      {showReview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
            <div className="p-5 border-b border-base flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-primary">Review Price Entries</h2>
                <p className="text-sm text-secondary mt-1">Review {reviewData.ready.length + reviewData.errors.length} entries for {format(new Date(entryDate), 'dd MMM yyyy')}</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="badge badge-success">{reviewData.ready.length} Ready</span>
                <span className="badge badge-danger">{reviewData.errors.length} Errors</span>
                <span className="badge badge-neutral">{reviewData.unused} Unused</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
              {reviewData.errors.length > 0 && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><AlertTriangle size={18} /> Cannot save until errors are fixed</h3>
                  <ul className="list-disc pl-8 space-y-1 text-sm">
                    {reviewData.errors.map((err, i) => {
                       const matName = materials.find(m => m.id === err.raw_material_id)?.name_en || `Row ${err.row}`;
                       return <li key={i}><strong>{matName}</strong>: {err.errors.join(', ')}</li>
                    })}
                  </ul>
                </div>
              )}

              {reviewData.ready.length > 0 && (
                <div>
                  <h3 className="text-sm uppercase tracking-wider text-secondary font-bold mb-3">Entries Ready to Save</h3>
                  <div className="border border-base rounded-lg overflow-hidden bg-white">
                    <table className="data-table w-full text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="py-2 px-3 text-xs">Material</th>
                          <th className="py-2 px-3 text-xs">Grade</th>
                          <th className="py-2 px-3 text-xs">Rate</th>
                          <th className="py-2 px-3 text-xs">Unit</th>
                          <th className="py-2 px-3 text-xs">Type</th>
                          <th className="py-2 px-3 text-xs">Broker</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-base text-sm">
                        {reviewData.ready.map(entry => (
                          <tr key={entry.id}>
                            <td className="py-2 px-3 font-medium text-primary">{materials.find(m => m.id === entry.raw_material_id)?.name_en}</td>
                            <td className="py-2 px-3 text-secondary">{qualityGrades.find(q => q.id === entry.quality_grade_id)?.grade_name || 'Standard'}</td>
                            <td className="py-2 px-3 font-bold">₹{entry.price}</td>
                            <td className="py-2 px-3 text-secondary">{units.find(u => u.id === entry.unit_id)?.unit_name}</td>
                            <td className="py-2 px-3 text-secondary">{priceTypes.find(p => p.id === entry.price_type_id)?.type_name}</td>
                            <td className="py-2 px-3 text-secondary">{brokers.find(b => b.id === entry.broker_id)?.broker_name || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-base bg-white flex justify-end gap-3">
              <button className="btn btn-secondary" onClick={() => setShowReview(false)}>Cancel & Edit</button>
              <button 
                className="btn btn-primary" 
                disabled={reviewData.errors.length > 0 || saving} 
                onClick={confirmSave}
              >
                {saving ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyPriceEntry;
