/**
 * Dubina: sitne čestice („morski sneg") i zraci svetla koji slabe što se dublje ide.
 * Lagan 2D canvas: radi samo dok je tamni deo stranice na ekranu i tab vidljiv,
 * broj čestica zavisi od veličine ekrana, DPR ograničen na 1.5.
 */
import { $ } from './utils.js';

export function initDepth() {
  const abyss = $('#abyss');
  const canvas = $('#depth-canvas');
  if (!abyss || !canvas) return;
  const ctx = canvas.getContext('2d');
  const rays = $('.depth__rays');
  let w = 0;
  let h = 0;
  let parts = [];
  let running = false;
  let visible = false;
  let raf = 0;
  let progress = 0;

  function spawn(anywhere) {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: Math.random() * 1.4 + 0.3,
      vy: -(Math.random() * 0.25 + 0.05),
      sway: Math.random() * Math.PI * 2,
      a: Math.random() * 0.35 + 0.08,
    };
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(70, (w * h) / 22000));
    parts = Array.from({ length: n }, () => spawn(true));
  }
  function frame(t) {
    ctx.clearRect(0, 0, w, h);
    const fade = 0.6 + progress * 0.6; // dublje → čestice vidljivije, svetlo slabije
    for (const p of parts) {
      p.y += p.vy;
      p.x += Math.sin(t / 2400 + p.sway) * 0.15;
      if (p.y < -10) Object.assign(p, spawn(false));
      ctx.beginPath();
      ctx.fillStyle = `rgba(200,222,238,${(p.a * fade).toFixed(3)})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }
  const start = () => {
    if (!running && visible && !document.hidden) { running = true; raf = requestAnimationFrame(frame); }
  };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else stop(); }).observe(abyss);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', () => {
    const r = abyss.getBoundingClientRect();
    progress = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
    rays?.style.setProperty('--rays', String(1 - progress * 0.85));
  }, { passive: true });
  resize();
}
