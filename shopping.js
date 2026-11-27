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
    // Fruit
    '🍇': 'druiven, witte druiven, blauwe druiven, rode druiven, pitloze druiven, tros druiven',
    '🍈': 'meloen, meloenen, galiameloen, honingmeloen, cantaloupe, cantaloupemeloen',
    '🍉': 'watermeloen, watermeloenen',
    '🍊': 'sinaasappel, sinaasappels, handsinaasappels, perssinaasappels, mandarijn, mandarijnen, clementine, clementines, bloedsinaasappel, bloedsinaasappels, grapefruit, grapefruits, roze grapefruit',
    '🍋': 'citroen, citroenen',
    '🍋‍🟩': 'limoen, limoenen',
    '🍌': 'banaan, bananen',
    '🍍': 'ananas',
    '🥭': 'mango, mango\'s',
    '🍎': 'appel, appels, rode appel, rode appels, elstar, jonagold, goudrenet, goudreinetten, pink lady, gele appel, gele appels',
    '🍏': 'groene appel, groene appels, granny smith',
    '🍐': 'peer, peren, stoofpeer, stoofperen, handpeer, handperen, conference',
    '🍑': 'perzik, perziken, nectarine, nectarines',
    '🍒': 'kers, kersen',
    '🍓': 'aardbei, aardbeien',
    '🫐': 'blauwe bessen, bosbessen, rode bessen, aalbessen, zwarte bessen, witte bessen',
    '🥝': 'kiwi, kiwi\'s, gele kiwi, gele kiwi\'s',
    '🥥': 'kokosnoot, kokosnoten, kokos',
    // Groente
    '🍅': 'tomaat, tomaten, trostomaat, trostomaten, cherrytomaat, cherrytomaten, kerstomaat, kerstomaten, kerstomaatjes, snoeptomaat, snoeptomaten, snoeptomaatjes, romatomaat, romatomaten, vleestomaat, vleestomaten, gele tomaten, groene tomaten, zwarte tomaten',
    '🫒': 'olijf, olijven, groene olijven, zwarte olijven, kalamata olijven',
    '🥑': 'avocado, avocado\'s',
    '🍆': 'aubergine, aubergines, witte aubergine',
    '🥔': 'aardappel, aardappels, aardappelen, kruimige aardappels, kruimige aardappelen, vastkokende aardappels, vastkokende aardappelen, krieltjes, nieuwe aardappels, rode aardappelen, paarse aardappelen, roseval',
    '🥕': 'wortel, wortels, wortelen, worteltjes, winterpeen, winterpenen, peen, bospeen, bospenen, paarse wortel, paarse wortels, gele wortel, gele wortels, regenboogwortels',
    '🌽': 'mais, maïs, maiskolf, maiskolven',
    '🌶️': 'rode peper, rode pepers, groene peper, groene pepers, chilipeper, chilipepers, spaanse peper, spaanse pepers, gele peper, gele pepers, jalapeño, jalapeños',
    '🫑': 'paprika, paprika\'s, rode paprika, rode paprika\'s, groene paprika, groene paprika\'s, gele paprika, gele paprika\'s, oranje paprika, puntpaprika, puntpaprika\'s',
    '🥒': 'komkommer, komkommers, augurk, augurken',
    '🥬': 'sla, krop sla, kropsla, ijsbergsla, romaine, romaine sla, little gem, eikenbladsla, veldsla, spinazie, bladspinazie, babyspinazie, andijvie, paksoi, boerenkool, snijbiet',
    '🥦': 'broccoli, broccolini, bimi, bloemkool, romanesco, paarse bloemkool',
    '🧄': 'knoflook, knoflookteen, knoflookteentjes, teentje knoflook, teentjes knoflook, bol knoflook',
    '🧅': 'ui, uien, uitje, uitjes, rode ui, rode uien, gele ui, gele uien, witte ui, witte uien, zilveruitjes, sjalot, sjalotten, sjalotje, sjalotjes',
    '🍄': 'champignon, champignons, witte champignons, kastanjechampignon, kastanjechampignons, paddenstoelen, paddestoelen',
    '🍄‍🟫': 'bruine champignons',
    '🥜': 'pinda, pinda\'s, ongezouten pinda\'s, gezouten pinda\'s',
    '🫘': 'bonen, kidneybonen, witte bonen, bruine bonen, zwarte bonen',
    '🌰': 'kastanje, kastanjes, tamme kastanjes',
    '🫚': 'gember, verse gember, gemberwortel',
    '🫛': 'doperwten, erwten, erwtjes, peultjes, sugarsnaps, edamame',
    '🫜': 'rode biet, rode bieten, biet, bieten, bietjes, radijs, radijsjes, raap, rapen, meiraapjes',
    '🍠': 'zoete aardappel, zoete aardappels, zoete aardappelen, bataat',
    '🌱': 'taugé, tauge, tuinkers, kiemgroente, alfalfa',
    '🌿': 'basilicum, verse basilicum, peterselie, verse peterselie, platte peterselie, koriander, verse koriander, bieslook, dille, munt, verse munt, tijm, verse tijm, rozemarijn, salie, oregano, dragon, kervel',
    // Brood en bereide gerechten
    '🍞': 'brood, volkorenbrood, witbrood, bruinbrood, casinobrood, tijgerbrood, desembrood',
    '🥐': 'croissant, croissants',
    '🥖': 'stokbrood, stokbroden, baguette, baguettes',
    '🫓': 'pita, pitabrood, pitabroodjes, naan, naanbrood, platbrood, flatbread',
    '🥨': 'pretzel, pretzels',
    '🥯': 'bagel, bagels',
    '🥞': 'pannenkoek, pannenkoeken, pancakes',
    '🧇': 'wafel, wafels, luikse wafels',
    '🧀': 'kaas, geraspte kaas, oude kaas, jonge kaas, belegen kaas, parmezaanse kaas, parmezaan, parmigiano reggiano, grana padano, pecorino, mozzarella, buffelmozzarella, burrata, gruyère, gruyere, emmentaler, gouda, cheddar, feta, geitenkaas, brie, camembert, gorgonzola, roquefort, ricotta, mascarpone, halloumi',
    '🍖': 'spareribs, kotelet, koteletten, karbonade, karbonades, lamsbout, lamskoteletten',
    '🍗': 'kip, kipfilet, kippendijen, kippendijfilet, kippenpoten, kippenbouten, drumsticks, kipdrumsticks, kippenvleugels, hele kip',
    '🥩': 'biefstuk, biefstukken, steak, entrecote, ossenhaas, rib-eye, ribeye, runderlappen, riblappen, sukadelappen, rundvlees, varkenshaas',
    '🥓': 'spek, spekjes, ontbijtspek, bacon, pancetta, guanciale',
    '🍔': 'hamburger, hamburgers, burger, burgers',
    '🍟': 'patat, patatjes, friet, frietjes, patates frites',
    '🍕': 'pizza, pizza\'s, diepvriespizza',
    '🌭': 'hotdog, hotdogs, knakworst, knakworsten, knakworstjes',
    '🥪': 'sandwich, sandwiches, tosti, tosti\'s',
    '🌮': 'taco, taco\'s, tacoschelpen',
    '🌯': 'wrap, wraps, burrito, burrito\'s, tortilla, tortilla\'s',
    '🫔': 'tamale, tamales',
    '🥙': 'shoarma, döner, kebab, gyros',
    '🧆': 'falafel, falafels',
    '🥚': 'ei, eieren, scharreleieren, vrije-uitloopeieren',
    '🥘': 'paella',
    '🍲': 'soep, stoofpot',
    '🫕': 'fondue, kaasfondue',
    '🥣': 'muesli, cruesli, granola, cornflakes, ontbijtgranen, havermout',
    '🥗': 'salade, salades, gemengde salade',
    '🍿': 'popcorn, popcornmais',
    '🧈': 'boter, roomboter, ongezouten boter, gezouten boter',
    '🧂': 'zout, zeezout, keukenzout',
    '🥫': 'conserven, blikvoer',
    // Aziatisch
    '🍱': 'bento',
    '🍘': 'rijstcrackers, rijstwafels',
    '🍙': 'onigiri',
    '🍚': 'rijst, witte rijst, basmatirijst, jasmijnrijst, pandanrijst, zilvervliesrijst, risottorijst, sushirijst',
    '🍛': 'curry',
    '🍜': 'noedels, mie, mihoen, ramen, udon, eiernoedels, rijstnoedels',
    '🍝': 'pasta, spaghetti, penne, tagliatelle, macaroni, fusilli, linguine, farfalle, rigatoni, orecchiette, pappardelle, lasagnebladen, lasagnevellen',
    '🍢': 'saté, sateh, satéstokjes',
    '🍣': 'sushi',
    '🍤': 'tempura, gefrituurde garnalen',
    '🍥': 'kamaboko, viskoek',
    '🥮': 'maancake, maancakes',
    '🍡': 'dango, mochi',
    '🥟': 'dumpling, dumplings, gyoza, gyoza\'s, wontons',
    '🥠': 'gelukskoekjes',
    '🥡': 'afhaalchinees',
    // Vis en schaaldieren
    '🐟': 'vis, zalm, zalmfilet, kabeljauw, kabeljauwfilet, tonijn, makreel, forel, haring, pangasius, tilapia, zeebaars, dorade, schol, tong',
    '🦀': 'krab, krabben, krabvlees',
    '🦞': 'kreeft, kreeften',
    '🦐': 'garnalen, gamba, gamba\'s, scampi, hollandse garnalen, grote garnalen',
    '🦑': 'inktvis, inktvisringen, calamares, pijlinktvis',
    '🐙': 'octopus',
    '🦪': 'oester, oesters',
    // Zoet
    '🍦': 'softijs',
    '🍧': 'schaafijs',
    '🍨': 'ijs, roomijs, vanille-ijs, ijsje, ijsjes',
    '🍩': 'donut, donuts',
    '🍪': 'koekje, koekjes, cookie, cookies',
    '🎂': 'verjaardagstaart',
    '🍰': 'taart, taartje, taartjes, gebak, gebakjes, cheesecake',
    '🧁': 'cupcake, cupcakes, muffin, muffins',
    '🥧': 'pie, appeltaart, quiche',
    '🍫': 'chocolade, pure chocolade, melkchocolade, witte chocolade, chocoladereep, chocoladerepen, reep chocolade',
    '🍬': 'snoep, snoepjes, toffee, toffees',
    '🍭': 'lolly, lolly\'s',
    '🍮': 'pudding, vla, flan, crème brûlée',
    '🍯': 'honing',
    // Drinken
    '🍼': 'babymelk, flesvoeding',
    '🥛': 'melk, volle melk, halfvolle melk, magere melk, karnemelk',
    '☕': 'koffie, koffiebonen, gemalen koffie, espresso, koffiecups, koffiepads',
    '🫖': 'theepot',
    '🍵': 'thee, groene thee, zwarte thee, theezakjes, matcha',
    '🍶': 'sake',
    '🍾': 'champagne, cava, prosecco, mousserende wijn',
    '🍷': 'wijn, rode wijn, witte wijn, rosé',
    '🍸': 'martini, cocktail, cocktails',
    '🍹': 'tropische cocktail',
    '🍺': 'bier, biertje, biertjes, pils, speciaalbier',
    '🥃': 'whisky, whiskey, cognac, rum, gin, wodka',
    '🥤': 'frisdrank, cola, sinas, limonade, ice tea',
    '🧋': 'bubble tea',
    '🧃': 'sap, sapje, sapjes, sinaasappelsap, appelsap, jus d\'orange, pakjes drinken',
    '🧉': 'mate',
    '🧊': 'ijsblokjes, ijsklontjes',
    // Huishouden
    '🧻': 'wc-papier, toiletpapier, keukenpapier, keukenrol, keukenrollen',
  };
  const EMOJI = new Map();
  Object.entries(EMOJI_LIST).forEach(([emo, names]) => names.split(',').forEach(n => EMOJI.set(n.trim(), emo)));
  const emojiOf = name => EMOJI.get(String(name).toLowerCase().replace(/\s+/g, ' ').trim()) || '';

  /* ---------- Klantkaarten (streepjescode bij de kassa) ---------- */

  // De grootste supermarkten van Nederland, met hun huiskleur
  const STORES = [
    ['Albert Heijn', '#00A0E2'], ['Jumbo', '#FFC800'], ['Lidl', '#0050AA'], ['Plus', '#5EA51E'],
    ['Aldi', '#00205B'], ['Dirk', '#E30613'], ['Coop', '#F7941D'], ['Spar', '#007A3D'],
    ['Vomar', '#D7141A'], ['Hoogvliet', '#0066B3'], ['DekaMarkt', '#C4161C'], ['Poiesz', '#E2001A'],
  ];
  const DEFAULT_COLOR = '#2B1D16';
  const storeColor = name => (STORES.find(([n]) => n.toLowerCase() === String(name).trim().toLowerCase()) || [])[1] || '';
  const cards = () => (Array.isArray(list.cards) ? list.cards : (list.cards = []));
  const colorOf = c => c.color || storeColor(c.name) || DEFAULT_COLOR;
  // Donkere of lichte tekst, afhankelijk van hoe licht de kaartkleur is
  const inkOn = hex => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#fff';
    const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? '#1d1d1b' : '#fff';
  };
  const groupNum = n => String(n).replace(/\s+/g, '').replace(/(.{4})(?=.)/g, '$1 ');
  const LAST = 'ricetta-card-last';
  const lastCard = () => { try { return localStorage.getItem(LAST); } catch { return null; } };
  const rememberCard = id => { try { localStorage.setItem(LAST, id); } catch { /* geen opslag */ } };

  function railHtml() {
    const cs = cards();
    if (!cs.length) return `<button type="button" class="loyal-first" id="cardAdd">+ Klantkaart toevoegen</button>`;
    return `<div class="loyal-rail" id="cardRail">
        ${cs.map(c => `<div class="loyal" data-card="${esc(c.id)}" style="--c:${esc(colorOf(c))};--ink:${inkOn(colorOf(c))}">
          <div class="loyal-head"><b>${esc(c.name)}</b><button type="button" class="loyal-edit" data-edit="${esc(c.id)}" aria-label="${esc(c.name)} wijzigen">${ICONS.edit}</button></div>
          <div class="loyal-code">${Barcode.svg(c.number)}<span>${esc(groupNum(c.number))}</span></div>
        </div>`).join('')}
        <button type="button" class="loyal loyal-add" id="cardAdd" aria-label="Klantkaart toevoegen"><span>+</span>Kaart toevoegen</button>
      </div>
      ${cs.length > 1 ? `<div class="loyal-dots" aria-hidden="true">${cs.map(c => `<i data-dot="${esc(c.id)}"></i>`).join('')}</div>` : ''}`;
  }

  // Swipen tussen de kaarten; de laatst bekeken kaart wordt onthouden
  function bindRail(view, redraw) {
    const rail = view.querySelector('#cardRail');
    view.querySelector('#cardAdd')?.addEventListener('click', () => editCard(null, redraw));
    view.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editCard(cards().find(c => c.id === b.dataset.edit), redraw));
    if (!rail) return;
    const slides = [...rail.querySelectorAll('[data-card]')];
    const dots = [...view.querySelectorAll('[data-dot]')];
    const mark = id => dots.forEach(d => d.classList.toggle('on', d.dataset.dot === id));
    const current = () => {
      const mid = rail.scrollLeft + rail.clientWidth / 2;
      let best = slides[0], dist = Infinity;
      slides.forEach(sl => { const d = Math.abs(sl.offsetLeft + sl.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = sl; } });
      return best;
    };
    const want = slides.find(sl => sl.dataset.card === lastCard()) || slides[0];
    rail.scrollLeft = want.offsetLeft - (rail.clientWidth - want.offsetWidth) / 2;
    mark(want.dataset.card);
    let t;
    rail.addEventListener('scroll', () => {
      clearTimeout(t);
      t = setTimeout(() => { const sl = current(); if (sl) { rememberCard(sl.dataset.card); mark(sl.dataset.card); } }, 120);
    }, { passive: true });
  }

  function editCard(card, redraw) {
    const isNew = !card;
    card = card || { id: Date.now().toString(36), name: '', number: '', color: '' };
    let color = colorOf(card);
    const custom = () => !STORES.some(([, c]) => c.toLowerCase() === color.toLowerCase());
    const sh = openAccSheet(`
      <div class="sheet-head"><h3>${isNew ? 'Klantkaart toevoegen' : 'Klantkaart wijzigen'}</h3><button class="text-btn" data-close>Annuleer</button></div>
      <p class="tm-q">Winkel</p>
      <div class="chips card-stores">${STORES.map(([n, c]) => `<button type="button" class="chip${card.name === n ? ' on' : ''}" data-store="${esc(n)}"><i class="swatch" style="background:${c}"></i>${esc(n)}</button>`).join('')}</div>
      <label class="sheet-label">Naam<input id="cardName" value="${esc(card.name)}" placeholder="Bijv. Albert Heijn" autocomplete="off"></label>
      <p class="tm-q">Kleur</p>
      <div class="card-colors">${STORES.map(([n, c]) => `<button type="button" class="swatch-btn" data-color="${c}" style="background:${c}" aria-label="Kleur van ${esc(n)}" title="${esc(n)}"></button>`).join('')}
        <label class="swatch-btn swatch-other" title="Andere kleur"><input type="color" id="cardColor" value="${esc(color)}" aria-label="Andere kleur kiezen"><span>Anders</span></label></div>
      <label class="sheet-label">Nummer<input id="cardNum" value="${esc(card.number)}" placeholder="Het nummer onder de streepjescode" inputmode="numeric" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
      <p class="small-note" id="cardHint"></p>
      <div class="loyal loyal-preview" id="cardPrev"><div class="loyal-head"><b></b></div><div class="loyal-code"></div></div>
      <button class="btn" id="cardSave" style="width:100%;margin-top:12px">Bewaar</button>
      ${isNew ? '' : '<button class="link danger" id="cardDel" style="margin:14px auto 0;display:block">Kaart verwijderen</button>'}`, 'Klantkaart');
    sh.el.classList.add('card-edit');
    const nameIn = sh.$('#cardName'), numIn = sh.$('#cardNum'), colIn = sh.$('#cardColor'), prev = sh.$('#cardPrev');
    const preview = () => {
      const v = numIn.value.replace(/\s+/g, '');
      let svgHtml = '';
      try { svgHtml = v ? Barcode.svg(v) : ''; } catch { svgHtml = ''; }
      prev.style.setProperty('--c', color); prev.style.setProperty('--ink', inkOn(color));
      prev.querySelector('b').textContent = nameIn.value.trim() || 'Klantkaart';
      prev.querySelector('.loyal-code').innerHTML = svgHtml ? `${svgHtml}<span>${esc(groupNum(v))}</span>` : '<span class="loyal-empty">Je streepjescode verschijnt hier</span>';
      sh.el.querySelectorAll('[data-color]').forEach(x => x.classList.toggle('on', x.dataset.color.toLowerCase() === color.toLowerCase()));
      sh.$('.swatch-other').classList.toggle('on', custom());
      sh.$('.swatch-other').style.background = custom() ? color : '';
      const bad13 = /^\d{13}$/.test(v) && !Barcode.isEan13(v);
      sh.$('#cardHint').textContent = !v ? 'Typ het nummer over dat onder de streepjescode op je kaart staat. Bij de Bonuskaart van AH zijn dat 13 cijfers.'
        : bad13 ? 'Controleer het nummer: bij 13 cijfers klopt het laatste cijfer meestal niet bij de rest.'
        : !svgHtml ? 'Gebruik alleen cijfers en letters.' : '';
    };
    sh.el.querySelectorAll('[data-store]').forEach(b => b.onclick = () => {
      sh.el.querySelectorAll('[data-store]').forEach(x => x.classList.toggle('on', x === b));
      nameIn.value = b.dataset.store; color = storeColor(b.dataset.store); colIn.value = color; preview();
      if (!numIn.value) numIn.focus();
    });
    sh.el.querySelectorAll('[data-color]').forEach(b => b.onclick = () => { color = b.dataset.color; colIn.value = color; preview(); });
    colIn.addEventListener('input', () => { color = colIn.value; preview(); });
    nameIn.addEventListener('input', preview);
    numIn.addEventListener('input', preview); preview();
    sh.$('#cardSave').onclick = async () => {
      const number = numIn.value.replace(/\s+/g, ''), name = nameIn.value.trim() || 'Klantkaart';
      if (!number) { numIn.focus(); return; }
      try { Barcode.svg(number); } catch { numIn.focus(); return; }
      Object.assign(card, { name, number, color });
      if (isNew) cards().push(card);
      rememberCard(card.id);
      await save(); sh.close(); redraw(); window.scrollTo(0, 0);
    };
    sh.$('#cardDel')?.addEventListener('click', async () => {
      if (!confirm(`${card.name} verwijderen?`)) return;
      list.cards = cards().filter(c => c.id !== card.id);
      await save(); sh.close(); redraw();
    });
  }

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
          <div class="loyal-wrap">${railHtml()}</div>
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
          moveTimer = setTimeout(() => { if (view.isConnected && location.hash === '#/boodschappen') draw(); }, 1000);
        };
      });
      const on = (sel, fn) => { const el = view.querySelector(sel); if (el) el.onclick = fn; };
      bindRail(view, draw);
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
