// Generates every logo/icon size from logo.png. Run: node scripts/make-icons.js
const sharp = require('sharp');
const path = require('path');
const root = path.join(__dirname, '..');
const src = path.join(root, 'logo.png');
const BLACK = { r: 0, g: 0, b: 0, alpha: 1 };

(async () => {
  const out = (p) => path.join(root, p);
  // website
  await sharp(src).resize(512).png({ quality: 85, compressionLevel: 9 }).toFile(out('public/logo512.png'));
  await sharp(src).resize(192).png({ compressionLevel: 9 }).toFile(out('public/logo192.png'));
  await sharp(src).resize(64).png().toFile(out('public/favicon.png'));
  await sharp(src).resize(180).png().toFile(out('public/apple-touch-icon.png'));
  // android (consumed by @capacitor/assets)
  await sharp(src).resize(1024).png().toFile(out('assets/icon-only.png'));
  await sharp(src).resize(700).extend({ top: 162, bottom: 162, left: 162, right: 162, background: BLACK })
    .png().toFile(out('assets/icon-foreground.png'));
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BLACK } }).png().toFile(out('assets/icon-background.png'));
  for (const name of ['splash.png', 'splash-dark.png']) {
    const logo = await sharp(src).resize(1100).png().toBuffer();
    await sharp({ create: { width: 2732, height: 2732, channels: 4, background: BLACK } })
      .composite([{ input: logo, gravity: 'center' }]).png().toFile(out(`assets/${name}`));
  }
  console.log('icons done');
})();
