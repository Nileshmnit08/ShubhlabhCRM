/**
 * CRM-NAV-02: Sidebar
 *
 * Professional B2B CRM sidebar.
 * Renders entirely from the canonical NAV_SECTIONS config.
 * Supports: collapsed icon mode, mobile drawer, collapsible sections,
 * sub-groups, favorites (max 7), real badges, tooltips, ARIA.
 *
 * Props:
 *   isOpen         boolean  — mobile drawer open state
 *   onClose        fn       — close mobile drawer
 *   badges         object   — from useNavBadges
 *   onNotifClick   fn       — opens notification panel (topbar bell)
 *   crmSettings    object   — from AuthContext (logo, name)
 */

import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Pin,
  PinOff,
  Star,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { AuthContext } from '../AuthContext';
import {
  NAV_SECTIONS,
  getAllNavItems,
  getNavItemById,
  DEFAULT_PINNED_IDS,
  MAX_PINNED,
  PINNED_STORAGE_KEY,
  SECTIONS_STORAGE_KEY,
  COLLAPSED_STORAGE_KEY,
} from '../lib/navConfig';

// ─── Helpers ─────────────────────────────────────────────────

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silent
  }
}

// Build default sections expanded state
function defaultSectionsState() {
  const state = {};
  for (const s of NAV_SECTIONS) {
    state[s.id] = true; // all expanded by default
  }
  return state;
}

// Build default sub-groups expanded state
function defaultSubGroupsState() {
  const state = {};
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.isSubGroup) {
        state[item.subGroupId] = false; // collapsed by default
      }
    }
  }
  return state;
}

