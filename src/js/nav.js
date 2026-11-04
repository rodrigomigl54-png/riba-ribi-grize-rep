/**
 * Navigacija: providna preko hero-a, „staklena" ispod; svetla/tamna prema sekciji ispod.
 * Sakriva se pri skrolu nadole, vraća pri skrolu nagore. Mobilni fullscreen meni.
 */
import { gsap } from 'gsap';
import { $, $$, prefersReducedMotion } from './utils.js';

export function initNav(motion) {
  const nav = $('#nav');
  const burger = $('#burger');
  const mnav = $('#mnav');
  const mbar = $('#mbar');
  if (!nav) return;
  const rm = prefersReducedMotion();

  /* --- stanje prema poziciji --- */
  let lastY = window.scrollY;
  const zones = $$('.hero, .surface, .abyss, .footer');
  const onScroll = () => {
    const y = window.scrollY;
    const heroH = window.innerHeight * 0.85;
    nav.classList.toggle('is-solid', y > 40);
    document.documentElement.classList.toggle('has-nav', !nav.classList.contains('is-hidden'));
    // sakrij pri skrolu nadole (posle hero-a), pokaži pri skrolu nagore
    if (!mnav || mnav.hidden) {
      const down = y > lastY + 4, up = y < lastY - 4;
      if (down && y > heroH) nav.classList.add('is-hidden');
      else if (up || y < heroH) nav.classList.remove('is-hidden');
    }
    lastY = y;
    // svetla tema kada je ispod navigacije svetla sekcija
    const probe = nav.offsetHeight / 2;
    const zone = zones.find((z) => { const r = z.getBoundingClientRect(); return r.top <= probe && r.bottom > probe; });
    nav.classList.toggle('is-light', !!zone?.classList.contains('surface'));
    // donja traka: sakrij u footeru (tu su već svi kontakti)
    if (mbar) {
      const f = $('.footer').getBoundingClientRect();
      mbar.classList.toggle('is-hidden', f.top < window.innerHeight - 40);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* --- aktivni link (scrollspy) --- */
  const links = $$('.nav__links a');
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.remove('is-active'));
      map.get(e.target.id)?.classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

  /* --- glatki skok na sidra (Lenis ako postoji) --- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id === '#top' || id === '#' ? document.body : document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    closeMenu(false);
    motion.scrollTo(target);
    history.replaceState(null, '', id === '#top' ? location.pathname : id);
    if (target !== document.body) target.setAttribute('tabindex', '-1'), target.focus({ preventScroll: true });
  });

  /* --- mobilni meni --- */
  if (!burger || !mnav) return;
  const label = $('.sr-only', burger);
  let tl;
  function openMenu() {
    mnav.hidden = false;
    burger.setAttribute('aria-expanded', 'true');
    label.textContent = label.dataset.close;
    nav.classList.remove('is-hidden');
    motion.stop();
    document.body.style.overflow = 'hidden';
    if (!rm) {
      tl?.kill();
      tl = gsap.timeline()
        .fromTo('.mnav__bg', { clipPath: 'circle(0% at calc(100% - 40px) 36px)' }, { clipPath: 'circle(150% at calc(100% - 40px) 36px)', duration: 0.9, ease: 'expo.inOut' })
        .fromTo('.mnav__links a', { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.05, duration: 0.8, ease: 'expo.out' }, 0.35)
        .fromTo('.mnav__foot', { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.6);
    } else {
      gsap.set('.mnav__bg', { clipPath: 'none' });
    }
    $('.mnav__links a', mnav)?.focus({ preventScroll: true });
  }
  function closeMenu(focusBurger = true) {
    if (mnav.hidden) return;
    burger.setAttribute('aria-expanded', 'false');
    label.textContent = label.dataset.open;
    document.body.style.overflow = '';
    motion.start();
    const done = () => { mnav.hidden = true; if (focusBurger) burger.focus(); };
    if (rm) return done();
    tl?.kill();
    tl = gsap.timeline({ onComplete: done })
      .to('.mnav__links a, .mnav__foot', { opacity: 0, duration: 0.25 })
      .to('.mnav__bg', { clipPath: 'circle(0% at calc(100% - 40px) 36px)', duration: 0.6, ease: 'expo.inOut' }, 0.1);
  }
  burger.addEventListener('click', () => (mnav.hidden ? openMenu() : closeMenu()));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (m) => { if (m.matches) closeMenu(false); });
}
