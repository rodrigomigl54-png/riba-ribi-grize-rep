/**
 * Hero video u petlji. Učitava se samo ako postoji (manifest iz build-video.sh),
 * nije uključeno smanjeno kretanje i nije uključena ušteda podataka.
 * Pauzira se kad hero nije na ekranu.
 */
import { $, prefersReducedMotion } from './utils.js';
import { makeVideo, orientation } from './video-src.js';

export function initHeroVideo() {
  const wrap = $('.hero__media');
  if (!wrap || wrap.dataset.video !== 'true' || prefersReducedMotion()) return;
  if (navigator.connection?.saveData) return;

  let video;
  const mount = () => {
    video?.remove();
    video = makeVideo('hero', { loop: true });
    video.addEventListener('playing', () => {
      video.classList.add('is-playing');
      // posle pretapanja, ispod videa više ne treba animirana voda
      setTimeout(() => wrap.classList.add('has-video'), 1300);
    }, { once: true });
    wrap.appendChild(video);
    video.play().catch(() => {});
  };
  // dok traje intro, ceo protok ide intro snimku; hero petlja se učitava kad intro krene da nestaje
  if (document.documentElement.classList.contains('intro-on')) {
    document.addEventListener('rr:intro-done', mount, { once: true });
  } else {
    mount();
  }

  // promena orijentacije (telefon okrenut) → druga verzija snimka
  let last = orientation();
  window.addEventListener('resize', () => {
    const o = orientation();
    if (o !== last) { last = o; mount(); }
  });

  new IntersectionObserver(([e]) => {
    if (!video) return;
    if (e.isIntersecting) video.play().catch(() => {}); else video.pause();
  }).observe(wrap);
}
