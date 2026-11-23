'use strict';

// Verhoog dit bij elke nieuwe versie, samen met VERSION in sw.js.
const APP_VERSION = '57 · 23 november 2026';

/* ---------- Hulpfuncties ---------- */

const $ = sel => document.querySelector(sel);
const view = $('#view');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const ICONS = {
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  basket: '<svg viewBox="0 0 24 24"><path d="M7.5 10V8.5a4.5 4.5 0 0 1 9 0V10"/><path d="M3 10h18l-1.6 9.2a1.5 1.5 0 0 1-1.5 1.3H6.1a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 13.5v3.5M12 13.5v3.5M15 13.5v3.5"/></svg>',
  cloud: '<svg viewBox="0 0 24 24"><path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.5 9.2 4.7 4.7 0 0 0 7 18.5z"/></svg>',
  dice: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  filter: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  plate: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12.5" r="5.5"/><circle cx="12" cy="12.5" r="2.6"/><path d="M3 4v4.5a1.5 1.5 0 0 0 3 0V4M4.5 9.5V20M21 4c-1.7 0-2.6 2.2-2.6 5.2 0 1.6.9 2.3 2.6 2.3M21 4v16"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M12 8.5v6M9 11.5h6"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
  cook: '<svg viewBox="0 0 24 24"><path d="M2 9.5h20M4.5 9.5V18a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3V9.5M9 9.5V8a3 3 0 0 1 6 0v1.5"/><path d="M7.5 15.2c2.5-2.7 6.5-2.7 9 0c-2.5 2.7-6.5 2.7-9 0z" stroke-width="1.7"/><circle cx="12" cy="15.2" r="1.4" fill="currentColor" stroke="none"/></svg>',
  timer: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M10 2.5h4M12 2.5V6M18.5 6.5l1.5-1.5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  people: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 14a6 6 0 0 1 3 6"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
};

// Een recept kan meerdere categorieën hebben. Oudere recepten hebben nog één 'category'.
const catsOf = r => {
  const list = Array.isArray(r.categories) ? r.categories : (r.category ? [r.category] : []);
  return [...new Set(list.map(c => String(c).trim()).filter(Boolean))];
};
// Komma-gescheiden tekst naar een lijst; bij dubbele (hoofdletterongevoelig) telt de eerste schrijfwijze
const splitCats = text => {
  const seen = new Map();
  String(text).split(',').map(c => c.trim()).filter(Boolean).forEach(c => { if (!seen.has(c.toLowerCase())) seen.set(c.toLowerCase(), c); });
  return [...seen.values()];
};

// Websitenaam uit een adres, zonder te crashen op een vreemd adres
const siteOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

// Gang: een aparte indeling naast de vrije categorieën. De lijst met gangen is in te
// stellen en wordt als record '__settings' bewaard, zodat hij meegaat met de back-up.
const DEFAULT_COURSES = ['Ontbijt', 'Lunch', 'Voorgerecht', 'Tussengerecht', 'Hoofdgerecht', 'Nagerecht', 'Patisserie'];
const AppSettings = {
  data: { id: '__settings', courses: DEFAULT_COURSES.slice(), migrated: 0 },
  async load() {
    const r = await DB.get('__settings');
    if (r && Array.isArray(r.courses)) this.data = r;
    return this.data;
  },
  save() { return DB.put(this.data); },
};
const courseList = () => AppSettings.data.courses;
const coursesOf = r => courseList().filter(c => (r.courses || []).includes(c));
const usesCategory = (r, name) => catsOf(r).some(x => x.toLowerCase() === name.toLowerCase());

// Categorieën die precies een gang zijn, naar de gang verplaatsen. Geeft het aantal recepten terug.
async function migrateCourses(names) {
  let n = 0;
  for (const r of state.recipes) {
    const found = names.filter(c => usesCategory(r, c));
    if (!found.length) continue;
    r.courses = [...new Set([...(r.courses || []), ...found])];
    r.categories = catsOf(r).filter(x => !found.some(c => c.toLowerCase() === x.toLowerCase()));
    delete r.category;
    await DB.put(r);
    n++;
  }
  return n;
}

// Eenmalig bij het bijwerken: bestaande categorieën als 'Lunch' of 'Hoofdgerecht' worden een gang
async function migrateCoursesOnce() {
  if (AppSettings.data.migrated >= 2) return;
  const n = await migrateCourses(courseList());
  AppSettings.data.migrated = 2;
  // Alleen opslaan als er iets is omgezet: op een nieuw, leeg toestel zou een vers
  // instellingenrecord anders je eigen gangen uit de back-up kunnen overschrijven.
  if (n) await AppSettings.save();
}

// Alle gebruikte categorieën, meest gebruikt eerst (bij gelijk aantal op alfabet)
function catsByUse() {
  const count = new Map();
  state.recipes.forEach(r => catsOf(r).forEach(c => count.set(c, (count.get(c) || 0) + 1)));
  return [...count.keys()].sort((a, b) => count.get(b) - count.get(a) || a.localeCompare(b, 'nl'));
}

const CATEGORIES = ['Ontbijt', 'Lunch', 'Diner', 'Soep', 'Salade', 'Bijgerecht', 'Dessert', 'Gebak', 'Snack', 'Drinken'];

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

const lines = text => String(text || '').split('\n').map(l => l.trim()).filter(Boolean);

function formatTime(min) {
  min = Number(min) || 0;
  if (!min) return '';
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} u${m ? ' ' + m + ' min' : ''}` : `${m} min`;
}

/* ---------- Hoeveelheden omrekenen ---------- */

const UNICODE_FRAC = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 };
const NUM = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?(?:\s*[½¼¾⅓⅔⅛])?|[½¼¾⅓⅔⅛])`;
const QTY_RE = new RegExp(`^(${NUM})(?:\\s*[-–]\\s*(${NUM}))?`);

function parseNum(s) {
  s = s.trim();
  let m;
  if ((m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/))) return +m[1] + m[2] / m[3];
  if ((m = s.match(/^(\d+)\/(\d+)$/))) return m[1] / m[2];
  if ((m = s.match(/^(\d+(?:[.,]\d+)?)\s*([½¼¾⅓⅔⅛])?$/))) {
    return parseFloat(m[1].replace(',', '.')) + (m[2] ? UNICODE_FRAC[m[2]] : 0);
  }
  return UNICODE_FRAC[s] ?? NaN;
}

function formatNum(n) {
  if (n >= 10) return String(Math.round(n));
  const whole = Math.floor(n), frac = n - whole;
  const nice = [[0.25, '¼'], [0.5, '½'], [0.75, '¾'], [1 / 3, '⅓'], [2 / 3, '⅔']];
  for (const [v, sym] of nice) {
    if (Math.abs(frac - v) < 0.02) return (whole || '') + sym;
  }
  if (frac < 0.02) return String(whole);
  return (Math.round(n * 10) / 10).toString().replace('.', ',');
}

function scaleLine(line, factor) {
  if (factor === 1) return esc(line);
  const m = line.match(QTY_RE);
  if (!m) return esc(line);
  const a = parseNum(m[1]);
  if (isNaN(a)) return esc(line);
  let qty = formatNum(a * factor);
  if (m[2]) {
    const b = parseNum(m[2]);
    if (!isNaN(b)) qty += '–' + formatNum(b * factor);
  }
  return `<strong>${esc(qty)}</strong>${esc(line.slice(m[0].length))}`;
}

/* ---------- Foto's verkleinen ---------- */

// Verkleint een foto (bestand of data-URL) tot maximaal 1200 px en maakt er een JPEG van.
function resizeImage(file, max = 1200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const isUrl = typeof file === 'string';
    const url = isUrl ? file : URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      if (!isUrl) URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { if (!isUrl) URL.revokeObjectURL(url); reject(new Error('Foto kon niet geladen worden')); };
    img.src = url;
  });
}

/* ---------- Status ---------- */

const state = {
  recipes: [],
  query: '',
  filter: 'all', // 'all' | 'fav' | categorie
};

async function loadRecipes() {
  // Records die met '__' beginnen (zoals de boodschappenlijst) zijn geen recepten
  state.recipes = (await DB.all()).filter(r => !String(r.id).startsWith('__')).sort((a, b) => a.title.localeCompare(b.title, 'nl'));
}

/* ---------- Kopbalk ---------- */

function setHeader({ title = 'Ricetta', back = false, actions = '', timer = true, timerLabel = '' } = {}) {
  $('#title').textContent = title;
  $('#backBtn').hidden = !back;
  $('#topActions').innerHTML = (timer ? `<button class="icon-btn" id="timerBtn" aria-label="Kookwekker">${ICONS.timer}</button>` : '') + actions;
  if (timer) $('#timerBtn').onclick = () => Timers.openSheet(timerLabel);
  document.body.classList.toggle('no-fab', !!back);
  $('#addBtn').hidden = !!back;
  document.title = title === 'Ricetta' ? 'Ricetta' : `${title} · Ricetta`;
}

$('#backBtn').addEventListener('click', () => {
  const page = (location.hash || '#/').split('/')[1];
  if (page === 'r' || page === 'settings' || !state.navigated) location.hash = '#/';
  else history.back();
});
$('#addBtn').addEventListener('click', () => Importer.openSheet());

/* ---------- Lijst ---------- */

