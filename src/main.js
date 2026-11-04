/**
 * Ulazna tačka sajta.
 * Redosled: stilovi → osnovne interakcije (rade bez animacija) → intro → animacije/skrol.
 */
import './styles/fonts.css';
import './styles/brand.css';
import './styles/main.css';

import { initIntro } from './js/intro.js';
import { initHeroVideo } from './js/hero-video.js';
import { initNav } from './js/nav.js';
import { initMenu } from './js/menu.js';
import { initCatchRail } from './js/catch.js';
import { initReservation } from './js/reservation.js';
import { initHours } from './js/hours.js';
import { initMap } from './js/map.js';
import { initLightbox } from './js/lightbox.js';
import { initMotion } from './js/motion.js';
import { initCursor } from './js/cursor.js';
import { initMediaFallback } from './js/media.js';
import { store } from './js/utils.js';

/**
 * Telefoni ponekad drže staru stranicu u kešu i posle nove objave.
 * Uporedimo oznaku verzije iz stranice sa onom na serveru (bez keša) i, ako se razlikuju,
 * jednom osvežimo stranicu. U dev serveru version.json ne postoji — tada ne radi ništa.
 */
function checkFreshVersion() {
  const mine = document.querySelector('meta[name="build-id"]')?.content;
  if (!mine || !window.fetch) return;
  fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((v) => {
      if (!v || !v.build || v.build === mine) return;
      const key = `rr-reload-${v.build}`;
      if (store.get(key)) return;          // najviše jednom po novoj verziji
      store.set(key, '1');
      location.reload();
    })
    .catch(() => {});
}

initMediaFallback();
checkFreshVersion();
initHours();
initMenu();
initCatchRail();
initReservation();
initMap();
initLightbox();
initHeroVideo();

const motion = initMotion();       // Lenis + GSAP (ili ništa uz reduced-motion)
initNav(motion);
initCursor();

initIntro({
  onDone: () => motion.playHero(),
});
