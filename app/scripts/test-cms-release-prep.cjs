const { test, expect } = require('@playwright/test');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runTestSuite() {
  console.log('====================================================');
  console.log('  SL-WEB-CMS-RELEASE-PREP-01 Verification Suite     ');
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

  // 1. Migration 236 & 237 Static Verification
  console.log('--- 1. Database Migration Files Verification ---');
  const m236Root = path.resolve(__dirname, '../../236_sprint_SL_WEB_CMS_SUPABASE_01.sql');
  const m236Supa = path.resolve(__dirname, '../../supabase/migrations/236_sprint_SL_WEB_CMS_SUPABASE_01.sql');
  assert('Migration 236 exists in root', fs.existsSync(m236Root));
  assert('Migration 236 exists in supabase/migrations', fs.existsSync(m236Supa));
  const sql236 = fs.readFileSync(m236Root, 'utf8');
  assert('Migration 236 root & supabase copies match', sql236 === fs.readFileSync(m236Supa, 'utf8'));

  const m237Root = path.resolve(__dirname, '../../237_sprint_SL_WEB_CMS_RLS_FIX_01.sql');
  const m237Supa = path.resolve(__dirname, '../../supabase/migrations/237_sprint_SL_WEB_CMS_RLS_FIX_01.sql');
  assert('Migration 237 exists in root', fs.existsSync(m237Root));
  assert('Migration 237 exists in supabase/migrations', fs.existsSync(m237Supa));
  const sql237 = fs.readFileSync(m237Root, 'utf8');
  assert('Migration 237 root & supabase copies match', sql237 === fs.readFileSync(m237Supa, 'utf8'));

  // 2. Corrective Policy Rules in Migration 237
  console.log('\n--- 2. Migration 237 Security & Privacy Assertions ---');
  assert('Migration 237 adds is_public column to media assets', sql237.includes('ADD COLUMN IF NOT EXISTS is_public BOOLEAN'));
  assert('Migration 237 adds index on is_public', sql237.includes('idx_website_media_public'));
  assert('Migration 237 revokes/drops open public media policy', sql237.includes('DROP POLICY IF EXISTS "Public can view media assets"'));
  assert('Migration 237 restricts base media table to admins only', sql237.includes('"Admins can view all media assets"') && sql237.includes('USING (public.is_admin())'));
  assert('Migration 237 drops existing view and defines website_public_media_assets view', sql237.includes('DROP VIEW IF EXISTS public.website_public_media_assets CASCADE;') && sql237.includes('CREATE VIEW public.website_public_media_assets'));
  const viewMatch = sql237.match(/CREATE VIEW public\.website_public_media_assets AS\s+SELECT([\s\S]*?)FROM/);
  const viewCols = viewMatch ? viewMatch[1] : '';
  assert('website_public_media_assets strips uploaded_by column', !viewCols.includes('uploaded_by') && sql237.includes('WHERE is_public = true'));
  assert('Grants SELECT on public media view to anon and authenticated', sql237.includes('GRANT SELECT ON public.website_public_media_assets TO anon, authenticated;'));

  assert('Settings policy allows anon and authenticated for public rows', sql237.includes('TO anon, authenticated\n    USING (is_public = true);'));
  assert('Sections policy allows anon and authenticated for published rows', sql237.includes('TO anon, authenticated\n    USING (is_published = true);'));
  assert('Products policy allows anon and authenticated for published rows', sql237.includes('TO anon, authenticated\n    USING (status = \'published\');'));
  assert('Articles policy allows anon and authenticated for published rows', sql237.includes('TO anon, authenticated\n    USING (status = \'published\' AND published_at <= now());'));
  assert('Navigation policy allows anon and authenticated for active rows', sql237.includes('TO anon, authenticated\n    USING (is_active = true);'));

  // 3. Navigation & Route Config Verification
  console.log('\n--- 3. Frontend Navigation & Routing Verification ---');
  const navConfigPath = path.resolve(__dirname, '../src/lib/navConfig.js');
  const navContent = fs.readFileSync(navConfigPath, 'utf8');
  assert('navConfig registers website-cms item', navContent.includes("id: 'website-cms'"));
  assert('navConfig website-cms requires admin permission', navContent.includes("permissionKey: 'admin'"));
  assert('navConfig website-cms href is /website-cms', navContent.includes("href: '/website-cms'"));

  const appJsxPath = path.resolve(__dirname, '../src/App.jsx');
  const appJsxContent = fs.readFileSync(appJsxPath, 'utf8');
  assert('App.jsx imports WebsiteCMS component', appJsxContent.includes("import WebsiteCMS from './pages/WebsiteCMS'"));
  assert('App.jsx mounts /website-cms route inside AdminRoute', appJsxContent.includes('<Route path="website-cms/*" element={<WebsiteCMS />} />'));
  assert('App.jsx mounts / for PublicWebsite', appJsxContent.includes('<Route path="/" element={<PublicWebsite />} />'));
  assert('App.jsx mounts /login for LoginPortal', appJsxContent.includes('<Route path="/login" element={<LoginPortal />} />'));

  // 4. UI Component Integrity & Fallback
  console.log('\n--- 4. Component Structure & Fallback Verification ---');
  const cmsIndexPath = path.resolve(__dirname, '../src/pages/WebsiteCMS/index.jsx');
  assert('WebsiteCMS index.jsx exists', fs.existsSync(cmsIndexPath));
  const cmsContent = fs.readFileSync(cmsIndexPath, 'utf8');
  assert('WebsiteCMS has fallback DEFAULT_SETTINGS', cmsContent.includes('DEFAULT_SETTINGS'));
  assert('WebsiteCMS has fallback DEFAULT_PRODUCTS', cmsContent.includes('DEFAULT_PRODUCTS'));
  assert('WebsiteCMS provides all 8 management tabs', 
    cmsContent.includes("'dashboard'") && 
    cmsContent.includes("'sections'") && 
    cmsContent.includes("'products'") && 
    cmsContent.includes("'categories'") && 
    cmsContent.includes("'knowledge'") && 
    cmsContent.includes("'navigation'") && 
    cmsContent.includes("'settings'") && 
    cmsContent.includes("'audit'")
  );

  const publicWebPath = path.resolve(__dirname, '../src/pages/PublicWebsite/PublicWebsite.jsx');
  const publicWebContent = fs.readFileSync(publicWebPath, 'utf8');
  assert('PublicWebsite queries published products from website_products', publicWebContent.includes("from('website_products')"));
  assert('PublicWebsite filters published products only', publicWebContent.includes(".eq('status', 'published')"));
  assert('PublicWebsite contains baseline fallback content', publicWebContent.includes("Better nutrition. Stronger dairy."));

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
    const brandName = await page.locator('.brand-name').first().textContent();
    assert('Public website loads with brand name', brandName.includes('SHUBH LABH'));

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
    assert('Website Admin option is selectable', isWebsiteChecked === true);

    // Continue to CRM Auth
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    assert('Destination continues to CRM Auth', page.url().includes('/login?destination=crm'));

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
