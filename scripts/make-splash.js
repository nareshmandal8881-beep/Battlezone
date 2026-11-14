// Cleans the splash artwork (removes the corner sparkle mark) and builds web + Android splash images.
// Run: node scripts/make-splash.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const dir = path.join(root, 'splash screen');

// Replace a rectangle with a feathered patch copied from nearby (dx, dy offset).
async function heal(file, box, dx, dy) {
  const img = sharp(path.join(dir, file));
  const { width, height } = await img.metadata();
  const patch = await sharp(path.join(dir, file))
    .extract({ left: box.x + dx, top: box.y + dy, width: box.w, height: box.h })
    .blur(1.2).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const mask = Buffer.from(`<svg width="${box.w}" height="${box.h}"><defs><radialGradient id="g">
    <stop offset="55%" stop-color="#fff"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/></svg>`);
  const alpha = await sharp(mask).resize(box.w, box.h).extractChannel('alpha').raw().toBuffer();
  const px = patch.data;
  for (let i = 0; i < box.w * box.h; i++) px[i * 4 + 3] = alpha[i];
  const patchPng = await sharp(px, { raw: { width: box.w, height: box.h, channels: 4 } }).png().toBuffer();
  return { buf: await img.composite([{ input: patchPng, left: box.x, top: box.y }]).png().toBuffer(), width, height };
}

const MARK = { x: 625, y: 1228, w: 100, h: 100 }; // sparkle sits around (670,1280) on 768x1376

(async () => {
  const squad = await heal('image copy.png', MARK, -110, 0);
  const fire = await heal('image.png', MARK, 0, -120);
  fs.writeFileSync(path.join(dir, 'clean-squad.png'), squad.buf);
  fs.writeFileSync(path.join(dir, 'clean-fire.png'), fire.buf);

  // website / in-app backgrounds
  await sharp(squad.buf).resize(1080, 1936, { fit: 'cover' }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(root, 'public/splash-bg.jpg'));
  await sharp(fire.buf).resize(1080, 1936, { fit: 'cover' }).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(root, 'public/auth-bg.jpg'));

  // Android native splash (portrait): artwork + logo + title, baked in
  const res = path.join(root, 'android/app/src/main/res');
  const sizes = { 'drawable-port-mdpi': [320, 480], 'drawable-port-hdpi': [480, 800], 'drawable-port-xhdpi': [720, 1280],
    'drawable-port-xxhdpi': [960, 1600], 'drawable-port-xxxhdpi': [1280, 1920], drawable: [1280, 1920] };
  for (const [folder, [w, h]] of Object.entries(sizes)) {
    const logoW = Math.round(w * 0.52);
    const r = Math.round(logoW * 0.06);
    const maskSvg = Buffer.from(`<svg width="${logoW}" height="${logoW}"><rect x="${r}" y="${r}" width="${logoW - 2 * r}" height="${logoW - 2 * r}" rx="${r * 2}" fill="#fff"/></svg>`);
    const mask = await sharp(maskSvg).blur(r * 0.9).extractChannel('alpha').toBuffer();
    const logoRaw = await sharp(path.join(root, 'logo.png')).resize(logoW, logoW).removeAlpha().png().toBuffer();
    const logo = await sharp(logoRaw).joinChannel(mask).png().toBuffer();
    const fs1 = Math.round(w * 0.105), fs2 = Math.round(w * 0.036);
    const ty = Math.round(h * 0.16) + logoW + Math.round(fs1 * 1.1);
    const text = Buffer.from(`<svg width="${w}" height="${h}">
      <defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".75"/>
      <stop offset=".55" stop-color="#000" stop-opacity="0"/></linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#t)"/>
      <text x="50%" y="${ty}" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-weight="900"
        font-size="${fs1}" fill="#ffffff" letter-spacing="${Math.round(fs1 * 0.04)}">BATTLEZONE</text>
      <text x="50%" y="${ty + Math.round(fs2 * 2.1)}" text-anchor="middle" font-family="Consolas, monospace" font-size="${fs2}"
        fill="#f5b301" letter-spacing="${Math.round(fs2 * 0.35)}">ESPORTS · TOURNAMENTS</text></svg>`);
    const out = await sharp(squad.buf).resize(w, h, { fit: 'cover' })
      .composite([{ input: text }, { input: logo, top: Math.round(h * 0.16), left: Math.round((w - logoW) / 2) }])
      .jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    const d = path.join(res, folder);
    if (!fs.existsSync(d)) continue;
    for (const ext of ['png', 'jpg']) { const f = path.join(d, `splash.${ext}`); if (fs.existsSync(f)) fs.unlinkSync(f); }
    fs.writeFileSync(path.join(d, 'splash.jpg'), out);
    if (folder === 'drawable-port-xxhdpi') fs.writeFileSync(path.join(dir, 'preview-native.jpg'), out);
  }
  console.log('splash done');
})();
