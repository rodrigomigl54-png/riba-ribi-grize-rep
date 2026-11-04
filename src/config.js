/**
 * ─────────────────────────────────────────────────────────────
 *  KONFIGURACIJA SAJTA — sve što se menja, menja se OVDE.
 *  Fajl koristi i build (Node) i sajt u browseru.
 * ─────────────────────────────────────────────────────────────
 */
export const config = {
  name: 'Konoba Riba Ribi Grize Rep',
  shortName: 'Riba Ribi Grize Rep',

  // Javni URL sajta (za SEO: canonical, sitemap, Open Graph). Bez kose crte na kraju.
  siteUrl: 'https://rrgr.rs',

  phone: {
    display: '021 644 2922',
    href: 'tel:+381216442922',
    e164: '+381216442922',
  },

  address: {
    street: 'Bulevar cara Lazara 46',
    postalCode: '21000',
    city: 'Novi Sad',
    country: 'RS',
    // Koristi se za Google Maps embed i dugme „Uputstva".
    mapsQuery: 'Konoba Riba Ribi Grize Rep, Bulevar cara Lazara 46, 21000 Novi Sad',
  },

  links: {
    instagram: 'https://www.instagram.com/ribaribigrize/',
    instagramHandle: '@ribaribigrize',
    wolt: 'https://wolt.com/en/srb/novi_sad/restaurant/konoba-riba-ribi-grize-repp',
  },

  /**
   * REZERVACIJE
   * Upiši WhatsApp broj (međunarodni format, samo cifre, npr. '381641234567')
   * ili email. Prioritet: whatsapp → email → (ništa) kopiranje teksta + poziv.
   */
  reservations: {
    whatsapp: '',
    email: '',
  },

  /**
   * RADNO VREME (sa jelovnika).
   * ⚠ Google prikazuje zatvaranje u 23:00 — proveriti sa vlasnikom.
   * days: 0 = nedelja, 1 = ponedeljak … 6 = subota. Vreme u formatu HH:MM (Europe/Belgrade).
   */
  timezone: 'Europe/Belgrade',
  hours: [
    { days: [1, 2, 3, 4, 5, 6], open: '09:00', close: '22:00' },
    { days: [0], open: '12:00', close: '22:00' },
  ],

  rating: { value: 4.8, count: 1481 },
  priceRange: { min: 2000, max: 5000, currency: 'RSD', symbol: '$$$' },
  services: ['dineIn', 'takeaway', 'delivery'],
  cuisine: ['Seafood', 'Mediterranean', 'Dalmatian'],
};

export default config;
