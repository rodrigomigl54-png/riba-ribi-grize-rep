/**
 * Jelovnik:
 *  - KORMILO kategorija: kategorije su „ručke" brodskog kormila; okreće se prevlačenjem
 *    (miš ili prst), strelicama, tasterima ← → ili klikom na kategoriju. Izabrana je gore.
 *  - TRAKA jela izabrane kategorije: lista se levo-desno (prevlačenje, dugmad, tastatura).
 *  - Pretraga (bez obzira na č/ć/š i padeže) i filter „Posno".
 * Sav sadržaj je već u HTML-u (build ga pravi iz src/data/menu.json); bez JS-a se vide sve kategorije.
 */
import { $, $$, normalize, i18n, isFinePointer, prefersReducedMotion } from './utils.js';

/** Prevlačenje mišem za horizontalne trake (na dodir radi nativni skrol). */
export function dragScroll(el) {
  if (!isFinePointer()) return;
  let down = false, startX = 0, startLeft = 0, vx = 0, lastX = 0, moved = false, raf = 0;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true; moved = false; startX = lastX = e.clientX; startLeft = el.scrollLeft; vx = 0;
    cancelAnimationFrame(raf);
  });
  el.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 5) { moved = true; el.classList.add('is-drag'); el.setPointerCapture(e.pointerId); }
    vx = e.clientX - lastX; lastX = e.clientX;
    if (moved) el.scrollLeft = startLeft - dx;
  });
  const end = () => {
    if (!down) return;
    down = false;
    const glide = () => {
      vx *= 0.93; el.scrollLeft -= vx;
      if (Math.abs(vx) > 0.4) raf = requestAnimationFrame(glide); else el.classList.remove('is-drag');
    };
    raf = requestAnimationFrame(glide);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
}

