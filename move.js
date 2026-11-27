'use strict';

// Verhuizing naar een nieuw adres (config.js → publicUrl).
// - Op het oude adres: zodra het nieuwe adres echt Ricetta laat zien, toont de app een melding
//   met een knop die je ingelogd naar het nieuwe adres brengt.
// - Op het nieuwe adres: neemt de meegestuurde login en instellingen over (vóór sync.js laadt).
const Move = (() => {
  const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const cfg = typeof SYNC_CONFIG !== 'undefined' ? SYNC_CONFIG : {};
  const target = (read('recepten-move-target-override') || cfg.publicUrl || '').replace(/\/?$/, '/');
  const KEY_RE = /^(ricetta|recepten)-/;
  // Niet meesturen: dingen die per toestel opnieuw moeten (laatste back-up, fouten) of alleen voor tests zijn
  const SKIP = new Set(['recepten-sync-last', 'recepten-sync-error', 'recepten-sync-me', 'recepten-sync-config-override', 'recepten-move-target-override']);

  const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
  const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0)));

  // Aankomst op het nieuwe adres: #verhuis=…
  let arrived = false;
  const m = location.hash.match(/^#verhuis=([^&]+)/);
  if (m) {
    try {
      const data = JSON.parse(unb64(decodeURIComponent(m[1])));
      const hadSession = !!read('recepten-sync-session');
      for (const [k, v] of Object.entries(data || {})) {
        if (!KEY_RE.test(k) || SKIP.has(k) || typeof v !== 'string') continue;
        if (hadSession && k.startsWith('recepten-sync-')) continue;   // hier al ingelogd: die login houden
        localStorage.setItem(k, v);
      }
      arrived = true;
    } catch { /* kapotte link: gewoon openen */ }
    // De login niet in de adresbalk of geschiedenis laten staan
    history.replaceState(null, '', `${location.pathname}${location.search}#/`);
  }

  const here = `${location.origin}${location.pathname}`.replace(/index\.html$/, '');
  // Draait deze app nog op het oude adres? (Lokaal testen telt niet mee, tenzij een test een doel opgeeft.)
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(here);
  const isOld = () => !!target && here !== target && (!local || !!read('recepten-move-target-override'));

  // Laat het nieuwe adres echt Ricetta zien (en niet bijvoorbeeld een parkeerpagina)?
  let liveCheck = null;
  const live = () => liveCheck || (liveCheck = (async () => {
    if (!target) return false;
    try {
      const res = await Promise.race([fetch(`${target}manifest.webmanifest`, { cache: 'no-store' }), new Promise((_, no) => setTimeout(no, 5000))]);
      const j = await res.json();
      return /ricetta/i.test(j.name || '');
    } catch { return false; }
  })());

  // Adres op het nieuwe domein, met je login en instellingen erin
  function handoffUrl() {
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!KEY_RE.test(k) || SKIP.has(k)) continue;
        const v = localStorage.getItem(k);
        if (v != null && v.length < 4000) data[k] = v;
      }
    } catch { /* geen opslag */ }
    return `${target}#verhuis=${encodeURIComponent(b64(JSON.stringify(data)))}`;
  }

  return { target, isOld, live, handoffUrl, arrived, host: target.replace(/^https?:\/\//, '').replace(/\/$/, '') };
})();
