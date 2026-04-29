#!/usr/bin/env node
/**
 * Generate brand assets: OG image (1200x630), favicon set, apple-touch-icon.
 *
 * - og:image     -> images/og/default.png  (composed: hero photo + navy gradient + brand text)
 * - favicon.ico  -> root favicon.ico       (PNG bytes inside .ico container; modern browsers accept)
 * - favicons     -> images/favicons/*.png
 * - apple-touch  -> apple-touch-icon.png   (180x180)
 *
 * Re-run this script if you replace the hero photo or change brand colors.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const HERO = path.join(ROOT, 'images', 'home', 'hero-bg.png');

(async () => {
  fs.mkdirSync(path.join(ROOT, 'images', 'og'), { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'images', 'favicons'), { recursive: true });

  // ── OG image (1200x630) ──
  // Layer: hero crop (darkened) + navy gradient + SVG text overlay.
  const heroBuf = await sharp(HERO)
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .modulate({ brightness: 0.55 })
    .toBuffer();

  const overlaySvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"  stop-color="#1d3557" stop-opacity="0.92"/>
      <stop offset="65%" stop-color="#1d3557" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#1d3557" stop-opacity="0.20"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <g font-family="Helvetica, Arial, sans-serif" fill="#ffffff">
    <text x="80" y="180" font-size="40" font-weight="600" opacity="0.85">AccidentLogic</text>
    <text x="80" y="320" font-size="78" font-weight="800">Free Case Review.</text>
    <text x="80" y="410" font-size="78" font-weight="800">Real Compensation.</text>
    <text x="80" y="500" font-size="32" font-weight="500" opacity="0.92">Get matched with an experienced attorney today.</text>
    <rect x="80" y="540" width="14" height="40" fill="#c8102e"/>
    <text x="110" y="572" font-size="28" font-weight="700">accidentlogic.com</text>
  </g>
</svg>`;

  await sharp(heroBuf)
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .png({ quality: 88 })
    .toFile(path.join(ROOT, 'images', 'og', 'default.png'));
  console.log('Wrote images/og/default.png  (1200x630)');

  // ── Favicon ──
  // Render a simple "AL" mark on brand red. We'll generate 16/32/48/180/512 PNGs.
  const faviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#c8102e"/>
  <text x="256" y="340" font-family="Helvetica, Arial, sans-serif" font-size="280" font-weight="800" fill="#ffffff" text-anchor="middle">AL</text>
</svg>`;
  const sizes = [16, 32, 48, 180, 192, 512];
  const buffers = {};
  for (const s of sizes) {
    const buf = await sharp(Buffer.from(faviconSvg)).resize(s, s).png().toBuffer();
    buffers[s] = buf;
    if (s === 180) {
      fs.writeFileSync(path.join(ROOT, 'apple-touch-icon.png'), buf);
      console.log('Wrote apple-touch-icon.png  (180x180)');
    } else {
      fs.writeFileSync(path.join(ROOT, 'images', 'favicons', `favicon-${s}.png`), buf);
      console.log(`Wrote images/favicons/favicon-${s}.png`);
    }
  }
  // Use 32px PNG as favicon.ico — modern browsers accept PNG-content .ico.
  fs.writeFileSync(path.join(ROOT, 'favicon.ico'), buffers[32]);
  console.log('Wrote favicon.ico');

  // ── Web app manifest ──
  const manifest = {
    name: 'AccidentLogic',
    short_name: 'AccidentLogic',
    icons: [
      { src: '/images/favicons/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/images/favicons/favicon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    theme_color: '#c8102e',
    background_color: '#ffffff',
    display: 'standalone'
  };
  fs.writeFileSync(path.join(ROOT, 'site.webmanifest'), JSON.stringify(manifest, null, 2));
  console.log('Wrote site.webmanifest');

  console.log('\nAll brand assets generated.');
})();
