import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../AuthContext';
import { LanguageContext } from '../../LanguageContext';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/activityLogger';
import { User, Bell, Users, Settings as SettingsIcon, Save, Palette, Image as ImageIcon, Shield, AlertTriangle, UserPlus, X, MessageCircle, Map, Gift } from 'lucide-react';
import TerritoriesTab from './Territories';
import DealerSchemes from './DealerSchemes';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Settings() {
  const { userProfile, setUserProfile, crmSettings, setCrmSettings } = useContext(AuthContext);
  const { t, setLanguage } = useContext(LanguageContext);
  const location = useLocation();
  const navigate = useNavigate();
  
  const getInitialTab = () => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    const validTabs = ['profile', 'security', 'appearance', 'personalization', 'notifications', 'brand', 'team', 'territories', 'templates', 'dealer_schemes', 'defaults'];
    if (tabParam && validTabs.includes(tabParam)) return tabParam;
    return 'profile';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  // States for each section
  const [profileData, setProfileData] = useState({});
  const [securityData, setSecurityData] = useState({ password: '', confirmPassword: '' });
  const [brandData, setBrandData] = useState({});
  const [appearanceData, setAppearanceData] = useState({});
  const [personalizationData, setPersonalizationData] = useState({});
  const [notificationsData, setNotificationsData] = useState({});
  const [defaultsData, setDefaultsData] = useState({});
  const [team, setTeam] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ email: '', password: '', display_name: '', role: 'Operator', whatsapp: '', contact_details: '', is_active: true });

  const [whatsappTemplates, setWhatsappTemplates] = useState([]);
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [newTemplateData, setNewTemplateData] = useState({ name: '', purpose: '', body: '', is_active: true });

  // Store initial state to detect changes
  const [initialProfile, setInitialProfile] = useState({});
  const [initialBrand, setInitialBrand] = useState({});
  const [initialAppearance, setInitialAppearance] = useState({});
  const [initialPersonalization, setInitialPersonalization] = useState({});
  const [initialNotifications, setInitialNotifications] = useState({});
  const [initialDefaults, setInitialDefaults] = useState({});

  useEffect(() => {
    if (userProfile) {
      const pData = {
        display_name: userProfile.display_name || '',
        mobile: userProfile.mobile || '',
        preferred_language: userProfile.preferred_language || 'en',
        timezone: userProfile.timezone || 'UTC'
      };
      setProfileData(pData);
      setInitialProfile(pData);
      
      const appData = {
        theme_mode: userProfile.theme_mode || 'system',
        accent_color: userProfile.accent_color || '#2563eb',
        sidebar_style: userProfile.sidebar_style || 'default',
        card_density: userProfile.card_density || 'comfortable',
      };
      setAppearanceData(appData);
      setInitialAppearance(appData);
      
      const persData = {
        wallpaper_url: userProfile.wallpaper_url || '',
        layout_mode: userProfile.layout_mode || 'standard',
      };
      setPersonalizationData(persData);
      setInitialPersonalization(persData);
      
      const notifData = userProfile.notification_rules || { email: true, in_app: true, activity: true, reminders: true };
      setNotificationsData(notifData);
      setInitialNotifications(notifData);
    }
  }, [userProfile]);

  useEffect(() => {
    if (crmSettings && userProfile?.role === 'Admin') {
      const bData = {
        crm_name: crmSettings.crm_name || 'Feed CRM',
        company_name: crmSettings.company_name || '',
        app_logo_url: crmSettings.app_logo_url || '',
        favicon_url: crmSettings.favicon_url || '',
      };
      setBrandData(bData);
      setInitialBrand(bData);
      
      const dData = {
        default_reminder_minutes: crmSettings.default_reminder_minutes || 15,
        work_hours_start: crmSettings.work_hours_start || '09:00:00',
        work_hours_end: crmSettings.work_hours_end || '18:00:00'
      };
      setDefaultsData(dData);
      setInitialDefaults(dData);
    }
  }, [crmSettings, userProfile]);

  useEffect(() => {
    if (activeTab === 'team' && userProfile?.role === 'Admin') {
      fetchTeam();
    }
    if (activeTab === 'templates' && userProfile?.role === 'Admin') {
      fetchTemplates();
    }
  }, [activeTab, userProfile]);

  // Check for unsaved changes whenever state changes
  useEffect(() => {
    const pDirty = JSON.stringify(profileData) !== JSON.stringify(initialProfile);
    const sDirty = securityData.password !== '';
    const bDirty = JSON.stringify(brandData) !== JSON.stringify(initialBrand);
    const aDirty = JSON.stringify(appearanceData) !== JSON.stringify(initialAppearance);
    const persDirty = JSON.stringify(personalizationData) !== JSON.stringify(initialPersonalization);
    const nDirty = JSON.stringify(notificationsData) !== JSON.stringify(initialNotifications);
    const dDirty = JSON.stringify(defaultsData) !== JSON.stringify(initialDefaults);
    
    setIsDirty(pDirty || sDirty || bDirty || aDirty || persDirty || nDirty || dDirty);
  }, [profileData, securityData, brandData, appearanceData, personalizationData, notificationsData, defaultsData]);

  // Prompt before unload if dirty
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleTabChange = (newTab) => {
    if (isDirty) {
      if (!window.confirm(t('settings.unsavedWarning') || 'You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    resetForm();
    setActiveTab(newTab);
    navigate(`/settings?tab=${newTab}`, { replace: true });
  };

  const resetForm = () => {
    setProfileData(initialProfile);
    setSecurityData({ password: '', confirmPassword: '' });
    setBrandData(initialBrand);
    setAppearanceData(initialAppearance);
    setPersonalizationData(initialPersonalization);
    setNotificationsData(initialNotifications);
    setDefaultsData(initialDefaults);
    setIsDirty(false);
  };

  const fetchTeam = async () => {
    const { data } = await supabase.from('app_users').select('*').order('created_at');
    if (data) setTeam(data);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from('whatsapp_templates').select('*').order('name');
    if (data) setWhatsappTemplates(data);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!isDirty) return;
    
    if (securityData.password && securityData.password !== securityData.confirmPassword) {
      alert(t('settings.security.passwordMismatch') || 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      let userUpdates = {};
      let crmUpdates = {};
      
      // Collect user updates
      if (JSON.stringify(profileData) !== JSON.stringify(initialProfile)) userUpdates = { ...userUpdates, ...profileData };
      if (JSON.stringify(appearanceData) !== JSON.stringify(initialAppearance)) userUpdates = { ...userUpdates, ...appearanceData };
      if (JSON.stringify(personalizationData) !== JSON.stringify(initialPersonalization)) userUpdates = { ...userUpdates, ...personalizationData };
      if (JSON.stringify(notificationsData) !== JSON.stringify(initialNotifications)) userUpdates = { ...userUpdates, notification_rules: notificationsData };
      
      // Collect CRM updates
      if (userProfile?.role === 'Admin') {
        if (JSON.stringify(brandData) !== JSON.stringify(initialBrand)) crmUpdates = { ...crmUpdates, ...brandData };
        if (JSON.stringify(defaultsData) !== JSON.stringify(initialDefaults)) crmUpdates = { ...crmUpdates, ...defaultsData };
      }

      // Execute updates
      if (Object.keys(userUpdates).length > 0) {
        const { error } = await supabase.from('app_users').update(userUpdates).eq('id', userProfile.id);
        if (error) throw error;
        setUserProfile(prev => ({ ...prev, ...userUpdates }));
        if (userUpdates.preferred_language && userUpdates.preferred_language !== userProfile.preferred_language) {
          setLanguage(userUpdates.preferred_language);
        }
      }

      if (Object.keys(crmUpdates).length > 0) {
        const { error } = await supabase.from('crm_settings').update(crmUpdates).eq('id', 1);
        if (error) throw error;
        setCrmSettings(prev => ({ ...prev, ...crmUpdates }));
      }

      if (securityData.password) {
        const { error: pwError } = await supabase.auth.updateUser({ password: securityData.password });
        if (pwError) throw pwError;
        setSecurityData({ password: '', confirmPassword: '' });
      }

      await logActivity({
        module: 'Settings',
        actionType: 'UPDATED',
        summary: `User updated settings and preferences.`
      });
      
      // Update initials
      if (Object.keys(userUpdates).length > 0) {
        setInitialProfile({ ...initialProfile, ...profileData });
        setInitialAppearance({ ...initialAppearance, ...appearanceData });
        setInitialPersonalization({ ...initialPersonalization, ...personalizationData });
        setInitialNotifications({ ...initialNotifications, ...notificationsData });
      }
      if (Object.keys(crmUpdates).length > 0) {
        setInitialBrand({ ...initialBrand, ...brandData });
        setInitialDefaults({ ...initialDefaults, ...defaultsData });
      }
      
      setIsDirty(false);
      // We simulate a reload by force-applying the personalization to DOM if we wanted to, 
      // but App.jsx will catch the setUserProfile and apply it instantly!
      
      alert('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'Admin' ? 'Operator' : 'Admin';
    const { error } = await supabase.from('app_users').update({ role: newRole }).eq('id', userId);
    if (!error) {
      fetchTeam();
      logActivity({ module: 'Settings', actionType: 'UPDATED', summary: `Changed user role to ${newRole}` });
    }
  };

  const toggleUserStatus = async (userId, isActive) => {
    const { error } = await supabase.from('app_users').update({ is_active: !isActive }).eq('id', userId);
    if (!error) {
      fetchTeam();
      logActivity({ module: 'Settings', actionType: 'UPDATED', summary: `Toggled user active status` });
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserData.email || !newUserData.password || !newUserData.display_name) {
      alert("Please fill required fields (Email, Password, Display Name)");
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_create_user', {
        new_email: newUserData.email,
        new_password: newUserData.password,
        new_display_name: newUserData.display_name,
        new_role: newUserData.role,
        new_whatsapp: newUserData.whatsapp,
        new_contact_details: newUserData.contact_details,
        new_is_active: newUserData.is_active
      });
      
      if (error) throw error;
      
      await logActivity({
        module: 'Settings',
        actionType: 'CREATED',
        summary: `Created new team member: ${newUserData.display_name}`
      });
      
      alert('Team member created successfully!');
      setShowAddUserModal(false);
      setNewUserData({ email: '', password: '', display_name: '', role: 'Operator', whatsapp: '', contact_details: '', is_active: true });
      fetchTeam();
    } catch (err) {
      console.error(err);
      alert('Error creating user: ' + (err.message || 'Unknown error. Make sure you applied the Sprint 15 SQL migration.'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplateData.name || !newTemplateData.purpose || !newTemplateData.body) {
      alert("Please fill required fields (Name, Purpose, Body)");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('whatsapp_templates').insert([{
        name: newTemplateData.name,
        purpose: newTemplateData.purpose,
        body: newTemplateData.body,
        is_active: newTemplateData.is_active,
        created_by: userProfile.id
      }]);
      if (error) throw error;
      alert('Template added successfully!');
      setShowAddTemplateModal(false);
      setNewTemplateData({ name: '', purpose: '', body: '', is_active: true });
      fetchTemplates();
    } catch (err) {
      console.error(err);
      alert('Error creating template.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplateStatus = async (id, isActive) => {
    const { error } = await supabase.from('whatsapp_templates').update({ is_active: !isActive }).eq('id', id);
    if (!error) {
      fetchTemplates();
    }
  };

  const tabs = [
    { id: 'profile', label: t('settings.tabs.profile') || 'Profile', icon: User },
    { id: 'security', label: t('settings.tabs.security') || 'Security', icon: Shield },
    { id: 'appearance', label: t('settings.tabs.appearance') || 'Appearance', icon: Palette },
    { id: 'personalization', label: t('settings.tabs.personalization') || 'Workspace Personalization', icon: ImageIcon },
    { id: 'notifications', label: t('settings.tabs.notifications') || 'Notifications', icon: Bell },
  ];
  if (userProfile?.role === 'Admin') {
    tabs.splice(2, 0, { id: 'brand', label: t('settings.tabs.brand') || 'Brand & Identity', icon: SettingsIcon });
    tabs.push({ id: 'team', label: t('settings.tabs.team') || 'Team Management', icon: Users });
    tabs.push({ id: 'territories', label: 'Territories', icon: Map });
    tabs.push({ id: 'templates', label: 'WhatsApp Templates', icon: MessageCircle });
    tabs.push({ id: 'dealer_schemes', label: 'Dealer Schemes', icon: Gift });
    tabs.push({ id: 'defaults', label: t('settings.tabs.defaults') || 'CRM Defaults', icon: SettingsIcon });
  }

  return (
    <div className="animate-fade-in" style={{maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px'}}>
      <div className="page-header" style={{marginBottom: '2rem'}}>
        <div>
          <h1 style={{margin: 0}}>{t('settings.title') || 'Settings & Preferences'}</h1>
        </div>
      </div>

      <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap'}}>
        {/* Sidebar Nav */}
        <div style={{flex: '1 1 250px'}}>
          <div className="glass-panel" style={{display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0}}>
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', 
                  padding: '1.25rem 1rem', textAlign: 'left', border: 'none',
                  background: activeTab === tab.id ? 'var(--bg-surface-hover)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-primary)',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  borderLeft: activeTab === tab.id ? '4px solid var(--primary)' : '4px solid transparent',
                  borderBottom: '1px solid var(--border)'
                }}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div style={{flex: '3 1 600px'}}>
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="glass-panel" style={{padding: '2.5rem'}}>
              <h2 style={{marginBottom: '2rem'}}>{t('settings.tabs.profile') || 'Profile'}</h2>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem'}}>
                  <div>
                    <label style={{fontWeight: 500, display: 'block', marginBottom: '0.5rem'}}>{t('settings.profile.displayName') || 'Display Name'}</label>
                    <input type="text" value={profileData.display_name} onChange={e => setProfileData({...profileData, display_name: e.target.value})} placeholder="Jane Doe" style={{width: '100%', padding: '0.75rem'}} />
                  </div>
                  <div>
                    <label style={{fontWeight: 500, display: 'block', marginBottom: '0.5rem'}}>{t('settings.profile.mobile') || 'Mobile Number'}</label>
                    <input type="text" value={profileData.mobile} onChange={e => setProfileData({...profileData, mobile: e.target.value})} placeholder="+91..." style={{width: '100%', padding: '0.75rem'}} />
                  </div>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem'}}>
                  <div>
                    <label style={{fontWeight: 500, display: 'block', marginBottom: '0.5rem'}}>{t('settings.profile.language') || 'Preferred Language'}</label>
                    <select value={profileData.preferred_language} onChange={e => setProfileData({...profileData, preferred_language: e.target.value})} style={{width: '100%', padding: '0.75rem'}}>
                      <option value="en">English</option>
                      <option value="hi">हिंदी (Hindi)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{fontWeight: 500, display: 'block', marginBottom: '0.5rem'}}>{t('settings.profile.timezone') || 'Timezone'}</label>
                    <select value={profileData.timezone} onChange={e => setProfileData({...profileData, timezone: e.target.value})} style={{width: '100%', padding: '0.75rem'}}>
                      <option value="UTC">UTC</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="glass-panel" style={{padding: '2.5rem'}}>
              <h2 style={{marginBottom: '2rem'}}>{t('settings.security.title') || 'Security'}</h2>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '400px'}}>
                <div>
                  <label style={{fontWeight: 500, display: 'block', marginBottom: '0.5rem'}}>{t('settings.security.newPassword') || 'New Password'}</label>
                  <input type="password" value={securityData.password} onChange={e => setSecurityData({...securityData, password: e.target.value})} placeholder="••••••••" style={{width: '100%', padding: '0.75rem'}} />
                </div>
                <div>
                  <label style={{fontWeight: 500, display: 'block', marginBottom: '0.5rem'}}>{t('settings.security.confirmPassword') || 'Confirm Password'}</label>
                  <input type="password" value={securityData.confirmPassword} onChange={e => setSecurityData({...securityData, confirmPassword: e.target.value})} placeholder="••••••••" style={{width: '100%', padding: '0.75rem'}} />
                  {securityData.password && securityData.password !== securityData.confirmPassword && (
                    <span className="text-danger" style={{fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem'}}>
                      <AlertTriangle size={14} /> {t('settings.security.passwordMismatch') || 'Passwords do not match'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BRAND & IDENTITY TAB */}
          {activeTab === 'brand' && userProfile?.role === 'Admin' && (
            <div className="glass-panel" style={{padding: '2.5rem'}}>
              <h2 style={{marginBottom: '2rem'}}>{t('settings.brand.title') || 'Brand & Identity'}</h2>
              <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem'}}>
                  <div>
                    <label style={{fontWeight: 500, display: 'block', marginBottom: '0.5rem'}}>{t('settings.brand.appName') || 'App/CRM Name'}</label>
                    <input type="text" value={brandData.crm_name} onChange={e => setBrandData({...brandData, crm_name: e.target.value})} style={{width: '100%', padding: '0.75rem'}} />
                  </div>
                  <div>
                    <label style={{fontWeight: 500, display: 'block', marginBottom: '0.5rem'}}>{t('settings.brand.companyName') || 'Company Name'}</label>
                    <input type="text" value={brandData.company_name} onChange={e => setBrandData({...brandData, company_name: e.target.value})} style={{width: '100%', padding: '0.75rem'}} />
                  </div>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem'}}>
                  <div>
                    <label style={{fontWeight: 500, display: 'block', marginBottom: '0.5rem'}}>{t('settings.brand.logoUrl') || 'App Logo URL'}</label>
                    <input type="text" value={brandData.app_logo_url} onChange={e => setBrandData({...brandData, app_logo_url: e.target.value})} placeholder="https://..." style={{width: '100%', padding: '0.75rem', marginBottom: '1rem'}} />
                    {brandData.app_logo_url && (
                      <div style={{padding: '1rem', background: 'var(--bg-base)', borderRadius: '8px', display: 'inline-block'}}>
                        <img src={brandData.app_logo_url} alt="Logo Preview" style={{height: '40px', objectFit: 'contain'}} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <div className="glass-panel" style={{padding: '2.5rem'}}>
              <h2 style={{marginBottom: '2rem'}}>{t('settings.appearance.title') || 'Appearance'}</h2>
              <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                
                <div>
                  <label style={{fontWeight: 500, display: 'block', marginBottom: '1rem'}}>{t('settings.appearance.theme') || 'Theme Mode'}</label>
                  <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                    {['light', 'dark', 'system'].map(mode => (
                      <button 
                        key={mode}
                        onClick={() => setAppearanceData({...appearanceData, theme_mode: mode})}
                        className="glass-panel"
                        style={{
                          flex: 1, minWidth: '120px', padding: '1rem', textAlign: 'center', cursor: 'pointer',
                          border: appearanceData.theme_mode === mode ? '2px solid var(--primary)' : '2px solid transparent',
                          background: mode === 'dark' ? '#1e293b' : mode === 'light' ? '#f8fafc' : 'var(--bg-surface)'
                        }}
                      >
                        <span style={{color: mode === 'dark' ? '#f8fafc' : mode === 'light' ? '#0f172a' : 'inherit', fontWeight: 600}}>
                          {t(`settings.appearance.theme.${mode}`) || mode}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{fontWeight: 500, display: 'block', marginBottom: '1rem'}}>{t('settings.appearance.accentColor') || 'Accent Color'}</label>
                  <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                    {['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0d9488'].map(color => (
                      <button 
                        key={color}
                        onClick={() => setAppearanceData({...appearanceData, accent_color: color})}
                        style={{
                          width: '40px', height: '40px', borderRadius: '50%', background: color, cursor: 'pointer',
                          border: appearanceData.accent_color === color ? '3px solid white' : 'none',
                          boxShadow: appearanceData.accent_color === color ? '0 0 0 2px var(--text-primary)' : 'none'
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem'}}>
                  <div>
                    <label style={{fontWeight: 500, display: 'block', marginBottom: '0.5rem'}}>{t('settings.appearance.density') || 'Card Density'}</label>
                    <select value={appearanceData.card_density} onChange={e => setAppearanceData({...appearanceData, card_density: e.target.value})} style={{width: '100%', padding: '0.75rem'}}>
                      <option value="compact">{t('settings.appearance.density.compact') || 'Compact'}</option>
                      <option value="comfortable">{t('settings.appearance.density.comfortable') || 'Comfortable'}</option>
                    </select>
                  </div>
                  <div>
                    <label style={{fontWeight: 500, display: 'block', marginBottom: '0.5rem'}}>{t('settings.appearance.sidebar') || 'Sidebar Style'}</label>
                    <select value={appearanceData.sidebar_style} onChange={e => setAppearanceData({...appearanceData, sidebar_style: e.target.value})} style={{width: '100%', padding: '0.75rem'}}>
                      <option value="default">Default</option>
                      <option value="floating">Floating</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* WORKSPACE PERSONALIZATION TAB */}
          {activeTab === 'personalization' && (
            <div className="glass-panel" style={{padding: '2.5rem'}}>
              <h2 style={{marginBottom: '2rem'}}>{t('settings.personalization.title') || 'Workspace Personalization'}</h2>
              <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                <div>
                  <label style={{fontWeight: 500, display: 'block', marginBottom: '0.5rem'}}>{t('settings.personalization.wallpaperUrl') || 'Wallpaper URL'}</label>
                  <input type="text" value={personalizationData.wallpaper_url} onChange={e => setPersonalizationData({...personalizationData, wallpaper_url: e.target.value})} placeholder="https://... (.jpg, .png)" style={{width: '100%', padding: '0.75rem', marginBottom: '1rem'}} />
                  {personalizationData.wallpaper_url && (
                    <div style={{
                      width: '100%', height: '200px', borderRadius: '12px', 
                      backgroundImage: `url(${personalizationData.wallpaper_url})`,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                      border: '1px solid var(--border)'
                    }} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="glass-panel" style={{padding: '2.5rem'}}>
              <h2 style={{marginBottom: '2rem'}}>{t('settings.tabs.notifications') || 'Notifications'}</h2>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                {Object.keys(notificationsData).map(key => (
                  <label key={key} style={{display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '1rem', background: 'var(--bg-base)', borderRadius: '8px'}}>
                    <input 
                      type="checkbox" 
                      checked={notificationsData[key]} 
                      onChange={e => setNotificationsData({...notificationsData, [key]: e.target.checked})}
                      style={{width: '20px', height: '20px', cursor: 'pointer'}}
                    />
                    <span style={{fontWeight: 500}}>{t(`settings.notifications.${key}`) || key}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TEAM TAB */}
          {activeTab === 'team' && userProfile?.role === 'Admin' && (
            <div className="glass-panel" style={{padding: '0', overflow: 'hidden'}}>
              <div style={{padding: '2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <h2 style={{margin: 0}}>{t('settings.tabs.team') || 'Team Management'}</h2>
                  <p className="text-secondary" style={{marginTop: '0.5rem', fontSize: '0.95rem'}}>Manage access and roles across the CRM.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddUserModal(true)}>
                  <UserPlus size={18} /> Add Team Member
                </button>
              </div>
              <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-hover)'}}>
                      <th style={{padding: '1.25rem 2rem', textAlign: 'left', fontWeight: 600}}>User</th>
                      <th style={{padding: '1.25rem 2rem', textAlign: 'left', fontWeight: 600}}>Contact</th>
                      <th style={{padding: '1.25rem 2rem', textAlign: 'left', fontWeight: 600}}>Role</th>
                      <th style={{padding: '1.25rem 2rem', textAlign: 'left', fontWeight: 600}}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map(member => (
                      <tr key={member.id} style={{borderBottom: '1px solid var(--border)'}}>
                        <td style={{padding: '1.25rem 2rem'}}>
                          <div style={{fontWeight: 600}}>{member.display_name || 'Unnamed User'}</div>
                          <div className="text-secondary" style={{fontSize: '0.9rem'}}>{member.email}</div>
                        </td>
                        <td style={{padding: '1.25rem 2rem'}}>
                          <div style={{fontSize: '0.9rem'}}>{member.whatsapp || member.mobile || '-'}</div>
                          <div className="text-secondary" style={{fontSize: '0.85rem'}}>{member.contact_details || ''}</div>
                        </td>
                        <td style={{padding: '1.25rem 2rem'}}>
                          <select 
                            value={member.role} 
                            onChange={(e) => toggleUserRole(member.id, e.target.value)}
                            disabled={member.id === userProfile.id}
                            style={{padding: '0.5rem'}}
                          >
                            <option value="Admin">Admin</option>
                            <option value="Operator">Operator</option>
                          </select>
                        </td>
                        <td style={{padding: '1.25rem 2rem'}}>
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

          {/* ADD USER MODAL */}
          {showAddUserModal && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
              background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', 
              alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}>
              <div className="glass-panel" style={{width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative'}}>
                <button 
                  onClick={() => setShowAddUserModal(false)}
                  style={{position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)'}}
                >
                  <X size={24} />
                </button>
                <h2 style={{marginBottom: '1.5rem'}}>Add Team Member</h2>
                
                <form onSubmit={handleAddUser} style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Full Name *</label>
                    <input type="text" value={newUserData.display_name} onChange={e => setNewUserData({...newUserData, display_name: e.target.value})} required style={{width: '100%', padding: '0.75rem'}} />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Email *</label>
                    <input type="email" value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} required style={{width: '100%', padding: '0.75rem'}} />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Temporary Password *</label>
                    <input type="password" value={newUserData.password} onChange={e => setNewUserData({...newUserData, password: e.target.value})} required style={{width: '100%', padding: '0.75rem'}} minLength={6} />
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                    <div>
                      <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Role</label>
                      <select value={newUserData.role} onChange={e => setNewUserData({...newUserData, role: e.target.value})} style={{width: '100%', padding: '0.75rem'}}>
                        <option value="Operator">Operator</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>WhatsApp Number</label>
                      <input type="text" value={newUserData.whatsapp} onChange={e => setNewUserData({...newUserData, whatsapp: e.target.value})} placeholder="+91..." style={{width: '100%', padding: '0.75rem'}} />
                    </div>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem'}}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddUserModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create User'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TEMPLATES TAB */}
          {activeTab === 'templates' && userProfile?.role === 'Admin' && (
            <div className="glass-panel" style={{padding: '0', overflow: 'hidden'}}>
              <div style={{padding: '2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <h2 style={{margin: 0}}>WhatsApp Templates</h2>
                  <p className="text-secondary" style={{marginTop: '0.5rem', fontSize: '0.95rem'}}>Manage reusable message templates with variable substitution.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddTemplateModal(true)}>
                  <MessageCircle size={18} /> Add Template
                </button>
              </div>
              <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-hover)'}}>
                      <th style={{padding: '1.25rem 2rem', textAlign: 'left', fontWeight: 600}}>Template Name</th>
                      <th style={{padding: '1.25rem 2rem', textAlign: 'left', fontWeight: 600}}>Purpose</th>
                      <th style={{padding: '1.25rem 2rem', textAlign: 'left', fontWeight: 600}}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whatsappTemplates.map(t => (
                      <tr key={t.id} style={{borderBottom: '1px solid var(--border)'}}>
                        <td style={{padding: '1.25rem 2rem'}}>
                          <div style={{fontWeight: 600}}>{t.name}</div>
                          <div className="text-secondary" style={{fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px'}}>{t.body}</div>
                        </td>
                        <td style={{padding: '1.25rem 2rem'}}>
                          <div style={{fontSize: '0.9rem'}}>{t.purpose}</div>
                        </td>
                        <td style={{padding: '1.25rem 2rem'}}>
                          <button 
                            className={`badge ${t.is_active ? 'badge-success' : 'badge-danger'}`} 
                            style={{border: 'none', cursor: 'pointer'}}
                            onClick={() => toggleTemplateStatus(t.id, t.is_active)}
                          >
                            {t.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ADD TEMPLATE MODAL */}
          {showAddTemplateModal && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
              background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', 
              alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}>
              <div className="glass-panel" style={{width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative'}}>
                <button 
                  onClick={() => setShowAddTemplateModal(false)}
                  style={{position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)'}}
                >
                  <X size={24} />
                </button>
                <h2 style={{marginBottom: '1.5rem'}}>Add WhatsApp Template</h2>
                
                <form onSubmit={handleAddTemplate} style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Template Name *</label>
                    <input type="text" value={newTemplateData.name} onChange={e => setNewTemplateData({...newTemplateData, name: e.target.value})} required style={{width: '100%', padding: '0.75rem'}} placeholder="e.g. Payment Reminder" />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Purpose *</label>
                    <select value={newTemplateData.purpose} onChange={e => setNewTemplateData({...newTemplateData, purpose: e.target.value})} style={{width: '100%', padding: '0.75rem'}}>
                      <option value="">-- Select Purpose --</option>
                      <option value="General Check-in">General Check-in</option>
                      <option value="Payment Reminder">Payment Reminder</option>
                      <option value="Requirement Check">Requirement Check</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Message Body *</label>
                    <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>Available variables: {'{{customer_name}}, {{city}}, {{state}}, {{salesperson_name}}'}</p>
                    <textarea value={newTemplateData.body} onChange={e => setNewTemplateData({...newTemplateData, body: e.target.value})} required style={{width: '100%', padding: '0.75rem'}} rows={4} placeholder="Hello {{customer_name}}, this is a reminder..." />
                  </div>
                  <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem'}}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddTemplateModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Template'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CRM DEFAULTS TAB */}
          {activeTab === 'defaults' && userProfile?.role === 'Admin' && (
            <div className="glass-panel" style={{padding: '2.5rem'}}>
              <h2 style={{marginBottom: '2rem'}}>{t('settings.tabs.defaults') || 'CRM Defaults'}</h2>
              <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                <div>
                  <label style={{fontWeight: 500, display: 'block', marginBottom: '0.5rem'}}>Default Follow-up Reminder (Minutes before Due Time)</label>
                  <input 
                    type="number" 
                    value={defaultsData.default_reminder_minutes} 
                    onChange={e => setDefaultsData({...defaultsData, default_reminder_minutes: parseInt(e.target.value)})}
                    style={{maxWidth: '200px', padding: '0.75rem'}}
                  />
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem'}}>
                  <div>
                    <label style={{fontWeight: 500, display: 'block', marginBottom: '0.5rem'}}>Work Hours Start</label>
                    <input 
                      type="time" 
                      value={defaultsData.work_hours_start} 
                      onChange={e => setDefaultsData({...defaultsData, work_hours_start: e.target.value})}
                      style={{width: '100%', padding: '0.75rem'}}
                    />
                  </div>
                  <div>
                    <label style={{fontWeight: 500, display: 'block', marginBottom: '0.5rem'}}>Work Hours End</label>
                    <input 
                      type="time" 
                      value={defaultsData.work_hours_end} 
                      onChange={e => setDefaultsData({...defaultsData, work_hours_end: e.target.value})}
                      style={{width: '100%', padding: '0.75rem'}}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* TERRITORIES TAB */}
          {activeTab === 'territories' && userProfile?.role === 'Admin' && (
            <TerritoriesTab />
          )}

          {/* DEALER SCHEMES TAB */}
          {activeTab === 'dealer_schemes' && userProfile?.role === 'Admin' && (
            <DealerSchemes />
          )}

        </div>
      </div>

      {/* STICKY ACTION BAR */}
      {isDirty && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, 
          background: 'var(--bg-surface)', borderTop: '1px solid var(--border)',
          padding: '1rem 2rem', display: 'flex', justifyContent: 'center', zIndex: 100,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem', maxWidth: '1000px', width: '100%', justifyContent: 'flex-end'}}>
            <span className="text-secondary" style={{marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500}}>
              <AlertTriangle size={18} className="text-warning" /> Unsaved changes
            </span>
            <button className="btn btn-secondary" onClick={resetForm} disabled={loading}>
              {t('settings.reset') || 'Reset'}
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
              <Save size={18} /> {loading ? 'Saving...' : (t('settings.save') || 'Save Changes')}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
