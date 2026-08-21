import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Target, Search, ChevronRight, CheckCircle2, MessageCircle, Phone, ArrowUpRight } from 'lucide-react';
import AlertsPanel from '../components/AlertsPanel';
import { AuthContext } from '../AuthContext';
import CallAction from '../components/CallAction';
import WhatsAppAction from '../components/WhatsAppAction';
import ScheduleAction from '../components/ScheduleAction';
export default function Opportunities() {
  const { userProfile } = useContext(AuthContext);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOpportunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  async function fetchOpportunities() {
    if (!userProfile) return;
    setLoading(true);
    try {
      const isAdmin = userProfile?.role === 'Admin';
      const ownerId = userProfile?.id;

      // 1. Fetch Opportunities
      let query = supabase
        .from('v_customer_opportunities')
        .select('*')
        .order('priority_sort', { ascending: true });

      if (!isAdmin) {
        query = query.eq('assigned_owner_id', ownerId);
      }

      const { data: oppData, error: oppErr } = await query;
      if (oppErr) throw oppErr;

      // 2. Fetch parties to get contact details and owner
      const partyIds = [...new Set((oppData || []).map(o => o.party_id))];
      let partiesMap = {};
      if (partyIds.length > 0) {
         const { data: pData } = await supabase.from('crm_parties').select('id, mobile, whatsapp, crm_status, display_name, assigned_owner_id, owner:app_users!crm_parties_assigned_owner_id_fkey(display_name)').in('id', partyIds);
         if (pData) {
            pData.forEach(p => partiesMap[p.id] = p);
         }
      }

      // 3. Prevent duplicate engagement: fetch today's interactions
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const { data: recentInts } = await supabase.from('interactions').select('party_id').gte('created_at', todayStart.toISOString());
      
      const engagedPartyIds = new Set((recentInts || []).map(i => i.party_id));

      const finalOpps = (oppData || [])
         .filter(o => !engagedPartyIds.has(o.party_id)) // Remove if engaged today
         .map(o => ({
             ...o,
             party: partiesMap[o.party_id] || { id: o.party_id, display_name: o.display_name }
         }));

      setOpportunities(finalOpps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredOpps = opportunities.filter(opp => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      opp.display_name?.toLowerCase().includes(q) ||
      opp.opportunity_type?.toLowerCase().includes(q)
    );
  });

  const getOppBadge = (type) => {
    if (type === 'Open Requirement') return 'badge badge-active';
    if (type === 'Reactivation') return 'badge badge-warning';
    if (type === 'Purchase Gap') return 'badge badge-danger';
    return 'badge badge-neutral';
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Opportunity Board</h1>
          <p className="text-secondary" style={{marginTop: '0.25rem'}}>
            Data-driven sales opportunities. Engage directly to convert these into sales.
          </p>
        </div>
      </div>

      <AlertsPanel />

      <div style={{display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap'}}>
        <div style={{flex: 1, minWidth: '250px', position: 'relative'}}>
          <Search size={18} style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'}} />
          <input 
            type="text" 
            placeholder="Search by customer or opportunity type..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
          />
        </div>
      </div>

      {loading ? (
        <div style={{padding: '3rem', textAlign: 'center'}}>Scanning for opportunities...</div>
      ) : filteredOpps.length === 0 ? (
        <div className="glass-panel" style={{padding: '4rem', textAlign: 'center'}}>
          <CheckCircle2 size={48} className="text-success" style={{margin: '0 auto 1rem', opacity: 0.5}} />
          <h3 style={{marginBottom: '0.5rem'}}>Inbox Zero</h3>
          <p className="text-secondary">No unengaged opportunities match your criteria.</p>
        </div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem'}}>
          {filteredOpps.map((opp, idx) => (
            <div key={`${opp.party_id || 'unknown'}-${opp.opportunity_type}-${idx}`} className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1.5rem', flex: 1 }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                  <Link to={`/customers/${opp.party_id || opp.party?.id}`} style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {opp.display_name}
                    <ArrowUpRight size={14} className="text-muted" />
                  </Link>
                  <span className={getOppBadge(opp.opportunity_type)}>{opp.opportunity_type}</span>
                </div>
                
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Evidence</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                      {opp.evidence}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Action Required</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {opp.recommended_action}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Owner</span>
                    <div style={{ fontSize: '0.9rem', marginTop: '0.25rem', color: opp.party?.assigned_owner_id ? 'var(--text-primary)' : 'var(--danger)' }}>
                      {opp.party?.owner?.display_name || 'Unassigned - Must assign to act'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Take action to clear this opportunity.
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!opp.party?.assigned_owner_id ? (
                     <Link to={`/customers/${opp.party?.id || opp.party_id}/edit`} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>Assign Owner</Link>
                  ) : (
                     <>
                        <CallAction party={opp.party} onComplete={fetchOpportunities} showLabel={false} />
                        <WhatsAppAction party={opp.party} onComplete={fetchOpportunities} />
                        <ScheduleAction party={opp.party} opportunityType={opp.opportunity_type} evidence={opp.evidence} onComplete={fetchOpportunities} showLabel={false} />
                     </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
