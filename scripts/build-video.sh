#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
#  build-video.sh — intro montaža + hero petlja iz Instagram reelova
#
#  Ulaz:   public/assets/video/raw/*.(mp4|mov|webm|mkv)
#  Izlaz:  public/assets/video/
#            intro-portrait.{mp4,webm}   intro-landscape.{mp4,webm}   (~12–20 s)
#            hero-portrait.{mp4,webm}    hero-landscape.{mp4,webm}    (~8–12 s, petlja)
#            *-poster.jpg                (poster za svaki snimak)
#            frames/frame-N.jpg          (kadrovi za galeriju)
#          src/generated/video.json      (manifest koji čita build sajta)
#
#  Šta radi:
#   1. potpuno uklanja zvuk (-an) — autorska prava na muziku
#   2. pronalazi kadrove (scene detection) i bira stabilne delove iz sredine kadra
#   3. spaja ih mekim prelazima (xfade), ujednačava boju (blago hladniji „morski" grade)
#   4. pravi petlju sa glatkim spojem kraja i početka
#   5. eksportuje H.264 (-preset veryfast, +faststart) i VP9 webm, vertikalno i horizontalno
#
#  Ručna kontrola (opciono):
#   - scripts/video-cuts.txt — ako postoji, koristi se umesto automatskog izbora.
#     Format po redu:  ime-fajla.mp4  start(s)  trajanje(s)
#   - FOCUS_Y=0.55  vertikalni fokus za horizontalni crop (0 = vrh, 1 = dno)
#   - INTRO_LEN=16  HERO_LEN=10  ciljana trajanja u sekundama
#
#  Pokretanje:  npm run video     (ili: bash scripts/build-video.sh)
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW="$ROOT/public/assets/video/raw"
OUT="$ROOT/public/assets/video"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

FOCUS_Y="${FOCUS_Y:-0.55}"
INTRO_LEN="${INTRO_LEN:-16}"
HERO_LEN="${HERO_LEN:-10}"
XF=0.5          # trajanje crossfade-a
FPS=30
# blago hladniji, „morski" grade — bez preteranog filtera
GRADE="eq=contrast=1.04:saturation=0.94:gamma=0.98,colorbalance=rs=-0.03:gs=0.0:bs=0.05:rm=-0.02:bm=0.03:rh=0.01:bh=-0.01"

