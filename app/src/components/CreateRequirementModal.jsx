import React, { useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { LanguageContext } from '../LanguageContext';
import { X } from 'lucide-react';

export default function CreateRequirementModal({ isOpen, onClose }) {
  const { userProfile } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [sourceModule, setSourceModule] = useState('Global/Manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data, error: submitError } = await supabase
        .from('crm_internal_requirements')
        .insert([{
          title,
          description,
          priority,
          source_module: sourceModule,
          created_by: userProfile.id
        }]);

      if (submitError) throw submitError;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTitle('');
        setDescription('');
        setPriority('Medium');
        setSourceModule('Global/Manual');
        onClose();
      }, 1500);

    } catch (err) {
      console.error(err);
      setError('Unable to submit requirement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Create Requirement</h2>
          <button className="btn-icon" onClick={onClose} disabled={loading}><X size={20} /></button>
        </div>

        {success ? (
          <div className="alert alert-success" style={{ margin: '2rem 0', textAlign: 'center' }}>
            ✓ Requirement submitted successfully.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Requirement Title <span className="text-danger">*</span></label>
              <input 
                type="text" 
                className="form-input" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. Add export button to Raw Material table"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Description <span className="text-danger">*</span></label>
              <textarea 
                className="form-input" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                rows={4}
                placeholder="Describe the requirement in detail..."
                required
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Priority</label>
                <select 
                  className="form-input" 
                  value={priority} 
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={loading}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Module (Source)</label>
                <select 
                  className="form-input" 
                  value={sourceModule} 
                  onChange={(e) => setSourceModule(e.target.value)}
                  disabled={loading}
                >
                  <option value="Global/Manual">Global</option>
                  <option value="Sales">Sales</option>
                  <option value="Raw Material">Raw Material</option>
                  <option value="Dealer Management">Dealer Management</option>
                  <option value="Production">Production</option>
                  <option value="Inventory">Inventory</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading || !title.trim() || !description.trim()}>
                {loading ? 'Submitting...' : 'Submit Requirement'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
