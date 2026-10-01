import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Save, FileEdit, AlertTriangle, CheckCircle, Edit, X } from 'lucide-react';
import { format } from 'date-fns';

const DailyPriceEntry = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  
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
  const [entryDate, setEntryDate] = useState(today);
  const [showAllBrokers, setShowAllBrokers] = useState(false);
  
  // Phase 1 Form State
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [formState, setFormState] = useState(null);
  const [formError, setFormError] = useState('');

  // Phase 5 Edit State
  const [editingEntry, setEditingEntry] = useState(null);
  const [editError, setEditError] = useState('');

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
    } catch (error) {
      console.error('Error fetching master data:', error);
      setMessage({ type: 'error', text: 'Failed to load master configuration.' });
    } finally {
      setLoading(false);
    }
  };

  const getAvailableBrokers = (materialId) => {
    if (showAllBrokers || !materialId) return brokers;
    const mappedBrokerIds = brokerMaterials.filter(bm => bm.raw_material_id === materialId).map(bm => bm.broker_id);
    if (mappedBrokerIds.length === 0) return brokers; 
    return brokers.filter(b => mappedBrokerIds.includes(b.id));
  };

  const handleDateChange = (newDate) => {
    if (entries.length > 0) {
      if (!window.confirm('You have unsaved entries for the current date. Changing the date will clear them. Continue?')) {
        return;
      }
      setEntries([]);
      setSelectedMaterialId('');
      setFormState(null);
    }
    setEntryDate(newDate);
  };

  const handleSelectMaterial = (matId) => {
    setSelectedMaterialId(matId);
    if (!matId) {
      setFormState(null);
      return;
    }
    
    const mat = materials.find(m => m.id === matId);
    const grades = qualityGrades.filter(q => q.raw_material_id === matId);
    
    setFormState({
      raw_material_id: matId,
      quality_grade_id: grades.length > 0 ? grades[0].id : '',
      broker_id: '',
      market_location: '',
      price: '',
      unit_id: mat?.default_unit_id || '',
      price_type_id: mat?.default_price_type_id || '',
      remarks: ''
    });
    setFormError('');
  };

  const updateField = (stateUpdater, field, value) => {
    stateUpdater(prev => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      if (field === 'broker_id' && value && !prev.market_location) {
        const broker = brokers.find(b => b.id === value);
        if (broker) updated.market_location = broker.market_location || '';
      }
      return updated;
    });
  };

  const validateForm = (entry, excludeId = null) => {
    if (!entryDate) return 'Entry Date is required.';
    if (!entry.raw_material_id) return 'Material is required.';
    if (!entry.broker_id) return 'Broker is required.';
    if (!entry.price || Number(entry.price) <= 0) return 'Valid positive price is required.';
    if (!entry.unit_id) return 'Unit is required.';
    if (!entry.price_type_id) return 'Price Type is required.';
    
    const isDuplicate = entries.some(e => 
      e.id !== excludeId && 
      e.raw_material_id === entry.raw_material_id && 
      e.broker_id === entry.broker_id
    );
    if (isDuplicate) return 'An entry for this material and broker already exists in the current session.';
    
    return null;
  };

  const handleAddEntry = () => {
    const error = validateForm(formState);
    if (error) {
      setFormError(error);
      return;
    }
    
    setEntries([...entries, { ...formState, id: `entry-${Date.now()}` }]);
    setSelectedMaterialId('');
    setFormState(null);
    setFormError('');
  };

  const handleEdit = (entry) => {
    setEditingEntry({ ...entry });
    setEditError('');
  };
  
  const handleSaveEdit = () => {
    const error = validateForm(editingEntry, editingEntry.id);
    if (error) {
      setEditError(error);
      return;
    }
    setEntries(entries.map(e => e.id === editingEntry.id ? editingEntry : e));
    setEditingEntry(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this entry?')) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const handleClearAll = () => {
    if (entries.length === 0) return;
    if (window.confirm('Clear all unsaved entries?')) {
      setEntries([]);
      setSelectedMaterialId('');
      setFormState(null);
    }
  };

  const handleSaveAll = async () => {
    if (!entryDate) {
      setMessage({ type: 'error', text: 'Entry date is missing' });
      return;
    }
    if (entries.length === 0) {
      setMessage({ type: 'error', text: 'No entries to save' });
      return;
    }
    
    setSaving(true);
    setMessage(null);
    
    try {
      const recordsToInsert = entries.map(e => ({
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
          throw new Error('A duplicate price entry already exists in the database for a material, broker, and date.');
        }
        throw error;
      }
      
      setMessage({ type: 'success', text: `Successfully saved ${recordsToInsert.length} price entries.` });
      setEntries([]);
      setSelectedMaterialId('');
      setFormState(null);
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error('Save error:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save entries. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        Loading master configuration...
      </div>
    );
  }

  const renderFormFields = (state, setStateFn, error) => (
    <>
      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded border border-red-100 flex items-center gap-2"><AlertTriangle size={16}/> {error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">Quality/Grade</label>
          <select className="input w-full" value={state.quality_grade_id} onChange={e => updateField(setStateFn, 'quality_grade_id', e.target.value)}>
            <option value="">Standard/Any</option>
            {qualityGrades.filter(q => q.raw_material_id === state.raw_material_id).map(q => (
              <option key={q.id} value={q.id}>{q.grade_name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">Broker *</label>
          <select className="input w-full" value={state.broker_id} onChange={e => updateField(setStateFn, 'broker_id', e.target.value)}>
            <option value="">Select Broker...</option>
            {getAvailableBrokers(state.raw_material_id).map(b => (
              <option key={b.id} value={b.id}>{b.broker_name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">Location</label>
          <input type="text" className="input w-full" placeholder="Location" value={state.market_location} onChange={e => updateField(setStateFn, 'market_location', e.target.value)} />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">Price (₹) *</label>
          <input type="number" className="input w-full" placeholder="0.00" min="0" step="0.01" value={state.price} onChange={e => updateField(setStateFn, 'price', e.target.value)} />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">Unit *</label>
          <select className="input w-full" value={state.unit_id} onChange={e => updateField(setStateFn, 'unit_id', e.target.value)}>
            <option value="">Select Unit...</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.unit_name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">Price Type *</label>
          <select className="input w-full" value={state.price_type_id} onChange={e => updateField(setStateFn, 'price_type_id', e.target.value)}>
            <option value="">Select Type...</option>
            {priceTypes.map(pt => (
              <option key={pt.id} value={pt.id}>{pt.type_name}</option>
            ))}
          </select>
        </div>
        
        <div className="lg:col-span-3 md:col-span-2">
          <label className="block text-sm font-medium text-secondary mb-1">Remarks</label>
          <input type="text" className="input w-full" placeholder="Optional notes..." value={state.remarks} onChange={e => updateField(setStateFn, 'remarks', e.target.value)} />
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 shadow-sm ${
          message.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 
          'bg-red-500/10 text-red-600 border border-red-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {message.text}
        </div>
      )}

      {/* CARD 1: DAILY PRICE ENTRY */}
      <div className="bg-white p-5 rounded-xl border border-base shadow-sm">
        <h2 className="text-lg font-semibold text-primary mb-4">Daily Price Entry</h2>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-secondary mb-1.5">Entry Date</label>
            <input 
              type="date" 
              className="input w-full shadow-sm" 
              value={entryDate} 
              max={today} 
              onChange={e => handleDateChange(e.target.value)} 
            />
          </div>
          <div className="flex-1 max-w-sm">
            <label className="block text-sm font-medium text-secondary mb-1.5">Select Raw Material</label>
            <select 
              className="input w-full shadow-sm" 
              value={selectedMaterialId} 
              onChange={e => handleSelectMaterial(e.target.value)}
            >
              <option value="">-- Choose Material --</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>{m.name_en} {m.name_hi ? `(${m.name_hi})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 flex items-end">
            <div className="flex items-center gap-2 bg-base/50 p-2 rounded-lg border border-base" title="Allows this entry to bypass the configured source-to-material mapping to show all brokers.">
              <label className="text-sm font-medium text-secondary cursor-help flex items-center gap-1">
                Override mappings
              </label>
              <input 
                type="checkbox" 
                checked={showAllBrokers}
                onChange={(e) => setShowAllBrokers(e.target.checked)}
                className="w-4 h-4 ml-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: ADD NEW ENTRY FORM */}
      {formState && (
        <div className="bg-white p-5 rounded-xl border border-base shadow-sm animate-fade-in-up">
          <div className="flex justify-between items-center mb-5 border-b border-base pb-3">
            <h3 className="text-lg font-semibold text-primary">
              Add New Entry: <span className="text-blue-600">{materials.find(m => m.id === selectedMaterialId)?.name_en}</span>
            </h3>
          </div>
          
          {renderFormFields(formState, setFormState, formError)}
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-base">
            <button 
              className="btn btn-secondary px-6" 
              onClick={() => { setFormState(null); setSelectedMaterialId(''); setFormError(''); }}
            >
              Cancel
            </button>
            <button className="btn btn-primary px-6 flex items-center gap-2" onClick={handleAddEntry}>
              <Plus size={18}/> Add Entry
            </button>
          </div>
        </div>
      )}

      {/* CARD 3: TODAY'S ENTRIES */}
      <div className="bg-white rounded-xl border border-base shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-base flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-primary">Today's Entries ({entries.length})</h3>
          {entries.length > 0 && (
            <button className="text-sm text-danger hover:underline font-medium" onClick={handleClearAll}>Clear All</button>
          )}
        </div>
        
        {entries.length === 0 ? (
          <div className="p-10 text-center text-secondary">
            <p className="font-medium text-slate-600 mb-1 text-lg">No entries added yet.</p>
            <p className="text-sm">Select a raw material above to start.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-left hidden md:table">
              <thead className="bg-white text-secondary text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-medium border-b border-base w-12 text-center">#</th>
                  <th className="py-3 px-4 font-medium border-b border-base">Material</th>
                  <th className="py-3 px-4 font-medium border-b border-base">Quality</th>
                  <th className="py-3 px-4 font-medium border-b border-base">Broker</th>
                  <th className="py-3 px-4 font-medium border-b border-base">Location</th>
                  <th className="py-3 px-4 font-medium border-b border-base">Price + Unit</th>
                  <th className="py-3 px-4 font-medium border-b border-base">Price Type</th>
                  <th className="py-3 px-4 font-medium border-b border-base">Remarks</th>
                  <th className="py-3 px-4 font-medium border-b border-base text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base text-sm">
                {entries.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                     <td className="py-3 px-4 text-slate-500 text-center">{index + 1}</td>
                     <td className="py-3 px-4 font-medium text-primary">{materials.find(m => m.id === entry.raw_material_id)?.name_en}</td>
                     <td className="py-3 px-4">{qualityGrades.find(q => q.id === entry.quality_grade_id)?.grade_name || '-'}</td>
                     <td className="py-3 px-4">{brokers.find(b => b.id === entry.broker_id)?.broker_name}</td>
                     <td className="py-3 px-4">{entry.market_location || '-'}</td>
                     <td className="py-3 px-4 font-bold">₹{entry.price} <span className="text-secondary font-normal text-xs">/ {units.find(u => u.id === entry.unit_id)?.unit_name}</span></td>
                     <td className="py-3 px-4">{priceTypes.find(p => p.id === entry.price_type_id)?.type_name}</td>
                     <td className="py-3 px-4 text-slate-500 max-w-[150px] truncate" title={entry.remarks}>{entry.remarks || '-'}</td>
                     <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-3">
                           <button className="text-blue-600 hover:text-blue-800" title="Edit" onClick={() => handleEdit(entry)}><Edit size={16}/></button>
                           <button className="text-red-600 hover:text-red-800" title="Delete" onClick={() => handleDelete(entry.id)}><Trash2 size={16}/></button>
                        </div>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="md:hidden flex flex-col divide-y divide-base">
               {entries.map((entry) => (
                  <div key={entry.id} className="p-4 flex flex-col gap-3">
                     <div className="flex justify-between items-start">
                        <div>
                           <div className="font-semibold text-primary">{materials.find(m => m.id === entry.raw_material_id)?.name_en}</div>
                           <div className="text-sm font-medium text-secondary">{brokers.find(b => b.id === entry.broker_id)?.broker_name}</div>
                        </div>
                        <div className="font-bold text-lg text-right">
                           ₹{entry.price} <div className="text-xs text-secondary font-normal">/ {units.find(u => u.id === entry.unit_id)?.unit_name}</div>
                        </div>
                     </div>
                     <div className="flex flex-wrap gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-base/50">
                        <span className="font-medium">{priceTypes.find(p => p.id === entry.price_type_id)?.type_name}</span>
                        {entry.quality_grade_id && <span>• {qualityGrades.find(q => q.id === entry.quality_grade_id)?.grade_name}</span>}
                        {entry.market_location && <span>• {entry.market_location}</span>}
                     </div>
                     {entry.remarks && <div className="text-sm text-slate-500 italic">{entry.remarks}</div>}
                     <div className="flex justify-end gap-4 mt-2 pt-3 border-t border-base/50">
                        <button className="text-sm font-medium text-blue-600 flex items-center gap-1" onClick={() => handleEdit(entry)}><Edit size={14}/> Edit</button>
                        <button className="text-sm font-medium text-red-600 flex items-center gap-1" onClick={() => handleDelete(entry.id)}><Trash2 size={14}/> Delete</button>
                     </div>
                  </div>
               ))}
            </div>
          </div>
        )}
        
        {entries.length > 0 && (
          <div className="p-5 border-t border-base bg-slate-50 flex justify-end">
            <button 
              className="btn btn-primary flex items-center gap-2 px-8 py-2.5 text-base shadow-md hover:shadow-lg transition-all" 
              onClick={handleSaveAll}
              disabled={saving}
            >
              <Save size={18} /> {saving ? 'Saving...' : 'Save All Entries'}
            </button>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-fade-in-up">
             <div className="p-5 border-b border-base flex justify-between items-center bg-slate-50 rounded-t-xl">
               <h3 className="text-lg font-bold text-primary">Edit Entry: <span className="text-blue-600">{materials.find(m => m.id === editingEntry.raw_material_id)?.name_en}</span></h3>
               <button className="text-secondary hover:text-primary transition-colors p-1 rounded-full hover:bg-slate-200" onClick={() => setEditingEntry(null)}><X size={20}/></button>
             </div>
             <div className="p-6 overflow-y-auto">
               {renderFormFields(editingEntry, setEditingEntry, editError)}
             </div>
             <div className="p-5 border-t border-base bg-slate-50 flex justify-end gap-4 rounded-b-xl">
               <button className="btn btn-secondary px-6" onClick={() => setEditingEntry(null)}>Cancel</button>
               <button className="btn btn-primary px-6" onClick={handleSaveEdit}>Save Changes</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyPriceEntry;
