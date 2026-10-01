import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../AuthContext';
import { X, Save, Clock, User, Box, AlertCircle } from 'lucide-react';

export default function RequirementDetailView({ requirementId, onClose }) {
  const { userProfile } = useContext(AuthContext);
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [admins, setAdmins] = useState([]);
  
  // Editable state
  const [status, setStatus] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  useEffect(() => {
    if (requirementId) {
      fetchDetail();
      fetchAdmins();
    }
  }, [requirementId]);

  const fetchAdmins = async () => {
    try {
      const { data } = await supabase.from('app_users').select('id, name').in('role', ['Admin', 'Manager']);
      setAdmins(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crm_internal_requirements')
        .select(`
          *,
          creator:app_users!created_by(id, name, role),
          assignee:app_users!assigned_to(id, name)
        `)
        .eq('id', requirementId)
        .single();
      
      if (error) throw error;
      setReq(data);
      setStatus(data.status);
      setAssignedTo(data.assigned_to || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('crm_internal_requirements')
        .update({
          status,
          assigned_to: assignedTo || null
        })
        .eq('id', requirementId);
        
      if (error) throw error;
      
      // Update local state
      setReq(prev => ({
        ...prev, 
        status, 
        assigned_to: assignedTo || null,
        assignee: admins.find(a => a.id === assignedTo) || null
      }));
      
    } catch (err) {
      console.error('Save failed', err);
      alert('Failed to update requirement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading details...</div>;
  }

  if (!req) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h3 className="text-danger">Requirement Not Found</h3>
        <p>The requirement may have been deleted or you don't have access.</p>
        <button className="btn btn-secondary" onClick={onClose} style={{ marginTop: '1rem' }}>Close</button>
      </div>
    );
  }

  const isEditable = userProfile?.role === 'Admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* HEADER */}
      <div style={{ 
        padding: '1rem 1.5rem', 
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-main)'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Requirement Detail</h2>
        <button className="btn-icon" onClick={onClose}><X size={20} /></button>
      </div>

      {/* CONTENT */}
      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            {req.title}
          </h1>
          <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <User size={14} /> {req.creator?.name || 'Unknown'} ({req.creator?.role || 'Staff'})
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={14} /> {new Date(req.created_at).toLocaleString()}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Box size={14} /> {req.source_module}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <AlertCircle size={14} /> Priority: {req.priority}
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'var(--bg-main)' }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Description</h3>
          <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
            {req.description}
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>Admin Controls</h3>
          
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Status</label>
            <select 
              className="form-input" 
              value={status} 
              onChange={e => setStatus(e.target.value)}
              disabled={!isEditable}
            >
              <option value="New">New</option>
              <option value="Under Review">Under Review</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Assigned To</label>
            <select 
              className="form-input" 
              value={assignedTo} 
              onChange={e => setAssignedTo(e.target.value)}
              disabled={!isEditable}
            >
              <option value="">Unassigned</option>
              {admins.map(admin => (
                <option key={admin.id} value={admin.id}>{admin.name}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* FOOTER */}
      {isEditable && (
        <div style={{ 
          padding: '1rem 1.5rem', 
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-main)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem'
        }}>
          <button className="btn btn-secondary" onClick={fetchDetail} disabled={saving}>Reset</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} style={{ marginRight: '0.5rem' }} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
