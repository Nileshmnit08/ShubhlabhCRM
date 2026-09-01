import React from 'react';
import { Users, Gift, Target, Clock, TrendingUp, AlertTriangle, XCircle } from 'lucide-react';

export default function KPIGrid({ kpi, onKpiClick }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
      
      <div className="cv-panel kpi-card" onClick={() => onKpiClick('Active Customers')} style={{ padding: '1.25rem', borderLeft: '4px solid var(--text-primary)', cursor: 'pointer', transition: 'transform 0.1s' }}>
        <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Users size={14}/> Active Customers</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{kpi.activeCustomers}</div>
      </div>
      
      <div className="cv-panel kpi-card" onClick={() => onKpiClick('Active Schemes')} style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)', cursor: 'pointer' }}>
        <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Gift size={14}/> Active Schemes</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{kpi.activeSchemes}</div>
      </div>
      
      <div className="cv-panel kpi-card" onClick={() => onKpiClick('Eligible for Rewards')} style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)', cursor: 'pointer' }}>
        <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Target size={14}/> Eligible for Rewards</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{kpi.eligibleRewards}</div>
      </div>
      
      <div className="cv-panel kpi-card" onClick={() => onKpiClick('Rewards Pending Approval')} style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)', cursor: 'pointer' }}>
        <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14}/> Pending Approval</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{kpi.pendingApproval}</div>
      </div>
      
      <div className="cv-panel kpi-card" onClick={() => onKpiClick('Rewards Pending Fulfillment')} style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)', cursor: 'pointer' }}>
        <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14}/> Pending Fulfillment</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{kpi.pendingFulfillment}</div>
      </div>
      
      <div className="cv-panel kpi-card" onClick={() => onKpiClick('Near Next Slab')} style={{ padding: '1.25rem', borderLeft: '4px solid var(--info)', cursor: 'pointer' }}>
        <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><TrendingUp size={14}/> Near Next Slab</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--info)' }}>{kpi.nearTarget}</div>
      </div>
      
      <div className="cv-panel kpi-card" onClick={() => onKpiClick('Near Monthly Target')} style={{ padding: '1.25rem', borderLeft: '4px solid var(--info)', cursor: 'pointer' }}>
        <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><TrendingUp size={14}/> Near Monthly Target</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--info)' }}>{kpi.nearMonthly}</div>
      </div>
      
      <div className="cv-panel kpi-card" onClick={() => onKpiClick('At Risk')} style={{ padding: '1.25rem', borderLeft: '4px solid var(--danger)', cursor: 'pointer' }}>
        <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertTriangle size={14}/> At Risk of Missing</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{kpi.atRisk}</div>
      </div>
      
      <div className="cv-panel kpi-card" onClick={() => onKpiClick('Closing Soon')} style={{ padding: '1.25rem', borderLeft: '4px solid var(--danger)', cursor: 'pointer' }}>
        <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14}/> Schemes Closing Soon</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{kpi.closingSoon}</div>
      </div>
      
      <div className="cv-panel kpi-card" onClick={() => onKpiClick('No Activity')} style={{ padding: '1.25rem', borderLeft: '4px solid var(--border)', cursor: 'pointer' }}>
        <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={14}/> No Activity (30 Days)</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{kpi.noActivity}</div>
      </div>

    </div>
  );
}