export function initMenu() {
  const helm = $('#helm');
  const view = $('.helm__view', helm);
  const wheel = $('#helm-wheel');
  const tabs = $$('.helm__item', helm);
  const panels = $$('.mpanel:not(.mpanel--results)');
  const results = $('#m-results');
  const resultsList = $('#menu-results');
  const resultsCount = $('#menu-results-count');
  const empty = $('#menu-empty');
  const search = $('#menu-search');
  const posnoBtn = $('#menu-posno');
  const prevBtn = $('#mtrack-prev');
  const nextBtn = $('#mtrack-next');
  const bar = $('#mtrack-progress');
  if (!helm || !tabs.length) return;

  const n = tabs.length;
  const step = 360 / n;
  const rm = prefersReducedMotion();
  let index = 0;
  let angle = 0;           // ukupna rotacija (može preći 360°, da se točak vrti u krug)
  let posno = false;
  let query = [];

  const setAngle = (a) => { angle = a; wheel.style.setProperty('--rot', `${a}deg`); };
  const activeTrack = () => $('.mtrack', results.hidden ? panels[index] : results);

  /* ---- izbor kategorije ---- */
  function select(i, { focus = false, fromDrag = false } = {}) {
    const next = ((i % n) + n) % n;
    // najkraći put oko točka
    let target = -i * step;
    if (!fromDrag) {
      const cur = angle;
      const base = -next * step;
      const k = Math.round((cur - base) / 360);
      target = base + k * 360;
    }
    setAngle(target);
    if (next === index && !fromDrag && panels[next].classList.contains('is-active')) { if (focus) tabs[next].focus(); return; }
    index = next;
    tabs.forEach((t, k) => {
      const on = k === index;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach((p, k) => p.classList.toggle('is-active', k === index));
    const panel = panels[index];
    if (!rm) {
      $$('.dish', panel).forEach((d, k) => d.style.setProperty('--k', String(Math.min(k, 6))));
      panel.classList.remove('is-enter'); void panel.offsetWidth; panel.classList.add('is-enter');
    }
    $('.mtrack', panel).scrollLeft = 0;
    if (focus) tabs[index].focus({ preventScroll: true });
    updateNav();
  }

  tabs.forEach((t, i) => t.addEventListener('click', () => { if (!dragMoved) select(i); }));
  $$('.helm__arrow', helm).forEach((b) => b.addEventListener('click', () => select(index + Number(b.dataset.dir))));
  helm.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); select(index + 1, { focus: true }); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); select(index - 1, { focus: true }); }
    if (e.key === 'Home') { e.preventDefault(); select(0, { focus: true }); }
    if (e.key === 'End') { e.preventDefault(); select(n - 1, { focus: true }); }
  });

  /* ---- okretanje kormila prevlačenjem (miš i prst) ---- */
  let dragging = false, dragMoved = false, sx = 0, sy = 0, startAngle = 0, pid = null;
  view.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true; dragMoved = false; sx = e.clientX; sy = e.clientY; startAngle = angle; pid = e.pointerId;
  });
  view.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pid) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!dragMoved) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { dragging = false; return; } // vertikalni skrol stranice
      if (Math.abs(dx) < 6) return;
      dragMoved = true; view.classList.add('is-drag'); view.setPointerCapture(pid);
    }
    // 1 px prevlačenja ≈ deo stepena, zavisno od veličine točka
    const deg = dx * (360 / (Math.PI * wheel.offsetWidth)) * 1.6;
    setAngle(startAngle + deg);
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    view.classList.remove('is-drag');
    if (dragMoved) {
      const i = Math.round(-angle / step);
      setAngle(-i * step);
      select(i, { fromDrag: true });
      setTimeout(() => { dragMoved = false; }, 0);
    }
  };
  view.addEventListener('pointerup', endDrag);
  view.addEventListener('pointercancel', endDrag);

  /* ---- traka jela ---- */
  $$('.mtrack').forEach((tr) => {
    dragScroll(tr);
    tr.addEventListener('scroll', updateNav, { passive: true });
    tr.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1); }
    });
  });
  function move(dir) {
    const tr = activeTrack();
    const card = $('.dish:not([hidden])', tr);
    const w = card ? card.offsetWidth + 16 : 300;
    const perView = Math.max(1, Math.floor(tr.clientWidth / w));
    tr.scrollBy({ left: dir * w * perView, behavior: rm ? 'auto' : 'smooth' });
  }
  prevBtn?.addEventListener('click', () => move(-1));
  nextBtn?.addEventListener('click', () => move(1));
  function updateNav() {
    const tr = activeTrack();
    if (!tr) return;
    const max = tr.scrollWidth - tr.clientWidth;
    const size = Math.min(1, tr.clientWidth / Math.max(1, tr.scrollWidth));
    const p = max > 0 ? tr.scrollLeft / max : 1;
    bar?.style.setProperty('--p', String(size + (1 - size) * p));
    if (prevBtn) prevBtn.disabled = tr.scrollLeft < 4;
    if (nextBtn) nextBtn.disabled = tr.scrollLeft > max - 4;
  }
  window.addEventListener('resize', updateNav);

  /* ---- pretraga i posno ---- */
  function apply() {
    const searching = query.length > 0;
    let total = 0;
    if (searching) {
      // rezultati iz svih kategorija u posebnoj traci
      resultsList.replaceChildren();
      $$('.mpanel:not(.mpanel--results) .dish').forEach((d) => {
        const ok = (!posno || d.dataset.posno === '1') && query.every((q) => d.dataset.search.includes(q));
        if (ok) { const c = d.cloneNode(true); c.hidden = false; resultsList.appendChild(c); total++; }
      });
      resultsCount.textContent = `${total} ${i18n.menu?.count || ''}`;
      results.hidden = total === 0;
      panels.forEach((p) => p.classList.remove('is-active'));
      helm.classList.add('is-muted');
    } else {
      results.hidden = true;
      helm.classList.remove('is-muted');
      panels.forEach((p, k) => {
        p.classList.toggle('is-active', k === index);
        let visible = 0;
        $$('.dish', p).forEach((d) => { d.hidden = posno && d.dataset.posno !== '1'; if (!d.hidden) visible++; });
        if (k === index) total = visible;
      });
    }
    empty.hidden = total > 0;
    activeTrack() && (activeTrack().scrollLeft = 0);
    updateNav();
  }
  let timer;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      // srpski padeži: „hobotnica" nalazi i „hobotnice" (poredi se bez poslednjeg slova)
      query = normalize(search.value).split(/\s+/).filter(Boolean).map((t) => (t.length > 4 ? t.slice(0, -1) : t));
      apply();
    }, 120);
  });
  search.addEventListener('keydown', (e) => { if (e.key === 'Escape') { search.value = ''; query = []; apply(); } });
  posnoBtn.addEventListener('click', () => {
    posno = !posno;
    posnoBtn.setAttribute('aria-pressed', String(posno));
    apply();
  });

  // kad se izabere kategorija tokom pretrage, pretraga se briše
  tabs.forEach((t) => t.addEventListener('click', () => { if (query.length) { search.value = ''; query = []; apply(); } }));

  // početno stanje + lagano „pozdravno" okretanje kad jelovnik uđe u ekran
  setAngle(0);
  updateNav();
  if (!rm) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      wheel.style.transition = 'none';
      setAngle(90);
      requestAnimationFrame(() => requestAnimationFrame(() => { wheel.style.transition = ''; setAngle(0); }));
    }, { threshold: 0.4 });
    io.observe(helm);
  }
}
