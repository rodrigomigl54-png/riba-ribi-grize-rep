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

initMediaFallback();
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
