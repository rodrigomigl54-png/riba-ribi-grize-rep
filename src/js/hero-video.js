/**
 * Hero video u petlji (snimci restorana). Učitava se ako postoji (manifest iz build-video.sh).
 * - Radi i uz „Smanji pokret" (vlasnik želi video), ali uvek postoji dugme za pauzu.
 * - Ako telefon blokira automatsko puštanje (štednja baterije/podataka), video kreće
 *   na prvi dodir ekrana.
 * - Pauzira se kad hero nije na ekranu; učitava se tek kad intro krene da nestaje.
 */
import { $, i18n } from './utils.js';
import { makeVideo, orientation } from './video-src.js';

export function initHeroVideo() {
  const wrap = $('.hero__media');
  if (!wrap || wrap.dataset.video !== 'true') return;
  const t = i18n.hero || {};

  let video;
  let userPaused = false;

  // dugme pauza/pusti (pristupačnost: video koji se sam pušta mora moći da se zaustavi)
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'hero__toggle';
  btn.hidden = true;
  const setBtn = (playing) => {
    btn.setAttribute('aria-label', playing ? (t.pause || 'Pauza') : (t.play || 'Pusti'));
    btn.innerHTML = playing
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  };
  setBtn(false);
  btn.addEventListener('click', () => {
    if (!video) return;
    if (video.paused) { userPaused = false; video.play().catch(() => {}); } else { userPaused = true; video.pause(); }
  });
  $('.hero').appendChild(btn);

  const tryPlay = () => {
    if (!video || userPaused) return;
    video.play().catch(() => {
      // autoplay blokiran → pusti na prvi dodir/klik bilo gde
      const kick = () => { if (video && !userPaused) video.play().catch(() => {}); };
      document.addEventListener('touchstart', kick, { once: true, passive: true });
      document.addEventListener('click', kick, { once: true });
    });
  };

  const mount = () => {
    video?.remove();
    video = makeVideo('hero', { loop: true });
    video.addEventListener('playing', () => {
      video.classList.add('is-playing');
      btn.hidden = false;
      setBtn(true);
      // posle pretapanja, ispod videa više ne treba animirana voda
      setTimeout(() => wrap.classList.add('has-video'), 1300);
    });
    video.addEventListener('pause', () => setBtn(false));
    video.addEventListener('play', () => setBtn(true));
    wrap.appendChild(video);
    tryPlay();
  };
  // dok traje intro, ceo protok ide intro snimku; hero petlja se učitava kad intro krene da nestaje
  if (document.documentElement.classList.contains('intro-on')) {
    document.addEventListener('rr:intro-done', mount, { once: true });
  } else {
    // posle učitavanja stranice (do tada se vidi prvi kadar videa kao poster) — brži start
    const later = () => (window.requestIdleCallback ? requestIdleCallback(mount, { timeout: 1500 }) : setTimeout(mount, 300));
    if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
  }

  // promena orijentacije (telefon okrenut) → druga verzija snimka
  let last = orientation();
  window.addEventListener('resize', () => {
    const o = orientation();
    if (o !== last) { last = o; mount(); }
  });

  new IntersectionObserver(([e]) => {
    if (!video) return;
    if (e.isIntersecting) tryPlay(); else video.pause();
  }).observe(wrap);
}
