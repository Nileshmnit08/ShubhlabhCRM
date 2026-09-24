/**
 * CRM-NAV-02: Canonical Navigation Configuration
 *
 * SINGLE SOURCE OF TRUTH for all sidebar navigation.
 * The Sidebar component and Favorites system both render from this config.
 *
 * Do NOT define navigation routes anywhere else.
 *
 * permissionKey:
 *   'all'   → visible to all authenticated users
 *   'admin' → visible only to users with role === 'Admin'
 *
 * badgeSource:
 *   null          → no badge
 *   'followups'   → overdue + due today follow-ups
 *   'requirements'→ open/pending requirements
 *   'dispatches'  → pending dispatches
 *   'payments'    → overdue collections
 *   'issues'      → open urgent customer issues
 *   'notifications'→ unread notifications count
 *
 * pinEligible:
 *   true  → user may add this to Favorites (max 7)
 *   false → not pin-able (e.g. admin-only items that non-admins can't see)
 */

import {
  LayoutDashboard,
  Clock,
  Bell,
  Star,
  Users,
  AlertTriangle,
  Headphones,
  MessageSquare,
  Target,
  Rocket,
  TrendingUp,
  RefreshCw,
  ClipboardList,
  BarChart2,
  Activity,
  Layers,
  Map,
  ShieldOff,
  Truck,
  DollarSign,
  Footprints,
  Package,
  Receipt,
  MessageCircle,
  Award,
  Gauge,
  BookOpen,
  Database,
  ShieldCheck,
  Zap,
  Settings,
  LineChart,
  FileText,
  PieChart,
  Send,
  Wrench,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Section IDs  (used as localStorage keys)
// ─────────────────────────────────────────────────────────────
export const SECTION_IDS = {
  WORKSPACE: 'workspace',
  CUSTOMER_MANAGEMENT: 'customer-management',
  CUSTOMER_GROWTH: 'customer-growth',
  SALES_DEMAND: 'sales-demand',
  OPERATIONS: 'operations',
  TEAM_CONTROL: 'team-control',
  REPORTS_MARKET: 'reports-market',
  ADMINISTRATION: 'administration',
};

// ─────────────────────────────────────────────────────────────
// NAV CONFIG
// ─────────────────────────────────────────────────────────────
export const NAV_SECTIONS = [
  // ══════════════════════════════════════
  // 1. WORKSPACE
  // ══════════════════════════════════════
  {
    id: SECTION_IDS.WORKSPACE,
    title: 'Workspace',
    collapsible: true,
    dividerBefore: false,
    items: [
      {
        id: 'today',
        label: 'Today',
        href: '/',
        icon: LayoutDashboard,
        badgeSource: null,
        permissionKey: 'all',
        pinEligible: true,
        exact: true,
      },
      {
        id: 'follow-ups',
        label: 'Follow-ups',
        href: '/follow-ups',
        icon: Clock,
        badgeSource: 'followups',
        permissionKey: 'all',
        pinEligible: true,
      },
      {
        id: 'notifications',
        label: 'Notifications',
        href: null,              // no route — triggers notification panel
        icon: Bell,
        badgeSource: 'notifications',
        permissionKey: 'all',
        pinEligible: false,
        isNotificationTrigger: true,
      },
      {
        id: 'favorites',
        label: 'Favorites',
        href: null,              // rendered separately as the pinned section
        icon: Star,
        badgeSource: null,
        permissionKey: 'all',
        pinEligible: false,
        isFavoritesAnchor: true, // Sidebar renders pinned section here
      },
    ],
  },

  // ══════════════════════════════════════
  // 2. CUSTOMER MANAGEMENT
  // ══════════════════════════════════════
  {
    id: SECTION_IDS.CUSTOMER_MANAGEMENT,
    title: 'Customer Management',
    collapsible: true,
    dividerBefore: false,
    items: [
      {
        id: 'customers',
        label: 'Customers',
        href: '/customers',
        icon: Users,
        badgeSource: null,
        permissionKey: 'all',
        pinEligible: true,
      },
      {
        id: 'dormant',
        label: 'Dormant Accounts',
        href: '/dormant',
        icon: AlertTriangle,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
      {
        id: 'customer-service',
        label: 'Customer Service & Issues',
        // BLOCKED: No dedicated /issues route.
        // Links to /customers — issues are managed within the customer view.
        href: '/customers',
        icon: Headphones,
        badgeSource: 'issues',
        permissionKey: 'all',
        pinEligible: false,
        tooltip: 'Customer issues are managed within the Customers view',
        blocked: true,
        blockedReason: 'No dedicated /issues route — links to /customers',
      },
      {
        id: 'communication',
        label: 'Customer Communication',
        href: '/communication',
        icon: MessageSquare,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
    ],
  },

  // ══════════════════════════════════════
  // 3. CUSTOMER GROWTH
  // ══════════════════════════════════════
  {
    id: SECTION_IDS.CUSTOMER_GROWTH,
    title: 'Customer Growth',
    collapsible: true,
    dividerBefore: false,
    items: [
      {
        id: 'leads',
        label: 'Leads',
        href: '/leads',
        icon: Target,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
      {
        id: 'opportunities',
        label: 'Opportunities',
        href: '/opportunities',
        icon: Rocket,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
      {
        id: 'dealer-control',
        label: 'Dealer Growth Hub',
        href: '/dealer-control',
        icon: TrendingUp,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
      {
        id: 'reactivation',
        label: 'Reactivation',
        href: '/reactivation',
        icon: RefreshCw,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
    ],
  },

  // ══════════════════════════════════════
  // 4. SALES & DEMAND
  // ══════════════════════════════════════
  {
    id: SECTION_IDS.SALES_DEMAND,
    title: 'Sales & Demand',
    collapsible: true,
    dividerBefore: false,
    items: [
      // Core Sales
      {
        id: 'requirements',
        label: 'Requirements',
        href: '/requirements',
        icon: ClipboardList,
        badgeSource: 'requirements',
        permissionKey: 'all',
        pinEligible: true,
      },
      // NOTE: Quotations are managed inside /requirements.
      // No /quotations route exists. Omitted per spec.

      // Demand Intelligence sub-group
      {
        id: 'demand-intelligence',
        label: 'Demand Intelligence',
        href: null,               // group header — not a route
        icon: BarChart2,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: false,
        isSubGroup: true,
        subGroupId: 'demand-intelligence',
        children: [
          {
            id: 'demand-control-tower',
            label: 'Demand Control Tower',
            href: '/demand-control-tower',
            icon: Gauge,
            badgeSource: null,
            permissionKey: 'admin',
            pinEligible: true,
          },
          {
            id: 'demand-signals',
            label: 'Demand Signals',
            href: '/demand-signals',
            icon: Activity,
            badgeSource: null,
            permissionKey: 'admin',
            pinEligible: true,
          },
          {
            id: 'product-demand',
            label: 'Product Demand',
            href: '/product-demand',
            icon: Layers,
            badgeSource: null,
            permissionKey: 'admin',
            pinEligible: true,
          },
          {
            id: 'territory-demand',
            label: 'Territory Demand',
            href: '/territory-demand',
            icon: Map,
            badgeSource: null,
            permissionKey: 'admin',
            pinEligible: true,
          },
          {
            id: 'coverage',
            label: 'Coverage Gaps',
            href: '/coverage',
            icon: ShieldOff,
            badgeSource: null,
            permissionKey: 'admin',
            pinEligible: true,
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════
  // 5. OPERATIONS
  // ══════════════════════════════════════
  {
    id: SECTION_IDS.OPERATIONS,
    title: 'Operations',
    collapsible: true,
    dividerBefore: false,
    items: [
      {
        id: 'dispatches',
        label: 'Dispatch Dashboard',
        href: '/dispatches',
        icon: Truck,
        badgeSource: 'dispatches',
        permissionKey: 'all',
        pinEligible: true,
      },
      {
        id: 'payments',
        label: 'Payments & Collections',
        href: '/payments',
        icon: DollarSign,
        badgeSource: 'payments',
        permissionKey: 'all',
        pinEligible: true,
      },
      {
        id: 'activity',
        label: 'Field Activity',
        href: '/activity',
        icon: Footprints,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
      {
        id: 'logistics',
        label: 'Logistics',
        href: '/logistics',
        icon: Package,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
      {
        id: 'travel-expenses',
        label: 'Travel Expenses',
        href: '/travel-expenses',
        icon: Receipt,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
      {
        id: 'field-mobility',
        label: 'Mobility & Expenses',
        href: '/field-mobility',
        icon: Map,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
    ],
  },

  // ══════════════════════════════════════
  // 6. TEAM & CONTROL
  // ══════════════════════════════════════
  {
    id: SECTION_IDS.TEAM_CONTROL,
    title: 'Team & Control',
    collapsible: true,
    dividerBefore: false,
    items: [
      {
        id: 'staff-messages',
        label: 'Staff Messages',
        href: '/staff-messages',
        icon: MessageCircle,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
      {
        id: 'performance',
        label: 'My Performance',
        href: '/performance',
        icon: Award,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
      {
        id: 'control-room',
        label: 'Operations Control Room',
        href: '/control-room',
        icon: Gauge,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
      {
        id: 'account-control',
        label: 'Account Review & Control',
        href: '/account-control',
        icon: BookOpen,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
    ],
  },

  // ══════════════════════════════════════
  // 7. REPORTS & MARKET
  // ══════════════════════════════════════
  {
    id: SECTION_IDS.REPORTS_MARKET,
    title: 'Reports & Market',
    collapsible: true,
    dividerBefore: false,
    items: [
      // Raw Material Pricing sub-group
      {
        id: 'raw-material-pricing',
        label: 'Raw Material Pricing',
        href: null,
        icon: LineChart,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: false,
        isSubGroup: true,
        subGroupId: 'raw-material-pricing',
        children: [
          {
            id: 'raw-material-prices',
            label: 'Price Dashboard',
            href: '/raw-material-prices',
            icon: PieChart,
            badgeSource: null,
            permissionKey: 'admin',
            pinEligible: true,
          },
          {
            id: 'raw-material-prices-daily-entry',
            label: 'Daily Price Entry',
            href: '/raw-material-prices/daily-entry',
            icon: FileText,
            badgeSource: null,
            permissionKey: 'admin',
            pinEligible: true,
          },
          {
            id: 'raw-material-prices-history',
            label: 'Price History',
            href: '/raw-material-prices/history',
            icon: Activity,
            badgeSource: null,
            permissionKey: 'admin',
            pinEligible: true,
          },
          {
            id: 'raw-material-prices-analysis',
            label: 'Price Analysis',
            href: '/raw-material-prices/analysis',
            icon: BarChart2,
            badgeSource: null,
            permissionKey: 'admin',
            pinEligible: true,
          },
          {
            id: 'raw-material-prices-whatsapp',
            label: 'WhatsApp Price Update',
            href: '/raw-material-prices/whatsapp',
            icon: Send,
            badgeSource: null,
            permissionKey: 'admin',
            pinEligible: true,
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════
  // 8. ADMINISTRATION  (divider before)
  // ══════════════════════════════════════
  {
    id: SECTION_IDS.ADMINISTRATION,
    title: 'Administration',
    collapsible: true,
    dividerBefore: true,   // thin divider rendered before this section
    items: [
      {
        id: 'data',
        label: 'Data & Sync',
        href: '/data',
        icon: Database,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
      {
        id: 'data-quality',
        label: 'Data Quality',
        href: '/data/quality',
        icon: ShieldCheck,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
      {
        id: 'automation-control',
        label: 'Automation Control',
        href: '/automation-control',
        icon: Zap,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
      {
        id: 'raw-material-prices-configuration',
        label: 'Raw Material Price Config',
        href: '/raw-material-prices/configuration',
        icon: Wrench,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
      {
        id: 'settings',
        label: 'Settings',
        href: '/settings',
        icon: Settings,
        badgeSource: null,
        permissionKey: 'admin',
        pinEligible: true,
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// Flatten all leaf items (for Favorites lookup)
// ─────────────────────────────────────────────────────────────
export function getAllNavItems() {
  const items = [];
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.isSubGroup && item.children) {
        for (const child of item.children) {
          items.push({ ...child, sectionId: section.id });
        }
      } else if (!item.isFavoritesAnchor) {
        items.push({ ...item, sectionId: section.id });
      }
    }
  }
  return items;
}

// ─────────────────────────────────────────────────────────────
// Find a nav item by id (for Favorites rendering)
// ─────────────────────────────────────────────────────────────
export function getNavItemById(id) {
  return getAllNavItems().find((item) => item.id === id) || null;
}

// ─────────────────────────────────────────────────────────────
// Default pinned items (by nav item ID)
// ─────────────────────────────────────────────────────────────
export const DEFAULT_PINNED_IDS = [
  'today',
  'follow-ups',
  'customers',
  'requirements',
  'dispatches',
  'payments',
];

export const MAX_PINNED = 7;
export const PINNED_STORAGE_KEY = 'shublabh_pinned_nav_v2';
export const SECTIONS_STORAGE_KEY = 'shublabh_nav_sections_v2';
export const COLLAPSED_STORAGE_KEY = 'shublabh_nav_collapsed_v2';
