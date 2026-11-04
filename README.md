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
`public/assets/brand/logo.svg` je automatski precrtan (vektorizovan) iz originalnog `logo.png` — identičan je originalu: plavi krug `#183C68`, beli pleteni konopac, RIBA / RIBI (ogledalo levo-desno) / GRIZE / REP (ogledalo).
Ako se logo promeni, zameni `public/assets/brand/logo.png` i pokreni:

```bash
pip install potracer pillow numpy
```
```bash
npm run logo       # logo.svg + verzija za animacije + tačna plava (--brand)
```
```bash
npm run icons      # favicon set i Open Graph slika
```

### Uvećanje i posvetljavanje fotografija
Fotografije koje su stigle bile su vrlo male (oko 175×220 px). Uvećane su AI modelom **Real-ESRGAN ×4** (do ~1000–1470 px širine) i blago posvetljene/izoštrene (`scripts/enhance-photos.py`). Rezultat je mnogo bolji od originala, ali **originalne fotografije u punoj rezoluciji (sa telefona/kamere) uvek će izgledati bolje** — kad ih dobiješ, samo ih zameni pod istim imenima.

```bash
npm run photos -- --model RealESRGAN_x4plus.pth slika.jpg:ime-na-sajtu
```
(uputstvo za instalaciju je na vrhu skripte)

Imena fotografija koje sajt koristi: `morska-plata`, `kapesante`, `kapesante-hleb`, `kapesante-vecera`, `lignje-hobotnica`, `crni-rizoto`, `ostrige`, `ostrige-led`, `tuna-steak`, `riba-u-ulju`, `malvazija`, `terasa-vece`, `meze-sto`, `sto-gozba`, `jela-sto`, `file-bele-ribe`, `bruskete-losos-bakalar`, `bruskete-stracatela`, `bruskete-vino` (sve `.jpg` u `public/assets/images/`).

### Video (intro + hero petlja)

**Trenutni video je napravljen od 3 snimka koje je restoran poslao** (sirovi fajlovi nisu u gitu, samo gotovi):
- `konoba-film.mp4` — filmski snimak konobe i jela (najveći deo montaže),
- `file-beurre-blanc.mp4` — priprema fileta u beurre blanc sosu,
- `kuhinja.mp4` — **nije korišćen**: ima Instagram vodene žigove po kadrovima i odjavnu karticu.

