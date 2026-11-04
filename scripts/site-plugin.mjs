/**
 * site-plugin.mjs — mali „statički generator" unutar Vite-a.
 *
 * index.html je šablon. Pri buildu (i u dev serveru) ovaj plugin:
 *  - menja {{ kljuc.iz.prevoda }} tekstom iz src/i18n/<jezik>.json
 *  - menja {{ cfg:putanja }} vrednošću iz src/config.js
 *  - menja <!--@blok ...--> generisanim HTML-om (jelovnik, ulov, slike, radno vreme…)
 *  - en/index.html je samo „stub" (<!--@page lang="en"-->) i dobija isti šablon na engleskom
 *  - generiše JSON-LD (schema.org/Restaurant), sitemap.xml i robots.txt
 *
 * Tako je sav sadržaj prisutan u HTML-u (SEO, brzina, radi i bez JS-a),
 * a JS samo dodaje interakciju i animacije.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJSON = (p, fallback = {}) => {
  try { return JSON.parse(read(p)); } catch { return fallback; }
};
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const get = (obj, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

async function loadConfig() {
  // svež import pri svakom renderu (dev server vidi izmene bez restarta)
  const url = pathToFileURL(path.join(ROOT, 'src/config.js')).href + `?t=${Date.now()}`;
  return (await import(url)).config;
}

/* ───────────────────────── helperi ───────────────────────── */

export function formatPrice(n, lang) {
  const s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : '.');
  return s;
}

/** Skraćeni prikaz radnog vremena, npr. „Pon–Sub 09:00–22:00". */
export function hoursRows(config, days) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return config.hours.map((h) => {
    const sorted = order.filter((d) => h.days.includes(d));
    const label = sorted.length > 1 ? `${days.short[sorted[0]]}–${days.short[sorted.at(-1)]}` : days.short[sorted[0]];
    return { label, time: `${h.open}–${h.close}`, days: sorted };
  });
}

const PH_MARK = `<svg class="ph__mark" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/><path d="M14 30c4-3 8-3 12 0s8 3 12 0 8-3 12 0M14 37c4-3 8-3 12 0s8 3 12 0 8-3 12 0" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`;

/** <picture> sa AVIF/WebP srcset-om ili elegantan placeholder ako slika još ne postoji. */
function picture(images, name, { alt = '', sizes = '100vw', cls = '', eager = false, ratio } = {}) {
  const m = images[name];
  const style = ratio ? ` style="--ratio:${ratio}"` : '';
  if (!m) {
    return `<div class="media media--ph ${cls}"${style} role="img" aria-label="${esc(alt)}" data-ph="${esc(name)}">${PH_MARK}</div>`;
  }
  const set = (fmt) => m.widths.map((w) => `/assets/images/opt/${name}-${w}.${fmt} ${w}w`).join(', ');
  return `<div class="media ${cls}"${style}><picture>` +
    `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">` +
    `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">` +
    `<img src="/assets/images/opt/${name}-${m.jpg}.jpg" width="${m.width}" height="${m.height}" alt="${esc(alt)}"` +
    ` ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="background-image:url(${m.lqip})">` +
    `</picture>${PH_MARK}</div>`;
}

