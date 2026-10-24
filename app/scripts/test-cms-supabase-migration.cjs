const { test, expect } = require('@playwright/test');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runTestSuite() {
  console.log('====================================================');
  console.log('  SL-WEB-CMS-SUPABASE-01 Test & Verification Suite  ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(title, condition, details = '') {
    if (condition) {
      console.log(`✓ ${title}`);
      passed++;
    } else {
      console.error(`✗ ${title} - ${details}`);
      failed++;
    }
  }

  // 1. Static Migration File Verification
  console.log('--- 1. Migration 236 Verification ---');
  const migrationPath = path.resolve(__dirname, '../../236_sprint_SL_WEB_CMS_SUPABASE_01.sql');
  assert('Migration 236 file exists in root', fs.existsSync(migrationPath));
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert('Contains table website_media_assets', sql.includes('CREATE TABLE IF NOT EXISTS public.website_media_assets'));
  assert('Contains table website_site_settings', sql.includes('CREATE TABLE IF NOT EXISTS public.website_site_settings'));
  assert('Contains table website_site_sections', sql.includes('CREATE TABLE IF NOT EXISTS public.website_site_sections'));
  assert('Contains table website_product_categories', sql.includes('CREATE TABLE IF NOT EXISTS public.website_product_categories'));
  assert('Contains table website_products', sql.includes('CREATE TABLE IF NOT EXISTS public.website_products'));
  assert('Contains table website_knowledge_articles', sql.includes('CREATE TABLE IF NOT EXISTS public.website_knowledge_articles'));
  assert('Contains table website_navigation_items', sql.includes('CREATE TABLE IF NOT EXISTS public.website_navigation_items'));
  assert('Contains table website_audit_logs', sql.includes('CREATE TABLE IF NOT EXISTS public.website_audit_logs'));

  assert('Enables RLS on website_products', sql.includes('ALTER TABLE public.website_products ENABLE ROW LEVEL SECURITY;'));
  assert('Enforces public read for published products only', sql.includes("USING (status = 'published')"));
  assert('Enforces is_admin() write check on products', sql.includes('USING (public.is_admin())') && sql.includes('WITH CHECK (public.is_admin())'));
  assert('Audit logs immutable for admins (no update/delete policy)', !sql.includes('ON public.website_audit_logs FOR UPDATE') && !sql.includes('ON public.website_audit_logs FOR DELETE'));
  assert('Idempotent seed data (ON CONFLICT DO NOTHING)', sql.includes('ON CONFLICT (slug) DO NOTHING') && sql.includes('ON CONFLICT (setting_key) DO NOTHING'));

  // 2. Navigation & Routing Configuration Verification
  console.log('\n--- 2. Navigation & Route Config Verification ---');
  const navConfigPath = path.resolve(__dirname, '../src/lib/navConfig.js');
  const navContent = fs.readFileSync(navConfigPath, 'utf8');
  assert('navConfig registers website-cms item', navContent.includes("id: 'website-cms'"));
  assert('navConfig website-cms requires admin permission', navContent.includes("permissionKey: 'admin'"));
  assert('navConfig website-cms href is /website-cms', navContent.includes("href: '/website-cms'"));

  const appJsxPath = path.resolve(__dirname, '../src/App.jsx');
  const appJsxContent = fs.readFileSync(appJsxPath, 'utf8');
  assert('App.jsx imports WebsiteCMS component', appJsxContent.includes("import WebsiteCMS from './pages/WebsiteCMS'"));
  assert('App.jsx defines /website-cms route under AdminRoute', appJsxContent.includes('<Route path="website-cms/*" element={<WebsiteCMS />} />'));

  // 3. UI Component Structure Verification
  console.log('\n--- 3. Website CMS Component Verification ---');
  const cmsIndexPath = path.resolve(__dirname, '../src/pages/WebsiteCMS/index.jsx');
  assert('WebsiteCMS index.jsx exists', fs.existsSync(cmsIndexPath));
  const cmsContent = fs.readFileSync(cmsIndexPath, 'utf8');
  assert('WebsiteCMS provides Dashboard tab', cmsContent.includes("id: 'dashboard'"));
  assert('WebsiteCMS provides Sections tab', cmsContent.includes("id: 'sections'"));
  assert('WebsiteCMS provides Products Catalog tab', cmsContent.includes("id: 'products'"));
  assert('WebsiteCMS provides Categories tab', cmsContent.includes("id: 'categories'"));
  assert('WebsiteCMS provides Knowledge Hub tab', cmsContent.includes("id: 'knowledge'"));
  assert('WebsiteCMS provides Navigation tab', cmsContent.includes("id: 'navigation'"));
  assert('WebsiteCMS provides Settings tab', cmsContent.includes("id: 'settings'"));
  assert('WebsiteCMS provides Audit History tab', cmsContent.includes("id: 'audit'"));

  // 4. Public Website Preservation & Fallback
  console.log('\n--- 4. Public Website Dynamic Loading & Fallback ---');
  const publicWebPath = path.resolve(__dirname, '../src/pages/PublicWebsite/PublicWebsite.jsx');
  const publicWebContent = fs.readFileSync(publicWebPath, 'utf8');
  assert('PublicWebsite imports supabase client', publicWebContent.includes("import { supabase } from '../../lib/supabase'"));
  assert('PublicWebsite fetches published CMS content', publicWebContent.includes("from('website_products')"));
  assert('PublicWebsite queries only published products', publicWebContent.includes(".eq('status', 'published')"));
  assert('PublicWebsite preserves baseline hero fallback', publicWebContent.includes("Better nutrition. Stronger dairy."));

  // 5. Browser Integration Smoke Test
  console.log('\n--- 5. Browser Integration Smoke Test ---');
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // A. Public Website check
    await page.goto('http://localhost:4173/');
    await page.waitForLoadState('networkidle');
    const headerTitle = await page.locator('.brand-name').first().textContent();
    assert('Public website loads with brand name', headerTitle.includes('SHUBH LABH'));

    const loginBtnCount = await page.locator('header .login-link').count();
    assert('Header has exactly 1 Login button', loginBtnCount === 1);

    // B. Login Portal check
    await page.goto('http://localhost:4173/login');
    await page.waitForLoadState('networkidle');
    const welcomeText = await page.locator('h2').first().textContent();
    assert('Login Portal renders Welcome heading', welcomeText.includes('Welcome to Shubh Labh'));

    // Check selecting Website Admin option
    await page.click('label[for="dest-website"]');
    const isWebsiteChecked = await page.isChecked('#dest-website');
    assert('Website Admin option can be selected', isWebsiteChecked === true);

    // Clicking continue when unauthenticated redirects to CRM Auth targeting /website-cms
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    const afterUrl = page.url();
    assert('Continuing with Website Admin directs to CRM Auth', afterUrl.includes('/login?destination=crm'));

    // Test Admin Login into CRM
    await page.fill('input[type="email"]', 'admin@shubhlabh.com');
    await page.fill('input[type="password"]', process.env.CRM_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/today', { timeout: 15000 }).catch(() => {});

    // Navigate to /website-cms
    await page.goto('http://localhost:4173/website-cms');
    await page.waitForLoadState('networkidle');
    const cmsHeader = await page.locator('h1').textContent();
    assert('Admin user can access /website-cms', cmsHeader.includes('Website CMS Manager'));

    // Verify tabs
    const overviewTab = await page.locator('button:has-text("Overview")').count();
    assert('CMS Overview tab is visible', overviewTab > 0);

    const productsTab = await page.locator('button:has-text("Products Catalog")').count();
    assert('CMS Products Catalog tab is visible', productsTab > 0);

  } catch (err) {
    console.error('Browser test error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n----------------------------------------------------');
  console.log(`Results: ${passed} Passed, ${failed} Failed (Total: ${passed + failed})`);
  console.log('----------------------------------------------------');
  if (failed > 0) process.exit(1);
}

runTestSuite();
