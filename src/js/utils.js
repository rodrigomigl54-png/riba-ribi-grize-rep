/** Male pomoćne funkcije koje koriste svi moduli. */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isFinePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

/** Da li je uređaj dovoljno jak za WebGL i teže efekte. */
export function isCapableDevice() {
  const c = navigator.connection;
  if (c && (c.saveData || /2g/.test(c.effectiveType || ''))) return false;
  if (navigator.deviceMemory && navigator.deviceMemory < 4) return false;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return false;
  return true;
}

/** sessionStorage/localStorage mogu baciti grešku (privatni režim, blokirani kolačići). */
export const store = {
  get(key, session = true) {
    try { return (session ? sessionStorage : localStorage).getItem(key); } catch { return null; }
  },
  set(key, val, session = true) {
    try { (session ? sessionStorage : localStorage).setItem(key, val); } catch { /* ignoriši */ }
  },
};

function readJSON(id) {
  try { return JSON.parse(document.getElementById(id)?.textContent || '{}'); } catch { return {}; }
}
/** Prevodi potrebni JS-u (ubacuje ih build u stranicu) i konfiguracija iz src/config.js. */
export const i18n = readJSON('i18n');
export const siteConfig = readJSON('site-config');
export const lang = document.documentElement.lang || 'sr';

/** Normalizacija za pretragu: bez dijakritika, mala slova. */
export const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'dj').trim();
