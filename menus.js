// Menu's: recepten per gang samenstellen voor Kerst, Pasen of een etentje.
// Een menu wordt bewaard als record '__menu-…' (gaat mee met de online back-up, maar is geen recept).
const Menus = (() => {
  const KINDS = {
    kerst: { label: 'Kerst', emoji: '🎄', title: () => `Kerstdiner ${nextDate(11, 24).slice(0, 4)}`, date: () => nextDate(11, 24), courses: ['Voorgerecht', 'Hoofdgerecht', 'Nagerecht'] },
    pasen: { label: 'Pasen', emoji: '🐣', title: () => `Paasbrunch ${easter().slice(0, 4)}`, date: () => easter(), courses: ['Ontbijt', 'Lunch', 'Nagerecht'] },
    etentje: { label: 'Etentje', emoji: '🍷', title: () => 'Etentje', date: () => '', courses: ['Voorgerecht', 'Hoofdgerecht', 'Nagerecht'] },
    anders: { label: 'Anders', emoji: '', title: () => 'Nieuw menu', date: () => '', courses: ['Voorgerecht', 'Hoofdgerecht', 'Nagerecht'] },
  };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => iso(new Date());
  // Eerstvolgende dag/maand (vandaag telt mee)
  function nextDate(month, day) { const n = new Date(), d = new Date(n.getFullYear(), month, day); if (iso(d) < iso(n)) d.setFullYear(n.getFullYear() + 1); return iso(d); }
  // Eerste paasdag (algoritme van Meeus/Jones/Butcher), het eerstvolgende
  function easter(year = new Date().getFullYear()) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const date = iso(new Date(year, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1));
    return date < today() ? easter(year + 1) : date;
  }
  const fmtDate = (s, long = true) => s ? new Date(s + 'T12:00').toLocaleDateString('nl-NL', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long' }) : '';
  const all = async () => (await DB.all()).filter(r => String(r.id).startsWith('__menu-') && !r.deleted);
  const dishesOf = m => (m.dishes || []).map(d => ({ ...d, r: recipeById(d.id) })).filter(d => d.r);
  const coursesOfMenu = m => {
    const used = [...new Set((m.dishes || []).filter(d => recipeById(d.id)).map(d => d.course))];
    const base = (m.courses && m.courses.length ? m.courses : KINDS[m.kind || 'anders'].courses);
    const order = courseList();
    return [...new Set([...base, ...used])].sort((x, y) => (order.indexOf(x) + 1 || 99) - (order.indexOf(y) + 1 || 99));
  };
  const save = async m => { m.updatedAt = Date.now(); await DB.put(m); };
  const coverImgs = (m, n = 4) => {
    const imgs = dishesOf(m).map(d => d.r.photo || placeholder(d.r.id)).slice(0, n);
    for (let i = 0; imgs.length < n; i++) imgs.push(`images/placeholders/p${(hashStr(m.id) + i) % 8 + 1}.svg`);
    return imgs;
  };
  const MENU_ICON = '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>';

  async function create(kind) {
    const k = KINDS[kind] || KINDS.anders;
    const m = { id: `__menu-${uid()}`, type: 'menu', kind, title: k.title(), date: k.date(), persons: 4, courses: k.courses.filter(c => courseList().includes(c)), dishes: [], createdAt: Date.now() };
    if (!m.courses.length) m.courses = courseList().slice(0, 3);
    await save(m);
    location.hash = `#/menu/${encodeURIComponent(m.id)}/bewerk`;
  }

  /* ---------- Overzicht ---------- */
  async function renderList(view) {
    const seq = routeSeq;
    document.body.dataset.page = 'menus';
    setHeader({ title: "Menu's", back: true, timer: false });
    const menus = await all();
    if (isStale(seq)) return;
    const t = today();
    menus.sort((a, b) => {
      const ga = !a.date ? 1 : a.date >= t ? 0 : 2, gb = !b.date ? 1 : b.date >= t ? 0 : 2;
      return ga - gb || (ga === 2 ? b.date.localeCompare(a.date) : (a.date || '').localeCompare(b.date || '')) || (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    view.innerHTML = `<section class="mx">
      <div class="page-flag">${flagHtml("Menu's")}</div>
      <p class="mx-intro">Stel een menu samen voor een feest of een etentje. Ricetta zet de boodschappen voor je klaar.</p>
      <div class="mx-new">
        <button class="chip" data-new="anders">${MENU_ICON} Nieuw menu</button>
        ${['kerst', 'pasen', 'etentje'].map(k => `<button class="chip" data-new="${k}">${KINDS[k].emoji} ${KINDS[k].label}</button>`).join('')}
      </div>
      ${menus.length ? `<ul class="mx-list">${menus.map(m => {
        const n = dishesOf(m).length;
        return `<li><a class="mx-card${m.date && m.date < t ? ' past' : ''}" href="#/menu/${encodeURIComponent(m.id)}"><div class="covers">${coverImgs(m).map(s => `<img src="${s}" alt="" loading="lazy">`).join('')}</div>
          <div><span class="mx-tag">${esc([KINDS[m.kind]?.label, fmtDate(m.date, false)].filter(Boolean).join(' · '))}</span><b>${esc(m.title || 'Menu')}</b>
          <small>${m.persons} ${m.persons === 1 ? 'persoon' : 'personen'} · ${n} ${n === 1 ? 'gerecht' : 'gerechten'}</small></div></a></li>`;
      }).join('')}</ul>` : `<div class="card-box mx-empty"><p>Nog geen menu's. Kies hierboven waarvoor je een menu wilt maken.</p></div>`}
    </section>`;
    view.querySelectorAll('[data-new]').forEach(b => b.onclick = () => create(b.dataset.new));
  }

  /* ---------- Menukaart ---------- */
  const LEAF = 'M0,0 Q4,-6 8,-5 L10,-10 L14,-6 Q18,-9 22,-7 L25,-12 L28,-7 Q33,-8 36,-5 L42,0 L36,5 Q33,8 28,7 L25,12 L22,7 Q18,9 14,6 L10,10 L8,5 Q4,6 0,0Z';
  const DECOR = {
    kerst: c => `<svg class="mk-deco ${c}" viewBox="0 0 90 60" aria-hidden="true"><g transform="translate(46 30) rotate(-28)"><path d="${LEAF}" fill="#2f7a3d"/></g><g transform="translate(44 34) rotate(200)"><path d="${LEAF}" fill="#3b8f4a"/></g><g transform="translate(46 31) rotate(95) scale(.8)"><path d="${LEAF}" fill="#286c35"/></g><circle cx="42" cy="30" r="5.5" fill="#c62d1f"/><circle cx="51" cy="33" r="5" fill="#b02418"/><circle cx="45" cy="39" r="5" fill="#d23a2a"/></svg>`,
    pasen: c => `<svg class="mk-deco ${c}" viewBox="0 0 90 60" aria-hidden="true"><ellipse cx="38" cy="34" rx="13" ry="17" fill="#f2c94c" transform="rotate(-16 38 34)"/><path d="M27 30q5-4 10 0t10 0" stroke="#fff" stroke-width="2.4" fill="none" transform="rotate(-16 38 34)"/><ellipse cx="58" cy="38" rx="11" ry="14" fill="#9fd3c7" transform="rotate(14 58 38)"/><circle cx="55" cy="34" r="2" fill="#fff"/><circle cx="61" cy="40" r="2" fill="#fff"/><circle cx="56" cy="44" r="1.6" fill="#fff"/><path d="M20 50q10-8 22-2" stroke="#6aa84f" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  };
  async function renderMenu(view, id) {
    const seq = routeSeq;
    document.body.dataset.page = 'menus';
    const m = await DB.get(id);
    if (isStale(seq)) return;
    if (!m) { location.hash = '#/menus'; return; }
    setHeader({ title: m.title, back: true, timer: false, actions: `<button class="icon-btn cart-btn" data-go="#/boodschappen" aria-label="Boodschappenlijst">${ICONS.basket}<span class="cart-badge" hidden></span></button>` });
    Shopping.updateBadge();
    const dishes = dishesOf(m), kind = m.kind || 'anders';
    const courses = coursesOfMenu(m).filter(c => dishes.some(d => d.course === c));
    const timeOf = r => formatTime((+r.prepTime || 0) + (+r.cookTime || 0));
    view.innerHTML = `<section class="mx-wide">
      <div class="mk-wrap"><div class="mk mk-${kind}">${DECOR[kind] ? DECOR[kind]('l') + DECOR[kind]('r') : ''}
        <div class="mk-kicker">Menu</div>
        <h1>${esc(m.title || 'Menu')}</h1>
        <p class="mk-sub">${[fmtDate(m.date), `${m.persons} ${m.persons === 1 ? 'persoon' : 'personen'}`].filter(Boolean).map(t => `<span class="nowrap">${esc(t)}</span>`).join(' · ')}</p>
        <div class="mk-orn" aria-hidden="true">✦ ✦ ✦</div>
        ${courses.length ? courses.map(c => `<div class="mk-course"><h4>${esc(c)}</h4>${dishes.filter(d => d.course === c).map(d => `
          <a class="mk-dish" href="#/r/${encodeURIComponent(d.r.id)}"><img src="${d.r.photo || placeholder(d.r.id)}" alt=""><span><b>${esc(d.r.title)}</b>${timeOf(d.r) ? `<small>${timeOf(d.r)}</small>` : ''}</span></a>`).join('')}</div>`).join('')
          : '<p class="mk-none">Nog geen gerechten. Tik op <b>Menu aanpassen</b> om recepten toe te voegen.</p>'}
        <div class="mk-orn" aria-hidden="true">✦ ✦ ✦</div>
      </div></div>
      <div class="mk-actions">
        <button class="btn" id="mkShop"${dishes.length ? '' : ' disabled'}>${ICONS.basket} Boodschappen voor ${m.persons} ${m.persons === 1 ? 'persoon' : 'personen'}</button>
        <button class="btn ghost" id="mkPdf"${dishes.length ? '' : ' disabled'}>${ICONS.pdf} Menukaart als pdf</button>
        <a class="btn ghost" href="#/menu/${encodeURIComponent(m.id)}/bewerk">${ICONS.edit} Menu aanpassen</a>
      </div>
    </section>`;
    $('#mkShop').onclick = () => openShop(m, dishes);
    $('#mkPdf').onclick = () => openPdf(m, dishes, courses);
  }

  // Boodschappen voor het hele menu: per gerecht omgerekend naar het aantal personen; wat meestal in huis is staat uit
  function openShop(m, dishes) {
    const rows = [];
    dishes.forEach(({ r }) => {
      const f = m.persons / Math.max(1, +r.servings || 1);
      rows.push({ head: r.title });
      lines(r.ingredients).forEach((l, i) => {
        if (l.startsWith('#')) return;
        const tmp = document.createElement('div'); tmp.innerHTML = scaleLine(l, f);
        const home = inPantry(l);
        rows.push({ key: r.id + ':' + i, r, line: l, f, text: tmp.textContent, buy: !home, home });
      });
    });
    const s = openAccSheet(`
      <div class="sheet-head shop-sheet-head"><button class="text-btn" data-close>Annuleer</button><button class="btn small" id="shopAddTop"></button></div>
      <h3 class="shop-title">Boodschappen voor ${esc(m.title)}</h3>
      <p class="acc-sheet-text">Omgerekend naar ${m.persons} ${m.persons === 1 ? 'persoon' : 'personen'}. Tik weg wat je al in huis hebt.</p>
      <div class="shop-pick" id="shopPick"></div>
      <button class="btn" id="shopAdd"></button>`, 'Boodschappen voor het menu');
    const draw = () => {
      s.$('#shopPick').innerHTML = rows.map(x => x.head != null
        ? `<div class="shop-head mx-shop-head"><b>${esc(x.head)}</b></div>`
        : `<button type="button" class="shop-row${x.buy ? ' on' : ''}" data-k="${esc(x.key)}" role="checkbox" aria-checked="${x.buy}">
            <span class="tick" aria-hidden="true">${x.buy ? '✓' : ''}</span><span class="shop-text"><span class="shop-name">${esc(x.text)}</span>${x.home && !x.buy ? '<small>meestal in huis</small>' : ''}</span></button>`).join('');
      const n = rows.filter(x => x.key && x.buy).length;
      for (const id of ['#shopAdd', '#shopAddTop']) { s.$(id).textContent = n ? `Toevoegen (${n})` : 'Niets toevoegen'; s.$(id).disabled = !n; }
      s.el.querySelectorAll('.shop-row').forEach(b => b.onclick = () => { const x = rows.find(y => y.key === b.dataset.k); x.buy = !x.buy; draw(); });
    };
    draw();
    s.$('#shopAddTop').onclick = () => s.$('#shopAdd').click();
    s.$('#shopAdd').onclick = async () => {
      const pick = rows.filter(x => x.key && x.buy);
      for (const { r } of dishes) {
        const ls = pick.filter(x => x.r === r);
        if (ls.length) await Shopping.addFromRecipe(ls.map(x => x.line), ls[0].f, r.title);
      }
      await rememberPantry(rows.filter(x => x.key).map(x => ({ line: x.line, buy: x.buy })));
      s.close(); Shopping.updateBadge();
      toast(`${pick.length} ${pick.length === 1 ? 'boodschap' : 'boodschappen'} op de lijst`);
    };
  }

  async function openPdf(m, dishes, courses) {
    const s = openAccSheet(`
      <div class="sheet-head"><h3>Menukaart</h3><button class="text-btn" data-close>Sluit</button></div>
      <div id="pdfBody">${loaderHtml('Menukaart maken…')}</div>`, 'Menukaart');
    try {
      const blob = await RecipePdf.menu({ ...m, dateText: fmtDate(m.date) }, courses.map(c => ({ course: c, dishes: dishes.filter(d => d.course === c).map(d => ({ ...d.r, _ph: placeholder(d.r.id) })) })));
      const name = `menu-${(m.title || 'menu').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase()}.pdf`;
      const file = new File([blob], name, { type: 'application/pdf' }), href = URL.createObjectURL(blob);
      if (!s.el.isConnected) return;
      s.$('#pdfBody').innerHTML = `
        <p class="acc-sheet-text">De menukaart van <strong>${esc(m.title)}</strong> is klaar. Print hem voor op tafel of stuur hem naar je gasten.</p>
        ${navigator.canShare && navigator.canShare({ files: [file] }) ? `<button class="btn" id="pdfSend">${ICONS.share} Delen…</button>` : ''}
        <a class="btn ghost" id="pdfOpen" href="${href}" download="${esc(name)}" target="_blank" rel="noopener">${ICONS.pdf} Menukaart bekijken of bewaren</a>`;
      const send = s.$('#pdfSend');
      if (send) send.onclick = async () => { try { await navigator.share({ files: [file], title: m.title }); s.close(); } catch { /* geannuleerd */ } };
    } catch (err) { if (s.el.isConnected) s.$('#pdfBody').innerHTML = `<p class="sync-msg">${esc(err.message)}</p>`; }
  }

  /* ---------- Samenstellen ---------- */
  async function renderEdit(view, id) {
    const seq = routeSeq;
    document.body.dataset.page = 'menus';
    const m = await DB.get(id);
    if (isStale(seq)) return;
    if (!m) { location.hash = '#/menus'; return; }
    setHeader({ title: 'Menu aanpassen', back: true, timer: false, actions: `<button class="text-btn" id="mkDone">Klaar</button>` });
    $('#mkDone').onclick = () => { location.hash = `#/menu/${encodeURIComponent(m.id)}`; };
    let timer = null;
    const persist = () => { clearTimeout(timer); timer = setTimeout(() => save(m), 300); };
    const draw = () => {
      const courses = coursesOfMenu(m), dishes = dishesOf(m);
      const extra = courseList().filter(c => !courses.includes(c));
      view.innerHTML = `<section class="ms">
        <div class="ms-top">
          <input id="msTitle" value="${esc(m.title || '')}" placeholder="Naam van het menu" aria-label="Naam van het menu">
          <div class="chips ms-kinds">${Object.entries(KINDS).map(([k, d]) => `<button type="button" class="chip${m.kind === k ? ' on' : ''}" data-kind="${k}">${d.emoji ? d.emoji + ' ' : ''}${d.label}</button>`).join('')}</div>
          <div class="ms-stat">
            <label><span>Datum</span><input type="date" id="msDate" value="${esc(m.date || '')}"></label>
            <label><span>Personen</span><span class="stepper ms-pers"><button type="button" id="msMin" aria-label="Minder personen">−</button><b id="msPers">${m.persons}</b><button type="button" id="msPlus" aria-label="Meer personen">+</button></span></label>
          </div>
        </div>
        ${courses.map(c => `<h3>${esc(c)}</h3>
          ${dishes.filter(d => d.course === c).map(d => `<div class="ms-row"><img src="${d.r.photo || placeholder(d.r.id)}" alt=""><b>${esc(d.r.title)}</b><button type="button" class="ms-x" data-rm="${esc(d.r.id)}" data-course="${esc(c)}" aria-label="${esc(d.r.title)} weghalen">×</button></div>`).join('')}
          <button type="button" class="ms-add" data-add="${esc(c)}">+ Recept toevoegen</button>`).join('')}
        ${extra.length ? `<div class="ms-more"><span>Gang toevoegen:</span>${extra.map(c => `<button type="button" class="chip" data-gang="${esc(c)}">+ ${esc(c)}</button>`).join('')}</div>` : ''}
        <button type="button" class="ed-del" id="msDel">Menu verwijderen</button>
      </section>`;
      $('#msTitle').oninput = e => { m.title = e.target.value; persist(); };
      $('#msDate').onchange = e => { m.date = e.target.value; persist(); };
      $('#msMin').onclick = () => { if (m.persons > 1) { m.persons--; $('#msPers').textContent = m.persons; persist(); } };
      $('#msPlus').onclick = () => { m.persons++; $('#msPers').textContent = m.persons; persist(); };
      view.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { m.kind = b.dataset.kind; persist(); draw(); });
      view.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { m.dishes = m.dishes.filter(d => !(d.id === b.dataset.rm && d.course === b.dataset.course)); persist(); draw(); });
      view.querySelectorAll('[data-gang]').forEach(b => b.onclick = () => { m.courses = [...coursesOfMenu(m), b.dataset.gang]; persist(); draw(); });
      view.querySelectorAll('[data-add]').forEach(b => b.onclick = () => pick(b.dataset.add));
      $('#msDel').onclick = async () => {
        if (!confirm(`Het menu "${m.title}" verwijderen? De recepten zelf blijven bewaard.`)) return;
        clearTimeout(timer); await DB.remove(m.id); toast('Menu verwijderd'); location.hash = '#/menus';
      };
    };
    // Recepten kiezen voor een gang: recepten van die gang bovenaan, aantikken = toevoegen of weghalen
    const pick = course => {
      const s = openAccSheet(`
        <div class="sheet-head"><h3>${esc(course)}</h3><button class="text-btn" data-close>Klaar</button></div>
        <input type="search" id="mpSearch" placeholder="Zoek een recept" autocomplete="off">
        <ul class="pick mp-pick" id="mpList"></ul>`, `Recept kiezen: ${course}`);
      const drawPick = () => {
        const q = s.$('#mpSearch').value.trim().toLowerCase();
        const list = state.recipes.filter(x => !q || x.title.toLowerCase().includes(q))
          .sort((a, b) => ((b.courses || []).includes(course) - (a.courses || []).includes(course)) || a.title.localeCompare(b.title, 'nl'));
        s.$('#mpList').innerHTML = list.length ? list.map(x => {
          const on = m.dishes.some(d => d.id === x.id && d.course === course);
          return `<li><button type="button" class="mp-row${on ? ' on' : ''}" data-mp="${esc(x.id)}" aria-pressed="${on}"><img src="${x.photo || placeholder(x.id)}" alt="" loading="lazy"><b>${esc(x.title)}</b><span class="tick" aria-hidden="true">${on ? '✓' : '+'}</span></button></li>`;
        }).join('') : '<li class="pick-none">Geen recepten gevonden.</li>';
        s.el.querySelectorAll('[data-mp]').forEach(b => b.onclick = () => {
          const id = b.dataset.mp, i = m.dishes.findIndex(d => d.id === id && d.course === course);
          if (i >= 0) m.dishes.splice(i, 1); else m.dishes.push({ id, course });
          persist(); drawPick(); draw();
        });
      };
      s.$('#mpSearch').oninput = drawPick;
      drawPick();
      s.$('#mpSearch').focus({ preventScroll: true });
    };
    draw();
  }

  return { renderList, renderMenu, renderEdit, MENU_ICON, KINDS, easter };
})();
