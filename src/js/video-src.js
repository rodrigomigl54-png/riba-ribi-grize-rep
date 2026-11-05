/** Pravi <video> sa webm/mp4 izvorima za trenutnu orijentaciju ekrana. */
export function orientation() {
  return window.innerWidth / window.innerHeight < 0.9 ? 'portrait' : 'landscape';
}
export function makeVideo(name, { loop = false } = {}) {
  const o = orientation();
  const v = document.createElement('video');
  v.muted = true;
  v.defaultMuted = true;
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.setAttribute('muted', '');
  v.setAttribute('aria-hidden', 'true');
  v.preload = 'auto';
  v.loop = loop;
  const dir = `${import.meta.env.BASE_URL}assets/video/`;
  v.poster = `${dir}${name}-${o}-poster.jpg`;
  // MP4 (H.264) prvi: većina uređaja ga dekodira hardverski → glatko, bez seckanja.
  // WebM (VP9) ostaje kao rezerva.
  for (const [ext, type] of [['mp4', 'video/mp4'], ['webm', 'video/webm']]) {
    const s = document.createElement('source');
    s.src = `${dir}${name}-${o}.${ext}`;
    s.type = type;
    v.appendChild(s);
  }
  v.dataset.orientation = o;
  return v;
}
