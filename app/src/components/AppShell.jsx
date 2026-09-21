/**
 * AppShell — main layout shell.
 *
 * Wires together the new Sidebar, topbar, and Outlet.
 * All navigation logic has moved to Sidebar.jsx + lib/navConfig.js.
 * Badge data is fetched in useNavBadges.js.
 *
 * CRM-NAV-02: Sidebar redesign applied.
 */

import React, { useContext, useState, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Globe, LogOut, Bell } from 'lucide-react';
import { AuthContext } from '../AuthContext';
import { LanguageContext } from '../LanguageContext';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import useNavBadges from '../lib/useNavBadges';

export default function AppShell() {
  const { userProfile, crmSettings } = useContext(AuthContext);
  const { language, setLanguage } = useContext(LanguageContext);

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Notification panel — NotificationBell controls its own dropdown
  // We expose a trigger ref so Sidebar "Notifications" item can open it
  const notifBellRef = useRef(null);

  // Real badge data
  const { badges } = useNavBadges();

  const handleLogout = async () => {
    await logActivity({
      module: 'Auth',
      actionType: 'LOGOUT',
      summary: 'User logged out.',
    });
    await supabase.auth.signOut();
  };

  const handleNotifClick = () => {
    // Trigger the NotificationBell dropdown programmatically
    notifBellRef.current?.openDropdown?.();
  };

  return (
    <div className="app-container">
      {/* ── Sidebar ── */}
      <Sidebar
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        badges={badges}
        onNotifClick={handleNotifClick}
        crmSettings={crmSettings}
      />

      {/* ── Main content ── */}
      <main className="main-content">
        <header className="topbar">
          {/* Mobile hamburger — shown on mobile via CSS */}
          <button
            className="btn-icon topbar-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu size={22} />
          </button>

          <div className="topbar-right">
            {/* Notification Bell */}
            <NotificationBell ref={notifBellRef} />

            {/* Language toggle */}
            <button
              className="btn-icon topbar-lang-btn"
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              title="Toggle Language (English/Hindi)"
              aria-label={`Current language: ${language === 'en' ? 'English' : 'Hindi'}. Click to switch.`}
            >
              <Globe size={18} />
              <span className="topbar-lang-label">{language.toUpperCase()}</span>
            </button>

            {/* Avatar / role */}
            <div
              className="topbar-avatar"
              title={userProfile?.full_name || userProfile?.role}
              aria-label={`Logged in as ${userProfile?.role}`}
            >
              {userProfile?.role === 'Admin' ? 'AD' : 'OP'}
            </div>

            {/* Logout */}
            <button
              className="btn-icon topbar-logout-btn"
              onClick={handleLogout}
              title="Log Out"
              aria-label="Log Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