function renderList() {
  const filtersOpen = (() => { try { return localStorage.getItem('ricetta-filters-open') !== '0'; } catch { return true; } })();
  setHeader({ actions: `
    <button class="icon-btn filter-toggle${filtersOpen ? ' on' : ''}" id="filterToggle" aria-controls="listHead" aria-expanded="${filtersOpen}" aria-label="Zoeken en filters" title="Zoeken en filters">${ICONS.filter}<span class="filter-dot" hidden></span></button>
    <button class="icon-btn cart-btn" data-go="#/boodschappen" aria-label="Boodschappenlijst">${ICONS.basket}<span class="cart-badge" hidden></span></button>
    <button class="icon-btn settings-btn" data-go="#/settings" aria-label="Instellingen">${ICONS.gear}</button>
    <button class="add-top" id="addTop" aria-label="Nieuw recept">${ICONS.plus}</button>` });
  $('#addTop').onclick = () => Importer.openSheet();
  Shopping.updateBadge();

  const cats = catsByUse();
  const chips = [['all', 'Alles'], ['fav', '♥'], ...cats.map(c => [c, c])];
  if (!chips.some(([k]) => k === state.filter)) state.filter = 'all';
  const usedCourses = courseList().filter(c => state.recipes.some(r => coursesOf(r).includes(c)));
  if (state.course && !usedCourses.includes(state.course)) state.course = null;

  view.innerHTML = `
    <div class="list-head${filtersOpen ? '' : ' closed'}" id="listHead"><div class="lh-inner">
    <div class="list-tools">
    <div class="search">
      ${ICONS.search}
      <input type="search" id="q" placeholder="Zoek recept of ingrediënt" value="${esc(state.query)}" autocomplete="off">
      <button class="search-clear" id="qClear" aria-label="Zoekveld leegmaken" ${state.query ? '' : 'hidden'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
    <button class="surprise" id="surprise">${ICONS.dice}<span>Verras me</span></button>
    </div>
    ${usedCourses.length ? `<div class="chips course-chips" id="courseBar">${usedCourses.map(c =>
      `<button class="chip chip-course${state.course === c ? ' on' : ''}" data-course="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    ${state.recipes.length ? `<div class="chips" id="catBar">${chips.map(([k, l]) =>
      k === 'fav'
        ? `<button class="chip chip-fav${state.filter === k ? ' on' : ''}" data-filter="fav" aria-label="Favorieten" title="Favorieten">${ICONS.heart}</button>`
        : `<button class="chip${state.filter === k ? ' on' : ''}" data-filter="${esc(k)}">${esc(l)}</button>`).join('')}</div>` : ''}
    </div></div>
    <div class="inbox-banner" id="inboxBanner" hidden></div>
    <ul class="cards" id="cards"></ul>
  `;

  const q = $('#q');
  const qClear = $('#qClear');
  q.addEventListener('input', () => { state.query = q.value; qClear.hidden = !q.value; renderCards(); });
  // Kruisje: veld in één keer leeg, toetsenbord blijft open
  qClear.addEventListener('click', () => {
    q.value = ''; state.query = ''; qClear.hidden = true;
    renderCards();
    q.focus();
  });
  // Filter kiezen: alleen de knoppen en de lijst bijwerken, zodat de balk niet terugspringt
  const chipBar = view.querySelector('#catBar');
  // Gang kiezen; nogmaals tikken zet hem uit. Combineert met het categoriefilter.
  view.querySelectorAll('[data-course]').forEach(b => b.addEventListener('click', () => {
    state.course = state.course === b.dataset.course ? null : b.dataset.course;
    view.querySelectorAll('[data-course]').forEach(x => x.classList.toggle('on', x.dataset.course === state.course));
    renderCards();
  }));
  view.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
    // Nogmaals tikken op het actieve filter zet het uit (terug naar Alles)
    const f = b.dataset.filter;
    state.filter = (f === state.filter && f !== 'all') ? 'all' : f;
    view.querySelectorAll('[data-filter]').forEach(x => x.classList.toggle('on', x.dataset.filter === state.filter));
    renderCards();
  }));
  // Scrollpositie van de balk onthouden, ook na een recept openen en terugkomen
  if (chipBar) {
    chipBar.scrollLeft = state.chipScroll || 0;
    chipBar.addEventListener('scroll', () => { state.chipScroll = chipBar.scrollLeft; }, { passive: true });
  }
  // Zoeken en filters in- en uitklappen; de keuze wordt onthouden
  $('#filterToggle').onclick = () => {
    const head = $('#listHead'), open = head.classList.toggle('closed') === false;
    $('#filterToggle').classList.toggle('on', open);
    $('#filterToggle').setAttribute('aria-expanded', open);
    try { localStorage.setItem('ricetta-filters-open', open ? '1' : '0'); } catch {}
  };
  $('#surprise').onclick = () => {
    Mag.shuffle();
    renderCards();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  renderCards();
  Importer.checkInbox({ maxAge: 20000 });   // toont meteen wat er al bekend is, en kijkt zo nu en dan op de server
}

function renderCards() {
  const q = state.query.trim().toLowerCase();
  const dot = $('#filterToggle .filter-dot');
  if (dot) dot.hidden = !(q || state.filter !== 'all' || state.course);
  const list = state.recipes.filter(r => {
    if (state.filter === 'fav' && !r.favorite) return false;
    if (state.filter !== 'all' && state.filter !== 'fav' && !catsOf(r).includes(state.filter)) return false;
    if (state.course && !coursesOf(r).includes(state.course)) return false;
    if (!q) return true;
    return [r.title, ...coursesOf(r), ...catsOf(r), r.ingredients, (r.tags || []).join(' ')].join(' ').toLowerCase().includes(q);
  });

  const el = $('#cards');
  if (!el) return;
  if (!state.recipes.length) {
    el.outerHTML = `
      <div class="empty">
        <div class="empty-emoji">🍲</div>
        <h2>Nog geen recepten</h2>
        <p>Tik op <strong>+</strong> om je eerste recept toe te voegen.</p>
        <button class="btn ghost" id="sample">Voorbeeldrecept toevoegen</button>
      </div>`;
    $('#sample').addEventListener('click', addSample);
    return;
  }
  el.classList.toggle('mag', isWide());
  if (!list.length) {
    el.innerHTML = `<li class="none">Geen recepten gevonden.</li>`;
    return;
  }
  if (isWide()) return Mag.render(el, list);
  el.innerHTML = list.map(r => {
    const time = formatTime((+r.prepTime || 0) + (+r.cookTime || 0));
    return `
      <li><a class="card" href="#/r/${esc(r.id)}">
        <div class="thumb">${r.photo ? `<img src="${r.photo}" alt="" loading="lazy">` : `<span>${esc((r.title || '?')[0].toUpperCase())}</span>`}</div>
        <div class="card-body">
          <div class="card-title">${esc(r.title)}${r.favorite ? ' <span class="fav">♥</span>' : ''}</div>
          <div class="card-meta">${[coursesOf(r).join(', '), catsOf(r).join(', '), time].filter(Boolean).map(esc).join(' · ')}</div>
        </div>
        <span class="card-chevron">${ICONS.chevron}</span>
      </a></li>`;
  }).join('');
}

