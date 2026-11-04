"""
vectorize-logo.py — pretvara originalni logo (public/assets/brand/logo.png) u čist SVG.

Logo se precrtava automatski (potrace), pa je identičan originalu:
  - plavi krug (boja se uzima iz PNG-a)
  - beli pleteni konopac po ivici
  - četiri reda slova: RIBA / RIBI (ogledalo) / GRIZE / REP (ogledalo)

Izlaz:
  public/assets/brand/logo.svg        — za favicon, OG sliku, <img>
  src/generated/logo-inline.svg       — isti logo sa klasama (logo-rope, logo-row1..4)
                                        koje sajt koristi za animacije
  src/styles/brand.css                — CSS promenljiva --brand (tačna plava iz logoa)

Pokretanje (jednom, kad se logo promeni):
  pip install potracer pillow numpy
  python3 scripts/vectorize-logo.py
"""
from pathlib import Path
import numpy as np
from PIL import Image
import potrace

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public/assets/brand/logo.png'
VB = 512           # viewBox SVG-a
UPSCALE = 5        # PNG je mali (300 px) — uvećavamo pre praćenja ivica

img = Image.open(SRC).convert('RGB')
w, h = img.size
arr = np.asarray(img).astype(int)

# --- plava: najčešća zasićena boja ---
px = arr.reshape(-1, 3)
blue = px[(px[:, 2] > px[:, 0] + 30) & (px.max(1) < 200)]
vals, counts = np.unique(blue, axis=0, return_counts=True)
brand = '#%02X%02X%02X' % tuple(vals[counts.argmax()])

# --- krug: granice plavih piksela ---
mask_blue = (arr[:, :, 2] > arr[:, :, 0] + 30) & (arr.max(2) < 200)
ys, xs = np.nonzero(mask_blue)
cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
R = ((xs.max() - xs.min()) + (ys.max() - ys.min())) / 4

# --- belo unutar kruga → bitmap za potrace ---
big = img.resize((w * UPSCALE, h * UPSCALE), Image.LANCZOS).convert('L')
g = np.asarray(big)
yy, xx = np.mgrid[0:g.shape[0], 0:g.shape[1]]
inside = (xx / UPSCALE - cx) ** 2 + (yy / UPSCALE - cy) ** 2 < (R * 0.985) ** 2
white = (g > 150) & inside
bm = potrace.Bitmap(~white)  # potracer prati „False" piksele kao oblik
plist = bm.trace(turdsize=20, alphamax=1.0, opticurve=True, opttolerance=0.6)

S = VB / (2 * R) / UPSCALE           # px (uvećani) → viewBox
ox, oy = cx * UPSCALE, cy * UPSCALE
def P(pt):
    x, y = (pt.x - ox) * S + VB / 2, (pt.y - oy) * S + VB / 2
    return f'{x:.1f} {y:.1f}'

def curve_d(curve):
    d = f'M{P(curve.start_point)}'
    for seg in curve.segments:
        if seg.is_corner:
            d += f'L{P(seg.c)}L{P(seg.end_point)}'
        else:
            d += f'C{P(seg.c1)} {P(seg.c2)} {P(seg.end_point)}'
    return d + 'Z'

def centroid(curve):
    pts = [curve.start_point] + [s.end_point for s in curve.segments]
    a = np.array([(p.x, p.y) for p in pts])
    return (a[:, 0].mean() - ox) / UPSCALE, (a[:, 1].mean() - oy) / UPSCALE

rope, text = [], []
for c in plist:
    x, y = centroid(c)
    (rope if (x * x + y * y) ** 0.5 > R * 0.78 else text).append((y, c))

# --- slova u 4 reda (1D k-means po visini) ---
yvals = np.array([y for y, _ in text])
centers = np.percentile(yvals, [10, 37, 63, 90])
for _ in range(30):
    lab = np.abs(yvals[:, None] - centers[None, :]).argmin(1)
    centers = np.array([yvals[lab == k].mean() if (lab == k).any() else centers[k] for k in range(4)])
order = np.argsort(centers)
rows = {k: [] for k in range(4)}
for (y, c), l in zip(text, lab):
    rows[int(np.where(order == l)[0][0])].append(c)

def build(classes: bool, ink: str, disc: str, title_id: str) -> str:
    cls = lambda n: f' class="{n}"' if classes else ''
    rope_d = ''.join(curve_d(c) for _, c in rope)
    row_paths = '\n'.join(
        f'<path{cls(f"logo-row logo-row{k + 1}")} fill-rule="evenodd" d="{"".join(curve_d(c) for c in rows[k])}"/>'
        for k in range(4))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB} {VB}" role="img" aria-labelledby="{title_id}">\n'
            f'<title id="{title_id}">Riba Ribi Grize Rep</title>\n'
            f'<circle{cls("logo-disc")} cx="{VB / 2}" cy="{VB / 2}" r="{VB / 2}" fill="{disc}"/>\n'
            f'<g fill="{ink}">\n<path{cls("logo-rope")} fill-rule="evenodd" d="{rope_d}"/>\n{row_paths}\n</g>\n</svg>\n')

(ROOT / 'public/assets/brand/logo.svg').write_text(build(False, '#FFFFFF', brand, 'rr-t'))
(ROOT / 'src/generated/logo-inline.svg').write_text(build(True, 'var(--logo-ink, #FFFFFF)', 'currentColor', 'logo-t'))
(ROOT / 'src/styles/brand.css').write_text(f'/* Generisano iz scripts/vectorize-logo.py — plava iz logo.png */\n:root {{ --brand: {brand}; }}\n')
print(f'✓ logo.svg — plava {brand}, konopac {len(rope)} delova, redovi {[len(rows[k]) for k in range(4)]} krivih')
