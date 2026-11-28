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
    // Gerechten waar geen boodschap meer bij hoort, vergeten
    if (Array.isArray(list.sources)) list.sources = list.sources.filter(s => list.items.some(i => i.from.includes(s.title)));
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


  // Enkelvoud en meervoud herkennen (1 ui + 2 uien, 1 tomaat + 2 tomaten, 1 wortel + 3 wortels),
  // zodat ze samen één boodschap worden. Kijkt alleen naar het laatste woord.
  const IRREG = { eieren: 'ei', eitjes: 'eitje', kinderen: 'kind' };
  // Alle mogelijke enkelvouden van een woord (plus het woord zelf)
  function forms(w) {
    const out = new Set([w]);
    if (IRREG[w]) out.add(IRREG[w]);
    if (/'s$/.test(w)) out.add(w.slice(0, -2));                                     // avocado's
    if (/[^s]s$/.test(w) && w.length > 3 && /(el|er|en|em|je|ie|[aeiouy])s$/.test(w)) out.add(w.slice(0, -1));   // wortels
    if (/en$/.test(w) && w.length > 3) {
      let t = w.slice(0, -2);
      if (/([bcdfgklmnprst])\1$/.test(t)) out.add(t.slice(0, -1));                    // kippen → kip
      else {
        t = t.replace(/v$/, 'f').replace(/z$/, 's');                                 // druiven → druif
        out.add(t);                                                                  // uien → ui, aardappelen → aardappel
        if (/[^aeiou][aeou][bcdfgklmnprst]$/.test(t)) out.add(t.slice(0, -1) + t.slice(-2));   // tomaten → tomaat
      }
    }
    return out;
  }
  const normName = n => n.toLowerCase().replace(/[^a-z0-9à-ÿ' ]/gi, '').trim();
  const split = n => { const a = normName(n), h = a.replace(/\S+$/, ''); return [h, a.slice(h.length)]; };
  const sameName = (a, b) => {
    const [ha, wa] = split(a), [hb, wb] = split(b);
    if (ha !== hb) return false;
    const fa = forms(wa), fb = forms(wb);
    return [...fa].some(x => fb.has(x));
  };
  // Is a het meervoud van b?
  const pluralOf = (a, b) => { const [, wa] = split(a), [, wb] = split(b); return wa !== wb && forms(wa).has(wb); };
  const sameUnit = (a, b) => (a || 'stuks') === (b || 'stuks');

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
    const same = list.items.find(i => !i.checked && sameUnit(i.unit, p.unit) && sameName(i.name, p.name));
    if (same) {
      if (same.qty != null && p.qty != null) same.qty += p.qty;
      else if (same.qty == null && p.qty != null) same.qty = p.qty;
      // Bij meer dan één de meervoudsvorm laten zien (1 ui + 2 uien = 3 uien)
      if ((same.qty == null || same.qty > 1) && pluralOf(p.name, same.name)) same.name = p.name;
      if (from && !same.from.includes(from)) same.from.push(from);
    } else {
      list.items.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...p, checked: false, from: from ? [from] : [] });
    }
  }

  // meta: bij welk recept (en eventueel welk menu en welke gang) deze boodschappen horen.
  // Wordt per receptnaam bewaard in list.sources, voor de kolom Gerechten op laptop en iPad.
  async function addFromRecipe(lines, factor, title, meta) {
    await load();
    lines.forEach(l => addOne(l, factor, title));
    if (meta && title) {
      list.sources = (list.sources || []).filter(s => s.title !== title);
      list.sources.push({ title, ...meta });
    }
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
    ['Aldi', '#00205B'], ['Dirk', '#E30613'], ['Coop', '#F7941D'],
  ];
  const DEFAULT_COLOR = '#5FA3A0';   // turquoise van de app (kaderlijn)
  const PIPET = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4.5l5 5"/><path d="M17.8 2.7a2.1 2.1 0 0 1 3 3l-3.1 3.1-3-3z"/><path d="M14.7 5.8L5.6 14.9 5 18.9 9 18.3l9.1-9.1"/><path d="M3 21l2.5-2.5"/></svg>';
  const SCAN_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8V6a2 2 0 0 1 2-2h2M17 4h2a2 2 0 0 1 2 2v2M21 16v2a2 2 0 0 1-2 2h-2M7 20H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M10 8v8M13 8v8M17 8v8"/></svg>';
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
  // Klantkaarten in- en uitklappen (per toestel onthouden)
  const HIDE = 'ricetta-cards-hidden';
  // Op de telefoon onthoudt de app of de kaarten in- of uitgeklapt zijn. Op laptop en iPad
  // (breed scherm) zijn ze bij openen altijd ingeklapt; daar heb je ze niet bij de kassa nodig.
  const wide = () => matchMedia('(min-width: 700px)').matches;
  let wideHidden = true;
  const cardsHidden = () => { if (wide()) return wideHidden; try { return localStorage.getItem(HIDE) === '1'; } catch { return false; } };
  const setCardsHidden = v => { if (wide()) { wideHidden = v; return; } try { localStorage.setItem(HIDE, v ? '1' : '0'); } catch { /* geen opslag */ } };
  // Kaartje met streepjescode (zonder pijltjes)
  const CARDS_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2.2"/><path d="M6.5 9v6M9 9v6M12 9v6M14.5 9v6M17.5 9v6"/></svg>';
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
      <button type="button" class="btn scan-btn${isNew ? '' : ' ghost'}" id="cardScan">${SCAN_ICON} ${isNew ? 'Scan je kaart' : 'Opnieuw scannen'}</button>
      ${isNew ? '<p class="scan-or">of kies de winkel en typ het nummer</p>' : ''}
      <p class="tm-q">Winkel</p>
      <div class="chips card-stores">${STORES.map(([n, c]) => `<button type="button" class="chip${card.name === n ? ' on' : ''}" data-store="${esc(n)}"><i class="swatch" style="background:${c}"></i>${esc(n)}</button>`).join('')}</div>
      <label class="sheet-label">Naam<input id="cardName" value="${esc(card.name)}" placeholder="Bijv. Albert Heijn" autocomplete="off"></label>
      <p class="tm-q">Kleur</p>
      <div class="card-colors">${STORES.map(([n, c]) => `<button type="button" class="swatch-btn" data-color="${c}" style="background:${c}" aria-label="Kleur van ${esc(n)}" title="${esc(n)}"></button>`).join('')}
        <label class="swatch-btn swatch-other" title="Andere kleur"><input type="color" id="cardColor" value="${esc(color)}" aria-label="Andere kleur kiezen">${PIPET}</label></div>
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
      sh.$('.swatch-other').style.color = custom() ? inkOn(color) : '';
      const bad13 = /^\d{13}$/.test(v) && !Barcode.isEan13(v);
      sh.$('#cardHint').classList.toggle('found-note', !!v && v === scanned);
      sh.$('#cardHint').textContent = v && v === scanned ? `✓ Gescand. Kijk het nummer nog even na${nameIn.value.trim() ? '' : ' en kies hierboven de winkel'}.` : !v ? 'Typ het nummer over dat onder de streepjescode op je kaart staat. Bij de Bonuskaart van AH zijn dat 13 cijfers.'
        : bad13 ? 'Controleer het nummer: bij 13 cijfers klopt het laatste cijfer meestal niet bij de rest.'
        : !svgHtml ? 'Gebruik alleen cijfers en letters.' : '';
    };
    let scanned = '';
    sh.$('#cardScan').onclick = async () => {
      const v = await Scanner.open();
      if (!v) return;
      numIn.value = v; scanned = v; preview();
      if (!nameIn.value.trim()) sh.$('.card-stores').scrollIntoView({ block: 'center', behavior: 'smooth' });
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

  /* ---------- Gerechten (rechterkolom op laptop en iPad) ---------- */

  const forDish = title => list.items.filter(i => i.from.includes(title));
  const shortDate = d => d ? new Date(d + 'T12:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }).replace('.', '') : '';

  function dishesHtml() {
    const titles = [...new Set(list.items.flatMap(i => i.from))];
    if (!titles.length) return '';
    const src = t => (list.sources || []).find(s => s.title === t) || { title: t };
    const all = titles.map(src);
    const dish = s => {
      const r = s.recipeId && typeof recipeById === 'function' ? recipeById(s.recipeId) : null;
      const its = forDish(s.title), left = its.filter(i => !i.checked).length;
      const img = r ? (r.photo || placeholder(r.id)) : placeholder(s.title);
      const info = [s.servings ? `${s.servings} ${s.servings === 1 ? 'portie' : 'porties'}` : '', s.sub || '',
        left ? `${left} ${left === 1 ? 'boodschap' : 'boodschappen'}` : '✓ alles in je mandje'].filter(Boolean).join(' · ');
      return `<div class="dish${r ? ' link' : ''}" data-dish="${esc(s.title)}"${r ? ` data-go="#/r/${encodeURIComponent(r.id)}" role="link" tabindex="0"` : ''}>
          <img src="${esc(img)}" alt="" loading="lazy"><span class="dt"><b>${esc(s.title)}</b><small>${esc(info)}</small></span>
          <button type="button" class="dx" data-dx="${esc(s.title)}" aria-label="Boodschappen voor ${esc(s.title)} weghalen">×</button></div>`;
    };
    // Per menu een blok, daarin per gang; de rest onder Losse recepten
    const menus = [];
    all.filter(s => s.menuId).forEach(s => { let m = menus.find(x => x.id === s.menuId); if (!m) menus.push(m = { id: s.menuId, s, dishes: [] }); m.dishes.push(s); });
    const loose = all.filter(s => !s.menuId);
    const menuBlk = ({ s, dishes }) => {
      const order = [...new Set([...(s.courses || []), ...dishes.map(d => d.course || '')])];
      const meta = [shortDate(s.menuDate), s.persons ? `${s.persons} ${s.persons === 1 ? 'persoon' : 'personen'}` : ''].filter(Boolean).join(' · ');
      return `<section class="dish-blk">
        <header><b>${s.menuEmoji ? `${s.menuEmoji} ` : ''}${esc(s.menuTitle || 'Menu')}</b>${meta ? `<span>${esc(meta)}</span>` : ''}</header>
        ${order.map(c => { const ds = dishes.filter(d => (d.course || '') === c); return ds.length ? `${c ? `<p class="gang">${esc(c)}</p>` : ''}${ds.map(dish).join('')}` : ''; }).join('')}
      </section>`;
    };
    const extra = list.items.filter(i => !i.from.length && !i.checked).length;
    return `<aside class="dishes" aria-label="Gerechten">
        <h2 class="page-title">Gerechten</h2>
        <p class="dishes-sub">Waar je boodschappen voor zijn. Wijs een gerecht aan om de boodschappen ervan te zien.</p>
        ${menus.map(menuBlk).join('')}
        ${loose.length ? `<section class="dish-blk"><header><b>${menus.length ? 'Losse recepten' : 'Recepten'}</b></header>${loose.map(dish).join('')}</section>` : ''}
        ${extra ? `<div class="dish-extra"><span>Overige boodschappen</span><b>${extra}</b></div>` : ''}
      </aside>`;
  }

  function bindDishes(view, redraw) {
    const items = view.querySelectorAll('.shop-item');
    const mark = title => items.forEach(li => { const it = list.items.find(i => i.id === li.dataset.id); li.classList.toggle('hl', !!title && !!it && it.from.includes(title)); });
    view.querySelectorAll('[data-dish]').forEach(d => {
      d.addEventListener('mouseenter', () => mark(d.dataset.dish));
      d.addEventListener('mouseleave', () => mark(null));
      d.addEventListener('focus', () => mark(d.dataset.dish));
      d.addEventListener('blur', () => mark(null));
      d.addEventListener('keydown', e => { if (e.key === 'Enter' && d.dataset.go) location.hash = d.dataset.go; });
    });
    view.querySelectorAll('[data-dx]').forEach(b => b.onclick = async e => {
      e.stopPropagation();
      const t = b.dataset.dx;
      if (!confirm(`Boodschappen voor ${t} van de lijst halen?\nWat je ook voor een ander gerecht nodig hebt, blijft staan.`)) return;
      list.items = list.items.filter(i => !(i.from.includes(t) && i.from.length === 1));
      list.items.forEach(i => { if (i.from.includes(t)) i.from = i.from.filter(f => f !== t); });
      clearTimeout(moveTimer);
      await save(); redraw();
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
          <div class="loyal-wrap${cards().length && cardsHidden() ? ' closed' : ''}" id="loyalWrap"><div class="loyal-in">${railHtml()}</div></div>
          <div class="shop-split"><div class="shop-left">
          <div class="shop-title-row"><h2 class="page-title">Boodschappen</h2>${list.items.length ? `<button type="button" class="icon-btn shop-share" id="shareTop" aria-label="Lijst delen" title="Lijst delen">${ICONS.share}</button>` : ''}</div>
          <form class="shop-add" id="shopAdd" autocomplete="off">
            <span class="shop-field"><input name="item" placeholder="Voeg toe, bijv. 2 pakken melk" enterkeyhint="done" autocapitalize="sentences"><button type="button" class="search-clear" id="shopClear" aria-label="Veld leegmaken" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span>
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
          </div>${dishesHtml()}</div>
        </section>`;

      const input = view.querySelector('[name=item]'), clearBtn = view.querySelector('#shopClear');
      input.addEventListener('input', () => { clearBtn.hidden = !input.value; });
      clearBtn.onclick = () => { input.value = ''; clearBtn.hidden = true; input.focus({ preventScroll: true }); };
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
      bindDishes(view, draw);
      // Knopje om de klantkaarten in en uit te klappen, in de menubalk (voor het tandwiel)
      const acts = document.querySelector('#topActions');
      acts.querySelector('#cardToggle')?.remove();
      if (cards().length) {
        acts.insertAdjacentHTML('afterbegin', `<button type="button" class="icon-btn card-toggle${cardsHidden() ? '' : ' on'}" id="cardToggle" aria-expanded="${!cardsHidden()}" aria-label="${cardsHidden() ? 'Klantkaarten tonen' : 'Klantkaarten verbergen'}">${CARDS_ICON}</button>`);
        // In- en uitklappen met dezelfde animatie als het filtermenu
        acts.querySelector('#cardToggle').onclick = e => {
          const open = cardsHidden(), btn = e.currentTarget;
          setCardsHidden(!open);
          btn.classList.toggle('on', open);
          btn.setAttribute('aria-expanded', open);
          btn.setAttribute('aria-label', open ? 'Klantkaarten verbergen' : 'Klantkaarten tonen');
          foldFilters(view.querySelector('#loyalWrap'), open);
        };
      }
      on('#clearDone', async () => { list.items = list.items.filter(i => !i.checked); await save(); draw(); });
      on('#clearAll', async () => {
        if (!confirm('Hele boodschappenlijst leegmaken?')) return;
        list.items = []; await save(); draw();
      });
      const shareList = async () => {
        const text = 'Boodschappen\n' + list.items.filter(i => !i.checked).map(i => '• ' + label(i)).join('\n');
        if (navigator.share) { try { await navigator.share({ title: 'Boodschappen', text }); } catch { /* geannuleerd */ } }
        else { await navigator.clipboard.writeText(text); toast('Lijst gekopieerd'); }
      };
      on('#shareList', shareList);
      on('#shareTop', shareList);
    };
    draw();
  }

  return { load, render, addFromRecipe, updateBadge, parse, ID };
})();
