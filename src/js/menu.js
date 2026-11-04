/**
 * Jelovnik: pretraga (bez obzira na č/ć/š…), filter „Posno", lepljivi tabovi kategorija
 * sa automatskim označavanjem kategorije koja je trenutno na ekranu.
 * Sadržaj je već u HTML-u (generiše ga build iz src/data/menu.json).
 */
import { $, $$, normalize } from './utils.js';

export function initMenu() {
  const search = $('#menu-search');
  const posnoBtn = $('#menu-posno');
  const empty = $('#menu-empty');
  const cats = $$('.mcat');
  const tabs = $$('.mtabs__tab');
  const nav = $('.mtabs');
  if (!search || !cats.length) return;

  let posno = false;

  function apply() {
    // srpski padeži: „hobotnica“ nalazi i „hobotnice“ (poredi se bez poslednjeg slova)
    const tokens = normalize(search.value).split(/\s+/).filter(Boolean).map((t) => (t.length > 4 ? t.slice(0, -1) : t));
    let total = 0;
    cats.forEach((cat) => {
      let visible = 0;
      $$('.dish', cat).forEach((d) => {
        const hay = d.dataset.search;
        const ok = (!posno || d.dataset.posno === '1') && tokens.every((t) => hay.includes(t));
        d.hidden = !ok;
        if (ok) visible++;
      });
      cat.hidden = visible === 0;
      tabs.find((t) => t.dataset.tab === cat.dataset.cat)?.classList.toggle('is-empty', visible === 0);
      total += visible;
    });
    empty.hidden = total > 0;
    window.dispatchEvent(new Event('resize')); // ScrollTrigger preračunava pozicije
  }

  let timer;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(apply, 120); });
  search.addEventListener('keydown', (e) => { if (e.key === 'Escape') { search.value = ''; apply(); } });
  posnoBtn.addEventListener('click', () => {
    posno = !posno;
    posnoBtn.setAttribute('aria-pressed', String(posno));
    apply();
  });

  /* aktivni tab = kategorija na ekranu */
  const track = $('.mtabs__track');
  const setActive = (id) => {
    tabs.forEach((t) => {
      const on = t.dataset.tab === id;
      t.classList.toggle('is-active', on);
      if (on) {
        t.setAttribute('aria-current', 'true');
        // tab u vidno polje trake (horizontalno), bez pomeranja stranice
        const left = t.offsetLeft - track.clientWidth / 2 + t.clientWidth / 2;
        track.scrollTo({ left, behavior: 'smooth' });
      } else t.removeAttribute('aria-current');
    });
  };
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.dataset.cat); });
  }, { rootMargin: '-30% 0px -60% 0px' });
  cats.forEach((c) => spy.observe(c));

  /* senka ispod trake kad se „zalepi" */
  const sentinel = document.createElement('div');
  sentinel.style.cssText = 'height:1px;margin-top:-1px';
  nav.before(sentinel);
  new IntersectionObserver(([e]) => nav.classList.toggle('is-stuck', !e.isIntersecting && e.boundingClientRect.top < 0)).observe(sentinel);
}
