/**
 * test_fa_app_icon_01.cjs
 * Test suite for Micro-Sprint FA-APP-ICON-01:
 * Shubh Labh SalesTeam Branding & Icon Verification
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING TEST SUITE: FA-APP-ICON-01 ===');

const PROJECT_ROOT = path.join(__dirname);
const stringsXmlPath = path.join(PROJECT_ROOT, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
const appJsonPath = path.join(PROJECT_ROOT, 'app.json');
const settingsGradlePath = path.join(PROJECT_ROOT, 'android', 'settings.gradle');
const appHeaderPath = path.join(PROJECT_ROOT, 'src', 'components', 'AppHeader.js');
const homeScreenPath = path.join(PROJECT_ROOT, 'src', 'screens', 'HomeScreen.js');
const loginScreenPath = path.join(PROJECT_ROOT, 'src', 'screens', 'LoginScreen.js');

// Test 1: Android launcher label in strings.xml
console.log('Test 1: Validating Android app_name in strings.xml...');
const stringsContent = fs.readFileSync(stringsXmlPath, 'utf8');
assert(
  stringsContent.includes('<string name="app_name">Shubh Labh SalesTeam</string>'),
  'strings.xml must configure app_name as "Shubh Labh SalesTeam"'
);
console.log('✓ Test 1: strings.xml app_name is "Shubh Labh SalesTeam"');

// Test 2: Expo app.json configuration
console.log('Test 2: Validating app.json configuration...');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
assert.strictEqual(appJson.expo.name, 'Shubh Labh SalesTeam', 'app.json expo.name must be "Shubh Labh SalesTeam"');
assert.strictEqual(appJson.expo.icon, './assets/icon.png', 'app.json must point to ./assets/icon.png');
console.log('✓ Test 2: app.json verified');

// Test 3: Gradle rootProject.name
console.log('Test 3: Validating settings.gradle rootProject.name...');
const settingsContent = fs.readFileSync(settingsGradlePath, 'utf8');
assert(
  settingsContent.includes("rootProject.name = 'Shubh Labh SalesTeam'"),
  'settings.gradle rootProject.name must be "Shubh Labh SalesTeam"'
);
console.log('✓ Test 3: settings.gradle verified');

// Test 4: Assets exist and have valid sizes
console.log('Test 4: Validating generated assets...');
const iconPath = path.join(PROJECT_ROOT, 'assets', 'icon.png');
const fgPath = path.join(PROJECT_ROOT, 'assets', 'android-icon-foreground.png');
const bgPath = path.join(PROJECT_ROOT, 'assets', 'android-icon-background.png');
assert(fs.existsSync(iconPath), 'assets/icon.png must exist');
assert(fs.existsSync(fgPath), 'assets/android-icon-foreground.png must exist');
assert(fs.existsSync(bgPath), 'assets/android-icon-background.png must exist');
assert(fs.statSync(iconPath).size > 10000, 'assets/icon.png must be non-empty');
console.log('✓ Test 4: Assets verified');

// Test 5: Native mipmap icons across all densities
console.log('Test 5: Validating native Android mipmap densities...');
const resDir = path.join(PROJECT_ROOT, 'android', 'app', 'src', 'main', 'res');
const densities = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];

for (const d of densities) {
  const dir = path.join(resDir, d);
  assert(fs.existsSync(dir), `Density dir ${d} must exist`);
  assert(fs.existsSync(path.join(dir, 'ic_launcher.png')), `ic_launcher.png must exist in ${d}`);
  assert(fs.existsSync(path.join(dir, 'ic_launcher_round.png')), `ic_launcher_round.png must exist in ${d}`);
  assert(fs.existsSync(path.join(dir, 'ic_launcher_foreground.png')), `ic_launcher_foreground.png must exist in ${d}`);
  assert(fs.existsSync(path.join(dir, 'ic_launcher_background.png')), `ic_launcher_background.png must exist in ${d}`);
  
  // Ensure no stale webp files exist that could cause duplicate resource conflicts
  const files = fs.readdirSync(dir);
  const webpFiles = files.filter(f => f.endsWith('.webp'));
  assert.strictEqual(webpFiles.length, 0, `No stale webp files should remain in ${d}`);
}
console.log('✓ Test 5: All 5 mipmap densities verified with zero duplicate resource conflicts');

// Test 6: In-App Branding, Accessibility Labels & Tooltips
console.log('Test 6: Validating in-app branding, accessibility labels, and tooltips...');
const headerContent = fs.readFileSync(appHeaderPath, 'utf8');
const homeContent = fs.readFileSync(homeScreenPath, 'utf8');
const loginContent = fs.readFileSync(loginScreenPath, 'utf8');

assert(
  headerContent.includes('Shubh Labh SalesTeam') &&
  headerContent.includes('accessibilityLabel="Shubh Labh SalesTeam"') &&
  headerContent.includes('title: \'Shubh Labh SalesTeam\''),
  'AppHeader must include Shubh Labh SalesTeam branding, accessibilityLabel, and tooltip'
);

assert(
  homeContent.includes('Shubh Labh SalesTeam') &&
  homeContent.includes('accessibilityLabel="Shubh Labh SalesTeam"') &&
  homeContent.includes('title: \'Shubh Labh SalesTeam\''),
  'HomeScreen must include Shubh Labh SalesTeam branding, accessibilityLabel, and tooltip'
);

assert(
  loginContent.includes('brandLogo') &&
  loginContent.includes('accessibilityLabel="Shubh Labh SalesTeam"') &&
  loginContent.includes('title: \'Shubh Labh SalesTeam\''),
  'LoginScreen must render brandLogo, accessibilityLabel, and tooltip'
);
console.log('✓ Test 6: In-app branding, accessibility labels, and tooltips verified');

console.log('=== ALL 6/6 MICRO-SPRINT FA-APP-ICON-01 TESTS PASSED ===');
