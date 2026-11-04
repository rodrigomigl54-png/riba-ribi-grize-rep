/**
 * build-logo.mjs
 * Vektorska rekonstrukcija logoa: plavi krug, pleteni konopac po ivici i
 * „ogledalski" redovi: RIBA / RIBI (odraz) / GRIZE / REP (odraz).
 * Tekst se pretvara u krive (opentype.js) pa SVG ne zavisi od fontova.
 *
 * Ako postoji public/assets/brand/logo.png, iz njega se uzima tačna plava
 * boja i upisuje u src/styles/brand.css (CSS promenljiva --brand).
 *
 *   npm run logo
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brandDir = path.join(root, 'public/assets/brand');
const pngPath = path.join(brandDir, 'logo.png');
const DEFAULT_BLUE = '#1C4C8C';

/* ---------- 1. Boja iz PNG-a (ako postoji) ---------- */
async function extractBlue() {
  if (!fs.existsSync(pngPath)) return null;
  const { data, info } = await sharp(pngPath).resize(96, 96, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map();
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    // samo zasićeni plavi pikseli (ne bela slova, ne senke)
    if (b !== max || max - min < 50 || max < 60) continue;
    const key = `${r >> 3},${g >> 3},${b >> 3}`;
    const e = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b;
    buckets.set(key, e);
  }
  const best = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
  if (!best) return null;
  const hex = (v) => Math.round(v / best.n).toString(16).padStart(2, '0');
  return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`.toUpperCase();
}

/* ---------- 2. Font → krive ---------- */
const fontFile = path.join(root, 'node_modules/@fontsource/fraunces/files/fraunces-latin-700-normal.woff');
const font = opentype.parse(fs.readFileSync(fontFile).buffer.slice(0));

/** Vraća SVG path za reč centriranu na cx, sa baseline na y. */
function wordPath(text, size, cx, baseline, tracking = 0) {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);
  let width = 0;
  glyphs.forEach((g, i) => { width += g.advanceWidth * scale + (i < glyphs.length - 1 ? tracking : 0); });
  let x = cx - width / 2;
  let d = '';
  for (const g of glyphs) {
    d += g.getPath(x, baseline, size).toPathData(1);
    x += g.advanceWidth * scale + tracking;
  }
  return d;
}

/* ---------- 3. Konopac ---------- */
function rope(cx, cy, rOuter, rInner, strands) {
  const mid = (rOuter + rInner) / 2;
  const half = (rOuter - rInner) / 2;
  const step = (Math.PI * 2) / strands;
  const parts = [];
  for (let i = 0; i < strands; i++) {
    const a = i * step;
    // jedan „uvojak": izduženi list nagnut ~40° u odnosu na radijus
    const p = (t, r) => {
      const ang = a + t * step;
      return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r];
    };
    const A = p(-0.55, mid - half * 0.92);
    const B = p(0.55, mid + half * 0.92);
    const C1 = p(-0.65, mid + half * 0.55);
    const C2 = p(0.65, mid - half * 0.55);
    const f = (q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
    parts.push(`M${f(A)}Q${f(C1)} ${f(B)}Q${f(C2)} ${f(A)}Z`);
  }
  return parts.join('');
}

/* ---------- 4. Sklapanje ---------- */
function buildSvg(blue, { idPrefix = 'rr', classes = false } = {}) {
  const S = 512, c = S / 2;
  const cls = (n) => (classes ? ` class="${n}"` : '');
  const rows = [
    // [tekst, veličina, baseline, ogledalo]
    { t: 'RIBA', size: 80, base: 186, mirror: false, k: 'row1' },
    { t: 'RIBI', size: 80, base: 186, mirror: true, k: 'row2' },
    { t: 'GRIZE', size: 76, base: 330, mirror: false, k: 'row3' },
    { t: 'REP', size: 76, base: 330, mirror: true, k: 'row4' },
  ];
  const axis1 = 195; // „vodena linija" između RIBA i RIBI
  const axis2 = 339; // između GRIZE i REP
  const rowsSvg = rows.map((r) => {
    const d = wordPath(r.t, r.size, c, r.base, 6);
    if (!r.mirror) return `<path${cls(`logo-row logo-${r.k}`)} d="${d}"/>`;
    // odraz: ogledalo oko vodene linije — reč je napisana „naopačke", kao u vodi
    const axis = r.k === 'row2' ? axis1 : axis2;
    const prev = rows[rows.indexOf(r) - 1];
    const dd = wordPath(r.t, r.size, c, prev.base, 6);
    return `<g${cls(`logo-row logo-${r.k}`)} transform="translate(0 ${2 * axis}) scale(1 -1)"><path d="${dd}"/></g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" role="img" aria-labelledby="${idPrefix}-t">
<title id="${idPrefix}-t">Riba Ribi Grize Rep</title>
<circle${cls('logo-disc')} cx="${c}" cy="${c}" r="254" fill="${blue}"/>
<g${cls('logo-rope')} fill="none" stroke="#F6F2EA" stroke-width="1.6" opacity=".95">
<circle cx="${c}" cy="${c}" r="244"/><circle cx="${c}" cy="${c}" r="214"/>
</g>
<path${cls('logo-rope')} fill="#F6F2EA" d="${rope(c, c, 242, 216, 64)}"/>
<g${cls('logo-type')} fill="#F6F2EA">
${rowsSvg.join('\n')}
<rect${cls('logo-line')} x="168" y="${axis1 - 1}" width="176" height="2" rx="1" opacity=".7"/>
<rect${cls('logo-line')} x="148" y="${axis2 - 1}" width="216" height="2" rx="1" opacity=".7"/>
</g>
</svg>
`;
}

const blue = (await extractBlue()) || DEFAULT_BLUE;
fs.mkdirSync(brandDir, { recursive: true });
fs.writeFileSync(path.join(brandDir, 'logo.svg'), buildSvg(blue));
// verzija sa klasama za animacije (umeće je build u HTML)
fs.mkdirSync(path.join(root, 'src/generated'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/generated/logo-inline.svg'), buildSvg('currentColor', { classes: true, idPrefix: 'logo' }).replace(/fill="#F6F2EA"/g, 'fill="var(--logo-ink, #F6F2EA)"').replace(/stroke="#F6F2EA"/g, 'stroke="var(--logo-ink, #F6F2EA)"'));
fs.writeFileSync(path.join(root, 'src/styles/brand.css'), `/* Generisano iz scripts/build-logo.mjs — boja ${fs.existsSync(pngPath) ? 'uzeta iz logo.png' : 'podrazumevana (logo.png još ne postoji)'} */\n:root { --brand: ${blue}; }\n`);
console.log(`✓ logo.svg (plava: ${blue}${fs.existsSync(pngPath) ? ', iz logo.png' : ', podrazumevana'})`);
