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
  function label(i) {
    let q = i.qty, u = i.unit;
    if (q != null && u === 'g' && q >= 1000) { q /= 1000; u = 'kg'; }
    else if (q != null && u === 'ml' && q >= 1000) { q /= 1000; u = 'l'; }
    // per stuk (eieren, blikken, pakken…) naar boven afronden: 4½ ei wordt 5 eieren
    if (q != null && !['g', 'ml', 'kg', 'l', 'el', 'tl'].includes(u)) q = Math.max(1, Math.ceil(q - 0.01));
    const qs = q == null ? '' : (['kg', 'l'].includes(u) ? String(Math.round(q * 100) / 100).replace('.', ',') : fmtQty(q, u));
    return [qs, u, i.name].filter(Boolean).join(' ');
  }

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

  /* ---------- Badge op het mandje ---------- */

  function updateBadge() {
    const n = open();
    document.querySelectorAll('.cart-badge').forEach(b => { b.textContent = n; b.hidden = !n; });
  }

  /* ---------- Scherm ---------- */

  async function render(view) {
    await load();
    if (location.hash !== '#/boodschappen') return;   // intussen naar een ander scherm gegaan
    const draw = () => {
      const todo = list.items.filter(i => !i.checked);
      const done = list.items.filter(i => i.checked);
      const row = i => `
        <li class="shop-item${i.checked ? ' done' : ''}" data-id="${esc(i.id)}">
          <span class="check"></span>
          <span class="shop-text">${esc(label(i))}${i.from.length ? `<small>${esc(i.from.join(' · '))}</small>` : ''}</span>
          <button class="shop-del" aria-label="Verwijderen">×</button>
        </li>`;
      view.innerHTML = `
        <section class="shop">
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
          } else {
            item.checked = !item.checked;
          }
          await save(); draw();
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
