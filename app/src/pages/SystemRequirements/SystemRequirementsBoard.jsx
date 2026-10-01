import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, MessageSquare, AlertCircle, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import RequirementDetailView from './RequirementDetailView';

export default function SystemRequirementsBoard() {
  const { userProfile } = useContext(AuthContext);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedReqId, setSelectedReqId] = useState(searchParams.get('id') || null);
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    fetchRequirements();
  }, [filterStatus]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setSelectedReqId(id);
    }
  }, [searchParams]);

  const fetchRequirements = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('crm_internal_requirements')
        .select(`
          *,
          creator:app_users!created_by(id, name, role),
          assignee:app_users!assigned_to(id, name)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'All') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequirements(data || []);
    } catch (err) {
      console.error('Error fetching system requirements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRequirement = (id) => {
    setSelectedReqId(id);
    setSearchParams({ id });
  };

  const handleCloseDetail = () => {
    setSelectedReqId(null);
    setSearchParams({});
    fetchRequirements();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'var(--danger)';
      case 'High': return '#f59e0b';
      case 'Medium': return 'var(--primary)';
      case 'Low': return 'var(--text-secondary)';
      default: return 'var(--text-primary)';
    }
  };

  const getStatusBadge = (status) => {
    let className = 'badge ';
    switch (status) {
      case 'New': className += 'badge-primary'; break;
      case 'Under Review': className += 'badge-warning'; break;
      case 'In Progress': className += 'badge-info'; break;
      case 'Completed': className += 'badge-success'; break;
      case 'Rejected': className += 'badge-danger'; break;
      default: className += 'badge-secondary';
    }
    return <span className={className}>{status}</span>;
  };

  return (
    <div className="page-layout" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', height: '100%' }}>
        
        {/* LEFT PANEL: BOARD */}
        <div style={{ flex: selectedReqId ? '1' : '1', display: selectedReqId ? 'none' : 'flex', flexDirection: 'column', padding: '1.5rem', overflowY: 'auto' }} className="md:flex">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h1 className="page-title">Requirement Board</h1>
              <p className="page-subtitle">Centralized requirement and feedback management.</p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select className="form-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: '150px' }}>
                <option value="All">All Statuses</option>
                <option value="New">New</option>
                <option value="Under Review">Under Review</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
              <table className="data-table">
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                  <tr>
                    <th>Requirement</th>
                    <th>Submitted By</th>
                    <th>Module</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        Loading requirements...
                      </td>
                    </tr>
                  ) : requirements.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <MessageSquare size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.2 }} />
                        <p>No requirements found.</p>
                      </td>
                    </tr>
                  ) : (
                    requirements.map(req => (
                      <tr 
                        key={req.id} 
                        onClick={() => handleSelectRequirement(req.id)}
                        style={{ cursor: 'pointer', background: req.id === selectedReqId ? 'var(--bg-main)' : 'transparent' }}
                        className="hover-row"
                      >
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{req.title}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {req.description}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{req.creator?.name || 'Unknown'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{req.creator?.role || 'Staff'}</div>
                        </td>
                        <td>
                          <span className="badge badge-secondary">{req.source_module}</span>
                        </td>
                        <td>
                          <span style={{ color: getPriorityColor(req.priority), fontWeight: 500, fontSize: '0.85rem' }}>
                            {req.priority}
                          </span>
                        </td>
                        <td>
                          {getStatusBadge(req.status)}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <ChevronRight size={18} color="var(--text-muted)" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: DETAIL VIEW */}
        {selectedReqId && (
          <div style={{ 
            width: '100%', 
            maxWidth: '100%', 
            borderLeft: '1px solid var(--border)', 
            background: 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }} className="md:max-w-[500px]">
            <RequirementDetailView 
              requirementId={selectedReqId} 
              onClose={handleCloseDetail} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
