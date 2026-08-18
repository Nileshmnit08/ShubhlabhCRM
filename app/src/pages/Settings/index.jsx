import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../AuthContext';
import { LanguageContext } from '../../LanguageContext';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/activityLogger';
import { User, Bell, Users, Settings as SettingsIcon, Save } from 'lucide-react';

export default function Settings() {
  const { userProfile, setUserProfile } = useContext(AuthContext);
  const { t, setLanguage } = useContext(LanguageContext);
  
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  
  // Profile State
  const [profileData, setProfileData] = useState({
    display_name: '',
    mobile: '',
    preferred_language: 'en',
    timezone: 'UTC'
  });
  const [password, setPassword] = useState('');

  // CRM Defaults State
  const [crmSettings, setCrmSettings] = useState({
    default_reminder_minutes: 15,
    work_hours_start: '09:00:00',
    work_hours_end: '18:00:00'
  });

  // Team State
  const [team, setTeam] = useState([]);

  useEffect(() => {
    if (userProfile) {
      setProfileData({
        display_name: userProfile.display_name || '',
        mobile: userProfile.mobile || '',
        preferred_language: userProfile.preferred_language || 'en',
        timezone: userProfile.timezone || 'UTC'
      });
    }
  }, [userProfile]);

  useEffect(() => {
    if (activeTab === 'defaults' && userProfile?.role === 'Admin') {
      fetchCrmSettings();
    }
    if (activeTab === 'team' && userProfile?.role === 'Admin') {
      fetchTeam();
    }
  }, [activeTab, userProfile]);

  const fetchCrmSettings = async () => {
    const { data } = await supabase.from('crm_settings').select('*').eq('id', 1).single();
    if (data) setCrmSettings(data);
  };

  const fetchTeam = async () => {
    const { data } = await supabase.from('app_users').select('*').order('created_at');
    if (data) setTeam(data);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updates = { ...profileData };
      const { error } = await supabase.from('app_users').update(updates).eq('id', userProfile.id);
      if (error) throw error;
      
      if (password) {
        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) throw pwError;
      }
      
      setUserProfile(prev => ({ ...prev, ...updates }));
      if (updates.preferred_language !== userProfile.preferred_language) {
        setLanguage(updates.preferred_language);
      }

      await logActivity({
        module: 'Settings',
        actionType: 'UPDATED',
        summary: `User updated profile settings.`
      });
      
      alert('Profile updated successfully!');
      setPassword('');
    } catch (err) {
      console.error(err);
      alert('Error updating profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveCrmSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('crm_settings').update(crmSettings).eq('id', 1);
      if (error) throw error;
      
      await logActivity({
        module: 'Settings',
        actionType: 'UPDATED',
        summary: `Admin updated global CRM defaults.`
      });
      
      alert('CRM Defaults updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Error updating CRM defaults: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'Admin' ? 'Operator' : 'Admin';
    const { error } = await supabase.from('app_users').update({ role: newRole }).eq('id', userId);
    if (!error) {
      fetchTeam();
      logActivity({
        module: 'Settings',
        actionType: 'UPDATED',
        summary: `Changed user role to ${newRole}`
      });
    }
  };

  const toggleUserStatus = async (userId, isActive) => {
    const { error } = await supabase.from('app_users').update({ is_active: !isActive }).eq('id', userId);
    if (!error) {
      fetchTeam();
      logActivity({
        module: 'Settings',
        actionType: 'UPDATED',
        summary: `Toggled user active status to ${!isActive}`
      });
    }
  };

  const tabs = [
    { id: 'profile', label: t('settings.profile') || 'Profile', icon: User },
    { id: 'notifications', label: t('settings.notifications') || 'Notifications', icon: Bell },
  ];
  if (userProfile?.role === 'Admin') {
    tabs.push({ id: 'team', label: t('settings.team') || 'Team Management', icon: Users });
    tabs.push({ id: 'defaults', label: t('settings.defaults') || 'CRM Defaults', icon: SettingsIcon });
  }

  return (
    <div className="animate-fade-in" style={{maxWidth: '1000px', margin: '0 auto'}}>
      <div className="page-header" style={{marginBottom: '2rem'}}>
        <div>
          <h1 style={{margin: 0}}>{t('settings.title') || 'Settings & Preferences'}</h1>
        </div>
      </div>

      <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap'}}>
        {/* Sidebar Nav */}
        <div style={{flex: '1 1 250px'}}>
          <div className="glass-panel" style={{display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', 
                  padding: '1rem', textAlign: 'left', border: 'none',
                  background: activeTab === tab.id ? 'var(--bg-surface-hover)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-primary)',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  borderLeft: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent'
                }}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div style={{flex: '3 1 500px'}}>
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="glass-panel" style={{padding: '2rem'}}>
              <h2 style={{marginBottom: '1.5rem'}}>{t('settings.profile') || 'Profile'}</h2>
              <form onSubmit={saveProfile} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem'}}>
                  <div>
                    <label>Display Name</label>
                    <input 
                      type="text" 
                      value={profileData.display_name} 
                      onChange={e => setProfileData({...profileData, display_name: e.target.value})} 
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label>Mobile Number</label>
                    <input 
                      type="text" 
                      value={profileData.mobile} 
                      onChange={e => setProfileData({...profileData, mobile: e.target.value})} 
                      placeholder="+91..."
                    />
                  </div>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem'}}>
                  <div>
                    <label>{t('settings.language') || 'Preferred Language'}</label>
                    <select 
                      value={profileData.preferred_language} 
                      onChange={e => setProfileData({...profileData, preferred_language: e.target.value})}
                    >
                      <option value="en">English</option>
                      <option value="hi">हिंदी (Hindi)</option>
                    </select>
                  </div>
                  <div>
                    <label>Timezone</label>
                    <select 
                      value={profileData.timezone} 
                      onChange={e => setProfileData({...profileData, timezone: e.target.value})}
                    >
                      <option value="UTC">UTC</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    </select>
                  </div>
                </div>

                <div style={{borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '0.5rem'}}>
                  <h3 style={{marginBottom: '1rem', fontSize: '1.1rem'}}>Security</h3>
                  <div>
                    <label>New Password (leave blank to keep current)</label>
                    <input 
                      type="password" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="••••••••"
                      style={{maxWidth: '300px'}}
                    />
                  </div>
                </div>

                <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '1rem'}}>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    <Save size={18} /> {loading ? '...' : (t('settings.save') || 'Save Changes')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="glass-panel" style={{padding: '2rem'}}>
              <h2 style={{marginBottom: '1.5rem'}}>{t('settings.notifications') || 'Notifications'}</h2>
              <p className="text-secondary">Notification preferences will be implemented in a future sprint.</p>
            </div>
          )}

          {/* TEAM TAB */}
          {activeTab === 'team' && userProfile?.role === 'Admin' && (
            <div className="glass-panel" style={{padding: '0'}}>
              <div style={{padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)'}}>
                <h2 style={{margin: 0}}>{t('settings.team') || 'Team Management'}</h2>
                <p className="text-secondary" style={{marginTop: '0.5rem', fontSize: '0.9rem'}}>Manage access and roles. New users must sign up via the Auth screen to be provisioned.</p>
              </div>
              <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-hover)'}}>
                      <th style={{padding: '1rem 2rem', textAlign: 'left', fontWeight: 600}}>User</th>
                      <th style={{padding: '1rem 2rem', textAlign: 'left', fontWeight: 600}}>Role</th>
                      <th style={{padding: '1rem 2rem', textAlign: 'left', fontWeight: 600}}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map(member => (
                      <tr key={member.id} style={{borderBottom: '1px solid var(--border)'}}>
                        <td style={{padding: '1rem 2rem'}}>
                          <div style={{fontWeight: 500}}>{member.display_name || 'Unnamed User'}</div>
                          <div className="text-secondary" style={{fontSize: '0.85rem'}}>{member.email}</div>
                        </td>
                        <td style={{padding: '1rem 2rem'}}>
                          <button 
                            className="btn btn-secondary" 
                            style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem'}}
                            onClick={() => toggleUserRole(member.id, member.role)}
                            disabled={member.id === userProfile.id}
                          >
                            {member.role}
                          </button>
                        </td>
                        <td style={{padding: '1rem 2rem'}}>
                          <button 
                            className={`badge ${member.is_active ? 'badge-success' : 'badge-danger'}`} 
                            style={{border: 'none', cursor: member.id === userProfile.id ? 'default' : 'pointer'}}
                            onClick={() => toggleUserStatus(member.id, member.is_active)}
                            disabled={member.id === userProfile.id}
                          >
                            {member.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CRM DEFAULTS TAB */}
          {activeTab === 'defaults' && userProfile?.role === 'Admin' && (
            <div className="glass-panel" style={{padding: '2rem'}}>
              <h2 style={{marginBottom: '1.5rem'}}>{t('settings.defaults') || 'CRM Defaults'}</h2>
              <form onSubmit={saveCrmSettings} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                <div>
                  <label>Default Follow-up Reminder (Minutes before Due Time)</label>
                  <input 
                    type="number" 
                    value={crmSettings.default_reminder_minutes} 
                    onChange={e => setCrmSettings({...crmSettings, default_reminder_minutes: parseInt(e.target.value)})}
                    style={{maxWidth: '200px'}}
                  />
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem'}}>
                  <div>
                    <label>Work Hours Start</label>
                    <input 
                      type="time" 
                      value={crmSettings.work_hours_start} 
                      onChange={e => setCrmSettings({...crmSettings, work_hours_start: e.target.value})}
                    />
                  </div>
                  <div>
                    <label>Work Hours End</label>
                    <input 
                      type="time" 
                      value={crmSettings.work_hours_end} 
                      onChange={e => setCrmSettings({...crmSettings, work_hours_end: e.target.value})}
                    />
                  </div>
                </div>

                <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '1rem'}}>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    <Save size={18} /> {loading ? '...' : (t('settings.save') || 'Save Changes')}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
