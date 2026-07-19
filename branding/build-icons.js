// Pantry icon build pipeline.
// Turns the approved leather render (branding/source-render.png) into every
// production asset: full-bleed iOS icons, PWA icons, favicons, and the
// rounded in-app brand mark.
//
//   node branding/build-icons.js
//
// Requires `sharp` (already a project dependency).

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BRAND = path.join(ROOT, 'branding');
const PUBLIC = path.join(ROOT, 'public');
const SET = path.join(BRAND, 'AppIcon.appiconset');
const SRC = path.join(BRAND, 'source-render.png');

// Bounding box of the leather tile inside the 1024² render (measured).
const BBOX = { left: 168, top: 163, width: 679, height: 679 };
// Backing gradient sampled from the tile's own top-lit leather vignette.
const BG_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">' +
  '<defs><radialGradient id="g" cx="50%" cy="34%" r="78%">' +
  '<stop offset="0%" stop-color="#BC6035"/>' +
  '<stop offset="55%" stop-color="#A54D28"/>' +
  '<stop offset="100%" stop-color="#853A1B"/>' +
  '</radialGradient></defs>' +
  '<rect width="1024" height="1024" fill="url(#g)"/></svg>';

const roundedMaskSvg = (size, radius) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
  `<rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`;

async function buildMaster() {
  // Tile scaled to fill the frame; keeps the P's natural margin.
  const base = await sharp(SRC).extract(BBOX).resize(1024, 1024).png().toBuffer();
  // Leather-toned backing fills the four corners the rounded tile leaves bare.
  const bg = await sharp(Buffer.from(BG_SVG)).png().toBuffer();
  // Feathered rounded mask (radius < tile rounding) drops the cream corners.
  const mask = await sharp(Buffer.from(roundedMaskSvg(1024, 285))).blur(12).png().toBuffer();
  const tile = await sharp(base).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  return sharp(bg).composite([{ input: tile }]).flatten({ background: '#A0522D' }).png().toBuffer();
}

async function main() {
  fs.mkdirSync(SET, { recursive: true });
  const master = await buildMaster(); // 1024², full-bleed, opaque

  const fullBleed = (size, file) =>
    sharp(master).resize(size, size).flatten({ background: '#A0522D' }).png().toFile(file);

  const rounded = async (size, file) => {
    const mask = Buffer.from(roundedMaskSvg(size, Math.round(size * 0.223)));
    await sharp(master)
      .resize(size, size)
      .ensureAlpha()
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toFile(file);
  };

  // Circle mask — for the in-app brand mark only (a leather roundel).
  // The home-screen / favicon icons stay square; platforms mask those themselves.
  const circle = async (size, file) => {
    const r = (size - 2) / 2;
    const mask = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="#fff"/></svg>`
    );
    await sharp(master)
      .resize(size, size)
      .ensureAlpha()
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toFile(file);
  };

  // ── App Store / marketing master ──
  await fullBleed(1024, path.join(BRAND, 'icon-1024.png'));

  // ── iOS AppIcon.appiconset (full-bleed, no alpha) ──
  const iosSizes = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];
  for (const s of iosSizes) await fullBleed(s, path.join(SET, `icon-${s}.png`));
  const contents = {
    images: [
      { size: '20x20', idiom: 'iphone', filename: 'icon-40.png', scale: '2x' },
      { size: '20x20', idiom: 'iphone', filename: 'icon-60.png', scale: '3x' },
      { size: '29x29', idiom: 'iphone', filename: 'icon-58.png', scale: '2x' },
      { size: '29x29', idiom: 'iphone', filename: 'icon-87.png', scale: '3x' },
      { size: '40x40', idiom: 'iphone', filename: 'icon-80.png', scale: '2x' },
      { size: '40x40', idiom: 'iphone', filename: 'icon-120.png', scale: '3x' },
      { size: '60x60', idiom: 'iphone', filename: 'icon-120.png', scale: '2x' },
      { size: '60x60', idiom: 'iphone', filename: 'icon-180.png', scale: '3x' },
      { size: '20x20', idiom: 'ipad', filename: 'icon-20.png', scale: '1x' },
      { size: '20x20', idiom: 'ipad', filename: 'icon-40.png', scale: '2x' },
      { size: '29x29', idiom: 'ipad', filename: 'icon-29.png', scale: '1x' },
      { size: '29x29', idiom: 'ipad', filename: 'icon-58.png', scale: '2x' },
      { size: '40x40', idiom: 'ipad', filename: 'icon-40.png', scale: '1x' },
      { size: '40x40', idiom: 'ipad', filename: 'icon-80.png', scale: '2x' },
      { size: '76x76', idiom: 'ipad', filename: 'icon-76.png', scale: '1x' },
      { size: '76x76', idiom: 'ipad', filename: 'icon-152.png', scale: '2x' },
      { size: '83.5x83.5', idiom: 'ipad', filename: 'icon-167.png', scale: '2x' },
      { size: '1024x1024', idiom: 'ios-marketing', filename: 'icon-1024.png', scale: '1x' },
    ],
    info: { version: 1, author: 'xcode' },
  };
  fs.writeFileSync(path.join(SET, 'Contents.json'), JSON.stringify(contents, null, 2) + '\n');

  // ── Web: PWA + apple-touch (full-bleed) ──
  await fullBleed(180, path.join(PUBLIC, 'apple-touch-icon.png'));
  await fullBleed(192, path.join(PUBLIC, 'icon-192.png'));
  await fullBleed(512, path.join(PUBLIC, 'icon-512.png'));

  // ── Web: favicons stay square (browser-tab app icons) ──
  await rounded(180, path.join(PUBLIC, 'favicon-180.png'));
  await rounded(32, path.join(PUBLIC, 'favicon-32.png'));
  await rounded(16, path.join(PUBLIC, 'favicon-16.png'));

  // ── In-app brand mark — a leather circle (nav / auth / splash) ──
  await circle(256, path.join(PUBLIC, 'pantry-mark.png'));

  console.log('icons built');
}

main().catch(e => { console.error(e); process.exit(1); });
