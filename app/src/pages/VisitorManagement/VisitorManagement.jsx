import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  LayoutDashboard,
  UserPlus,
  Clock,
  BarChart2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { AuthContext } from '../../AuthContext';
import VisitorDashboard from './VisitorDashboard';
import VisitorRegistrationForm from './VisitorRegistrationForm';
import VisitorHistoryTable from './VisitorHistoryTable';
import VisitorReports from './VisitorReports';
import VisitorDetailModal from './VisitorDetailModal';
import { fetchVisitors, fetchVisitorDashboard, markVisitorExit } from './visitorService';

export default function VisitorManagement() {
  const { user } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'register' | 'history' | 'reports'
  const [visitors, setVisitors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Modal detail view
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [markingExitId, setMarkingExitId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [visitorsRes, dashboardRes] = await Promise.all([
        fetchVisitors({ limit: 500 }),
        fetchVisitorDashboard(),
      ]);

      if (visitorsRes.error) {
        // Table might not exist yet if migration 259 hasn't run on production Supabase
        if (
          visitorsRes.error.code === '42P01' ||
          visitorsRes.error.code === 'PGRST205' ||
          visitorsRes.error.message?.includes('not found')
        ) {
          setError(
            'The database table "visitor_register" is awaiting administrator migration approval. Offline & local entries remain safe.'
          );
        } else {
          setError(visitorsRes.error.message || 'Failed to load visitor records.');
        }
      } else {
        setVisitors(visitorsRes.data || []);
      }

      if (dashboardRes.stats) {
        setStats(dashboardRes.stats);
      }
    } catch (err) {
      console.error('Error loading visitor management:', err);
      setError(err.message || 'An unexpected error occurred while loading.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Mark Exit
  const handleMarkExit = async (visitorId) => {
    if (!visitorId) return;
    setMarkingExitId(visitorId);
    try {
      const res = await markVisitorExit(visitorId);
      if (res.success) {
        // Update local state immediately
        const exitTime = res.data?.exit_time || new Date().toISOString();
        setVisitors((prev) =>
          prev.map((v) =>
            v.id === visitorId ? { ...v, status: 'OUT', exit_time: exitTime } : v
          )
        );

        if (selectedVisitor?.id === visitorId) {
          setSelectedVisitor((prev) => (prev ? { ...prev, status: 'OUT', exit_time: exitTime } : null));
        }

        setFeedback({
          type: 'success',
          message: 'Visitor departure recorded successfully.',
        });
        setTimeout(() => setFeedback(null), 4000);

        // Refresh stats
        loadData();
      } else {
        setFeedback({
          type: 'error',
          message: res.error?.message || 'Could not record visitor departure.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to mark exit.',
      });
    } finally {
      setMarkingExitId(null);
    }
  };

  const handleNewRegistration = (newRecord) => {
    setVisitors((prev) => [newRecord, ...prev]);
    loadData();
    setFeedback({
      type: 'success',
      message: `Pass ${newRecord.pass_number} generated successfully for ${newRecord.visitor_name}!`,
    });
    setTimeout(() => setFeedback(null), 5000);
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Title & Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#15803d',
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: 0 }}>
                Visitor Management
              </h1>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                Unified Factory & Office Gate Pass System • Shared with Field Assist App
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#f1f5f9',
              padding: '4px',
              borderRadius: '8px',
              gap: '4px',
            }}
          >
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 0.95rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'dashboard' ? '#ffffff' : 'transparent',
                color: activeTab === 'dashboard' ? '#0f172a' : '#64748b',
                fontWeight: activeTab === 'dashboard' ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'dashboard' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
              }}
            >
              <LayoutDashboard size={15} />
              Overview
            </button>

            <button
              onClick={() => setActiveTab('register')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 0.95rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'register' ? '#ffffff' : 'transparent',
                color: activeTab === 'register' ? '#0f172a' : '#64748b',
                fontWeight: activeTab === 'register' ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'register' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
              }}
            >
              <UserPlus size={15} />
              New Registration
            </button>

            <button
              onClick={() => setActiveTab('history')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 0.95rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'history' ? '#ffffff' : 'transparent',
                color: activeTab === 'history' ? '#0f172a' : '#64748b',
                fontWeight: activeTab === 'history' ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'history' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
              }}
            >
              <Clock size={15} />
              Visitor Log ({visitors.length})
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 0.95rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'reports' ? '#ffffff' : 'transparent',
                color: activeTab === 'reports' ? '#0f172a' : '#64748b',
                fontWeight: activeTab === 'reports' ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'reports' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
              }}
            >
              <BarChart2 size={15} />
              Reports
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: feedback.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca',
              color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {feedback.message}
          </div>
        )}

        {/* Missing table / Backend migration banner if applicable */}
        {error && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderRadius: '8px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button
              onClick={loadData}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #d97706',
                background: '#ffffff',
                color: '#b45309',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === 'dashboard' && (
        <VisitorDashboard
          stats={stats}
          loading={loading}
          onRefresh={loadData}
          onNavigateToRegister={() => setActiveTab('register')}
          onSelectVisitor={(v) => setSelectedVisitor(v)}
          onMarkExit={handleMarkExit}
          markingExitId={markingExitId}
        />
      )}

      {activeTab === 'register' && (
        <VisitorRegistrationForm
          currentUser={user}
          onRegistrationSuccess={handleNewRegistration}
          onNavigateToHistory={() => setActiveTab('history')}
        />
      )}

      {activeTab === 'history' && (
        <VisitorHistoryTable
          visitors={visitors}
          loading={loading}
          onRefresh={loadData}
          onSelectVisitor={(v) => setSelectedVisitor(v)}
          onMarkExit={handleMarkExit}
          markingExitId={markingExitId}
        />
      )}

      {activeTab === 'reports' && <VisitorReports visitors={visitors} />}

      {/* Visitor Detail Modal */}
      {selectedVisitor && (
        <VisitorDetailModal
          visitor={selectedVisitor}
          onClose={() => setSelectedVisitor(null)}
          onMarkExit={handleMarkExit}
          markingExit={markingExitId === selectedVisitor.id}
        />
      )}
    </div>
  );
}