/* ─────────────── ilustracije riba (linijski crtež, currentColor) ─────────────── */
function fishPath(h, opts = {}) {
  const y = 60, nose = 18, tail = 160;
  const t = opts.tail ?? 16;
  const body = `M${nose} ${y} C ${nose + 22} ${y - h * 0.9}, ${tail - 50} ${y - h}, ${tail} ${y - h * 0.12}` +
    ` L ${tail + 26} ${y - t - 6} Q ${tail + 16} ${y} ${tail + 26} ${y + t + 6} L ${tail} ${y + h * 0.12}` +
    ` C ${tail - 50} ${y + h}, ${nose + 22} ${y + h * 0.9}, ${nose} ${y} Z`;
  const eye = `<circle cx="${nose + 16}" cy="${y - h * 0.18}" r="2.2"/>`;
  const gill = `<path d="M${nose + 30} ${y - h * 0.55} Q ${nose + 38} ${y} ${nose + 30} ${y + h * 0.55}"/>`;
  const fin = `<path d="M${nose + 50} ${y - h * 0.86} Q ${nose + 70} ${y - h - 12} ${nose + 100} ${y - h * 0.8}"/>`;
  const line = `<path d="M${nose + 34} ${y - 2} C ${nose + 70} ${y - 8}, ${tail - 30} ${y - 4}, ${tail} ${y}" stroke-dasharray="1.5 4"/>`;
  return `<path d="${body}"/>${eye}${gill}${fin}${line}${opts.extra || ''}`;
}
const FISH = {
  slender: fishPath(20),
  deep: fishPath(30, { tail: 20 }),
  dory: fishPath(40, { tail: 18, extra: '<circle cx="88" cy="60" r="7"/><path d="M60 22 l6 -12 M74 20 l5 -13 M88 20 l4 -13 M102 22 l3 -12" />' }),
  turbot: `<path d="M24 60 C 40 18, 120 14, 150 52 L 176 40 Q 168 60 176 80 L 150 68 C 120 106, 40 102, 24 60 Z"/><circle cx="46" cy="52" r="2.2"/><circle cx="52" cy="46" r="2.2"/><path d="M34 60 Q 90 54 150 60" stroke-dasharray="1.5 4"/><g class="fish__dots"><circle cx="80" cy="44" r="1.3"/><circle cx="100" cy="74" r="1.3"/><circle cx="112" cy="48" r="1.3"/><circle cx="70" cy="78" r="1.3"/><circle cx="126" cy="64" r="1.3"/></g>`,
  lobster: `<ellipse cx="66" cy="60" rx="30" ry="15"/><path d="M96 54 q8 -2 14 0 v12 q-6 2 -14 0z M112 53 q8 -1 13 1 v12 q-5 2 -13 1z M127 54 q7 0 11 2 v8 q-4 2 -11 2z M140 56 q10 -4 22 -8 q-4 12 0 24 q-12 -4 -22 -8z"/><path d="M38 54 C 20 40, 6 30, 2 10 M38 66 C 20 80, 6 90, 2 110 M40 52 C 30 34, 30 22, 24 6 M40 68 C 30 86, 30 98, 24 114"/><path d="M56 74 l-6 16 M66 75 l-2 17 M76 74 l2 16 M56 46 l-6 -16 M66 45 l-2 -17 M76 46 l2 -16"/><circle cx="44" cy="56" r="1.8"/><circle cx="44" cy="64" r="1.8"/>`,
};
const fishSvg = (k) => `<svg class="fish" viewBox="0 0 200 120" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${FISH[k]}</svg>`;

/* ─────────────── blokovi ─────────────── */