Rezultat:
- **intro** ~16 s: konoba spolja noću → unutra → vatra → roštilj → kuhinja → tanjiri → vino → file sa pečatom logoa (na tom kadru se pojavljuje animirani logo i intro „zaroni" u sajt);
- **hero petlja** ~9 s: mirniji kadrovi hrane iz istih snimaka, kraj se pretapa u početak;
- vertikalno (telefon) i horizontalno (računar), MP4 + WebM, bez zvuka; poboljšanje slike: uklanjanje šuma, uvećanje (intro 900×1600), izoštravanje, ujednačen „morski" ton;
- 4 kadra iz videa su dodata u galeriju.

Izbor kadrova je u `scripts/video-cuts-intro.txt`, `scripts/video-cuts-hero.txt` i `scripts/video-frames.txt` (fajl, početak, trajanje). Da promeniš montažu: stavi sirove snimke u `public/assets/video/raw/` pod tim imenima, izmeni liste i pokreni `npm run video` (traje ~8 min), pa `npm run build`.

Novi reelovi sa Instagrama: najlakše je sačuvati ih sa telefona; ili preko `yt-dlp` sa svog računara:
   ```bash
   pip install -U yt-dlp
   ```
   ```bash
   yt-dlp -o "public/assets/video/raw/%(id)s.%(ext)s" https://www.instagram.com/reel/DQPTGYCDUuE/ https://www.instagram.com/reel/DE76qMXM9In/
   ```

Veličine: hero petlja ~1,1–1,3 MB, intro ~3,3 MB (telefon) / ~2,8 MB (računar). Hero video počinje da se učitava tek kada intro krene da nestaje, da ne bi delili internet.

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
reservations: { instagram: 'ribaribigrize', whatsapp: '', email: '' }
```
- **instagram** (trenutno uključeno): gost popuni formu i klikne „Pošalji na Instagram" → poruka se automatski kopira i otvara se vaš Instagram chat (`ig.me/m/ribaribigrize`); gost samo nalepi i pošalje. Instagram ne dozvoljava sajtu da unapred popuni tekst ili pošalje poruku sam — za potpuno automatsko slanje potreban je Meta Business API i server;
- **whatsapp** (ako se instagram obriše): otvara WhatsApp sa već popunjenom porukom;
- **email**: otvara email sa popunjenom porukom;
- sve prazno: poruka za kopiranje + dugme za poziv.

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
- u logou se reči RIBI i REP prvo pojave normalno, pa se okrenu u ogledalo (kao u originalnom logou);
- nazivi riba u vitrini i veliki natpis u footeru imaju isti odraz.

**Slogan:** „Zalogaj zalogaju grize rep." — igra na naziv: zalogaji se nižu jedan za drugim kao ribe u logou. EN: „Where every bite chases the next."

**Paleta:** baza je tačna plava iz logoa (`--brand` `#183C68`) i tamnije nijanse za dubinu, uz svetloplavu (`--sky` `#9CC9EE`, `--sky-soft` `#E3F0FA`) i belu iz logoa; topla zlatna samo za Malvaziju i zvezdice.

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
- Jelovnik: kategorije su na **brodskom kormilu** koje se vrti u krug (prevlačenje mišem/prstom, strelice, klik, tasteri ← →); jela izabrane kategorije su na **traci koja se lista levo-desno** (prevlačenje, dugmad, strelice na tastaturi). Pretraga ne mari za č/ć/š i padeže („hobotnica" nalazi i „hobotnice") i prikazuje rezultate iz svih kategorija na istoj traci; filter „Posno". Na EN verziji ispod engleskog naziva stoji originalni srpski naziv. Kartice su za sada bez fotografija — dodaju se kad stignu slike jela.
- Tonovi: tamnoplava iz logoa + svetloplava i bela (svetle sekcije, kartice, dugmad, kormilo); topla zlatna samo za Malvaziju i zvezdice.
- „Život": fotografija u hero sekciji sa sporim zumom (dok ne stigne video), pokretna traka fotografija, talasi koji se kreću, mehurići u svetlim sekcijama, intro sa kratkom montažom fotografija.
- Vino: samo Malvazija, bez izmišljene vinske karte; citat iz prave recenzije; činjenica iz jelovnika da se u umaku od Malvazije sprema file i pileći medaljoni.
- Galerija: na desktopu se pri skrolu kreće horizontalno (fotografije „plutaju"), na telefonu klasičan horizontalni swipe; klik uvećava fotografiju. Kadrovi iz videa se dodaju automatski.
- Recenzije: 4,8 ★ / 1.481 + dve prave recenzije u originalu (engleski), sa oznakom „Google recenzija".
- Kontakt: veliko dugme za poziv, forma za zahtev, radno vreme sa „Otvoreno sada", mapa koja se učitava tek na klik (do tada ilustracija nautičke karte — brže i bez Google kolačića), „Uputstva", Wolt, Instagram, prosečna cena i usluge.
- Mobilni: fullscreen meni i stalna donja traka Pozovi · Rezerviši · Wolt (sakriva se u footeru, gde su ti podaci već prikazani).
- Desktop: diskretan kursor-prsten koji ostavlja talasiće; WebGL talas preko fotografija na hover (učitava se tek na prvi hover, samo na jačim uređajima; na telefonu i slabijim uređajima isključen).
- Navigacija: providna preko hero-a, „staklena" ispod; sama menja svetlu/tamnu varijantu prema sekciji; sakriva se pri skrolu nadole.

**Tehnika:**
- Vite + vanilla JS, GSAP + ScrollTrigger, Lenis (glatki skrol samo uz miš — na telefonu je nativni skrol, da trake i kormilo rade prirodno prstom). Bez trackera, kolačića i analitike.
- Zaštita od keša: posle svake objave stranica proveri `version.json` i, ako telefon drži staru verziju, jednom se sama osveži.
- Engleska verzija je zasebna stranica (`/en/`) umesto prevoda u browseru — bolje za Google (hreflang), radi bez JS-a.
- Cene na EN stranici koriste englesko razdvajanje hiljada (`1,550 RSD`), na srpskoj `1.550 RSD`.
- SEO: title/description SR i EN, Open Graph slika, `schema.org/Restaurant` (adresa, telefon, radno vreme, `$$$`, Seafood/Mediterranean/Dalmatian, ocena 4.8/1481), `sitemap.xml`, `robots.txt`, favicon set.
- Pristupačnost: semantički HTML, alt tekstovi, vidljiv fokus, skip link, tastatura svuda, pun `prefers-reduced-motion` (bez intra, bez animacija, bez Lenis-a, bez videa).
- Lighthouse (mobilni, lokalno, sa fotografijama i videom): performanse 93–98, pristupačnost 100, najbolje prakse 100, SEO 100.
- Testirano na 375, 390, 768, 1440 i 1920 px.

---

## 6. Proveriti sa vlasnikom

- [ ] **Radno vreme:** jelovnik kaže zatvaranje u **22:00**, Google kaže **23:00**. Trenutno je 22:00 — menja se u `src/config.js`.
- [ ] **WhatsApp broj ili email za rezervacije** (`src/config.js` → `reservations`). Do tada forma samo sastavlja poruku za kopiranje + poziv. (Broj 021 je fiksni, pa SMS nije opcija.)
- [ ] **Prava na fotografije i video** — da li restoran sme da koristi ove fotografije i reelove na sajtu (i ko je autor).
- [ ] **Muzika iz reelova** je uklonjena; ako se želi zvuk, mora biti licenciran.
- [ ] **Domen:** pretpostavio sam `https://rrgr.rs` (za SEO). Menja se u `src/config.js` → `siteUrl`.
- [ ] **Originalne fotografije u punoj rezoluciji** — trenutne su AI-uvećane sa ~175 px; originali sa telefona će izgledati oštrije.
- [ ] **Instagram poruke:** proveriti da nalog @ribaribigrize prima poruke od ljudi koje ne prati (Podešavanja → Poruke), da zahtevi ne bi završili u „Zahtevima za poruke".
- [ ] **Engleski nazivi jela** — naročito „Gostiljski sir" (Gostilje cheese), „Morska zvezda" (dezert — nisam znao šta je, ostavio sam doslovan naziv), „Smokvenjak", „Bakalar na belo".
- [ ] Tekst „O konobi" i opisi jela — napisani umereno i samo na osnovu datih podataka; neka vlasnik potvrdi ton.
- [ ] Spoljni linkovi (Wolt, Instagram, Google Maps) su tačno oni koje si dao, ali iz razvojnog okruženja nisu mogli da se otvore (mreža ih blokira) — klikni ih jednom posle objave.
