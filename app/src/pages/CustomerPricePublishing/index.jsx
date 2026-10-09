import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../AuthContext';
import {
  Save,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';

const INITIAL_MATERIALS = [
  'Khal', 'Makka Daliya', 'Jaggery', 'Oil', 'Chana Churi', 
  'Soya Churi', 'Kakde', 'Kakde Khal', 'Mustard Khal',
  'Chapad', 'Methi', 'Ajwain', 'Chaadi Kakda'
];

export default function CustomerPricePublishing() {
  const { userProfile } = React.useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [latestPrices, setLatestPrices] = useState({});
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Materials
      const { data: rmData, error: rmError } = await supabase
        .from('raw_materials')
        .select('id, name_en')
        .in('name_en', INITIAL_MATERIALS)
        .eq('active', true);

      if (rmError) throw rmError;

      // Ensure consistent order as requested
      const orderedMaterials = INITIAL_MATERIALS.map(name => 
        rmData.find(rm => rm.name_en === name)
      ).filter(Boolean);

      setMaterials(orderedMaterials);

      // 2. Fetch Latest Published Prices
      const { data: lpData, error: lpError } = await supabase
        .from('customer_published_prices')
        .select('id, raw_material_id, price, unit, effective_date, is_published')
        .order('effective_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (lpError) throw lpError;

      const latest = {};
      const drafts = {};
      
      lpData.forEach(p => {
        if (!latest[p.raw_material_id] && p.is_published) {
          latest[p.raw_material_id] = p;
        }
        if (!drafts[p.raw_material_id] && !p.is_published) {
          drafts[p.raw_material_id] = p; // grab latest draft if any
        }
      });

      setLatestPrices(latest);

      // Initialize form data
      const initForm = {};
      orderedMaterials.forEach(m => {
        // If there is an unpublished draft, load it, otherwise leave blank
        const draft = drafts[m.id];
        initForm[m.id] = {
          price: draft ? draft.price.toString() : '',
          unit: draft ? draft.unit : (latest[m.id] ? latest[m.id].unit : 'Quintal'),
          effective_date: draft ? draft.effective_date : format(new Date(), 'yyyy-MM-dd'),
          remarks: draft ? (draft.remarks || '') : '',
          selected: false, // For "Publish Selected"
          draftId: draft ? draft.id : null
        };
      });
      setFormData(initForm);

    } catch (err) {
      console.error(err);
      showMessage('error', 'Failed to load market data.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleSave = async (isPublish = false, specificIds = null) => {
    try {
      setSaving(true);
      const idsToProcess = specificIds || materials.map(m => m.id);
      
      const payload = [];
      const draftsToUpdate = [];

      for (const id of idsToProcess) {
        const row = formData[id];
        if (!row.price) continue; // Skip empty
        
        // Skip if price and unit match the latest published and we are publishing
        const latest = latestPrices[id];
        if (isPublish && latest && Number(row.price) === Number(latest.price) && row.unit === latest.unit && !row.draftId) {
          continue; // Nothing actually changed, don't create unnecessary history
        }

        const record = {
          raw_material_id: id,
          price: Number(row.price),
          unit: row.unit,
          effective_date: row.effective_date,
          is_published: isPublish,
          remarks: row.remarks || null,
          created_by: userProfile.id
        };

        if (row.draftId) {
          draftsToUpdate.push({ id: row.draftId, ...record });
        } else {
          payload.push(record);
        }
      }

      if (payload.length === 0 && draftsToUpdate.length === 0) {
        showMessage('info', 'No changes to save.');
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

      showMessage('success', isPublish ? 'Prices Published Successfully!' : 'Drafts Saved Successfully!');
      await fetchData();

    } catch (err) {
      console.error(err);
      showMessage('error', 'Failed to save prices.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishSelected = () => {
    const selectedIds = materials.filter(m => formData[m.id]?.selected).map(m => m.id);
    if (selectedIds.length === 0) {
      showMessage('error', 'Please select at least one material.');
      return;
    }
    handleSave(true, selectedIds);
  };

  const handlePublishAll = () => {
    handleSave(true);
  };

  if (loading) return <div className="p-8">Loading Customer Prices...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Price Publishing</h1>
          <p className="text-sm text-gray-500 mt-1">Manage public-facing market prices for the Shubh Labh Buyer App.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Save size={16} /> Save Drafts
          </button>
          <button 
            onClick={handlePublishSelected}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-white rounded-lg text-sm font-medium hover:bg-[#D97706] disabled:opacity-50"
          >
            <CheckCircle size={16} /> Publish Selected
          </button>
          <button 
            onClick={handlePublishAll}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#0EA5E9] text-white rounded-lg text-sm font-medium hover:bg-[#0284C7] disabled:opacity-50"
          >
            <TrendingUp size={16} /> Publish All Valid
          </button>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-3 p-4 mb-8 rounded-xl border text-[15px] font-medium shadow-sm ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : message.type === 'info'
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
          <span className="flex-1">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-current opacity-50 hover:opacity-100 transition-opacity"
          >
            &times;
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600 font-semibold">
                <th className="p-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-[#0EA5E9] focus:ring-[#0EA5E9]"
                    onChange={(e) => {
                      const val = e.target.checked;
                      const next = { ...formData };
                      materials.forEach(m => { next[m.id].selected = val; });
                      setFormData(next);
                    }}
                  />
                </th>
                <th className="p-4">Material</th>
                <th className="p-4">Current Published</th>
                <th className="p-4">New Price (₹)</th>
                <th className="p-4">Unit</th>
                <th className="p-4">Effective Date</th>
                <th className="p-4">Status / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {materials.map(m => {
                const lp = latestPrices[m.id];
                const row = formData[m.id];
                const hasDraft = !!row.draftId;

                return (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-center align-middle">
                      <input 
                        type="checkbox" 
                        checked={row.selected}
                        onChange={(e) => handleChange(m.id, 'selected', e.target.checked)}
                        className="rounded border-gray-300 text-[#0EA5E9] focus:ring-[#0EA5E9]"
                      />
                    </td>
                    <td className="p-4 align-middle">
                      <span className="font-medium text-gray-900">{m.name_en}</span>
                    </td>
                    <td className="p-4 align-middle">
                      {lp ? (
                        <div>
                          <div className="font-semibold text-gray-900">₹{lp.price} / {lp.unit}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{lp.effective_date}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No published price</span>
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      <input 
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.price}
                        onChange={(e) => handleChange(m.id, 'price', e.target.value)}
                        placeholder="e.g. 1800"
                        className="w-32 rounded-lg border-gray-300 shadow-sm focus:border-[#0EA5E9] focus:ring-[#0EA5E9] sm:text-sm"
                      />
                    </td>
                    <td className="p-4 align-middle">
                      <select 
                        value={row.unit}
                        onChange={(e) => handleChange(m.id, 'unit', e.target.value)}
                        className="w-28 rounded-lg border-gray-300 shadow-sm focus:border-[#0EA5E9] focus:ring-[#0EA5E9] sm:text-sm"
                      >
                        <option value="Quintal">Quintal</option>
                        <option value="Kg">Kg</option>
                        <option value="Tonne">Tonne</option>
                        <option value="Litre">Litre</option>
                      </select>
                    </td>
                    <td className="p-4 align-middle">
                      <input 
                        type="date"
                        value={row.effective_date}
                        onChange={(e) => handleChange(m.id, 'effective_date', e.target.value)}
                        className="w-36 rounded-lg border-gray-300 shadow-sm focus:border-[#0EA5E9] focus:ring-[#0EA5E9] sm:text-sm"
                      />
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex flex-col gap-2">
                        {hasDraft ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 w-max">
                            <Clock size={12} /> Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 w-max">
                            <CheckCircle size={12} /> Published
                          </span>
                        )}
                        <input 
                          type="text"
                          value={row.remarks}
                          onChange={(e) => handleChange(m.id, 'remarks', e.target.value)}
                          placeholder="Internal note (optional)"
                          className="w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-[#0EA5E9] focus:ring-[#0EA5E9] py-1 px-2"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
