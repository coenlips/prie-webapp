'use strict';

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
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  people: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 14a6 6 0 0 1 3 6"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
};

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

function resizeImage(file, max = 1200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Foto kon niet geladen worden')); };
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
  state.recipes = (await DB.all()).sort((a, b) => a.title.localeCompare(b.title, 'nl'));
}

/* ---------- Kopbalk ---------- */

function setHeader({ title = 'Recepten', back = false, actions = '' } = {}) {
  $('#title').textContent = title;
  $('#backBtn').hidden = !back;
  $('#topActions').innerHTML = actions;
  $('#addBtn').hidden = !!back;
  document.title = title === 'Recepten' ? 'Recepten' : `${title} · Recepten`;
}

$('#backBtn').addEventListener('click', () => {
  const page = (location.hash || '#/').split('/')[1];
  if (page === 'r' || page === 'settings' || !state.navigated) location.hash = '#/';
  else history.back();
});
$('#addBtn').addEventListener('click', () => { location.hash = '#/new'; });

/* ---------- Lijst ---------- */

function renderList() {
  setHeader({ actions: `<button class="icon-btn" data-go="#/settings" aria-label="Instellingen">${ICONS.gear}</button>` });

  const cats = [...new Set(state.recipes.map(r => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nl'));
  const chips = [['all', 'Alles'], ['fav', '♥ Favorieten'], ...cats.map(c => [c, c])];
  if (!chips.some(([k]) => k === state.filter)) state.filter = 'all';

  view.innerHTML = `
    <div class="search">
      ${ICONS.search}
      <input type="search" id="q" placeholder="Zoek recept of ingrediënt" value="${esc(state.query)}" autocomplete="off">
    </div>
    ${state.recipes.length ? `<div class="chips">${chips.map(([k, l]) =>
      `<button class="chip${state.filter === k ? ' on' : ''}" data-filter="${esc(k)}">${esc(l)}</button>`).join('')}</div>` : ''}
    <ul class="cards" id="cards"></ul>
  `;

  const q = $('#q');
  q.addEventListener('input', () => { state.query = q.value; renderCards(); });
  view.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
    state.filter = b.dataset.filter;
    renderList();
  }));
  renderCards();
}

function renderCards() {
  const q = state.query.trim().toLowerCase();
  const list = state.recipes.filter(r => {
    if (state.filter === 'fav' && !r.favorite) return false;
    if (state.filter !== 'all' && state.filter !== 'fav' && r.category !== state.filter) return false;
    if (!q) return true;
    return [r.title, r.category, r.ingredients, (r.tags || []).join(' ')].join(' ').toLowerCase().includes(q);
  });

  const el = $('#cards');
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
  if (!list.length) {
    el.innerHTML = `<li class="none">Geen recepten gevonden.</li>`;
    return;
  }
  el.innerHTML = list.map(r => {
    const time = formatTime((+r.prepTime || 0) + (+r.cookTime || 0));
    return `
      <li><a class="card" href="#/r/${esc(r.id)}">
        <div class="thumb">${r.photo ? `<img src="${r.photo}" alt="" loading="lazy">` : `<span>${esc((r.title || '?')[0].toUpperCase())}</span>`}</div>
        <div class="card-body">
          <div class="card-title">${esc(r.title)}${r.favorite ? ' <span class="fav">♥</span>' : ''}</div>
          <div class="card-meta">${[r.category, time].filter(Boolean).map(esc).join(' · ')}</div>
        </div>
      </a></li>`;
  }).join('');
}

/* ---------- Detail ---------- */

let wakeLock = null;
async function setWakeLock(on) {
  try {
    if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    return true;
  } catch { return false; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.cookMode) setWakeLock(true);
});

