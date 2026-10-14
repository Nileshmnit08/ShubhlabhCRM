/**
 * generate_salesteam_icons.js
 * Generates all Shubh Labh SalesTeam app icons and mipmap assets from the exact uploaded image.
 */

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp-compact');

const SOURCE_IMAGE_PATH = 'C:/Users/dell/.gemini/antigravity-ide/brain/da014fb9-1405-4c2c-aba2-e9b97fff8846/.user_uploaded/media_1791929291846.png';
const PROJECT_ROOT = path.join(__dirname, '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets');
const RES_DIR = path.join(PROJECT_ROOT, 'android', 'app', 'src', 'main', 'res');

// Background color matching the uploaded image: #E4E5E9
const BG_COLOR = 0xE4E5E9FF;

const DENSITIES = [
  { name: 'mipmap-mdpi', legacySize: 48, adaptiveSize: 108 },
  { name: 'mipmap-hdpi', legacySize: 72, adaptiveSize: 162 },
  { name: 'mipmap-xhdpi', legacySize: 96, adaptiveSize: 216 },
  { name: 'mipmap-xxhdpi', legacySize: 144, adaptiveSize: 324 },
  { name: 'mipmap-xxxhdpi', legacySize: 192, adaptiveSize: 432 },
];

async function run() {
  console.log('Loading source image from:', SOURCE_IMAGE_PATH);
  if (!fs.existsSync(SOURCE_IMAGE_PATH)) {
    throw new Error('Source image not found: ' + SOURCE_IMAGE_PATH);
  }

  const baseImg = await Jimp.read(SOURCE_IMAGE_PATH);
  console.log(`Source image loaded: ${baseImg.bitmap.width}x${baseImg.bitmap.height}`);

  // 1. Generate assets/icon.png (1024x1024)
  console.log('Generating assets/icon.png (1024x1024)...');
  const icon1024 = baseImg.clone().resize(1024, 1024);
  await icon1024.writeAsync(path.join(ASSETS_DIR, 'icon.png'));

  // 2. Generate assets/splash-icon.png (450x450)
  console.log('Generating assets/splash-icon.png (450x450)...');
  const splashImg = baseImg.clone().resize(450, 450);
  await splashImg.writeAsync(path.join(ASSETS_DIR, 'splash-icon.png'));

  // 3. Generate assets/favicon.png (48x48)
  console.log('Generating assets/favicon.png (48x48)...');
  const faviconImg = baseImg.clone().resize(48, 48);
  await faviconImg.writeAsync(path.join(ASSETS_DIR, 'favicon.png'));

  // 4. Generate assets/android-icon-foreground.png (432x432)
  console.log('Generating assets/android-icon-foreground.png (432x432)...');
  const fg432 = new Jimp(432, 432, 0x00000000);
  const inner432 = baseImg.clone().resize(300, 300);
  fg432.composite(inner432, (432 - 300) / 2, (432 - 300) / 2);
  await fg432.writeAsync(path.join(ASSETS_DIR, 'android-icon-foreground.png'));

  // 5. Generate assets/android-icon-background.png (432x432)
  console.log('Generating assets/android-icon-background.png (432x432)...');
  const bg432 = new Jimp(432, 432, BG_COLOR);
  await bg432.writeAsync(path.join(ASSETS_DIR, 'android-icon-background.png'));

  // 6. Generate assets/android-icon-monochrome.png (432x432)
  console.log('Generating assets/android-icon-monochrome.png (432x432)...');
  const mono432 = fg432.clone().grayscale();
  await mono432.writeAsync(path.join(ASSETS_DIR, 'android-icon-monochrome.png'));

  // 7. Generate Android Mipmaps for each density
  for (const d of DENSITIES) {
    const dir = path.join(RES_DIR, d.name);
    console.log(`\nProcessing density: ${d.name} (${d.legacySize}px / ${d.adaptiveSize}px)...`);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Delete existing .webp files to avoid AAPT duplicate resource errors
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f.endsWith('.webp')) {
        fs.unlinkSync(path.join(dir, f));
        console.log(`  Deleted old webp: ${f}`);
      }
    }

    // A. ic_launcher.png (legacy square icon)
    const legacySquare = baseImg.clone().resize(d.legacySize, d.legacySize);
    await legacySquare.writeAsync(path.join(dir, 'ic_launcher.png'));
    console.log(`  Created ic_launcher.png (${d.legacySize}x${d.legacySize})`);

    // B. ic_launcher_round.png (legacy round icon)
    const legacyRound = baseImg.clone().resize(d.legacySize, d.legacySize).circle();
    await legacyRound.writeAsync(path.join(dir, 'ic_launcher_round.png'));
    console.log(`  Created ic_launcher_round.png (${d.legacySize}x${d.legacySize})`);

    // C. ic_launcher_background.png (adaptive background)
    const adaptiveBg = new Jimp(d.adaptiveSize, d.adaptiveSize, BG_COLOR);
    await adaptiveBg.writeAsync(path.join(dir, 'ic_launcher_background.png'));
    console.log(`  Created ic_launcher_background.png (${d.adaptiveSize}x${d.adaptiveSize})`);

    // D. ic_launcher_foreground.png (adaptive foreground)
    const adaptiveFg = new Jimp(d.adaptiveSize, d.adaptiveSize, 0x00000000);
    const innerSize = Math.round(d.adaptiveSize * 0.70);
    const innerImg = baseImg.clone().resize(innerSize, innerSize);
    const offset = Math.round((d.adaptiveSize - innerSize) / 2);
    adaptiveFg.composite(innerImg, offset, offset);
    await adaptiveFg.writeAsync(path.join(dir, 'ic_launcher_foreground.png'));
    console.log(`  Created ic_launcher_foreground.png (${d.adaptiveSize}x${d.adaptiveSize})`);

    // E. ic_launcher_monochrome.png
    const monoImg = adaptiveFg.clone().grayscale();
    await monoImg.writeAsync(path.join(dir, 'ic_launcher_monochrome.png'));
    console.log(`  Created ic_launcher_monochrome.png (${d.adaptiveSize}x${d.adaptiveSize})`);
  }

  console.log('\n=== ALL SHUBH LABH SALESTEAM ICONS GENERATED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Fatal error generating icons:', err);
  process.exit(1);
});