function renderMenu(menu, t, lang) {
  const other = lang === 'en' ? 'sr' : 'en';
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'dj');
  const tabs = menu.categories.map((c, i) =>
    `<a class="mtabs__tab${i === 0 ? ' is-active' : ''}" href="#m-${c.id}" data-tab="${c.id}">${esc(c[lang])}</a>`).join('');

  const cats = menu.categories.map((c, ci) => {
    const items = c.items.map((it) => {
      const meta = [];
      if (it.weight) meta.push(`<span>${esc(it.weight.replace('kom', lang === 'en' ? 'pc' : 'kom'))}</span>`);
      if (it.posno) meta.push(`<span class="dish__posno" title="${esc(t.menu.posnoLegend)}">✦ ${esc(t.menu.posno)}</span>`);
      if (it.onRequest) meta.push(`<span class="dish__req">${esc(t.menu.onRequest)}</span>`);
      const note = it[lang === 'en' ? 'noteEn' : 'noteSr'];
      const search = norm(`${it.sr} ${it.en} ${c.sr} ${c.en} ${note || ''}`);
      return `<li class="dish" data-search="${esc(search)}"${it.posno ? ' data-posno="1"' : ''}>
  <div class="dish__body">
    <p class="dish__name">${esc(it[lang])}</p>
    ${lang === 'en' ? `<p class="dish__orig" lang="sr">${esc(it[other])}</p>` : ''}
    ${note ? `<p class="dish__note">${esc(note)}</p>` : ''}
    ${meta.length ? `<p class="dish__meta">${meta.join('<i aria-hidden="true">·</i>')}</p>` : ''}
  </div>
  <span class="dish__lead" aria-hidden="true"></span>
  <p class="dish__price"><span class="num">${formatPrice(it.price, lang)}</span> <abbr title="${lang === 'en' ? 'Serbian dinar' : 'srpski dinar'}">RSD</abbr>${it.perKg ? `<small>${esc(t.menu.perKg)}</small>` : ''}</p>
</li>`;
    }).join('\n');
    return `<section class="mcat" id="m-${c.id}" data-cat="${c.id}" aria-labelledby="mh-${c.id}">
  <header class="mcat__head"><span class="mcat__no">${String(ci + 1).padStart(2, '0')}</span><h3 class="mcat__title" id="mh-${c.id}">${esc(c[lang])}</h3>${lang === 'en' ? `<span class="mcat__orig" lang="sr">${esc(c.sr)}</span>` : ''}</header>
  <ul class="mcat__list" role="list">${items}</ul>
</section>`;
  }).join('\n');

  return `<div class="menu-tools" role="search">
  <label class="msearch"><span class="sr-only">${esc(t.menu.search)}</span>
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
    <input type="search" id="menu-search" placeholder="${esc(t.menu.searchPh)}" autocomplete="off" enterkeyhint="search">
  </label>
  <button type="button" class="mfilter" id="menu-posno" aria-pressed="false"><span aria-hidden="true">✦</span> ${esc(t.menu.posno)}</button>
</div>
<nav class="mtabs" aria-label="${esc(t.menu.categories)}"><div class="mtabs__track">${tabs}</div></nav>
<div class="menu-card">
  <div class="menu-card__rope" aria-hidden="true"></div>
  ${cats}
  <p class="menu-empty" id="menu-empty" hidden>${esc(t.menu.noResults)}</p>
  <p class="menu-foot"><span>✦ ${esc(t.menu.posnoLegend)}</span><span>${esc(t.menu.footnote)}</span></p>
</div>`;
}

const SCI = {
  'Brancin/Orada': ['Dicentrarchus labrax · Sparus aurata', 'slender'],
  Romb: ['Scophthalmus maximus', 'turbot'],
  Zubatac: ['Dentex dentex', 'deep'],
  'San Pjer': ['Zeus faber', 'dory'],
};
function renderCatch(menu, t, lang) {
  const fish = menu.categories.flatMap((c) => c.items).filter((i) => i.perKg);
  return fish.map((f, i) => {
    const [sci, art] = SCI[f.sr] || ['Palinurus elephas · Homarus gammarus', 'lobster'];
    const name = lang === 'en' ? f.en.replace(/^Whole /, '') : f.sr.replace(/ na taljatelama ili gratiniran$/, '');
    const sub = lang === 'en' ? (f.sr.split(' na ')[0]) : '';
    const desc = f.sr.includes('taljatel') ? (lang === 'en' ? 'With tagliatelle or gratinéed' : 'Na taljatelama ili gratiniran') : '';
    return `<li class="catch__card" style="--i:${i}">
  <span class="catch__no">№ ${String(i + 1).padStart(2, '0')}</span>
  <div class="catch__art">${fishSvg(art)}</div>
  <h3 class="catch__name mirror-word" data-text="${esc(name)}">${esc(name)}<span class="mirror-word__r" aria-hidden="true">${esc(name)}</span></h3>
  ${sub && sub !== name ? `<p class="catch__orig" lang="sr">${esc(sub)}</p>` : ''}
  <p class="catch__sci">${esc(sci)}</p>
  ${desc ? `<p class="catch__desc">${esc(desc)}</p>` : ''}
  <p class="catch__price"><span class="num">${formatPrice(f.price, lang)}</span> RSD <small>/ ${esc(t.catch.perKg)}</small></p>
  ${f.onRequest ? `<p class="catch__req">${esc(t.catch.onRequest)}</p>` : ''}
</li>`;
  }).join('\n');
}

function findItem(menu, sr) {
  for (const c of menu.categories) for (const i of c.items) if (i.sr === sr) return i;
  throw new Error(`Jelo „${sr}" nije pronađeno u menu.json`);
}

function renderHours(config, t) {
  return `<ul class="hours__list" role="list">${hoursRows(config, t.days).map((r) =>
    `<li data-days="${r.days.join(',')}"><span>${esc(r.label)}</span><span class="num">${esc(r.time)}</span></li>`).join('')}</ul>`;
}

