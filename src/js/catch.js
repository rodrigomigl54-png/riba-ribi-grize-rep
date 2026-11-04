/**
 * Vitrina ulova: horizontalni niz kartica.
 * Na dodir — nativni skrol sa „snap"; mišem — prevlačenje (drag) sa inercijom.
 * Traka napretka prati poziciju. Strelice na tastaturi rade jer je rail fokusabilan.
 */
import { $, isFinePointer } from './utils.js';

export function initCatchRail() {
  const rail = $('#catch-rail');
  const bar = $('#catch-progress');
  if (!rail) return;

  const update = () => {
    const max = rail.scrollWidth - rail.clientWidth;
    const p = max > 0 ? rail.scrollLeft / max : 1;
    const size = Math.min(1, rail.clientWidth / rail.scrollWidth);
    bar?.style.setProperty('--p', String(Math.max(size, size + (1 - size) * p)));
  };
  rail.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();

  rail.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      rail.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * 320, behavior: 'smooth' });
    }
  });

  if (!isFinePointer()) return;
  // prevlačenje mišem
  let down = false, startX = 0, startLeft = 0, vx = 0, lastX = 0, moved = false, raf = 0;
  rail.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true; moved = false;
    startX = lastX = e.clientX; startLeft = rail.scrollLeft; vx = 0;
    cancelAnimationFrame(raf);
    rail.setPointerCapture(e.pointerId);
  });
  rail.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) { moved = true; rail.classList.add('is-drag'); }
    vx = e.clientX - lastX; lastX = e.clientX;
    rail.scrollLeft = startLeft - dx;
  });
  const end = () => {
    if (!down) return;
    down = false;
    const glide = () => {
      vx *= 0.94;
      rail.scrollLeft -= vx;
      if (Math.abs(vx) > 0.4) raf = requestAnimationFrame(glide);
      else rail.classList.remove('is-drag');
    };
    raf = requestAnimationFrame(glide);
  };
  rail.addEventListener('pointerup', end);
  rail.addEventListener('pointercancel', end);
  rail.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
}
