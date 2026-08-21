import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/activityLogger';
import { Map, Plus, Save, X, Edit2, Trash2 } from 'lucide-react';

export default function TerritoriesTab() {
  const [territories, setTerritories] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    region: '',
    assigned_manager_id: '',
    status: 'Active'
  });

  useEffect(() => {
    fetchTerritories();
    fetchTeam();
  }, []);

  const fetchTerritories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_territories')
      .select('*, manager:assigned_manager_id(display_name)')
      .order('name');
    if (!error && data) setTerritories(data);
    setLoading(false);
  };

  const fetchTeam = async () => {
    const { data } = await supabase.from('app_users').select('id, display_name').eq('is_active', true);
    if (data) setTeam(data);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({ name: '', region: '', assigned_manager_id: '', status: 'Active' });
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditingId(t.id);
    setFormData({
      name: t.name,
      region: t.region || '',
      assigned_manager_id: t.assigned_manager_id || '',
      status: t.status || 'Active'
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Name is required");
      return;
    }
    setLoading(true);
    
    const payload = {
      name: formData.name,
      region: formData.region,
      assigned_manager_id: formData.assigned_manager_id || null,
      status: formData.status
    };

    try {
      if (editingId) {
        await supabase.from('crm_territories').update(payload).eq('id', editingId);
        logActivity({ module: 'Settings', actionType: 'UPDATED', summary: `Updated territory ${payload.name}` });
      } else {
        await supabase.from('crm_territories').insert([payload]);
        logActivity({ module: 'Settings', actionType: 'CREATED', summary: `Created territory ${payload.name}` });
      }
      setShowModal(false);
      fetchTerritories();
    } catch (err) {
      alert("Error saving territory: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{padding: '2.5rem'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <h2 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Map size={24} /> Territories</h2>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Add Territory</button>
      </div>
      
      {loading && !showModal ? <p>Loading territories...</p> : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Region</th>
                <th>Assigned Manager</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {territories.map(t => (
                <tr key={t.id}>
                  <td style={{fontWeight: 500}}>{t.name}</td>
                  <td>{t.region || '-'}</td>
                  <td>{t.manager?.display_name || <span className="text-secondary">Unassigned</span>}</td>
                  <td>
                    <span className={`badge ${t.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => openEdit(t)}><Edit2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {territories.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-secondary" style={{padding: '2rem'}}>No territories defined yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '500px'}}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Territory' : 'New Territory'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem'}}>
                <div>
                  <label>Territory Name *</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label>Region</label>
                  <input type="text" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} placeholder="e.g. North, South, East, West" />
                </div>
                <div>
                  <label>Assigned Manager</label>
                  <select value={formData.assigned_manager_id} onChange={e => setFormData({...formData, assigned_manager_id: e.target.value})}>
                    <option value="">-- Unassigned --</option>
                    {team.map(u => (
                      <option key={u.id} value={u.id}>{u.display_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}><Save size={16} /> Save Territory</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
