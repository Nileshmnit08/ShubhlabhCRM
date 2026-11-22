import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../AuthContext';
import { LanguageContext } from '../../LanguageContext';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/activityLogger';
import {
  User,
  Bell,
  Users,
  Settings as SettingsIcon,
  Save,
  Palette,
  Monitor,
  Layers,
  Shield,
  AlertTriangle,
  UserPlus,
  X,
  MessageCircle,
  Map,
  Gift,
  Phone,
  Mail,
  Search,
  Key,
  MoreVertical,
  History,
  CheckCircle,
  Clock
} from 'lucide-react';
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
    const validTabs = [
      'profile', 'security', 'brand', 'appearance', 'personalization',
      'notifications', 'team', 'notification_history', 'territories',
      'templates', 'dealer_schemes', 'defaults'
    ];
    if (tabParam && validTabs.includes(tabParam)) return tabParam;
    return 'profile';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  // Team Management Filter & Search state
  const [teamSearch, setTeamSearch] = useState('');
  const [teamRoleFilter, setTeamRoleFilter] = useState('All');
  const [teamStatusFilter, setTeamStatusFilter] = useState('All');
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);

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
  const [partiesList, setPartiesList] = useState([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [partySearchTerm, setPartySearchTerm] = useState('');

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [adminChangePasswordData, setAdminChangePasswordData] = useState({ newPassword: '', confirmPassword: '' });

  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationData, setNotificationData] = useState({ recipients: ['ALL_ACTIVE'], title: '', message: '', link_url: '' });

  const [historyData, setHistoryData] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('All');
  const [historySearch, setHistorySearch] = useState('');

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

  // Sync tab with URL search parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

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
        accent_color: userProfile.accent_color || '#078B54',
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
        crm_name: crmSettings.crm_name || 'Shubh Labh CRM',
        company_name: crmSettings.company_name || 'Shubh Labh Cattle Feeds',
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

  const fetchNotificationHistory = async () => {
    if (userProfile?.role !== 'Admin') return;
    const { data } = await supabase
      .from('crm_notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setHistoryData(data);
  };

  useEffect(() => {
    if (activeTab === 'team' && userProfile?.role === 'Admin') {
      fetchTeam();
    }
    if (activeTab === 'templates' && userProfile?.role === 'Admin') {
      fetchTemplates();
    }
    if (activeTab === 'notification_history' && userProfile?.role === 'Admin') {
      fetchNotificationHistory();
    }
  }, [activeTab, userProfile]);

  // Check for unsaved changes
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

  // Close open action menu on window click
  useEffect(() => {
    const handleClickOutside = () => setActiveActionMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleTabChange = (newTab) => {
    if (isDirty) {
      if (!window.confirm(t('settings.unsavedWarning') || 'You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    resetForm();
    setActiveTab(newTab);
    navigate(`/settings?tab=${newTab}`, { replace: false });
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
    const { data } = await supabase
      .from('app_users')
      .select('*, crm_parties!crm_party_id(id, display_name, legal_or_core_name, customer_code, mobile)')
      .order('created_at');
    if (data) setTeam(data);
  };

  const fetchParties = async () => {
    setLoadingParties(true);
    try {
      const { data } = await supabase
        .from('crm_parties')
        .select('id, display_name, legal_or_core_name, mobile, whatsapp, customer_code, city')
        .order('display_name');
      if (data) setPartiesList(data);
    } catch (err) {
      console.error('Failed to fetch customer parties:', err);
    } finally {
      setLoadingParties(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'team' || showAddUserModal) {
      if (partiesList.length === 0) {
        fetchParties();
      }
    }
  }, [activeTab, showAddUserModal]);

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
      
      if (JSON.stringify(profileData) !== JSON.stringify(initialProfile)) userUpdates = { ...userUpdates, ...profileData };
      if (JSON.stringify(appearanceData) !== JSON.stringify(initialAppearance)) userUpdates = { ...userUpdates, ...appearanceData };
      if (JSON.stringify(personalizationData) !== JSON.stringify(initialPersonalization)) userUpdates = { ...userUpdates, ...personalizationData };
      if (JSON.stringify(notificationsData) !== JSON.stringify(initialNotifications)) userUpdates = { ...userUpdates, notification_rules: notificationsData };
      
      if (userProfile?.role === 'Admin') {
        if (JSON.stringify(brandData) !== JSON.stringify(initialBrand)) crmUpdates = { ...crmUpdates, ...brandData };
        if (JSON.stringify(defaultsData) !== JSON.stringify(initialDefaults)) crmUpdates = { ...crmUpdates, ...defaultsData };
      }

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
        summary: 'User updated settings and preferences.'
      });
      
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
      alert('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserRole = async (userId, newRole) => {
    // If set to Customer, store as Buyer in database for backward compatibility with mobile APK & RLS
    const dbRole = newRole === 'Customer' ? 'Buyer' : newRole;
    const { error } = await supabase.from('app_users').update({ role: dbRole }).eq('id', userId);
    if (!error) {
      fetchTeam();
      logActivity({ module: 'Settings', actionType: 'UPDATED', summary: `Changed user role to ${newRole}` });
    }
  };

  const toggleUserStatus = async (userId, isActive) => {
    const { error } = await supabase.from('app_users').update({ is_active: !isActive }).eq('id', userId);
    if (!error) {
      fetchTeam();
      logActivity({ module: 'Settings', actionType: 'UPDATED', summary: 'Toggled user active status' });
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserData.email || !newUserData.password || !newUserData.display_name) {
      alert("Please fill required fields (Email, Password, Display Name)");
      return;
    }

    if (newUserData.role === 'Customer' && !selectedPartyId) {
      alert("Please select a linked Customer (Party) for this customer account.");
      return;
    }
    
    setLoading(true);
    try {
      if (newUserData.role === 'Customer') {
        // 1. Check if this customer already has an active buyer account
        const { data: existing, error: checkErr } = await supabase
          .from('app_users')
          .select('id, email')
          .eq('crm_party_id', selectedPartyId)
          .in('role', ['Buyer', 'Customer']);

        if (!checkErr && existing && existing.length > 0) {
          alert(`This customer already has an active Order App account registered with Login ID: ${existing[0].email}`);
          setLoading(false);
          return;
        }

        // 2. Call admin_create_buyer RPC (sets role = 'Buyer' and crm_party_id)
        const { data: newUserId, error } = await supabase.rpc('admin_create_buyer', {
          new_email: newUserData.email.trim(),
          new_password: newUserData.password,
          new_display_name: newUserData.display_name.trim(),
          new_crm_party_id: selectedPartyId,
          new_is_active: newUserData.is_active !== false
        });

        if (error) throw error;

        await logActivity({
          module: 'Settings',
          actionType: 'CREATED',
          summary: `Created Customer Order App account for ${newUserData.display_name}`
        });

        alert('Customer account created successfully! They can now log in to the Shubh Labh Order App with their mobile number and password.');
        setShowAddUserModal(false);
        setSelectedPartyId('');
        setPartySearchTerm('');
        setNewUserData({ email: '', password: '', display_name: '', role: 'Operator', whatsapp: '', contact_details: '', is_active: true });
        fetchTeam();
        return;
      }

      const { error } = await supabase.rpc('admin_create_user', {
        new_email: newUserData.email.trim(),
        new_password: newUserData.password,
        new_display_name: newUserData.display_name.trim(),
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
      setSelectedPartyId('');
      setPartySearchTerm('');
      setNewUserData({ email: '', password: '', display_name: '', role: 'Operator', whatsapp: '', contact_details: '', is_active: true });
      fetchTeam();
    } catch (err) {
      console.error(err);
      alert('Error creating user: ' + (err.message || 'Unknown error.'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdminChangePassword = async (e) => {
    e.preventDefault();
    if (!adminChangePasswordData.newPassword || !adminChangePasswordData.confirmPassword) {
      alert("Please fill all password fields.");
      return;
    }
    if (adminChangePasswordData.newPassword !== adminChangePasswordData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.rpc('admin_change_user_password', {
        target_user_id: passwordTarget.id,
        new_password: adminChangePasswordData.newPassword
      });
      
      if (error) throw error;
      
      alert('Password changed successfully.\nTeam member can now sign in using the new password.');
      setShowChangePasswordModal(false);
      setPasswordTarget(null);
      setAdminChangePasswordData({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error(err);
      alert('Error changing password: ' + (err.message || 'Unknown error.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notificationData.title || !notificationData.message) {
      alert("Please provide a title and message.");
      return;
    }

    try {
      let targetUsers = [];
      if (!notificationData.recipients || notificationData.recipients.length === 0) {
        alert("Please select at least one recipient.");
        return;
      }
      
      if (notificationData.recipients.includes('ALL_ACTIVE')) {
        targetUsers = team.filter(m => m.is_active && m.role !== 'Admin');
      } else {
        targetUsers = team.filter(m => notificationData.recipients.includes(m.id));
      }

      if (targetUsers.length === 0) {
        alert("No valid recipients found.");
        return;
      }

      const inserts = targetUsers.map(u => ({
        user_id: u.id,
        notification_type: 'MANUAL_ALERT',
        title: notificationData.title,
        message: notificationData.message,
        link_url: notificationData.link_url || null
      }));

      const { error } = await supabase.from('crm_notifications').insert(inserts);
      
      if (error) throw error;
      
      alert(`Notification sent successfully to ${targetUsers.length} Field Staff.`);
      setShowNotificationModal(false);
      setNotificationData({ recipients: ['ALL_ACTIVE'], title: '', message: '', link_url: '' });
      
    } catch (err) {
      console.error('Error sending notification', err);
      alert('Failed to send notification: ' + err.message);
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

  // Define nine primary horizontal tabs
  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'profile', label: 'Profile', icon: User },
      { id: 'security', label: 'Security', icon: Shield },
    ];

    if (userProfile?.role === 'Admin') {
      baseTabs.push({ id: 'brand', label: 'Brand & Identity', icon: Layers });
    }

    baseTabs.push(
      { id: 'appearance', label: 'Appearance', icon: Palette },
      { id: 'personalization', label: 'Workspace Personalization', icon: Monitor },
      { id: 'notifications', label: 'Notifications', icon: Bell }
    );

    if (userProfile?.role === 'Admin') {
      baseTabs.push(
        { id: 'team', label: 'Team Management', icon: Users },
        { id: 'notification_history', label: 'Notification History', icon: History },
        { id: 'territories', label: 'Territories', icon: Map }
      );
    }

    // Secondary fallback tabs to avoid broken routes
    if (activeTab === 'templates' && !baseTabs.find(t => t.id === 'templates')) {
      baseTabs.push({ id: 'templates', label: 'WhatsApp Templates', icon: MessageCircle });
    }
    if (activeTab === 'dealer_schemes' && !baseTabs.find(t => t.id === 'dealer_schemes')) {
      baseTabs.push({ id: 'dealer_schemes', label: 'Dealer Schemes', icon: Gift });
    }
    if (activeTab === 'defaults' && !baseTabs.find(t => t.id === 'defaults')) {
      baseTabs.push({ id: 'defaults', label: 'CRM Defaults', icon: SettingsIcon });
    }

    return baseTabs;
  }, [userProfile?.role, activeTab]);

  // Filtered team list
  const filteredTeam = useMemo(() => {
    return team.filter(member => {
      // Role filter
      if (teamRoleFilter !== 'All') {
        if (teamRoleFilter === 'Customer') {
          if (member.role !== 'Buyer' && member.role !== 'Customer') return false;
        } else if (member.role !== teamRoleFilter) {
          return false;
        }
      }
      // Status filter
      if (teamStatusFilter === 'Active' && !member.is_active) return false;
      if (teamStatusFilter === 'Inactive' && member.is_active) return false;
      // Search text
      if (teamSearch.trim()) {
        const query = teamSearch.trim().toLowerCase();
        const name = (member.display_name || '').toLowerCase();
        const email = (member.email || '').toLowerCase();
        const phone = (member.whatsapp || member.mobile || member.contact_details || '').toLowerCase();
        const role = (member.role || '').toLowerCase();
        const partyName = (member.crm_parties?.display_name || member.crm_parties?.legal_or_core_name || '').toLowerCase();
        const partyCode = (member.crm_parties?.customer_code || '').toLowerCase();
        return name.includes(query) || email.includes(query) || phone.includes(query) || role.includes(query) || partyName.includes(query) || partyCode.includes(query);
      }
      return true;
    });
  }, [team, teamSearch, teamRoleFilter, teamStatusFilter]);

  // Helper for User Avatar Initials and Colors
  const getInitials = (name, email) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getAvatarColor = (name = '', role = '') => {
    const combined = (name + role).toLowerCase();
    if (combined.includes('admin')) return { bg: '#E8F5E9', text: '#078B54' }; // Green
    if (combined.includes('customer') || combined.includes('buyer')) return { bg: '#E0F7FA', text: '#00838F' }; // Cyan/Teal
    if (combined.includes('vishnu') || combined.includes('operations')) return { bg: '#EDE9FE', text: '#7C3AED' }; // Purple
    if (combined.includes('pradeep') || combined.includes('production')) return { bg: '#FEF3C7', text: '#D97706' }; // Amber
    if (combined.includes('vijay') || combined.includes('sales')) return { bg: '#E0F2FE', text: '#0284C7' }; // Blue
    return { bg: '#F1F5F9', text: '#475569' }; // Slate
  };

  return (
    <div
      className="settings-workspace animate-fade-in"
      style={{
        width: '100%',
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '1.25rem 1.5rem 5rem 1.5rem',
        boxSizing: 'border-box',
        backgroundColor: '#F5F7FA',
        minHeight: 'calc(100vh - 70px)'
      }}
    >
      {/* ─── B. SETTINGS PAGE HEADER ───────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}
      >
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#E8F5E9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#078B54',
            flexShrink: 0,
            border: '1px solid rgba(7, 139, 84, 0.15)'
          }}
        >
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '1.625rem',
              fontWeight: 700,
              color: '#172D4F',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}
          >
            Settings & Preferences
          </h1>
          <p
            style={{
              margin: '0.25rem 0 0 0',
              fontSize: '0.875rem',
              color: '#64748B',
              fontWeight: 400
            }}
          >
            Manage your workspace, team, security and preferences for Shubh Labh CRM.
          </p>
        </div>
      </div>

      {/* ─── C. HORIZONTAL SETTINGS NAVIGATION (9 TABS) ────────────────── */}
      <div
        className="horizontal-tabs-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '2px',
          scrollbarWidth: 'none'
        }}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1rem',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#078B54' : '#64748B',
                backgroundColor: isActive ? '#E8F5E9' : 'transparent',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                borderBottom: isActive ? '3px solid #078B54' : '3px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              onMouseOver={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                  e.currentTarget.style.color = '#172D4F';
                }
              }}
              onMouseOut={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748B';
                }
              }}
            >
              <Icon size={17} style={{ color: isActive ? '#078B54' : '#64748B', flexShrink: 0 }} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── FULL-WIDTH SETTINGS WORKSPACE CONTENT ─────────────────────── */}
      <div style={{ width: '100%' }}>

        {/* ─── D. TEAM MANAGEMENT TAB (REFERENCE IMPLEMENTATION) ────────── */}
        {activeTab === 'team' && userProfile?.role === 'Admin' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.5rem',
                paddingBottom: '1.25rem',
                borderBottom: '1px solid #E2E8F0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: '#E8F5E9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#078B54'
                  }}
                >
                  <Users size={22} />
                </div>
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#172D4F',
                      lineHeight: 1.2
                    }}
                  >
                    Team Management
                  </h2>
                  <p
                    style={{
                      margin: '0.2rem 0 0 0',
                      fontSize: '0.85rem',
                      color: '#64748B'
                    }}
                  >
                    Manage team members, access levels and roles across the CRM.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowNotificationModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    color: '#263448',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  <Bell size={16} />
                  <span>Send Notification</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 1.15rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    backgroundColor: '#078B54',
                    border: '1px solid #078B54',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(7, 139, 84, 0.2)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#067547'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#078B54'}
                >
                  <UserPlus size={16} />
                  <span>Add Team Member</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: '1 1 500px' }}>
                {/* Search Input */}
                <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94A3B8'
                    }}
                  />
                  <input
                    type="text"
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    placeholder="Search by name, email or mobile..."
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 0.75rem 0 2.25rem',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '0.875rem',
                      color: '#263448',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Role Filter */}
                <select
                  value={teamRoleFilter}
                  onChange={(e) => setTeamRoleFilter(e.target.value)}
                  style={{
                    height: '38px',
                    padding: '0 1.75rem 0 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.875rem',
                    color: '#263448',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <option value="All">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="Operations">Operations</option>
                  <option value="Production">Production</option>
                  <option value="Sales">Sales</option>
                  <option value="Staff">Staff</option>
                  <option value="Operator">Operator</option>
                  <option value="Customer">Customer</option>
                </select>

                {/* Status Filter */}
                <select
                  value={teamStatusFilter}
                  onChange={(e) => setTeamStatusFilter(e.target.value)}
                  style={{
                    height: '38px',
                    padding: '0 1.75rem 0 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.875rem',
                    color: '#263448',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Counter Badge */}
              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '9999px',
                    backgroundColor: '#E8F5E9',
                    color: '#078B54',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '1px solid rgba(7, 139, 84, 0.2)'
                  }}
                >
                  Total Members: <strong style={{ marginLeft: '0.3rem' }}>{filteredTeam.length}</strong>
                </span>
              </div>
            </div>

            {/* Team Members Table */}
            <div
              style={{
                width: '100%',
                overflowX: 'auto',
                border: '1px solid #E2E8F0',
                borderRadius: '8px'
              }}
            >
              <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '0.75rem 1rem', width: '45px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>
                      #
                    </th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>
                      User
                    </th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>
                      Contact
                    </th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>
                      Role
                    </th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>
                      Status
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeam.map((member, index) => {
                    const initials = getInitials(member.display_name, member.email);
                    const avatarColor = getAvatarColor(member.display_name, member.role);
                    const contactPhone = member.whatsapp || member.mobile;
                    const contactDisplay = contactPhone || member.email;
                    const isSelf = member.id === userProfile?.id;

                    return (
                      <tr
                        key={member.id}
                        style={{
                          borderBottom: index < filteredTeam.length - 1 ? '1px solid #E2E8F0' : 'none',
                          backgroundColor: '#FFFFFF',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                      >
                        {/* # Index */}
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>
                          {index + 1}
                        </td>

                        {/* User Column */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: avatarColor.bg,
                                color: avatarColor.text,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                flexShrink: 0
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#172D4F', fontSize: '0.9rem', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span>{member.display_name || member.crm_parties?.display_name || 'Unnamed User'}</span>
                                {(member.role === 'Buyer' || member.role === 'Customer') && (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      fontSize: '0.68rem',
                                      padding: '0.1rem 0.4rem',
                                      borderRadius: '4px',
                                      backgroundColor: '#E0F7FA',
                                      color: '#00838F',
                                      fontWeight: 700
                                    }}
                                  >
                                    ORDER APP
                                  </span>
                                )}
                              </div>
                              {member.crm_parties && (
                                <div style={{ color: '#078B54', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.2rem' }}>
                                  🏢 {member.crm_parties.display_name || member.crm_parties.legal_or_core_name} {member.crm_parties.customer_code ? `(${member.crm_parties.customer_code})` : ''}
                                </div>
                              )}
                              <div style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                {member.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact Column */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#263448', fontSize: '0.85rem' }}>
                            {contactPhone ? (
                              <>
                                <Phone size={14} style={{ color: '#64748B' }} />
                                <span>{contactPhone}</span>
                              </>
                            ) : (
                              <>
                                <Mail size={14} style={{ color: '#64748B' }} />
                                <span>{member.email}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Role Column */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {(() => {
                            const isCustomerRole = member.role === 'Buyer' || member.role === 'Customer';
                            const roleValue = isCustomerRole ? 'Customer' : (member.role || 'Staff');
                            return (
                              <select
                                value={roleValue}
                                onChange={(e) => toggleUserRole(member.id, e.target.value)}
                                disabled={isSelf}
                                style={{
                                  height: '32px',
                                  padding: '0 0.5rem',
                                  borderRadius: '6px',
                                  border: isCustomerRole ? '1px solid #00838F' : '1px solid #E2E8F0',
                                  fontSize: '0.85rem',
                                  color: isCustomerRole ? '#00838F' : '#263448',
                                  backgroundColor: isCustomerRole ? '#E0F7FA' : '#FFFFFF',
                                  fontWeight: isCustomerRole ? 600 : 500,
                                  cursor: isSelf ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <option value="Admin">Admin</option>
                                <option value="Operations">Operations</option>
                                <option value="Production">Production</option>
                                <option value="Sales">Sales</option>
                                <option value="Staff">Staff</option>
                                <option value="Operator">Operator</option>
                                <option value="Customer">Customer</option>
                              </select>
                            );
                          })()}
                        </td>

                        {/* Status Column */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <button
                            type="button"
                            onClick={() => !isSelf && toggleUserStatus(member.id, member.is_active)}
                            disabled={isSelf}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                              backgroundColor: member.is_active ? '#ECFDF5' : '#FEF2F2',
                              color: member.is_active ? '#059669' : '#DC2626',
                              border: `1px solid ${member.is_active ? 'rgba(5, 150, 105, 0.2)' : 'rgba(220, 38, 38, 0.2)'}`,
                              cursor: isSelf ? 'default' : 'pointer'
                            }}
                            title={isSelf ? 'Cannot deactivate self' : 'Click to toggle status'}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: member.is_active ? '#059669' : '#DC2626'
                              }}
                            />
                            <span>{member.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                          </button>
                        </td>

                        {/* Actions Column */}
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setPasswordTarget(member);
                                setShowChangePasswordModal(true);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #E2E8F0',
                                backgroundColor: '#FFFFFF',
                                color: '#263448',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                            >
                              <Key size={13} style={{ color: '#64748B' }} />
                              <span>Change Password</span>
                            </button>

                            {/* More Options */}
                            <div style={{ position: 'relative' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveActionMenuId(activeActionMenuId === member.id ? null : member.id);
                                }}
                                style={{
                                  padding: '0.35rem',
                                  borderRadius: '6px',
                                  border: 'none',
                                  backgroundColor: activeActionMenuId === member.id ? '#F1F5F9' : 'transparent',
                                  color: '#64748B',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="More options"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {activeActionMenuId === member.id && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '100%',
                                    marginTop: '4px',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    zIndex: 50,
                                    minWidth: '160px',
                                    padding: '0.35rem 0',
                                    textAlign: 'left'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(member.email);
                                      setActiveActionMenuId(null);
                                      alert(`Copied email: ${member.email}`);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '0.5rem 0.85rem',
                                      border: 'none',
                                      backgroundColor: 'transparent',
                                      textAlign: 'left',
                                      fontSize: '0.85rem',
                                      color: '#263448',
                                      cursor: 'pointer'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    Copy Email
                                  </button>
                                  {contactPhone && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(contactPhone);
                                        setActiveActionMenuId(null);
                                        alert(`Copied phone: ${contactPhone}`);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '0.5rem 0.85rem',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        textAlign: 'left',
                                        fontSize: '0.85rem',
                                        color: '#263448',
                                        cursor: 'pointer'
                                      }}
                                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      Copy Phone
                                    </button>
                                  )}
                                  {!isSelf && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        toggleUserStatus(member.id, member.is_active);
                                        setActiveActionMenuId(null);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '0.5rem 0.85rem',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        textAlign: 'left',
                                        fontSize: '0.85rem',
                                        color: member.is_active ? '#DC2626' : '#059669',
                                        cursor: 'pointer',
                                        borderTop: '1px solid #F1F5F9'
                                      }}
                                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      {member.is_active ? 'Deactivate Member' : 'Activate Member'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTeam.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
                        No team members found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── 1. PROFILE TAB ────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#172D4F' }}>
              Personal Profile
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem', color: '#263448' }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={profileData.display_name || ''}
                    onChange={e => setProfileData({ ...profileData, display_name: e.target.value })}
                    placeholder="Enter your full name"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '0.875rem',
                      color: '#263448',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem', color: '#263448' }}>
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={profileData.mobile || ''}
                    onChange={e => setProfileData({ ...profileData, mobile: e.target.value })}
                    placeholder="+91..."
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '0.875rem',
                      color: '#263448',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem', color: '#263448' }}>
                    Preferred Language
                  </label>
                  <select
                    value={profileData.preferred_language || 'en'}
                    onChange={e => setProfileData({ ...profileData, preferred_language: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '0.875rem',
                      color: '#263448',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem', color: '#263448' }}>
                    Timezone
                  </label>
                  <select
                    value={profileData.timezone || 'Asia/Kolkata'}
                    onChange={e => setProfileData({ ...profileData, timezone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '0.875rem',
                      color: '#263448',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── 2. SECURITY TAB ───────────────────────────────────────────── */}
        {activeTab === 'security' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#172D4F' }}>
              Account Security & Password
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '420px' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem', color: '#263448' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={securityData.password}
                  onChange={e => setSecurityData({ ...securityData, password: e.target.value })}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem', color: '#263448' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={securityData.confirmPassword}
                  onChange={e => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
                {securityData.password && securityData.password !== securityData.confirmPassword && (
                  <span style={{ fontSize: '0.85rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem' }}>
                    <AlertTriangle size={14} /> Passwords do not match
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── 3. BRAND & IDENTITY TAB ──────────────────────────────────── */}
        {activeTab === 'brand' && userProfile?.role === 'Admin' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#172D4F' }}>
              Brand & Identity Configuration
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem', color: '#263448' }}>
                    Application / CRM Name
                  </label>
                  <input
                    type="text"
                    value={brandData.crm_name || ''}
                    onChange={e => setBrandData({ ...brandData, crm_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem', color: '#263448' }}>
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={brandData.company_name || ''}
                    onChange={e => setBrandData({ ...brandData, company_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem', color: '#263448' }}>
                  Application Logo URL
                </label>
                <input
                  type="text"
                  value={brandData.app_logo_url || ''}
                  onChange={e => setBrandData({ ...brandData, app_logo_url: e.target.value })}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.875rem',
                    marginBottom: '0.75rem',
                    boxSizing: 'border-box'
                  }}
                />
                {brandData.app_logo_url && (
                  <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px', display: 'inline-block', border: '1px solid #E2E8F0' }}>
                    <img src={brandData.app_logo_url} alt="Logo Preview" style={{ height: '36px', objectFit: 'contain' }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── 4. APPEARANCE TAB ────────────────────────────────────────── */}
        {activeTab === 'appearance' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#172D4F' }}>
              Interface Appearance
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '700px' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem', color: '#263448' }}>
                  Theme Mode
                </label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'light', label: 'Light' },
                    { id: 'dark', label: 'Dark' },
                    { id: 'system', label: 'System Default' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setAppearanceData({ ...appearanceData, theme_mode: mode.id })}
                      style={{
                        padding: '0.75rem 1.25rem',
                        borderRadius: '8px',
                        border: appearanceData.theme_mode === mode.id ? '2px solid #078B54' : '1px solid #E2E8F0',
                        backgroundColor: appearanceData.theme_mode === mode.id ? '#E8F5E9' : '#FFFFFF',
                        color: appearanceData.theme_mode === mode.id ? '#078B54' : '#263448',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem', color: '#263448' }}>
                  Card & Content Density
                </label>
                <select
                  value={appearanceData.card_density || 'comfortable'}
                  onChange={e => setAppearanceData({ ...appearanceData, card_density: e.target.value })}
                  style={{
                    maxWidth: '300px',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.875rem',
                    color: '#263448',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ─── 5. WORKSPACE PERSONALIZATION TAB ─────────────────────────── */}
        {activeTab === 'personalization' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#172D4F' }}>
              Workspace Personalization
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '700px' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem', color: '#263448' }}>
                  Custom Wallpaper URL (Optional)
                </label>
                <input
                  type="text"
                  value={personalizationData.wallpaper_url || ''}
                  onChange={e => setPersonalizationData({ ...personalizationData, wallpaper_url: e.target.value })}
                  placeholder="https://... (.jpg, .png)"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
                {personalizationData.wallpaper_url && (
                  <div
                    style={{
                      width: '100%',
                      height: '160px',
                      borderRadius: '8px',
                      marginTop: '0.75rem',
                      backgroundImage: `url(${personalizationData.wallpaper_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: '1px solid #E2E8F0'
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── 6. NOTIFICATIONS TAB ─────────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#172D4F' }}>
              Notification Rules & Preferences
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
              {Object.keys(notificationsData).map(key => (
                <label
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={notificationsData[key]}
                    onChange={e => setNotificationsData({ ...notificationsData, [key]: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#078B54' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#263448', textTransform: 'capitalize' }}>
                    {key.replace('_', ' ')} Notifications
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ─── 8. NOTIFICATION HISTORY TAB ──────────────────────────────── */}
        {activeTab === 'notification_history' && userProfile?.role === 'Admin' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.25rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #E2E8F0'
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#172D4F' }}>
                  Notification History
                </h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748B' }}>
                  View log of all internal alerts dispatched to field staff.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  value={historyFilter}
                  onChange={e => setHistoryFilter(e.target.value)}
                  style={{ height: '36px', padding: '0 0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Read">Read</option>
                  <option value="Unread">Unread</option>
                </select>
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  style={{ height: '36px', padding: '0 0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.85rem', width: '220px' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={fetchNotificationHistory}
                  style={{ height: '36px', padding: '0 0.85rem', fontSize: '0.85rem' }}
                >
                  Refresh
                </button>
              </div>
            </div>

            <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Date & Time</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Recipient</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Message</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData
                    .filter(n => historyFilter === 'All' ? true : historyFilter === 'Read' ? n.is_read : !n.is_read)
                    .filter(n => {
                      if (!historySearch.trim()) return true;
                      const q = historySearch.toLowerCase();
                      const u = team.find(m => m.id === n.user_id);
                      const dName = u ? u.display_name : 'Unknown User';
                      return (
                        (n.title && n.title.toLowerCase().includes(q)) ||
                        (n.message && n.message.toLowerCase().includes(q)) ||
                        dName.toLowerCase().includes(q)
                      );
                    })
                    .map((notif, idx) => {
                      const u = team.find(m => m.id === notif.user_id);
                      const dName = u ? u.display_name : 'Unknown User';
                      return (
                        <tr key={notif.id || idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 600, color: '#172D4F' }}>{new Date(notif.created_at).toLocaleDateString()}</div>
                            <div style={{ color: '#64748B', fontSize: '0.75rem' }}>{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: 600, color: '#172D4F' }}>{dName}</div>
                            <div style={{ color: '#64748B', fontSize: '0.75rem' }}>{notif.notification_type}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: 600, color: '#172D4F' }}>{notif.title}</div>
                            <div style={{ color: '#64748B' }}>{notif.message}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: notif.is_read ? '#ECFDF5' : '#FEF3C7',
                                color: notif.is_read ? '#059669' : '#D97706'
                              }}
                            >
                              {notif.is_read ? 'Read' : 'Unread'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  {historyData.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
                        No notifications found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── 9. TERRITORIES TAB ───────────────────────────────────────── */}
        {activeTab === 'territories' && userProfile?.role === 'Admin' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <TerritoriesTab />
          </div>
        )}

        {/* ─── FALLBACK: WHATSAPP TEMPLATES ─────────────────────────────── */}
        {activeTab === 'templates' && userProfile?.role === 'Admin' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#172D4F' }}>WhatsApp Templates</h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748B' }}>Manage reusable message templates with variable substitution.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTemplateModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  backgroundColor: '#078B54',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <MessageCircle size={16} /> Add Template
              </button>
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Template Name</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Purpose</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {whatsappTemplates.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#172D4F' }}>{t.name}</div>
                        <div style={{ color: '#64748B', fontSize: '0.8rem', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.body}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#263448' }}>{t.purpose}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <button
                          type="button"
                          onClick={() => toggleTemplateStatus(t.id, t.is_active)}
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: t.is_active ? '#ECFDF5' : '#FEF2F2',
                            color: t.is_active ? '#059669' : '#DC2626',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          {t.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {whatsappTemplates.length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>No templates created.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── FALLBACK: DEALER SCHEMES ─────────────────────────────────── */}
        {activeTab === 'dealer_schemes' && userProfile?.role === 'Admin' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <DealerSchemes />
          </div>
        )}

        {/* ─── FALLBACK: CRM DEFAULTS ───────────────────────────────────── */}
        {activeTab === 'defaults' && userProfile?.role === 'Admin' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#172D4F' }}>CRM Defaults</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem', color: '#263448' }}>
                  Default Follow-up Reminder (Minutes before Due Time)
                </label>
                <input
                  type="number"
                  value={defaultsData.default_reminder_minutes || 15}
                  onChange={e => setDefaultsData({ ...defaultsData, default_reminder_minutes: parseInt(e.target.value) })}
                  style={{ width: '180px', padding: '0.65rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem', color: '#263448' }}>
                    Work Hours Start
                  </label>
                  <input
                    type="time"
                    value={defaultsData.work_hours_start || '09:00:00'}
                    onChange={e => setDefaultsData({ ...defaultsData, work_hours_start: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem', color: '#263448' }}>
                    Work Hours End
                  </label>
                  <input
                    type="time"
                    value={defaultsData.work_hours_end || '18:00:00'}
                    onChange={e => setDefaultsData({ ...defaultsData, work_hours_end: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ─── STICKY ACTION BAR FOR UNSAVED CHANGES ─────────────────────── */}
      {isDirty && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            padding: '1rem 2rem',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 100,
            boxShadow: '0 -4px 12px rgba(0,0,0,0.06)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              maxWidth: '1200px',
              width: '100%',
              justifyContent: 'flex-end'
            }}
          >
            <span
              style={{
                marginRight: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600,
                fontSize: '0.9rem',
                color: '#D97706'
              }}
            >
              <AlertTriangle size={18} /> You have unsaved changes
            </span>
            <button
              type="button"
              onClick={resetForm}
              disabled={loading}
              style={{
                padding: '0.6rem 1.15rem',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#263448',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.35rem',
                borderRadius: '8px',
                border: '1px solid #078B54',
                backgroundColor: '#078B54',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(7, 139, 84, 0.25)'
              }}
            >
              <Save size={16} />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL: CHANGE PASSWORD ────────────────────────────────────── */}
      {showChangePasswordModal && passwordTarget && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '420px',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              position: 'relative'
            }}
          >
            <button
              type="button"
              onClick={() => setShowChangePasswordModal(false)}
              style={{
                position: 'absolute',
                right: '1.25rem',
                top: '1.25rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#172D4F' }}>
              Change Password
            </h2>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748B' }}>
              Set a new password for <strong>{passwordTarget.display_name}</strong>.
            </p>

            <form onSubmit={handleAdminChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: '#263448' }}>
                  New Password *
                </label>
                <input
                  type="password"
                  value={adminChangePasswordData.newPassword}
                  onChange={e => setAdminChangePasswordData({ ...adminChangePasswordData, newPassword: e.target.value })}
                  required
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: '#263448' }}>
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={adminChangePasswordData.confirmPassword}
                  onChange={e => setAdminChangePasswordData({ ...adminChangePasswordData, confirmPassword: e.target.value })}
                  required
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#263448', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px solid #078B54', backgroundColor: '#078B54', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
                >
                  {loading ? 'Saving...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD TEAM MEMBER ────────────────────────────────────── */}
      {showAddUserModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '520px',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              position: 'relative'
            }}
          >
            <button
              type="button"
              onClick={() => setShowAddUserModal(false)}
              style={{
                position: 'absolute',
                right: '1.25rem',
                top: '1.25rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#172D4F' }}>
              Add Team Member
            </h2>

            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: '#263448' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newUserData.display_name}
                  onChange={e => setNewUserData({ ...newUserData, display_name: e.target.value })}
                  required
                  placeholder="e.g. Rahul Sharma"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: '#263448' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={e => setNewUserData({ ...newUserData, email: e.target.value })}
                  required
                  placeholder="rahul@shubhlabh.com"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: '#263448' }}>
                  Temporary Password *
                </label>
                <input
                  type="password"
                  value={newUserData.password}
                  onChange={e => setNewUserData({ ...newUserData, password: e.target.value })}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: '#263448' }}>
                    Role
                  </label>
                  <select
                    value={newUserData.role}
                    onChange={e => {
                      const nextRole = e.target.value;
                      setNewUserData({ ...newUserData, role: nextRole });
                      if (nextRole === 'Customer' && partiesList.length === 0) {
                        fetchParties();
                      }
                    }}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                  >
                    <option value="Operator">Operator</option>
                    <option value="Staff">Staff</option>
                    <option value="Sales">Sales</option>
                    <option value="Production">Production</option>
                    <option value="Operations">Operations</option>
                    <option value="Admin">Admin</option>
                    <option value="Customer">Customer (Order App)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: '#263448' }}>
                    WhatsApp Mobile
                  </label>
                  <input
                    type="text"
                    value={newUserData.whatsapp}
                    onChange={e => setNewUserData({ ...newUserData, whatsapp: e.target.value })}
                    placeholder="+91..."
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Customer Party Picker (only visible when Customer role is selected) */}
              {newUserData.role === 'Customer' && (
                <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#166534' }}>
                      Linked Customer (Party) *
                    </label>
                    {loadingParties && (
                      <span style={{ fontSize: '0.75rem', color: '#166534' }}>Loading parties...</span>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Search customer by name or code..."
                    value={partySearchTerm}
                    onChange={(e) => setPartySearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      border: '1px solid #86EFAC',
                      fontSize: '0.8rem',
                      boxSizing: 'border-box',
                      backgroundColor: '#FFFFFF',
                      marginBottom: '0.5rem'
                    }}
                  />

                  <select
                    value={selectedPartyId}
                    onChange={(e) => {
                      const pId = e.target.value;
                      setSelectedPartyId(pId);
                      const found = partiesList.find(p => p.id === pId);
                      if (found) {
                        const rawMobile = found.mobile || found.whatsapp || '';
                        const cleanMobile = rawMobile.replace(/\D/g, '').slice(-10);
                        setNewUserData(prev => ({
                          ...prev,
                          display_name: found.display_name || found.legal_or_core_name || prev.display_name,
                          whatsapp: cleanMobile || prev.whatsapp,
                          email: cleanMobile ? `${cleanMobile}@shubhlabh.app` : prev.email
                        }));
                      }
                    }}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '6px',
                      border: '1px solid #86EFAC',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                      fontSize: '0.85rem',
                      color: '#166534',
                      fontWeight: 500
                    }}
                  >
                    <option value="">-- Choose Customer from Master ({partiesList.length} available) --</option>
                    {partiesList
                      .filter(p => {
                        if (!partySearchTerm.trim()) return true;
                        const term = partySearchTerm.toLowerCase();
                        return (
                          (p.display_name || '').toLowerCase().includes(term) ||
                          (p.legal_or_core_name || '').toLowerCase().includes(term) ||
                          (p.customer_code || '').toLowerCase().includes(term) ||
                          (p.mobile || '').includes(term)
                        );
                      })
                      .map(party => (
                        <option key={party.id} value={party.id}>
                          {party.display_name || party.legal_or_core_name} {party.customer_code ? `(${party.customer_code})` : ''} {party.mobile ? `• ${party.mobile}` : ''}
                        </option>
                      ))}
                  </select>
                  <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#166534' }}>
                    This customer account will be linked to the Shubh Labh Order App. The customer can sign in using their mobile number and temporary password.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#263448', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ padding: '0.65rem 1.5rem', borderRadius: '8px', border: '1px solid #078B54', backgroundColor: '#078B54', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
                >
                  {loading ? 'Creating...' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: SEND NOTIFICATION ──────────────────────────────────── */}
      {showNotificationModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '520px',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              position: 'relative'
            }}
          >
            <button
              type="button"
              onClick={() => setShowNotificationModal(false)}
              style={{
                position: 'absolute',
                right: '1.25rem',
                top: '1.25rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#172D4F' }}>
              Send In-App Notification
            </h2>

            <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: '#263448' }}>
                  Recipients
                </label>
                <select
                  multiple
                  style={{ width: '100%', minHeight: '110px', padding: '0.5rem', borderRadius: '8px', border: '1px solid #E2E8F0', boxSizing: 'border-box' }}
                  value={notificationData.recipients}
                  onChange={e => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setNotificationData({ ...notificationData, recipients: selected });
                  }}
                >
                  <option value="ALL_ACTIVE">All Active Staff</option>
                  <optgroup label="Individual Members">
                    {team.filter(m => m.is_active && m.role !== 'Admin').map(m => (
                      <option key={m.id} value={m.id}>{m.display_name} ({m.email})</option>
                    ))}
                  </optgroup>
                </select>
                <small style={{ color: '#64748B', display: 'block', marginTop: '0.35rem' }}>Hold Ctrl/Cmd to multi-select staff.</small>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: '#263448' }}>
                  Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Price Revision Notice"
                  value={notificationData.title}
                  onChange={e => setNotificationData({ ...notificationData, title: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: '#263448' }}>
                  Message *
                </label>
                <textarea
                  rows="3"
                  placeholder="Enter notification message..."
                  value={notificationData.message}
                  onChange={e => setNotificationData({ ...notificationData, message: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowNotificationModal(false)}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#263448', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px solid #078B54', backgroundColor: '#078B54', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
                >
                  Send Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD TEMPLATE ───────────────────────────────────────── */}
      {showAddTemplateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '520px',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              position: 'relative'
            }}
          >
            <button
              type="button"
              onClick={() => setShowAddTemplateModal(false)}
              style={{
                position: 'absolute',
                right: '1.25rem',
                top: '1.25rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#172D4F' }}>
              Add WhatsApp Template
            </h2>

            <form onSubmit={handleAddTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: '#263448' }}>
                  Template Name *
                </label>
                <input
                  type="text"
                  value={newTemplateData.name}
                  onChange={e => setNewTemplateData({ ...newTemplateData, name: e.target.value })}
                  required
                  placeholder="e.g. Payment Reminder"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: '#263448' }}>
                  Purpose *
                </label>
                <select
                  value={newTemplateData.purpose}
                  onChange={e => setNewTemplateData({ ...newTemplateData, purpose: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                >
                  <option value="">-- Select Purpose --</option>
                  <option value="General Check-in">General Check-in</option>
                  <option value="Payment Reminder">Payment Reminder</option>
                  <option value="Requirement Check">Requirement Check</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: '#263448' }}>
                  Message Body *
                </label>
                <textarea
                  rows="4"
                  value={newTemplateData.body}
                  onChange={e => setNewTemplateData({ ...newTemplateData, body: e.target.value })}
                  required
                  placeholder="Hello {{customer_name}}, this is a reminder..."
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddTemplateModal(false)}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#263448', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px solid #078B54', backgroundColor: '#078B54', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
                >
                  {loading ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
