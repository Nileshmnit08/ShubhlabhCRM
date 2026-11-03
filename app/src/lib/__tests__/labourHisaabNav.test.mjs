import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NAV_SECTIONS, getAllNavItems, getNavItemById, SECTION_IDS } from '../navConfig.js';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('sidebar has exactly one Labour Hisaab item, admin-only, in Operations', () => {
  const matches = getAllNavItems().filter((i) => i.id === 'labour-hisaab' || i.href === '/labour-hisaab' || /labour/i.test(i.label));
  assert.equal(matches.length, 1, 'no duplicate entries');
  const item = getNavItemById('labour-hisaab');
  assert.equal(item.label, 'Labour Hisaab');
  assert.equal(item.href, '/labour-hisaab');
  assert.equal(item.permissionKey, 'admin');
  assert.equal(item.sectionId, SECTION_IDS.OPERATIONS);
  assert.ok(item.icon, 'has an icon');
  const ops = NAV_SECTIONS.find((s) => s.id === SECTION_IDS.OPERATIONS);
  assert.ok(ops.items.some((i) => i.id === 'labour-hisaab'));
});

test('route /labour-hisaab is registered inside the AdminRoute guard', () => {
  const app = read('../../App.jsx');
  assert.match(app, /const LabourHisaab = lazy\(\(\) => import\('\.\/pages\/LabourHisaab'\)\);/);
  const route = app.indexOf('<Route path="labour-hisaab" element={<LabourHisaab />} />');
  const adminOpen = app.indexOf('<Route element={<AdminRoute />}>');
  assert.ok(route > 0 && adminOpen > 0 && route > adminOpen, 'route after the AdminRoute opening');
  // The admin group closes after the new route: no closing tag of the AdminRoute group between them.
  let depth = 0;
  const between = app.slice(adminOpen + '<Route element={<AdminRoute />}>'.length, route);
  for (const m of between.matchAll(/<Route\b[^>]*?(\/?)>|<\/Route>/g)) {
    if (m[0] === '</Route>') depth -= 1;
    else if (m[1] !== '/') depth += 1;
    assert.ok(depth >= 0, 'AdminRoute group must still be open at the new route');
  }
  assert.equal(app.match(/path="labour-hisaab"/g).length, 1, 'registered once');
});

test('page shows the disconnected state and reads no data', () => {
  const page = read('../../pages/LabourHisaab.jsx');
  assert.match(page, /Labour Hisaab data is not connected yet\./);
  assert.match(page, /once the live data connection is available/);
  assert.ok(!/supabase|\.from\(|\.rpc\(|fetch\(/.test(page), 'no database or network access');
  assert.ok(!/initialData|INITIAL_|₹\s*\d/.test(page), 'no sample data or amounts');
});
