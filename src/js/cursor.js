/**
 * Diskretan kursor: mali prsten koji prati miš i ostavlja talasić.
 * Samo na uređajima sa mišem; isključen na dodir i uz prefers-reduced-motion.
 */
import { $, isFinePointer, prefersReducedMotion } from './utils.js';

export function initCursor() {
  if (!isFinePointer() || prefersReducedMotion()) return;
  const el = $('.cursor');
  if (!el) return;
  document.documentElement.classList.add('has-cursor');

  let x = -100, y = -100, cx = x, cy = y, lastRx = 0, lastRy = 0, lastT = 0, raf = 0, active = false;
  const loop = () => {
    cx += (x - cx) * 0.2;
    cy += (y - cy) * 0.2;
    el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    if (Math.abs(x - cx) + Math.abs(y - cy) > 0.1) raf = requestAnimationFrame(loop);
    else active = false;
  };
  const ripple = (px, py) => {
    const r = document.createElement('span');
    r.className = 'ripple-dot';
    r.style.left = `${px}px`;
    r.style.top = `${py}px`;
    document.body.appendChild(r);
    r.addEventListener('animationend', () => r.remove());
  };

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    el.classList.remove('is-hidden');
    if (!active) { active = true; raf = requestAnimationFrame(loop); }
    // talasić na svakih ~140px pređenog puta (najviše 3/s)
    const now = performance.now();
    if (Math.hypot(x - lastRx, y - lastRy) > 140 && now - lastT > 330) {
      ripple(x, y); lastRx = x; lastRy = y; lastT = now;
    }
  }, { passive: true });
  window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') ripple(e.clientX, e.clientY); });
  document.addEventListener('pointerleave', () => el.classList.add('is-hidden'));
  document.addEventListener('pointerover', (e) => {
    el.classList.toggle('is-hover', !!e.target.closest('a, button, input, textarea, label, .catch__rail, [role="button"]'));
  });
}
