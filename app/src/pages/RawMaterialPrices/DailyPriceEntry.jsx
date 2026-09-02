import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Save, FileEdit, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
import { format } from 'date-fns';

const DailyPriceEntry = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [qualityGrades, setQualityGrades] = useState([]);
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState(null);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const [entryDate, setEntryDate] = useState(today);

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const [matsRes, brokersRes, gradesRes] = await Promise.all([
        supabase.from('raw_materials').select('*').eq('active', true).order('display_order'),
        supabase.from('brokers').select('*').eq('active', true).order('broker_name'),
        supabase.from('material_quality_grades').select('*').eq('active', true)
      ]);

      setMaterials(matsRes.data || []);
      setBrokers(brokersRes.data || []);
      setQualityGrades(gradesRes.data || []);
      
      // Initialize with tracking required materials
      if (matsRes.data) {
        const defaultEntries = matsRes.data
          .filter(m => m.daily_tracking_required)
          .map(m => createEmptyEntry(m.id, m.default_unit, m.default_price_type));
        
        if (defaultEntries.length > 0) {
          setEntries(defaultEntries);
        } else {
          setEntries([createEmptyEntry()]);
        }
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEmptyEntry = (materialId = '', unit = 'Quintal', priceType = 'Delivered') => ({
    id: `temp-${Date.now()}-${Math.random()}`,
    raw_material_id: materialId,
    quality_grade_id: '',
    broker_id: '',
    market_location: '',
    price: '',
    unit: unit,
    price_type: priceType,
    remarks: ''
  });

  const handleAddRow = () => {
    setEntries([...entries, createEmptyEntry()]);
  };

  const handleDuplicateRow = (index) => {
    const toDuplicate = entries[index];
    setEntries([
      ...entries.slice(0, index + 1),
      { ...toDuplicate, id: `temp-${Date.now()}-${Math.random()}`, broker_id: '', price: '' },
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
            updated.unit = mat.default_unit || 'Quintal';
            updated.price_type = mat.default_price_type || 'Delivered';
          }
          updated.quality_grade_id = ''; // Reset quality
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

  const handleSave = async () => {
    // Validate
    const validEntries = entries.filter(e => e.raw_material_id && e.broker_id && e.price);
    
    if (validEntries.length === 0) {
      setMessage({ type: 'error', text: 'No valid entries to save. Please fill Material, Broker, and Price.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const recordsToInsert = validEntries.map(e => ({
        entry_date: entryDate,
        raw_material_id: e.raw_material_id,
        quality_grade_id: e.quality_grade_id || null,
        broker_id: e.broker_id,
        market_location: e.market_location,
        price: Number(e.price),
        unit: e.unit,
        price_type: e.price_type,
        remarks: e.remarks
      }));

      const { error } = await supabase.from('raw_material_price_entries').insert(recordsToInsert);

      if (error) throw error;

      setMessage({ type: 'success', text: `Successfully saved ${recordsToInsert.length} price entries.` });
      
      // Clear saved entries, keep empty ones
      const remaining = entries.filter(e => !e.raw_material_id || !e.broker_id || !e.price);
      setEntries(remaining.length > 0 ? remaining : [createEmptyEntry()]);
      
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Error saving entries:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save entries.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-secondary">Loading master data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-base">
        <div>
          <h2 className="text-lg font-semibold">Daily Price Entry</h2>
          <p className="text-sm text-secondary">Quickly log broker quotes for today</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-secondary">Entry Date:</label>
          <input 
            type="date" 
            className="input max-w-[160px]"
            value={entryDate}
            max={today}
            onChange={(e) => setEntryDate(e.target.value)}
          />
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 
          'bg-red-500/10 text-red-600 border border-red-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {message.text}
        </div>
      )}

      <div className="card bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-base/50 text-secondary text-sm">
                <th className="p-3 font-medium w-12 text-center">#</th>
                <th className="p-3 font-medium min-w-[200px]">Raw Material *</th>
                <th className="p-3 font-medium min-w-[180px]">Quality/Grade</th>
                <th className="p-3 font-medium min-w-[200px]">Broker *</th>
                <th className="p-3 font-medium min-w-[150px]">Market/Location</th>
                <th className="p-3 font-medium w-32">Price (₹) *</th>
                <th className="p-3 font-medium w-32">Unit</th>
                <th className="p-3 font-medium w-40">Price Type</th>
                <th className="p-3 font-medium min-w-[200px]">Remarks</th>
                <th className="p-3 font-medium w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {entries.map((entry, index) => {
                const availableGrades = qualityGrades.filter(q => q.raw_material_id === entry.raw_material_id);
                
                return (
                  <tr key={entry.id} className="hover:bg-base/20">
                    <td className="p-3 text-center text-secondary text-sm">{index + 1}</td>
                    <td className="p-2">
                      <select 
                        className="input w-full text-sm py-1.5"
                        value={entry.raw_material_id}
                        onChange={(e) => handleChange(entry.id, 'raw_material_id', e.target.value)}
                      >
                        <option value="">Select Material...</option>
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>{m.name_en} {m.name_hi ? `(${m.name_hi})` : ''}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <select 
                        className="input w-full text-sm py-1.5"
                        value={entry.quality_grade_id}
                        onChange={(e) => handleChange(entry.id, 'quality_grade_id', e.target.value)}
                        disabled={!entry.raw_material_id || availableGrades.length === 0}
                      >
                        <option value="">Standard/Any</option>
                        {availableGrades.map(q => (
                          <option key={q.id} value={q.id}>{q.grade_name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <select 
                        className="input w-full text-sm py-1.5"
                        value={entry.broker_id}
                        onChange={(e) => handleChange(entry.id, 'broker_id', e.target.value)}
                      >
                        <option value="">Select Broker...</option>
                        {brokers.map(b => (
                          <option key={b.id} value={b.id}>{b.broker_name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        className="input w-full text-sm py-1.5"
                        placeholder="Location"
                        value={entry.market_location}
                        onChange={(e) => handleChange(entry.id, 'market_location', e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        className="input w-full text-sm py-1.5 text-right font-medium"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={entry.price}
                        onChange={(e) => handleChange(entry.id, 'price', e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <select 
                        className="input w-full text-sm py-1.5"
                        value={entry.unit}
                        onChange={(e) => handleChange(entry.id, 'unit', e.target.value)}
                      >
                        <option value="Quintal">Quintal</option>
                        <option value="MT">MT</option>
                        <option value="Kg">Kg</option>
                        <option value="Bag">Bag</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <select 
                        className="input w-full text-sm py-1.5"
                        value={entry.price_type}
                        onChange={(e) => handleChange(entry.id, 'price_type', e.target.value)}
                      >
                        <option value="Delivered">Delivered</option>
                        <option value="Ex-mandi">Ex-mandi</option>
                        <option value="Indicative">Indicative</option>
                        <option value="Purchase">Purchase</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        className="input w-full text-sm py-1.5"
                        placeholder="Notes..."
                        value={entry.remarks}
                        onChange={(e) => handleChange(entry.id, 'remarks', e.target.value)}
                      />
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          className="btn-icon text-secondary hover:text-primary p-1.5"
                          onClick={() => handleDuplicateRow(index)}
                          title="Duplicate Row"
                        >
                          <Copy size={16} />
                        </button>
                        <button 
                          className="btn-icon text-secondary hover:text-danger p-1.5"
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
        
        <div className="p-4 border-t border-base bg-base/20 flex flex-col sm:flex-row justify-between items-center gap-4">
          <button 
            className="btn btn-secondary flex items-center gap-2"
            onClick={handleAddRow}
          >
            <Plus size={16} /> Add Row
          </button>
          
          <button 
            className="btn btn-primary flex items-center gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={16} /> 
            {saving ? 'Saving...' : 'Save All Entries'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyPriceEntry;
