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
  isDailyItem,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const badgeCount = badges[item.badgeSource] || 0;
  const badgeType =
    item.badgeSource === 'payments' || item.badgeSource === 'dispatches'
      ? 'red'
      : item.badgeSource === 'notifications'
      ? 'blue'
      : item.badgeSource === 'website_leads'
      ? 'green'
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
  const dailyIconWrapStyle = isDailyItem && item.iconColor
    ? {
        backgroundColor: `${item.iconColor}20`,
        color: item.iconColor,
      }
    : undefined;
  const iconStyle = isDailyItem && item.iconColor
    ? { color: item.iconColor }
    : undefined;

  const innerContent = (
    <>
      <div className="nav-item-content">
        {isDailyItem ? (
          <span className="nav-daily-icon-wrap" style={dailyIconWrapStyle} aria-hidden="true">
            <item.icon size={17} className="nav-icon nav-daily-icon" style={iconStyle} aria-hidden="true" />
          </span>
        ) : (
          <item.icon size={18} className="nav-icon" aria-hidden="true" />
        )}
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
    isDailyItem ? 'nav-daily-item' : '',
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
          isDailyItem ? 'nav-daily-item' : '',
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
  const isExpanded = expandedSubGroups[item.subGroupId] || false;
  const location = useLocation();

  // Auto-expand if a child is active
  useEffect(() => {
    if (item.children?.some(child => child.href && location.pathname.startsWith(child.href))) {
      onToggleSubGroup(item.subGroupId, true);
    }
  }, [location.pathname]);

  if (item.permissionKey === 'admin' && userRole !== 'Admin') return null;

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
  const userRole = userProfile?.role || 'Staff';
  const isAdmin = userRole === 'Admin';

  // ── Collapsed state (always expand inside mobile drawer) ──
  const [collapsed, setCollapsed] = useState(
    () => safeGet(COLLAPSED_STORAGE_KEY, false)
  );
  const isCollapsed = collapsed && !isOpen;

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

    const isDailyWork = Boolean(section.isDailyWork);
    const isCollapsible = section.collapsible !== false;
    const isExpanded = isCollapsible ? expandedSections[section.id] !== false : true;

    return (
      <div
        key={section.id}
        className={[
          'nav-section',
          isDailyWork ? 'nav-daily-work-section' : '',
          isDailyWork && isCollapsed ? 'nav-daily-work-collapsed' : '',
        ].filter(Boolean).join(' ')}
      >
        {section.dividerBefore && <div className="nav-divider" role="separator" />}

        {isDailyWork ? (
          <div
            className={`nav-daily-work-header ${isCollapsed ? 'collapsed-mode' : ''}`}
            title={isCollapsed ? section.title : undefined}
          >
            {!isCollapsed ? (
              <span className="nav-daily-work-title">{section.title.toUpperCase()}</span>
            ) : (
              <span className="nav-daily-work-dot" aria-hidden="true" />
            )}
          </div>
        ) : (
          <button
            className={`nav-section-header ${isCollapsed ? 'collapsed-mode' : ''}`}
            onClick={() => toggleSection(section.id)}
            aria-expanded={isExpanded}
            title={isCollapsed ? section.title : undefined}
          >
            {!isCollapsed && (
              <>
                <span className="nav-section-title">{section.title.toUpperCase()}</span>
                {isExpanded
                  ? <ChevronDown size={14} aria-hidden="true" className="nav-section-chevron" />
                  : <ChevronRight size={14} aria-hidden="true" className="nav-section-chevron" />
                }
              </>
            )}
            {isCollapsed && (
              <span className="nav-section-dot" aria-hidden="true" />
            )}
          </button>
        )}

        {isExpanded && (
          <div
            className={isDailyWork ? 'nav-daily-work-items' : 'nav-section-items'}
            role="group"
            aria-label={section.title}
          >
            {visibleItems.map(item => {
              if (item.isFavoritesAnchor) {
                if (isCollapsed) return null;
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
                    collapsed={isCollapsed}
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
                  collapsed={isCollapsed}
                  isPinned={pinnedIds.includes(item.id)}
                  onTogglePin={item.pinEligible ? togglePin : null}
                  badges={badges}
                  onNotifClick={onNotifClick}
                  onMobileClose={onClose}
                  isDailyItem={isDailyWork}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const dailyWorkSections = NAV_SECTIONS.filter(section => section.isDailyWork);
  const otherModuleSections = NAV_SECTIONS.filter(section => !section.isDailyWork);

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
          isCollapsed ? 'sidebar-collapsed' : '',
          isOpen ? 'sidebar-mobile-open' : '',
        ].filter(Boolean).join(' ')}
        aria-label="Main navigation"
      >
        {/* Brand header */}
        <div className="sidebar-header">
          {!isCollapsed && (
            <div className="sidebar-brand">
              {crmSettings?.app_logo_url ? (
                <img
                  src={crmSettings.app_logo_url}
                  alt={crmSettings?.crm_name || 'Shubh Labh CRM'}
                  className="sidebar-logo"
                />
              ) : (
                <div className="sidebar-logo-placeholder" aria-hidden="true">
                  {/* Inline SL brand mark — lightning bolt in SL green */}
                  <svg width="18" height="18" viewBox="0 0 48 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#ffffff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
                  </svg>
                </div>
              )}
              <div className="sidebar-brand-text">
                <span className="sidebar-brand-name">
                  {crmSettings?.crm_name || 'Shubh Labh CRM'}
                </span>
                <span className="sidebar-brand-subtitle">Business Management</span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="sidebar-brand sidebar-brand-collapsed">
              {crmSettings?.app_logo_url ? (
                <img src={crmSettings.app_logo_url} alt={crmSettings?.crm_name || 'Shubh Labh CRM'} className="sidebar-logo" />
              ) : (
                <div className="sidebar-logo-placeholder" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 48 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#ffffff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
                  </svg>
                </div>
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
          {dailyWorkSections.map(renderSection)}

          {otherModuleSections.length > 0 && (
            !isCollapsed ? (
              <div className="nav-other-modules-heading" role="heading" aria-level={2}>
                <span>OTHER MODULES</span>
              </div>
            ) : (
              <div className="nav-divider" role="separator" />
            )
          )}

          {otherModuleSections.map(renderSection)}
        </nav>

        {/* Collapse toggle (desktop) */}
        <div className="sidebar-footer">
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed
              ? <PanelLeftOpen size={18} />
              : <PanelLeftClose size={18} />
            }
            {!isCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
