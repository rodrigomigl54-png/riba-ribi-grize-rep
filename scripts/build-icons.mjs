/**
 * build-icons.mjs
 * Favicon set (svg, ico, png 16–512, apple-touch) i Open Graph slika (1200×630)
 * iz logo.svg i — ako postoji — fotografije morska-plata.jpg.
 *
 *   npm run icons      (pokreće se i u okviru `npm run build`)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import opentype from 'opentype.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = (p) => path.join(root, 'public', p);
const logoSvg = fs.readFileSync(pub('assets/brand/logo.svg'));
const brand = (fs.readFileSync(path.join(root, 'src/styles/brand.css'), 'utf8').match(/--brand:\s*(#[0-9a-f]{6})/i) || [])[1] || '#1C4C8C';

/* ---------- favicons ---------- */
fs.copyFileSync(pub('assets/brand/logo.svg'), pub('favicon.svg'));
const png = (size) => sharp(logoSvg, { density: 300 }).resize(size, size).png().toBuffer();
fs.writeFileSync(pub('icon-192.png'), await png(192));
fs.writeFileSync(pub('icon-512.png'), await png(512));
// apple-touch: iOS seče uglove, pa krug stavljamo na bisernu pozadinu
const apple = await sharp({ create: { width: 180, height: 180, channels: 4, background: '#F6F2EA' } })
  .composite([{ input: await png(156), top: 12, left: 12 }]).png().toBuffer();
fs.writeFileSync(pub('apple-touch-icon.png'), apple);

// .ico sa ugrađenim PNG-ovima (16, 32, 48)
const icoSizes = [16, 32, 48];
const icoPngs = await Promise.all(icoSizes.map(png));
const header = Buffer.alloc(6 + 16 * icoSizes.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(icoSizes.length, 4);
let offset = header.length;
icoSizes.forEach((s, i) => {
  const o = 6 + i * 16;
  header.writeUInt8(s, o); header.writeUInt8(s, o + 1); header.writeUInt16LE(1, o + 4); header.writeUInt16LE(32, o + 6);
  header.writeUInt32LE(icoPngs[i].length, o + 8); header.writeUInt32LE(offset, o + 12);
  offset += icoPngs[i].length;
});
fs.writeFileSync(pub('favicon.ico'), Buffer.concat([header, ...icoPngs]));

fs.writeFileSync(pub('site.webmanifest'), JSON.stringify({
  name: 'Konoba Riba Ribi Grize Rep', short_name: 'Riba Ribi Grize Rep', start_url: './', display: 'browser',
  background_color: '#06182E', theme_color: '#06182E',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }],
}, null, 2));

/* ---------- Open Graph 1200×630 ---------- */
const W = 1200, H = 630;
const font = opentype.parse(fs.readFileSync(path.join(root, 'node_modules/@fontsource/fraunces/files/fraunces-latin-ext-600-normal.woff')).buffer.slice(0));
const fontL = opentype.parse(fs.readFileSync(path.join(root, 'node_modules/@fontsource/fraunces/files/fraunces-latin-600-normal.woff')).buffer.slice(0));
const text = (str, size, x, y, fill, op = 1) => {
  // latin + latin-ext: glifove tražimo u oba fajla
  // svaki glif crtamo u (0,0) i pomeramo transformom (izbegava NaN bag u opentype.js)
  let out = '', cx = x;
  for (const ch of str) {
    const f = fontL.charToGlyphIndex(ch) ? fontL : font;
    const g = f.charToGlyph(ch);
    const d = g.getPath(0, 0, size).toPathData(2);
    if (d && !d.includes('NaN')) out += `<path transform="translate(${cx.toFixed(2)} ${y})" d="${d}"/>`;
    cx += (g.advanceWidth / f.unitsPerEm) * size;
  }
  return `<g fill="${fill}" opacity="${op}">${out}</g>`;
};
const photo = pub('assets/images/morska-plata.jpg');
const leftW = 640;
let left;
if (fs.existsSync(photo)) {
  left = await sharp(photo).rotate().resize(leftW, H, { fit: 'cover' }).modulate({ saturation: 0.95 }).toBuffer();
} else {
  // placeholder: tamnoplavi gradijent sa „vodom"
  left = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${leftW}" height="${H}">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F4E86"/><stop offset="1" stop-color="#06182E"/></linearGradient>
<filter id="w"><feTurbulence type="fractalNoise" baseFrequency=".006 .04" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .14 0"/></filter></defs>
<rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" filter="url(#w)"/></svg>`)).png().toBuffer();
}
const logo = await sharp(logoSvg, { density: 300 }).resize(300, 300).png().toBuffer();
const right = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs><linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="#06182E" stop-opacity="0"/><stop offset="1" stop-color="#06182E"/></linearGradient></defs>
<rect x="${leftW - 200}" width="200" height="${H}" fill="url(#fade)"/>
<rect x="${leftW}" width="${W - leftW}" height="${H}" fill="#06182E"/>
${text('Konoba · Novi Sad', 26, 760, 470, '#CDB874')}
${text('Bulevar cara Lazara 46', 30, 760, 520, '#F6F2EA', 0.9)}
${text('021 644 2922', 30, 760, 562, '#F6F2EA', 0.65)}
</svg>`;
await sharp({ create: { width: W, height: H, channels: 3, background: '#06182E' } })
  .composite([{ input: left, left: 0, top: 0 }, { input: Buffer.from(right), left: 0, top: 0 }, { input: logo, left: 760, top: 80 }])
  .jpeg({ quality: 84, mozjpeg: true }).toFile(pub('og-image.jpg'));

console.log(`✓ favicon set + og-image.jpg${fs.existsSync(photo) ? ' (sa fotografijom)' : ' (placeholder pozadina)'} · brand ${brand}`);
