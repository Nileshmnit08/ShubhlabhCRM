import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NAV_SECTIONS, getAllNavItems, SECTION_IDS } from '../navConfig.js';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const EXPECTED_DAILY_LINKS = [
  { id: 'requirements', label: 'Requirements', href: '/requirements', permissionKey: 'all' },
  { id: 'customers', label: 'Customers', href: '/customers', permissionKey: 'all' },
  { id: 'labour-hisaab', label: 'Labour Hisaab', href: '/labour-hisaab', permissionKey: 'admin' },
  { id: 'attendance', label: 'Attendance', href: '/attendance', permissionKey: 'admin' },
  { id: 'communication', label: 'Customer Communication', href: '/communication', permissionKey: 'admin' },
  { id: 'leads', label: 'Website Leads', href: '/leads', permissionKey: 'admin' },
];

const isRouteActive = (item, pathname) => (
  item.href
    ? item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`)
    : false
);

test('DAILY WORK section is first, non-collapsible, and lists all six priority links in order', () => {
  assert.equal(NAV_SECTIONS[0].id, SECTION_IDS.DAILY_WORK);
  assert.equal(NAV_SECTIONS[0].title, 'Daily Work');
  assert.equal(NAV_SECTIONS[0].isDailyWork, true);
  assert.equal(NAV_SECTIONS[0].collapsible, false);

  const items = NAV_SECTIONS[0].items;
  assert.equal(items.length, 6);

  EXPECTED_DAILY_LINKS.forEach((expected, index) => {
    const actual = items[index];
    assert.equal(actual.id, expected.id);
    assert.equal(actual.label, expected.label);
    assert.equal(actual.href, expected.href);
    assert.equal(actual.permissionKey, expected.permissionKey);
    assert.ok(actual.icon, `${expected.label} has a Lucide icon`);
    assert.match(actual.iconColor, /^#[0-9A-Fa-f]{6}$/, `${expected.label} has a soft hex icon color`);
  });

  // Soft icon colors and icons are distinct across the 6 shortcuts
  const uniqueColors = new Set(items.map((item) => item.iconColor.toLowerCase()));
  const uniqueIcons = new Set(items.map((item) => item.icon));
  assert.equal(uniqueColors.size, 6, 'all 6 icons have distinct colors');
  assert.equal(uniqueIcons.size, 6, 'all 6 items use distinct icons');
});

test('no duplicate navigation links exist across sections', () => {
  const allItems = getAllNavItems();
  const ids = allItems.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length, 'every nav item ID is unique');

  const otherSections = NAV_SECTIONS.filter((s) => s.id !== SECTION_IDS.DAILY_WORK);
  const otherItems = otherSections.flatMap((s) =>
    s.items.flatMap((item) => (item.isSubGroup && item.children ? item.children : [item]))
  );

  for (const expected of EXPECTED_DAILY_LINKS) {
    assert.equal(
      otherItems.some((item) => item.id === expected.id || item.label === expected.label),
      false,
      `${expected.label} is not duplicated in OTHER MODULES`,
    );
  }
});

test('role-based access and App.jsx route guards remain intact for all six links', () => {
  const dailyItems = NAV_SECTIONS[0].items;
  const visibleForStaff = dailyItems.filter((item) => item.permissionKey === 'all');
  const visibleForAdmin = dailyItems.filter((item) => item.permissionKey === 'all' || item.permissionKey === 'admin');

  assert.deepEqual(visibleForStaff.map((i) => i.id), ['requirements', 'customers']);
  assert.equal(visibleForAdmin.length, 6);

  const app = read('../../App.jsx');
  const adminStart = app.indexOf('<Route element={<AdminRoute />}>');
  assert.ok(adminStart > 0);

  for (const route of ['requirements', 'customers']) {
    const idx = app.indexOf(`<Route path="${route}">`);
    assert.ok(idx > 0 && idx < adminStart, `${route} remains accessible to all authenticated users`);
  }

  for (const route of ['labour-hisaab', 'attendance', 'communication', 'leads']) {
    const idx = app.indexOf(`<Route path="${route}"`);
    assert.ok(idx > adminStart, `${route} remains inside AdminRoute`);
  }
});

test('active route highlighting matches exact and nested paths without cross-matching', () => {
  const dailyItems = NAV_SECTIONS[0].items;

  const cases = [
    ['/requirements', 'requirements'],
    ['/requirements/new', 'requirements'],
    ['/customers', 'customers'],
    ['/customers/123', 'customers'],
    ['/labour-hisaab', 'labour-hisaab'],
    ['/labour-hisaab/approvals', 'labour-hisaab'],
    ['/attendance', 'attendance'],
    ['/communication', 'communication'],
    ['/leads', 'leads'],
  ];

  for (const [pathname, expectedId] of cases) {
    const activeIds = dailyItems.filter((item) => isRouteActive(item, pathname)).map((i) => i.id);
    assert.deepEqual(activeIds, [expectedId], `${pathname} highlights only ${expectedId}`);
  }
});

test('Sidebar component and CSS enforce Navy/Amber design, OTHER MODULES heading, and mobile responsiveness', () => {
  const sidebar = read('../../components/Sidebar.jsx');
  const css = read('../../index.css');

  // Structure & headings
  assert.match(sidebar, /nav-daily-work-section/);
  assert.match(sidebar, /OTHER MODULES/);
  assert.match(sidebar, /const isCollapsed = collapsed && !isOpen;/, 'mobile drawer always expands full labels');
  assert.match(sidebar, /const isExpanded = isCollapsible \? expandedSections\[section\.id\] !== false : true;/);

  // Required palette tokens & states in CSS
  assert.match(css, /--sidebar-bg:\s*#172B4D;/i);
  assert.match(css, /--sidebar-daily-bg:\s*#29466D;/i);
  assert.match(css, /--sidebar-heading-amber:\s*#FBBF24;/i);
  assert.match(css, /\.nav-daily-item\s*\{[\s\S]*border-left:\s*3px solid transparent;/);
  assert.match(css, /\.nav-daily-item\.active[\s\S]*border-left:\s*3px solid var\(--sidebar-heading-amber\);/);
  assert.match(css, /\.nav-daily-item:hover/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.nav-daily-item/);
});