/* ---------- Waar staat het eten op de foto? ---------- */
// Eenvoudige beeldanalyse, zonder AI en zonder server: de foto wordt verkleind tot
// 48×48 pixels; plekken met veel kleur en detail (het eten) wegen zwaar, rustige
// achtergrond (tafel, kleed, muur, gelijk aan de randen van de foto) telt niet mee.
const PhotoFocus = (() => {
  const N = 48, cache = new Map();
  const keyOf = r => `${r.id}:${r.updatedAt || 0}:${(r.photo || '').length}`;
  try { // resultaten bewaren (v2: met uitsnede), zodat elke foto maar één keer wordt bekeken
    for (const [k, v] of Object.entries(JSON.parse(localStorage.getItem('ricetta-focus2') || '{}'))) cache.set(k, v);
  } catch {}
  let saveTimer;
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem('ricetta-focus2', JSON.stringify(Object.fromEntries([...cache].slice(-400)))); } catch {}
    }, 500);
  };

  async function analyse(src) {
    const img = new Image();
    img.src = src;
    await img.decode();
    const aspect = img.naturalWidth / img.naturalHeight || 1;
    const w = aspect >= 1 ? N : Math.max(8, Math.round(N * aspect));
    const h = aspect >= 1 ? Math.max(8, Math.round(N / aspect)) : N;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    const px = g.getImageData(0, 0, w, h).data;
    const L = new Float32Array(w * h), S = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const r = px[i * 4] / 255, gg = px[i * 4 + 1] / 255, b = px[i * 4 + 2] / 255;
      const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
      L[i] = (r + gg + b) / 3; S[i] = mx - mn;
    }
    const sal = new Float32Array(w * h);
    let border = 0, nb = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const gx = x < w - 1 ? Math.abs(L[i + 1] - L[i]) : 0, gy = y < h - 1 ? Math.abs(L[i + w] - L[i]) : 0;
      sal[i] = S[i] + 2 * (gx + gy);
      if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) { border += sal[i]; nb++; }
    }
    const bg = (border / nb) * 1.1;   // zo "druk" is de achtergrond
    const wt = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) { const v = Math.max(0, sal[i] - bg); wt[i] = v * v; }
    return { w, h, wt };
  }

  // Uitsnede kiezen. Voorkeur: de uitsnede zo schuiven (zo nodig iets inzoomen) dat het
  // eten boven het label valt. Lukt dat niet, dan pas het label naar boven.
  // zone = welk deel van de hoogte het label onderaan bedekt (0 = geen label).
  function place(m, boxAspect, zone) {
    const { w, h, wt } = m;
    // Optelsom-tabel: snel de hoeveelheid "eten" in elke rechthoek
    const W = w + 1, sat = new Float64Array(W * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) { row += wt[y * w + x]; sat[(y + 1) * W + x + 1] = sat[y * W + x + 1] + row; }
    }
    const massIn = (x0, y0, x1, y1) => { // fractionele randen: afronden naar hele cellen is precies genoeg
      x0 = Math.max(0, Math.round(x0)); y0 = Math.max(0, Math.round(y0)); x1 = Math.min(w, Math.round(x1)); y1 = Math.min(h, Math.round(y1));
      if (x1 <= x0 || y1 <= y0) return 0;
      return sat[y1 * W + x1] - sat[y0 * W + x1] - sat[y1 * W + x0] + sat[y0 * W + x0];
    };
    const total = massIn(0, 0, w, h);
    let bw = w, bh = h;                                   // grootste uitsnede met de vorm van het vak
    if (w / h > boxAspect) bw = h * boxAspect; else bh = w / boxAspect;
    const result = (cw, ch, x0, y0, labelTop) => ({
      // positie en grootte van de foto binnen het vak, in procenten van het vak
      crop: { w: +(w / cw * 100).toFixed(2), h: +(h / ch * 100).toFixed(2), l: +(-x0 / cw * 100).toFixed(2), t: +(-y0 / ch * 100).toFixed(2) },
      labelTop,
    });
    // Zwaartepunt van het eten
    let sx = 0, sy = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = wt[y * w + x]; sx += v * (x + .5); sy += v * (y + .5); }
    const fx = total ? sx / total : w / 2, fy = total ? sy / total : h / 2;
    const centred = (cw, ch) => [Math.min(w - cw, Math.max(0, fx - cw / 2)), Math.min(h - ch, Math.max(0, fy - ch / 2))];
    if (!total) return result(bw, bh, (w - bw) / 2, (h - bh) / 2, false);

    if (zone > 0) {
      let best = null;
      for (const s of [1, 1.12, 1.25, 1.4, 1.6]) {       // eerst zonder inzoomen
        const cw = bw / s, ch = bh / s;
        const steps = 12;
        for (let i = 0; i <= steps; i++) for (let j = 0; j <= steps; j++) {
          const x0 = (w - cw) * i / steps, y0 = (h - ch) * j / steps;
          const inCrop = massIn(x0, y0, x0 + cw, y0 + ch);
          const kept = inCrop / total;
          if (kept < .82) continue;                      // niet te veel eten wegsnijden
          const under = massIn(x0, y0 + ch * (1 - zone), x0 + cw, y0 + ch) / inCrop;
          if (under > .1) continue;                      // nauwelijks eten onder het label
          // liefst: zo min mogelijk zoom, zo veel mogelijk eten, eten mooi in het midden
          const off = Math.abs((fx - x0) / cw - .5) + Math.abs((fy - y0) / ch - .38);
          const score = (s - 1) * 4 - kept * 2 + under * 3 + off;
          if (!best || score < best.score) best = { score, cw, ch, x0, y0 };
        }
        if (best) break;
      }
      if (best) return result(best.cw, best.ch, best.x0, best.y0, false);
    }
    // Geen goede schuif gevonden: gecentreerd op het eten, label naar boven als het eten onderin zit
    const [x0, y0] = centred(bw, bh);
    let labelTop = false;
    if (zone > 0) {
      const under = massIn(x0, y0 + bh * (1 - zone), x0 + bw, y0 + bh);
      const over = massIn(x0, y0, x0 + bw, y0 + bh * zone);
      labelTop = under > over * 1.8;
    }
    return result(bw, bh, x0, y0, labelTop);
  }

  const models = new Map();
  async function get(r, boxAspect, zone = 0) {
    const key = `${keyOf(r)}:${boxAspect.toFixed(2)}:${zone}`;
    if (cache.has(key)) return cache.get(key);
    let m = models.get(keyOf(r));
    if (!m) { m = await analyse(r.photo); models.set(keyOf(r), m); }
    const res = place(m, boxAspect, zone);
    cache.set(key, res); save();
    return res;
  }
  // Foto in het vak zetten volgens de gekozen uitsnede
  function apply(img, f) {
    const c = f.crop;
    img.classList.add('cropped');
    Object.assign(img.style, { width: c.w + '%', height: c.h + '%', left: c.l + '%', top: c.t + '%' });
  }
  // Direct beschikbaar als de foto al eerder is bekeken
  const peek = (r, boxAspect, zone = 0) => cache.get(`${keyOf(r)}:${boxAspect.toFixed(2)}:${zone}`);
  const style = f => `width:${f.crop.w}%;height:${f.crop.h}%;left:${f.crop.l}%;top:${f.crop.t}%`;
  return { get, peek, apply, style };
})();

/* ---------- Titels passend maken ---------- */
// Lange namen krijgen kleinere letters, zodat ze in een paar regels passen
// en woorden niet midden in het woord worden afgebroken.
function lineCount(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  return new Set([...range.getClientRects()].filter(r => r.width > 1).map(r => Math.round(r.top))).size;
}
function fitText(el, steps) {
  el.style.fontSize = '';
  const s = el.style;
  // tijdens het meten: niet midden in een woord breken en niet afkappen
  const keep = [s.overflowWrap, s.display, s.webkitLineClamp];
  s.overflowWrap = 'normal';
  if (getComputedStyle(el).webkitLineClamp !== 'none') { s.display = 'block'; s.webkitLineClamp = 'unset'; }
  let size = parseFloat(getComputedStyle(el).fontSize);
  const fits = lines => lineCount(el) <= lines && el.scrollWidth <= el.clientWidth;
  for (const { lines, min } of steps) {
    while (!fits(lines) && size > min) { size = Math.max(min, size - 2); s.fontSize = size + 'px'; }
    if (fits(lines)) break;
  }
  [s.overflowWrap, s.display, s.webkitLineClamp] = keep;
}
function fitTitles(root) {
  // eerst in 2 regels; lukt dat niet, dan 3; één heel lang woord mag nog kleiner
  root.querySelectorAll('.mag-hero .flag a').forEach(a => fitText(a, [{ lines: 2, min: 34 }, { lines: 3, min: 24 }, { lines: 3, min: 16 }]));
  root.querySelectorAll('.mag-card h3').forEach(h => fitText(h, h.closest('.big')
    ? [{ lines: 2, min: 26 }, { lines: 3, min: 20 }, { lines: 3, min: 14 }]
    : [{ lines: 2, min: 18 }, { lines: 3, min: 16 }, { lines: 3, min: 12 }]));
}

/* ---------- Magazine (iPad en laptop) ---------- */

// iPhone: snel opzoeken, alfabetisch. iPad en laptop: inspiratie, gehusseld als een magazine.
const wideMQ = matchMedia('(min-width: 700px)');
const isWide = () => wideMQ.matches;
// Hoogte van de kopbalk bijhouden, zodat de zoekbalk (iPad/laptop) er precies onder blijft staan
new ResizeObserver(([e]) => document.documentElement.style.setProperty('--topbar-h', e.target.getBoundingClientRect().height + 'px')).observe($('.topbar'), { box: 'border-box' });
wideMQ.addEventListener('change', () => { if (document.body.dataset.page === 'list') renderList(); });
const colsMQ = [matchMedia('(min-width: 1000px)'), matchMedia('(min-width: 1380px)')];
const magCols = () => colsMQ[1].matches ? 4 : colsMQ[0].matches ? 3 : 2;
colsMQ.forEach(mq => mq.addEventListener('change', () => { if (document.body.dataset.page === 'list' && isWide()) renderCards(); }));

