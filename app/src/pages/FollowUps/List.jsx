import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar, Clock, AlertCircle, CheckCircle2, MoreVertical, X } from 'lucide-react';
import { LanguageContext } from '../../LanguageContext';

export default function FollowUpList() {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Today'); // Today, Overdue, Upcoming, Completed
  
  const { t } = useContext(LanguageContext);

  useEffect(() => {
    fetchFollowUps();
  }, [activeTab]);

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      let query = supabase.from('follow_ups')
        .select(`*, crm_parties ( id, display_name, mobile )`)
        .order('due_at', { ascending: true, nullsFirst: false });

      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (activeTab === 'Completed') {
        query = query.eq('status', 'Completed').order('completed_at', { ascending: false });
      } else {
        query = query.neq('status', 'Completed').neq('status', 'Cancelled');
        
        if (activeTab === 'Overdue') {
          query = query.lt('due_at', today.toISOString());
        } else if (activeTab === 'Today') {
          query = query.gte('due_at', today.toISOString()).lt('due_at', tomorrow.toISOString());
        } else if (activeTab === 'Upcoming') {
          query = query.gte('due_at', tomorrow.toISOString());
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setFollowUps(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const updates = { status };
      if (status === 'Completed') {
        updates.completed_at = new Date().toISOString();
        const { data: session } = await supabase.auth.getSession();
        updates.completed_by = session?.session?.user?.id || null;
      }
      const { error } = await supabase.from('follow_ups').update(updates).eq('id', id);
      if (error) throw error;
      
      fetchFollowUps(); // refresh list
    } catch (err) {
      console.error(err);
      alert(t('msg.error'));
    }
  };

  const filteredItems = followUps.filter(f => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.reason?.toLowerCase().includes(q) ||
      f.notes?.toLowerCase().includes(q) ||
      f.crm_parties?.display_name?.toLowerCase().includes(q) ||
      f.crm_parties?.mobile?.includes(q)
    );
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>{t('nav.today') === 'Today' ? 'Follow-ups' : 'फॉलो-अप (Follow-ups)'}</h1>
          <p className="text-secondary" style={{marginTop: '0.25rem'}}>Manage your daily actions and upcoming tasks.</p>
        </div>
        <Link to="/follow-ups/new" className="btn btn-primary">
          <Plus size={18} /> {t('btn.newFollowUp')}
        </Link>
      </div>

      {/* Toolbar */}
      <div style={{display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem'}}>
        <div style={{position: 'relative', flex: '1 1 300px'}}>
          <Search size={18} className="text-secondary" style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)'}} />
          <input 
            type="text" 
            placeholder={t('list.searchPlaceholder')}
            style={{paddingLeft: '2.5rem', width: '100%', background: 'var(--bg-surface)'}}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto'}}>
        {['Today', 'Overdue', 'Upcoming', 'Completed'].map(tab => (
          <button 
            key={tab}
            className={`nav-item ${activeTab === tab ? 'active' : ''}`} 
            style={{borderRadius: 0, padding: '0.75rem 1rem', whiteSpace: 'nowrap'}} 
            onClick={() => setActiveTab(tab)}
          >
            {t(`nav.${tab.toLowerCase()}`)}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{padding: '3rem', textAlign: 'center'}}>Loading...</div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel" style={{padding: '4rem 2rem', textAlign: 'center'}}>
          <CheckCircle2 size={48} className="text-muted" style={{margin: '0 auto 1rem', opacity: 0.5}} />
          <h2 style={{marginBottom: '0.5rem'}}>{t('list.emptyTitle')}</h2>
          <p className="text-secondary">{t('list.emptyDesc')}</p>
        </div>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          {filteredItems.map(item => (
            <div key={item.id} className="glass-panel" style={{padding: '1.25rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', borderLeft: item.priority === 'High' ? '4px solid var(--warning)' : '4px solid transparent'}}>
              <div style={{flex: 1}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem'}}>
                  <Link to={`/customers/${item.party_id}`} style={{fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)'}}>
                    {item.crm_parties?.display_name || 'Unknown'}
                  </Link>
                  <span className="badge" style={{background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)'}}>{t(`priority.${item.priority}`)}</span>
                  {item.status !== 'Pending' && (
                    <span className="badge" style={{background: item.status === 'Completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.1)', color: item.status === 'Completed' ? 'var(--success)' : 'inherit'}}>
                      {t(`status.${item.status}`)}
                    </span>
                  )}
                </div>
                
                <div style={{fontWeight: 500, marginBottom: '0.25rem'}}>{item.reason}</div>
                
                {item.notes && <div className="text-secondary" style={{fontSize: '0.9rem', marginBottom: '0.75rem'}}>{item.notes}</div>}
                
                <div style={{display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)'}}>
                  <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem', color: activeTab === 'Overdue' ? 'var(--danger)' : 'inherit'}}>
                    <Calendar size={14} /> 
                    {item.due_at ? new Date(item.due_at).toLocaleString() : (item.follow_up_date ? new Date(item.follow_up_date).toLocaleDateString() : 'No date')}
                  </span>
                  {item.reminder_at && (
                    <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                      <Clock size={14} /> Reminder: {new Date(item.reminder_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center'}}>
                <Link to={`/follow-ups/${item.id}/edit`} className="btn btn-secondary" style={{padding: '0.5rem'}}>
                  {t('btn.edit')}
                </Link>
                {item.status !== 'Completed' ? (
                  <button className="btn btn-primary" style={{padding: '0.5rem'}} onClick={() => updateStatus(item.id, 'Completed')}>
                    {t('btn.complete')}
                  </button>
                ) : (
                  <button className="btn btn-secondary" style={{padding: '0.5rem'}} onClick={() => updateStatus(item.id, 'Pending')}>
                    {t('btn.reopen')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