// ─── Badge component ─────────────────────────────────────────
function NavBadge({ count, type }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className={`nav-badge nav-badge-${type}`}
      aria-label={`${count} items`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

// ─── Single nav item ─────────────────────────────────────────
function NavItem({
  item,
  collapsed,
  isPinned,
  onTogglePin,
  badges,
  onNotifClick,
  onMobileClose,
  isChild,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const badgeCount = badges[item.badgeSource] || 0;
  const badgeType =
    item.badgeSource === 'payments' || item.badgeSource === 'dispatches'
      ? 'red'
      : item.badgeSource === 'notifications'
      ? 'blue'
      : 'amber';

  // Active detection — exact for '/', startsWith otherwise
  const isActive = item.href
    ? item.exact
      ? location.pathname === item.href
      : location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    : false;

  const handleClick = (e) => {
    if (item.isNotificationTrigger) {
      e.preventDefault();
      onNotifClick?.();
      onMobileClose?.();
      return;
    }
    onMobileClose?.();
  };

  const tooltipLabel = collapsed ? item.label : null;

  const innerContent = (
    <>
      <div className="nav-item-content">
        <item.icon size={18} className="nav-icon" aria-hidden="true" />
        {!collapsed && (
          <span className="nav-label">{item.label}</span>
        )}
        {!collapsed && badgeCount > 0 && (
          <NavBadge count={badgeCount} type={badgeType} />
        )}
      </div>
      {collapsed && badgeCount > 0 && (
        <span className="nav-badge-dot" aria-hidden="true" />
      )}
      {!collapsed && !item.isNotificationTrigger && item.href && onTogglePin && (
        <button
          className={`pin-btn ${isPinned ? 'is-pinned' : ''}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(item.id); }}
          title={isPinned ? 'Remove from Favorites' : 'Add to Favorites'}
          aria-label={isPinned ? `Remove ${item.label} from Favorites` : `Add ${item.label} to Favorites`}
        >
          {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
      )}
    </>
  );

  const className = [
    'nav-item',
    isActive ? 'active' : '',
    isChild ? 'nav-item-child' : '',
    collapsed ? 'nav-item-collapsed' : '',
  ].filter(Boolean).join(' ');

  if (item.isNotificationTrigger) {
    return (
      <button
        className={className}
        onClick={handleClick}
        title={tooltipLabel || item.tooltip || item.label}
        aria-label={item.label}
        role="menuitem"
      >
        {innerContent}
      </button>
    );
  }

  return (
    <NavLink
      to={item.href}
      end={item.exact}
      className={({ isActive: routerActive }) =>
        [
          'nav-item',
          routerActive ? 'active' : '',
          isChild ? 'nav-item-child' : '',
          collapsed ? 'nav-item-collapsed' : '',
        ].filter(Boolean).join(' ')
      }
      onClick={handleClick}
      title={tooltipLabel || item.tooltip || undefined}
      aria-current={isActive ? 'page' : undefined}
      role="menuitem"
    >
      {innerContent}
    </NavLink>
  );
}

// ─── Sub-group (Demand Intelligence, Raw Material Pricing) ───
function SubGroup({
  item,
  collapsed,
  badges,
  onNotifClick,
  onMobileClose,
  expandedSubGroups,
  onToggleSubGroup,
  pinnedIds,
  onTogglePin,
  userRole,
}) {
  if (item.permissionKey === 'admin' && userRole !== 'Admin') return null;

  const isExpanded = expandedSubGroups[item.subGroupId] || false;
  const location = useLocation();

  // Auto-expand if a child is active
  useEffect(() => {
    if (item.children?.some(child => child.href && location.pathname.startsWith(child.href))) {
      onToggleSubGroup(item.subGroupId, true);
    }
  }, [location.pathname]);

  const visibleChildren = (item.children || []).filter(
    child => child.permissionKey !== 'admin' || userRole === 'Admin'
  );

  if (visibleChildren.length === 0) return null;

  return (
    <div className="nav-subgroup">
      <button
        className={`nav-subgroup-header ${collapsed ? 'collapsed-mode' : ''}`}
        onClick={() => onToggleSubGroup(item.subGroupId, !isExpanded)}
        aria-expanded={isExpanded}
        title={collapsed ? item.label : undefined}
      >
        {!collapsed ? (
          <>
            <div className="nav-item-content">
              <item.icon size={16} className="nav-icon nav-icon-subgroup" aria-hidden="true" />
              <span className="nav-subgroup-label">{item.label}</span>
            </div>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </>
        ) : (
          <item.icon size={18} className="nav-icon" aria-hidden="true" />
        )}
      </button>

      {isExpanded && !collapsed && (
        <div className="nav-subgroup-items" role="group">
          {visibleChildren.map(child => (
            <NavItem
              key={child.id}
              item={child}
              collapsed={false}
              isPinned={pinnedIds.includes(child.id)}
              onTogglePin={onTogglePin}
              badges={badges}
              onNotifClick={onNotifClick}
              onMobileClose={onMobileClose}
              isChild
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Favorites section ────────────────────────────────────────
function FavoritesSection({ pinnedIds, collapsed, badges, onNotifClick, onMobileClose, userRole }) {
  const allItems = getAllNavItems();
  const pinnedItems = pinnedIds
    .map(id => allItems.find(i => i.id === id))
    .filter(Boolean)
    .filter(item => item.permissionKey !== 'admin' || userRole === 'Admin')
    .filter(item => item.href); // only routable items

  if (pinnedItems.length === 0) {
    return collapsed ? null : (
      <div className="nav-empty-state">
        <Star size={14} />
        <span>Pin items to Favorites</span>
      </div>
    );
  }

  return (
    <>
      {pinnedItems.map(item => (
        <NavItem
          key={item.id}
          item={item}
          collapsed={collapsed}
          isPinned={false}
          onTogglePin={null}
          badges={badges}
          onNotifClick={onNotifClick}
          onMobileClose={onMobileClose}
        />
      ))}
    </>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────
export default function Sidebar({
  isOpen,
  onClose,
  badges = {},
  onNotifClick,
  crmSettings,
}) {
  const { userProfile } = useContext(AuthContext);
  const location = useLocation();
  const userRole = userProfile?.role || 'Operator';
  const isAdmin = userRole === 'Admin';

  // ── Collapsed state ──
  const [collapsed, setCollapsed] = useState(
    () => safeGet(COLLAPSED_STORAGE_KEY, false)
  );

  // ── Section expand state ──
  const [expandedSections, setExpandedSections] = useState(
    () => ({ ...defaultSectionsState(), ...safeGet(SECTIONS_STORAGE_KEY, {}) })
  );

  // ── Sub-group expand state ──
  const [expandedSubGroups, setExpandedSubGroups] = useState(
    () => defaultSubGroupsState()
  );

  // ── Pinned / Favorites ──
  const [pinnedIds, setPinnedIds] = useState(() => {
    // Migrate from old key if needed
    const legacy = safeGet('shublabh_pinned_nav', null);
    const current = safeGet(PINNED_STORAGE_KEY, null);
    if (current) return current;
    // Legacy key stored paths like '/requirements'; can't migrate to IDs automatically
    return DEFAULT_PINNED_IDS;
  });

  // Persist collapsed
  useEffect(() => {
    safeSet(COLLAPSED_STORAGE_KEY, collapsed);
  }, [collapsed]);

  // Persist expanded sections
  useEffect(() => {
    safeSet(SECTIONS_STORAGE_KEY, expandedSections);
  }, [expandedSections]);

  // Persist pinned ids
  useEffect(() => {
    safeSet(PINNED_STORAGE_KEY, pinnedIds);
  }, [pinnedIds]);

  // Auto-expand section when active route changes
  useEffect(() => {
    const allItems = getAllNavItems();
    for (const section of NAV_SECTIONS) {
      const sectionItems = [];
      for (const item of section.items) {
        if (item.isSubGroup && item.children) {
          sectionItems.push(...item.children);
        } else {
          sectionItems.push(item);
        }
      }
      const hasActiveItem = sectionItems.some(
        item => item.href && (
          item.exact
            ? location.pathname === item.href
            : location.pathname === item.href || location.pathname.startsWith(item.href + '/')
        )
      );
      if (hasActiveItem) {
        setExpandedSections(prev =>
          prev[section.id] ? prev : { ...prev, [section.id]: true }
        );
      }
    }
  }, [location.pathname]);

  const toggleSection = useCallback((id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleSubGroup = useCallback((id, forceValue) => {
    setExpandedSubGroups(prev => ({
      ...prev,
      [id]: forceValue !== undefined ? forceValue : !prev[id],
    }));
  }, []);

  const togglePin = useCallback((itemId) => {
    setPinnedIds(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      }
      if (prev.length >= MAX_PINNED) {
        // Do not exceed max — silently reject
        return prev;
      }
      return [...prev, itemId];
    });
  }, []);

  // ── Filter items by permission ──
  const canSee = (item) => {
    if (item.permissionKey === 'all') return true;
    if (item.permissionKey === 'admin') return isAdmin;
    return false;
  };

  // ── Render section ──
  const renderSection = (section) => {
    const visibleItems = section.items.filter(item => {
      if (item.isFavoritesAnchor) return true; // always render favorites anchor
      if (item.isNotificationTrigger) return true; // always render
      return canSee(item);
    });

    if (visibleItems.length === 0) return null;

    const isExpanded = expandedSections[section.id] !== false;

    return (
      <div key={section.id} className="nav-section">
        {section.dividerBefore && <div className="nav-divider" role="separator" />}

        <button
          className={`nav-section-header ${collapsed ? 'collapsed-mode' : ''}`}
          onClick={() => toggleSection(section.id)}
          aria-expanded={isExpanded}
          title={collapsed ? section.title : undefined}
        >
          {!collapsed && (
            <>
              <span className="nav-section-title">{section.title.toUpperCase()}</span>
              {isExpanded
                ? <ChevronDown size={14} aria-hidden="true" />
                : <ChevronRight size={14} aria-hidden="true" />
              }
            </>
          )}
          {collapsed && (
            <span className="nav-section-dot" aria-hidden="true" />
          )}
        </button>

        {isExpanded && (
          <div className="nav-section-items" role="group" aria-label={section.title}>
            {visibleItems.map(item => {
              if (item.isFavoritesAnchor) {
                if (collapsed) return null;
                return (
                  <div key="favorites" className="nav-favorites-section">
                    <div className="nav-favorites-header">
                      <Star size={12} aria-hidden="true" />
                      <span>Favorites</span>
                      <span className="nav-favorites-hint">(max {MAX_PINNED})</span>
                    </div>
                    <FavoritesSection
                      pinnedIds={pinnedIds}
                      collapsed={false}
                      badges={badges}
                      onNotifClick={onNotifClick}
                      onMobileClose={onClose}
                      userRole={userRole}
                    />
                  </div>
                );
              }

              if (item.isSubGroup) {
                return (
                  <SubGroup
                    key={item.id}
                    item={item}
                    collapsed={collapsed}
                    badges={badges}
                    onNotifClick={onNotifClick}
                    onMobileClose={onClose}
                    expandedSubGroups={expandedSubGroups}
                    onToggleSubGroup={toggleSubGroup}
                    pinnedIds={pinnedIds}
                    onTogglePin={togglePin}
                    userRole={userRole}
                  />
                );
              }

              if (!canSee(item) && !item.isNotificationTrigger) return null;

              return (
                <NavItem
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  isPinned={pinnedIds.includes(item.id)}
                  onTogglePin={item.pinEligible ? togglePin : null}
                  badges={badges}
                  onNotifClick={onNotifClick}
                  onMobileClose={onClose}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'sidebar',
          collapsed ? 'sidebar-collapsed' : '',
          isOpen ? 'sidebar-mobile-open' : '',
        ].filter(Boolean).join(' ')}
        aria-label="Main navigation"
      >
        {/* Brand header */}
        <div className="sidebar-header">
          {!collapsed && (
            <div className="sidebar-brand">
              {crmSettings?.app_logo_url ? (
                <img
                  src={crmSettings.app_logo_url}
                  alt="Logo"
                  className="sidebar-logo"
                />
              ) : (
                <div className="sidebar-logo-placeholder" aria-hidden="true" />
              )}
              <span className="sidebar-brand-name">
                {crmSettings?.crm_name || 'Feed CRM'}
              </span>
            </div>
          )}
          {collapsed && (
            <div className="sidebar-brand sidebar-brand-collapsed">
              {crmSettings?.app_logo_url ? (
                <img src={crmSettings.app_logo_url} alt="Logo" className="sidebar-logo" />
              ) : (
                <div className="sidebar-logo-placeholder" aria-hidden="true" />
              )}
            </div>
          )}

          {/* Mobile close button */}
          <button
            className="sidebar-mobile-close btn-icon"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav" role="navigation" aria-label="CRM Navigation">
          {NAV_SECTIONS.map(renderSection)}
        </nav>

        {/* Collapse toggle (desktop) */}
        <div className="sidebar-footer">
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <PanelLeftOpen size={18} />
              : <PanelLeftClose size={18} />
            }
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
