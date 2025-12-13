// tools/make-icon.js
//after run this file run `node tools/make-icon.js` to generate icon.png
//npx capacitor-assets generate --android
const sharp = require('sharp');
const fs = require('fs');
const inPath = 'src/assets/icon.png';
const outPath = 'resources/icon.png';
const size = 1024;

if (!fs.existsSync(inPath)) {
  console.error('Source not found:', inPath);
  process.exit(1);
}

// ensure output directory exists
const outDir = require('path').dirname(outPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

sharp(inPath)
  .resize({ width: size, height: size, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .toFile(outPath)
  .then(()=> console.log('Created', outPath))
  .catch(err=> { console.error(err); process.exit(2); });