function renderGallery(images, t) {
  const items = [
    ['morska-plata', t.img.plata, 'l'],
    ['pasta-terasa', t.img.pasta, 'p'],
    ['bruskete-malvazija', t.img.bruskete, 'm'],
    ['frame-1', t.img.frame, 'v'],
    ['file-bele-ribe', t.img.file, 'l'],
    ['frame-2', t.img.frame, 'v'],
    ['gambori-njoke', t.img.gambori, 's'],
    ['frame-3', t.img.frame, 'v'],
    ['frame-4', t.img.frame, 'v'],
  ].filter(([n]) => !n.startsWith('frame-') || images[n]);
  return items.map(([n, alt, size], i) => `<li class="gal__item gal__item--${size}" style="--d:${(i % 4) * 0.7}s">
  <button type="button" class="gal__btn" data-full="${images[n] ? `/assets/images/opt/${n}-${images[n].widths.at(-1)}.webp` : ''}" aria-label="${esc(t.gallery.open)}: ${esc(alt)}"${images[n] ? '' : ' disabled'}>
    ${picture(images, n, { alt, sizes: size === 'l' ? '(min-width: 900px) 46vw, 80vw' : '(min-width: 900px) 28vw, 64vw' })}
  </button>
</li>`).join('\n');
}

function jsonLd(config, t, lang) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: config.name,
    url: config.siteUrl + (lang === 'en' ? '/en/' : '/'),
    image: `${config.siteUrl}/og-image.jpg`,
    logo: `${config.siteUrl}/assets/brand/logo.svg`,
    telephone: config.phone.e164,
    priceRange: config.priceRange.symbol,
    servesCuisine: config.cuisine,
    acceptsReservations: true,
    hasMenu: `${config.siteUrl}${lang === 'en' ? '/en/' : '/'}#jelovnik`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: config.address.street,
      postalCode: config.address.postalCode,
      addressLocality: config.address.city,
      addressCountry: config.address.country,
    },
    openingHoursSpecification: config.hours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days.map((d) => `https://schema.org/${dayNames[d]}`),
      opens: h.open,
      closes: h.close,
    })),
    aggregateRating: { '@type': 'AggregateRating', ratingValue: config.rating.value, reviewCount: config.rating.count, bestRating: 5 },
    sameAs: [config.links.instagram],
  };
}

/* ─────────────── glavni render ─────────────── */