command -v ffmpeg >/dev/null || { echo "✗ ffmpeg nije instaliran"; exit 1; }
shopt -s nullglob nocaseglob
CLIPS=("$RAW"/*.mp4 "$RAW"/*.mov "$RAW"/*.webm "$RAW"/*.mkv)
shopt -u nocaseglob
if [ ${#CLIPS[@]} -eq 0 ]; then
  echo "✗ Nema snimaka u public/assets/video/raw/ — vidi README (sekcija Video)."
  exit 1
fi
echo "→ Snimci: ${#CLIPS[@]}"

dur() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1" | awk '{printf "%.3f", $1}'; }

# ── 1. Lista segmenata: "fajl start trajanje" ──────────────────────────────
SEGS="$TMP/segs.txt"; : > "$SEGS"
if [ -f "$ROOT/scripts/video-cuts.txt" ]; then
  echo "→ Koristim ručni izbor iz scripts/video-cuts.txt"
  grep -v '^\s*#' "$ROOT/scripts/video-cuts.txt" | awk 'NF>=3' | while read -r f s d; do
    echo "$RAW/$f $s $d" >> "$SEGS"
  done
else
  PER_CLIP=$(( (INTRO_LEN / 2 + ${#CLIPS[@]} - 1) / ${#CLIPS[@]} + 1 ))   # ~2.4 s po segmentu
  for c in "${CLIPS[@]}"; do
    D=$(dur "$c")
    # rezovi između kadrova
    ffmpeg -nostdin -hide_banner -nostats -i "$c" -an -vf "select='gt(scene,0.28)',showinfo" -f null - 2>&1 \
      | grep -o 'pts_time:[0-9.]*' | cut -d: -f2 > "$TMP/cuts.txt" || true
    # kadrovi = [0, cut1, cut2, ..., D]; uzimamo sredinu svakog kadra dužeg od 1.8 s
    { echo 0; cat "$TMP/cuts.txt"; echo "$D"; } | awk -v D="$D" -v F="$c" '
      NR>1 { len=$1-prev; if (len>=1.8 && prev>=0.4) { mid=prev+len/2; s=mid-1.2; if (s<prev) s=prev; print F, s, (len<2.4?len:2.4), len } }
      { prev=$1 }' > "$TMP/shots.txt"
    if [ "$(wc -l < "$TMP/shots.txt")" -lt 2 ]; then
      # nema jasnih rezova → ravnomerno raspoređeni prozori (preskačemo početak/kraj sa tekstom)
      awk -v D="$D" -v F="$c" -v N="$PER_CLIP" 'BEGIN{ for(i=0;i<N;i++){ s=0.8+(D-3.4)*(i+0.5)/N; print F, s, 2.4, 2.4 } }' > "$TMP/shots.txt"
    fi
    # najduži (najstabilniji) kadrovi, pa vraćamo hronološki redosled
    sort -k4 -nr "$TMP/shots.txt" | head -n "$PER_CLIP" | sort -k2 -n | awk '{print $1, $2, $3}' >> "$SEGS"
  done
  # prepliće snimke (A1 B1 A2 B2 …) za ritam
  awk '{f=$1; n[f]++; print n[f], NR, $0}' "$SEGS" | sort -k1,1n -k2,2n | cut -d' ' -f3- > "$TMP/s2.txt" && mv "$TMP/s2.txt" "$SEGS"
fi
echo "→ Segmenti:"; sed 's|.*/||' "$SEGS" | sed 's/^/   /'

# ── 2. Render segmenata u obe orijentacije ─────────────────────────────────
render_segments() { # $1=orijentacija $2=W $3=H
  local o=$1 W=$2 H=$3 i=0
  while read -r f s d; do
    ffmpeg -nostdin -hide_banner -loglevel error -y -ss "$s" -t "$d" -i "$f" -an \
      -vf "scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}:(iw-${W})/2:(ih-${H})*${FOCUS_Y},fps=${FPS},${GRADE},format=yuv420p,setsar=1" \
      -c:v libx264 -preset veryfast -crf 16 "$TMP/${o}-$i.mp4"
    i=$((i+1))
  done < "$SEGS"
}
render_segments portrait 720 1280
render_segments landscape 1280 720
N=$(wc -l < "$SEGS")

# ── 3. xfade lanac: spaja segmente [from..to] u jedan fajl ──────────────────
xfade_chain() { # $1=orijentacija $2=from $3=to $4=izlaz
  local o=$1 from=$2 to=$3 out=$4 inputs="" filter="" prev="[0:v]" offset=0 k=0
  for ((j=from; j<=to; j++)); do inputs="$inputs -i $TMP/${o}-$j.mp4"; done
  if [ "$from" -eq "$to" ]; then cp "$TMP/${o}-$from.mp4" "$out"; return; fi
  for ((j=from; j<to; j++)); do
    local d; d=$(dur "$TMP/${o}-$j.mp4")
    offset=$(awk -v a="$offset" -v b="$d" -v x="$XF" 'BEGIN{printf "%.3f", a+b-x}')
    k=$((k+1))
    local lbl="[v$k]"; [ "$j" -eq $((to-1)) ] && lbl="[vout]"
    filter="${filter}${prev}[$k:v]xfade=transition=fade:duration=${XF}:offset=${offset}${lbl};"
    prev="[v$k]"
  done
  # shellcheck disable=SC2086
  ffmpeg -nostdin -hide_banner -loglevel error -y $inputs -filter_complex "${filter%;}" -map "[vout]" -an \
    -c:v libx264 -preset veryfast -crf 16 -pix_fmt yuv420p "$out"
}

# ── 4. Petlja: kraj se pretapa u početak ────────────────────────────────────
make_loop() { # $1=ulaz $2=izlaz
  local D; D=$(dur "$1")
  local L=1.0 off; off=$(awk -v d="$D" -v l="$L" 'BEGIN{printf "%.3f", d-2*l}')
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$1" -filter_complex \
    "[0:v]split[a][b];[a]trim=start=${L},setpts=PTS-STARTPTS[body];[b]trim=end=${L},setpts=PTS-STARTPTS[head];[body][head]xfade=transition=fade:duration=${L}:offset=${off}[v]" \
    -map "[v]" -an -c:v libx264 -preset veryfast -crf 16 -pix_fmt yuv420p "$2"
}

# ── 5. Finalni eksport ───────────────────────────────────────────────────────
export_all() { # $1=ulaz $2=ime $3=crf_h264 $4=crf_vp9 $5=maxrate
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$1" -an -c:v libx264 -preset veryfast -profile:v high \
    -crf "$3" -maxrate "$5" -bufsize "$5" -pix_fmt yuv420p -movflags +faststart "$OUT/$2.mp4"
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$1" -an -c:v libvpx-vp9 -b:v 0 -crf "$4" \
    -deadline good -cpu-used 5 -row-mt 1 -pix_fmt yuv420p "$OUT/$2.webm"
  ffmpeg -nostdin -hide_banner -loglevel error -y -ss 0.2 -i "$1" -frames:v 1 -q:v 3 "$OUT/$2-poster.jpg"
  printf "   %-22s mp4 %6s KB   webm %6s KB\n" "$2" "$(( $(stat -c%s "$OUT/$2.mp4") / 1024 ))" "$(( $(stat -c%s "$OUT/$2.webm") / 1024 ))"
}

# Intro: svi segmenti (skraćuje se na ~INTRO_LEN)
INTRO_N=$N
while [ "$INTRO_N" -gt 3 ] && [ "$(awk -v n="$INTRO_N" -v x="$XF" 'BEGIN{print int(n*2.4-(n-1)*x)}')" -gt "$INTRO_LEN" ]; do INTRO_N=$((INTRO_N-1)); done
# Hero: najviše 5 segmenata (~8–12 s posle petlje)
HERO_N=$N; [ "$HERO_N" -gt 5 ] && HERO_N=5
HERO_FROM=$(( N - HERO_N ))

echo "→ Eksport:"
for o in portrait landscape; do
  xfade_chain "$o" 0 $((INTRO_N-1)) "$TMP/intro-$o.mp4"
  export_all "$TMP/intro-$o.mp4" "intro-$o" 27 38 3M
  xfade_chain "$o" "$HERO_FROM" $((N-1)) "$TMP/heroraw-$o.mp4"
  make_loop "$TMP/heroraw-$o.mp4" "$TMP/hero-$o.mp4"
  export_all "$TMP/hero-$o.mp4" "hero-$o" 30 42 1.8M
done

# ── 6. Kadrovi za galeriju (iz sredine segmenata, pune rezolucije) ─────────
mkdir -p "$OUT/frames"; rm -f "$OUT/frames"/frame-*.jpg
FR=0
while read -r f s d && [ "$FR" -lt 4 ]; do
  t=$(awk -v s="$s" -v d="$d" 'BEGIN{printf "%.3f", s+d/2}')
  FR=$((FR+1))
  ffmpeg -nostdin -hide_banner -loglevel error -y -ss "$t" -i "$f" -frames:v 1 -vf "$GRADE" -q:v 2 "$OUT/frames/frame-$FR.jpg"
done < <(awk 'NR%2==1' "$SEGS")

INTRO_D=$(dur "$OUT/intro-landscape.mp4")
HERO_D=$(dur "$OUT/hero-landscape.mp4")
mkdir -p "$ROOT/src/generated"
cat > "$ROOT/src/generated/video.json" <<JSON
{
  "intro": { "duration": $INTRO_D },
  "hero": { "duration": $HERO_D },
  "frames": $FR,
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON

echo "→ Optimizujem kadrove za galeriju…"
node "$ROOT/scripts/build-images.mjs"
echo "✓ Gotovo. Intro ${INTRO_D}s, hero petlja ${HERO_D}s. Pokreni: npm run build"
