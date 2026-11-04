/**
 * build-images.mjs
 * Konvertuje originalne fotografije u AVIF + WebP (+ JPG rezervu) u više širina
 * za `srcset`, i piše manifest src/generated/images.json koji koristi build.
 *
 * Ulaz:  public/assets/images/*.jpg|jpeg|png
 *        public/assets/video/frames/*.jpg   (kadrovi iz videa, pravi ih build-video.sh)
 * Izlaz: public/assets/images/opt/<ime>-<širina>.<avif|webp|jpg>
 *
 * Slike se nikad ne uvećavaju (gambori-njoke.jpg je 200×200 i ostaje mala).
 * Pokreće se automatski pre `npm run dev` i `npm run build`; ručno: `npm run images`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sources = [
  { dir: 'public/assets/images', prefix: '' },
  { dir: 'public/assets/video/frames', prefix: 'frame-' },
];
const outDir = path.join(root, 'public/assets/images/opt');
const manifestPath = path.join(root, 'src/generated/images.json');
const WIDTHS = [400, 720, 1080, 1440, 1920];

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });

const manifest = {};
let built = 0;

for (const { dir, prefix } of sources) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  for (const file of fs.readdirSync(abs).sort()) {
    if (!/\.(jpe?g|png)$/i.test(file)) continue;
    const src = path.join(abs, file);
    const name = prefix + file.replace(/\.(jpe?g|png)$/i, '').replace(/^frame-/, '');
    const meta = await sharp(src).rotate().metadata();
    const srcW = meta.autoOrient?.width ?? meta.width;
    const srcH = meta.autoOrient?.height ?? meta.height;
    let widths = WIDTHS.filter((w) => w < srcW);
    if (!widths.length || srcW <= WIDTHS.at(-1)) widths.push(Math.min(srcW, WIDTHS.at(-1)));
    widths = [...new Set(widths)];
    const srcTime = fs.statSync(src).mtimeMs;

    for (const w of widths) {
      for (const [fmt, opts] of [['avif', { quality: 52, effort: 4 }], ['webp', { quality: 74 }], ['jpg', { quality: 78, mozjpeg: true }]]) {
        // JPG rezerva samo za najveću širinu ≤ 1080 (za stare browsere i OG)
        if (fmt === 'jpg' && w !== Math.min(widths.at(-1), 1080) && w !== widths.filter((x) => x <= 1080).at(-1)) continue;
        const out = path.join(outDir, `${name}-${w}.${fmt}`);
        if (fs.existsSync(out) && fs.statSync(out).mtimeMs > srcTime) continue;
        let pipe = sharp(src).rotate().resize({ width: w, withoutEnlargement: true });
        pipe = fmt === 'jpg' ? pipe.jpeg(opts) : pipe[fmt](opts);
        await pipe.toFile(out);
        built++;
      }
    }
    // LQIP: sićušna zamućena verzija kao pozadina dok se slika učitava
    const lqip = await sharp(src).rotate().resize(20).blur(1.2).webp({ quality: 40 }).toBuffer();
    manifest[name] = {
      width: srcW,
      height: srcH,
      widths,
      jpg: widths.filter((x) => x <= 1080).at(-1) ?? widths[0],
      lqip: `data:image/webp;base64,${lqip.toString('base64')}`,
      small: srcW < 600,
    };
  }
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
const names = Object.keys(manifest);
console.log(`✓ slike: ${names.length ? names.join(', ') : 'nema originala — sajt koristi placeholdere'}${built ? ` (${built} novih fajlova)` : ''}`);
