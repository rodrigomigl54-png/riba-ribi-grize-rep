/** Uvećanje fotografije iz galerije (<dialog>: fokus, Esc i pozadina rade nativno). */
import { $ } from './utils.js';

export function initLightbox() {
  const dlg = $('#lightbox');
  const img = $('#lightbox-img');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  let opener = null;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.gal__btn');
    if (!btn || !btn.dataset.full) return;
    opener = btn;
    img.src = btn.dataset.full;
    img.alt = btn.querySelector('img')?.alt || '';
    dlg.showModal();
  });
  const close = () => dlg.close();
  $('#lightbox-close').addEventListener('click', close);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener('close', () => { img.removeAttribute('src'); opener?.focus(); });
}
