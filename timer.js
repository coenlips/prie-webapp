'use strict';

// Kookwekker: meerdere wekkers tegelijk, onthouden via eindtijden zodat ze kloppen
// als je de app even verlaat. Geluid kan alleen klinken als de app open is.
const Timers = (() => {
  const KEY = 'recepten-timers';
  const MODE_KEY = 'recepten-timer-mode';
  const SHORTCUT = 'Receptenwekker';
  let timers = load();
  let audio = null;
  let alarmLoop = null;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(timers)); } catch { /* geen opslag */ }
  }

  const now = () => Date.now();
  const remaining = t => t.pausedLeft ?? Math.max(0, t.endAt - now());
  const isDone = t => t.pausedLeft == null && t.endAt <= now();

  function fmt(ms) {
    const s = Math.ceil(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const pad = n => String(n).padStart(2, '0');
    return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
  }

  /* ---------- Geluid ---------- */

  // iOS staat geluid pas toe na een tik; daarom wordt dit bij elke tik opnieuw geprobeerd.
  function unlockAudio() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state !== 'running') audio.resume();
    } catch { /* geen geluid mogelijk */ }
  }

  function beep(at, freq) {
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.5, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
    o.connect(g).connect(audio.destination);
    o.start(at);
    o.stop(at + 0.2);
  }

  function ring() {
    if (!audio) return;
    if (audio.state !== 'running') audio.resume().catch(() => {});
    const t = audio.currentTime + 0.02;
    [0, 0.25, 0.5].forEach(d => beep(t + d, 880));
  }

  function updateAlarm() {
    const ringing = timers.some(isDone);
    if (ringing && !alarmLoop) {
      ring();
      alarmLoop = setInterval(ring, 1500);
    } else if (!ringing && alarmLoop) {
      clearInterval(alarmLoop);
      alarmLoop = null;
    }
  }

  /* ---------- Acties ---------- */

  function start(minutes, label) {
    unlockAudio();
    const ms = Math.round(minutes * 60000);
    if (!(ms > 0)) return;
    timers.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), label: label || 'Wekker', endAt: now() + ms, total: ms });
    changed();
  }

  /* ---------- Klok-app via Opdrachten ---------- */

  function getMode() {
    try { return localStorage.getItem(MODE_KEY) === 'klok' ? 'klok' : 'app'; } catch { return 'app'; }
  }
  function setMode(mode) {
    try { localStorage.setItem(MODE_KEY, mode); } catch { /* geen opslag */ }
  }

  // Start de opdracht "Receptenwekker" in de app Opdrachten, die een wekker in de Klok-app zet.
  function startClock(minutes) {
    const m = Math.max(1, Math.round(minutes));
    api.openUrl(`shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT)}&input=text&text=${m}`);
  }

  function go(minutes, label) {
    if (getMode() === 'klok') startClock(minutes);
    else start(minutes, label);
  }

  function stop(id) { timers = timers.filter(t => t.id !== id); changed(); }

  function addMinute(id) {
    const t = timers.find(x => x.id === id);
    if (!t) return;
    if (t.pausedLeft != null) t.pausedLeft += 60000;
    else t.endAt = Math.max(t.endAt, now()) + 60000;
    changed();
  }

  function togglePause(id) {
    const t = timers.find(x => x.id === id);
    if (!t || isDone(t)) return;
    if (t.pausedLeft != null) { t.endAt = now() + t.pausedLeft; t.pausedLeft = null; }
    else t.pausedLeft = Math.max(0, t.endAt - now());
    changed();
  }

  function changed() {
    save();
    render();
    updateAlarm();
    if (typeof setWakeLock === 'function') setWakeLock(typeof state !== 'undefined' && !!state.cookMode);
  }

  /* ---------- Balk met lopende wekkers ---------- */

  const tray = document.createElement('div');
  tray.className = 'timer-tray';
  tray.setAttribute('aria-live', 'polite');
  document.body.appendChild(tray);

  function render() {
    tray.innerHTML = timers.map(t => {
      const done = isDone(t), paused = t.pausedLeft != null;
      const pct = done ? 100 : 100 - (remaining(t) / t.total) * 100;
      return `
        <div class="timer${done ? ' done' : ''}${paused ? ' paused' : ''}" data-id="${t.id}" style="--pct:${Math.min(100, pct)}%">
          <button class="timer-main" data-act="pause" aria-label="${paused ? 'Hervatten' : 'Pauzeren'}">
            <span class="timer-label">${esc(t.label)}</span>
            <span class="timer-time">${done ? 'Klaar!' : fmt(remaining(t))}${paused ? ' ‖' : ''}</span>
          </button>
          ${done ? '' : '<button class="timer-btn" data-act="plus" aria-label="Eén minuut erbij">+1</button>'}
          <button class="timer-btn" data-act="stop" aria-label="Wekker stoppen">${done ? 'Stop' : '×'}</button>
        </div>`;
    }).join('');
    document.body.classList.toggle('has-timers', timers.length > 0);
    document.documentElement.style.setProperty('--tray-h', tray.offsetHeight + 'px');
  }

  function tick() {
    if (!timers.length) return;
    tray.querySelectorAll('.timer').forEach(el => {
      const t = timers.find(x => x.id === el.dataset.id);
      if (!t) return;
      if (isDone(t) !== el.classList.contains('done')) { render(); return; }
      if (!isDone(t)) {
        el.querySelector('.timer-time').firstChild.nodeValue = fmt(remaining(t));
        el.style.setProperty('--pct', Math.min(100, 100 - (remaining(t) / t.total) * 100) + '%');
      }
    });
    updateAlarm();
  }

  tray.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    unlockAudio();
    const id = btn.closest('.timer').dataset.id;
    ({ pause: togglePause, plus: addMinute, stop })[btn.dataset.act](id);
  });

  // Elke tik ergens in de app mag het geluid ontgrendelen (nodig na terugkomen).
  document.addEventListener('touchend', unlockAudio, { passive: true });
  document.addEventListener('click', unlockAudio);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { render(); updateAlarm(); }
  });

  setInterval(tick, 250);

  /* ---------- Wekker zetten ---------- */

  function openSheet(defaultLabel) {
    unlockAudio();
    const presets = [1, 3, 5, 10, 15, 20, 30, 45, 60];
    const wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.innerHTML = `
      <div class="sheet" role="dialog" aria-label="Kookwekker">
        <div class="sheet-head">
          <h3>Kookwekker</h3>
          <button class="text-btn" data-close>Sluit</button>
        </div>
        <div class="preset-grid">
          ${presets.map(m => `<button class="preset" data-min="${m}">${m < 60 ? m + ' min' : '1 uur'}</button>`).join('')}
        </div>
        <form class="sheet-custom" autocomplete="off">
          <input type="text" inputmode="decimal" name="min" placeholder="Minuten" aria-label="Aantal minuten">
          <button class="btn" type="submit">Start</button>
        </form>
        ${getMode() === 'klok'
          ? `<p class="sheet-mode">De wekker wordt gezet in de <strong>Klok-app</strong>. <button class="link" data-settings>Wijzigen</button></p>`
          : `<label class="sheet-label">Naam <input name="label" value="${esc(defaultLabel)}" placeholder="Bijv. Pasta"></label>
             <p class="sheet-mode">Liever een wekker in de Klok-app? <button class="link" data-settings>Instellen</button></p>`}
      </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('open'));

    const close = () => { wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 200); };
    const label = () => wrap.querySelector('[name=label]')?.value.trim() || 'Wekker';
    wrap.addEventListener('click', e => {
      if (e.target === wrap || e.target.closest('[data-close]')) close();
      const p = e.target.closest('.preset');
      if (p) { go(+p.dataset.min, label()); close(); }
      if (e.target.closest('[data-settings]')) { close(); location.hash = '#/settings'; }
    });
    wrap.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      const m = parseFloat(String(e.target.min.value).replace(',', '.'));
      if (m > 0) { go(m, label()); close(); }
    });
  }

  /* ---------- Tijden in de bereiding aantikbaar maken ---------- */

  const UNIT = /(\d+(?:[.,]\d+)?|[½¼¾])(?:\s*(?:-|–|à|tot)\s*\d+(?:[.,]\d+)?)?\s*(uur|uren|minuten|minuut|min\.?|seconden|sec\.?)(?![a-z])/gi;
  const FRAC = { '½': 0.5, '¼': 0.25, '¾': 0.75 };

  // Krijgt al ge-escapete tekst en zet tijden om in knopjes.
  function linkify(html, label) {
    return html.replace(UNIT, (match, num, unit) => {
      let n = FRAC[num] ?? parseFloat(num.replace(',', '.'));
      const u = unit.toLowerCase();
      const min = u.startsWith('u') ? n * 60 : u.startsWith('s') ? n / 60 : n;
      if (!(min > 0) || min > 24 * 60) return match;
      return `<button class="time-chip" data-min="${min}" data-label="${label}">⏱ ${match}</button>`;
    });
  }

  document.addEventListener('click', e => {
    const chip = e.target.closest('.time-chip');
    if (!chip) return;
    e.stopPropagation();
    go(+chip.dataset.min, chip.dataset.label);
  }, true);

  render();
  updateAlarm();

  const api = {
    openUrl: url => { location.href = url; }, // apart zodat het te testen is
    start, openSheet, linkify, getMode, setMode, startClock, SHORTCUT,
    active: () => timers.some(t => !isDone(t) && t.pausedLeft == null) || timers.some(isDone),
  };
  return api;
})();
