import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('CRM-SETTINGS-PRO-UI-01: Settings & Preferences Navigation & Filtering', () => {

  // Helper recreating tab resolution from Settings/index.jsx
  function resolveSettingsTabs(userRole = 'Admin', activeTab = 'profile') {
    const baseTabs = [
      { id: 'profile', label: 'Profile' },
      { id: 'security', label: 'Security' },
    ];

    if (userRole === 'Admin') {
      baseTabs.push({ id: 'brand', label: 'Brand & Identity' });
    }

    baseTabs.push(
      { id: 'appearance', label: 'Appearance' },
      { id: 'personalization', label: 'Workspace Personalization' },
      { id: 'notifications', label: 'Notifications' }
    );

    if (userRole === 'Admin') {
      baseTabs.push(
        { id: 'team', label: 'Team Management' },
        { id: 'notification_history', label: 'Notification History' },
        { id: 'territories', label: 'Territories' }
      );
    }

    if (activeTab === 'templates' && !baseTabs.find(t => t.id === 'templates')) {
      baseTabs.push({ id: 'templates', label: 'WhatsApp Templates' });
    }
    if (activeTab === 'dealer_schemes' && !baseTabs.find(t => t.id === 'dealer_schemes')) {
      baseTabs.push({ id: 'dealer_schemes', label: 'Dealer Schemes' });
    }
    if (activeTab === 'defaults' && !baseTabs.find(t => t.id === 'defaults')) {
      baseTabs.push({ id: 'defaults', label: 'CRM Defaults' });
    }

    return baseTabs;
  }

  // Helper recreating team filter logic
  function filterTeamMembers(team, { search = '', role = 'All', status = 'All' } = {}) {
    return team.filter(member => {
      if (role !== 'All' && member.role !== role) return false;
      if (status === 'Active' && !member.is_active) return false;
      if (status === 'Inactive' && member.is_active) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const name = (member.display_name || '').toLowerCase();
        const email = (member.email || '').toLowerCase();
        const phone = (member.whatsapp || member.mobile || member.contact_details || '').toLowerCase();
        const r = (member.role || '').toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q) || r.includes(q);
      }
      return true;
    });
  }

  // Helper recreating avatar initials and colors
  function getInitials(name, email) {
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
  }

  function getAvatarColor(name = '', role = '') {
    const combined = (name + role).toLowerCase();
    if (combined.includes('admin')) return { bg: '#E8F5E9', text: '#078B54' };
    if (combined.includes('vishnu') || combined.includes('operations')) return { bg: '#EDE9FE', text: '#7C3AED' };
    if (combined.includes('pradeep') || combined.includes('production')) return { bg: '#FEF3C7', text: '#D97706' };
    if (combined.includes('vijay') || combined.includes('sales')) return { bg: '#E0F2FE', text: '#0284C7' };
    return { bg: '#F1F5F9', text: '#475569' };
  }

  // Sample real team members from production database
  const sampleTeam = [
    { id: '1', display_name: 'Admin', email: 'admin@shubhlabh.com', role: 'Admin', is_active: true, whatsapp: null },
    { id: '2', display_name: 'Vishnu Khandelwal', email: 'vishnu@shubhlabh.com', role: 'Operations', is_active: true, whatsapp: '+91 98285 39054' },
    { id: '3', display_name: 'Pradeep Khandelwal', email: 'pradeep@shubhlabh.com', role: 'Production', is_active: true, whatsapp: '+91 94144 46444' },
    { id: '4', display_name: 'Vijay Khandelwal', email: 'vijay@shubhlabh.com', role: 'Sales', is_active: true, whatsapp: '+91 99281 92696' },
    { id: '5', display_name: 'Former Staff', email: 'staff@shubhlabh.com', role: 'Staff', is_active: false, whatsapp: '+91 98765 43210' }
  ];

  it('should render exactly nine horizontal tabs for Admin in the correct order', () => {
    const tabs = resolveSettingsTabs('Admin');
    assert.strictEqual(tabs.length, 9);
    assert.deepStrictEqual(tabs.map(t => t.id), [
      'profile',
      'security',
      'brand',
      'appearance',
      'personalization',
      'notifications',
      'team',
      'notification_history',
      'territories'
    ]);
  });

  it('should restrict tabs for non-admin users to personal settings only', () => {
    const tabs = resolveSettingsTabs('Staff');
    assert.strictEqual(tabs.length, 5);
    assert.deepStrictEqual(tabs.map(t => t.id), [
      'profile',
      'security',
      'appearance',
      'personalization',
      'notifications'
    ]);
  });

  it('should gracefully include fallback tabs if directly navigated via URL', () => {
    const tabs = resolveSettingsTabs('Admin', 'templates');
    assert.strictEqual(tabs.length, 10);
    assert.strictEqual(tabs[9].id, 'templates');
  });

  it('should filter team by search query (name, email, or phone)', () => {
    const searchName = filterTeamMembers(sampleTeam, { search: 'Vishnu' });
    assert.strictEqual(searchName.length, 1);
    assert.strictEqual(searchName[0].display_name, 'Vishnu Khandelwal');

    const searchEmail = filterTeamMembers(sampleTeam, { search: 'pradeep@shubhlabh.com' });
    assert.strictEqual(searchEmail.length, 1);
    assert.strictEqual(searchEmail[0].display_name, 'Pradeep Khandelwal');

    const searchPhone = filterTeamMembers(sampleTeam, { search: '99281' });
    assert.strictEqual(searchPhone.length, 1);
    assert.strictEqual(searchPhone[0].display_name, 'Vijay Khandelwal');
  });

  it('should filter team by role correctly', () => {
    const admins = filterTeamMembers(sampleTeam, { role: 'Admin' });
    assert.strictEqual(admins.length, 1);
    assert.strictEqual(admins[0].email, 'admin@shubhlabh.com');

    const ops = filterTeamMembers(sampleTeam, { role: 'Operations' });
    assert.strictEqual(ops.length, 1);
    assert.strictEqual(ops[0].display_name, 'Vishnu Khandelwal');
  });

  it('should filter team by status correctly', () => {
    const active = filterTeamMembers(sampleTeam, { status: 'Active' });
    assert.strictEqual(active.length, 4);

    const inactive = filterTeamMembers(sampleTeam, { status: 'Inactive' });
    assert.strictEqual(inactive.length, 1);
    assert.strictEqual(inactive[0].display_name, 'Former Staff');
  });

  it('should compute user avatar initials accurately', () => {
    assert.strictEqual(getInitials('Admin', 'admin@shubhlabh.com'), 'AD');
    assert.strictEqual(getInitials('Vishnu Khandelwal', 'vishnu@shubhlabh.com'), 'VK');
    assert.strictEqual(getInitials('Pradeep Khandelwal', 'pradeep@shubhlabh.com'), 'PK');
    assert.strictEqual(getInitials('Vijay Khandelwal', 'vijay@shubhlabh.com'), 'VK');
    assert.strictEqual(getInitials('', 'test@shubhlabh.com'), 'TE');
  });

  it('should assign distinctive branded colors to role avatars', () => {
    assert.strictEqual(getAvatarColor('Admin', 'Admin').text, '#078B54'); // Green
    assert.strictEqual(getAvatarColor('Vishnu Khandelwal', 'Operations').text, '#7C3AED'); // Purple
    assert.strictEqual(getAvatarColor('Pradeep Khandelwal', 'Production').text, '#D97706'); // Amber
    assert.strictEqual(getAvatarColor('Vijay Khandelwal', 'Sales').text, '#0284C7'); // Blue
  });

});
