# Konoba Riba Ribi Grize Rep — sajt

Statičan sajt (Vite + vanilla JS) za riblji restoran u Novom Sadu.
Srpski (latinica) na `/`, engleski na `/en/`. Rezultat je folder `dist/` koji se može hostovati bilo gde (Netlify, Vercel, Cloudflare Pages, običan Apache/Nginx hosting).

---

## 1. Pokretanje i build

Potrebno: **Node.js 20+** (testirano na 22). Za video još i **ffmpeg**.

```bash
npm install
```

```bash
npm run dev        # lokalni server sa automatskim osvežavanjem → http://localhost:5173
```

```bash
npm run build      # optimizuje slike + pravi produkcijsku verziju u dist/
```

```bash
npm run preview    # pregled builda → http://localhost:4173
```

```bash
npm run check      # posle builda: proverava cene, linkove (tel, Wolt, Instagram, mapa) i SEO
```

Na server se kači **samo sadržaj foldera `dist/`**. Sirovi video i originalne fotografije se automatski izbacuju iz `dist/`.

Sajt može da radi i u podfolderu: `BASE_PATH=/podfolder/ npm run build`. Adresa za SEO (canonical, sitemap, Open Graph) se može zameniti sa `SITE_URL=https://...`.

### Objava na GitHub Pages (automatski)

Workflow `.github/workflows/deploy.yml` posle svakog pusha na `main` sam:
instalira pakete → pravi logo, ikonice i slike → buildu sajt → pokreće `npm run check` → objavljuje `dist/`.

Adresa: **https://rodrigomigl54-png.github.io/riba-ribi-grize-rep/** (engleski: `/en/`).

Jednokratno podešavanje (radi vlasnik repozitorijuma):
1. **Settings → Pages → Build and deployment → Source: „GitHub Actions"**.
2. **Actions** → „Objava sajta (GitHub Pages)" → **Run workflow** (ili samo push na `main`).

Kada se ubace slike/video, samo ih commituj i pushuj na `main` — sajt se sam obnovi za par minuta.
(Obrađeni video iz `npm run video` i `src/generated/video.json` treba commitovati; ffmpeg se ne pokreće na GitHub-u.)