const Mag = (() => {
  let rank = new Map();   // id → willekeurig getal; blijft staan tot 'Verras me' of opnieuw openen
  let heroId = null;
  const rnd = id => { if (!rank.has(id)) rank.set(id, Math.random()); return rank.get(id); };
  // Recepten met foto eerst, daarbinnen willekeurig
  const order = list => [...list].sort((a, b) => (!!b.photo - !!a.photo) || rnd(a.id) - rnd(b.id));
  const shuffle = () => { rank = new Map(); heroId = null; };

  function pickHero(all) {
    const withPhoto = order(all).filter(r => r.photo);
    if (!withPhoto.length) return null;
    return withPhoto.find(r => r.id === heroId) || withPhoto[0];
  }
  function nextHero() {
    const withPhoto = order(state.recipes).filter(r => r.photo);
    const i = withPhoto.findIndex(r => r.id === heroId);
    heroId = withPhoto[(i + 1) % withPhoto.length]?.id || null;
  }

  const timeOf = r => formatTime((+r.prepTime || 0) + (+r.cookTime || 0));
  const metaOf = r => [timeOf(r), r.servings ? `${r.servings} pers.` : ''].filter(Boolean).map(esc).join(' · ');
  function leadOf(r) {
    if (r.description) return r.description;
    const first = lines(r.steps || '').find(l => !l.startsWith('#')) || '';
    return first.length > 170 ? first.slice(0, 165).replace(/\s+\S*$/, '') + '…' : first;
  }

  function heroHtml(r, many) {
    const tags = [...coursesOf(r), ...catsOf(r)];
    return `
      <li class="mag-hero" style="grid-row:1">
        <a class="mh-photo" href="#/r/${esc(r.id)}" tabindex="-1"><img src="${r.photo}" alt=""></a>
        <div class="mh-text">
          ${tags.length ? `<span class="mag-kicker">${tags.map(esc).join(' · ')}</span>` : ''}
          <h2 class="flag"><a href="#/r/${esc(r.id)}">${esc(r.title)}</a></h2>
          ${leadOf(r) ? `<p class="mh-lead">${esc(leadOf(r))}</p>` : ''}
          ${metaOf(r) ? `<span class="mag-meta">${metaOf(r).replace('pers.', 'personen')}</span>` : ''}
          <div class="mh-actions">
            <a class="btn mh-open" href="#/r/${esc(r.id)}">Bekijk recept</a>
            ${many ? `<button class="mh-next" id="heroNext">Ander recept ›</button>` : ''}
          </div>
        </div>
      </li>`;
  }

  // Indeling zonder gaten: elke rij vol. Grote kaarten (2×2) staan in een "band" van twee
  // rijen, afwisselend links, midden of rechts. Blijft er een plek over, dan een tegel.
  function plan(items, cols) {
    const n = items.length, withPhoto = items.filter(r => r.photo).length;
    const band = cols >= 3 ? 1 + 2 * (cols - 2) : 0;   // kaarten in een band met één grote
    let b = 0;
    if (band) {
      const want = Math.floor(n / (cols === 3 ? 7 : 9));
      const fits = b => b * band <= n && b <= withPhoto;
      // zo weinig mogelijk opvultegels, en zo dicht mogelijk bij het gewenste aantal grote kaarten
      const tiles = b => (cols - (n - b * band) % cols) % cols;
      const cost = x => tiles(x) * 1.5 + Math.abs(x - want);
      for (let x = 0; fits(x); x++) if (cost(x) <= cost(b)) b = x;
    }
    const plain = n - b * band, fullRows = Math.floor(plain / cols), rest = plain % cols;
    // Volgorde van rijen: banden gelijkmatig verdeeld, de onvolledige rij als laatste
    const T = fullRows + b, seq = Array(T).fill('row');
    for (let j = 0; j < b; j++) {
      let i = Math.min(T - 1, Math.floor((j + .5) * T / b));
      while (seq[i] === 'band') i = (i + 1) % T;
      seq[i] = 'band';
    }
    const spots = cols === 4 ? [1, 0, 2] : [0, 1];        // midden, links, rechts
    const out = []; let k = 0, row = 0, bands = 0;
    const big = () => {                                  // grote kaart altijd met foto
      const j = items.findIndex((r, idx) => idx >= k && r.photo);
      if (j >= k) { const [r] = items.splice(j, 1); items.splice(k, 0, r); return items[k++]; }
      // geen foto meer verderop: ruil met een eerder geplaatste kleine kaart met foto
      const prev = [...out].reverse().find(c => c.r && !c.big && c.r.photo);
      const r = prev.r; prev.r = items[k++];
      return r;
    };
    for (const part of seq) {
      if (part === 'row') {
        for (let c = 0; c < cols; c++) out.push({ r: items[k++], row, col: c });
        row += 1;
      } else {
        const at = spots[bands++ % spots.length];
        out.push({ r: big(), row, col: at, big: true });
        for (const rr of [row, row + 1]) for (let c = 0; c < cols; c++) {
          if (c === at || c === at + 1) continue;
          out.push({ r: items[k++], row: rr, col: c });
        }
        row += 2;
      }
    }
    for (let c = 0; c < rest; c++) out.push({ r: items[k++], row, col: c });
    const fillers = rest ? cols - rest : 0;
    for (let c = 0; c < fillers; c++) out.push({ filler: c, row, col: rest + c });
    return out;
  }

  const FILLERS = [
    { id: 'fillSurprise', icon: 'dice', title: 'Verras me', sub: 'Alles opnieuw husselen' },
    { id: 'fillNew', icon: 'plus', title: 'Nieuw recept', sub: 'Van een website of zelf invullen' },
    { id: 'fillShop', icon: 'basket', title: 'Boodschappen', sub: 'Naar je lijstje' },
  ];

  function render(el, list) {
    // Uitgelicht recept alleen als je niet zoekt of filtert
    const browsing = !state.query.trim() && state.filter === 'all' && !state.course;
    const hero = browsing ? pickHero(state.recipes) : null;
    if (hero) heroId = hero.id;
    const rest = order(list).filter(r => r !== hero);
    const many = state.recipes.filter(r => r.photo).length > 1;
    const start = hero ? 2 : 1, row0 = hero ? 2 : 1;
    const cells = plan(rest, magCols());
    let nr = 0;
    el.innerHTML = (hero ? heroHtml(hero, many) : '') + cells.map(cell => {
      const pos = `grid-row:${row0 + cell.row}${cell.big ? ' / span 2' : ''};grid-column:${cell.col + 1}${cell.big ? ' / span 2' : ''}`;
      if (cell.filler !== undefined) {
        const f = FILLERS[cell.filler];
        return `<li class="mag-filler" style="${pos}"><button id="${f.id}">${ICONS[f.icon]}<b>${f.title}</b><small>${f.sub}</small></button></li>`;
      }
      const r = cell.r, zone = cell.big ? .22 : .36;
      const kicker = coursesOf(r)[0] || catsOf(r)[0] || '';
      const f = r.photo && PhotoFocus.peek(r, 1, zone);
      const cls = (cell.big ? ' big' : '') + (r.photo && !f ? ' focusing' : '') + (f && f.labelTop ? ' label-top' : '');
      const img = r.photo
        ? `<img src="${r.photo}" alt="" loading="lazy"${f ? ` class="cropped" style="${PhotoFocus.style(f)}"` : ''}>`
        : `<span class="mag-nophoto">${ICONS.plate}</span>`;
      return `
        <li class="mag-card${cls}" data-id="${esc(r.id)}" data-zone="${zone}" style="${pos}"><a href="#/r/${esc(r.id)}">
          <div class="mc-photo">${img}${r.favorite ? `<span class="mc-fav" aria-label="Favoriet">${ICONS.heart}</span>` : ''}</div>
          <div class="mc-label">
            <span class="mag-kicker">N° ${String(start + nr++).padStart(2, '0')}${kicker ? ' · ' + esc(kicker) : ''}</span>
            <h3>${esc(r.title)}</h3>
            ${metaOf(r) ? `<span class="mag-meta">${metaOf(r)}</span>` : ''}
          </div>
        </a></li>`;
    }).join('');
    // Titels passend maken (na het laden van de letters) en opnieuw bij een andere breedte
    document.fonts.ready.then(() => fitTitles(el));
    if (!el._fitObs) {
      let w = 0, raf;
      el._fitObs = new ResizeObserver(([e]) => {
        if (Math.abs(e.contentRect.width - w) < 1) return;
        w = e.contentRect.width; cancelAnimationFrame(raf); raf = requestAnimationFrame(() => fitTitles(el));
      });
      el._fitObs.observe(el);
    }
    const next = el.querySelector('#heroNext');
    if (next) next.onclick = () => { nextHero(); render(el, list); };
    const on = (id, fn) => { const b = el.querySelector('#' + id); if (b) b.onclick = fn; };
    on('fillSurprise', () => { shuffle(); render(el, list); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    on('fillNew', () => Importer.openSheet());
    on('fillShop', () => { location.hash = '#/boodschappen'; });
    // Titel niet over het eten: per foto de uitsnede bepalen
    const byId = new Map(list.map(r => [r.id, r]));
    el.querySelectorAll('.mag-card.focusing').forEach(async li => {
      const r = byId.get(li.dataset.id);
      try {
        const f = await PhotoFocus.get(r, 1, +li.dataset.zone);
        PhotoFocus.apply(li.querySelector('img'), f);
        li.classList.toggle('label-top', f.labelTop);
      } catch {}
      li.classList.remove('focusing');
    });
    if (hero) {
      const img = el.querySelector('.mh-photo img');
      const box = img.parentElement.clientWidth / Math.max(1, img.parentElement.clientHeight);
      PhotoFocus.get(hero, box).then(f => PhotoFocus.apply(img, f)).catch(() => {});
    }
  }

  return { render, shuffle, _plan: plan }; // _plan: voor de tests
})();

/* ---------- Detail ---------- */

let wakeLock = null;
async function setWakeLock(on) {
  on = on || (typeof Timers !== 'undefined' && Timers.active());
  try {
    if (on && 'wakeLock' in navigator) {
      if (!wakeLock || wakeLock.released) wakeLock = await navigator.wakeLock.request('screen');
    }
    else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    return true;
  } catch { return false; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') setWakeLock(!!state.cookMode);
});

/* ---------- Kookstand met twee schermen ---------- */

function setCookMode(on) {
  state.cookMode = on;
  if (on) state.cookTab = 'ingr';
  document.body.classList.toggle('cook', on);
  $('#cookTabs').hidden = !on;
  const btn = $('#cook');
  if (btn) { btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on); }
  showCookTab(state.cookTab || 'ingr');
  if (!on) setWakeLock(false);
}

// Zet een stap midden in het zichtbare deel (onder de vaste balk)
function centerStep(li) {
  if (!li) return;
  requestAnimationFrame(() => {
    const barBottom = document.querySelector('.topbar').getBoundingClientRect().bottom;
    const r = li.getBoundingClientRect();
    const target = scrollY + r.top + r.height / 2 - (barBottom + (innerHeight - barBottom) / 2);
    window.scrollTo({ top: Math.max(0, target), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}

function showCookTab(tab) {
  state.cookTab = tab;
  document.body.classList.toggle('cook-tab-steps', tab === 'steps');
  document.querySelectorAll('#cookTabs [data-tab]').forEach(b => {
    b.classList.toggle('on', b.dataset.tab === tab);
    b.setAttribute('aria-selected', b.dataset.tab === tab);
  });
}

$('#cookOff').innerHTML = ICONS.cook;
$('#cookOff').addEventListener('click', () => setCookMode(false));
document.querySelectorAll('#cookTabs [data-tab]').forEach(b => b.addEventListener('click', () => {
  if (state.cookTab !== b.dataset.tab) { showCookTab(b.dataset.tab); window.scrollTo(0, 0); }
}));

async function renderDetail(id) {
  const seq = routeSeq;
  const r = await DB.get(id);
  if (isStale(seq)) return;
  if (!r) { location.hash = '#/'; return; }

  const base = Math.max(1, +r.servings || 1);
  let servings = base;
  const done = new Set();
  let curStep = null; // kookstand: de stap waar je nu bent (bijv. 's3')

  setHeader({
    title: r.title, back: true, timerLabel: r.title,
    actions: `
      <button class="icon-btn cart-btn" data-go="#/boodschappen" aria-label="Boodschappenlijst">${ICONS.basket}<span class="cart-badge" hidden></span></button>
      <button class="icon-btn${r.favorite ? ' active' : ''}" id="favBtn" aria-label="Favoriet">${ICONS.heart}</button>
      <button class="icon-btn" data-go="#/edit/${esc(r.id)}" aria-label="Bewerken">${ICONS.edit}</button>`,
  });
  Shopping.updateBadge();

  const ingr = lines(r.ingredients);
  const steps = lines(r.steps);
  // echte stappen (geen #kopje); als ze allemaal zijn afgestreept: 'Eet smakelijk!'
  const stepKeys = steps.map((l, i) => l.startsWith('#') ? null : 's' + i).filter(Boolean);
  const allStepsDone = () => stepKeys.length > 0 && stepKeys.every(k => done.has(k));

  function draw() {
    const factor = servings / base;
    view.innerHTML = `
      ${r.photo ? `<img class="hero" src="${r.photo}" alt="">` : ''}
      <section class="detail">
        <h2 class="detail-title">${esc(r.title)}</h2>
        ${r.description ? `<p class="lead">${esc(r.description)}</p>` : ''}
        <div class="meta">
          ${coursesOf(r).map(c => `<span class="pill pill-course">${esc(c)}</span>`).join('')}
          ${catsOf(r).map(c => `<span class="pill">${esc(c)}</span>`).join('')}
          ${r.prepTime ? `<span>${ICONS.clock} ${r.cookTime ? 'Voorbereiden' : 'Bereidingstijd'} ${formatTime(r.prepTime)}</span>` : ''}
          ${r.cookTime ? `<span>${ICONS.clock} Koken ${formatTime(r.cookTime)}</span>` : ''}
          ${(r.tags || []).map(t => `<span class="tag">#${esc(t)}</span>`).join('')}
        </div>

        <div class="part-ingr">
        <div class="section-head">
          <h3>Ingrediënten</h3>
          <button class="icon-btn copy-btn" id="copyBtn" aria-label="Op boodschappenlijst zetten en kopiëren">${ICONS.basket}</button>
          <div class="stepper" aria-label="Aantal porties">
            <button id="minus" aria-label="Minder porties">−</button>
            <span>${ICONS.people} ${servings}</span>
            <button id="plus" aria-label="Meer porties">+</button>
          </div>
          <button class="icon-btn cook-btn${state.cookMode ? ' on' : ''}" id="cook" aria-pressed="${!!state.cookMode}"
            aria-label="Kookmodus: scherm blijft aan, grotere tekst" title="Kookmodus">${ICONS.cook}</button>
        </div>
        <ul class="ingredients">
          ${ingr.map((l, i) => l.startsWith('#')
            ? `<li class="sub">${esc(l.replace(/^#+\s*/, ''))}</li>`
            : `<li data-i="${i}" class="${done.has('i' + i) ? 'done' : ''}"><span class="check"></span><span>${scaleLine(l, factor)}</span></li>`).join('')}
        </ul>

        </div>

        <div class="part-steps">
        <h3>Bereiding</h3>
        <ol class="steps">
          ${(() => {
            let n = 0; // nummering loopt door over de kopjes heen
            return steps.map((l, i) => l.startsWith('#')
              ? `<li class="sub">${esc(l.replace(/^#+\s*/, ''))}</li>`
              : `<li data-s="${i}" class="${done.has('s' + i) ? 'done' : ''}${curStep === 's' + i ? ' current' : ''}"><span class="num">${++n}</span><p>${Timers.linkify(esc(l), esc(`${r.title} · stap ${n}`))}</p></li>`).join('');
          })()}
        </ol>
        <div class="bon-appetit" id="bonApp" ${allStepsDone() ? '' : 'hidden'} aria-live="polite">
          <span class="ba-ribbon"><span class="ba-band">Eet smakelijk!</span></span>
        </div>
        </div>

        ${r.notes ? `<h3 class="notes-head">Notities</h3><p class="notes">${esc(r.notes).replace(/\n/g, '<br>')}</p>` : ''}

        ${r.source ? `<p class="source">Bron: <a href="${esc(r.source)}" target="_blank" rel="noopener">${esc(siteOf(r.source))}</a></p>` : ''}

        <div class="detail-actions">
          <button class="btn ghost" id="shareBtn">${ICONS.share} Delen</button>
        </div>
      </section>`;

    $('#minus').onclick = () => { if (servings > 1) { servings--; draw(); } };
    $('#plus').onclick = () => { servings++; draw(); };
    view.querySelectorAll('[data-i]').forEach(li => li.onclick = () => {
      const k = 'i' + li.dataset.i; done.has(k) ? done.delete(k) : done.add(k); li.classList.toggle('done');
    });
    view.querySelectorAll('[data-s]').forEach(li => li.onclick = () => {
      const k = 's' + li.dataset.s;
      if (state.cookMode) {
        // Kookstand: aangetikte stap wordt de huidige, alles ervoor is klaar.
        // Tik je de huidige stap nog eens aan, dan ga je door naar de volgende.
        let p = stepKeys.indexOf(k);
        if (curStep === k) p++;
        curStep = stepKeys[p] || null;
        stepKeys.forEach((s, j) => j < p ? done.add(s) : done.delete(s));
        view.querySelectorAll('[data-s]').forEach(el => {
          const s = 's' + el.dataset.s;
          el.classList.toggle('done', done.has(s));
          el.classList.toggle('current', s === curStep);
        });
        if (curStep) centerStep(view.querySelector(`[data-s="${curStep.slice(1)}"]`));
      } else {
        done.has(k) ? done.delete(k) : done.add(k); li.classList.toggle('done');
        curStep = null; view.querySelectorAll('.steps .current').forEach(el => el.classList.remove('current'));
      }
      const ba = $('#bonApp'), show = allStepsDone();
      if (ba.hidden === show) {
        ba.hidden = !show;
        if (show) requestAnimationFrame(() => ba.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
      }
    });
    $('#cook').onclick = async () => {
      setCookMode(!state.cookMode);
      const ok = await setWakeLock(state.cookMode);
      if (state.cookMode && (!ok || !('wakeLock' in navigator))) toast('Scherm-aan wordt niet ondersteund op dit toestel');
    };
    $('#shareBtn').onclick = () => shareRecipe(r, servings, factor);
    $('#copyBtn').onclick = () => copyIngredients(ingr, done, factor, r.title);
  }

  draw();
  const favBtn = $('#favBtn');
  favBtn.onclick = async () => {
    r.favorite = !r.favorite;
    await DB.put(r);
    await loadRecipes();
    favBtn.classList.toggle('active', r.favorite);
    toast(r.favorite ? 'Toegevoegd aan favorieten' : 'Verwijderd uit favorieten');
  };
}

// Kopieert de afgevinkte ingrediënten (of alles als er niets is afgevinkt).
// Kopieert de afgevinkte ingrediënten (of alle) naar het klembord én zet ze op de boodschappenlijst.
async function copyIngredients(ingr, done, factor, title) {
  const tmp = document.createElement('div');
  const items = ingr
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => !l.startsWith('#'));
  const picked = items.filter(({ i }) => done.has('i' + i));
  const chosen = picked.length ? picked : items;
  const text = chosen
    .map(({ l }) => { tmp.innerHTML = scaleLine(l, factor); return tmp.textContent; })
    .join('\n') + '\n';
  const btn = $('#copyBtn');
  // Eerst het klembord: iOS staat dat alleen direct na een tik toe
  let copied = true;
  try { await navigator.clipboard.writeText(text); } catch { copied = false; }
  await Shopping.addFromRecipe(chosen.map(({ l }) => l), factor, title);
  if (!copied) toast('Op de boodschappenlijst gezet (kopiëren lukte niet)');
  btn.innerHTML = ICONS.check;
  btn.classList.add('copied');
  clearTimeout(copyIngredients._t);
  copyIngredients._t = setTimeout(() => {
    btn.innerHTML = ICONS.basket;
    btn.classList.remove('copied');
  }, 1200);
}

function recipeAsText(r, servings, factor) {
  const tmp = document.createElement('div');
  const ingr = lines(r.ingredients).map(l => {
    if (l.startsWith('#')) return '\n' + l.replace(/^#+\s*/, '') + ':';
    tmp.innerHTML = scaleLine(l, factor);
    return '• ' + tmp.textContent;
  });
  return [
    r.title,
    r.description,
    `\nIngrediënten (${servings} ${servings === 1 ? 'portie' : 'porties'}):`,
    ...ingr,
    '\nBereiding:',
    ...(() => {
      let n = 0;
      return lines(r.steps).map(s => s.startsWith('#') ? '\n' + s.replace(/^#+\s*/, '') + ':' : `${++n}. ${s}`);
    })(),
    r.notes ? `\nNotities:\n${r.notes}` : '',
  ].filter(Boolean).join('\n');
}

async function shareRecipe(r, servings, factor) {
  const text = recipeAsText(r, servings, factor);
  if (navigator.share) {
    try { await navigator.share({ title: r.title, text }); } catch { /* geannuleerd */ }
  } else {
    await navigator.clipboard.writeText(text);
    toast('Recept gekopieerd');
  }
}

/* ---------- Bewerken ---------- */

async function renderEdit(id) {
  const seq = routeSeq;
  // Een geïmporteerd recept (state.draft) opent hier eerst, zodat je het kunt nakijken
  const draft = !id && state.draft; state.draft = null;
  const r = id ? await DB.get(id) : {
    id: uid(), title: '', description: '', categories: [], tags: [], servings: 4,
    prepTime: '', cookTime: '', ingredients: '', steps: '', notes: '', photo: '', favorite: false,
    ...(draft || {}),
  };
  if (isStale(seq)) return;
  if (!r) { location.hash = '#/'; return; }
  let photo = r.photo || '';

  setHeader({
    title: id ? 'Bewerken' : 'Nieuw recept', back: true, timer: false,
    actions: `<button class="text-btn" id="saveBtn">Bewaar</button>`,
  });

  // Je eigen categorieën; zolang je er nog geen hebt, een paar standaardsuggesties.
  const used = catsByUse();
  const catChoices = used.length ? used : CATEGORIES;

  view.innerHTML = `
    <form class="form" id="form" autocomplete="off">
      <label class="photo-pick" id="photoPick">
        <input type="file" accept="image/*" id="photoInput" hidden>
        <div class="photo-preview" id="photoPreview"></div>
      </label>
      <button type="button" class="link danger" id="removePhoto" ${photo ? '' : 'hidden'}>Foto verwijderen</button>

      <label>Naam<input name="title" required value="${esc(r.title)}" placeholder="Bijv. Oma's appeltaart"></label>
      <label>Korte omschrijving<input name="description" value="${esc(r.description)}" placeholder="Optioneel"></label>

      <div class="field">
        <span class="field-label">Gang <small>tik er één of meer aan</small></span>
        <div class="course-choices" id="courseChoices">
          ${courseList().map(c => `<button type="button" class="chip chip-course${coursesOf(r).includes(c) ? ' on' : ''}" data-course-pick="${esc(c)}">${esc(c)}</button>`).join('')}
        </div>
      </div>

      <label>Categorieën <small>tik er één of meer aan, of typ nieuwe, gescheiden door komma's</small>
        <input name="category" value="${esc(catsOf(r).join(', '))}" placeholder="Bijv. Diner, Vegetarisch" autocapitalize="sentences">
      </label>
      <div class="cat-choices" id="catChoices">
        ${catChoices.map(c => `<button type="button" class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
      </div>

      <div class="row">
        <label>Porties<input name="servings" type="number" inputmode="numeric" min="1" value="${esc(r.servings)}"></label>
        <div></div>
      </div>

      <div class="row">
        <label>Voorbereiden (min)<input name="prepTime" type="number" inputmode="numeric" min="0" value="${esc(r.prepTime)}"></label>
        <label>Kooktijd (min)<input name="cookTime" type="number" inputmode="numeric" min="0" value="${esc(r.cookTime)}"></label>
      </div>

      <label>Ingrediënten <small>één per regel · begin met # voor een kopje</small>
        <textarea name="ingredients" rows="8" placeholder="250 g bloem&#10;2 eieren&#10;# Voor de saus&#10;1/2 l melk">${esc(r.ingredients)}</textarea>
      </label>
      <label>Bereiding <small>één stap per regel · begin met # voor een kopje</small>
        <textarea name="steps" rows="8" placeholder="Verwarm de oven voor op 180 °C.&#10;Meng de bloem met de eieren.&#10;# Voor de saus&#10;Smelt de boter in een pan.">${esc(r.steps)}</textarea>
      </label>
      <label>Tags <small>gescheiden door komma's</small><input name="tags" value="${esc((r.tags || []).join(', '))}" placeholder="vegetarisch, snel"></label>
      <label>Notities<textarea name="notes" rows="3" placeholder="Tips, variaties, bron…">${esc(r.notes)}</textarea></label>

      ${id ? `<button type="button" class="btn danger" id="deleteBtn">Recept verwijderen</button>` : ''}
    </form>`;

  // Categorie kiezen met knopjes (de keuzelijst van iOS werkt niet betrouwbaar)
  const catInput = view.querySelector('[name=category]');
  view.querySelectorAll('[data-course-pick]').forEach(b => b.addEventListener('click', () => b.classList.toggle('on')));

  const markCat = () => {
    const chosen = splitCats(catInput.value).map(c => c.toLowerCase());
    view.querySelectorAll('[data-cat]').forEach(b => b.classList.toggle('on', chosen.includes(b.dataset.cat.toLowerCase())));
  };
  view.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => {
    const key = b.dataset.cat.toLowerCase();
    const list = splitCats(catInput.value);
    catInput.value = (b.classList.contains('on')
      ? list.filter(c => c.toLowerCase() !== key)
      : [...list, b.dataset.cat]).join(', ');
    markCat();
  }));
  catInput.addEventListener('input', markCat);
  markCat();

  const preview = $('#photoPreview');
  const drawPhoto = () => {
    preview.innerHTML = photo
      ? `<img src="${photo}" alt="">`
      : `<div class="photo-empty">${ICONS.camera}<span>Foto toevoegen</span></div>`;
    $('#removePhoto').hidden = !photo;
  };
  drawPhoto();

  $('#photoInput').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try { photo = await resizeImage(f); drawPhoto(); } catch (err) { toast(err.message); }
  });
  $('#removePhoto').addEventListener('click', () => { photo = ''; drawPhoto(); });

  const form = $('#form');
  const save = async () => {
    const d = Object.fromEntries(new FormData(form));
    if (!d.title.trim()) { form.title.focus(); toast('Geef het recept een naam'); return; }
    const updated = {
      ...r,
      title: d.title.trim(),
      description: d.description.trim(),
      categories: splitCats(d.category),
      courses: [...(r.courses || []).filter(c => !courseList().includes(c)),
        ...[...view.querySelectorAll('[data-course-pick].on')].map(b => b.dataset.coursePick)],
      category: undefined, // oud veld, vervangen door 'categories'
      servings: Math.max(1, parseInt(d.servings, 10) || 1),
      prepTime: parseInt(d.prepTime, 10) || '',
      cookTime: parseInt(d.cookTime, 10) || '',
      ingredients: d.ingredients.trim(),
      steps: d.steps.trim(),
      notes: d.notes.trim(),
      tags: d.tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean),
      photo,
      createdAt: r.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    const inboxId = updated._inboxId;
    delete updated._inboxId;
    await DB.put(updated);
    if (inboxId) await Importer.doneInbox(inboxId);
    await loadRecipes();
    toast('Opgeslagen');
    if (id && state.navigated) history.back();
    else location.replace(`#/r/${updated.id}`);
  };
  $('#saveBtn').addEventListener('click', save);
  form.addEventListener('submit', e => { e.preventDefault(); save(); });

  const del = $('#deleteBtn');
  if (del) del.addEventListener('click', async () => {
    if (!confirm(`"${r.title}" verwijderen?`)) return;
    await DB.remove(r.id);
    await loadRecipes();
    toast('Recept verwijderd');
    location.replace('#/');
  });
}

/* ---------- Instellingen / back-up ---------- */

// Inklapbare blokken in de instellingen; onthoudt welke open staan (alleen op dit toestel)
const FOLD_KEY = 'recepten-settings-open';
const openFolds = () => { try { return JSON.parse(localStorage.getItem(FOLD_KEY)) || []; } catch { return []; } };
function fold(id, title, body, { badge = '', open = false, icon = '' } = {}) {
  const isOpen = open || openFolds().includes(id);
  return `
    <details class="card-box fold" data-fold="${id}" ${isOpen ? 'open' : ''}>
      <summary>
        ${icon ? `<span class="fold-icon">${icon}</span>` : ''}
        <h3>${title}</h3>
        <span class="fold-badge" id="badge-${id}">${badge}</span>
        <span class="fold-chevron">${ICONS.chevron}</span>
      </summary>
      <div class="fold-body">${body}</div>
    </details>`;
}

function syncBadge() {
  const s = Sync.status();
  if (s.state === 'off') return '<span class="badge-muted">uit</span>';
  if (s.state === 'loggedout') return '<span class="badge-muted">niet ingelogd</span>';
  if (s.error) return '<span class="badge-bad">⚠️ probleem</span>';
  return '<span class="badge-good">✓ aan</span>';
}

function renderSettings() {
  setHeader({ title: 'Instellingen', back: true, timer: false });
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const sync = Sync.status();

  view.innerHTML = `
    <section class="settings">
      ${standalone ? '' : fold('install', 'Op je beginscherm zetten', `
        <ol class="howto">
          <li>Open deze pagina in <strong>Safari</strong>.</li>
          <li>Tik op de deelknop ${ICONS.share}.</li>
          <li>Kies <strong>Zet op beginscherm</strong>.</li>
        </ol>`, { open: true, icon: ICONS.phone })}

      ${fold('courses', 'Gangen', `<div id="courseSettings"></div>`, { badge: `<span class="badge-muted">${courseList().length}</span>`, icon: ICONS.plate })}

      ${fold('timer', 'Kookwekker', `
        <p>Waar moet een wekker afgaan als je op een tijd of een snelkeuze tikt?</p>
        <div class="choice">
          <label><input type="radio" name="tmode" value="app" ${Timers.getMode() === 'app' ? 'checked' : ''}>
            <span><strong>In deze app</strong><small>Meerdere wekkers tegelijk. Alleen geluid als de app open is.</small></span></label>
          <label><input type="radio" name="tmode" value="klok" ${Timers.getMode() === 'klok' ? 'checked' : ''}>
            <span><strong>In de Klok-app</strong><small>Gaat ook af met scherm op slot. Eén wekker tegelijk. Werkt via de app Opdrachten.</small></span></label>
        </div>
        <details class="howto-box">
          <summary>Eenmalig instellen voor de Klok-app</summary>
          <ol class="howto">
            <li>Open de app <strong>Opdrachten</strong> en tik rechtsboven op <strong>+</strong>.</li>
            <li>Tik bovenaan op de naam en noem de opdracht precies <strong>${Timers.SHORTCUT}</strong>.</li>
            <li>Tik op <strong>Zoek naar taken</strong>, typ <strong>timer</strong> en kies <strong>Start timer</strong>.</li>
            <li>Tik in die taak op het getal (<em>30</em>) en kies in de balk boven het toetsenbord <strong>Invoer opdracht</strong>. Laat de eenheid op <strong>minuten</strong> staan.</li>
            <li>Staat er bovenaan iets als <em>Ontvang … invoer van Nergens</em>? Tik dan op <em>Nergens</em> en zet <strong>Opdrachtenbalk</strong> of <strong>Deelpaneel</strong> aan.</li>
            <li>Tik op <strong>Gereed</strong>. Kom terug hier en tik op <strong>Test</strong>.</li>
          </ol>
          <button class="btn ghost" id="testClock">Test: wekker van 1 minuut in de Klok-app</button>
          <p class="small-note">De eerste keer vraagt je iPhone mogelijk of de opdracht de Klok-app mag gebruiken. Kies <strong>Sta toe</strong>.</p>
        </details>`, { badge: `<span class="badge-muted">${Timers.getMode() === 'klok' ? 'Klok-app' : 'in de app'}</span>`, icon: ICONS.timer })}

      ${fold('share', 'Delen', `
        <p>Recepten vanuit Chrome of Safari importeren. Met een opdracht zet je een recept met <strong>Deel → Ricetta importeren</strong> klaar in de app. Je iPhone haalt de pagina zelf op, dus dat werkt vaak ook bij sites die automatisch ophalen blokkeren. Je moet ingelogd zijn bij de online back-up.</p>
        <ol class="howto">
          <li>Open de app <strong>Opdrachten</strong>, tik op <strong>+</strong> en noem de opdracht <strong>Ricetta importeren</strong>.</li>
          <li>Tik onderaan op <strong>ⓘ</strong> (Details) en zet <strong>Toon in deelpaneel</strong> aan. Kies bij de soorten <strong>URL's</strong> en <strong>Safari-webpagina's</strong>.</li>
          <li>Voeg de taak <strong>Haal inhoud op van URL</strong> toe, met als URL de <em>Opdrachtinvoer</em>. Zo haalt je iPhone de receptpagina op.</li>
          <li>Voeg nog een keer <strong>Haal inhoud op van URL</strong> toe. Plak als URL het adres van de knop hieronder. Tik op het pijltje: <strong>Methode POST</strong>, <strong>Verzoekhoofdtekst Formulier</strong>. Voeg drie velden toe:
            <code>key</code> (tekst) = je app-wachtwoord, <code>url</code> (tekst) = <em>Opdrachtinvoer</em>, en <code>html</code> (<strong>bestand</strong>) = de <em>Inhoud van URL</em> van stap 3.</li>
          <li>Voeg de taak <strong>Toon melding</strong> toe, met de variabele <em>Inhoud van URL</em> van stap 4.</li>
        </ol>
        <button class="btn ghost" id="copyShareUrl">Kopieer het adres</button>
        <p class="small-note">In Chrome vind je <strong>Deel</strong> via het deelicoon of het menu <strong>⋯</strong>. De eerste keer vraagt je iPhone of de opdracht de website en coenlips.nl mag gebruiken: kies <strong>Sta toe</strong>. De namen van knoppen in Opdrachten kunnen iets afwijken.</p>
        <details class="howto-box">
          <summary>Alleen Safari: werkt ook bij delicious.</summary>
          <p class="small-note">Sommige sites (zoals delicious.) laten ook je iPhone de pagina niet los ophalen. In Safari kan een opdracht het recept uit de al geladen pagina lezen. Maak dan een tweede opdracht:</p>
          <ol class="howto">
            <li>Nieuwe opdracht <strong>Ricetta (Safari)</strong>, <strong>Toon in deelpaneel</strong> aan, soort alleen <strong>Safari-webpagina's</strong>.</li>
            <li>Taak <strong>Voer JavaScript uit op webpagina</strong> met de code van de knop hieronder.</li>
            <li>Taak <strong>Haal inhoud op van URL</strong> met het adres hierboven: <strong>POST</strong>, <strong>JSON</strong>, velden <code>key</code> = je app-wachtwoord en <code>data</code> = <em>Resultaat JavaScript</em>.</li>
            <li>Taak <strong>Toon melding</strong> met <em>Inhoud van URL</em>.</li>
            <li>iPhone-instellingen → <strong>Apps → Opdrachten → Geavanceerd</strong> → <strong>Sta uitvoeren scripts toe</strong> aan.</li>
          </ol>
          <button class="btn ghost" id="copyShareJs">Kopieer de code</button>
        </details>`, { icon: ICONS.share })}

      ${fold('backup', 'Back-up', `
        <h4 class="sub-head">Online back-up</h4>
        <div id="syncCard">${Sync.cardHtml()}</div>
        <h4 class="sub-head">Back-up als bestand</h4>
        <p>Een extra kopie van je ${state.recipes.length} ${state.recipes.length === 1 ? 'recept' : 'recepten'} als bestand, bijvoorbeeld voor iCloud Drive. Met de online back-up is dit niet nodig.</p>
        <button class="btn" id="exportBtn">Back-up exporteren</button>
        <label class="btn ghost file-btn">Back-up importeren
          <input type="file" accept="application/json,.json" id="importInput" hidden>
        </label>`, { badge: syncBadge(), open: sync.state === 'loggedout' || !!sync.error, icon: ICONS.cloud })}

      <p class="version">Versie ${APP_VERSION}</p>
    </section>`;

  // Open/dicht onthouden
  view.querySelectorAll('details.fold').forEach(d => d.addEventListener('toggle', () => {
    const set = new Set(openFolds());
    d.open ? set.add(d.dataset.fold) : set.delete(d.dataset.fold);
    try { localStorage.setItem(FOLD_KEY, JSON.stringify([...set])); } catch { /* geen opslag */ }
  }));

  Sync.bindCard($('#syncCard'));
  const badge = $('#badge-backup');
  Sync.onChange(function update() {
    if (!badge.isConnected) return false; // kaart weg: ontvanger opruimen
    badge.innerHTML = syncBadge();
  });

  $('#exportBtn').addEventListener('click', exportBackup);
  $('#importInput').addEventListener('change', e => importBackup(e.target.files[0]));
  view.querySelectorAll('[name=tmode]').forEach(r => r.addEventListener('change', () => {
    Timers.setMode(r.value);
    $('#badge-timer').innerHTML = `<span class="badge-muted">${r.value === 'klok' ? 'Klok-app' : 'in de app'}</span>`;
    if (r.value === 'klok') view.querySelector('.howto-box').open = true;
  }));
  $('#testClock').addEventListener('click', () => Timers.startClock(1));
  renderCourseSettings();
  const copyBtn = (sel, text, label) => { const b = $(sel); if (b) b.onclick = async () => {
    try { await navigator.clipboard.writeText(text); b.textContent = '✓ Gekopieerd'; setTimeout(() => { b.textContent = label; }, 1500); } catch { toast('Kopiëren lukte niet'); }
  }; };
  copyBtn('#copyShareJs', Importer.SHARE_JS, 'Kopieer de code');
  copyBtn('#copyShareUrl', (typeof SYNC_CONFIG !== 'undefined' && SYNC_CONFIG.api ? SYNC_CONFIG.api : '') + '?action=inbox_add', 'Kopieer het adres');
}

// Instellingen → Gangen: toevoegen, volgorde aanpassen, verwijderen
function renderCourseSettings() {
  const el = $('#courseSettings');
  if (!el) return;
  const list = courseList();
  const used = c => state.recipes.filter(r => (r.courses || []).includes(c)).length;
  el.innerHTML = `
    <p>De gangen waaruit je kiest bij een recept, in deze volgorde.</p>
    <ul class="course-admin">
      ${list.map((c, i) => `
        <li data-i="${i}">
          <span class="ca-name">${esc(c)}<small>${used(c) ? `${used(c)} recept${used(c) === 1 ? '' : 'en'}` : ''}</small></span>
          <button class="ca-btn ca-edit" data-act="edit" aria-label="Naam aanpassen">${ICONS.edit}</button>
          <button class="ca-btn" data-act="up" aria-label="Omhoog" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="ca-btn" data-act="down" aria-label="Omlaag" ${i === list.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="ca-btn ca-del" data-act="del" aria-label="Verwijderen">×</button>
        </li>`).join('')}
    </ul>
    <form class="shop-add" id="courseAdd" autocomplete="off">
      <input name="course" placeholder="Nieuwe gang, bijv. Borrelhapje" autocapitalize="sentences" enterkeyhint="done">
      <button class="btn small" aria-label="Toevoegen">+</button>
    </form>`;
  const changed = async () => {
    await AppSettings.save();
    renderCourseSettings();
    const b = $('#badge-courses'); if (b) b.innerHTML = `<span class="badge-muted">${courseList().length}</span>`;
  };
  el.querySelectorAll('.course-admin li').forEach(li => li.querySelectorAll('[data-act]').forEach(btn => btn.onclick = async () => {
    const i = +li.dataset.i, c = list[i];
    if (btn.dataset.act === 'edit') { editCourse(li, i); return; }
    if (btn.dataset.act === 'up') [list[i - 1], list[i]] = [list[i], list[i - 1]];
    if (btn.dataset.act === 'down') [list[i + 1], list[i]] = [list[i], list[i + 1]];
    if (btn.dataset.act === 'del') {
      const n = used(c);
      if (n && !confirm(`"${c}" wordt gebruikt bij ${n} recept${n === 1 ? '' : 'en'}. Verwijderen? Voeg je de gang later opnieuw toe, dan komt het label terug.`)) return;
      list.splice(i, 1);
    }
    await changed();
  }));
  // Naam van een gang aanpassen; recepten met die gang gaan mee
  function editCourse(li, i) {
    const old = list[i];
    li.innerHTML = `
      <form class="ca-rename" autocomplete="off">
        <input name="name" value="${esc(old)}" aria-label="Nieuwe naam" autocapitalize="sentences" enterkeyhint="done">
        <button class="ca-btn ca-ok" aria-label="Opslaan">✓</button>
        <button type="button" class="ca-btn" data-cancel aria-label="Annuleren">×</button>
      </form>`;
    const form = li.querySelector('form'), input = form.name;
    input.focus(); input.select();
    li.querySelector('[data-cancel]').onclick = () => renderCourseSettings();
    input.addEventListener('keydown', e => { if (e.key === 'Escape') renderCourseSettings(); });
    form.onsubmit = async e => {
      e.preventDefault();
      const raw = input.value.trim();
      if (!raw) { input.focus(); return; }
      const name = raw[0].toLocaleUpperCase('nl') + raw.slice(1);
      if (name === old) { renderCourseSettings(); return; }
      if (list.some((c, j) => j !== i && c.toLowerCase() === name.toLowerCase())) { toast(`"${name}" bestaat al`); input.focus(); return; }
      list[i] = name;
      for (const r of state.recipes) {
        if (!(r.courses || []).includes(old)) continue;
        r.courses = [...new Set(r.courses.map(c => c === old ? name : c))];
        await DB.put(r);
      }
      if (state.course === old) state.course = name;
      await AppSettings.save();
      await loadRecipes();
      renderCourseSettings();
      toast(`"${old}" heet nu "${name}"`);
    };
  }

  el.querySelector('#courseAdd').onsubmit = async e => {
    e.preventDefault();
    const raw = e.target.course.value.trim();
    if (!raw) return;
    const name = raw[0].toLocaleUpperCase('nl') + raw.slice(1);
    if (list.some(c => c.toLowerCase() === name.toLowerCase())) { toast(`"${name}" staat er al`); return; }
    list.push(name);
    await changed();
    // Recepten met een gelijknamige categorie kunnen meteen deze gang krijgen
    const withCat = state.recipes.filter(r => usesCategory(r, name)).length;
    if (withCat && confirm(`${withCat} recept${withCat === 1 ? ' heeft' : 'en hebben'} de categorie "${name}". Wil je die als gang "${name}" markeren?`)) {
      await migrateCourses([name]);
      await loadRecipes();
      renderCourseSettings();
    }
    $('#courseSettings [name=course]').focus();
  };
}

async function exportBackup() {
  const data = JSON.stringify({ app: 'recepten', version: 1, exportedAt: new Date().toISOString(), recipes: state.recipes });
  const name = `ricetta-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([data], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Ricetta back-up' }); return; } catch { return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importBackup(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const list = Array.isArray(data) ? data : data.recipes;
    if (!Array.isArray(list)) throw new Error();
    const valid = list.filter(r => r && r.id && r.title);
    await DB.putMany(valid);
    await loadRecipes();
    toast(`${valid.length} recepten geïmporteerd`);
    renderSettings();
  } catch {
    toast('Dit is geen geldig back-upbestand');
  }
}

/* ---------- Voorbeeld ---------- */

async function addSample() {
  // De foto staat bij de app; als data-URL opslaan zodat hij net als je eigen foto's meesynct
  const photo = await resizeImage('images/bolognese.jpg').catch(() => '');
  await DB.put({
    id: uid(),
    title: 'Ragù alla Bolognese',
    description: 'Bolognesesaus, hét originele recept',
    categories: ['Italiaans'],
    courses: ['Hoofdgerecht'],
    tags: ['klassieker'],
    servings: 8,
    prepTime: 30,
    cookTime: 180,
    ingredients: [
      '# Saus',
      '250 g pancetta (alternatief: spekblokjes)',
      '2 st winterpeen (in kleine blokjes gesneden)',
      '4 stengels bleekselderij (in kleine blokjes gesneden)',
      '2 st ui (fijn gesnipperd)',
      '400 g rundergehakt',
      '400 g kalfsgehakt (optioneel, anders 800 g rundergehakt in totaal gebruiken)',
      '300 ml witte wijn',
      '1000 g gepelde tomaten (kan ook uit blik)',
      '2 blokjes runderbouillon',
      'peper',
      'zout',
      'olijfolie',
      'melk (een scheut)',
      '# Serveren',
      'Parmezaanse kaas (geschaafd of geraspt)',
      'tagliatelle of pappardelle pasta (liefst vers!)',
      '# Benodigdheden',
      'Grote braadpan of slowcooker.',
      'pasta borden',
    ].join('\n'),
    steps: [
      '# Saus',
      "Snij de ui, de winterpeen en bleekselderij in kleine blokjes, van zo'n halve centimeter.",
      'Verhit een laagje olijfolie in een grote braadpan.',
      'Zodra de olie heet is, voeg je er de fijngesneden groente aan toe samen met de pancetta (of spekblokjes). Bak alles samen ongeveer 10 minuten op laag vuur, zodat de groenten zacht worden.',
      'Voeg het runder- en kalfsgehakt toe en bak het geheel nog eens tien minuten op zacht vuur, totdat het vlees gaar is. Rul het gehakt door regelmatig met een houten lepel te roeren. Breng het geheel op smaak met wat peper en zout.',
      'Giet de witte wijn erbij. Laat alles rustig koken op laag vuur tot het vocht is ingedampt.',
      'Snij de tomaten in stukjes en voeg ze toe aan de pan. Verkruimel nu ook de bouillonblokjes en voeg deze ook toe.',
      'Breng het geheel aan de kook en laat het geheel inkoken. Vergeet niet om regelmatig te roeren om aanbranden van de saus te voorkomen.',
      'Je kunt nu de pan met de saus het beste in een oven op 150 graden (Celsius) plaatsen. De saus kan zo rustig doorsudderen en dit is erg belangrijk voor het ontwikkelen van de juiste smaak.',
      'Haal na 2 á 3 uur de pan uit de oven. Indien het nodig is kun je de saus nog enigszins inkoken op een medium vuur. Roer hierna een scheut melk door de saus en laat deze nog even zachtjes koken.',
      'Heb je geen oven? Je kunt deze saus ook goed op laag vuur laten sudderen met een sudderplaatje of vlamverdeler op het fornuis.',
      'Je kunt de bolognesesaus ook bereiden in een slowcooker. Een slowcooker heeft als voordeel dat je deze wat makkelijker aan kunt laten staan als je zelf weg bent. En hij gebruikt ook een stuk minder energie dan je oven, dus dat is ook direct een stuk duurzamer!',
      '# Pasta',
      'Breng een grote pan met water aan de kook. Voeg ruim zout toe, het water moet zo zout zijn als de zee.',
      'Voeg de pasta (tagliatelle of pappardelle) toe en kook de pasta volgens de instructies op de verpakking. Gedroogde tagliatelle heeft een kooktijd van 7 tot 10 minuten. Voor verse tagliatelle is dit maar een paar minuten. Let hier dus goed op.',
      'Giet de pasta af. Voeg nu de bolognesesaus toe en meng deze met de pasta.',
      'Serveer de pasta met bolognesesaus bij voorkeur op mooie diepe pastaborden, liefst voorverwarmd. Strooi er geraspte / geschaafde Parmezaanse kaas over.',
      'Buon appetito!',
    ].join('\n'),
    notes: '',
    photo,
    favorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  await loadRecipes();
  renderList();
}

/* ---------- Router ---------- */

// Elk schermwissel krijgt een nummer; trage schermen tekenen niet meer als er al een nieuwer is.
let routeSeq = 0;
const isStale = seq => seq !== routeSeq;

async function route() {
  routeSeq++;
  const hash = location.hash || '#/';
  const [, page, id] = hash.split('/');
  window.scrollTo(0, 0);

  if (page !== 'r' && state.cookMode) setCookMode(false);
  document.body.dataset.page = ({ r: 'detail', edit: 'edit', new: 'edit', settings: 'settings', boodschappen: 'shop' })[page] || 'list';

  if (page === 'r' && id) return renderDetail(decodeURIComponent(id));
  if (page === 'edit' && id) return renderEdit(decodeURIComponent(id));
  if (page === 'new') return renderEdit(null);
  if (page === 'settings') return renderSettings();
  if (page === 'boodschappen') {
    setHeader({ title: 'Boodschappen', back: true, timer: false });
    return Shopping.render(view);
  }
  return renderList();
}

// Inzoomen met twee vingers blokkeren (iOS negeert user-scalable=no soms).
['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

// Updates: zoek naar een nieuwe versie bij elke keer openen en laad die dan meteen.
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Alleen herladen bij een update, niet bij de allereerste installatie,
    // en niet midden in het bewerken van een recept.
    if (!hadController || reloaded || location.hash.startsWith('#/edit') || location.hash === '#/new') return;
    reloaded = true;
    location.reload();
  });
}

document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) location.hash = go.dataset.go;
});

window.addEventListener('hashchange', () => { state.navigated = true; route(); });

// Als er recepten van een ander toestel binnenkomen: lijst bijwerken
Sync.onRemoteChange = async () => {
  await loadRecipes();
  const page = (location.hash || '#/').split('/')[1];
  await Shopping.load();
  await AppSettings.load();
  if (!page) renderList();
  if (page === 'settings') renderCourseSettings();
  Importer.checkInbox();
  if (page === 'boodschappen') Shopping.render(view);
};

(async () => {
  await loadRecipes();
  await AppSettings.load();
  await migrateCoursesOnce();
  await Shopping.load();
  route();
  registerServiceWorker();
  Importer.checkInbox();   // recepten die vanuit Safari zijn gedeeld
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
