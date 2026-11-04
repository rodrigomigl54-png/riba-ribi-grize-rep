/**
 * Kretanje: Lenis (glatki skrol) + GSAP ScrollTrigger.
 *  - „skrol kao zaron": svetlo i čestice u dubini (depth.js)
 *  - ogledalski naslovi se „okreću" kao odraz kad uđu u ekran
 *  - galerija na desktopu pluta horizontalno dok se skroluje
 * Uz prefers-reduced-motion: nativni skrol, bez animacija, sve odmah vidljivo.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { $, $$, prefersReducedMotion, isFinePointer, isCapableDevice } from './utils.js';
import { initDepth } from './depth.js';

gsap.registerPlugin(ScrollTrigger);

export function initMotion() {
  const rm = prefersReducedMotion();
  const navOffset = () => -(document.querySelector('#nav')?.offsetHeight || 72);

  if (rm) {
    $$('.reveal').forEach((el) => el.classList.add('is-in'));
    return {
      scrollTo: (t) => (t === document.body ? window.scrollTo(0, 0) : t.scrollIntoView()),
      stop() {},
      start() {},
      playHero() {},
      lenis: null,
    };
  }

  /* --- Lenis --- */
  const lenis = new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 0.95 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  if (document.documentElement.classList.contains('intro-on')) lenis.stop();

  /* --- reveal pri ulasku u ekran --- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  /* --- ogledalski naslovi: reč izranja, odraz se prevrće preko vodene linije --- */
  $$('.mtitle').forEach((t) => {
    const w = $('.mtitle__w', t);
    const r = $('.mtitle__r', t);
    gsap.timeline({ scrollTrigger: { trigger: t, start: 'top 88%', once: true } })
      .from(w, { yPercent: 40, opacity: 0, duration: 1.2, ease: 'expo.out' })
      .fromTo(r, { rotationX: 0, opacity: 0 }, { rotationX: 180, opacity: 0.2, duration: 1.6, ease: 'power3.inOut', transformPerspective: 900, transformOrigin: '50% 100%' }, 0.25);
  });

  /* --- „živ" talas samo na naslovu koji je na ekranu (animirani SVG filter je skup) --- */
  const liveIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-live', e.isIntersecting));
  });
  $$('.mtitle').forEach((t) => liveIO.observe(t));

  /* --- slike: blagi paralaks --- */
  $$('.dcard .media img, .wine__media .media img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -5, scale: 1.12 }, {
      yPercent: 5, scale: 1.12, ease: 'none',
      scrollTrigger: { trigger: img.closest('.media'), start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
  $$('.dcard, .rec, .rquote').forEach((el) => {
    gsap.from(el, { y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });

  /* --- vitrina: ribe „uplivaju" --- */
  gsap.from('.catch__card', { x: 80, opacity: 0, duration: 1.4, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.catch__rail', start: 'top 85%', once: true } });

  /* --- galerija: horizontalno plutanje na desktopu --- */
  const gal = $('#gal');
  const track = gal && $('.gal__track', gal);
  if (track) {
    ScrollTrigger.matchMedia({
      '(min-width: 1024px)': () => {
        gal.classList.add('is-pinned');
        const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
        const tween = gsap.to(track, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: { trigger: '#galerija', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 },
        });
        return () => { tween.scrollTrigger?.kill(); tween.kill(); gsap.set(track, { x: 0 }); gal.classList.remove('is-pinned'); };
      },
    });
  }

  /* --- hero: lagani paralaks pri izlasku --- */
  gsap.to('.hero__inner', { yPercent: 16, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* --- dubina: čestice i zraci svetla --- */
  initDepth();

  /* --- WebGL talas na slikama (jači desktop uređaji; modul se učitava tek na prvi hover) --- */
  if (isFinePointer() && isCapableDevice()) {
    const arm = (e) => {
      const el = e.currentTarget;
      el.removeEventListener('pointerenter', arm);
      import('./webgl-ripple.js').then((m) => m.attachRipple(el, e)).catch(() => {});
    };
    $$('.fx-water').filter((el) => !el.classList.contains('media--ph')).forEach((el) => el.addEventListener('pointerenter', arm));
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  /* --- hero ulazak (posle intra ili odmah) --- */
  // Posle intra hero se gradi korak po korak. Bez intra (povratna poseta u istoj sesiji)
  // tekst je odmah vidljiv — brže za LCP — a animira se samo logo.
  const withIntro = document.documentElement.classList.contains('intro-on');
  if (withIntro) gsap.set('.hero__eyebrow, .hero__slogan, .hero__sub, .hero__cta, .hero__scroll, .hero__logo', { opacity: 0 });

  function playHero() {
    lenis.start();
    const logo = $('.hero__logo');
    const mirrored = $$('.logo-row2 path, .logo-row4 path', logo);
    if (!withIntro) {
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .from($$('.logo-rope', logo), { rotate: -90, transformOrigin: '50% 50%', duration: 2 }, 0)
        .fromTo(mirrored, { scaleY: -1 }, { scaleY: 1, transformOrigin: '50% 0%', transformBox: 'fill-box', duration: 1.2, ease: 'power3.inOut', stagger: 0.12 }, 0.3);
      return;
    }
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .fromTo(logo, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.6 }, 0)
      .from($$('.logo-rope', logo), { rotate: -120, transformOrigin: '50% 50%', duration: 2.2 }, 0)
      // RIBI i REP se „okrenu" u odraz — igra iz logoa
      .fromTo(mirrored, { scaleY: -1 }, { scaleY: 1, transformOrigin: '50% 0%', transformBox: 'fill-box', duration: 1.2, ease: 'power3.inOut', stagger: 0.12 }, 0.5)
      .fromTo('.hero__eyebrow', { opacity: 0, y: 12 }, { opacity: 0.9, y: 0, duration: 1.2 }, 0.2)
      .fromTo('.hero__slogan', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.4 }, 0.45)
      .fromTo('.hero__sub', { opacity: 0, y: 20 }, { opacity: 0.86, y: 0, duration: 1.2 }, 0.65)
      .fromTo('.hero__cta', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.2 }, 0.8)
      .fromTo('.hero__scroll', { opacity: 0 }, { opacity: 0.7, duration: 1 }, 1.2);
  }

  return {
    lenis,
    scrollTo: (target) => lenis.scrollTo(target, { offset: target === document.body ? 0 : navOffset() + 1, duration: 1.4 }),
    stop: () => lenis.stop(),
    start: () => lenis.start(),
    playHero,
  };
}
