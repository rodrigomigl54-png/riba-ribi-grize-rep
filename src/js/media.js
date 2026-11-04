/** Ako slika ne postoji ili se ne učita, ostaje elegantan placeholder ispod nje. */
export function initMediaFallback() {
  document.addEventListener('error', (e) => {
    const el = e.target;
    if (el.tagName === 'IMG') el.closest('.media')?.classList.add('is-missing');
  }, true);
  // slike koje su pukle pre nego što je JS stigao
  document.querySelectorAll('.media img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0) img.closest('.media')?.classList.add('is-missing');
  });
}