async function renderDetail(id) {
  const r = await DB.get(id);
  if (!r) { location.hash = '#/'; return; }

  const base = Math.max(1, +r.servings || 1);
  let servings = base;
  const done = new Set();

  setHeader({
    title: r.title, back: true,
    actions: `
      <button class="icon-btn${r.favorite ? ' active' : ''}" id="favBtn" aria-label="Favoriet">${ICONS.heart}</button>
      <button class="icon-btn" data-go="#/edit/${esc(r.id)}" aria-label="Bewerken">${ICONS.edit}</button>`,
  });

  const ingr = lines(r.ingredients);
  const steps = lines(r.steps);

  function draw() {
    const factor = servings / base;
    view.innerHTML = `
      ${r.photo ? `<img class="hero" src="${r.photo}" alt="">` : ''}
      <section class="detail">
        <h2 class="detail-title">${esc(r.title)}</h2>
        ${r.description ? `<p class="lead">${esc(r.description)}</p>` : ''}
        <div class="meta">
          ${r.category ? `<span class="pill">${esc(r.category)}</span>` : ''}
          ${r.prepTime ? `<span>${ICONS.clock} Voorbereiden ${formatTime(r.prepTime)}</span>` : ''}
          ${r.cookTime ? `<span>${ICONS.clock} Koken ${formatTime(r.cookTime)}</span>` : ''}
          ${(r.tags || []).map(t => `<span class="tag">#${esc(t)}</span>`).join('')}
        </div>

        <label class="cook-toggle">
          <input type="checkbox" id="cook" ${state.cookMode ? 'checked' : ''}>
          <span>Kookmodus <small>scherm blijft aan, grotere tekst</small></span>
        </label>

        <div class="section-head">
          <h3>Ingrediënten</h3>
          <div class="stepper" aria-label="Aantal porties">
            <button id="minus" aria-label="Minder porties">−</button>
            <span>${ICONS.people} ${servings}</span>
            <button id="plus" aria-label="Meer porties">+</button>
          </div>
        </div>
        <ul class="ingredients">
          ${ingr.map((l, i) => l.startsWith('#')
            ? `<li class="sub">${esc(l.replace(/^#+\s*/, ''))}</li>`
            : `<li data-i="${i}" class="${done.has('i' + i) ? 'done' : ''}"><span class="check"></span><span>${scaleLine(l, factor)}</span></li>`).join('')}
        </ul>

        <h3>Bereiding</h3>
        <ol class="steps">
          ${steps.map((l, i) => `<li data-s="${i}" class="${done.has('s' + i) ? 'done' : ''}"><span class="num">${i + 1}</span><p>${esc(l)}</p></li>`).join('')}
        </ol>

        ${r.notes ? `<h3>Notities</h3><p class="notes">${esc(r.notes).replace(/\n/g, '<br>')}</p>` : ''}

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
      const k = 's' + li.dataset.s; done.has(k) ? done.delete(k) : done.add(k); li.classList.toggle('done');
    });
    $('#cook').onchange = async e => {
      state.cookMode = e.target.checked;
      document.body.classList.toggle('cook', state.cookMode);
      const ok = await setWakeLock(state.cookMode);
      if (state.cookMode && (!ok || !('wakeLock' in navigator))) toast('Scherm-aan wordt niet ondersteund op dit toestel');
    };
    $('#shareBtn').onclick = () => shareRecipe(r, servings, factor);
  }

  draw();
  $('#favBtn').onclick = async () => {
    r.favorite = !r.favorite;
    await DB.put(r);
    await loadRecipes();
    $('#favBtn').classList.toggle('active', r.favorite);
    toast(r.favorite ? 'Toegevoegd aan favorieten' : 'Verwijderd uit favorieten');
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
    r.description,
    `\nIngrediënten (${servings} ${servings === 1 ? 'portie' : 'porties'}):`,
    ...ingr,
    '\nBereiding:',
    ...lines(r.steps).map((s, i) => `${i + 1}. ${s}`),
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
  const r = id ? await DB.get(id) : {
    id: uid(), title: '', description: '', category: '', tags: [], servings: 4,
    prepTime: '', cookTime: '', ingredients: '', steps: '', notes: '', photo: '', favorite: false,
  };
  if (!r) { location.hash = '#/'; return; }
  let photo = r.photo || '';

  setHeader({
    title: id ? 'Bewerken' : 'Nieuw recept', back: true,
    actions: `<button class="text-btn" id="saveBtn">Bewaar</button>`,
  });

  const allCats = [...new Set([...CATEGORIES, ...state.recipes.map(x => x.category).filter(Boolean)])];

  view.innerHTML = `
    <form class="form" id="form" autocomplete="off">
      <label class="photo-pick" id="photoPick">
        <input type="file" accept="image/*" id="photoInput" hidden>
        <div class="photo-preview" id="photoPreview"></div>
      </label>
      <button type="button" class="link danger" id="removePhoto" ${photo ? '' : 'hidden'}>Foto verwijderen</button>

      <label>Naam<input name="title" required value="${esc(r.title)}" placeholder="Bijv. Oma's appeltaart"></label>
      <label>Korte omschrijving<input name="description" value="${esc(r.description)}" placeholder="Optioneel"></label>

      <div class="row">
        <label>Categorie<input name="category" list="cats" value="${esc(r.category)}" placeholder="Kies of typ"></label>
        <label>Porties<input name="servings" type="number" inputmode="numeric" min="1" value="${esc(r.servings)}"></label>
      </div>
      <datalist id="cats">${allCats.map(c => `<option value="${esc(c)}">`).join('')}</datalist>

      <div class="row">
        <label>Voorbereiden (min)<input name="prepTime" type="number" inputmode="numeric" min="0" value="${esc(r.prepTime)}"></label>
        <label>Kooktijd (min)<input name="cookTime" type="number" inputmode="numeric" min="0" value="${esc(r.cookTime)}"></label>
      </div>

      <label>Ingrediënten <small>één per regel · begin met # voor een kopje</small>
        <textarea name="ingredients" rows="8" placeholder="250 g bloem&#10;2 eieren&#10;# Voor de saus&#10;1/2 l melk">${esc(r.ingredients)}</textarea>
      </label>
      <label>Bereiding <small>één stap per regel</small>
        <textarea name="steps" rows="8" placeholder="Verwarm de oven voor op 180 °C.&#10;Meng de bloem met de eieren.">${esc(r.steps)}</textarea>
      </label>
      <label>Tags <small>gescheiden door komma's</small><input name="tags" value="${esc((r.tags || []).join(', '))}" placeholder="vegetarisch, snel"></label>
      <label>Notities<textarea name="notes" rows="3" placeholder="Tips, variaties, bron…">${esc(r.notes)}</textarea></label>

      ${id ? `<button type="button" class="btn danger" id="deleteBtn">Recept verwijderen</button>` : ''}
    </form>`;

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
      category: d.category.trim(),
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
    await DB.put(updated);
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

function renderSettings() {
  setHeader({ title: 'Instellingen', back: true });
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  view.innerHTML = `
    <section class="settings">
      ${standalone ? '' : `
      <div class="card-box">
        <h3>Op je beginscherm zetten</h3>
        <ol class="howto">
          <li>Open deze pagina in <strong>Safari</strong>.</li>
          <li>Tik op de deelknop ${ICONS.share}.</li>
          <li>Kies <strong>Zet op beginscherm</strong>.</li>
        </ol>
      </div>`}

      <div class="card-box">
        <h3>Back-up</h3>
        <p>Je ${state.recipes.length} ${state.recipes.length === 1 ? 'recept staat' : 'recepten staan'} alleen op dit toestel.
           Maak af en toe een back-up, bijvoorbeeld naar iCloud Drive.</p>
        <button class="btn" id="exportBtn">Back-up exporteren</button>
        <label class="btn ghost file-btn">Back-up importeren
          <input type="file" accept="application/json,.json" id="importInput" hidden>
        </label>
      </div>
    </section>`;

  $('#exportBtn').addEventListener('click', exportBackup);
  $('#importInput').addEventListener('change', e => importBackup(e.target.files[0]));
}

async function exportBackup() {
  const data = JSON.stringify({ app: 'recepten', version: 1, exportedAt: new Date().toISOString(), recipes: state.recipes });
  const name = `recepten-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([data], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Recepten back-up' }); return; } catch { return; }
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
  await DB.put({
    id: uid(),
    title: 'Pannenkoeken',
    description: 'Klassieke Hollandse pannenkoeken, lekker met stroop of spek.',
    category: 'Lunch',
    tags: ['vegetarisch', 'klassieker'],
    servings: 4,
    prepTime: 10,
    cookTime: 20,
    ingredients: '250 g bloem\n500 ml melk\n2 eieren\n1 snufje zout\n# Om te bakken\n30 g boter',
    steps: 'Doe de bloem en het zout in een kom en maak een kuiltje in het midden.\nBreek de eieren in het kuiltje en voeg de helft van de melk toe.\nKlop tot een glad beslag en voeg dan de rest van de melk toe.\nLaat het beslag 10 minuten rusten.\nSmelt een klontje boter in een koekenpan en bak de pannenkoeken aan beide kanten goudbruin.',
    notes: 'Voor spekpannenkoeken: bak eerst een paar plakjes spek in de pan en schenk het beslag eroverheen.',
    photo: '',
    favorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  await loadRecipes();
  renderList();
}

/* ---------- Router ---------- */

async function route() {
  const hash = location.hash || '#/';
  const [, page, id] = hash.split('/');
  window.scrollTo(0, 0);

  if (page !== 'r' && state.cookMode) {
    state.cookMode = false;
    document.body.classList.remove('cook');
    setWakeLock(false);
  }

  if (page === 'r' && id) return renderDetail(decodeURIComponent(id));
  if (page === 'edit' && id) return renderEdit(decodeURIComponent(id));
  if (page === 'new') return renderEdit(null);
  if (page === 'settings') return renderSettings();
  return renderList();
}

document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) location.hash = go.dataset.go;
});

window.addEventListener('hashchange', () => { state.navigated = true; route(); });

(async () => {
  await loadRecipes();
  route();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