export async function renderPage(template, lang) {
  const config = await loadConfig();
  const t = readJSON(`src/i18n/${lang}.json`);
  const menu = readJSON('src/data/menu.json');
  const images = readJSON('src/generated/images.json');
  const video = readJSON('src/generated/video.json', null);
  const logo = fs.existsSync(path.join(ROOT, 'src/generated/logo-inline.svg')) ? read('src/generated/logo-inline.svg') : '';
  const hrefSr = '/';
  const hrefEn = '/en/';

  const priceOf = (sr) => formatPrice(findItem(menu, sr).price, lang);
  const blocks = {
    menu: () => renderMenu(menu, t, lang),
    catch: () => renderCatch(menu, t, lang),
    hours: () => renderHours(config, t),
    gallery: () => renderGallery(images, t),
    logo: (a) => logo.replace('<svg ', `<svg class="${a.class || ''}" `).replace(/id="logo-t"/, `id="logo-t-${a.id || 'x'}"`).replace(/aria-labelledby="logo-t"/, `aria-labelledby="logo-t-${a.id || 'x'}"`),
    img: (a) => picture(images, a.name, { alt: get(t, a.alt) || '', sizes: a.sizes, cls: a.class || '', eager: a.eager === 'true', ratio: a.ratio }),
    price: (a) => priceOf(a.dish),
    jsonld: () => `<script type="application/ld+json">${JSON.stringify(jsonLd(config, t, lang))}</script>`,
    i18n: () => `<script type="application/json" id="i18n">${JSON.stringify({ lang, contact: t.contact, days: t.days, menu: t.menu, gallery: t.gallery, nav: t.nav }).replace(/</g, '\\u003c')}</script>`,
    config: () => `<script type="application/json" id="site-config">${JSON.stringify({ phone: config.phone, reservations: config.reservations, hours: config.hours, timezone: config.timezone, links: config.links, video: video ? { intro: video.intro.duration, hero: video.hero.duration } : null }).replace(/</g, '\\u003c')}</script>`,
    langswitch: () => `<a href="${hrefSr}" hreflang="sr" lang="sr"${lang === 'sr' ? ' aria-current="true"' : ''}>SR</a><span aria-hidden="true">/</span><a href="${hrefEn}" hreflang="en" lang="en"${lang === 'en' ? ' aria-current="true"' : ''}>EN</a>`,
    hreflang: () => ['sr', 'en'].map((l) => `<link rel="alternate" hreflang="${l}" href="${config.siteUrl}${l === 'en' ? hrefEn : hrefSr}">`).join('') + `<link rel="alternate" hreflang="x-default" href="${config.siteUrl}/">`,
    canonical: () => `${config.siteUrl}${lang === 'en' ? hrefEn : hrefSr}`,
    year: () => String(new Date().getFullYear()),
    hasvideo: () => (video ? 'true' : 'false'),
    'hero-poster': () => video
      ? `<picture class="hero__poster"><source media="(orientation: portrait)" srcset="/assets/video/hero-portrait-poster.jpg"><img src="/assets/video/hero-landscape-poster.jpg" alt="" fetchpriority="high" decoding="async"></picture>`
      : '',
    homehref: () => (lang === 'en' ? hrefEn : hrefSr),
  };

  let html = template;
  // <!--@blok atr="vrednost" ...-->
  html = html.replace(/<!--@([a-z0-9-]+)((?:\s+[a-z-]+="[^"]*")*)\s*-->/g, (m, name, attrs) => {
    if (name === 'page') return '';
    const a = Object.fromEntries([...attrs.matchAll(/([a-z-]+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
    if (!blocks[name]) throw new Error(`Nepoznat blok @${name}`);
    return blocks[name](a);
  });
  // {{ cfg:putanja }}
  html = html.replace(/\{\{\s*cfg:([\w.]+)(\|url)?\s*\}\}/g, (m, k, url) => (url ? encodeURIComponent(get(config, k)) : esc(get(config, k))));
  // {{ kljuc }}
  html = html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => {
    const v = get(t, k);
    if (v === undefined) throw new Error(`Nedostaje prevod „${k}" (${lang}.json)`);
    return esc(v);
  });
  const left = html.match(/<!--@[^>]*-->/);
  if (left) throw new Error(`Neobrađen blok: ${left[0]}`);
  html = html.replace('<html lang="sr">', `<html lang="${lang}">`);
  return html;
}

/* ─────────────── Vite plugin ─────────────── */
export default function sitePlugin() {
  let outDir = 'dist';
  return {
    name: 'rrgr-site',
    configResolved(c) { outDir = c.build.outDir; },
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        const m = html.match(/<!--@page lang="(\w+)"-->/);
        if (m) return renderPage(read('index.html'), m[1]);
        return renderPage(html, 'sr');
      },
    },
    handleHotUpdate({ file, server }) {
      if (/src[\\/](i18n|data|generated)|config\.js$|index\.html$/.test(file)) server.ws.send({ type: 'full-reload' });
    },
    async generateBundle() {
      const config = await loadConfig();
      const today = new Date().toISOString().slice(0, 10);
      const url = (p) => `  <url><loc>${config.siteUrl}${p}</loc><lastmod>${today}</lastmod>` +
        `<xhtml:link rel="alternate" hreflang="sr" href="${config.siteUrl}/"/><xhtml:link rel="alternate" hreflang="en" href="${config.siteUrl}/en/"/></url>`;
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${url('/')}\n${url('/en/')}\n</urlset>\n` });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${config.siteUrl}/sitemap.xml\n` });
    },
    closeBundle() {
      // sirovi snimci i originali ne idu na server
      const dist = path.resolve(ROOT, outDir);
      fs.rmSync(path.join(dist, 'assets/video/raw'), { recursive: true, force: true });
      // originalne fotografije (koriste se samo optimizovane iz /opt)
      const imgDir = path.join(dist, 'assets/images');
      if (fs.existsSync(imgDir)) for (const f of fs.readdirSync(imgDir)) if (/\.(jpe?g|png)$/i.test(f)) fs.rmSync(path.join(imgDir, f));
    },
  };
}
