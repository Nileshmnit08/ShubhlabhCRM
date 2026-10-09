const { Jimp } = require('jimp');

async function resizeIcons() {
  try {
    const image = await Jimp.read('C:/Users/dell/.gemini/antigravity-ide/brain/4546ccd4-7a52-4486-9381-2627d9348237/.user_uploaded/media_1791525383302.jpg');
    
    // For standard icon (1024x1024)
    const iconImage = image.clone();
    iconImage.contain({ w: 1024, h: 1024 }).write('assets/icon.png');
    
    // For adaptive icon foreground
    const adaptiveForeground = new Jimp({ width: 1024, height: 1024, color: 0x00000000 });
    const scaledLogo = image.clone().contain({ w: 700, h: 700 });
    adaptiveForeground.composite(scaledLogo, (1024 - 700) / 2, (1024 - 700) / 2);
    adaptiveForeground.write('assets/android-icon-foreground.png');
    
    console.log('Icons generated successfully.');
  } catch (err) {
    console.error('Error generating icons:', err);
  }
}

resizeIcons();
