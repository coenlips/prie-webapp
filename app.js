'use strict';

// Verhoog dit bij elke nieuwe versie, samen met VERSION in sw.js.
const APP_VERSION = '1.1.3 · 24 november 2026';

/* ---------- Hulpfuncties ---------- */

const $ = sel => document.querySelector(sel);
const view = $('#view');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const ICONS = {
  news: '<svg viewBox="0 0 24 24"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
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
  cook: '<svg viewBox="0 0 24 24"><path d="M7 13.5a3.5 3.5 0 1 1 1.3-6.75 4 4 0 0 1 7.4 0A3.5 3.5 0 1 1 17 13.5"/><path d="M7 13.5V19a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-5.5M7 16.5h10"/></svg>',
  timer: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M10 2.5h4M12 2.5V6M18.5 6.5l1.5-1.5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5v13c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z"/><path d="M12 6v13.5"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/></svg>',
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

/* ---------- Recepten koppelen ---------- */
// r.links = [{ id, kind }] met kind 'part' (onderdeel, bijv. pizzadeeg) of 'with' (lekker met).
// Koppel je A aan B, dan ziet B dat vanzelf ('Gebruikt in' of 'Lekker met').
const LINK_KINDS = { part: 'Onderdeel', with: 'Lekker met' };
const recipeById = id => state.recipes.find(x => x.id === id);
const linksOf = r => (Array.isArray(r.links) ? r.links : [])
  .filter(l => l && LINK_KINDS[l.kind] && l.id !== r.id && recipeById(l.id));
function relatedOf(r) {
  const parts = [], withs = [], usedIn = [];
  for (const l of linksOf(r)) (l.kind === 'part' ? parts : withs).push(recipeById(l.id));
  for (const o of state.recipes) {
    if (o.id === r.id) continue;
    const l = linksOf(o).find(x => x.id === r.id);
    if (!l) continue;
    if (l.kind === 'part') usedIn.push(o);
    else if (!withs.includes(o)) withs.push(o);
  }
  return { parts, usedIn: usedIn.filter(x => !parts.includes(x)), withs: withs.filter(x => !parts.includes(x) && !usedIn.includes(x)) };
}
// Herkennen of een ingrediënt een ander recept noemt. Tolerant: hoofdletters, accenten, meervoud
// (hoorntje/hoorntjes) en een kleine typefout (oublihoorntjes/oubliehoorntjes) tellen mee, en elk
// betekenisvol deel van de naam ('Pizzasaus van oma' → 'pizzasaus', 'Oubliehoorntjes en cups maken' → 'oubliehoorntjes').
const LINK_STOP = new Set(['maken', 'zelfgemaakte', 'zelfgemaakt', 'huisgemaakte', 'huisgemaakt', 'recept', 'basis', 'basisrecept',
  'snelle', 'simpele', 'makkelijke', 'klassieke', 'lekkere', 'heerlijke', 'oma', 'opa', 'mama', 'papa', 'van', 'met', 'en', 'of',
  'de', 'het', 'een', 'voor', 'in', 'uit', 'op', 'aan', 'zonder', 'extra', 'echte', 'originele', 'italiaanse', 'hollandse']);
const normWord = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
function sameWord(a, b) {
  if (a === b) return true;
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  if (s.length >= 4 && ['s', 'en', 'e', "'s"].some(x => s + x === l)) return true;   // meervoud
  const d = editDistance(a, b);
  return (s.length >= 6 && d <= 1) || (s.length >= 10 && d <= 2);
}
const wordsOf = text => [...String(text).matchAll(/[\p{L}\p{N}]+/gu)].map(m => ({ w: normWord(m[0]), start: m.index, end: m.index + m[0].length }));
// Zoekt in de regels een stuk van de receptnaam; geeft { i, phrase } (phrase = de tekst zoals in de regel)
function findRecipeInLines(ingrLines, recipe, skip = new Set()) {
  const tw = wordsOf(recipe.title).map(t => t.w);
  const cands = [];
  for (let n = tw.length; n >= 1; n--) for (let s = 0; s + n <= tw.length; s++) {
    const part = tw.slice(s, s + n);
    if (n === 1 && (part[0].length < 5 || LINK_STOP.has(part[0]))) continue;
    if (n > 1 && part.every(w => LINK_STOP.has(w))) continue;
    cands.push(part);
  }
  for (const part of cands) {
    for (let i = 0; i < ingrLines.length; i++) {
      const l = ingrLines[i];
      if (l.startsWith('#') || skip.has(i)) continue;
      const lw = wordsOf(l);
      for (let k = 0; k + part.length <= lw.length; k++) {
        if (part.every((w, j) => sameWord(w, lw[k + j].w))) return { i, phrase: l.slice(lw[k].start, lw[k + part.length - 1].end) };
      }
    }
  }
  return null;
}
// Welk ingrediënt noemt welk onderdeel? Geeft per regelnummer { recipe, phrase }.
function ingredientLinks(ingrLines, parts) {
  const found = new Map();
  for (const p of parts) {
    const hit = findRecipeInLines(ingrLines, p, new Set(found.keys()));
    if (hit) found.set(hit.i, { recipe: p, phrase: hit.phrase });
  }
  return found;
}
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function linkIngredientHtml(html, link) {
  const re = new RegExp(escRe(esc(link.phrase)), 'i');
  const id = esc(link.recipe.id);
  const marked = re.test(html) ? html.replace(re, m => `<a class="ing-link" href="#/r/${id}" data-link="${id}">${m}</a>`) : html;
  return `${marked}<a class="ing-go" href="#/r/${id}" data-link="${id}" aria-label="Open het recept ${esc(link.recipe.title)}">recept ›</a>`;
}
function linkCard(x) {
  return `<a class="link-card" href="#/r/${esc(x.id)}" data-link="${esc(x.id)}">${x.photo
    ? `<img src="${x.photo}" alt="" loading="lazy">` : `<span class="link-nophoto">${ICONS.plate}</span>`}<b>${esc(x.title)}</b></a>`;
}
function relatedHtml(r) {
  const { parts, usedIn, withs } = relatedOf(r);
  if (!parts.length && !usedIn.length && !withs.length) return '';
  const group = (t, list) => list.length ? `<p class="links-sub">${t}</p><div class="link-cards">${list.map(linkCard).join('')}</div>` : '';
  return `<section class="links-box"><h3>Hoort bij dit recept</h3>${group('Onderdelen', parts)}${group('Gebruikt in', usedIn)}${group('Lekker met', withs)}</section>`;
}
// Naar een gekoppeld recept; het terug-pijltje brengt je weer terug
function goRecipe(id, fromId) {
  if (fromId) state.backStack = [...(state.backStack || []), fromId];
  location.hash = '#/r/' + encodeURIComponent(id);
}
// Kookstand: gekoppeld recept als spiekvenster, zodat je je plek niet kwijtraakt
function openPeek(x, fromId) {
  const ing = lines(x.ingredients), st = lines(x.steps);
  const sheet = openAccSheet(`
    <div class="sheet-head"><h3>${esc(x.title)}</h3><button class="text-btn" data-close>Sluit</button></div>
    <div class="peek">
      <h4>Ingrediënten (${x.servings || 1} ${x.servings === 1 ? 'portie' : 'porties'})</h4>
      <ul>${ing.map(l => l.startsWith('#') ? `<li class="peek-sub">${esc(l.replace(/^#+\s*/, ''))}</li>` : `<li>${esc(l)}</li>`).join('')}</ul>
      <h4>Bereiding</h4>
      <ol>${st.map(l => l.startsWith('#') ? `<li class="peek-sub">${esc(l.replace(/^#+\s*/, ''))}</li>` : `<li>${esc(l)}</li>`).join('')}</ol>
      <button class="btn ghost" id="peekOpen">Open het hele recept</button>
    </div>`, x.title);
  sheet.$('#peekOpen').onclick = () => { sheet.close(); setCookMode(false); goRecipe(x.id, fromId); };
}

/* ---------- Vegetarisch en vegan ---------- */
// Per recept r.diet = 'vegetarisch' | 'vegan' | ''. Logo's (cirkel met blaadje) als SVG-symbolen,
// eenmalig in de pagina gezet en daarna overal hergebruikt.
const DIETS = {
  vegetarisch: { label: 'Vegetarisch', tip: 'Vegetarisch: zonder vlees en vis', bg: '#008C44', fg: '#FFF200' },
  vegan: { label: 'Vegan', tip: 'Vegan: zonder vlees, vis, zuivel, eieren en andere dierlijke producten', bg: '#FFF200', fg: '#008C44' },
};
const DIET_LEAF = 'M 142.765625 170.960938 C 142.765625 170.960938 143.359375 167.660156 143.570312 166.1875 C 144.9375 157.621094 145.78125 148.902344 147.960938 140.515625 C 150.542969 130.914062 153.304688 120.691406 157.824219 111.761719 C 158.652344 110.398438 159.984375 107.765625 161.953125 107.871094 C 167.117188 107.472656 172.328125 105.792969 176.566406 102.683594 C 179.730469 100.351562 182.222656 97.722656 183.988281 94.183594 C 185.347656 90.601562 185.925781 87.078125 185.90625 83.238281 C 185.964844 79.773438 186.503906 76.65625 187.847656 73.457031 C 188.136719 72.574219 188.480469 71.714844 188.414062 70.765625 C 186.445312 70.5625 183.910156 72.242188 182.097656 72.914062 C 177.804688 74.34375 173.097656 74.96875 168.675781 75.828125 C 165.082031 76.4375 161.800781 77.46875 158.828125 79.65625 C 153.953125 83.109375 151.515625 87.371094 149.691406 93.027344 C 148.917969 96.214844 148.269531 99.90625 148.496094 103.175781 L 148.667969 103.550781 C 149.492188 103.273438 150.917969 100.761719 151.378906 100.015625 C 154.289062 95.507812 157.160156 91.425781 161.5625 88.097656 C 162.289062 87.660156 166.445312 85.378906 166.964844 86.507812 C 166.894531 87.980469 164.511719 90.039062 163.558594 91.21875 C 154.984375 101.328125 149.953125 114.890625 145.472656 127.183594 C 143.007812 133.988281 141.472656 141.199219 138.574219 147.796875 C 138.4375 148.035156 138.230469 148.515625 137.972656 148.636719 C 137.175781 147.84375 136.71875 145.929688 136.390625 144.867188 C 135.074219 140.195312 133.921875 135.355469 132.585938 130.683594 C 129.308594 118.332031 125.429688 103.886719 117.890625 93.34375 C 112.113281 85.710938 104.347656 77.046875 95.0625 73.722656 C 94.945312 73.726562 94.707031 73.730469 94.589844 73.730469 C 94.246094 74.472656 95.0625 75.027344 95.519531 75.539062 C 106.679688 86.945312 115.65625 102.515625 120.496094 117.609375 C 125.515625 133.4375 130.246094 150.335938 133.046875 166.726562 C 133.285156 168.050781 133.582031 169.664062 133.910156 170.960938 C 133.910156 170.960938 136.917969 171.148438 138.324219 171.148438 C 139.726562 171.148438 142.765625 170.960938 142.765625 170.960938';
document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${
  Object.entries(DIETS).map(([k, d]) => `<symbol id="diet-${k}" viewBox="-8 -8 216 216" overflow="visible"><circle cx="100" cy="100" r="100" fill="${d.bg}"/><path fill="${d.fg}" transform="translate(-76.875 -49.6875) scale(1.25)" d="${DIET_LEAF}"/></symbol>`).join('')
}</defs></svg>`);
const dietOf = r => (r && DIETS[r.diet] ? r.diet : '');
// Logo met tekst; met tip een uitleg bij aanwijzen (muis) of aantikken (iPhone)
function dietBadge(kind, { tip = true, text = true } = {}) {
  const d = DIETS[kind];
  if (!d) return '';
  const attrs = tip ? ` role="img" aria-label="${d.tip}" data-tip="${d.tip}" tabindex="0"` : '';
  return `<span class="diet diet-${kind}"${attrs}><svg viewBox="-8 -8 216 216" overflow="visible" aria-hidden="true"><use href="#diet-${kind}"/></svg>${text ? `<span class="diet-text">${d.label}</span>` : ''}</span>`;
}
// Oude categorieën als 'Vega' worden omgezet naar het vinkje (en verdwijnen als categorie)
const DIET_WORD_RE = /^(vega|veggie|vegetarisch|vegetarian|vegan|veganistisch|plantaardig)$/i;
function dietFromWords(r) {
  const cats = catsOf(r), hits = cats.filter(c => DIET_WORD_RE.test(c));
  const tagHits = (r.tags || []).filter(t => DIET_WORD_RE.test(String(t).replace(/^#/, '')));
  if (!hits.length && (dietOf(r) || !tagHits.length)) return null;
  const words = [...hits, ...tagHits].join(' ').toLowerCase();
  const diet = dietOf(r) || (/vegan|plantaardig/.test(words) ? 'vegan' : 'vegetarisch');
  return { ...r, diet, categories: cats.filter(c => !DIET_WORD_RE.test(c)) };
}

// Uitleg bij het logo: aanwijzen met de muis, of aantikken op de iPhone/iPad
const Tip = (() => {
  let el = null, timer = 0;
  function show(target, auto) {
    if (!el) { el = document.createElement('div'); el.className = 'tip'; el.setAttribute('role', 'tooltip'); document.body.append(el); }
    el.textContent = target.dataset.tip;
    el.classList.add('on');
    const r = target.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    const above = r.top - h - 8;
    el.style.top = (above >= 8 ? above : r.bottom + 8) + 'px';
    clearTimeout(timer);
    if (auto) timer = setTimeout(hide, 2800);
  }
  function hide() { if (el) el.classList.remove('on'); }
  const tipOf = t => t && t.closest && t.closest('.diet[data-tip]');
  document.addEventListener('pointerover', e => { if (e.pointerType === 'mouse' && tipOf(e.target)) show(tipOf(e.target)); });
  document.addEventListener('pointerout', e => { if (e.pointerType === 'mouse' && tipOf(e.target) && !tipOf(e.relatedTarget)) hide(); });
  // Aantikken: uitleg tonen in plaats van het recept te openen
  document.addEventListener('click', e => {
    const t = tipOf(e.target);
    if (!t) { hide(); return; }
    e.preventDefault(); e.stopPropagation();
    show(t, true);
  }, true);
  document.addEventListener('focusin', e => { if (tipOf(e.target)) show(tipOf(e.target)); });
  document.addEventListener('focusout', e => { if (tipOf(e.target)) hide(); });
  addEventListener('scroll', hide, { passive: true, capture: true });
  return { hide };
})();


// Is dit een drankje? Dan 'Proost!' in plaats van 'Eet smakelijk!'. Kijkt naar categorieën, gangen en
// tags, met woordstammen zodat ook vervoegingen en andere talen meetellen (drank, dranken, drinken,
// drinks, softdrinks, Getränke, boissons, bebidas, bevande, cocktails, beverages, ...).
const DRINK_RE = /drank|drink|getr[aä]nk|boisson|bebida|bevand|bibit|napoj|cocktail|mocktail|beverage/i;
const isDrink = r => [...(r.courses || []), ...catsOf(r), ...(r.tags || [])].some(w => DRINK_RE.test(w));
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
  let list = (await DB.all()).filter(r => !String(r.id).startsWith('__'));
  // Categorie 'Vega' e.d. omzetten naar het vinkje Vegetarisch/Vegan
  const converted = list.map(dietFromWords).filter(Boolean);
  if (converted.length) {
    await DB.putMany(converted);
    const byId = new Map(converted.map(r => [r.id, r]));
    list = list.map(r => byId.get(r.id) || r);
  }
  state.recipes = list.sort((a, b) => a.title.localeCompare(b.title, 'nl'));
}

/* ---------- Kopbalk ---------- */

// close: kruisje links om snel terug te gaan naar je eigen overzicht; lead: iconen vóór de wekker
function setHeader({ title = 'Ricetta', back = false, close = false, lead = '', actions = '', timer = true, timerLabel = '' } = {}) {
  // In de menubalk alleen de naam Ricetta (op het overzicht); andere schermen geen titel, alleen de iconen.
  // De schermtitel blijft wel de titel van het tabblad en voor voorleessoftware.
  $('#title').textContent = title;
  $('#title').classList.toggle('title-hidden', title !== 'Ricetta' || back || close);
  $('#backBtn').hidden = !back;
  $('#closeBtn').hidden = !close;
  $('#topActions').innerHTML = lead + (timer ? `<button class="icon-btn" id="timerBtn" aria-label="Kookwekker">${ICONS.timer}</button>` : '') + actions;
  if (timer) $('#timerBtn').onclick = () => Timers.openSheet(timerLabel);
  document.body.classList.toggle('no-fab', !!(back || close));
  $('#addBtn').hidden = !!(back || close);
  document.title = title === 'Ricetta' ? 'Ricetta' : `${title} · Ricetta`;
}

$('#closeBtn').addEventListener('click', () => {
  if (state.cookMode) setCookMode(false);
  location.hash = '#/';
});

$('#backBtn').addEventListener('click', () => {
  // in de kookstand: terug naar het gewone receptscherm
  if (state.cookMode) { setCookMode(false); return; }
  const page = (location.hash || '#/').split('/')[1];
  if (page === 'r' && state.backStack?.length) { location.hash = '#/r/' + encodeURIComponent(state.backStack.pop()); return; }
  const parts = (location.hash || '#/').split('/');
  if (page === 'kookboek' && parts[3]) { location.hash = `#/kookboek/${parts[2]}`; return; }
  if (page === 'kookboek') { location.hash = '#/kookboeken'; return; }
  if (page === 'kookboeken' || page === 'ontvangen') { location.hash = '#/'; return; }
  if (page === 'gebruikers') location.hash = '#/settings';
  else if (page === 'r' || page === 'settings' || !state.navigated) location.hash = '#/';
  else history.back();
});
$('#addBtn').addEventListener('click', () => Importer.openSheet());

/* ---------- Lijst ---------- */

function renderList() {
  const filtersOpen = (() => { try { return localStorage.getItem('ricetta-filters-open') !== '0'; } catch { return true; } })();
  setHeader({ lead: loggedIn() ? `<button class="icon-btn books-btn" data-go="#/kookboeken" aria-label="Ricette van anderen" title="Ricette van anderen">${ICONS.book}</button>` : '', actions: `
    <button class="icon-btn cart-btn" data-go="#/boodschappen" aria-label="Boodschappenlijst">${ICONS.basket}<span class="cart-badge" hidden></span></button>
    <button class="icon-btn filter-toggle${filtersOpen ? ' on' : ''}" id="filterToggle" aria-controls="listHead" aria-expanded="${filtersOpen}" aria-label="Zoeken en filters" title="Zoeken en filters">${ICONS.filter}<span class="filter-dot" hidden></span></button>
    <button class="icon-btn settings-btn" data-go="#/settings" aria-label="Instellingen">${ICONS.gear}</button>
    <button class="add-top" id="addTop" aria-label="Nieuw recept">${ICONS.plus}</button>` });
  $('#addTop').onclick = () => Importer.openSheet();
  Shopping.updateBadge();

  const cats = catsByUse();
  const diets = ['vegetarisch', 'vegan'].filter(k => state.recipes.some(r => k === 'vegan' ? dietOf(r) === 'vegan' : dietOf(r)));
  if (state.filter.startsWith('diet:') && !diets.includes(state.filter.slice(5))) state.filter = 'all';
  const chips = [['all', 'Alles'], ['fav', '♥'], ...diets.map(k => ['diet:' + k, k]), ...cats.map(c => [c, c])];
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
        : k.startsWith('diet:')
        ? `<button class="chip chip-diet${state.filter === k ? ' on' : ''}" data-filter="${esc(k)}">${dietBadge(l, { tip: false })}</button>`
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
    const head = $('#listHead'), btn = $('#filterToggle');
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.classList.toggle('on', open);
    btn.setAttribute('aria-expanded', open);
    try { localStorage.setItem('ricetta-filters-open', open ? '1' : '0'); } catch {}
    foldFilters(head, open);
  };
  $('#surprise').onclick = () => {
    Mag.shuffle();
    renderCards();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  renderCards();
  Importer.checkInbox({ maxAge: 20000 });   // toont meteen wat er al bekend is, en kijkt zo nu en dan op de server
}

// In- en uitklappen van zoeken en filters. Soepel doordat alleen geschoven wordt (transform):
// het menu schuift onder de kopbalk weg en de recepten schuiven mee. De echte opmaak
// verandert maar één keer (bij dichtklappen aan het eind, bij openklappen aan het begin),
// zodat het raster met grote foto's niet elk beeldje opnieuw berekend hoeft te worden.
// clip: het menu staat niet direct onder de kopbalk (bijv. onder het vaandel van iemands Ricette).
// Dan blijft het staan en wordt het van onderaf dichtgeschoven, als een rolgordijn.
function foldFilters(head, open, { clip = false, also = [] } = {}) {
  const els = [head];
  for (let n = head.nextElementSibling; n; n = n.nextElementSibling) els.push(n);
  els.push(...also.filter(Boolean));
  // halverwege een animatie omgedraaid? dan verder vanaf waar het menu nu is
  const probe = clip ? els[1] : head;
  const y = head._fold && probe ? new DOMMatrix(getComputedStyle(probe).transform).m42 : null;
  (head._fold || []).forEach(a => a.cancel());
  head._fold = null;
  if (!open && head.contains(document.activeElement)) document.activeElement.blur();
  head.classList.add('closed');
  const hClosed = head.offsetHeight;
  head.classList.remove('closed');
  const d = head.offsetHeight - hClosed;
  if (!d || !head.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    head.classList.toggle('closed', !open);
    return;
  }
  const from = y ?? (open ? -d : 0), to = open ? 0 : -d;
  const opts = { duration: 280 * Math.max(.3, Math.abs(to - from) / d), easing: 'cubic-bezier(.3, .7, .2, 1)', fill: 'forwards' };
  const frames = [{ transform: `translateY(${from}px)` }, { transform: `translateY(${to}px)` }];
  const headFrames = clip ? [{ clipPath: `inset(0 0 ${-from}px 0)` }, { clipPath: `inset(0 0 ${-to}px 0)` }] : frames;
  const run = () => els.map((el, i) => el.animate(i === 0 ? headFrames : frames, opts));
  if (open) {
    // nu al open in de opmaak; schuift vanonder de kopbalk tevoorschijn
    head._fold = run();
    head._fold[0].finished.then(() => { head._fold.forEach(a => a.cancel()); head._fold = null; }, () => {});
  } else {
    // nog even open laten staan, onder de kopbalk wegschuiven, en dan pas echt dichtklappen
    head._fold = run();
    head._fold[0].finished.then(() => {
      head.classList.add('closed');
      head._fold.forEach(a => a.cancel());
      head._fold = null;
    }, () => {});
  }
}

function renderCards() {
  const q = state.query.trim().toLowerCase();
  const dot = $('#filterToggle .filter-dot');
  if (dot) dot.hidden = !(q || state.filter !== 'all' || state.course);
  const list = state.recipes.filter(r => {
    if (state.filter === 'fav' && !r.favorite) return false;
    if (state.filter === 'diet:vegetarisch' && !dietOf(r)) return false;      // vegan is ook vegetarisch
    if (state.filter === 'diet:vegan' && dietOf(r) !== 'vegan') return false;
    if (state.filter !== 'all' && state.filter !== 'fav' && !state.filter.startsWith('diet:') && !catsOf(r).includes(state.filter)) return false;
    if (state.course && !coursesOf(r).includes(state.course)) return false;
    if (!q) return true;
    const dietWords = dietOf(r) === 'vegan' ? 'vegan veganistisch plantaardig vegetarisch vega veggie' : dietOf(r) ? 'vegetarisch vega veggie' : '';
    return [r.title, ...coursesOf(r), ...catsOf(r), r.ingredients, (r.tags || []).join(' '), dietWords].join(' ').toLowerCase().includes(q);
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
        ${loggedIn() ? `<a class="btn ghost empty-books" href="#/kookboeken">${ICONS.book} Ricette van anderen bekijken</a>` : ''}
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
          <div class="card-meta">${dietBadge(dietOf(r), { text: false })}${[coursesOf(r).join(', '), catsOf(r).join(', '), time].filter(Boolean).map(esc).join(' · ')}</div>
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
  // tijdens het meten niet afkappen (regelafkapping uit)
  const keep = [s.display, s.webkitLineClamp];
  if (getComputedStyle(el).webkitLineClamp !== 'none') { s.display = 'block'; s.webkitLineClamp = 'unset'; }
  // het vaandel krimpt mee met de tekst; meet met de volle breedte die het mag hebben
  const flag = el.closest('.flag'), keepW = flag && flag.style.width;
  if (flag) flag.style.width = '100%';
  const node = [...el.childNodes].find(n => n.nodeType === 3);
  const cs = getComputedStyle(el);
  const room = () => el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  // Past het? Niet meer regels dan gewenst, en elk woord op één regel met wat speling
  // (een paar procent marge, zodat het ook in Safari net zo uitvalt).
  const fits = lines => {
    if (lineCount(el) > lines) return false;
    if (!node) return true;
    const max = room() * .97, text = node.textContent, re = /\S+/g;
    for (let m; (m = re.exec(text));) {
      const r = document.createRange(); r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length);
      const rects = [...r.getClientRects()].filter(x => x.width > 1);
      if (new Set(rects.map(x => Math.round(x.top))).size > 1) return false;
      if (rects.reduce((w, x) => w + x.width, 0) > max) return false;
    }
    return true;
  };
  let size = parseFloat(cs.fontSize);
  for (const { lines, min } of steps) {
    while (!fits(lines) && size > min) { size = Math.max(min, size - 2); s.fontSize = size + 'px'; }
    if (fits(lines)) break;
  }
  [s.display, s.webkitLineClamp] = keep;
  if (flag) flag.style.width = keepW;
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
const detailWideMQ = matchMedia('(min-width: 900px)');   // receptpagina: foto links, recept rechts
const isWide = () => wideMQ.matches;
// Hoogte van de kopbalk bijhouden, zodat de zoekbalk (iPad/laptop) er precies onder blijft staan
new ResizeObserver(([e]) => document.documentElement.style.setProperty('--topbar-h', e.target.getBoundingClientRect().height + 'px')).observe($('.topbar'), { box: 'border-box' });
wideMQ.addEventListener('change', () => { if (document.body.dataset.page === 'list') renderList(); if (document.body.dataset.page === 'book' && state.bookDraw) state.bookDraw(); });
const colsMQ = [matchMedia('(min-width: 1000px)'), matchMedia('(min-width: 1380px)')];
const magCols = () => colsMQ[1].matches ? 4 : colsMQ[0].matches ? 3 : 2;
colsMQ.forEach(mq => mq.addEventListener('change', () => {
  if (document.body.dataset.page === 'list' && isWide()) renderCards();
  if (document.body.dataset.page === 'book' && isWide() && state.bookDraw) state.bookDraw();
}));

const Mag = (() => {
  let rank = new Map();   // id → willekeurig getal; blijft staan tot 'Verras me' of opnieuw openen
  let heroId = null;
  const rnd = id => { if (!rank.has(id)) rank.set(id, Math.random()); return rank.get(id); };
  // Recepten met foto eerst, daarbinnen willekeurig
  const order = list => [...list].sort((a, b) => (!!b.photo - !!a.photo) || rnd(a.id) - rnd(b.id));
  const shuffle = () => { rank = new Map(); heroId = null; };

  function pickHero(all, wanted = heroId) {
    const withPhoto = order(all).filter(r => r.photo);
    if (!withPhoto.length) return null;
    return withPhoto.find(r => r.id === wanted) || withPhoto[0];
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

  // Standaard: je eigen recepten. Voor andermans Ricette geeft render() andere opties mee.
  let O = {};
  const hrefOf = r => (O.href ? O.href(r) : `#/r/${esc(r.id)}`);
  const coursesOfR = r => (O.courses ? O.courses(r) : coursesOf(r));
  const catsOfR = r => (O.cats ? O.cats(r) : catsOf(r));

  function heroHtml(r, many) {
    const tags = [...coursesOfR(r), ...catsOfR(r)];
    return `
      <li class="mag-hero" style="grid-row:1">
        <a class="mh-photo" href="${hrefOf(r)}" tabindex="-1"><img src="${r.photo}" alt=""></a>
        <div class="mh-text">
          ${tags.length || dietOf(r) ? `<span class="mag-kicker">${dietBadge(dietOf(r))}${tags.map(esc).join(' · ')}</span>` : ''}
          <h2 class="flag"><a href="${hrefOf(r)}">${esc(r.title)}</a></h2>
          ${leadOf(r) ? `<p class="mh-lead">${esc(leadOf(r))}</p>` : ''}
          ${metaOf(r) ? `<span class="mag-meta">${metaOf(r).replace('pers.', 'personen')}</span>` : ''}
          <div class="mh-actions">
            <a class="btn mh-open" href="${hrefOf(r)}">Bekijk recept</a>
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

  // opts (andermans Ricette): all, browsing, href, courses, cats, fillers [{id, icon, title, sub, on}], hero ({ id })
  function render(el, list, opts = {}) {
    O = opts;
    const all = opts.all || state.recipes;
    // Uitgelicht recept alleen als je niet zoekt of filtert
    const browsing = opts.browsing ?? (!state.query.trim() && state.filter === 'all' && !state.course);
    const hero = browsing ? pickHero(all, opts.hero ? opts.hero.id : heroId) : null;
    if (hero) { if (opts.hero) opts.hero.id = hero.id; else heroId = hero.id; }
    const rest = order(list).filter(r => r !== hero);
    const many = all.filter(r => r.photo).length > 1;
    const start = hero ? 2 : 1, row0 = hero ? 2 : 1;
    const cells = plan(rest, magCols());
    let nr = 0;
    el.innerHTML = (hero ? heroHtml(hero, many) : '') + cells.map(cell => {
      const pos = `grid-row:${row0 + cell.row}${cell.big ? ' / span 2' : ''};grid-column:${cell.col + 1}${cell.big ? ' / span 2' : ''}`;
      if (cell.filler !== undefined) {
        const f = (opts.fillers || FILLERS)[cell.filler];
        return `<li class="mag-filler" style="${pos}"><button id="${f.id}">${ICONS[f.icon]}<b>${f.title}</b><small>${f.sub}</small></button></li>`;
      }
      const r = cell.r, zone = cell.big ? .22 : .36;
      const kicker = coursesOfR(r)[0] || catsOfR(r)[0] || '';
      const f = r.photo && PhotoFocus.peek(r, 1, zone);
      const cls = (cell.big ? ' big' : '') + (r.photo && !f ? ' focusing' : '') + (f && f.labelTop ? ' label-top' : '');
      const img = r.photo
        ? `<img src="${r.photo}" alt="" loading="lazy"${f ? ` class="cropped" style="${PhotoFocus.style(f)}"` : ''}>`
        : `<span class="mag-nophoto">${ICONS.plate}</span>`;
      return `
        <li class="mag-card${cls}" data-id="${esc(r.id)}" data-zone="${zone}" style="${pos}"><a href="${hrefOf(r)}">
          <div class="mc-photo">${img}${r.favorite ? `<span class="mc-fav" aria-label="Favoriet">${ICONS.heart}</span>` : ''}</div>
          <div class="mc-label">
            <span class="mag-kicker">N° ${String(start + nr++).padStart(2, '0')}${kicker ? ' · ' + esc(kicker) : ''}</span>
            <h3>${esc(r.title)}</h3>
            ${metaOf(r) || dietOf(r) ? `<span class="mag-meta">${dietBadge(dietOf(r), { text: false })}${metaOf(r) || ''}</span>` : ''}
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
    if (opts.fillers) opts.fillers.forEach(f => on(f.id, f.on));
    else {
      on('fillSurprise', () => { shuffle(); render(el, list); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      on('fillNew', () => Importer.openSheet());
      on('fillShop', () => { location.hash = '#/boodschappen'; });
    }
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
      if (opts.onHero) opts.onHero(hero, img);
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
  $('#cookSwitch').hidden = !on;
  const btn = $('#cook');
  if (btn) { btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on); }
  showCookTab(state.cookTab || 'ingr');
  if (on && detailWideMQ.matches) window.scrollTo(0, 0);   // iPad/laptop: beide kolommen scrollen zelf
  if (!on) setWakeLock(false);
}

// Zet een stap midden in het zichtbare deel (onder de vaste balk)
function centerStep(li) {
  if (!li) return;
  requestAnimationFrame(() => {
    const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    // iPad/laptop: de bereiding scrolt in een eigen kolom; centreer daarin
    const box = li.closest('.part-steps');
    if (box && getComputedStyle(box).overflowY === 'auto') {
      const b = box.getBoundingClientRect(), r = li.getBoundingClientRect();
      box.scrollTo({ top: Math.max(0, box.scrollTop + r.top - b.top + r.height / 2 - box.clientHeight / 2), behavior: smooth });
      return;
    }
    const sw = document.querySelector('#cookSwitch');
    const barBottom = Math.max(document.querySelector('.topbar').getBoundingClientRect().bottom, sw && !sw.hidden && sw.offsetHeight ? sw.getBoundingClientRect().bottom : 0);
    const r = li.getBoundingClientRect();
    const target = scrollY + r.top + r.height / 2 - (barBottom + (innerHeight - barBottom) / 2);
    window.scrollTo({ top: Math.max(0, target), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}

function showCookTab(tab) {
  state.cookTab = tab;
  document.body.classList.toggle('cook-tab-steps', tab === 'steps');
  document.querySelectorAll('#cookSwitch [data-tab]').forEach(b => {
    b.classList.toggle('on', b.dataset.tab === tab);
    b.setAttribute('aria-selected', b.dataset.tab === tab);
  });
}

$('#cookOff').innerHTML = ICONS.cook;
$('#cookOff').addEventListener('click', () => setCookMode(false));
document.querySelectorAll('#cookSwitch [data-tab]').forEach(b => b.addEventListener('click', () => {
  if (state.cookTab !== b.dataset.tab) { showCookTab(b.dataset.tab); window.scrollTo(0, 0); }
}));

// opts.recipe: een recept dat (nog) niet van jou is, met opts.from (naam), opts.message,
// opts.saveLabel/onSave en optioneel opts.onDiscard (onderaan een balk met knoppen)
async function renderDetail(id, opts = {}) {
  const seq = routeSeq;
  const foreign = !!opts.recipe;
  const r = foreign ? opts.recipe : await DB.get(id);
  if (isStale(seq)) return;
  if (!r) { location.hash = '#/'; return; }
  if (foreign) document.body.dataset.page = 'detail';

  const base = Math.max(1, +r.servings || 1);
  let servings = base;
  const done = new Set();
  let curStep = null; // kookstand: de stap waar je nu bent (bijv. 's3')

  setHeader({
    title: r.title, back: !foreign || opts.back !== false, close: foreign, timerLabel: r.title,
    actions: `
      <button class="icon-btn cart-btn" data-go="#/boodschappen" aria-label="Boodschappenlijst">${ICONS.basket}<span class="cart-badge" hidden></span></button>
      ${foreign ? `<button class="icon-btn settings-btn" data-go="#/settings" aria-label="Instellingen">${ICONS.gear}</button>` : `<button class="icon-btn${r.favorite ? ' active' : ''}" id="favBtn" aria-label="Favoriet">${ICONS.heart}</button>
      <button class="icon-btn" data-go="#/edit/${esc(r.id)}" aria-label="Bewerken">${ICONS.edit}</button>`}`,
  });
  Shopping.updateBadge();

  const ingr = lines(r.ingredients);
  const steps = lines(r.steps);
  const ingLinks = foreign ? new Map() : ingredientLinks(ingr, relatedOf(r).parts);
  // echte stappen (geen #kopje); als ze allemaal zijn afgestreept: 'Eet smakelijk!' (of 'Proost!')
  const stepKeys = steps.map((l, i) => l.startsWith('#') ? null : 's' + i).filter(Boolean);
  const allStepsDone = () => stepKeys.length > 0 && stepKeys.every(k => done.has(k));

  function draw() {
    const factor = servings / base;
    // scrollplek van de kolommen (kookstand iPad/laptop) bewaren bij opnieuw tekenen
    const keepScroll = ['.part-ingr', '.part-steps'].map(s => view.querySelector(s)?.scrollTop || 0);
    view.innerHTML = `
      ${opts.from ? `<div class="from-strip"><div class="acc-avatar" aria-hidden="true">${esc(opts.from.charAt(0).toUpperCase())}</div><span><b>Van ${esc(opts.from)}</b>${opts.message ? ` · <q>${esc(opts.message)}</q>` : ''}</span></div>` : ''}
      <div class="photo-col${r.photo ? '' : ' no-photo'}">
        ${r.photo ? `<img class="hero" src="${r.photo}" alt="">` : ''}
        <div class="photo-cap">
        <h2 class="detail-title">${esc(r.title)}</h2>
        ${r.description ? `<p class="lead">${esc(r.description)}</p>` : ''}
        <div class="meta">
          ${dietBadge(dietOf(r))}
          ${coursesOf(r).map(c => `<span class="pill pill-course">${esc(c)}</span>`).join('')}
          ${catsOf(r).map(c => `<span class="pill">${esc(c)}</span>`).join('')}
          ${r.prepTime ? `<span>${ICONS.clock} ${r.cookTime ? 'Voorbereiden' : 'Bereidingstijd'} ${formatTime(r.prepTime)}</span>` : ''}
          ${r.cookTime ? `<span>${ICONS.clock} Koken ${formatTime(r.cookTime)}</span>` : ''}
          ${(r.tags || []).map(t => `<span class="tag">#${esc(t)}</span>`).join('')}
        </div>
        </div>
      </div>
      <section class="detail">

        <div class="part-ingr">
        <div class="section-head">
          <h3>Ingrediënten</h3>
          <button class="icon-btn copy-btn" id="copyBtn" aria-label="Op de boodschappenlijst zetten" title="Op de boodschappenlijst">${ICONS.basket}</button>
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
            : `<li data-i="${i}" class="${done.has('i' + i) ? 'done' : ''}"><span class="check"></span><span>${ingLinks.has(i) ? linkIngredientHtml(scaleLine(l, factor), ingLinks.get(i)) : scaleLine(l, factor)}</span></li>`).join('')}
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
          <span class="ba-ribbon"><span class="ba-band">${isDrink(r) ? 'Proost!' : 'Eet smakelijk!'}</span></span>
        </div>
        </div>

        ${foreign ? '' : relatedHtml(r)}

        ${r.notes ? `<h3 class="notes-head">Notities</h3><p class="notes">${esc(r.notes).replace(/\n/g, '<br>')}</p>` : ''}

        ${r.source ? `<p class="source">Bron: <a href="${esc(r.source)}" target="_blank" rel="noopener">${esc(siteOf(r.source))}</a></p>` : ''}
        ${r.fromUser && !foreign ? `<p class="source">Van ${esc(r.fromUser)}</p>` : ''}

        ${foreign ? '' : `<div class="detail-actions">
          <button class="btn ghost" id="shareBtn">${ICONS.share} Delen</button>
        </div>`}
      </section>
      ${opts.onSave ? `<div class="save-bar${opts.onDiscard ? '' : ' single'}"><button class="btn" id="saveCopy">${esc(opts.saveLabel || 'Bewaar in mijn recepten')}</button>${opts.onDiscard ? '<button class="btn ghost" id="discardCopy">Weg</button>' : ''}</div>` : ''}`;

    // iPad/laptop: titel op de foto passend maken (lange namen kleiner, woorden heel)
    const col = view.querySelector('.photo-col'), title = view.querySelector('.detail-title');
    const fitPhotoTitle = () => {
      if (!detailWideMQ.matches) title.style.fontSize = '';
      else if (state.cookMode) fitText(title, [{ lines: 2, min: 30 }, { lines: 3, min: 22 }]);
      else fitText(title, [{ lines: 2, min: 40 }, { lines: 3, min: 30 }, { lines: 4, min: 22 }]);
    };
    // en de uitsnede van de foto: eten zo goed mogelijk in beeld, boven de titel
    const img = col.querySelector('.hero');
    const placePhoto = async () => {
      const wide = detailWideMQ.matches && !state.cookMode;
      if (!img || !wide) {
        if (img) { img.classList.remove('cropped'); img.removeAttribute('style'); }
        return;
      }
      const box = col.getBoundingClientRect(), cap = col.querySelector('.photo-cap').getBoundingClientRect();
      if (!box.width || !box.height) return;
      const zone = Math.min(.6, Math.max(.15, Math.round(cap.height / box.height * 20) / 20));
      try {
        const f = await PhotoFocus.get(r, box.width / box.height, zone);
        if (img.isConnected && detailWideMQ.matches && !state.cookMode) PhotoFocus.apply(img, f);
      } catch {}
    };
    let raf;
    const relayout = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { fitPhotoTitle(); placePhoto(); }); };
    document.fonts.ready.then(relayout);
    new ResizeObserver(relayout).observe(col);

    ['.part-ingr', '.part-steps'].forEach((s, i) => { const el = view.querySelector(s); if (el && keepScroll[i]) el.scrollTop = keepScroll[i]; });

    $('#minus').onclick = () => { if (servings > 1) { servings--; draw(); } };
    $('#plus').onclick = () => { servings++; draw(); };
    // Kookstand: aantal personen ook in de kopbalk, links van de koksmuts
    let cs = $('#cookServings');
    if (!cs) {
      cs = document.createElement('div');
      cs.className = 'stepper cook-stepper'; cs.id = 'cookServings'; cs.setAttribute('aria-label', 'Aantal porties');
      $('#cookOff').before(cs);
    }
    cs.innerHTML = `<button aria-label="Minder porties">−</button><span>${ICONS.people} ${servings}</span><button aria-label="Meer porties">+</button>`;
    const [csMin, csPlus] = cs.querySelectorAll('button');
    csMin.onclick = () => { if (servings > 1) { servings--; draw(); } };
    csPlus.onclick = () => { servings++; draw(); };
    view.querySelectorAll('[data-i]').forEach(li => li.onclick = () => {
      const k = 'i' + li.dataset.i; done.has(k) ? done.delete(k) : done.add(k); li.classList.toggle('done');
    });
    // Gekoppelde recepten: openen (in de kookstand als spiekvenster)
    view.querySelectorAll('[data-link]').forEach(el => el.onclick = e => {
      e.preventDefault(); e.stopPropagation();
      const x = recipeById(el.dataset.link);
      if (!x) return;
      if (state.cookMode) openPeek(x, r.id); else goRecipe(x.id, r.id);
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
        if (show) requestAnimationFrame(() => ba.scrollIntoView({ behavior: 'smooth', block: state.cookMode ? 'end' : 'nearest' }));
      }
    });
    $('#cook').onclick = async () => {
      setCookMode(!state.cookMode);
      const ok = await setWakeLock(state.cookMode);
      if (state.cookMode && (!ok || !('wakeLock' in navigator))) toast('Scherm-aan wordt niet ondersteund op dit toestel');
    };
    if ($('#shareBtn')) $('#shareBtn').onclick = () => openShareSheet(r, servings, factor);
    if ($('#saveCopy')) $('#saveCopy').onclick = async e => { e.currentTarget.disabled = true; try { await opts.onSave(); } catch (err) { toast(err.message); e.currentTarget.disabled = false; } };
    if ($('#discardCopy')) $('#discardCopy').onclick = () => opts.onDiscard();
    $('#copyBtn').onclick = () => openShopSheet(r, ingr, done, factor);
  }

  draw();
  const favBtn = $('#favBtn');
  if (favBtn) favBtn.onclick = async () => {
    r.favorite = !r.favorite;
    await DB.put(r);
    await loadRecipes();
    favBtn.classList.toggle('active', r.favorite);
    toast(r.favorite ? 'Toegevoegd aan favorieten' : 'Verwijderd uit favorieten');
  };
}

// Mandje bij een recept: venster met alle ingrediënten om op de boodschappenlijst te zetten.
// Een vinkje op de receptpagina betekent overal 'geregeld' (gebruikt / al in huis): die staan hier uit.
// De app onthoudt wat je vaak wegtikt (zout, peper…) en zet dat de volgende keer al uit.
const PANTRY_MIN = 2;   // zo vaak achter elkaar weggetikt = 'meestal in huis'
const pantryKey = line => { const p = Shopping.parse(line); return (p.name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').trim(); };
const pantry = () => AppSettings.data.pantry || {};
const inPantry = line => (pantry()[pantryKey(line)] || 0) >= PANTRY_MIN;
async function rememberPantry(rows) {
  const p = { ...pantry() };
  // per ingrediënt één keer tellen (zout kan in recept én onderdeel staan); één keer kopen = vergeten
  const buy = new Map();
  for (const r of rows) { const k = pantryKey(r.line); if (k) buy.set(k, (buy.get(k) || false) || r.buy); }
  for (const [k, b] of buy) { if (b) delete p[k]; else p[k] = Math.min(9, (p[k] || 0) + 1); }
  AppSettings.data.pantry = p;
  await AppSettings.save();
}

function openShopSheet(r, ingr, done, factor) {
  const tmp = document.createElement('div');
  const show = (l, f) => { tmp.innerHTML = scaleLine(l, f); return tmp.textContent; };
  const parts = relatedOf(r).parts;
  const partOfLine = ingredientLinks(ingr, parts);   // regelnummer → onderdeel (bijv. '1 portie pizzadeeg')
  // Porties per recept: het hoofdrecept begint bij de porties van de receptpagina, een onderdeel bij die van zichzelf
  const baseOf = { main: Math.max(1, +r.servings || 1) };
  parts.forEach(p => { baseOf[p.id] = Math.max(1, +p.servings || 1); });
  const serv = { main: Math.max(1, Math.round(baseOf.main * factor)) };
  parts.forEach(p => { serv[p.id] = baseOf[p.id]; });
  const fac = g => serv[g] / baseOf[g];
  // Alle regels: hoofdrecept (g = 'main') en per onderdeel (g = id van het onderdeel)
  const rows = [];
  ingr.forEach((l, i) => {
    if (l.startsWith('#')) { rows.push({ g: 'main', sub: l.replace(/^#+\s*/, '') }); return; }
    const used = done.has('i' + i), home = !used && inPantry(l);
    rows.push({ g: 'main', key: 'm' + i, line: l, f: factor, text: show(l, factor), buy: !used && !home, used, home, part: partOfLine.get(i)?.recipe });
  });
  const partOn = new Set(parts.map(p => p.id));
  for (const p of parts) {
    lines(p.ingredients).forEach((l, j) => {
      if (l.startsWith('#')) { rows.push({ g: p.id, sub: l.replace(/^#+\s*/, '') }); return; }
      const home = inPantry(l);
      rows.push({ g: p.id, key: p.id + ':' + j, line: l, f: 1, text: show(l, 1), buy: !home, home });
    });
  }
  // Is een onderdeel aan, dan hoeft de regel '1 portie pizzadeeg' zelf niet op de lijst
  const syncPartLines = () => rows.forEach(x => { if (x.part) x.buy = !partOn.has(x.part.id) && !x.used && !x.home; });
  syncPartLines();

  const s = openAccSheet(`
    <div class="sheet-head shop-sheet-head"><button class="text-btn" data-close>Annuleer</button><button class="btn small" id="shopAddTop"></button></div>
    <h3 class="shop-title">Op de boodschappenlijst</h3>
    <p class="acc-sheet-text">Tik weg wat je al in huis hebt.</p>
    <div class="shop-pick" id="shopPick"></div>
    <button class="btn" id="shopAdd"></button>`, 'Op de boodschappenlijst');
  const draw = () => {
    rows.forEach(x => { if (x.key) x.text = show(x.line, fac(x.g)); });
    const stepper = g => `<span class="stepper shop-stepper" aria-label="Aantal porties">
      <button type="button" data-min="${esc(g)}" aria-label="Minder porties">−</button><span>${ICONS.people} ${serv[g]}</span><button type="button" data-plus="${esc(g)}" aria-label="Meer porties">+</button></span>`;
    const row = x => x.sub != null
      ? `<p class="shop-sub">${esc(x.sub)}</p>`
      : `<button type="button" class="shop-row${x.buy ? ' on' : ''}" data-k="${esc(x.key)}" role="checkbox" aria-checked="${x.buy}">
          <span class="tick" aria-hidden="true">${x.buy ? '✓' : ''}</span><span class="shop-text"><span class="shop-name">${esc(x.text)}</span>
          ${x.used ? '<small>afgestreept</small>' : x.home && !x.buy ? '<small>meestal in huis</small>' : x.part && partOn.has(x.part.id) ? `<small>via ${esc(x.part.title)} hieronder</small>` : ''}</span></button>`;
    const group = g => rows.filter(x => x.g === g);
    const allBtn = g => { const list = group(g).filter(x => x.key); const all = list.every(x => x.buy); return `<button type="button" class="link shop-all" data-all="${esc(g)}">${all ? 'Niets' : 'Alles'}</button>`; };
    s.$('#shopPick').innerHTML = `
      <div class="shop-group"><div class="shop-head"><b>${esc(r.title)}</b>${stepper('main')}</div><div class="shop-tools">${allBtn('main')}</div>${group('main').map(row).join('')}</div>
      ${parts.map(p => `<div class="shop-group${partOn.has(p.id) ? '' : ' off'}">
        <div class="shop-head"><label class="shop-part"><input type="checkbox" data-part="${esc(p.id)}"${partOn.has(p.id) ? ' checked' : ''}><b>Onderdeel: ${esc(p.title)}</b></label>${partOn.has(p.id) ? stepper(p.id) : ''}</div>
        ${partOn.has(p.id) ? `<div class="shop-tools">${allBtn(p.id)}</div>${group(p.id).map(row).join('')}` : ''}</div>`).join('')}`;
    const n = rows.filter(x => x.key && x.buy && (x.g === 'main' || partOn.has(x.g))).length;
    for (const id of ['#shopAdd', '#shopAddTop']) { s.$(id).textContent = n ? `Toevoegen (${n})` : 'Niets toevoegen'; s.$(id).disabled = !n; }
    s.el.querySelectorAll('.shop-row').forEach(b => b.onclick = () => { const x = rows.find(y => y.key === b.dataset.k); x.buy = !x.buy; draw(); });
    s.el.querySelectorAll('[data-all]').forEach(b => b.onclick = () => {
      const list = group(b.dataset.all).filter(x => x.key), all = list.every(x => x.buy);
      list.forEach(x => { x.buy = !all; }); draw();
    });
    s.el.querySelectorAll('[data-min]').forEach(b => b.onclick = () => { const g = b.dataset.min; if (serv[g] > 1) { serv[g]--; draw(); } });
    s.el.querySelectorAll('[data-plus]').forEach(b => b.onclick = () => { serv[b.dataset.plus]++; draw(); });
    s.el.querySelectorAll('[data-part]').forEach(c => c.onchange = () => { c.checked ? partOn.add(c.dataset.part) : partOn.delete(c.dataset.part); syncPartLines(); draw(); });
  };
  draw();
  s.$('#shopAddTop').onclick = () => s.$('#shopAdd').click();
  s.$('#shopAdd').onclick = async () => {
    const active = rows.filter(x => x.key && (x.g === 'main' || partOn.has(x.g)));
    const pick = active.filter(x => x.buy);
    await Shopping.addFromRecipe(pick.filter(x => x.g === 'main').map(x => x.line), fac('main'), r.title);
    for (const p of parts.filter(p => partOn.has(p.id))) {
      const ls = pick.filter(x => x.g === p.id).map(x => x.line);
      if (ls.length) await Shopping.addFromRecipe(ls, fac(p.id), p.title);
    }
    // Onthouden wat je wegtikt (niet wat je tijdens het koken hebt afgestreept, en niet de onderdeel-regel zelf)
    await rememberPantry(active.filter(x => !x.used && !(x.part && partOn.has(x.part.id))).map(x => ({ line: x.line, buy: x.buy })));
    s.close();
    Shopping.updateBadge();
    toast(`${pick.length} ${pick.length === 1 ? 'boodschap' : 'boodschappen'} op de lijst`);
    const btn = $('#copyBtn');
    if (btn) {
      btn.innerHTML = ICONS.check; btn.classList.add('copied');
      setTimeout(() => { btn.innerHTML = ICONS.basket; btn.classList.remove('copied'); }, 1200);
    }
  };
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
    dietOf(r) ? DIETS[dietOf(r)].label : '',
    r.description,
    `\nIngrediënten (${servings} ${servings === 1 ? 'portie' : 'porties'}):`,
    ...ingr,
    '\nBereiding:',
    ...(() => {
      let n = 0;
      return lines(r.steps).map(s => s.startsWith('#') ? '\n' + s.replace(/^#+\s*/, '') + ':' : `${++n}. ${s}`);
    })(),
    r.notes ? `\nNotities:\n${r.notes}` : '',
    (() => { const { parts, withs } = relatedOf(r); const all = [...parts, ...withs]; return all.length ? `\nZie ook: ${all.map(x => x.title).join(', ')}` : ''; })(),
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
        <input name="category" value="${esc(catsOf(r).join(', '))}" placeholder="Bijv. Diner, Italiaans" autocapitalize="sentences">
      </label>
      <div class="cat-choices" id="catChoices">
        ${catChoices.map(c => `<button type="button" class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
      </div>

      <div class="row">
        <label>Porties<input name="servings" type="number" inputmode="numeric" min="1" value="${esc(r.servings)}"></label>
        <div class="diet-pick" role="group" aria-label="Vegetarisch of vegan">
          ${Object.keys(DIETS).map(k => `<label class="diet-check"><input type="checkbox" name="diet" value="${k}"${dietOf(r) === k ? ' checked' : ''}>${dietBadge(k, { tip: false })}</label>`).join('')}
        </div>
      </div>
      ${loggedIn() ? `<label class="share-check"><input type="checkbox" name="shared"${(id ? r.shared : (shareCache().visibility || 'none') !== 'none') ? ' checked' : ''}>
        <span>${ICONS.book}<span>Zichtbaar in mijn Ricette<small>${(shareCache().visibility || 'none') === 'none' ? 'Je Ricette zijn nu privé; dit telt zodra je ze deelt (Instellingen).' : 'Mensen met wie je je Ricette deelt, zien dit recept.'}</small></span></span></label>` : ''}

      <div class="row">
        <label>Voorbereiden (min)<input name="prepTime" type="number" inputmode="numeric" min="0" value="${esc(r.prepTime)}"></label>
        <label>Kooktijd (min)<input name="cookTime" type="number" inputmode="numeric" min="0" value="${esc(r.cookTime)}"></label>
      </div>

      <div class="field-links"><span class="field-label">Bijbehorende recepten <small>onderdelen en wat er lekker bij past</small></span>
        <div class="edit-links" id="editLinks"></div>
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
  // Vegetarisch of vegan: hooguit één van de twee
  const dietBoxes = [...view.querySelectorAll('input[name=diet]')];
  dietBoxes.forEach(cb => cb.addEventListener('change', () => { if (cb.checked) dietBoxes.forEach(o => { if (o !== cb) o.checked = false; }); }));

  // Bijbehorende recepten koppelen
  let links = linksOf(r).map(l => ({ id: l.id, kind: l.kind }));
  const drawLinks = () => {
    $('#editLinks').innerHTML = links.map(l => `<button type="button" class="chip link-chip" data-rm="${esc(l.id)}" aria-label="Koppeling met ${esc(recipeById(l.id).title)} weghalen">${esc(recipeById(l.id).title)} <i>· ${LINK_KINDS[l.kind].toLowerCase()}</i> <span aria-hidden="true">✕</span></button>`).join('')
      + `<button type="button" class="chip link-add" id="addLink">+ Recept koppelen</button>`
      + suggestHtml();
    view.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { links = links.filter(l => l.id !== b.dataset.rm); drawLinks(); });
    view.querySelectorAll('[data-suggest]').forEach(b => b.onclick = () => { links.push({ id: b.dataset.suggest, kind: 'part' }); drawLinks(); });
    $('#addLink').onclick = openLinkPicker;
  };
  // Noemt een ingrediënt een ander recept? Dan voorstellen om dat als onderdeel te koppelen.
  const suggestHtml = () => {
    const ingLines = lines($('#form').ingredients.value);
    const sug = state.recipes.filter(x => x.id !== r.id && !links.some(l => l.id === x.id) && findRecipeInLines(ingLines, x)).slice(0, 3);
    return sug.map(x => `<button type="button" class="chip link-suggest" data-suggest="${esc(x.id)}">+ ${esc(x.title)} <i>· als onderdeel koppelen</i></button>`).join('');
  };
  let sugTimer;
  $('#form').ingredients.addEventListener('input', () => { clearTimeout(sugTimer); sugTimer = setTimeout(drawLinks, 500); });
  const openLinkPicker = () => {
    const others = state.recipes.filter(x => x.id !== r.id);
    const s = openAccSheet(`
      <div class="sheet-head"><h3>Recept koppelen</h3><button class="text-btn" data-close>Klaar</button></div>
      <input type="search" id="linkSearch" placeholder="Zoek een recept" autocomplete="off">
      <ul class="pick" id="pickList"></ul>`, 'Recept koppelen');
    const drawPick = () => {
      const q = s.$('#linkSearch').value.trim().toLowerCase();
      const list = others.filter(x => !q || x.title.toLowerCase().includes(q));
      s.$('#pickList').innerHTML = list.length ? list.map(x => {
        const cur = links.find(l => l.id === x.id)?.kind;
        return `<li>${x.photo ? `<img src="${x.photo}" alt="" loading="lazy">` : `<span class="pick-nophoto">${ICONS.plate}</span>`}<b>${esc(x.title)}</b>
          <span class="seg">${Object.entries(LINK_KINDS).map(([k, label]) => `<button type="button" class="${cur === k ? 'on' : ''}" data-pick="${esc(x.id)}" data-kind="${k}" aria-pressed="${cur === k}">${label}</button>`).join('')}</span></li>`;
      }).join('') : `<li class="pick-none">Geen recepten gevonden.</li>`;
      s.el.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
        const { pick, kind } = b.dataset, cur = links.find(l => l.id === pick);
        if (cur && cur.kind === kind) links = links.filter(l => l.id !== pick);   // nog eens tikken = weghalen
        else if (cur) cur.kind = kind;
        else links.push({ id: pick, kind });
        drawPick(); drawLinks();
      });
    };
    s.$('#linkSearch').oninput = drawPick;
    drawPick();
    // Meteen kunnen typen. Direct (niet later) focussen: alleen dan opent de iPhone het toetsenbord.
    s.$('#linkSearch').focus({ preventScroll: true });
  };
  drawLinks();

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
      diet: view.querySelector('input[name=diet]:checked')?.value || '',
      shared: view.querySelector('input[name=shared]') ? view.querySelector('input[name=shared]').checked : !!r.shared,
      prepTime: parseInt(d.prepTime, 10) || '',
      cookTime: parseInt(d.cookTime, 10) || '',
      ingredients: d.ingredients.trim(),
      steps: d.steps.trim(),
      notes: d.notes.trim(),
      tags: d.tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean),
      links: links.filter(l => recipeById(l.id)),
      photo,
      thumb: photo === r.photo ? r.thumb : '',   // nieuwe foto: nieuwe kleine versie maken
      thumbV: photo === r.photo ? r.thumbV : 0,
      createdAt: r.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    const inboxId = updated._inboxId;
    delete updated._inboxId;
    await DB.put(updated);
    if (inboxId) await Importer.doneInbox(inboxId);
    await loadRecipes();
    if (updated.shared && updated.photo && !updated.thumb) ensureThumbs();
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

// Beheerder: openstaande accountaanvragen
function usersBadge() {
  const n = Sync.status().me?.requests || 0;
  return n ? `<span class="badge-bad">${n} ${n === 1 ? 'aanvraag' : 'aanvragen'}</span>` : '';
}

function syncBadge() {
  const s = Sync.status();
  if (s.state === 'off') return '<span class="badge-muted">uit</span>';
  if (s.state === 'loggedout') return '<span class="badge-muted">niet ingelogd</span>';
  if (s.error) return '<span class="badge-bad">⚠️ probleem</span>';
  return `<span class="badge-good">✓ ${esc(s.user?.name || 'aan')}</span>`;
}

function renderSettings() {
  setHeader({ title: 'Instellingen', back: true, timer: false });
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const sync = Sync.status();

  view.innerHTML = `
    <section class="settings">
      <h2 class="page-title">Instellingen</h2>
      ${standalone ? '' : fold('install', 'Op je beginscherm zetten', `
        <ol class="howto">
          <li>Open deze pagina in <strong>Safari</strong>.</li>
          <li>Tik op de deelknop ${ICONS.share}.</li>
          <li>Kies <strong>Zet op beginscherm</strong>.</li>
        </ol>`, { open: true, icon: ICONS.phone })}

      ${fold('account', 'Account', `<div id="syncCard">${Sync.cardHtml()}</div>`, { badge: syncBadge(), open: sync.state === 'loggedout' || !!sync.error, icon: ICONS.user })}

      ${sync.state === 'on' ? fold('sharing', 'Delen met anderen', shareSettingsHtml(), { icon: ICONS.book,
        badge: `<span class="badge-muted">${({ none: 'privé', some: 'gedeeld', all: 'iedereen' })[shareCache().visibility || 'none']}</span>` }) : ''}

      ${sync.user?.admin ? fold('users', 'Gebruikers', `
        <p>Accounts aanmaken, aanvragen goedkeuren, wachtwoorden opnieuw instellen en de mail testen.</p>
        <button class="btn ghost" id="openUsers">Gebruikers beheren</button>`, { badge: usersBadge(), icon: ICONS.people }) : ''}

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
        <p>Recepten vanuit Chrome of Safari importeren. Met een opdracht zet je een recept met <strong>Deel → Ricetta importeren</strong> klaar in de app. Je iPhone haalt de pagina zelf op, dus dat werkt vaak ook bij sites die automatisch ophalen blokkeren. Je moet hiervoor ingelogd zijn.</p>
        <ol class="howto">
          <li>Open de app <strong>Opdrachten</strong>, tik op <strong>+</strong> en noem de opdracht <strong>Ricetta importeren</strong>.</li>
          <li>Tik onderaan op <strong>ⓘ</strong> (Details) en zet <strong>Toon in deelpaneel</strong> aan. Kies bij de soorten <strong>URL's</strong> en <strong>Safari-webpagina's</strong>.</li>
          <li>Voeg de taak <strong>Haal inhoud op van URL</strong> toe, met als URL de <em>Opdrachtinvoer</em>. Zo haalt je iPhone de receptpagina op.</li>
          <li>Voeg nog een keer <strong>Haal inhoud op van URL</strong> toe. Plak als URL het adres van de knop hieronder. Tik op het pijltje: <strong>Methode POST</strong>, <strong>Verzoekhoofdtekst Formulier</strong>. Voeg drie velden toe:
            <code>key</code> (tekst) = je <strong>persoonlijke deelsleutel</strong> (knop hieronder), <code>url</code> (tekst) = <em>Opdrachtinvoer</em>, en <code>html</code> (<strong>bestand</strong>) = de <em>Inhoud van URL</em> van stap 3.</li>
          <li>Voeg de taak <strong>Toon melding</strong> toe, met de variabele <em>Inhoud van URL</em> van stap 4.</li>
        </ol>
        <button class="btn ghost" id="copyShareUrl">Kopieer het adres</button>
        <button class="btn ghost" id="copyShareKey">Kopieer je deelsleutel</button>
        <p class="small-note">Je deelsleutel hoort bij jouw account, zodat gedeelde recepten in jouw verzameling komen. Deel hem niet met anderen.</p>
        <p class="small-note">In Chrome vind je <strong>Deel</strong> via het deelicoon of het menu <strong>⋯</strong>. De eerste keer vraagt je iPhone of de opdracht de website en coenlips.nl mag gebruiken: kies <strong>Sta toe</strong>. De namen van knoppen in Opdrachten kunnen iets afwijken.</p>
        <details class="howto-box">
          <summary>Alleen Safari: werkt ook bij delicious.</summary>
          <p class="small-note">Sommige sites (zoals delicious.) laten ook je iPhone de pagina niet los ophalen. In Safari kan een opdracht het recept uit de al geladen pagina lezen. Maak dan een tweede opdracht:</p>
          <ol class="howto">
            <li>Nieuwe opdracht <strong>Ricetta (Safari)</strong>, <strong>Toon in deelpaneel</strong> aan, soort alleen <strong>Safari-webpagina's</strong>.</li>
            <li>Taak <strong>Voer JavaScript uit op webpagina</strong> met de code van de knop hieronder.</li>
            <li>Taak <strong>Haal inhoud op van URL</strong> met het adres hierboven: <strong>POST</strong>, <strong>JSON</strong>, velden <code>key</code> = je deelsleutel en <code>data</code> = <em>Resultaat JavaScript</em>.</li>
            <li>Taak <strong>Toon melding</strong> met <em>Inhoud van URL</em>.</li>
            <li>iPhone-instellingen → <strong>Apps → Opdrachten → Geavanceerd</strong> → <strong>Sta uitvoeren scripts toe</strong> aan.</li>
          </ol>
          <button class="btn ghost" id="copyShareJs">Kopieer de code</button>
        </details>`, { icon: ICONS.share })}

      ${fold('news', 'Wat is er nieuw', `<div class="changelog">${changelogHtml()}</div>`, { icon: ICONS.news })}

      ${fold('backup', 'Back-up als bestand', `
        <p>Een extra kopie van je ${state.recipes.length} ${state.recipes.length === 1 ? 'recept' : 'recepten'} als bestand, bijvoorbeeld voor iCloud Drive. Ben je ingelogd, dan worden je recepten ook al automatisch online bewaard.</p>
        <button class="btn" id="exportBtn">Back-up exporteren</button>
        <label class="btn ghost file-btn">Back-up importeren
          <input type="file" accept="application/json,.json" id="importInput" hidden>
        </label>`, { icon: ICONS.cloud })}

      <p class="version">Versie ${APP_VERSION}</p>
    </section>`;

  // Open/dicht onthouden
  view.querySelectorAll('details.fold').forEach(d => d.addEventListener('toggle', () => {
    const set = new Set(openFolds());
    d.open ? set.add(d.dataset.fold) : set.delete(d.dataset.fold);
    try { localStorage.setItem(FOLD_KEY, JSON.stringify([...set])); } catch { /* geen opslag */ }
  }));

  Sync.bindCard($('#syncCard'));
  const badge = $('#badge-account');
  Sync.refreshMe().catch(() => {});   // actueel aantal recepten en deelsleutel
  Sync.onChange(function update() {
    if (!badge.isConnected) return false; // kaart weg: ontvanger opruimen
    badge.innerHTML = syncBadge();
    const ub = $('#badge-users');
    if (ub) ub.innerHTML = usersBadge();
  });
  bindShareSettings();
  const openUsers = $('#openUsers');
  if (openUsers) openUsers.onclick = () => { location.hash = '#/gebruikers'; };

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
  const keyBtn = $('#copyShareKey');
  if (keyBtn) keyBtn.onclick = async () => {
    const key = Sync.status().me?.shareKey;
    if (!key) { toast('Log eerst in (Account) om je deelsleutel te zien'); return; }
    try { await navigator.clipboard.writeText(key); keyBtn.textContent = '✓ Gekopieerd'; setTimeout(() => { keyBtn.textContent = 'Kopieer je deelsleutel'; }, 1500); } catch { toast('Kopiëren lukte niet'); }
  };
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

/* ---------- Account: welkom, wachtwoord, gebruikers ---------- */

// 'Eerst zonder account proberen': dan geen welkomstscherm meer (tot iemand uitlogt)
const TRY_KEY = 'ricetta-try';
const tryMode = () => { try { return localStorage.getItem(TRY_KEY) === '1'; } catch { return true; } };
const setTryMode = on => { try { on ? localStorage.setItem(TRY_KEY, '1') : localStorage.removeItem(TRY_KEY); } catch { /* */ } };

// Hoeft deze gebruiker eerst iets te doen (inloggen of een eigen wachtwoord kiezen)?
function accountGate() {
  const s = Sync.status();
  if (s.state === 'loggedout' && !tryMode()) return renderWelcome;
  if (s.state === 'on' && s.user && s.user.mustChange) return renderSetPassword;
  return null;
}

function bareHeader() {
  setHeader({ title: 'Ricetta', back: false, timer: false });
  $('#addBtn').hidden = true;
  document.body.classList.add('no-fab');
}

const flagHtml = text => `<div class="acc-flag"><span>${esc(text)}</span></div>`;

/* ---------- Op je beginscherm zetten (inlogscherm) ---------- */
const OS_ICONS = {
  apple: '<svg viewBox="0 0 24 24" class="os-logo" aria-hidden="true"><path fill="currentColor" stroke="none" d="M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.9-.9-3.1-.8c-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.4-.9-2.4-3.7zM14.2 5.6c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.2z"/></svg>',
  android: '<svg viewBox="0 0 24 24" class="os-logo" aria-hidden="true"><path fill="currentColor" stroke="none" d="M6.6 9.6a5.4 5.4 0 0 1 10.8 0zM6.6 10.4h10.8v6.4a1 1 0 0 1-1 1h-1v2.5a1 1 0 0 1-2 0v-2.5h-2.8v2.5a1 1 0 0 1-2 0v-2.5h-1a1 1 0 0 1-1-1zM4.4 10.6a1 1 0 0 1 1 1v4a1 1 0 0 1-2 0v-4a1 1 0 0 1 1-1zM19.6 10.6a1 1 0 0 1 1 1v4a1 1 0 0 1-2 0v-4a1 1 0 0 1 1-1z"/><path d="M7.9 4.3l1.2 1.7M16.1 4.3l-1.2 1.7" stroke="currentColor" stroke-width="1"/><circle cx="9.4" cy="7.5" r=".7" fill="var(--surface)" stroke="none"/><circle cx="14.6" cy="7.5" r=".7" fill="var(--surface)" stroke="none"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2"/></svg>',
  plusSq: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/></svg>',
  dots: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none"/></svg>',
  install: '<svg viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 8v7M9 12.5l3 3 3-3"/></svg>',
  monitor: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/><path d="M12 7v5M9.5 9.5 12 12l2.5-2.5"/></svg>',
  dotsH: '<svg viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>',
  windows: '<svg viewBox="0 0 24 24" class="os-logo" aria-hidden="true"><path fill="currentColor" stroke="none" d="M3 5.2l7.4-1v7.2H3zM11.4 4l9.6-1.4v8.8h-9.6zM3 12.6h7.4v7.2l-7.4-1zM11.4 12.6H21v8.8L11.4 20z"/></svg>',
};
OS_ICONS.dotsV = OS_ICONS.dots;
const ua = navigator.userAgent;
const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/i.test(ua);
const iosOtherBrowser = isIOS && /CriOS|FxiOS|EdgiOS/.test(ua);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
// Chrome op Android: eigen installatievenster (bewaren tot iemand op de knop tikt)
let installPrompt = null;
addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); installPrompt = e;
  document.querySelectorAll('.install-now').forEach(b => { b.hidden = false; });
});
addEventListener('appinstalled', () => { document.querySelectorAll('.install-card').forEach(c => c.remove()); });
const INSTALL_OPEN = 'ricetta-install-open';   // in- of uitgeklapt (onthouden)

const isMac = !isIOS && /Mac/.test(ua + ' ' + (navigator.platform || ''));
const isDesktop = !isIOS && !isAndroid;
const isSafariDesktop = isMac && /Safari/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua);
function installCardHtml() {
  if (isStandalone()) return '';
  let open = true;
  try { open = localStorage.getItem(INSTALL_OPEN) !== '0'; } catch { /* */ }
  const os = isAndroid ? 'android' : isIOS ? 'ios' : isMac ? 'mac' : 'win';
  return `<details class="install-card${isDesktop ? ' install-desktop' : ''}" id="installCard" data-os="${os}"${open ? ' open' : ''}></details>`;
}
function bindInstallCard() {
  const card = $('#installCard');
  if (!card) return;
  const key = s => `<span class="key" aria-hidden="true">${OS_ICONS[s]}</span>`;
  const tab = (id, icon, label) => `<button type="button" role="tab" data-os="${id}" class="${card.dataset.os === id ? 'on' : ''}" aria-selected="${card.dataset.os === id}">${OS_ICONS[icon]}${label}</button>`;
  const installBtn = label => `<button type="button" class="btn install-now"${installPrompt ? '' : ' hidden'}>${OS_ICONS[isDesktop ? 'monitor' : 'install']} ${label}</button>`;
  const draw = () => {
    const os = card.dataset.os;
    const desktop = os === 'win' || os === 'mac';
    const where = os === 'ios' ? 'beginscherm' : os === 'android' ? 'startscherm' : '';
    const chromeSteps = `<ol class="install-steps">
          <li><span>Klik rechts in de adresbalk op ${key('monitor')} <b>Installeren</b></span></li>
          <li><span>Klik in het venster dat verschijnt op <b>Installeren</b></span></li>
        </ol>
        <p class="why install-more">Geen icoon in de adresbalk? Open het menu ${key(os === 'mac' ? 'dotsV' : 'dotsH')} en kies <b>Opslaan en delen → Ricetta installeren</b> (Chrome)${os === 'win' ? ' of <b>Apps → Deze site als app installeren</b> (Edge)' : ''}.</p>`;
    let body;
    if (os === 'ios') body = `<ol class="install-steps">
          <li><span>Tik ${iosOtherBrowser ? 'rechtsboven' : 'in Safari onderin'} op ${key('share')} <b>Deel</b></span></li>
          <li><span>Scroll omlaag en kies ${key('plusSq')} <b>Zet op beginscherm</b></span></li>
          <li><span>Tik rechtsboven op <b>Voeg toe</b></span></li>
        </ol>`;
    else if (os === 'android') body = `${installBtn('Ricetta installeren')}
        <p class="why install-or">${installPrompt ? 'Of zelf in Chrome:' : 'In Chrome:'}</p>
        <ol class="install-steps">
          <li><span>Tik rechtsboven op ${key('dots')} <b>Menu</b></span></li>
          <li><span>Kies ${key('install')} <b>App installeren</b> of <b>Toevoegen aan startscherm</b></span></li>
        </ol>`;
    else if (os === 'win') body = `${installBtn('Ricetta installeren')}
        <p class="why install-or">${installPrompt ? 'Of zelf in Chrome of Edge:' : 'In Chrome of Edge:'}</p>${chromeSteps}
        <div class="addr" aria-hidden="true"><span>${esc(location.host || 'ricetta.coenlips.nl')}</span>${key('monitor')}</div>
        <p class="addr-note">↑ zo ziet het icoon in de adresbalk eruit</p>`;
    else body = `${installBtn('Ricetta installeren')}
        <p class="why install-or">In Safari${isSafariDesktop ? '' : ' (vanaf macOS Sonoma)'}:</p>
        <ol class="install-steps">
          <li><span>Kies in de menubalk <b>Archief → Voeg toe aan Dock</b></span></li>
          <li><span>Klik op <b>Voeg toe</b></span></li>
        </ol>
        <p class="why install-or">In Chrome:</p>${chromeSteps}`;
    card.innerHTML = `
      <summary><h3>${desktop ? 'Installeer Ricetta op je computer' : `Op je ${where} zetten`}</h3><span class="fold-chevron" aria-hidden="true">${ICONS.chevron}</span></summary>
      <div class="install-body">
      <div class="install-head"><div class="os-tabs" role="tablist">
        ${desktop ? tab('win', 'windows', 'Windows') + tab('mac', 'apple', 'Mac') : tab('ios', 'apple', 'iPhone') + tab('android', 'android', 'Android')}
      </div></div>
      <p class="why"><strong>Ricetta werkt het beste als je hem ${desktop ? '' : `op je ${where} `}installeert:</strong> ${desktop
        ? `dan staat hij ${os === 'mac' ? 'in je Dock en Launchpad' : 'in je Startmenu en op je taakbalk'} en opent hij in een eigen venster, net als een gewoon programma. Ook zonder internet.`
        : 'dan open je hem als een gewone app, schermvullend en ook zonder internet.'}</p>
      ${body}
      </div>`;
    card.querySelectorAll('[data-os]').forEach(b => b.onclick = () => { card.dataset.os = b.dataset.os; draw(); });
    const now = card.querySelector('.install-now');
    if (now) now.onclick = async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      const choice = await installPrompt.userChoice.catch(() => null);
      installPrompt = null;
      if (choice && choice.outcome === 'accepted') card.remove(); else draw();
    };
  };
  draw();
  card.addEventListener('toggle', () => { try { localStorage.setItem(INSTALL_OPEN, card.open ? '1' : '0'); } catch { /* */ } });
}

function renderWelcome() {
  document.body.dataset.page = 'welcome';
  bareHeader();
  view.innerHTML = `
    <section class="acc-welcome${isDesktop ? ' acc-split' : ''}">
      ${flagHtml('Ricetta')}
      ${installCardHtml()}
      <div class="login-col">
      <h2 class="login-title">Inloggen</h2>
      <p class="acc-lead">Log in om je eigen receptenverzameling te openen.</p>
      ${Sync.loginFormHtml()}
      <div class="acc-request">
        <p>Nog geen account?</p>
        <button class="btn ghost" id="requestBtn">Account aanvragen</button>
      </div>
      <p class="acc-note"><button class="link" id="tryBtn">Eerst zonder account proberen</button></p>
      </div>
    </section>`;
  Sync.bindLoginForm($('#syncForm'), user => Sync.onSignIn(user));
  $('#requestBtn').onclick = openRequestSheet;
  $('#tryBtn').onclick = () => { setTryMode(true); route(); };
  bindInstallCard();
}

// Na een tijdelijk wachtwoord van de beheerder: zelf een wachtwoord kiezen
function renderSetPassword() {
  document.body.dataset.page = 'welcome';
  bareHeader();
  const name = Sync.status().user?.name || '';
  view.innerHTML = `
    <section class="acc-welcome">
      ${flagHtml('Welkom')}
      <p class="acc-lead">Hoi ${esc(name)}! Kies een eigen wachtwoord, dan kun je beginnen.</p>
      <form class="acc-form" id="setPwForm" autocomplete="on">
        <input type="text" name="username" value="${esc(name)}" autocomplete="username" hidden>
        <label>Nieuw wachtwoord<input type="password" name="pw" autocomplete="new-password" minlength="8" required></label>
        <label>Nog een keer<input type="password" name="pw2" autocomplete="new-password" minlength="8" required></label>
        <button class="btn" type="submit">Opslaan en beginnen</button>
        <p class="sync-msg" id="pwMsg" hidden></p>
      </form>
      <p class="acc-note">Minstens 8 tekens.<br><button class="link" id="outBtn">Uitloggen</button></p>
    </section>`;
  const form = $('#setPwForm'), msg = $('#pwMsg');
  form.onsubmit = async e => {
    e.preventDefault();
    const pw = form.pw.value, pw2 = form.pw2.value;
    msg.hidden = false;
    if (pw.length < 8) { msg.textContent = 'Kies minstens 8 tekens.'; return; }
    if (pw !== pw2) { msg.textContent = 'De twee wachtwoorden zijn niet hetzelfde.'; return; }
    const btn = form.querySelector('button'); btn.disabled = true; msg.textContent = 'Opslaan…';
    try { await Sync.changePassword(null, pw); toast('Je wachtwoord is opgeslagen'); route(); }
    catch (err) { msg.textContent = err.message; btn.disabled = false; }
  };
  $('#outBtn').onclick = async () => { await Sync.signOut({ force: true }); afterSignOut(); };
}

// Eenvoudig venster van onderen (zelfde stijl als de andere vensters)
/* Wijzigingsregister: één item per tiende versie (1.1, 1.2 …); kleine aanpassingen (honderdsten) krijgen geen eigen item. Nieuwste bovenaan. 'news' = melding bij het openen tot en met die datum (één keer per gebruiker). */
const CHANGELOG = [
  { v: '1.1.0', date: '24 november 2026', sections: [{ items: [
    'Na een grote update zie je bij het openen één keer wat er nieuw is.',
    'Bij Instellingen staat nu dit overzicht van alle wijzigingen.',
  ] }] },
  { v: '1.0.0', date: '24 november 2026', title: 'Nieuw in Ricetta', news: '2026-11-27',
    intro: '<span class="nowrap">Er is flink wat veranderd in Ricetta.</span><br>Dit is er nieuw:',
    sections: [
      { h: 'Recepten delen met elkaar', items: [
        '<b>Kijk in elkaars Ricette.</b> Bij Instellingen → Delen met anderen kies je wie jouw Ricette mag bekijken en welke recepten erbij horen. Per recept kun je dat later nog aan- of uitzetten.',
        '<b>Bekijk de Ricette van anderen</b> via het boek-icoon linksboven. Je kunt erin zoeken en filteren, en met + Bewaar neem je een recept over in je eigen verzameling.',
        '<b>Stuur een recept naar iemand.</b> Het komt bij de ander binnen als bericht.',
      ] },
      { h: 'Vegetarisch en vegan', items: [
        'Vink bij een recept aan of het vegetarisch of vegan is. Je ziet het aan een groen logo, en je kunt er in het overzicht op filteren.',
      ] },
      { h: 'Recepten aan elkaar koppelen', items: [
        '<b>Onderdelen:</b> koppel een recept als onderdeel van een ander, bijvoorbeeld de saus of het deeg.',
        '<b>Lekker met:</b> koppel recepten die goed bij elkaar passen.',
        'Een ingrediënt dat zelf een recept is, wordt een link. Ricetta herkent dat ook bij een typefout of meervoud en stelt voor om te koppelen.',
      ] },
      { h: 'Boodschappen', items: [
        'Tik bij een recept op het mandje en kies zelf wat er op de lijst komt. Wat je al in huis hebt, streep je af; Ricetta onthoudt dat voor de volgende keer.',
        'Kies per recept, en per onderdeel, voor hoeveel personen je kookt.',
      ] },
      { h: 'Account aanvragen', items: [
        'Nog geen account? Op het inlogscherm kun je er nu zelf een aanvragen. Je krijgt een mail zodra het klaar is.',
      ] },
      { h: 'Ricetta installeren', items: [
        'Op het inlogscherm staat stap voor stap hoe je Ricetta op je iPhone, Android, Windows-computer of Mac zet. Dan werkt hij als een gewone app, ook zonder internet.',
      ] },
      { h: 'Nieuw uiterlijk', items: [
        'Een nieuw app-icoon. Zie je nog het oude? Verwijder Ricetta van je beginscherm en zet hem er opnieuw op.',
        'Verder veel verfijnd: een rustigere menubalk, een nieuwe laadanimatie, een vaste schakelknop in de kookstand, een nieuwe weergave van het uitgelichte recept en de Ricette van anderen als tijdschrift op iPad en laptop.',
      ] },
    ],
    outro: 'Veel kookplezier!' },
];
const NEWS_SEEN = 'ricetta-news-seen';
const changeHtml = c => `${c.intro ? `<p class="news-intro">${c.intro}</p>` : ''}${c.sections.map(s => `
  ${s.h ? `<h4>${s.h}</h4>` : ''}<ul>${s.items.map(i => `<li>${i}</li>`).join('')}</ul>`).join('')}${c.outro ? `<p class="news-outro">${c.outro}</p>` : ''}`;
function changelogHtml() {
  return CHANGELOG.map((c, i) => `
    <details class="change"${i === 0 ? ' open' : ''}><summary><b>Versie ${c.v.split('.').slice(0, 2).join('.')}</b><small>${c.date}</small><span class="fold-chevron" aria-hidden="true">${ICONS.chevron}</span></summary>
      <div class="change-body">${changeHtml({ ...c, intro: '', outro: '' })}</div></details>`).join('');
}
// Eén keer de nieuwsmelding tonen (alleen als je ingelogd bent of de app uitprobeert, tot en met de einddatum).
let newsChecked = false;
function maybeShowNews() {
  if (newsChecked) return;
  newsChecked = true;
  const today = new Date().toLocaleDateString('sv');   // JJJJ-MM-DD, lokale tijd
  const c = CHANGELOG.find(x => x.news && today <= x.news);
  if (!c) return;
  try { if (localStorage.getItem(NEWS_SEEN) === c.v) return; localStorage.setItem(NEWS_SEEN, c.v); } catch { return; }
  setTimeout(() => {
    const s = openAccSheet(`
      <div class="sheet-head"><h3>${c.title}</h3><button class="text-btn" data-close>Sluit</button></div>
      <div class="news">${changeHtml(c)}</div>
      <button class="btn" data-close>Aan de slag</button>
      <p class="small-note news-later">Dit overzicht vind je later terug bij <span class="nowrap">Instellingen → Wat is er nieuw.</span></p>`, c.title);
    s.el.classList.add('news-sheet');
  }, 600);
}

function openAccSheet(html, label) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-backdrop';
  wrap.innerHTML = `<div class="sheet acc-sheet" role="dialog" aria-label="${esc(label)}">${html}</div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  const close = () => { wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 200); };
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('[data-close]')) close(); });
  return { el: wrap, close, $: s => wrap.querySelector(s) };
}

function openPasswordSheet() {
  const s = openAccSheet(`
    <div class="sheet-head"><h3>Wachtwoord wijzigen</h3><button class="text-btn" data-close>Annuleer</button></div>
    <form id="pwForm" autocomplete="on">
      <input type="text" name="username" value="${esc(Sync.status().user?.name || '')}" autocomplete="username" hidden>
      <label class="sheet-label">Huidig wachtwoord<input type="password" name="cur" autocomplete="current-password" required></label>
      <label class="sheet-label">Nieuw wachtwoord<input type="password" name="pw" autocomplete="new-password" minlength="8" required></label>
      <label class="sheet-label">Nog een keer<input type="password" name="pw2" autocomplete="new-password" minlength="8" required></label>
      <p class="sync-msg" id="pwMsg" hidden></p>
      <button class="btn" type="submit">Opslaan</button>
    </form>`, 'Wachtwoord wijzigen');
  const form = s.$('#pwForm'), msg = s.$('#pwMsg');
  form.onsubmit = async e => {
    e.preventDefault();
    msg.hidden = false;
    if (form.pw.value.length < 8) { msg.textContent = 'Kies minstens 8 tekens.'; return; }
    if (form.pw.value !== form.pw2.value) { msg.textContent = 'De twee nieuwe wachtwoorden zijn niet hetzelfde.'; return; }
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true; msg.textContent = 'Opslaan…';
    try { await Sync.changePassword(form.cur.value, form.pw.value); s.close(); toast('Je wachtwoord is gewijzigd'); }
    catch (err) { msg.textContent = err.message; btn.disabled = false; }
  };
}

// Account aanvragen: naam en e-mailadres naar de beheerder
function openRequestSheet() {
  const s = openAccSheet(`
    <div class="sheet-head"><h3>Account aanvragen</h3><button class="text-btn" data-close>Annuleer</button></div>
    <form id="reqForm" class="req-form" autocomplete="on">
      <p class="acc-sheet-text">Vul je naam en e-mailadres in. Zodra je aanvraag is goedgekeurd, krijg je een mail met je inloggegevens.</p>
      <label class="sheet-label">Naam<input name="name" maxlength="40" autocomplete="name" autocapitalize="words" required></label>
      <label class="sheet-label">E-mailadres<input name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" required></label>
      <label class="hp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
      <p class="sync-msg" id="reqMsg" hidden></p>
      <button class="btn" type="submit">Aanvraag versturen</button>
      <p class="small-note">Je e-mailadres wordt alleen gebruikt om je de inloggegevens te sturen, en daarna niet bewaard.</p>
    </form>`, 'Account aanvragen');
  const form = s.$('#reqForm'), msg = s.$('#reqMsg');
  form.name.focus({ preventScroll: true });
  form.onsubmit = async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; msg.hidden = false; msg.textContent = 'Versturen…';
    try {
      await Sync.requestAccount(form.name.value.trim(), form.email.value.trim(), form.website.value);
      s.el.querySelector('.sheet').innerHTML = `
        <div class="sheet-head"><h3>Aanvraag verstuurd</h3><button class="text-btn" data-close>Klaar</button></div>
        <p class="acc-sheet-text">Dank je, ${esc(form.name.value.trim())}! Zodra je aanvraag is goedgekeurd, krijg je een mail op <strong>${esc(form.email.value.trim())}</strong> met je naam en een tijdelijk wachtwoord.</p>
        <p class="acc-sheet-text small-note">Geen mail gekregen? Kijk ook even in je map met ongewenste mail.</p>
        <button class="btn" data-close>Klaar</button>`;
    } catch (err) { msg.textContent = err.message; btn.disabled = false; }
  };
}
Sync.onRequestButton = openRequestSheet;

// Beheerder: melding bij nieuwe accountaanvragen (stipje op het tandwiel en een berichtje)
Sync.onChange(() => {
  const s = Sync.status(), n = (s.user && s.user.admin && s.me && s.me.requests) || 0;
  document.body.classList.toggle('has-requests', n > 0);
  let seen = 0;
  try { seen = +localStorage.getItem('ricetta-requests-seen') || 0; } catch { /* */ }
  if (n > seen) toast(n === 1 ? 'Er is een nieuw account aangevraagd' : `Er zijn ${n} accounts aangevraagd`);
  if (n !== seen) try { localStorage.setItem('ricetta-requests-seen', String(n)); } catch { /* */ }
});

// Tijdelijk wachtwoord tonen (na aanmaken of opnieuw instellen)
function showTempPassword(s, name, pw, title) {
  s.el.querySelector('.sheet').innerHTML = `
    <div class="sheet-head"><h3>${esc(title)}</h3><button class="text-btn" data-close>Klaar</button></div>
    <p class="acc-sheet-text">Geef ${esc(name)} deze naam en dit tijdelijke wachtwoord, bijvoorbeeld via een berichtje. Bij de eerste keer inloggen kiest ${esc(name)} zelf een nieuw wachtwoord.</p>
    <div class="pw-box"><div><small>Naam</small><b>${esc(name)}</b></div></div>
    <div class="pw-box"><div><small>Tijdelijk wachtwoord</small><b class="pw-mono">${esc(pw)}</b></div><button class="link" id="copyPw">Kopieer</button></div>
    <button class="btn" data-close>Klaar</button>`;
  s.$('#copyPw').onclick = async () => {
    try { await navigator.clipboard.writeText(`Naam: ${name}\nWachtwoord: ${pw}`); s.$('#copyPw').textContent = '✓ Gekopieerd'; } catch { toast('Kopiëren lukte niet'); }
  };
}

function lastSeenText(u) {
  if (!u.lastSeen) return 'nog niet ingelogd';
  const d = new Date(u.lastSeen), now = new Date();
  const days = Math.round((new Date(now.toDateString()) - new Date(d.toDateString())) / 864e5);
  if (days === 0) return 'vandaag actief';
  if (days === 1) return 'gisteren actief';
  if (days < 7) return `${days} dagen geleden actief`;
  return `actief op ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`;
}

async function renderUsers() {
  const seq = routeSeq;
  setHeader({ title: 'Gebruikers', back: true, timer: false });
  const me = Sync.status().user;
  if (!me || !me.admin) { location.hash = '#/settings'; return; }
  view.innerHTML = `<section class="settings">${loaderHtml('Gebruikers ophalen…')}</section>`;
  let users, requests = [];
  try {
    users = await Sync.call('users');
    requests = await Sync.call('requests').catch(() => []);   // oudere server: geen aanvragen
  }
  catch (err) { if (!isStale(seq)) view.innerHTML = `<section class="settings"><div class="card-box"><p>${esc(err.message)}</p></div></section>`; return; }
  if (isStale(seq)) return;
  view.innerHTML = `
    <section class="settings">
      ${requests.length ? `<div class="card-box req-box">
        <h3>${requests.length === 1 ? 'Nieuwe aanvraag' : `${requests.length} nieuwe aanvragen`}</h3>
        <ul class="users">
          ${requests.map(q => `
            <li>
              <div class="acc-avatar req-avatar" aria-hidden="true">${esc(q.name.charAt(0).toUpperCase())}</div>
              <div class="users-text"><b>${esc(q.name)}</b><small>${esc(q.email)} · ${lastSeenText({ lastSeen: q.created }).replace('actief', 'aangevraagd').replace('vandaag aangevraagd', 'vandaag aangevraagd')}</small></div>
            </li>
            <li class="req-actions"><button class="btn" data-approve="${q.id}">Goedkeuren</button><button class="btn ghost" data-reject="${q.id}">Afwijzen</button></li>`).join('')}
        </ul>
      </div>` : ''}
      <div class="card-box">
        <h3>Gebruikers</h3>
        <p>Iedereen heeft een eigen receptenverzameling. Alleen jij als beheerder ziet deze lijst; wélke recepten iemand heeft, zie je niet.</p>
        <ul class="users">
          ${users.map(u => `
            <li>
              <div class="acc-avatar" aria-hidden="true">${esc(u.name.charAt(0).toUpperCase())}</div>
              <div class="users-text"><b>${esc(u.name)}${u.admin ? ' <span class="acc-role">beheerder</span>' : ''}</b>
                <small>${u.recipes} ${u.recipes === 1 ? 'recept' : 'recepten'} · ${lastSeenText(u)}${u.mustChange && u.lastSeen ? ' · moet nog een wachtwoord kiezen' : ''}</small></div>
              ${u.id === me.id ? '' : `<button class="icon-btn users-more" data-id="${u.id}" aria-label="Opties voor ${esc(u.name)}">⋯</button>`}
            </li>`).join('')}
        </ul>
        <button class="btn" id="newUser">+ Nieuwe gebruiker</button>
      </div>
      <div class="card-box">
        <h3>Mail</h3>
        <p>Controleer of de server mail kan versturen, bijvoorbeeld de inloggegevens bij een goedgekeurde aanvraag.</p>
        <button class="btn ghost" id="mailTest">Testmail versturen</button>
        <p class="mail-result" id="mailResult" hidden></p>
      </div>
    </section>`;

  view.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => {
    const q = requests.find(x => x.id === +b.dataset.approve);
    const s = openAccSheet(`
      <div class="sheet-head"><h3>Aanvraag goedkeuren</h3><button class="text-btn" data-close>Annuleer</button></div>
      <form id="apForm" autocomplete="off">
        <label class="sheet-label">Naam<input name="name" maxlength="40" value="${esc(q.name)}" required></label>
        ${q.taken ? `<p class="acc-sheet-text warn">Er is al iemand met de naam ${esc(q.name)}. Pas de naam aan, bijvoorbeeld met de achternaam erbij.</p>` : ''}
        <p class="acc-sheet-text">Er wordt een account aangemaakt met een tijdelijk wachtwoord. De inloggegevens gaan per mail naar <strong>${esc(q.email)}</strong>.</p>
        <p class="sync-msg" id="apMsg" hidden></p>
        <button class="btn" type="submit">Goedkeuren en mailen</button>
      </form>`, 'Aanvraag goedkeuren');
    const form = s.$('#apForm'), msg = s.$('#apMsg');
    form.onsubmit = async e => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true; msg.hidden = false; msg.textContent = 'Bezig…';
      try {
        const res = await Sync.call('request_approve', { id: q.id, name: form.name.value.trim(), appUrl: location.origin + location.pathname });
        showTempPassword(s, res.name, res.password, `Account voor ${res.name}`);
        s.$('.acc-sheet-text').innerHTML = res.mailed
          ? `✓ De inloggegevens zijn gemaild naar <strong>${esc(res.email)}</strong>. Hieronder staan ze ook, voor als de mail niet aankomt.`
          : `⚠️ De mail naar <strong>${esc(res.email)}</strong> kon niet worden verstuurd. Geef deze gegevens zelf door, bijvoorbeeld via een berichtje.`;
        renderUsers(); Sync.refreshMe().catch(() => {});
      } catch (err) { msg.textContent = err.message; btn.disabled = false; }
    };
  });
  view.querySelectorAll('[data-reject]').forEach(b => b.onclick = async () => {
    const q = requests.find(x => x.id === +b.dataset.reject);
    if (!confirm(`De aanvraag van ${q.name} afwijzen? Er wordt geen mail verstuurd en de gegevens worden verwijderd.`)) return;
    try { await Sync.call('request_reject', { id: q.id }); toast('Aanvraag afgewezen'); renderUsers(); Sync.refreshMe().catch(() => {}); }
    catch (err) { toast(err.message); }
  });

  $('#mailTest').onclick = async () => {
    const out = $('#mailResult'), btn = $('#mailTest');
    btn.disabled = true; out.hidden = false; out.className = 'mail-result'; out.textContent = 'Versturen…';
    try {
      const t = await Sync.call('mail_test');
      if (t.reason === 'no_admin_email') out.innerHTML = '⚠️ In config.php staat geen <code>ADMIN_EMAIL</code> (of hij is leeg). Zet daar je eigen e-mailadres in.';
      else if (t.reason === 'bad_admin_email') out.innerHTML = `⚠️ <code>ADMIN_EMAIL</code> in config.php is geen geldig e-mailadres: <strong>${esc(t.to)}</strong>.`;
      else if (t.sent) { out.classList.add('good'); out.innerHTML = `✓ De server heeft een testmail verstuurd${t.method === 'smtp' ? ' via SMTP' : ''} naar <strong>${esc(t.to)}</strong>, met als afzender <strong>${esc(t.from)}</strong>. Komt hij binnen een paar minuten niet aan (ook niet bij ongewenste mail), dan weigert je mailprovider waarschijnlijk deze afzender. Zet dan in config.php bij <code>MAIL_FROM</code> een e-mailadres dat bij Webreus echt bestaat.`; }
      else if (t.method === 'smtp') out.innerHTML = `✗ Versturen via SMTP lukte niet (afzender ${esc(t.from)}).<br><strong>Reden:</strong> ${esc(t.error || 'onbekend')}`;
      else out.innerHTML = `✗ De server kon geen mail versturen (afzender ${esc(t.from)}). Bij Webreus werkt de gewone mailfunctie van PHP niet: stel in config.php versturen via <strong>SMTP</strong> in (<code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_SECURE</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>).`;
    } catch (err) {
      out.textContent = /Onbekende actie/.test(err.message) ? 'Upload eerst de nieuwe api.php naar je server.' : err.message;
    }
    btn.disabled = false;
  };

  $('#newUser').onclick = () => {
    const s = openAccSheet(`
      <div class="sheet-head"><h3>Nieuwe gebruiker</h3><button class="text-btn" data-close>Annuleer</button></div>
      <form id="newForm" autocomplete="off">
        <label class="sheet-label">Naam<input name="name" maxlength="40" autocapitalize="words" autocorrect="off" spellcheck="false" required></label>
        <p class="acc-sheet-text">De app maakt een tijdelijk wachtwoord. Dat geef je door; bij de eerste keer inloggen kiest de nieuwe gebruiker zelf een wachtwoord.</p>
        <p class="sync-msg" id="newMsg" hidden></p>
        <button class="btn" type="submit">Account aanmaken</button>
      </form>`, 'Nieuwe gebruiker');
    setTimeout(() => s.$('input[name=name]')?.focus(), 250);
    const form = s.$('#newForm'), msg = s.$('#newMsg');
    form.onsubmit = async e => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
      try {
        const r = await Sync.call('user_create', { name: form.name.value });
        showTempPassword(s, r.name, r.password, `Account voor ${r.name}`);
        renderUsers();
      } catch (err) { msg.hidden = false; msg.textContent = err.message; btn.disabled = false; }
    };
  };

  view.querySelectorAll('.users-more').forEach(b => b.onclick = () => {
    const u = users.find(x => x.id === +b.dataset.id);
    const s = openAccSheet(`
      <div class="sheet-head"><h3>${esc(u.name)}</h3><button class="text-btn" data-close>Annuleer</button></div>
      <p class="acc-sheet-text">${u.recipes} ${u.recipes === 1 ? 'recept' : 'recepten'} · ${lastSeenText(u)}</p>
      <button class="btn ghost" id="resetPw">Nieuw tijdelijk wachtwoord geven</button>
      <p class="acc-sheet-text small-note">Handig als ${esc(u.name)} het wachtwoord kwijt is. ${esc(u.name)} wordt dan overal uitgelogd.</p>
      <button class="btn danger" id="delUser">Account verwijderen</button>
      <p class="sync-msg" id="optMsg" hidden></p>`, `Opties voor ${u.name}`);
    const msg = s.$('#optMsg');
    s.$('#resetPw').onclick = async () => {
      try { const r = await Sync.call('user_reset', { id: u.id }); showTempPassword(s, r.name, r.password, 'Nieuw wachtwoord'); renderUsers(); }
      catch (err) { msg.hidden = false; msg.textContent = err.message; }
    };
    s.$('#delUser').onclick = async () => {
      if (!confirm(`${u.name} en ${u.recipes === 1 ? 'het recept' : `alle ${u.recipes} recepten`} van ${u.name} verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
      try { await Sync.call('user_delete', { id: u.id }); s.close(); toast(`${u.name} is verwijderd`); renderUsers(); }
      catch (err) { msg.hidden = false; msg.textContent = err.message; }
    };
  });
}

// Na in- of uitloggen: alles opnieuw laden en naar het overzicht
async function reloadAll() {
  await loadRecipes();
  await Shopping.load();
  await AppSettings.load();
}
async function afterSignOut() {
  setTryMode(false);   // volgende gebruiker ziet weer het welkomstscherm
  await reloadAll();
  toast('Je bent uitgelogd');
  if ((location.hash || '#/') !== '#/') location.hash = '#/'; else route();
}
Sync.onSignIn = async user => {
  await reloadAll();
  if (!user.mustChange) toast(`Welkom, ${user.name}`);
  if ((location.hash || '#/') !== '#/' && !user.mustChange) location.hash = '#/'; else route();
};
Sync.onSignOut = afterSignOut;
Sync.onPasswordButton = openPasswordSheet;

/* ---------- Delen met andere gebruikers ---------- */
// Recepten sturen (komen in het postvak van de ander) en in elkaars Ricette kijken.
// Bij je Ricette horen alleen recepten met r.shared = true; wie mag kijken stel je in bij Instellingen.

const SHARE_KEY = 'ricetta-share';   // laatst bekende eigen instellingen (voor nieuwe recepten)
const shareCache = () => { try { return JSON.parse(localStorage.getItem(SHARE_KEY)) || {}; } catch { return {}; } };
const setShareCache = v => { try { localStorage.setItem(SHARE_KEY, JSON.stringify({ ...shareCache(), ...v })); } catch { /* */ } };
const loggedIn = () => Sync.status().state === 'on';
// Laden: pannetje met een roerende pollepel (zelfde lijnstijl als de iconen)
function loaderHtml(text = 'Laden…') {
  return `<div class="loader" role="status" aria-live="polite">
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <g class="ld-steam"><path d="M17 21c-2-2.5 2-4 0-6.5"/><path d="M24 19c-2-2.5 2-4 0-6.5"/></g>
      <g class="ld-ladle"><path d="M33 42 41 8"/><path d="M41 8c.8-3.4 4.6-4.4 6.4-1.8"/></g>
      <path class="ld-pot" d="M10 28h44v16a10 10 0 0 1-10 10H20a10 10 0 0 1-10-10z"/>
      <path d="M6 28h52M10 33H5M54 33h5"/>
    </svg>
    <p>${esc(text)}</p>
  </div>`;
}

// Oudere server zonder deze functies: begrijpelijke melding
const shareErr = err => /Onbekende actie/.test(err.message) ? 'Delen werkt pas als de server is bijgewerkt (nieuwe api.php).' : err.message.replace(/Dit (kookboek|receptenboek) wordt/, 'Deze Ricette worden');
const avatarHtml = name => `<div class="acc-avatar" aria-hidden="true">${esc(String(name || '?').charAt(0).toUpperCase())}</div>`;

// Kleine foto voor in andermans overzicht (de grote foto wordt pas bij openen opgehaald)
let thumbsBusy = false;
async function ensureThumbs() {
  if (thumbsBusy) return;
  thumbsBusy = true;
  try {
    for (const r of state.recipes.filter(x => x.shared && x.photo && (!x.thumb || x.thumbV !== 2))) {
      try { await DB.put({ ...r, thumb: await resizeImage(r.photo, 640), thumbV: 2 }); } catch { /* volgende keer */ }
    }
    await loadRecipes();
  } finally { thumbsBusy = false; }
}

// Een recept van iemand anders als eigen kopie bewaren
async function saveCopy(src, fromName) {
  const copy = { ...src, id: uid(), shared: false, links: [], favorite: false, fromUser: fromName, createdAt: Date.now() };
  delete copy.updatedAt; delete copy._inboxId; delete copy.thumb;
  await DB.put(copy);
  await loadRecipes();
  return copy;
}

/* Personenkiezer: zoeken, bovenaan de 3 met wie je het meest deelt, daaronder iedereen */
let peopleCache = null;
async function loadPeople() {
  peopleCache = await Sync.call('people');
  return peopleCache;
}
function peoplePicker(box, { people, top, selected, single = false, disabled = () => '', onChange = () => {} }) {
  box.innerHTML = `<input type="search" class="people-search" placeholder="Zoek een naam" autocomplete="off"><div class="people-lists"></div>`;
  const search = box.querySelector('.people-search'), lists = box.querySelector('.people-lists');
  const row = p => {
    const why = disabled(p);
    return `<li class="${selected.has(p.id) ? 'on' : ''}${why ? ' off' : ''}" data-pid="${p.id}" role="${single ? 'radio' : 'checkbox'}" aria-checked="${selected.has(p.id)}" tabindex="${why ? -1 : 0}">
      ${avatarHtml(p.name)}<b>${esc(p.name)}${why ? `<small>${esc(why)}</small>` : ''}</b><span class="tick" aria-hidden="true">${selected.has(p.id) ? '✓' : ''}</span></li>`;
  };
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const topPeople = top.map(id => people.find(p => p.id === id)).filter(Boolean);
    if (q) {
      const hits = people.filter(p => p.name.toLowerCase().includes(q));
      lists.innerHTML = hits.length ? `<ul class="people">${hits.map(row).join('')}</ul>` : `<p class="people-none">Niemand gevonden.</p>`;
    } else {
      const rest = people.filter(p => !top.includes(p.id));
      lists.innerHTML = (topPeople.length ? `<p class="people-head">Vaak gedeeld</p><ul class="people">${topPeople.map(row).join('')}</ul>` : '')
        + (rest.length ? `<p class="people-head">${topPeople.length ? 'Iedereen' : ''}</p><ul class="people">${rest.map(row).join('')}</ul>` : '')
        + (!people.length ? `<p class="people-none">Er zijn nog geen andere gebruikers.</p>` : '');
    }
    lists.querySelectorAll('li[data-pid]').forEach(li => li.onclick = () => {
      const p = people.find(x => x.id === +li.dataset.pid);
      if (disabled(p)) return;
      if (single) { selected.clear(); selected.add(p.id); }
      else selected.has(p.id) ? selected.delete(p.id) : selected.add(p.id);
      draw(); onChange();
    });
  };
  search.oninput = draw;
  draw();
  return { focus: () => search.focus({ preventScroll: true }) };
}

/* Delen-knop bij een recept: naar iemand in Ricetta, of via WhatsApp/mail */
async function openShareSheet(r, servings, factor) {
  if (!loggedIn()) return shareRecipe(r, servings, factor);
  const s = openAccSheet(`
    <div class="sheet-head"><h3>Recept delen</h3><button class="text-btn" data-close>Annuleer</button></div>
    <p class="people-head">Naar iemand in Ricetta</p>
    <div id="sendPicker"><p class="people-none">Laden…</p></div>
    <input class="msg-in" id="sendMsg" maxlength="200" placeholder="Berichtje (mag leeg blijven)">
    <p class="sync-msg" id="sendErr" hidden></p>
    <button class="btn" id="sendBtn" disabled>Kies iemand</button>
    <p class="share-or">of</p>
    <button class="btn ghost" id="sysShare">${ICONS.share} Via WhatsApp, Mail, …</button>`, 'Recept delen');
  s.$('#sysShare').onclick = () => { s.close(); shareRecipe(r, servings, factor); };
  const selected = new Set();
  let people = [];
  const btn = s.$('#sendBtn');
  const update = () => {
    const names = people.filter(p => selected.has(p.id)).map(p => p.name);
    btn.disabled = !names.length;
    btn.textContent = names.length ? `Stuur naar ${names.length > 2 ? `${names.length} mensen` : names.join(' en ')}` : 'Kies iemand';
  };
  try {
    const d = await loadPeople();
    people = d.people;
    peoplePicker(s.$('#sendPicker'), { people, top: d.top, selected, disabled: p => p.accept ? '' : 'ontvangt geen recepten', onChange: update });
  } catch (err) { s.$('#sendPicker').innerHTML = `<p class="people-none">${esc(shareErr(err))}</p>`; }
  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = 'Versturen…';
    const recipe = { ...r };
    delete recipe.links; delete recipe.favorite; delete recipe.shared; delete recipe._inboxId; delete recipe.updatedAt;
    try {
      const res = await Sync.call('send_recipe', { to: [...selected], recipe, message: s.$('#sendMsg').value.trim() });
      s.close();
      toast(`Verstuurd naar ${res.sent.join(' en ')}`);
    } catch (err) { const m = s.$('#sendErr'); m.hidden = false; m.textContent = shareErr(err); update(); }
  };
}

/* Ontvangen recept bekijken: '#/ontvangen/<postvak-id>' */
async function renderReceived(inboxId) {
  const seq = routeSeq;
  let item = Importer.inboxItem(inboxId);
  if (!item) { await Importer.checkInbox(); item = Importer.inboxItem(inboxId); }
  if (isStale(seq)) return;
  if (!item || item.data.kind !== 'recipe') { location.hash = '#/'; return; }
  const d = item.data;
  return renderDetail(null, {
    recipe: { ...d.recipe, id: 'ontvangen-' + inboxId }, back: false,
    from: d.from?.name || '', message: d.message,
    onSave: async () => {
      const copy = await saveCopy(d.recipe, d.from?.name || '');
      await Importer.dropInbox(inboxId);
      toast('Bewaard in je recepten');
      location.hash = '#/r/' + encodeURIComponent(copy.id);
    },
    onDiscard: async () => {
      if (!confirm(`"${d.recipe.title}" weggooien?`)) return;
      await Importer.dropInbox(inboxId);
      location.hash = '#/';
    },
  });
}

/* Ricette van anderen: '#/kookboeken' */
async function renderBooks() {
  const seq = routeSeq;
  document.body.dataset.page = 'settings';
  setHeader({ title: 'Ricette', close: true, timer: false, actions: `<button class="icon-btn settings-btn" data-go="#/settings" aria-label="Instellingen">${ICONS.gear}</button>` });
  if (!loggedIn()) { view.innerHTML = `<section class="settings"><div class="card-box"><p>Log in om de Ricette van anderen te bekijken.</p></div></section>`; return; }
  view.innerHTML = `<section class="settings">${loaderHtml('Ricette ophalen…')}</section>`;
  let books = [];
  try { books = await Sync.call('books'); } catch (err) { if (!isStale(seq)) view.innerHTML = `<section class="settings"><div class="card-box"><p>${esc(shareErr(err))}</p></div></section>`; return; }
  if (isStale(seq)) return;
  const covers = b => {
    const t = b.thumbs.slice(0, 4);
    while (t.length < 4) t.push('');
    return t.map(s => s ? `<img src="${s}" alt="">` : `<span class="cover-empty">${ICONS.plate}</span>`).join('');
  };
  view.innerHTML = `<section class="settings">
    <div class="page-flag">${flagHtml('Ricette')}</div>
    <p class="books-intro">Recepten van mensen die hun Ricette met jou delen. Kijk rond en bewaar wat je lekker lijkt.</p>
    ${books.length ? `<ul class="books">${books.map(b => `
      <li><a class="book" href="#/kookboek/${b.id}"><div class="covers">${covers(b)}</div>
        <div><b>Ricette van ${esc(b.name)}</b><small>${b.count} ${b.count === 1 ? 'recept' : 'recepten'}${b.new ? ` · ${b.new} nieuw deze week` : ''}</small></div></a></li>`).join('')}</ul>`
      : `<div class="card-box"><p>Er deelt nog niemand Ricette met je.</p><p>Deel je eigen Ricette bij <a href="#/settings" class="link">Instellingen → Delen met anderen</a>.</p></div>`}
  </section>`;
}

/* Iemands Ricette: '#/kookboek/<id>' en een recept daaruit: '#/kookboek/<id>/<recept-id>' */
const bookCache = new Map();
async function loadBook(ownerId) {
  const d = await Sync.call('book', { owner: ownerId });
  bookCache.set(ownerId, d);
  return d;
}
const bookFilters = new Map();   // per persoon: zoekterm, gang en filter (blijft bij terugkomen)
async function renderBook(ownerId) {
  const seq = routeSeq;
  document.body.dataset.page = 'book';
  const filtersOpen = (() => { try { return localStorage.getItem('ricetta-filters-open') !== '0'; } catch { return true; } })();
  const head = title => setHeader({ title, back: true, close: true, timer: false, actions: `
    <button class="icon-btn filter-toggle${filtersOpen ? ' on' : ''}" id="filterToggle" aria-controls="bookHead" aria-expanded="${filtersOpen}" aria-label="Zoeken en filters" title="Zoeken en filters">${ICONS.filter}<span class="filter-dot" hidden></span></button>
    <button class="icon-btn settings-btn" data-go="#/settings" aria-label="Instellingen">${ICONS.gear}</button>` });
  head('Ricette');
  view.innerHTML = `<section class="book-page">${loaderHtml('Ricette openen…')}</section>`;
  let d;
  try { d = await loadBook(ownerId); } catch (err) { if (!isStale(seq)) view.innerHTML = `<section class="settings"><div class="card-box"><p>${esc(shareErr(err))}</p></div></section>`; return; }
  if (isStale(seq)) return;
  head(d.owner.name);
  const mine = r => state.recipes.some(x => x.fromUser === d.owner.name && x.title === r.title);
  const f = bookFilters.get(ownerId) || { q: '', course: null, filter: 'all' };
  bookFilters.set(ownerId, f);

  // Filters zoals die persoon ze heeft: gangen (in de volgorde van je eigen gangen), dieet en categorieën
  const all = d.recipes;
  const rCourses = r => Array.isArray(r.courses) ? r.courses : [];
  const rCats = r => Array.isArray(r.categories) ? r.categories : (r.category ? [r.category] : []);
  const courseNames = [...new Set(all.flatMap(rCourses))];
  const mineOrder = courseList();
  courseNames.sort((x, y) => (mineOrder.indexOf(x) + 1 || 99) - (mineOrder.indexOf(y) + 1 || 99) || x.localeCompare(y, 'nl'));
  const catCount = new Map();
  all.forEach(r => rCats(r).forEach(c => catCount.set(c, (catCount.get(c) || 0) + 1)));
  const cats = [...catCount.keys()].sort((x, y) => catCount.get(y) - catCount.get(x) || x.localeCompare(y, 'nl'));
  const diets = ['vegetarisch', 'vegan'].filter(k => all.some(r => k === 'vegan' ? dietOf(r) === 'vegan' : dietOf(r)));
  const chips = [['all', 'Alles'], ...diets.map(k => ['diet:' + k, k]), ...cats.map(c => [c, c])];
  if (!chips.some(([k]) => k === f.filter)) f.filter = 'all';
  if (f.course && !courseNames.includes(f.course)) f.course = null;

  view.innerHTML = `<section class="book-page">
    <div class="book-top" id="bookTop">
    <div class="book-flag"><div class="acc-flag"><span><small>Ricette van</small>${esc(d.owner.name)}</span></div></div>
    <div class="list-head book-head${filtersOpen ? '' : ' closed'}" id="bookHead"><div class="lh-inner">
      <div class="search book-search">${ICONS.search}<input type="search" id="bookQ" placeholder="Zoek in deze Ricette" value="${esc(f.q)}" autocomplete="off"></div>
      ${courseNames.length ? `<div class="chips course-chips">${courseNames.map(c => `<button class="chip chip-course${f.course === c ? ' on' : ''}" data-bcourse="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
      ${chips.length > 1 ? `<div class="chips">${chips.map(([k, l]) => k.startsWith('diet:')
        ? `<button class="chip chip-diet${f.filter === k ? ' on' : ''}" data-bfilter="${esc(k)}">${dietBadge(l, { tip: false })}</button>`
        : `<button class="chip${f.filter === k ? ' on' : ''}" data-bfilter="${esc(k)}">${esc(l)}</button>`).join('')}</div>` : ''}
    </div></div>
    </div>
    <ul class="cards book-cards" id="bookCards"></ul>
  </section>`;
  const draw = () => {
    const q = f.q.trim().toLowerCase();
    const dot = $('#filterToggle .filter-dot');
    if (dot) dot.hidden = !(q || f.filter !== 'all' || f.course);
    const list = all.filter(r => {
      if (f.course && !rCourses(r).includes(f.course)) return false;
      if (f.filter === 'diet:vegetarisch' && !dietOf(r)) return false;
      if (f.filter === 'diet:vegan' && dietOf(r) !== 'vegan') return false;
      if (f.filter !== 'all' && !f.filter.startsWith('diet:') && !rCats(r).includes(f.filter)) return false;
      return !q || [r.title, r.ingredients, ...rCourses(r), ...rCats(r)].join(' ').toLowerCase().includes(q);
    });
    const el = $('#bookCards');
    el.classList.toggle('mag', isWide());
    // iPad en laptop: als magazine, net als je eigen overzicht
    if (isWide()) {
      if (!list.length) { el.innerHTML = `<li class="none">Geen recepten gevonden.</li>`; return; }
      const withPhoto = r => ({ ...r, photo: r.thumb || '' });
      return Mag.render(el, list.map(withPhoto), {
        all: all.map(withPhoto), hero: f.hero || (f.hero = {}),
        browsing: !q && f.filter === 'all' && !f.course,
        href: r => `#/kookboek/${d.owner.id}/${encodeURIComponent(r.id)}`,
        courses: rCourses, cats: rCats,
        fillers: [
          { id: 'bkSurprise', icon: 'dice', title: 'Verras me', sub: 'Deze Ricette husselen', on: () => { Mag.shuffle(); f.hero = {}; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
          { id: 'bkBooks', icon: 'book', title: 'Ricette', sub: 'Ricette van anderen bekijken', on: () => { location.hash = '#/kookboeken'; } },
          { id: 'bkMine', icon: 'plate', title: 'Mijn recepten', sub: 'Terug naar je eigen Ricette', on: () => { location.hash = '#/'; } },
        ],
        // Uitgelicht recept: de volle foto ophalen (de kleine is te klein voor zo'n grote plaat)
        onHero: async (hero, img) => {
          try { const full = await Sync.call('book_recipe', { owner: d.owner.id, id: hero.id }); if (full.photo && img.isConnected) img.src = full.photo; } catch { /* kleine foto blijft */ }
        },
      });
    }
    el.innerHTML = list.length ? list.map(r => {
      const time = formatTime((+r.prepTime || 0) + (+r.cookTime || 0));
      return `<li><a class="card" href="#/kookboek/${d.owner.id}/${encodeURIComponent(r.id)}">
        <div class="thumb">${r.thumb ? `<img src="${r.thumb}" alt="" loading="lazy">` : `<span>${esc((r.title || '?')[0].toUpperCase())}</span>`}</div>
        <div class="card-body"><div class="card-title">${esc(r.title)}</div>
          <div class="card-meta">${dietBadge(dietOf(r), { text: false })}${[rCourses(r).join(', '), rCats(r).join(', '), time].filter(Boolean).map(esc).join(' · ')}</div></div>
        ${mine(r) ? `<span class="keep-done">✓ bewaard</span>` : `<button class="keep-btn" data-keep="${esc(r.id)}">+ bewaar</button>`}
      </a></li>`;
    }).join('') : `<li class="none">Geen recepten gevonden.</li>`;
    view.querySelectorAll('[data-keep]').forEach(bt => bt.onclick = async e => {
      e.preventDefault(); e.stopPropagation();
      bt.disabled = true; bt.textContent = 'Bezig…';
      try {
        const full = await Sync.call('book_recipe', { owner: d.owner.id, id: bt.dataset.keep });
        await saveCopy(full, d.owner.name);
        toast(`"${full.title}" bewaard in je recepten`);
        draw();
      } catch (err) { toast(shareErr(err)); bt.disabled = false; bt.textContent = '+ bewaar'; }
    });
  };
  state.bookDraw = draw;
  $('#bookQ').oninput = e => { f.q = e.target.value; draw(); };
  view.querySelectorAll('[data-bcourse]').forEach(b => b.onclick = () => {
    f.course = f.course === b.dataset.bcourse ? null : b.dataset.bcourse;
    view.querySelectorAll('[data-bcourse]').forEach(x => x.classList.toggle('on', x.dataset.bcourse === f.course));
    draw();
  });
  view.querySelectorAll('[data-bfilter]').forEach(b => b.onclick = () => {
    const k = b.dataset.bfilter;
    f.filter = (k === f.filter && k !== 'all') ? 'all' : k;
    view.querySelectorAll('[data-bfilter]').forEach(x => x.classList.toggle('on', x.dataset.bfilter === f.filter));
    draw();
  });
  // In- en uitklappen met het icoon in de menubalk, net als in je eigen overzicht (zelfde keuze onthouden)
  $('#filterToggle').onclick = () => {
    const btn = $('#filterToggle'), open = btn.getAttribute('aria-expanded') !== 'true';
    btn.classList.toggle('on', open);
    btn.setAttribute('aria-expanded', open);
    try { localStorage.setItem('ricetta-filters-open', open ? '1' : '0'); } catch {}
    foldFilters($('#bookHead'), open, { also: [$('#bookCards')] });   // schuift onder het vaandel door, net als onder de kopbalk
  };
  draw();
}
async function renderBookRecipe(ownerId, recipeId) {
  const seq = routeSeq;
  let r, owner = bookCache.get(ownerId)?.owner;
  const name = bookCache.get(ownerId)?.recipes.find(x => x.id === recipeId)?.title;
  setHeader({ title: name || 'Recept', back: true, close: true, timer: false, actions: `<button class="icon-btn settings-btn" data-go="#/settings" aria-label="Instellingen">${ICONS.gear}</button>` });
  view.innerHTML = loaderHtml(name ? `${name} ophalen…` : 'Recept ophalen…');
  try {
    r = await Sync.call('book_recipe', { owner: ownerId, id: recipeId });
    if (!owner) owner = (await loadBook(ownerId)).owner;
  } catch (err) { if (!isStale(seq)) { toast(shareErr(err)); location.hash = `#/kookboek/${ownerId}`; } return; }
  if (isStale(seq)) return;
  const already = state.recipes.find(x => x.fromUser === owner.name && x.title === r.title);
  return renderDetail(null, {
    recipe: { ...r, id: `kookboek-${ownerId}-${recipeId}` }, from: owner.name,
    saveLabel: already ? 'Nog een keer bewaren' : 'Bewaar in mijn recepten',
    onSave: async () => {
      const copy = await saveCopy(r, owner.name);
      toast('Bewaard in je recepten');
      location.hash = '#/r/' + encodeURIComponent(copy.id);
    },
  });
}

/* Instellingen → Delen met anderen */
function shareSettingsHtml() {
  return `<div id="shareSettings"><p>Laden…</p></div>`;
}
async function bindShareSettings() {
  const box = $('#shareSettings');
  if (!box) return;
  let st;
  try { st = await Sync.call('share_get'); } catch (err) { box.innerHTML = `<p>${esc(shareErr(err))}</p>`; return; }
  if (!box.isConnected) return;
  setShareCache({ visibility: st.visibility });
  let people = st.people.map(p => p.id);
  const sharedCount = () => state.recipes.filter(r => r.shared).length;
  const draw = () => {
    box.innerHTML = `
      <p class="opt-head">Wie mag mijn Ricette bekijken?</p>
      <div class="choice-list">
        <label><input type="radio" name="vis" value="none" ${st.visibility === 'none' ? 'checked' : ''}><span><strong>Niemand</strong><small>Je recepten zijn alleen van jou.</small></span></label>
        <label><input type="radio" name="vis" value="some" ${st.visibility === 'some' ? 'checked' : ''}><span><strong>Alleen deze mensen</strong></span></label>
        ${st.visibility === 'some' ? `<div class="mini-chips">${st.people.map(p => `<span class="chip on">${esc(p.name)}</span>`).join('')}<button class="chip link-add" id="pickViewers">${st.people.length ? 'Wijzig' : '+ Kies mensen'}</button></div>` : ''}
        <label><input type="radio" name="vis" value="all" ${st.visibility === 'all' ? 'checked' : ''}><span><strong>Iedereen in Ricetta</strong></span></label>
      </div>
      ${st.visibility !== 'none' ? `<button class="btn ghost" id="pickRecipes">Recepten kiezen</button><p class="small-note share-count">${sharedCount()} van je ${state.recipes.length} recepten ${sharedCount() === 1 ? 'hoort' : 'horen'} bij je Ricette.</p>` : ''}
      <p class="opt-head">Recepten ontvangen</p>
      <div class="choice-list"><label><input type="checkbox" id="acceptSend" ${st.accept ? 'checked' : ''}><span><strong>Anderen mogen mij recepten sturen</strong><small>Ze komen eerst in je postvak; jij kiest of je ze bewaart.</small></span></label></div>`;
    const badge = $('#badge-sharing');
    if (badge) badge.innerHTML = `<span class="badge-muted">${({ none: 'privé', some: 'gedeeld', all: 'iedereen' })[st.visibility]}</span>`;
    box.querySelectorAll('[name=vis]').forEach(rb => rb.onchange = async () => {
      const first = st.visibility === 'none' && !state.recipes.some(r => r.shared);
      st.visibility = rb.value;
      await Sync.call('share_set', { visibility: st.visibility }).catch(err => toast(shareErr(err)));
      setShareCache({ visibility: st.visibility });
      draw();
      if (st.visibility === 'some' && !st.people.length) openViewerPicker();
      else if (st.visibility !== 'none' && first) openRecipePicker(true);
    });
    const pv = $('#pickViewers'); if (pv) pv.onclick = () => openViewerPicker();
    const pr = $('#pickRecipes'); if (pr) pr.onclick = () => openRecipePicker(false);
    $('#acceptSend').onchange = e => Sync.call('share_set', { accept: e.target.checked }).catch(err => toast(shareErr(err)));
  };
  // Met wie: zoeken + de 3 met wie je het meest deelt bovenaan
  const openViewerPicker = async () => {
    const s = openAccSheet(`
      <div class="sheet-head"><h3>Wie mag kijken?</h3><button class="text-btn" data-close>Klaar</button></div>
      <div id="viewPicker"><p class="people-none">Laden…</p></div>`, 'Wie mag kijken');
    const selected = new Set(people);
    let d;
    try { d = await loadPeople(); } catch (err) { s.$('#viewPicker').innerHTML = `<p class="people-none">${esc(shareErr(err))}</p>`; return; }
    const picker = peoplePicker(s.$('#viewPicker'), { people: d.people, top: d.top, selected, onChange: async () => {
      people = [...selected];
      st.people = d.people.filter(p => selected.has(p.id));
      await Sync.call('share_set', { people }).catch(err => toast(shareErr(err)));
    } });
    picker.focus();
    s.el.addEventListener('click', e => {
      if (e.target === s.el || e.target.closest('[data-close]')) setTimeout(() => {
        draw();
        if (!state.recipes.some(r => r.shared) && st.people.length) openRecipePicker(true);
      }, 220);
    });
  };
  // Welke recepten: per recept aan/uit, met 'Kies allemaal'
  const openRecipePicker = first => {
    const chosen = new Set(state.recipes.filter(r => r.shared).map(r => r.id));
    const s = openAccSheet(`
      <div class="sheet-head"><h3>${first ? 'Welke recepten wil je delen?' : 'Je Ricette'}</h3><button class="text-btn" data-close>Annuleer</button></div>
      ${first ? '<p class="acc-sheet-text">Kies welke recepten anderen in je Ricette zien. Je kunt dit later per recept aanpassen.</p>' : ''}
      <div class="pick-tools"><input type="search" id="recQ" placeholder="Zoek een recept" autocomplete="off"><button class="chip" id="allBtn"></button></div>
      <ul class="pick rec-pick" id="recList"></ul>
      <button class="btn" id="recSave">Opslaan</button>`, 'Welke recepten');
    const drawList = () => {
      const q = s.$('#recQ').value.trim().toLowerCase();
      const list = state.recipes.filter(r => !q || r.title.toLowerCase().includes(q));
      s.$('#recList').innerHTML = list.map(r => `<li data-rid="${esc(r.id)}" class="${chosen.has(r.id) ? 'on' : ''}">
        ${r.photo ? `<img src="${r.photo}" alt="" loading="lazy">` : `<span class="pick-nophoto">${ICONS.plate}</span>`}<b>${esc(r.title)}</b><span class="tick">${chosen.has(r.id) ? '✓' : ''}</span></li>`).join('');
      const all = state.recipes.every(r => chosen.has(r.id));
      s.$('#allBtn').textContent = all ? 'Niets kiezen' : 'Kies allemaal';
      s.$('#recSave').textContent = `Opslaan (${chosen.size} ${chosen.size === 1 ? 'recept' : 'recepten'})`;
      s.el.querySelectorAll('#recList li').forEach(li => li.onclick = () => { chosen.has(li.dataset.rid) ? chosen.delete(li.dataset.rid) : chosen.add(li.dataset.rid); drawList(); });
    };
    s.$('#recQ').oninput = drawList;
    s.$('#allBtn').onclick = () => {
      const all = state.recipes.every(r => chosen.has(r.id));
      state.recipes.forEach(r => all ? chosen.delete(r.id) : chosen.add(r.id));
      drawList();
    };
    s.$('#recSave').onclick = async () => {
      const changed = state.recipes.filter(r => !!r.shared !== chosen.has(r.id)).map(r => ({ ...r, shared: chosen.has(r.id) }));
      if (changed.length) await DB.putMany(changed);
      await loadRecipes();
      s.close();
      toast(`${chosen.size} ${chosen.size === 1 ? 'recept hoort' : 'recepten horen'} bij je Ricette`);
      draw();
      ensureThumbs();
    };
    drawList();
  };
  draw();
}

/* ---------- Router ---------- */

// Elk schermwissel krijgt een nummer; trage schermen tekenen niet meer als er al een nieuwer is.
let routeSeq = 0;
const isStale = seq => seq !== routeSeq;

async function route() {
  routeSeq++;
  const hash = location.hash || '#/';
  const [, page, id, sub] = hash.split('/');
  window.scrollTo(0, 0);

  if (page !== 'r' && state.cookMode) setCookMode(false);
  if (page !== 'r') state.backStack = [];
  document.getElementById('cookServings')?.remove();   // hoort bij het vorige recept
  document.body.dataset.page = ({ r: 'detail', edit: 'edit', new: 'edit', settings: 'settings', gebruikers: 'settings', boodschappen: 'shop',
    ontvangen: 'detail', kookboeken: 'settings', kookboek: 'book' })[page] || 'list';

  // Nog niet ingelogd (en niet aan het uitproberen), of eerst een eigen wachtwoord kiezen?
  const gate = accountGate();
  if (gate) return gate();

  maybeShowNews();
  if (page === 'r' && id) return renderDetail(decodeURIComponent(id));
  if (page === 'edit' && id) return renderEdit(decodeURIComponent(id));
  if (page === 'new') return renderEdit(null);
  if (page === 'settings') return renderSettings();
  if (page === 'gebruikers') return renderUsers();
  if (page === 'ontvangen' && id) return renderReceived(+id);
  if (page === 'kookboeken') return renderBooks();
  if (page === 'kookboek' && id && sub) return renderBookRecipe(+id, decodeURIComponent(sub));
  if (page === 'kookboek' && id) return renderBook(+id);
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
  Importer.checkInbox();   // recepten die vanuit Safari of door anderen zijn gedeeld
  setTimeout(ensureThumbs, 3000);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
