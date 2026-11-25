'use strict';

// Recepten toevoegen via de plusknop: van een website (via de eigen server, die de
// pagina ophaalt) of door tekst te plakken, of handmatig. Een geïmporteerd recept
// opent eerst in het bewerkscherm, zodat je het kunt nakijken voordat je bewaart.
const Importer = (() => {

  /* ---------- Tekst opschonen ---------- */

  const decoder = document.createElement('textarea');
  function clean(v) {
    if (v == null) return '';
    let s = String(v);
    // HTML-tags weg (sommige sites zetten <p> in de tekst), entiteiten omzetten
    s = s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|div)>/gi, '\n').replace(/<[^>]+>/g, ' ');
    decoder.innerHTML = s;
    return decoder.value.replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  }
  const oneLine = v => clean(v).replace(/\n+/g, ' ');
  const capital = s => s ? s[0].toLocaleUpperCase('nl') + s.slice(1) : s;
  const list = v => v == null ? [] : Array.isArray(v) ? v : [v];

  // ISO 8601-duur (PT1H30M) naar minuten
  function minutes(v) {
    const m = String(v || '').match(/^P(?:(\d+)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:\d+(?:\.\d+)?S)?)?$/i);
    if (!m) return 0;
    return Math.round((+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0));
  }

  /* ---------- Recept uit de pagina halen (schema.org Recipe) ---------- */

  function findRecipe(blocks) {
    const out = [];
    const walk = o => {
      if (Array.isArray(o)) return o.forEach(walk);
      if (!o || typeof o !== 'object') return;
      if (list(o['@type']).some(t => String(t).toLowerCase() === 'recipe')) out.push(o);
      Object.values(o).forEach(v => { if (v && typeof v === 'object') walk(v); });
    };
    for (const b of blocks) {
      try { walk(JSON.parse(b)); } catch {
        // sommige sites zetten ongeldige tekens in de JSON; nog één poging na opschonen
        try { walk(JSON.parse(b.replace(/[\u0000-\u001f]+/g, ' '))); } catch { /* overslaan */ }
      }
    }
    return out[0] || null;
  }

  function firstImage(v) {
    for (const x of list(v)) {
      if (typeof x === 'string' && x) return x;
      if (x && typeof x === 'object' && (x.url || x.contentUrl)) return x.url || x.contentUrl;
    }
    return '';
  }

  function steps(v) {
    const lines = [];
    const add = x => {
      if (x == null) return;
      if (typeof x === 'string') { clean(x).split('\n').filter(Boolean).forEach(l => lines.push(l)); return; }
      if (Array.isArray(x)) return x.forEach(add);
      const type = list(x['@type']).map(String).join(' ');
      if (/HowToSection/i.test(type)) {
        if (x.name) lines.push('# ' + oneLine(x.name));
        return add(x.itemListElement);
      }
      if (/ItemList/i.test(type) && x.itemListElement) return add(x.itemListElement);
      const t = x.text || x.name || x.description;
      if (t) add(String(t));
    };
    add(v);
    // stapnummers die sommige sites zelf al in de tekst zetten weghalen
    return lines.map(l => l.startsWith('#') ? l : l.replace(/^(stap\s*)?\d+[.):]\s+/i, '')).filter(Boolean);
  }

  function fromRecipe(r, page) {
    const yieldText = list(r.recipeYield).map(String).join(' ');
    const servings = parseInt((yieldText.match(/\d+/) || [])[0], 10) || 0;
    let prep = minutes(r.prepTime), cook = minutes(r.cookTime);
    const total = minutes(r.totalTime);
    if (!prep && !cook && total) prep = total;
    let cats = list(r.recipeCategory).flatMap(c => String(c).split(',')).map(c => capital(oneLine(c))).filter(Boolean);
    // Gang herkennen (hoofdgerecht, dessert…) uit categorie en trefwoorden, en uit de categorieën halen
    const COURSE_WORDS = { voorgerechten: 'Voorgerecht', starter: 'Voorgerecht', tussengerechten: 'Tussengerecht',
      hoofdgerechten: 'Hoofdgerecht', 'main course': 'Hoofdgerecht', nagerechten: 'Nagerecht', dessert: 'Nagerecht',
      desserts: 'Nagerecht', breakfast: 'Ontbijt', lunchgerecht: 'Lunch', brunch: 'Ontbijt' };
    // eigen gangen uit de instellingen, plus een paar synoniemen
    const courseOf = w => {
      const t = String(w).trim().toLowerCase();
      const name = courseList().find(c => c.toLowerCase() === t) || COURSE_WORDS[t];
      return name && courseList().includes(name) ? name : null;
    };
    const kw = list(r.keywords).flatMap(k => String(k).split(','));
    const courses = [...new Set([...cats, ...kw].map(courseOf).filter(Boolean))];
    cats = cats.filter(c => !courseOf(c));
    const tags = list(r.keywords).flatMap(k => String(k).split(',')).map(k => oneLine(k).toLowerCase()).filter(Boolean).slice(0, 8);
    // Vegetarisch/vegan: van de site zelf (suitableForDiet), of uit categorieën/trefwoorden
    const dietList = list(r.suitableForDiet).map(String).join(' ');
    const fromWords = dietFromWords({ categories: cats, tags });
    const diet = /VeganDiet/i.test(dietList) ? 'vegan' : /VegetarianDiet/i.test(dietList) ? 'vegetarisch' : (fromWords ? fromWords.diet : '');
    if (fromWords) cats = fromWords.categories;
    return {
      title: capital(oneLine(r.name) || oneLine(page.og['og:title']) || page.title),
      description: oneLine(r.description || page.og['og:description'] || ''),
      categories: [...new Set(cats)],
      courses,
      tags,
      diet,
      servings: servings || 4,
      prepTime: prep || '',
      cookTime: cook || '',
      ingredients: list(r.recipeIngredient || r.ingredients).map(oneLine).filter(Boolean).join('\n'),
      steps: steps(r.recipeInstructions).join('\n'),
      imageUrl: firstImage(r.image) || page.og['og:image'] || '',
    };
  }

  /* ---------- Geplakte tekst ---------- */

  const ING = /^(ingredi[eë]nt(en)?|benodigdheden|wat heb je nodig)\b[:\s]*$/i;
  const STEP = /^(bereiding(swijze)?|werkwijze|instructies|zo maak je het|aan de slag|stappen)\b[:\s]*$/i;

  function fromText(text) {
    const all = String(text).split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!all.length) return null;
    const ii = all.findIndex(l => ING.test(l));
    const si = all.findIndex(l => STEP.test(l));
    const bullet = l => l.replace(/^([•\-*–·▢☐□]|\d+[.)])\s*/, '');
    const servings = parseInt((all.join(' ').match(/(\d+)\s*(personen|persoon|porties|pers\.)/i) || [])[1], 10) || 4;
    let title = all[0], ingredients = [], stepLines = [], description = '';
    if (ii >= 0 && si > ii) {
      ingredients = all.slice(ii + 1, si).map(bullet);
      stepLines = all.slice(si + 1).map(l => l.replace(/^(stap\s*)?\d+[.):]?\s+/i, ''));
      description = all.slice(1, ii).filter(l => !/personen|porties|min(uten)?\b/i.test(l)).join(' ');
    } else if (si >= 0) {
      stepLines = all.slice(si + 1);
      ingredients = all.slice(1, si).map(bullet);
    } else {
      stepLines = all.slice(1);
    }
    return {
      title: capital(title), description, categories: [], tags: [], servings, prepTime: '', cookTime: '',
      ingredients: ingredients.join('\n'), steps: stepLines.join('\n'), imageUrl: '',
      foundSections: ii >= 0 || si >= 0,
    };
  }

  /* ---------- Ophalen via de eigen server ---------- */

  const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
  // Mislukte import doorgeven aan de server (de beheerder ziet per site wat er misgaat); stil als dat niet lukt
  const reportFail = (url, reason, status = 0) => {
    const site = hostOf(/^https?:\/\//i.test(url) ? url : 'https://' + url);
    if (site) Sync.call('import_fail', { site, url, reason, status }).catch(() => {});
  };

  async function importUrl(url, status) {
    url = url.trim();
    if (!url) throw new Error('Plak eerst een adres.');
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const existing = state.recipes.find(r => r.source && r.source.replace(/\/$/, '') === url.replace(/\/$/, ''));
    if (existing) return { duplicate: existing };

    status('Pagina ophalen…');
    const page = await Sync.call('fetch', { url });
    const site = hostOf(page.url || url);
    if (page.blocked || [401, 403, 405, 429].includes(page.status)) { reportFail(page.url || url, 'blocked', page.status); return { blocked: site }; }
    if (page.status >= 400) { reportFail(page.url || url, 'http', page.status); throw new Error(`De pagina gaf een foutmelding (${page.status}). Klopt het adres?`); }

    const recipe = findRecipe(page.jsonld || []);
    if (!recipe) { reportFail(page.url || url, 'norecipe', page.status); return { noRecipe: site }; }
    const draft = fromRecipe(recipe, page);
    draft.source = page.url || url;

    if (draft.imageUrl) {
      status('Foto ophalen…');
      try {
        const img = await Sync.call('image', { url: new URL(draft.imageUrl, draft.source).href });
        draft.photo = await resizeImage(img.data);
      } catch { /* zonder foto verder */ }
    }
    return { draft };
  }

  /* ---------- Venster bij de plusknop ---------- */

  function openSheet(opts = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.innerHTML = `
      <div class="sheet add-sheet" role="dialog" aria-label="Recept toevoegen">
        <div class="sheet-head">
          <h3>Recept toevoegen</h3>
          <button class="text-btn" data-close>Sluit</button>
        </div>

        <section class="add-part" id="partUrl">
          <h4>Van een website</h4>
          <form class="add-row" id="urlForm" autocomplete="off">
            <input type="url" name="url" inputmode="url" placeholder="Plak het adres van het recept" autocapitalize="off" autocorrect="off">
            <button type="button" class="btn ghost small" id="pasteBtn">Plak</button>
          </form>
          <button class="btn" id="fetchBtn">Recept ophalen</button>
          <p class="add-msg" id="addMsg" hidden></p>
        </section>

        <section class="add-part" id="partText" hidden>
          <h4>Tekst plakken</h4>
          <p class="add-help">Open het recept in Safari, selecteer de hele tekst (naam, ingrediënten en bereiding) en kies <strong>Kopieer</strong>. Plak hem hieronder.</p>
          <textarea id="pasteText" rows="7" placeholder="Plak hier de recepttekst"></textarea>
          <button class="btn" id="textBtn">Recept maken van tekst</button>
        </section>

        <div class="add-or"><span>of</span></div>
        <div class="add-alt">
          <button class="btn ghost" id="manualBtn">Zelf invullen</button>
          <button class="link" id="showText">Recepttekst plakken</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('open'));

    const $$ = s => wrap.querySelector(s);
    const close = () => { wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 200); };
    const msg = (text, kind = '') => { const m = $$('#addMsg'); m.hidden = !text; m.className = 'add-msg ' + kind; m.innerHTML = text; };
    const busy = on => { $$('#fetchBtn').disabled = on; $$('#fetchBtn').textContent = on ? 'Bezig…' : 'Recept ophalen'; };
    const showText = () => { $$('#partText').hidden = false; $$('#showText').hidden = true; $$('#pasteText').focus(); };
    const openDraft = draft => {
      delete draft.imageUrl; delete draft.foundSections;
      state.draft = draft;
      close();
      location.hash = '#/new';
    };

    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('[data-close]')) close(); });
    if (opts.url) $$('[name=url]').value = opts.url;
    if (opts.message) { msg(opts.message, 'warn'); showText(); }
    $$('#manualBtn').onclick = () => { close(); location.hash = '#/new'; };
    $$('#showText').onclick = showText;

    $$('#pasteBtn').onclick = async () => {
      try { $$('[name=url]').value = (await navigator.clipboard.readText()).trim(); } catch { $$('[name=url]').focus(); }
    };

    const go = async () => {
      busy(true); msg('');
      try {
        const res = await importUrl($$('[name=url]').value, t => msg(t));
        if (res.duplicate) {
          msg(`Dit recept staat er al: <a href="#/r/${esc(res.duplicate.id)}">${esc(res.duplicate.title)}</a>.`, 'warn');
          wrap.querySelector('.add-msg a').onclick = close;
        } else if (res.blocked) {
          msg(`<strong>${esc(res.blocked)}</strong> laat automatisch ophalen niet toe. Plak de recepttekst hieronder.`, 'warn');
          showText();
        } else if (res.noRecipe) {
          msg(`Op deze pagina van <strong>${esc(res.noRecipe)}</strong> staat geen recept dat de app kan lezen. Plak de recepttekst hieronder.`, 'warn');
          showText();
        } else {
          openDraft(res.draft);
        }
      } catch (e) {
        const u = $$('[name=url]').value.trim();
        if (!/foutmelding \(\d+\)|Plak eerst|Log eerst/.test(e.message) && /\S+\.\S+/.test(u)) reportFail(u, 'error');
        msg(esc(e.message), 'bad');
      } finally {
        busy(false);
      }
    };
    $$('#fetchBtn').onclick = go;
    $$('#urlForm').addEventListener('submit', e => { e.preventDefault(); go(); });

    $$('#textBtn').onclick = () => {
      const draft = fromText($$('#pasteText').value);
      if (!draft) { $$('#pasteText').focus(); return; }
      if (!draft.foundSections) toast('Geen kopjes gevonden: controleer ingrediënten en bereiding');
      openDraft(draft);
    };
  }

  /* ---------- Postvak: recepten die vanuit Safari zijn gedeeld ---------- */

  // Code voor de opdracht 'Ricetta importeren' (taak 'Voer JavaScript uit op webpagina').
  // Leest het recept uit de pagina die al in Safari geladen is.
  const SHARE_JS = `var d={url:location.href,title:document.title,jsonld:[],og:{},text:''};` +
    `document.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){d.jsonld.push(s.textContent)});` +
    `['og:title','og:image','og:description'].forEach(function(k){var m=document.querySelector('meta[property="'+k+'"],meta[name="'+k+'"]');if(m)d.og[k]=m.content});` +
    `d.text=(document.body.innerText||'').slice(0,30000);completion(JSON.stringify(d));`;

  let inbox = [];

  let lastCheck = 0;
  async function checkInbox({ maxAge = 0 } = {}) {
    if (Sync.status().state !== 'on') { inbox = []; renderBanner(); return inbox; }
    if (maxAge && Date.now() - lastCheck < maxAge) { renderBanner(); return inbox; }
    lastCheck = Date.now();
    try { inbox = await Sync.call('inbox_list'); } catch { /* volgende keer opnieuw */ }
    renderBanner();
    return inbox;
  }

  // Melding bovenaan het overzicht
  function renderBanner() {
    const el = document.getElementById('inboxBanner');
    if (!el) return;
    el.hidden = !inbox.length;
    if (!inbox.length) return;
    const first = inbox[0].data || {};
    if (first.kind === 'recipe') {   // recept van een andere gebruiker
      el.innerHTML = `
        <div class="acc-avatar inbox-av" aria-hidden="true">${esc((first.from?.name || '?').charAt(0).toUpperCase())}</div>
        <div class="inbox-text"><strong>${esc(first.from?.name || 'Iemand')} stuurde je een recept${inbox.length > 1 ? ` <span class="req-count">+${inbox.length - 1}</span>` : ''}</strong>
          <small>${esc(oneLine(first.title || ''))}${first.message ? ` · “${esc(first.message)}”` : ''}</small></div>
        <a class="btn small" href="#/ontvangen/${inbox[0].id}">Bekijken</a>`;
      return;
    }
    el.innerHTML = `
      <div class="inbox-text"><strong>${inbox.length} ${inbox.length === 1 ? 'recept' : 'recepten'} gedeeld</strong>
        <small>${esc(oneLine(first.title || '').slice(0, 60))}</small></div>
      <button class="btn small" id="inboxOpen">Bekijken</button>
      <button class="inbox-del" id="inboxDel" aria-label="Weggooien">×</button>`;
    el.querySelector('#inboxOpen').onclick = () => openInboxItem(inbox[0]);
    el.querySelector('#inboxDel').onclick = async () => {
      if (!confirm(`"${oneLine(first.title || 'Dit recept')}" uit het postvak weggooien?`)) return;
      await Sync.call('inbox_delete', { id: inbox[0].id }).catch(() => {});
      inbox.shift(); renderBanner();
    };
  }

  async function openInboxItem(item) {
    const page = item.data || {};
    const btn = document.getElementById('inboxOpen');
    if (btn) { btn.disabled = true; btn.textContent = 'Bezig…'; }
    try {
      const same = state.recipes.find(r => r.source && r.source.replace(/\/$/, '') === String(page.url).replace(/\/$/, ''));
      if (same && !confirm(`"${same.title}" staat er al. Toch nog een keer toevoegen?`)) {
        await Sync.call('inbox_delete', { id: item.id }).catch(() => {});
        inbox = inbox.filter(x => x !== item); renderBanner();
        return;
      }
      const site = hostOf(page.url);
      // Alleen een adres, of een pagina die de iPhone niet mocht ophalen: via de server proberen
      if (page.blocked || (!page.jsonld && !page.text)) {
        let fetched = null;
        try { fetched = await Sync.call('fetch', { url: page.url }); } catch { /* geen verbinding */ }
        if (fetched && !fetched.blocked && fetched.status < 400 && findRecipe(fetched.jsonld || [])) {
          Object.assign(page, { jsonld: fetched.jsonld, og: fetched.og, title: fetched.title, text: '' });
        } else {
          reportFail(page.url, 'iphone');
          await Sync.call('inbox_delete', { id: item.id }).catch(() => {});
          inbox = inbox.filter(x => x !== item); renderBanner();
          openSheet({ url: page.url, message: `<strong>${esc(site)}</strong> laat automatisch ophalen niet toe. Open het recept, kopieer de tekst en plak hem hieronder.` });
          return;
        }
      }
      const recipe = findRecipe(page.jsonld || []);
      let draft;
      if (recipe) {
        draft = fromRecipe(recipe, { og: page.og || {}, title: page.title || '' });
      } else {
        // Geen receptgegevens op de pagina: de tekst van de pagina proberen
        draft = fromText(page.text || page.title || '') || { title: page.title || '' };
        toast('Geen receptgegevens gevonden: controleer naam, ingrediënten en bereiding');
        draft.imageUrl = (page.og || {})['og:image'] || '';
      }
      draft.source = page.url;
      if (draft.imageUrl) {
        try {
          const img = await Sync.call('image', { url: new URL(draft.imageUrl, page.url).href });
          draft.photo = await resizeImage(img.data);
        } catch { /* zonder foto verder */ }
      }
      delete draft.imageUrl; delete draft.foundSections;
      draft._inboxId = item.id;   // wordt na 'Bewaar' uit het postvak gehaald
      state.draft = draft;
      location.hash = '#/new';
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Bekijken'; }
    }
  }

  async function doneInbox(id) {
    await Sync.call('inbox_delete', { id }).catch(() => {});
    inbox = inbox.filter(x => x.id !== id);
  }

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkInbox(); });

  const inboxItem = id => inbox.find(x => x.id === id);
  async function dropInbox(id) {
    await Sync.call('inbox_delete', { id }).catch(() => {});
    inbox = inbox.filter(x => x.id !== id);
    renderBanner();
  }

  return { openSheet, fromText, findRecipe, fromRecipe, minutes, checkInbox, renderBanner, doneInbox, inboxItem, dropInbox, SHARE_JS };
})();
