"""
enhance-photos.py — uvećanje rezolucije (AI, Real-ESRGAN ×4) i blaga korekcija svetla.

Koristi se za male fotografije (npr. sa telefona/Google-a) pre ubacivanja na sajt.
Rezultat ide u public/assets/images/<ime>.jpg, odakle ga `npm run build` dalje
optimizuje u AVIF/WebP.

Instalacija (jednom):
  pip install torch pillow numpy
  curl -L -o RealESRGAN_x4plus.pth https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth

Upotreba:
  python3 scripts/enhance-photos.py --model RealESRGAN_x4plus.pth ulaz.jpg:ime-na-sajtu [ulaz2.jpg:ime2 ...]

Korekcija svetla: tamne fotografije (prosečna osvetljenost ispod ~0.45) se posvetle
gama korekcijom, svima se blago razvuče kontrast i malo pojača zasićenost —
bez „filtera", da hrana izgleda prirodno.
"""
import argparse
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/assets/images'


# ── Real-ESRGAN (RRDBNet) arhitektura ─────────────────────────────────────────
class RDB(nn.Module):
    def __init__(self, nf=64, gc=32):
        super().__init__()
        self.conv1 = nn.Conv2d(nf, gc, 3, 1, 1)
        self.conv2 = nn.Conv2d(nf + gc, gc, 3, 1, 1)
        self.conv3 = nn.Conv2d(nf + 2 * gc, gc, 3, 1, 1)
        self.conv4 = nn.Conv2d(nf + 3 * gc, gc, 3, 1, 1)
        self.conv5 = nn.Conv2d(nf + 4 * gc, nf, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(0.2, True)

    def forward(self, x):
        x1 = self.lrelu(self.conv1(x))
        x2 = self.lrelu(self.conv2(torch.cat((x, x1), 1)))
        x3 = self.lrelu(self.conv3(torch.cat((x, x1, x2), 1)))
        x4 = self.lrelu(self.conv4(torch.cat((x, x1, x2, x3), 1)))
        x5 = self.conv5(torch.cat((x, x1, x2, x3, x4), 1))
        return x5 * 0.2 + x


class RRDB(nn.Module):
    def __init__(self, nf, gc=32):
        super().__init__()
        self.rdb1, self.rdb2, self.rdb3 = RDB(nf, gc), RDB(nf, gc), RDB(nf, gc)

    def forward(self, x):
        return self.rdb3(self.rdb2(self.rdb1(x))) * 0.2 + x


class RRDBNet(nn.Module):
    def __init__(self, nf=64, nb=23, gc=32):
        super().__init__()
        self.conv_first = nn.Conv2d(3, nf, 3, 1, 1)
        self.body = nn.Sequential(*[RRDB(nf, gc) for _ in range(nb)])
        self.conv_body = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up1 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up2 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_hr = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_last = nn.Conv2d(nf, 3, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(0.2, True)

    def forward(self, x):
        feat = self.conv_first(x)
        feat = feat + self.conv_body(self.body(feat))
        feat = self.lrelu(self.conv_up1(F.interpolate(feat, scale_factor=2, mode='nearest')))
        feat = self.lrelu(self.conv_up2(F.interpolate(feat, scale_factor=2, mode='nearest')))
        return self.conv_last(self.lrelu(self.conv_hr(feat)))


def upscale(model, img: Image.Image) -> Image.Image:
    x = torch.from_numpy(np.asarray(img.convert('RGB'), dtype=np.float32) / 255.0).permute(2, 0, 1)[None]
    with torch.no_grad():
        y = model(x).clamp(0, 1)[0].permute(1, 2, 0).numpy()
    return Image.fromarray((y * 255.0).round().astype(np.uint8))


def relight(img: Image.Image) -> tuple[Image.Image, str]:
    """Blaga, automatska korekcija: posvetljavanje tamnih, kontrast, zasićenost."""
    lum = np.asarray(img.convert('L'), dtype=np.float32) / 255.0
    mean = float(lum.mean())
    note = f'osvetljenost {mean:.2f}'
    if mean < 0.45:
        gamma = max(0.62, min(0.92, np.log(0.48) / np.log(max(mean, 0.05))))
        lut = [round(255 * ((i / 255) ** gamma)) for i in range(256)]
        img = img.point(lut * 3)
        note += f' → gama {gamma:.2f}'
    stretched = ImageOps.autocontrast(img, cutoff=0.6)
    img = Image.blend(img, stretched, 0.5)
    img = ImageEnhance.Color(img).enhance(1.06)
    img = ImageEnhance.Contrast(img).enhance(1.03)
    return img, note


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True)
    ap.add_argument('--min-width', type=int, default=1400, help='dodatno uvećanje (Lanczos) do ove širine')
    ap.add_argument('pairs', nargs='+', help='ulaz.jpg:ime')
    a = ap.parse_args()

    torch.set_num_threads(max(1, torch.get_num_threads()))
    model = RRDBNet()
    state = torch.load(a.model, map_location='cpu')
    model.load_state_dict(state.get('params_ema', state.get('params', state)), strict=True)
    model.eval()

    OUT.mkdir(parents=True, exist_ok=True)
    for pair in a.pairs:
        src, name = pair.rsplit(':', 1)
        im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
        up = upscale(model, im)
        if up.width < a.min_width:
            r = a.min_width / up.width
            up = up.resize((a.min_width, round(up.height * r)), Image.LANCZOS)
        up, note = relight(up)
        up.save(OUT / f'{name}.jpg', quality=90, optimize=True, progressive=True)
        print(f'✓ {name}.jpg  {im.width}×{im.height} → {up.width}×{up.height}  ({note})')


if __name__ == '__main__':
    main()