**Sopstveni domen (rrgr.rs):**
1. Settings → Pages → Custom domain: `rrgr.rs` (uključi „Enforce HTTPS" kad postane dostupno).
2. Kod registrara domena: `A` zapisi za `rrgr.rs` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; `CNAME` za `www` → `rodrigomigl54-png.github.io`.
3. Settings → Secrets and variables → Actions → **Variables**: `BASE_PATH` = `/` i `SITE_URL` = `https://rrgr.rs`, pa ponovo pokreni workflow.

---

## 2. Gde ubaciti logo, slike i video

```
public/assets/brand/logo.png                    ← trenutni logo
public/assets/images/bruskete-malvazija.jpg
public/assets/images/file-bele-ribe.jpg
public/assets/images/gambori-njoke.jpg          ← mala (200×200) — koristi se samo kao mali okrugli „okular"
public/assets/images/pasta-terasa.jpg
public/assets/images/morska-plata.jpg
public/assets/video/raw/                        ← sirovi snimci reelova (mp4/mov/webm)
```

Dok fajlovi ne postoje, sajt radi normalno i prikazuje tamnoplave placeholdere sa teksturom vode.

### Slike
Samo prekopiraj fajlove sa tačno ovim imenima i pokreni `npm run build` (ili `npm run dev`).
Skripta `scripts/build-images.mjs` automatski pravi AVIF + WebP (+ JPG rezervu) u više širina za `srcset` i sitnu zamućenu verziju koja se vidi dok se slika učitava. Slike se nikad ne uvećavaju.

Posle ubacivanja fotografija pokreni i:

```bash
npm run icons      # nova Open Graph slika (deljenje na Instagramu/Viberu/WhatsApp-u) sa fotografijom morske plate
```

### Logo
`public/assets/brand/logo.svg` je vektorska rekonstrukcija (krug, pleteni konopac, redovi RIBA / RIBI u odrazu / GRIZE / REP u odrazu).
Kada ubaciš `logo.png`, pokreni:

```bash
npm run assets     # uzima tačnu plavu boju iz logo.png → logo.svg, favicon set, OG slika, CSS promenljiva --brand
```

### Video (intro + hero petlja)

Preuzimanje sa Instagrama **nije uspelo iz razvojnog okruženja** (mreža blokira Instagram, `yt-dlp` je dobio 403). Uradi ovo ručno:

1. Preuzmi reelove:
   - https://www.instagram.com/reel/DQPTGYCDUuE/
   - https://www.instagram.com/reel/DE76qMXM9In/

   Najlakše je sa svog računara:
   ```bash
   pip install -U yt-dlp
   ```
   ```bash
   yt-dlp -o "public/assets/video/raw/%(id)s.%(ext)s" https://www.instagram.com/reel/DQPTGYCDUuE/ https://www.instagram.com/reel/DE76qMXM9In/
   ```
   Ako Instagram traži prijavu, dodaj `--cookies-from-browser chrome` (ili `firefox`). Alternativa: preuzmi originalne fajlove direktno sa telefona/naloga restorana — to je i najbolji kvalitet.
2. Stavi `.mp4` fajlove u `public/assets/video/raw/`.
3. Pokreni:
   ```bash
   npm run video
   ```
4. Pa `npm run build`.

Skripta `scripts/build-video.sh`:
- potpuno uklanja zvuk (`-an`) — autorska prava na muziku;
- detektuje rezove u snimcima i bira stabilne kadrove iz sredine, naizmenično iz oba reela;
- spaja ih mekim prelazima (crossfade) → **intro** (~16 s) i **hero petlju** (~9–10 s, kraj se pretapa u početak pa je spoj neprimetan);
- ujednačava boju (blago hladniji, „morski" ton);
- izvozi H.264 MP4 (`-preset veryfast`, `+faststart`) i VP9 WebM, vertikalno (telefon) i horizontalno (desktop, crop sa fokusom malo ispod sredine), plus `poster.jpg` za svaki snimak;
- izvlači 4 kadra za galeriju (`public/assets/video/frames/`);
- piše `src/generated/video.json` — sajt tek tada uključuje video.

Testirano na probnim snimcima: hero petlja ~0,5–0,6 MB, intro ~1–2 MB.

Ručna kontrola (opciono):
- `scripts/video-cuts.txt` — ako postoji, koristi se umesto automatskog izbora. Format po redu: `ime-fajla.mp4  start(s)  trajanje(s)`;
- `FOCUS_Y=0.45 npm run video` — pomera horizontalni crop (0 = vrh, 1 = dno);
- `INTRO_LEN=18 HERO_LEN=12 npm run video` — ciljana trajanja.

---

## 3. Menjanje sadržaja

| Šta | Gde |
|---|---|
| Telefon, adresa, linkovi, WhatsApp/email za rezervacije, **radno vreme**, domen sajta | `src/config.js` |
| Jelovnik: nazivi (SR/EN), gramaže, cene, posno ✦, „na zahtev", cena po kg | `src/data/menu.json` |
| Svi tekstovi na sajtu | `src/i18n/sr.json` i `src/i18n/en.json` |
| Boje, fontovi, razmaci | `src/styles/main.css` (tokeni na vrhu fajla) |

Posle izmene: `npm run build` (u `npm run dev` se stranica sama osveži).

**Jelovnik** — primer stavke:
```json
{ "sr": "Grilovana hobotnica", "en": "Grilled octopus", "weight": "100g", "price": 2100, "posno": true }
```
`perKg: true` → prikazuje „cena po kg" i automatski se pojavljuje u **Vitrini ulova**. `onRequest: true` → „na zahtev". Cena se piše kao broj (`1550`), a sajt je prikazuje kao `1.550 RSD`.

**Radno vreme** — `days`: 0 = nedelja, 1 = ponedeljak … 6 = subota. Oznaka „Otvoreno sada / Zatvoreno" računa se po vremenu u Beogradu, bez obzira gde je posetilac. Isto radno vreme ide i u Google podatke (schema.org).

**Rezervacije** — u `src/config.js`:
```js
reservations: { whatsapp: '381641234567', email: '' }
```
- upisan WhatsApp broj (međunarodni format, samo cifre) → forma otvara WhatsApp sa popunjenom porukom;
- upisan samo email → otvara email sa popunjenom porukom;
- ništa (trenutno stanje) → forma sastavi poruku koju gost može da kopira, uz veliko dugme za poziv.

Podaci iz forme se nigde ne šalju niti čuvaju — sve ostaje kod gosta.

---

## 4. Struktura projekta

```
index.html               šablon stranice ({{ prevod }}, {{ cfg:... }}, <!--@blok-->)
en/index.html            „stub" — build ga popunjava engleskim tekstom iz istog šablona
src/config.js            sve što se menja (kontakt, radno vreme, linkovi)
src/data/menu.json       jelovnik
src/i18n/sr.json, en.json
src/main.js              ulazna tačka
src/js/                  intro, hero video, navigacija, skrol/animacije (GSAP + Lenis),
                         dubina (čestice), jelovnik, vitrina, rezervacija, radno vreme,
                         mapa, galerija, kursor, WebGL talas
src/styles/              fontovi, boja brenda (generisano), glavni stilovi
scripts/site-plugin.mjs  Vite plugin: renderuje SR/EN HTML, jelovnik, JSON-LD, sitemap, robots
scripts/build-*.mjs/.sh  logo, slike, ikonice/OG, video
scripts/check-site.mjs   provera builda
```

Sav sadržaj (uključujući ceo jelovnik) je u samom HTML-u — dobro za Google i radi i bez JavaScript-a. JS dodaje samo interakciju i animacije.

---

## 5. Dizajnerske i tehničke odluke koje sam doneo samostalno

**Koncept: „zaron".** Stranica počinje na površini (svetle sekcije: biser, so, pesak) i posle Kuhinje „prolazi kroz površinu vode" — talasasta ivica — u sve dublju plavu (Ulov → Jelovnik → Vino → Galerija → Utisci → Rezervacija → footer). U dubini se pojavljuju sitne čestice („morski sneg") i zraci svetla koji slabe što se dublje ide.

**Ogledalska igra iz logoa** je glavni motiv:
- svaki naslov sekcije ima odraz koji se pri ulasku u ekran „prevrne" preko vodene linije i blago talasa (SVG filter; animirani talas samo na naslovu koji je trenutno na ekranu, zbog performansi);
- u logou se reči RIBI i REP prvo pojave uspravno, pa se okrenu u odraz;
- nazivi riba u vitrini i veliki natpis u footeru imaju isti odraz.

**Slogan:** „Zalogaj zalogaju grize rep." — igra na naziv: zalogaji se nižu jedan za drugim kao ribe u logou. EN: „Where every bite chases the next."

**Paleta:** baza je plava iz logoa (`--brand`, trenutno `#1C4C8C` — biće zamenjena tačnom iz logo.png), dubinske nijanse do skoro crne plave, so/biser bela, pesak, kamen rive, zlatno-maslinasti akcenat (Malvazija/maslinovo ulje).

**Tipografija** (sve self-hosted, puna podrška za č ć ž š đ, `font-display: swap`):
- *Fraunces* (varijabilni, sa „soft" osom) — naslovi; italik za slogan i vino;
- *Manrope* — tekst;
- *IBM Plex Mono* — cene, gramaže, sitne oznake (tabelarne cifre).

**Sekcije i detalji:**
- Intro: montaža preko celog ekrana, pred kraj logo, pa površina vode „odlazi" naviše sa talasastom ivicom dok se landing izoštrava iz zamućenja. Dugme „Preskoči" + taster Esc. Jednom po sesiji. Uz `prefers-reduced-motion` nema intra. Dok video ne postoji, igra se kratka verzija (voda + logo, ~3,5 s). Intro se ne prikazuje ni kada se dolazi direktnim linkom na sekciju (npr. `#jelovnik`).
- Hero: video petlja (ili animirana voda), logo, slogan, „Rezerviši sto" i „Naruči (Wolt)".
- Izdvojeno iz kuhinje: urednički raspored; glavna fotografija ima oblik luka (kameni prozor dalmatinske rive). Kapesante i hobotnica su „Preporuka za početak" (obe se pominju u pravim recenzijama), a mala slika gambora je prikazana kao okrugli brodski „okular" — zato što je niske rezolucije.
- Morska plata nema cenu jer kao takva ne postoji u jelovniku; ostale kartice vuku cenu direktno iz `menu.json`.
- Vitrina ulova: horizontalni niz „ledenih" kartica (prevlačenje mišem / prstom, strelice na tastaturi), linijske ilustracije riba, latinski nazivi vrsta, cena po kg. Pravi se automatski od jela sa `perKg`.
- Jelovnik: kartica „papira" sa duplim okvirom, lepljivi tabovi kategorija koji prate skrol, pretraga koja ne mari za č/ć/š i padeže („hobotnica" nalazi i „hobotnice"), filter „Posno". Na EN verziji ispod engleskog naziva stoji originalni srpski naziv.
- Vino: samo Malvazija, bez izmišljene vinske karte; citat iz prave recenzije; činjenica iz jelovnika da se u umaku od Malvazije sprema file i pileći medaljoni.
- Galerija: na desktopu se pri skrolu kreće horizontalno (fotografije „plutaju"), na telefonu klasičan horizontalni swipe; klik uvećava fotografiju. Kadrovi iz videa se dodaju automatski.
- Recenzije: 4,8 ★ / 1.481 + dve prave recenzije u originalu (engleski), sa oznakom „Google recenzija".
- Kontakt: veliko dugme za poziv, forma za zahtev, radno vreme sa „Otvoreno sada", mapa koja se učitava tek na klik (do tada ilustracija nautičke karte — brže i bez Google kolačića), „Uputstva", Wolt, Instagram, prosečna cena i usluge.
- Mobilni: fullscreen meni i stalna donja traka Pozovi · Rezerviši · Wolt (sakriva se u footeru, gde su ti podaci već prikazani).
- Desktop: diskretan kursor-prsten koji ostavlja talasiće; WebGL talas preko fotografija na hover (učitava se tek na prvi hover, samo na jačim uređajima; na telefonu i slabijim uređajima isključen).
- Navigacija: providna preko hero-a, „staklena" ispod; sama menja svetlu/tamnu varijantu prema sekciji; sakriva se pri skrolu nadole.

**Tehnika:**
- Vite + vanilla JS, GSAP + ScrollTrigger, Lenis. Bez trackera, kolačića i analitike.
- Engleska verzija je zasebna stranica (`/en/`) umesto prevoda u browseru — bolje za Google (hreflang), radi bez JS-a.
- Cene na EN stranici koriste englesko razdvajanje hiljada (`1,550 RSD`), na srpskoj `1.550 RSD`.
- SEO: title/description SR i EN, Open Graph slika, `schema.org/Restaurant` (adresa, telefon, radno vreme, `$$$`, Seafood/Mediterranean/Dalmatian, ocena 4.8/1481), `sitemap.xml`, `robots.txt`, favicon set.
- Pristupačnost: semantički HTML, alt tekstovi, vidljiv fokus, skip link, tastatura svuda, pun `prefers-reduced-motion` (bez intra, bez animacija, bez Lenis-a, bez videa).
- Lighthouse (mobilni, lokalno, bez fotografija): performanse 91–97, pristupačnost 100, najbolje prakse 100, SEO 100.
- Testirano na 375, 390, 768, 1440 i 1920 px.

---

## 6. Proveriti sa vlasnikom

- [ ] **Radno vreme:** jelovnik kaže zatvaranje u **22:00**, Google kaže **23:00**. Trenutno je 22:00 — menja se u `src/config.js`.
- [ ] **WhatsApp broj ili email za rezervacije** (`src/config.js` → `reservations`). Do tada forma samo sastavlja poruku za kopiranje + poziv. (Broj 021 je fiksni, pa SMS nije opcija.)
- [ ] **Prava na fotografije i video** — da li restoran sme da koristi ove fotografije i reelove na sajtu (i ko je autor).
- [ ] **Muzika iz reelova** je uklonjena; ako se želi zvuk, mora biti licenciran.
- [ ] **Domen:** pretpostavio sam `https://rrgr.rs` (za SEO). Menja se u `src/config.js` → `siteUrl`.
- [ ] **Logo:** rekonstruisan bez originalnog fajla. Proveriti da li su RIBI i REP u originalu okrenuti kao odraz u vodi (vertikalno) — tako sam ih nacrtao — i uporediti font sa originalom kad se ubaci `logo.png`.
- [ ] **Engleski nazivi jela** — naročito „Gostiljski sir" (Gostilje cheese), „Morska zvezda" (dezert — nisam znao šta je, ostavio sam doslovan naziv), „Smokvenjak", „Bakalar na belo".
- [ ] Tekst „O konobi" i opisi jela — napisani umereno i samo na osnovu datih podataka; neka vlasnik potvrdi ton.
- [ ] Spoljni linkovi (Wolt, Instagram, Google Maps) su tačno oni koje si dao, ali iz razvojnog okruženja nisu mogli da se otvore (mreža ih blokira) — klikni ih jednom posle objave.
