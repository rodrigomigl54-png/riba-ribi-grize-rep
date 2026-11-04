/**
 * check-site.mjs — brza provera gotovog builda (pokreni posle `npm run build`):
 *   - svako jelo iz menu.json je na stranici sa tačnom cenom (SR i EN)
 *   - tel:, Wolt, Instagram i Google Maps linkovi odgovaraju src/config.js
 *   - nema neobrađenih {{ }} oznaka, JSON-LD je ispravan
 *
 *   npm run check
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';
import { config } from '../src/config.js';
import { formatPrice } from './site-plugin.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const menu = JSON.parse(fs.readFileSync(path.join(root, 'src/data/menu.json'), 'utf8'));
let errors = 0;
const fail = (m) => { errors++; console.log('  ✗ ' + m); };

for (const [lang, file] of [['sr', 'dist/index.html'], ['en', 'dist/en/index.html']]) {
  console.log(`\n${lang.toUpperCase()} — ${file}`);
  const p = path.join(root, file);
  if (!fs.existsSync(p)) { fail('nema fajla — pokreni npm run build'); continue; }
  const html = fs.readFileSync(p, 'utf8');
  const doc = parse(html);

  if (/\{\{|<!--@/.test(html)) fail('neobrađene {{ }} ili <!--@ --> oznake');

  // jelovnik
  const dishes = doc.querySelectorAll('.dish');
  const all = menu.categories.flatMap((c) => c.items);
  if (dishes.length !== all.length) fail(`broj jela ${dishes.length} ≠ ${all.length}`);
  all.forEach((it, i) => {
    const d = dishes[i];
    const name = d?.querySelector('.dish__name')?.text.trim();
    const price = d?.querySelector('.dish__price .num')?.text.trim();
    if (name !== it[lang].replace(/&/g, '&amp;') && name !== it[lang]) fail(`naziv: „${name}" ≠ „${it[lang]}"`);
    if (price !== formatPrice(it.price, lang)) fail(`cena za „${it.sr}": ${price} ≠ ${formatPrice(it.price, lang)}`);
  });
  console.log(`  ✓ ${dishes.length} jela, cene proverene`);

  // linkovi
  const hrefs = doc.querySelectorAll('a').map((a) => a.getAttribute('href') || '');
  const tel = hrefs.filter((h) => h.startsWith('tel:'));
  if (!tel.length || tel.some((h) => h !== config.phone.href)) fail(`tel linkovi: ${[...new Set(tel)].join(', ')}`);
  if (!hrefs.includes(config.links.wolt)) fail('nema Wolt linka');
  if (!hrefs.includes(config.links.instagram)) fail('nema Instagram linka');
  if (!hrefs.some((h) => h.startsWith('https://www.google.com/maps/dir/?api=1&destination='))) fail('nema linka „Uputstva"');
  doc.querySelectorAll('a[target="_blank"]').forEach((a) => { if (!/noopener/.test(a.getAttribute('rel') || '')) fail(`target=_blank bez rel=noopener: ${a.getAttribute('href')}`); });
  console.log(`  ✓ linkovi: ${tel.length}× tel, Wolt, Instagram, mapa`);

  // JSON-LD
  try {
    const ld = JSON.parse(doc.querySelector('script[type="application/ld+json"]').text);
    if (ld['@type'] !== 'Restaurant' || ld.aggregateRating.reviewCount !== config.rating.count) fail('JSON-LD podaci');
    else console.log('  ✓ JSON-LD Restaurant');
  } catch (e) { fail('JSON-LD ne može da se pročita: ' + e.message); }

  // slike moraju imati alt
  doc.querySelectorAll('img').forEach((img) => { if (img.getAttribute('alt') === undefined) fail(`img bez alt: ${img.getAttribute('src')}`); });
}

for (const f of ['dist/sitemap.xml', 'dist/robots.txt', 'dist/og-image.jpg', 'dist/favicon.ico', 'dist/favicon.svg', 'dist/apple-touch-icon.png']) {
  if (!fs.existsSync(path.join(root, f))) fail(`nedostaje ${f}`);
}
console.log(errors ? `\n✗ ${errors} problem(a)` : '\n✓ Sve provere prošle.');
process.exit(errors ? 1 : 0);
