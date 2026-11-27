'use strict';

// Boodschappenlijst. Wordt als één apart record ('__shopping') in de receptenopslag
// bewaard, zodat hij automatisch meegaat met de online back-up.
const Shopping = (() => {
  const ID = '__shopping';
  let list = { id: ID, items: [] };

  async function load() {
    const r = await DB.get(ID);
    list = r && Array.isArray(r.items) ? r : { id: ID, items: [] };
    updateBadge();
    return list;
  }
  async function save() {
    await DB.put(list);   // DB.put zet de tijdstempel en start de back-up
    updateBadge();
  }
  const open = () => list.items.filter(i => !i.checked).length;

  /* ---------- Ingrediëntregel ontleden ---------- */

  const UNITS = [
    ['g', /^(g|gr|gram|grammen)\b\.?/i], ['kg', /^(kg|kilo|kilogram)\b\.?/i], ['mg', /^mg\b/i],
    ['ml', /^(ml|milliliter)\b\.?/i], ['cl', /^cl\b\.?/i], ['dl', /^(dl|deciliter)\b\.?/i], ['l', /^(l|ltr|liter)\b\.?/i],
    ['el', /^(el|eetl|eetlepels?)\b\.?/i], ['tl', /^(tl|theel|theelepels?)\b\.?/i],
    ['stuks', /^(stuks?|st)\b\.?/i], ['teentjes', /^(teentjes?|tenen|teen)\b/i], ['blik', /^(blikjes?|blik)\b/i],
    ['zakje', /^(zakjes?|zak)\b/i], ['bosje', /^(bosjes?|bos)\b/i], ['plakjes', /^plakjes?\b/i], ['snufje', /^(snufje|snuf)\b/i],
    ['pak', /^(pakken|pakjes?|pak)\b/i], ['pot', /^(potjes?|pot)\b/i], ['takjes', /^takjes?\b/i], ['handje', /^(handje|handvol)\b/i],
    ['kopje', /^(kopjes?|kop)\b/i], ['scheutje', /^scheutje\b/i], ['bakje', /^bakjes?\b/i],
  ];

  function parse(line) {
    let text = String(line).replace(/\s+/g, ' ').trim();
    let qty = null, unit = '';
    const m = text.match(QTY_RE);
    if (m) {
      const n = parseNum(m[2] || m[1]);   // bij "2-3" de bovenste waarde, dan heb je genoeg
      if (!isNaN(n)) { qty = n; text = text.slice(m[0].length).trim(); }
    }
    for (const [u, re] of UNITS) {
      const um = text.match(re);
      if (um) { unit = u; text = text.slice(um[0].length).trim(); break; }
    }
    // gewichten en inhoud in één eenheid, zodat 500 g en 1 kg bij elkaar opgeteld worden
    const toBase = { kg: ['g', 1000], mg: ['g', 0.001], l: ['ml', 1000], dl: ['ml', 100], cl: ['ml', 10] };
    if (toBase[unit]) { if (qty != null) qty *= toBase[unit][1]; unit = toBase[unit][0]; }
    // toelichting weglaten: "(fijngehakt)", ", in blokjes"
    const name = text.replace(/\s*\([^)]*\)?/g, '').replace(/\s*,.*$/, '').trim() || text;
    return { qty, unit, name };
  }

  const keyOf = (name, unit) => name.toLowerCase().replace(/[^a-z0-9à-ÿ ]/gi, '').trim() + '|' + unit;

  function fmtQty(q, unit) {
    if (q == null) return '';
    if (['g', 'ml', 'mg'].includes(unit) && q >= 10) return String(Math.round(q));
    return formatNum(q);
  }
  // 1250 ml wordt 1,25 l en 1500 g wordt 1,5 kg
  function amount(i) {
    let q = i.qty, u = i.unit;
    if (q != null && u === 'g' && q >= 1000) { q /= 1000; u = 'kg'; }
    else if (q != null && u === 'ml' && q >= 1000) { q /= 1000; u = 'l'; }
    // per stuk (eieren, blikken, pakken…) naar boven afronden: 4½ ei wordt 5 eieren
    if (q != null && !['g', 'ml', 'kg', 'l', 'el', 'tl'].includes(u)) q = Math.max(1, Math.ceil(q - 0.01));
    const qs = q == null ? '' : (['kg', 'l'].includes(u) ? String(Math.round(q * 100) / 100).replace('.', ',') : fmtQty(q, u));
    return [qs, u].filter(Boolean).join(' ');
  }
  const label = i => [amount(i), i.name].filter(Boolean).join(' ');

  // Voegt toe of telt op bij een bestaande, nog niet afgevinkte boodschap
  function addOne(line, factor = 1, from = '') {
    const p = parse(line);
    if (!p.name) return;
    if (p.qty != null) p.qty *= factor;
    const key = keyOf(p.name, p.unit);
    const same = list.items.find(i => !i.checked && keyOf(i.name, i.unit) === key);
    if (same) {
      if (same.qty != null && p.qty != null) same.qty += p.qty;
      else if (same.qty == null && p.qty != null) same.qty = p.qty;
      if (from && !same.from.includes(from)) same.from.push(from);
    } else {
      list.items.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...p, checked: false, from: from ? [from] : [] });
    }
  }

  async function addFromRecipe(lines, factor, title) {
    await load();
    lines.forEach(l => addOne(l, factor, title));
    await save();
  }

  /* ---------- Emoji bij een artikel (alleen als de naam precies bekend is) ---------- */

  const EMOJI_LIST = {
    '🧅': 'ui, uien, rode ui, rode uien, gele ui, gele uien, zilveruitjes, sjalot, sjalotten, sjalotjes',
    '🧄': 'knoflook, knoflookteen, knoflookteentjes',
    '🥕': 'wortel, wortels, wortelen, winterpeen, peen, bospeen',
    '🥔': 'aardappel, aardappels, aardappelen, kruimige aardappels, vastkokende aardappels, krieltjes',
    '🍠': 'zoete aardappel, zoete aardappels, zoete aardappelen',
    '🍅': 'tomaat, tomaten, trostomaten, cherrytomaten, kerstomaatjes, snoeptomaten, romatomaten',
    '🥒': 'komkommer, komkommers, augurk, augurken',
    '🥬': 'sla, ijsbergsla, rucola, spinazie, bladspinazie, andijvie, paksoi, veldsla, kropsla',
    '🥦': 'broccoli',
    '🫑': 'paprika, paprika\'s, rode paprika, groene paprika, gele paprika',
    '🌶️': 'rode peper, rode pepers, chilipeper, chilipepers',
    '🍆': 'aubergine, aubergines',
    '🥑': 'avocado, avocado\'s',
    '🌽': 'mais, maïs, maiskolf, maiskolven',
    '🍄': 'champignon, champignons, kastanjechampignons, paddenstoelen',
    '🫛': 'doperwten, erwten, peultjes, sugarsnaps',
    '🫘': 'bonen, kidneybonen, witte bonen, bruine bonen, zwarte bonen, kikkererwten, linzen',
    '🫚': 'gember, verse gember',
    '🍋': 'citroen, citroenen, limoen, limoenen',
    '🍉': 'watermeloen',
    '🍈': 'meloen',
    '🍊': 'sinaasappel, sinaasappels, mandarijn, mandarijnen',
    '🍎': 'appel, appels',
    '🍐': 'peer, peren',
    '🍌': 'banaan, bananen',
    '🍇': 'druiven',
    '🍓': 'aardbei, aardbeien',
    '🫐': 'blauwe bessen, bosbessen',
    '🍒': 'kersen',
    '🍑': 'perzik, perziken',
    '🥭': 'mango, mango\'s',
    '🍍': 'ananas',
    '🥝': 'kiwi, kiwi\'s',
    '🥥': 'kokosmelk, kokosnoot',
    '🌿': 'basilicum, verse basilicum, peterselie, verse peterselie, platte peterselie, koriander, verse koriander, bieslook, dille, munt, verse munt, tijm, verse tijm, rozemarijn, salie, oregano, dragon',
    '🥚': 'ei, eieren',
    '🥛': 'melk, volle melk, halfvolle melk, magere melk, karnemelk',
    '🧈': 'boter, roomboter, ongezouten boter',
    '🧀': 'kaas, geraspte kaas, oude kaas, jonge kaas, belegen kaas, parmezaanse kaas, parmezaan, parmigiano reggiano, grana padano, pecorino, mozzarella, gruyère, gruyere, feta, geitenkaas, brie, ricotta, mascarpone',
    '🥩': 'biefstuk, steak, runderlappen, riblappen, sukadelappen, rundvlees',
    '🍖': 'gehakt, rundergehakt, half-om-halfgehakt, varkensgehakt',
    '🥓': 'spek, spekjes, ontbijtspek, pancetta, guanciale, bacon',
    '🍗': 'kip, kipfilet, kippendijen, kippendijfilet, kippenpoten, drumsticks',
    '🌭': 'worst, worstjes, rookworst, saucijzen',
    '🐟': 'vis, zalm, zalmfilet, kabeljauw, kabeljauwfilet, tonijn, makreel',
    '🦐': 'garnalen, gamba\'s',
    '🍞': 'brood, volkorenbrood, witbrood, ciabatta',
    '🥖': 'stokbrood, baguette',
    '🥐': 'croissant, croissants',
    '🍝': 'pasta, spaghetti, penne, tagliatelle, macaroni, fusilli, linguine, lasagnebladen',
    '🍚': 'rijst, basmatirijst, risottorijst, zilvervliesrijst, pandanrijst',
    '🌾': 'bloem, tarwebloem, patentbloem, zelfrijzend bakmeel',
    '🧂': 'zout, zeezout',
    '🍬': 'suiker, kristalsuiker, basterdsuiker, poedersuiker',
    '🍯': 'honing',
    '🫒': 'olijfolie, olijven',
    '🍷': 'wijn, rode wijn, witte wijn',
    '🍺': 'bier',
    '☕': 'koffie',
    '🍵': 'thee',
    '🧃': 'sinaasappelsap, appelsap',
    '🍫': 'chocolade, pure chocolade, melkchocolade, cacaopoeder',
    '🥜': 'pinda\'s, pindakaas',
    '🌰': 'noten, walnoten, hazelnoten, amandelen, cashewnoten, pijnboompitten',
    '🍪': 'koekjes',
    '🥫': 'tomatenpuree, passata, gepelde tomaten, tomatenblokjes',
    '🧻': 'wc-papier, toiletpapier, keukenpapier, keukenrol',
  };
  const EMOJI = new Map();
  Object.entries(EMOJI_LIST).forEach(([emo, names]) => names.split(',').forEach(n => EMOJI.set(n.trim(), emo)));
  const emojiOf = name => EMOJI.get(String(name).toLowerCase().replace(/\s+/g, ' ').trim()) || '';

  /* ---------- Badge op het mandje ---------- */

  function updateBadge() {
    const n = open();
    document.querySelectorAll('.cart-badge').forEach(b => { b.textContent = n; b.hidden = !n; });
  }

  /* ---------- Scherm ---------- */

  let moveTimer = null;
  async function render(view) {
    clearTimeout(moveTimer);
    await load();
    if (location.hash !== '#/boodschappen') return;   // intussen naar een ander scherm gegaan
    const draw = () => {
      const todo = list.items.filter(i => !i.checked);
      const done = list.items.filter(i => i.checked);
      const row = i => `
        <li class="shop-item${i.checked ? ' done' : ''}" data-id="${esc(i.id)}">
          <span class="check"></span>
          ${emojiOf(i.name) ? `<span class="shop-emo" aria-hidden="true">${emojiOf(i.name)}</span>` : ''}
          <span class="shop-text">${amount(i) ? `<b>${esc(amount(i))}</b> ` : ''}<span class="shop-name">${esc(i.name)}</span>${i.from.length ? `<small>voor ${esc(i.from.join(', '))}</small>` : ''}</span>
          <button class="shop-del" aria-label="Verwijderen">×</button>
        </li>`;
      view.innerHTML = `
        <section class="shop">
          <h2 class="page-title">Boodschappen</h2>
          <form class="shop-add" id="shopAdd" autocomplete="off">
            <input name="item" placeholder="Voeg toe, bijv. 2 pakken melk" enterkeyhint="done" autocapitalize="sentences">
            <button class="btn small" aria-label="Toevoegen">+</button>
          </form>
          ${list.items.length ? '' : `<div class="empty"><h2>Nog niets nodig</h2><p>Voeg boodschappen toe, of tik in een recept op <strong>Op boodschappenlijst</strong>.</p></div>`}
          ${todo.length ? `<ul class="shop-list">${todo.map(row).join('')}</ul>` : ''}
          ${done.length ? `
            <div class="shop-done-head"><h3>In je mandje (${done.length})</h3><button class="link" id="clearDone">Wissen</button></div>
            <ul class="shop-list">${done.map(row).join('')}</ul>` : ''}
          ${list.items.length ? `
            <div class="shop-actions">
              <button class="btn ghost" id="shareList">${ICONS.share} Lijst delen</button>
              <button class="link danger" id="clearAll">Hele lijst leegmaken</button>
            </div>` : ''}
        </section>`;

      const input = view.querySelector('[name=item]');
      view.querySelector('#shopAdd').onsubmit = async e => {
        e.preventDefault();
        const v = input.value.trim();
        if (!v) return;
        v.split(/\n|;/).forEach(l => addOne(l));
        await save(); draw();
        view.querySelector('[name=item]').focus();
      };
      view.querySelectorAll('.shop-item').forEach(li => {
        const item = list.items.find(i => i.id === li.dataset.id);
        li.onclick = async e => {
          if (e.target.closest('.shop-del')) {
            list.items = list.items.filter(i => i !== item);
            clearTimeout(moveTimer);
            await save(); draw();
            return;
          }
          // Eerst op zijn plek (door)strepen, zodat je ziet wat je hebt afgestreept;
          // pas na een korte pauze schuift alles naar de juiste plek. Elke tik geeft weer even uitstel.
          item.checked = !item.checked;
          li.classList.toggle('done', item.checked);
          li.classList.add('just');
          await save();
          clearTimeout(moveTimer);
          moveTimer = setTimeout(() => { if (view.isConnected && location.hash === '#/boodschappen') draw(); }, 2500);
        };
      });
      const on = (sel, fn) => { const el = view.querySelector(sel); if (el) el.onclick = fn; };
      on('#clearDone', async () => { list.items = list.items.filter(i => !i.checked); await save(); draw(); });
      on('#clearAll', async () => {
        if (!confirm('Hele boodschappenlijst leegmaken?')) return;
        list.items = []; await save(); draw();
      });
      on('#shareList', async () => {
        const text = 'Boodschappen\n' + list.items.filter(i => !i.checked).map(i => '• ' + label(i)).join('\n');
        if (navigator.share) { try { await navigator.share({ title: 'Boodschappen', text }); } catch { /* geannuleerd */ } }
        else { await navigator.clipboard.writeText(text); toast('Lijst gekopieerd'); }
      });
    };
    draw();
  }

  return { load, render, addFromRecipe, updateBadge, parse, ID };
})();
