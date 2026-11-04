/**
 * Zahtev za rezervaciju.
 * Forma sastavlja poruku i šalje je na kanal iz src/config.js → reservations:
 *   whatsapp: '3816…'  → otvara WhatsApp sa popunjenom porukom
 *   email: 'x@y.rs'    → otvara email klijent
 *   (ništa)            → prikazuje poruku za kopiranje + dugme za poziv
 * Ni jedan podatak se ne šalje na server — sve ostaje u browseru gosta.
 */
import { $, $$, i18n, siteConfig } from './utils.js';
import { zonedNow } from './hours.js';

export function initReservation() {
  const form = $('#rform');
  if (!form) return;
  const t = i18n.contact || {};
  const cfg = siteConfig.reservations || {};
  const ready = $('#rform-ready');
  const msgEl = $('#rform-msg');
  const label = $('#rform-label');
  const wa = String(cfg.whatsapp || '').replace(/\D/g, '');
  const email = String(cfg.email || '').trim();
  if (wa) label.textContent = t.submitWhatsapp;
  else if (email) label.textContent = t.submitEmail;

  // današnji datum (Beograd) kao minimum i podrazumevana vrednost
  const date = $('#f-date');
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: siteConfig.timezone || 'Europe/Belgrade' }).format(new Date());
  date.min = ymd;
  if (!date.value) date.value = ymd;
  const time = $('#f-time');
  if (!time.value) {
    const { minutes } = zonedNow(siteConfig.timezone);
    const next = Math.min(21 * 60, Math.max(13 * 60, Math.ceil((minutes + 90) / 30) * 30));
    time.value = `${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}`;
  }

  // + / − za broj osoba
  const guests = $('#f-guests');
  $$('[data-step]', form).forEach((b) => b.addEventListener('click', () => {
    const v = Math.min(40, Math.max(1, (parseInt(guests.value, 10) || 1) + Number(b.dataset.step)));
    guests.value = v;
  }));

  const setError = (input, msg) => {
    const field = input.closest('.field');
    field.classList.toggle('is-invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    let err = $('.field__err', field);
    if (msg && !err) {
      err = document.createElement('p');
      err.className = 'field__err';
      err.id = `${input.id}-err`;
      field.appendChild(err);
      input.setAttribute('aria-describedby', err.id);
    }
    if (err) { err.textContent = msg || ''; if (!msg) { err.remove(); input.removeAttribute('aria-describedby'); } }
  };

  const fmtDate = (v) => { const [y, m, d] = v.split('-'); return `${d}.${m}.${y}.`; };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let firstBad = null;
    for (const input of $$('input[required]', form)) {
      let msg = input.value.trim() ? '' : t.required;
      if (!msg && input === date && input.value < ymd) msg = t.pastDate;
      setError(input, msg);
      if (msg && !firstBad) firstBad = input;
    }
    if (firstBad) { firstBad.focus(); return; }

    const data = Object.fromEntries(new FormData(form));
    const lines = [
      t.msgIntro,
      '',
      `${t.msgName}: ${data.name.trim()}`,
      `${t.msgDate}: ${fmtDate(data.date)}`,
      `${t.msgTime}: ${data.time}`,
      `${t.msgGuests}: ${data.guests}`,
    ];
    if (data.note.trim()) lines.push(`${t.msgNote}: ${data.note.trim()}`);
    const text = lines.join('\n');

    msgEl.textContent = text;
    ready.hidden = false;
    ready.focus({ preventScroll: true });
    ready.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    if (wa) window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    else if (email) window.location.href = `mailto:${email}?subject=${encodeURIComponent(`${t.emailSubject} — ${fmtDate(data.date)} ${data.time}`)}&body=${encodeURIComponent(text)}`;
  });

  $('#rform-copy').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const text = msgEl.textContent;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // stari browseri: označi tekst da ga gost kopira ručno
      const r = document.createRange();
      r.selectNodeContents(msgEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      try { document.execCommand('copy'); } catch { /* ostaje označeno */ }
    }
    btn.textContent = t.copied;
    setTimeout(() => { btn.textContent = t.copy; }, 2200);
  });
  $('#rform-edit').addEventListener('click', () => { ready.hidden = true; $('#f-name').focus(); });
}
