/**
 * Google mapa se NE učitava automatski (brzina, privatnost — bez kolačića dok gost ne klikne).
 * Do tada se prikazuje ilustracija nautičke karte; klik učitava embed.
 */
import { $ } from './utils.js';

export function initMap() {
  const map = $('#map');
  const btn = $('#map-load');
  if (!map || !btn) return;
  btn.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(map.dataset.q)}&output=embed`;
    iframe.title = map.dataset.title;
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.allowFullscreen = true;
    map.appendChild(iframe);
    btn.remove();
    map.querySelector('.map__note')?.remove();
    iframe.focus();
  });
}
