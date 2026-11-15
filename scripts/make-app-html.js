// After build: write build/app.html = index.html without the AdSense script.
// The Android app opens /app.html, so AdSense (website-only) never runs inside the app; the app uses AdMob.
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'build');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const app = html.replace(/<script[^>]*adsbygoogle\.js[^>]*><\/script>/g, '');
if (app === html) throw new Error('AdSense tag not found in build/index.html');
fs.writeFileSync(path.join(dir, 'app.html'), app);
console.log('app.html written (AdSense removed)');
