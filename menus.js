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
  // Serveerstolp
  const MENU_ICON = '<svg viewBox="0 0 24 24"><path d="M3 18.5a9 9 0 0 1 18 0"/><path d="M1.8 18.5h20.4"/><path d="M12 9.5V7.5M10.3 7.5h3.4"/><path d="M6.6 15a5.6 5.6 0 0 1 2.9-3.1"/></svg>';

  // Eerstvolgende menu's bovenaan, dan zonder datum, dan voorbije (nieuwste eerst)
  function sortMenus(menus) {
    const t = today();
    return menus.sort((a, b) => {
      const ga = !a.date ? 1 : a.date >= t ? 0 : 2, gb = !b.date ? 1 : b.date >= t ? 0 : 2;
      return ga - gb || (ga === 2 ? b.date.localeCompare(a.date) : (a.date || '').localeCompare(b.date || '')) || (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }
  // Serveerstolp met plusje: recept toevoegen aan een menu
  const MENU_PLUS = '<svg viewBox="0 0 24 24"><path d="M2.5 19a8 8 0 0 1 16 0"/><path d="M1.5 19h18"/><path d="M10.5 11V9M9 9h3"/><path d="M5.7 15.9a5 5 0 0 1 2.6-2.75"/><path d="M19.5 2.5v6M16.5 5.5h6"/></svg>';
  const NEXT = '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';

  // Vanuit een recept: kies een menu, dan een gang
  async function openAddSheet(r) {
    const menus = sortMenus(await all());
    const s = openAccSheet(`<div id="tmBody"></div>`, 'Toevoegen aan menu');
    const body = s.$('#tmBody');
    const short = d => d ? new Date(d + 'T12:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
    const step1 = () => {
      body.innerHTML = `<div class="sheet-head"><h3>Toevoegen aan menu</h3><button class="text-btn" data-close>Annuleer</button></div>
        <p class="tm-sub">${esc(r.title)}</p>
        ${menus.length ? `<ul class="tm-list">${menus.map(m => {
          const n = dishesOf(m).length, inIt = (m.dishes || []).some(d => d.id === r.id);
          return `<li><button type="button" class="tm-row${m.date && m.date < today() ? ' past' : ''}" data-m="${esc(m.id)}"><span class="tm-covers">${coverImgs(m).map(x => `<img src="${x}" alt="" loading="lazy">`).join('')}</span>
            <span class="tm-tx"><small>${esc([KINDS[m.kind]?.label, short(m.date)].filter(Boolean).join(' · '))}</small><b>${esc(m.title || 'Menu')}</b><span>${m.persons} ${m.persons === 1 ? 'persoon' : 'personen'} · ${n ? `${n} ${n === 1 ? 'gerecht' : 'gerechten'}` : 'nog leeg'}</span></span>
            ${inIt ? '<span class="tm-in">✓ staat erin</span>' : ''}<span class="tm-chev">${NEXT}</span></button></li>`;
        }).join('')}</ul>` : '<p class="tm-sub">Je hebt nog geen menu\'s.</p>'}
        <button type="button" class="btn ghost tm-new" id="tmNew">${MENU_ICON} Nieuw menu met dit recept</button>`;
      body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => step2(menus.find(m => m.id === b.dataset.m)));
      body.querySelector('#tmNew').onclick = async () => {
        const course = (r.courses || []).find(c => courseList().includes(c)) || courseList()[0] || 'Hoofdgerecht';
        const k = KINDS.anders;
        const m = { id: `__menu-${uid()}`, type: 'menu', kind: 'anders', title: k.title(), date: '', persons: +r.servings || 4, courses: [...new Set([...k.courses.filter(c => courseList().includes(c)), course])], dishes: [{ id: r.id, course }], createdAt: Date.now() };
        await save(m); state.newMenu = m.id; s.close();
        location.hash = `#/menu/${encodeURIComponent(m.id)}/bewerk`;
      };
    };
    const step2 = m => {
      const courses = coursesOfMenu(m);
      let extra = false, pick = (r.courses || []).find(c => courses.includes(c)) || courses[0];
      const draw = () => {
        const shown = extra ? [...courses, ...courseList().filter(c => !courses.includes(c))] : courses;
        const already = (m.dishes || []).some(d => d.id === r.id && d.course === pick);
        body.innerHTML = `<div class="sheet-head"><h3>${esc(m.title || 'Menu')}</h3><button class="text-btn" data-close>Annuleer</button></div>
          ${menus.length > 1 ? '<button type="button" class="tm-back" id="tmBack">‹ Ander menu</button>' : ''}
          <p class="tm-q">In welke gang?</p>
          <div class="tm-courses">${shown.map(c => `<button type="button" class="chip${c === pick ? ' on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}${extra ? '' : '<button type="button" class="chip" id="tmMore">+ Andere gang</button>'}</div>
          <button type="button" class="btn tm-go" id="tmGo"${already || !pick ? ' disabled' : ''}>${already ? `Staat al bij ${esc(pick)}` : `Toevoegen aan ${esc(pick || '')}`}</button>`;
        body.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { pick = b.dataset.c; draw(); });
        if (body.querySelector('#tmMore')) body.querySelector('#tmMore').onclick = () => { extra = true; draw(); };
        if (body.querySelector('#tmBack')) body.querySelector('#tmBack').onclick = step1;
        body.querySelector('#tmGo').onclick = async () => {
          m.dishes = [...(m.dishes || []), { id: r.id, course: pick }];
          if (!(m.courses || []).includes(pick)) m.courses = [...coursesOfMenu(m).filter(c => c !== pick), pick];
          await save(m); s.close();
          toast(`Toegevoegd aan ${m.title || 'menu'} · ${pick}`);
        };
      };
      draw();
    };
    menus.length ? step1() : step1();
  }

  async function create(kind) {
    const k = KINDS[kind] || KINDS.anders;
    const m = { id: `__menu-${uid()}`, type: 'menu', kind, title: k.title(), date: k.date(), persons: 4, courses: k.courses.filter(c => courseList().includes(c)), dishes: [], createdAt: Date.now() };
    if (!m.courses.length) m.courses = courseList().slice(0, 3);
    await save(m);
    state.newMenu = m.id;   // Annuleer bij een nieuw menu: weer weghalen
    location.hash = `#/menu/${encodeURIComponent(m.id)}/bewerk`;
  }

  /* ---------- Overzicht ---------- */
  async function renderList(view) {
    return renderSplit(view, null);   // zelfde stijl op alle schermen; de oude opzet hieronder wordt niet meer gebruikt
    const seq = routeSeq;
    document.body.dataset.page = 'menus';
    setHeader({ docTitle: "Menu's", timer: false, actions: `${accBtnHtml()}` });
    const menus = sortMenus(await all());
    if (isStale(seq)) return;
    const t = today();
    view.innerHTML = `<section class="mx">
      <div class="page-flag">${flagHtml("Menu's")}</div>
      <p class="mx-intro">Stel een menu samen voor een feest of een etentje. Ricetta zet de boodschappen voor je klaar.</p>
      <div class="mx-new">
        ${['kerst', 'pasen', 'etentje'].map(k => `<button class="chip" data-new="${k}">${KINDS[k].emoji} ${KINDS[k].label}</button>`).join('')}
      </div>
      ${menus.length ? `<ul class="mx-list">${menus.map(m => {
        const n = dishesOf(m).length;
        return `<li><a class="mx-card${m.date && m.date < t ? ' past' : ''}" href="#/menu/${encodeURIComponent(m.id)}"><div class="covers">${coverImgs(m).map(s => `<img src="${s}" alt="" loading="lazy">`).join('')}</div>
          <div><span class="mx-tag">${esc([KINDS[m.kind]?.label, fmtDate(m.date, false)].filter(Boolean).join(' · '))}</span><b>${esc(m.title || 'Menu')}</b>
          <small>${m.persons} ${m.persons === 1 ? 'persoon' : 'personen'} · ${n} ${n === 1 ? 'gerecht' : 'gerechten'}</small></div></a></li>`;
      }).join('')}</ul>` : `<div class="card-box mx-empty"><p>Nog geen menu's. Kies hierboven waarvoor je een menu wilt maken, of tik op de plusknop.</p></div>`}
    </section>`;
    view.querySelectorAll('[data-new]').forEach(b => b.onclick = () => create(b.dataset.new));
  }

  /* ---------- iPad liggend en laptop: strook met alle menu's links, gerechten van het gekozen menu rechts ---------- */
  const SPLIT = matchMedia('(min-width: 900px)');
  let stripScroll = 0;
  SPLIT.addEventListener('change', () => { if (/^#\/menus?(\/[^/]+)?$/.test(location.hash)) route(); });
  // De strook met alle menu's (links op iPad liggend en laptop)
  function stripHtml(menus, selId) {
    const t = today();
    const upcoming = menus.filter(x => !(x.date && x.date < t)), past = menus.filter(x => x.date && x.date < t);
    const kindTag = x => [x.kind && x.kind !== 'anders' ? `${KINDS[x.kind]?.emoji || ''} ${KINDS[x.kind]?.label || ''}` : '', fmtDate(x.date, false)].filter(s => s.trim()).join(' · ');
    const item = x => { const n = dishesOf(x).length, on = x.id === selId;
      return `<a class="mm-item${on ? ' on' : ''}${x.date && x.date < t ? ' past' : ''}" href="#/menu/${encodeURIComponent(x.id)}"${on ? ' aria-current="true"' : ''} data-mid="${esc(x.id)}">
        <div class="covers">${coverImgs(x).map(src => `<img src="${src}" alt="" loading="lazy">`).join('')}</div>
        <div>${kindTag(x) ? `<span class="mm-tag">${esc(kindTag(x))}</span>` : ''}<b>${esc(x.title || 'Menu')}</b>
        <small>${x.persons} ${x.persons === 1 ? 'persoon' : 'personen'} · ${n} ${n === 1 ? 'gerecht' : 'gerechten'}</small></div></a>`; };
    return `<aside class="mm-side" aria-label="Alle menu's">
      <h2 class="page-title">Menu's</h2>
      <div class="mm-new">${['kerst', 'pasen', 'etentje'].map(k => `<button class="chip" data-new="${k}">${KINDS[k].emoji} ${KINDS[k].label}</button>`).join('')}</div>
      ${menus.length ? `${upcoming.length ? `<div class="mm-h">Binnenkort</div>${upcoming.map(item).join('')}` : ''}
        ${past.length ? `<div class="mm-h">Geweest</div>${past.map(item).join('')}` : ''}`
        : `<p class="mm-none">Nog geen menu's. Kies hierboven waarvoor je een menu wilt maken, of tik op de plusknop.</p>`}
    </aside>`;
  }
  function bindStrip(view, beforeLeave, page) {
    const strip = view.querySelector('.mm-side');
    view.querySelectorAll('.mm-side [data-new]').forEach(b => b.onclick = async () => { if (beforeLeave) await beforeLeave(); create(b.dataset.new); });
    if (page) return;   // eigen pagina (iPhone): gewone links, de pagina scrolt zelf
    strip.scrollTop = stripScroll;
    strip.addEventListener('scroll', () => { stripScroll = strip.scrollTop; }, { passive: true });
    view.querySelectorAll('.mm-item').forEach(a => a.addEventListener('click', async e => { e.preventDefault(); if (beforeLeave) await beforeLeave(); location.replace(a.getAttribute('href')); }));
  }
  async function renderSplit(view, id) {
    const seq = routeSeq;
    document.body.dataset.page = 'menus';
    const one = !SPLIT.matches;   // iPhone en iPad staand: het overzicht en een menu elk als eigen pagina
    const menus = sortMenus(await all());
    if (isStale(seq)) return;
    const m = (id && menus.find(x => x.id === id)) || (!id && !one && menus[0]) || null;
    if (id && !m) { location.replace('#/menus'); return; }
    if (one && m) { setHeader({ title: m.title || 'Menu', back: true, timer: false }); Shopping.updateBadge(); }
    else setHeader({ docTitle: "Menu's", timer: false, actions: `${accBtnHtml()}` });
    const side = stripHtml(menus, m && m.id);
    let main = `<div class="mm-main"><p class="mm-intro">Stel een menu samen voor een feest of een etentje. Ricetta zet de boodschappen voor je klaar.</p></div>`;
    let dishes = [], courses = [];
    if (m) {
      dishes = dishesOf(m);
      courses = coursesOfMenu(m).filter(c => dishes.some(d => d.course === c));
      const timeOf = r => formatTime((+r.prepTime || 0) + (+r.cookTime || 0));
      const kick = [m.kind && m.kind !== 'anders' ? `${KINDS[m.kind]?.emoji || ''} ${KINDS[m.kind]?.label || ''}` : '', fmtDate(m.date)].filter(s => s.trim()).join(' · ');
      main = `<div class="mm-main">
        <div class="mm-head"><div class="mm-ht">${kick ? `<div class="mm-kick">${esc(kick)}</div>` : ''}<h1>${esc(m.title || 'Menu')}</h1>
          <p>${[`${m.persons} ${m.persons === 1 ? 'persoon' : 'personen'}`, `${dishes.length} ${dishes.length === 1 ? 'gerecht' : 'gerechten'}`, courses.length ? `${courses.length} ${courses.length === 1 ? 'gang' : 'gangen'}` : ''].filter(Boolean).join(' · ')}</p></div>
          <div class="mm-acts">
            <button class="icon-btn" id="mkShop" aria-label="Boodschappen op de lijst zetten" title="Boodschappen op de lijst"${dishes.length ? '' : ' disabled'}>${ICONS.basketPlus}</button>
            <button class="icon-btn" id="mkPdf" aria-label="Menukaart delen" title="Menukaart delen (pdf)"${dishes.length ? '' : ' disabled'}>${ICONS.share}</button>
            <button class="icon-btn" data-go="#/menu/${encodeURIComponent(m.id)}/bewerk" aria-label="Menu aanpassen" title="Menu aanpassen">${ICONS.edit}</button>
          </div></div>
        ${courses.length ? courses.map(c => `<section class="mm-course"><h3>${esc(c)}</h3><div class="mm-grid">${dishes.filter(d => d.course === c).map(d => `
          <a class="mm-dish" href="#/r/${encodeURIComponent(d.r.id)}" data-course="${esc(c)}"><div class="ph"><img src="${d.r.photo || placeholder(d.r.id)}" alt="" loading="lazy"></div>
            <b>${esc(d.r.title)}</b>${timeOf(d.r) ? `<small>${timeOf(d.r)}</small>` : ''}</a>`).join('')}</div></section>`).join('')
          : `<div class="mm-empty"><p>Nog geen gerechten in dit menu.</p><button class="btn" data-go="#/menu/${encodeURIComponent(m.id)}/bewerk">${ICONS.edit} Gerechten kiezen</button></div>`}
      </div>`;
    }
    if (one && !m) { view.innerHTML = `<div class="mm-one">${side}</div>`; bindStrip(view, null, true); }
    else if (one) view.innerHTML = `<div class="mm-solo"><div class="crumb-row crumb-top">${crumbHtml("Menu's")}</div>${main}</div>`;
    else { view.innerHTML = `<div class="mm">${side}${main}</div>`; bindStrip(view); }
    if (m) {
      view.querySelectorAll('.mm-dish').forEach(el => el.addEventListener('click', () => {
        state.fromMenu = m.id; state.fromMenuTitle = m.title || 'Menu'; state.fromMenuCourse = el.dataset.course || '';
      }));
      $('#mkShop').onclick = () => openShop(m, dishes);
      $('#mkPdf').onclick = () => openPdf(m, dishes, courses);
    }
  }

  /* ---------- Menukaart ---------- */
  const LEAF = 'M0,0 Q4,-6 8,-5 L10,-10 L14,-6 Q18,-9 22,-7 L25,-12 L28,-7 Q33,-8 36,-5 L42,0 L36,5 Q33,8 28,7 L25,12 L22,7 Q18,9 14,6 L10,10 L8,5 Q4,6 0,0Z';
  const DECOR = {
    kerst: c => `<svg class="mk-deco ${c}" viewBox="0 0 90 60" aria-hidden="true"><g transform="translate(46 30) rotate(-28)"><path d="${LEAF}" fill="#2f7a3d"/></g><g transform="translate(44 34) rotate(200)"><path d="${LEAF}" fill="#3b8f4a"/></g><g transform="translate(46 31) rotate(95) scale(.8)"><path d="${LEAF}" fill="#286c35"/></g><circle cx="42" cy="30" r="5.5" fill="#c62d1f"/><circle cx="51" cy="33" r="5" fill="#b02418"/><circle cx="45" cy="39" r="5" fill="#d23a2a"/></svg>`,
    pasen: c => `<svg class="mk-deco ${c}" viewBox="0 0 90 60" aria-hidden="true"><ellipse cx="38" cy="34" rx="13" ry="17" fill="#f2c94c" transform="rotate(-16 38 34)"/><path d="M27 30q5-4 10 0t10 0" stroke="#fff" stroke-width="2.4" fill="none" transform="rotate(-16 38 34)"/><ellipse cx="58" cy="38" rx="11" ry="14" fill="#9fd3c7" transform="rotate(14 58 38)"/><circle cx="55" cy="34" r="2" fill="#fff"/><circle cx="61" cy="40" r="2" fill="#fff"/><circle cx="56" cy="44" r="1.6" fill="#fff"/><path d="M20 50q10-8 22-2" stroke="#6aa84f" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  };
  async function renderMenu(view, id) {
    return renderSplit(view, id);
    const seq = routeSeq;
    document.body.dataset.page = 'menus';
    const m = await DB.get(id);
    if (isStale(seq)) return;
    if (!m) { location.hash = '#/menus'; return; }
    const dishes = dishesOf(m), kind = m.kind || 'anders';
    setHeader({ title: m.title, back: true, timer: false });
    Shopping.updateBadge();
    const courses = coursesOfMenu(m).filter(c => dishes.some(d => d.course === c));
    const timeOf = r => formatTime((+r.prepTime || 0) + (+r.cookTime || 0));
    view.innerHTML = `<section class="mx-wide">
      <div class="crumb-row crumb-top">${crumbHtml("Menu's")}<span class="crumb-acts">
        <button class="icon-btn" id="mkPdf" aria-label="Menukaart delen" title="Menukaart delen (pdf)"${dishes.length ? '' : ' disabled'}>${ICONS.share}</button>
        <button class="icon-btn" data-go="#/menu/${encodeURIComponent(m.id)}/bewerk" aria-label="Menu aanpassen" title="Menu aanpassen">${ICONS.edit}</button></span></div>
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
      </div>
    </section>`;
    view.querySelectorAll('.mk-dish').forEach(el => el.addEventListener('click', () => {
      state.fromMenu = m.id; state.fromMenuTitle = m.title || 'Menu'; state.fromMenuCourse = el.closest('.mk-course')?.querySelector('h4')?.textContent || '';
    }));
    $('#mkShop').onclick = () => openShop(m, dishes);
    $('#mkPdf').onclick = () => openPdf(m, dishes, courses);
  }

  // Boodschappen voor het hele menu: per gerecht omgerekend naar het aantal personen; wat meestal in huis is staat uit
  // Boodschappen voor het hele menu. Elk gerecht en elk gekoppeld onderdeel (bijv. oubliehoorntjes) is een groep
  // met een eigen portiekiezer; alles begint op het aantal personen van het menu.
  function openShop(m, dishes) {
    const groups = [];
    dishes.forEach(({ r, course }) => {
      const parts = relatedOf(r).parts.filter(Boolean);
      const linked = ingredientLinks(lines(r.ingredients), parts);
      groups.push({ g: r.id, src: r, title: r.title, course, skip: new Set(linked.keys()) });
      parts.forEach(p => groups.push({ g: r.id + '>' + p.id, src: p, title: p.title, course, sub: `onderdeel van ${r.title}`, skip: new Set() }));
    });
    groups.forEach(gr => { gr.base = Math.max(1, +gr.src.servings || 1); gr.serv = m.persons; });
    const rows = [];
    groups.forEach(gr => lines(gr.src.ingredients).forEach((l, i) => {
      if (l.startsWith('#') || gr.skip.has(i) || Shopping.isHeading(l)) return;
      const home = inPantry(l);
      rows.push({ key: gr.g + ':' + i, gr, line: l, buy: !home, home });
    }));
    const tmp = document.createElement('div');
    const textOf = x => { tmp.innerHTML = scaleLine(x.line, x.gr.serv / x.gr.base); return tmp.textContent; };
    const s = openAccSheet(`
      <div class="sheet-head shop-sheet-head"><button class="text-btn" data-close>Annuleer</button><button class="btn small" id="shopAddTop"></button></div>
      <h3 class="shop-title">Boodschappen voor ${esc(m.title)}</h3>
      <p class="acc-sheet-text">Omgerekend naar ${m.persons} ${m.persons === 1 ? 'persoon' : 'personen'}; per gerecht of onderdeel aan te passen. Tik weg wat je al in huis hebt.</p>
      <div class="shop-pick" id="shopPick"></div>
      <button class="btn" id="shopAdd"></button>`, 'Boodschappen voor het menu');
    const draw = () => {
      s.$('#shopPick').innerHTML = groups.map(gr => {
        const rs = rows.filter(x => x.gr === gr);
        if (!rs.length) return '';
        return `<div class="shop-group">
          <div class="shop-head mx-shop-head"><span class="mx-shop-title"><b>${esc(gr.title)}</b>${gr.sub ? `<small>${esc(gr.sub)}</small>` : ''}</span>
            <span class="stepper shop-stepper" aria-label="Aantal porties"><button type="button" data-min="${esc(gr.g)}" aria-label="Minder porties">−</button><span>${ICONS.people} ${gr.serv}</span><button type="button" data-plus="${esc(gr.g)}" aria-label="Meer porties">+</button></span></div>
          ${rs.map(x => `<button type="button" class="shop-row${x.buy ? ' on' : ''}" data-k="${esc(x.key)}" role="checkbox" aria-checked="${x.buy}">
            <span class="tick" aria-hidden="true">${x.buy ? '✓' : ''}</span><span class="shop-text"><span class="shop-name">${esc(textOf(x))}</span>${x.home && !x.buy ? '<small>meestal in huis</small>' : ''}</span></button>`).join('')}
        </div>`;
      }).join('');
      const n = rows.filter(x => x.buy).length;
      for (const id of ['#shopAdd', '#shopAddTop']) { s.$(id).textContent = n ? `Toevoegen (${n})` : 'Niets toevoegen'; s.$(id).disabled = !n; }
      s.el.querySelectorAll('.shop-row').forEach(b => b.onclick = () => { const x = rows.find(y => y.key === b.dataset.k); x.buy = !x.buy; draw(); });
      s.el.querySelectorAll('[data-min]').forEach(b => b.onclick = () => { const gr = groups.find(g => g.g === b.dataset.min); if (gr.serv > 1) { gr.serv--; draw(); } });
      s.el.querySelectorAll('[data-plus]').forEach(b => b.onclick = () => { const gr = groups.find(g => g.g === b.dataset.plus); gr.serv++; draw(); });
    };
    draw();
    s.$('#shopAddTop').onclick = () => s.$('#shopAdd').click();
    s.$('#shopAdd').onclick = async () => {
      const pick = rows.filter(x => x.buy);
      for (const gr of groups) {
        const ls = pick.filter(x => x.gr === gr);
        if (ls.length) await Shopping.addFromRecipe(ls.map(x => x.line), gr.serv / gr.base, gr.title, {
          recipeId: gr.src.id, servings: gr.serv, sub: gr.sub || '', course: gr.course || '', courses: coursesOfMenu(m),
          menuId: m.id, menuTitle: m.title || 'Menu', menuEmoji: (KINDS[m.kind || 'anders'] || {}).emoji || '', menuDate: m.date || '', persons: m.persons });
      }
      await rememberPantry(rows.map(x => ({ line: x.line, buy: x.buy })));
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
    const wide = SPLIT.matches;
    let menus = [];
    if (wide) {
      menus = sortMenus(await all());
      if (isStale(seq)) return;
      setHeader({ docTitle: 'Menu aanpassen', timer: false, actions: `${accBtnHtml()}` });
      view.innerHTML = `<div class="mm">${recipePanelHtml()}<div class="mm-main mm-edit"><div class="mm-head mm-ehead"><div class="mm-ht"><div class="mm-kick">Menu aanpassen</div></div>
        <div class="mm-eacts"><button class="btn ghost" id="mkCancel">Annuleer</button><button class="btn" id="mkDone">${ICONS.check} Bewaar</button></div></div><div id="mmEdit"></div></div></div>`;
    } else
    setHeader({ title: 'Menu aanpassen', back: true, timer: false, actions: `<button class="text-btn cancel-btn" id="mkCancel">Annuleer</button><button class="text-btn" id="mkDone">Bewaar</button>` });
    // Wijzigingen worden tussendoor al bewaard; Annuleer zet de oude versie terug (of haalt een nieuw menu weg)
    const orig = JSON.parse(JSON.stringify(m)), isNew = state.newMenu === m.id;
    $('#mkDone').onclick = async () => { clearTimeout(timer); await save(m); if (isNew) state.newMenu = null; location.hash = `#/menu/${encodeURIComponent(m.id)}`; };
    $('#mkCancel').onclick = async () => {
      clearTimeout(timer);
      if (isNew) { await DB.remove(m.id); state.newMenu = null; location.hash = '#/menus'; return; }
      await DB.put(orig); location.hash = `#/menu/${encodeURIComponent(m.id)}`;
    };
    let timer = null;
    const persist = () => { clearTimeout(timer); timer = setTimeout(() => save(m), 300); };
    const draw = () => { drawForm(); if (wide) drawPanel(); };
    const drawForm = () => {
      const courses = coursesOfMenu(m), dishes = dishesOf(m);
      const extra = courseList().filter(c => !courses.includes(c));
      const box = wide ? view.querySelector('#mmEdit') : view;
      if (wide) {
        box.innerHTML = `<section class="ms ms-wide">
        <input id="msTitle" class="mm-etitle" value="${esc(m.title || '')}" placeholder="Naam van het menu" aria-label="Naam van het menu">
        <div class="ms-wrow">
          <div class="chips ms-kinds">${Object.entries(KINDS).map(([k, d]) => `<button type="button" class="chip${m.kind === k ? ' on' : ''}" data-kind="${k}">${d.emoji ? d.emoji + ' ' : ''}${d.label}</button>`).join('')}</div>
          <div class="ms-stat">
            <label><span>Datum</span><input type="date" id="msDate" value="${esc(m.date || '')}"></label>
            <label><span>Personen</span><span class="stepper ms-pers"><button type="button" id="msMin" aria-label="Minder personen">−</button><b id="msPers">${m.persons}</b><button type="button" id="msPlus" aria-label="Meer personen">+</button></span></label>
          </div>
        </div>
        ${courses.map(c => `<section class="mm-course" data-drop="${esc(c)}"><h3>${esc(c)}</h3><div class="mm-grid">
          ${dishes.filter(d => d.course === c).map(d => `<div class="mm-dish mm-edish" draggable="true" data-drag="${esc(d.r.id)}" data-from="${esc(c)}"><div class="ph"><img src="${d.r.photo || placeholder(d.r.id)}" alt=""><button type="button" class="mm-x" data-rm="${esc(d.r.id)}" data-course="${esc(c)}" aria-label="${esc(d.r.title)} weghalen" title="Weghalen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg></button></div><b>${esc(d.r.title)}</b></div>`).join('')}
          <button type="button" class="mm-dish mm-addd" data-add="${esc(c)}"><div class="ph">${POT_PLUS}<span>Recept toevoegen</span></div></button>
        </div></section>`).join('')}
        ${extra.length ? `<div class="ms-more"><span>Gang toevoegen:</span>${extra.map(c => `<button type="button" class="chip" data-gang="${esc(c)}" data-drop="${esc(c)}">+ ${esc(c)}</button>`).join('')}</div>` : ''}
        <button type="button" class="ed-del" id="msDel">Menu verwijderen</button>
      </section>`;
        bindDrops();
      } else
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
      $('#msTitle').oninput = e => { m.title = e.target.value; persist(); const it = wide && view.querySelector(`.mm-item[data-mid="${CSS.escape(m.id)}"] b`); if (it) it.textContent = m.title || 'Menu'; };
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
    // iPad liggend en laptop: links al je gerechten, die je naar de juiste gang sleept
    function recipePanelHtml() {
      return `<aside class="mm-side me-side" aria-label="Je gerechten">
        <h2 class="page-title">Gerechten</h2>
        <p class="bk-intro">Sleep een gerecht naar de juiste gang.</p>
        <div class="search me-search">${ICONS.search}<input type="search" id="meQ" placeholder="Zoek een recept" autocomplete="off"></div>
        <ul class="me-list" id="meList"></ul>
      </aside>`;
    }
    let dragId = null, dragFrom = null;
    function drawPanel() {
      const list = view.querySelector('#meList'); if (!list) return;
      const q = (view.querySelector('#meQ')?.value || '').trim().toLowerCase();
      const rs = state.recipes.filter(x => !q || x.title.toLowerCase().includes(q)).sort((a, b) => a.title.localeCompare(b.title, 'nl'));
      list.innerHTML = rs.length ? rs.map(x => {
        const inMenu = m.dishes.some(d => d.id === x.id);
        return `<li class="me-item${inMenu ? ' in' : ''}" draggable="true" data-drag="${esc(x.id)}" title="Sleep naar een gang">
          <img src="${x.photo || placeholder(x.id)}" alt="" loading="lazy" draggable="false"><span><b>${esc(x.title)}</b>${(x.courses || []).length ? `<small>${esc(x.courses.join(', '))}</small>` : ''}</span>
          ${inMenu ? '<i class="me-in" aria-label="Staat in het menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></i>' : ''}</li>`;
      }).join('') : '<li class="pick-none">Geen recepten gevonden.</li>';
    }
    // Slepen: uit de lijst links (toevoegen) of een gerecht in het menu (naar een andere gang verplaatsen)
    const dnd = wide ? view.querySelector('.mm') : null;
    dnd?.addEventListener('dragstart', e => {
      const el = e.target.closest?.('[data-drag]'); if (!el) return;
      dragId = el.dataset.drag; dragFrom = el.dataset.from || null;
      e.dataTransfer.effectAllowed = dragFrom ? 'move' : 'copy';
      try { e.dataTransfer.setData('text/plain', dragId); } catch { /* oudere browsers */ }
      el.classList.add('dragging'); view.classList.add('me-dragging');
    });
    dnd?.addEventListener('dragend', e => {
      e.target.closest?.('[data-drag]')?.classList.remove('dragging');
      view.classList.remove('me-dragging'); view.querySelectorAll('.drop-on').forEach(x => x.classList.remove('drop-on'));
      dragId = dragFrom = null;
    });
    function bindDrops() {
      view.querySelectorAll('#mmEdit [data-drop]').forEach(t => {
        t.addEventListener('dragover', e => { if (!dragId) return; e.preventDefault(); e.dataTransfer.dropEffect = dragFrom ? 'move' : 'copy'; t.classList.add('drop-on'); });
        t.addEventListener('dragleave', e => { if (!t.contains(e.relatedTarget)) t.classList.remove('drop-on'); });
        t.addEventListener('drop', e => {
          e.preventDefault(); t.classList.remove('drop-on'); view.classList.remove('me-dragging');
          const course = t.dataset.drop, id = dragId, from = dragFrom;
          if (!id) return;
          if (!coursesOfMenu(m).includes(course)) m.courses = [...coursesOfMenu(m), course];
          if (from) m.dishes = m.dishes.filter(d => !(d.id === id && d.course === from));
          if (!m.dishes.some(d => d.id === id && d.course === course)) m.dishes.push({ id, course });
          const r = recipeById(id);
          if (!from && r) toast(`${r.title} bij ${course.toLowerCase()} gezet`);
          dragId = dragFrom = null;
          persist(); draw(); drawPanel();
        });
      });
    }
    // Recepten kiezen voor een gang: recepten van die gang bovenaan, aantikken = toevoegen of weghalen
    const pick = course => {
      const s = openAccSheet(`
        <div class="sheet-head"><h3>${esc(course)}</h3><button class="text-btn" data-close>Klaar</button></div>
        <div class="search mp-search">${ICONS.search}<input type="search" id="mpSearch" placeholder="Zoek een recept" autocomplete="off"><button type="button" class="search-clear" id="mpClear" aria-label="Zoekveld leegmaken" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
        <ul class="pick mp-pick" id="mpList"></ul>`, `Recept kiezen: ${course}`);
      s.el.querySelector('.sheet').classList.add('tall');   // vaste hoogte: blijft boven het toetsenbord, ook met weinig resultaten
      const drawPick = () => {
        const q = s.$('#mpSearch').value.trim().toLowerCase();
        const list = state.recipes.filter(x => !q || x.title.toLowerCase().includes(q))
          .sort((a, b) => ((b.courses || []).includes(course) - (a.courses || []).includes(course)) || a.title.localeCompare(b.title, 'nl'));
        s.$('#mpList').innerHTML = list.length ? list.map(x => {
          const on = m.dishes.some(d => d.id === x.id && d.course === course);
          return `<li><button type="button" class="mp-row${on ? ' on' : ''}" data-mp="${esc(x.id)}" aria-pressed="${on}"><img src="${x.photo || placeholder(x.id)}" alt="" loading="lazy"><b>${esc(x.title)}</b><span class="tick" aria-hidden="true">${on ? '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>'}</span></button></li>`;
        }).join('') : '<li class="pick-none">Geen recepten gevonden.</li>';
        s.el.querySelectorAll('[data-mp]').forEach(b => b.onclick = () => {
          const id = b.dataset.mp, i = m.dishes.findIndex(d => d.id === id && d.course === course);
          if (i >= 0) m.dishes.splice(i, 1); else m.dishes.push({ id, course });
          persist(); drawPick(); draw();
        });
      };
      s.$('#mpSearch').oninput = () => { s.$('#mpClear').hidden = !s.$('#mpSearch').value; drawPick(); };
      s.$('#mpClear').onclick = () => { s.$('#mpSearch').value = ''; s.$('#mpClear').hidden = true; drawPick(); s.$('#mpSearch').focus({ preventScroll: true }); };
      drawPick();
      s.$('#mpSearch').focus({ preventScroll: true });
    };
    draw();
    if (wide) view.querySelector('#meQ').oninput = drawPanel;
  }

  return { create, renderList, renderMenu, renderEdit, openAddSheet, MENU_ICON, MENU_PLUS, KINDS, easter };
})();
