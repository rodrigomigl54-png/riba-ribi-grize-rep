/**
 * „Otvoreno sada / Zatvoreno" — računa se po vremenu u Europe/Belgrade,
 * bez obzira na vremensku zonu posetioca. Radno vreme se menja u src/config.js.
 */
import { $, $$, i18n, siteConfig } from './utils.js';

/** Trenutni dan (0 = nedelja) i minuti od ponoći u zadatoj zoni. */
export function zonedNow(timeZone = 'Europe/Belgrade', date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}
const toMin = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };

export function openState(hours, now) {
  const today = hours.find((h) => h.days.includes(now.day));
  if (today && now.minutes >= toMin(today.open) && now.minutes < toMin(today.close)) {
    return { open: true, until: today.close };
  }
  if (today && now.minutes < toMin(today.open)) return { open: false, opensAt: today.open, day: now.day, sameDay: true };
  for (let i = 1; i <= 7; i++) {
    const d = (now.day + i) % 7;
    const rule = hours.find((h) => h.days.includes(d));
    if (rule) return { open: false, opensAt: rule.open, day: d, sameDay: false };
  }
  return { open: false };
}

export function initHours() {
  const status = $('#status');
  const { hours, timezone } = siteConfig;
  if (!hours) return;
  const t = i18n.contact || {};
  const days = i18n.days || {};

  const render = () => {
    const now = zonedNow(timezone);
    const s = openState(hours, now);
    if (status) {
      status.classList.toggle('is-open', s.open);
      status.classList.toggle('is-closed', !s.open);
      if (s.open) status.textContent = `${t.openNow} · ${t.until} ${s.until}`;
      else if (s.opensAt && s.sameDay) status.textContent = `${t.closedNow} · ${t.opensAt} ${s.opensAt}`;
      else if (s.opensAt) status.textContent = `${t.closedNow} · ${t.opensDay} ${days.long?.[s.day] ?? ''} ${s.opensAt}`;
      else status.textContent = t.closedNow;
    }
    $$('.hours__list li').forEach((li) => li.classList.toggle('is-today', li.dataset.days.split(',').map(Number).includes(now.day)));
  };
  render();
  setInterval(render, 60_000);
}
