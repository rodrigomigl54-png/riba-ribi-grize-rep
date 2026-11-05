/**
 * INTRO — montažni snimak preko celog ekrana, pred kraj logo, pa „zaron" u landing.
 * - prikazuje se jednom po sesiji (sessionStorage, u try/catch)
 * - nikad uz prefers-reduced-motion (odluka se donosi već u <head>, vidi index.html)
 * - dugme „Preskoči" i taster Esc
 * - bez videa (dok ga vlasnik ne doda) igra se kratka verzija: voda + logo
 */
import { gsap } from 'gsap';
import { $, $$, store, svgCenter } from './utils.js';
import { makeVideo } from './video-src.js';

export function initIntro({ onDone }) {
  const root = document.documentElement;
  const intro = $('#intro');
  if (!intro || !root.classList.contains('intro-on')) { onDone(); return; }

  store.set('rr-intro', '1');
  const logo = $('.intro__logo', intro);
  // logo se klonira iz hero-a (u HTML-u postoji samo jednom)
  const heroLogo = $('.hero__logo');
  if (heroLogo) {
    const clone = heroLogo.cloneNode(true);
    clone.setAttribute('class', 'logo-anim');
    clone.removeAttribute('aria-labelledby');
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelector('title')?.remove();
    clone.style.opacity = '';
    logo.appendChild(clone);
  }
  const skipBtn = $('#intro-skip');
  let finished = false;
  let logoShown = false;

  // Fokus na „Preskoči" za korisnike tastature
  intro.removeAttribute('aria-hidden');
  intro.setAttribute('role', 'dialog');
  intro.setAttribute('aria-label', 'Intro');
  skipBtn.focus({ preventScroll: true });

  const showLogo = () => {
    if (logoShown) return;
    logoShown = true;
    const rows = $$('.logo-row', logo);
    const mirrored = $$('.logo-row2, .logo-row4', logo);
    gsap.timeline()
      .to('.intro__shade', { opacity: 1, duration: 1.2, ease: 'power2.out' }, 0)
      .fromTo(logo, { opacity: 0, scale: 0.86, rotate: -40 }, { opacity: 1, scale: 1, rotate: 0, duration: 1.4, ease: 'expo.out' }, 0)
      .from($$('.logo-rope', logo), { opacity: 0, rotate: 90, transformOrigin: '50% 50%', duration: 1.6, ease: 'expo.out' }, 0.05)
      .from(rows, { opacity: 0, y: 14, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.2)
      // reči RIBI i REP prvo stoje uspravno, pa se „okrenu" u odraz
      .fromTo(mirrored, { scaleX: -1, svgOrigin: svgCenter }, { scaleX: 1, svgOrigin: svgCenter, clearProps: 'transform', duration: 1, ease: 'power3.inOut', stagger: 0.15 }, 0.7);
  };

  const dive = (fast = false) => {
    if (finished) return;
    finished = true;
    root.classList.remove('intro-playing'); // stranica ispod intra ponovo se iscrtava (za „zaron")
    document.dispatchEvent(new Event('rr:intro-done')); // hero video tek sada počinje da se učitava
    const hero = $('.hero');
    const tl = gsap.timeline({
      onComplete: () => {
        intro.remove();
        root.classList.remove('intro-on');
      },
    });
    // hero počinje da se pojavljuje dok površina još prolazi iznad
    tl.call(onDone, null, fast ? 0.35 : 0.8);
    if (!logoShown && !fast) showLogo();
    // površina vode prolazi iznad kamere: intro odlazi gore sa talasastom ivicom
    tl.to(logo, { scale: 1.25, opacity: 0, duration: fast ? 0.5 : 0.9, ease: 'power2.in' }, 0)
      .fromTo(hero, { scale: 1.08, filter: 'blur(10px)' }, { scale: 1, filter: 'blur(0px)', duration: fast ? 1 : 1.6, ease: 'power3.out', clearProps: 'filter,transform' }, fast ? 0.15 : 0.35)
      .to(intro, { yPercent: -112, duration: fast ? 0.9 : 1.4, ease: 'power3.inOut' }, fast ? 0 : 0.25)
      .to('.intro__edge path', { attr: { d: 'M0 0H1440V30C1320 120 1200 10 1080 70S840 120 720 40 480 10 360 90 120 60 0 30Z' }, duration: fast ? 0.9 : 1.4, ease: 'sine.inOut' }, '<');
  };

  skipBtn.addEventListener('click', () => dive(true));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') dive(true); });

  const fallback = () => {
    // kratka verzija bez videa: montaža fotografija (ako postoje) → logo → zaron
    const photos = $$('.intro__photos img', intro);
    if (photos.length) {
      const tl = gsap.timeline();
      photos.forEach((img, k) => {
        tl.to(img, { opacity: 1, duration: 0.7, ease: 'power2.out' }, k * 0.9)
          .to(img, { scale: 1, duration: 2.2, ease: 'none' }, k * 0.9);
      });
      const end = photos.length * 0.9;
      gsap.delayedCall(Math.max(0.3, end - 1.1), showLogo);
      gsap.delayedCall(end + 1.6, () => dive());
      return;
    }
    gsap.delayedCall(0.3, showLogo);
    gsap.delayedCall(3.4, () => dive());
  };

  if (intro.dataset.video !== 'true') { fallback(); return; }

  const holder = $('.intro__video', intro);
  const v = makeVideo('intro');
  holder.appendChild(v);   // poster (prvi kadar) se vidi odmah, dok se video učitava

  let started = false;
  // na sporijem internetu video ima do 12 s da krene; tek onda kratka verzija bez videa
  let giveUp = setTimeout(() => { if (!started) { v.remove(); fallback(); } }, 12000);
  v.addEventListener('playing', () => {
    intro.classList.remove('is-waiting');
    if (started) return;
    started = true;
    clearTimeout(giveUp);
    $('.intro__play', intro)?.remove();
  });
  v.addEventListener('waiting', () => intro.classList.add('is-waiting'));
  v.addEventListener('timeupdate', () => {
    if (v.duration && v.currentTime > v.duration - 3) showLogo();
  });
  v.addEventListener('ended', () => dive());
  v.addEventListener('error', () => { if (!started) { clearTimeout(giveUp); fallback(); } }, true);
  intro.classList.add('is-waiting');
  v.play().catch((err) => {
    if (!err || err.name !== 'NotAllowedError') return;
    // telefon blokira automatsko puštanje (npr. štednja baterije) → dugme „Pusti"
    clearTimeout(giveUp);
    intro.classList.remove('is-waiting');
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'intro__play';
    play.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><span>' + (document.documentElement.lang === 'en' ? 'Play' : 'Pusti') + '</span>';
    play.addEventListener('click', () => {
      v.play().catch(() => fallback());
      giveUp = setTimeout(() => { if (!started) { v.remove(); fallback(); } }, 12000);
    });
    $('.intro__stage', intro).appendChild(play);
    play.focus({ preventScroll: true });
  });
}
