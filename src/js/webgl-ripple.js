/**
 * WebGL talas preko fotografije (hover). Učitava se tek na prvi hover, samo na
 * jačim desktop uređajima (vidi motion.js). Jedan mali shader, bez biblioteka.
 * Ako WebGL nije dostupan, ništa se ne dešava — slika ostaje kakva jeste.
 */
const VERT = `attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
const FRAG = `precision mediump float;
varying vec2 v;
uniform sampler2D uTex;
uniform vec2 uMouse;      // pozicija miša (0–1) u okviru
uniform float uTime;
uniform float uStrength;  // 0–1, raste na hover, opada posle
uniform vec4 uMap;        // okvir → okvir slike (pomeraj xy, veličina zw), zbog paralaksa
uniform vec2 uCover;      // object-fit: cover
uniform float uAspect;
void main(){
  vec2 uv = v;
  vec2 d = uv - uMouse; d.x *= uAspect;
  float dist = length(d);
  float wave = sin(dist * 38.0 - uTime * 5.0) * exp(-dist * 5.5);
  vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0);
  dir.x /= uAspect;
  uv += dir * wave * 0.012 * uStrength;
  uv.y += sin(uv.x * 9.0 + uTime * 1.3) * 0.0025 * uStrength;
  vec2 iuv = (uv - uMap.xy) / uMap.zw;
  vec2 tuv = (iuv - 0.5) * uCover + 0.5;
  vec4 c = texture2D(uTex, tuv);
  c.rgb += wave * 0.035 * uStrength;            // odsjaj na grebenu talasa
  gl_FragColor = c;
}`;

export function attachRipple(media, firstEvent) {
  const img = media.querySelector('img');
  if (!img) return;
  const ready = img.complete && img.naturalWidth > 0 ? Promise.resolve() : new Promise((r) => img.addEventListener('load', r, { once: true }));
  ready.then(() => setup(media, img, firstEvent));
}

function setup(media, img, firstEvent) {
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false, alpha: true });
  if (!gl) return;
  media.appendChild(canvas);

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  } catch { canvas.remove(); return; }

  const U = (n) => gl.getUniformLocation(prog, n);
  const u = { mouse: U('uMouse'), time: U('uTime'), str: U('uStrength'), map: U('uMap'), cover: U('uCover'), aspect: U('uAspect') };

  let mx = 0.5, my = 0.5, strength = 0, target = 0, raf = 0, running = false;
  const t0 = performance.now();

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const r = media.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function frame(now) {
    strength += (target - strength) * 0.06;
    const m = media.getBoundingClientRect();
    const i = img.getBoundingClientRect();
    // okvir slike u koordinatama okvira (y je obrnut u WebGL-u)
    const ox = (i.left - m.left) / m.width;
    const oy = 1 - (i.bottom - m.top) / m.height;
    gl.uniform4f(u.map, ox, oy, i.width / m.width, i.height / m.height);
    const boxA = i.width / i.height, imgA = img.naturalWidth / img.naturalHeight;
    gl.uniform2f(u.cover, boxA > imgA ? 1 : boxA / imgA, boxA > imgA ? imgA / boxA : 1);
    gl.uniform2f(u.mouse, mx, my);
    gl.uniform1f(u.aspect, m.width / m.height);
    gl.uniform1f(u.time, (now - t0) / 1000);
    gl.uniform1f(u.str, strength);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (target === 0 && strength < 0.01) { running = false; canvas.classList.remove('is-on'); return; }
    raf = requestAnimationFrame(frame);
  }
  const run = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
  const move = (e) => {
    const r = media.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width;
    my = 1 - (e.clientY - r.top) / r.height;
  };

  media.addEventListener('pointerenter', (e) => { size(); move(e); target = 1; canvas.classList.add('is-on'); run(); });
  media.addEventListener('pointermove', move);
  media.addEventListener('pointerleave', () => { target = 0; });
  canvas.addEventListener('webglcontextlost', () => { cancelAnimationFrame(raf); canvas.remove(); });

  if (firstEvent) { size(); move(firstEvent); target = 1; canvas.classList.add('is-on'); run(); }
}
