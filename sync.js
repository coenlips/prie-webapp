'use strict';

// Automatische online back-up naar een eigen MySQL-database (via server/api.php).
// De recepten blijven ook lokaal staan (de app werkt offline). Na elke wijziging
// en bij het openen van de app worden lokale en online recepten samengevoegd:
// per recept wint de versie die het laatst is gewijzigd.
const Sync = (() => {
  const LS = {
    session: 'recepten-sync-session',   // { token, user: { id, name, admin, mustChange } }
    deletes: 'recepten-sync-deletes',   // verwijderde ids die nog online weg moeten
    last: 'recepten-sync-last',
    error: 'recepten-sync-error',
    owner: 'recepten-sync-owner',       // van welke gebruiker de recepten op dit toestel zijn
    me: 'recepten-sync-me',             // laatst bekende accountgegevens (aantal recepten, deelsleutel)
  };
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* geen opslag */ } };

  // Testomgevingen kunnen de configuratie overschrijven.
  const cfg = read('recepten-sync-config-override', null) || (typeof SYNC_CONFIG !== 'undefined' ? SYNC_CONFIG : {});
  const configured = () => !!cfg.api;

  let session = read(LS.session, null);
  let running = null, again = false, timer = null, lastMe = 0;
  const listeners = new Set();
  const notify = () => [...listeners].forEach(fn => { try { fn(); } catch { /* */ } });

  /* ---------- Verbinding met de server ---------- */

  async function api(action, body, { auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) headers['X-Token'] = session.token;
    let res;
    try {
      res = await fetch(`${cfg.api}?action=${action}`, {
        method: body ? 'POST' : 'GET', headers, body: body && JSON.stringify(body), cache: 'no-store',
      });
    } catch {
      throw new Error(navigator.onLine === false ? 'Geen internet; de back-up volgt later.' : 'Geen verbinding met de server.');
    }
    const data = await res.json().catch(() => null);
    if (res.status === 401 && auth) { expire(); throw new Error('Je bent uitgelogd. Log opnieuw in.'); }
    // Storing op de server (bijv. database even weg): begrijpelijke melding voor iedereen;
    // de beheerder ziet er de technische oorzaak bij.
    if (res.status >= 500 || (!res.ok && !data)) {
      const detail = (data && data.error) || `serverfout ${res.status}`;
      const admin = session && session.user && session.user.admin;
      throw new Error('De server is tijdelijk niet bereikbaar. Je wijzigingen blijven op dit toestel bewaard; de back-up volgt vanzelf.'
        + (admin ? ` (Voor de beheerder: ${detail})` : ''));
    }
    if (!res.ok || !data) throw new Error((data && data.error) || `Serverfout ${res.status}`);
    return data;
  }

  /* ---------- Account ---------- */

  async function signIn(name, password) {
    const d = await api('login', { name, password }, { auth: false });
    if (!d.user) throw new Error('De server moet nog worden bijgewerkt: upload eerst de nieuwe api.php.');
    // Staan hier nog recepten van iemand anders? Die horen niet in dit account.
    const owner = read(LS.owner, null);
    if (owner != null && owner !== d.user.id) {
      await DB.clear();
      [LS.deletes, LS.last, LS.error, LS.me].forEach(k => write(k, null));
    }
    write(LS.owner, d.user.id);   // recepten zonder eigenaar (uitproberen) gaan mee naar het account
    session = { token: d.token, user: d.user };
    write(LS.session, session);
    notify();
    await syncNow();
    refreshMe().catch(() => {});
    return d.user;
  }

  // Sessie verlopen of ingetrokken: uitloggen, maar de recepten laten staan (ze zijn van 'owner')
  function expire() {
    session = null;
    [LS.session, LS.error, LS.me].forEach(k => write(k, null));
    notify();
  }

  // Zelf uitloggen: eerst een laatste back-up, dan alles van dit toestel halen zodat een volgende
  // gebruiker niets van jou ziet. Lukt de back-up niet, dan geeft dit false (tenzij force).
  async function signOut({ force = false } = {}) {
    if (session && !force) {
      await syncNow();
      if (read(LS.error, null) || read(LS.deletes, []).length) return false;
    }
    if (session) api('logout', {}).catch(() => {});
    session = null;
    [LS.session, LS.deletes, LS.last, LS.error, LS.owner, LS.me].forEach(k => write(k, null));
    await DB.clear();
    notify();
    return true;
  }

  async function refreshMe() {
    if (!configured() || !session) return null;
    const m = await api('me');
    write(LS.me, m);
    session.user = { id: m.id, name: m.name, admin: m.admin, mustChange: m.mustChange };
    write(LS.session, session);
    notify();
    return m;
  }

  // Account aanvragen vanaf het inlogscherm (zonder in te loggen)
  async function requestAccount(name, email, website) {
    try { return await api('request_account', { name, email, website }, { auth: false }); }
    catch (e) { throw /Onbekende actie/.test(e.message) ? new Error('Aanvragen kan nog niet: de server moet nog worden bijgewerkt. Vraag het de beheerder.') : e; }
  }

  async function changePassword(current, next) {
    await api('change_password', { current, new: next });
    session.user = { ...session.user, mustChange: false };
    write(LS.session, session);
    notify();
  }

  const upsert = rows => api('put', { rows });

  function chunks(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  /* ---------- Samenvoegen ---------- */

  async function run() {
    let deletes = read(LS.deletes, []);
    let changedLocally = false;

    // 1. Verwijderingen online doorvoeren
    for (const part of chunks(deletes, 20)) {
      await upsert(part.map(id => ({ id, data: null, deleted: true, updated_at: Date.now() })));
      deletes = deletes.filter(id => !part.includes(id));
      write(LS.deletes, deletes);
    }

    // 2. Wat staat er online? (alleen id's en tijden, dus licht)
    const remote = await api('list');
    const local = new Map((await DB.all()).map(r => [r.id, r]));
    const remoteMap = new Map(remote.map(r => [r.id, r]));

    const download = [], removeLocal = [], upload = [];
    for (const row of remote) {
      const l = local.get(row.id);
      if (row.deleted) {
        if (l && (l.updatedAt || 0) <= row.updated_at) removeLocal.push(row.id);
      } else if (!l || (l.updatedAt || 0) < row.updated_at) {
        download.push(row.id);
      }
    }
    for (const r of local.values()) {
      const row = remoteMap.get(r.id);
      if (!row || (r.updatedAt || 0) > row.updated_at) upload.push(r);
    }

    // 3. Ophalen wat online nieuwer is
    for (const part of chunks(download, 10)) {
      const rows = await api('get', { ids: part });
      for (const row of rows) {
        if (!row.data) continue;
        await DB.rawPut({ ...row.data, id: row.id, updatedAt: row.updated_at });
        changedLocally = true;
      }
    }
    for (const id of removeLocal) {
      await DB.rawRemove(id);
      changedLocally = true;
    }

    // 4. Online zetten wat hier nieuwer is (in kleine stukjes, foto's zijn groot)
    for (const part of chunks(upload, 5)) {
      await upsert(part.map(r => ({ id: r.id, data: r, deleted: false, updated_at: r.updatedAt || Date.now() })));
    }

    write(LS.last, Date.now());
    write(LS.error, null);
    return changedLocally;
  }

  async function syncNow() {
    if (!configured() || !session) return;
    if (running) { again = true; return running; }
    running = (async () => {
      try {
        const changed = await run();
        if (changed && typeof Sync.onRemoteChange === 'function') await Sync.onRemoteChange();
        // Beheerder: af en toe kijken of er nieuwe accountaanvragen zijn
        if (session && session.user && session.user.admin && Date.now() - lastMe > 60000) { lastMe = Date.now(); refreshMe().catch(() => {}); }
      } catch (e) {
        if (session) write(LS.error, e.message);
      } finally {
        running = null;
        notify();
        if (again) { again = false; schedule(500); }
      }
    })();
    notify();
    return running;
  }

  function schedule(ms = 2000) {
    clearTimeout(timer);
    timer = setTimeout(syncNow, ms);
  }

  /* ---------- Koppeling met de lokale opslag ---------- */

  // Elke wijziging krijgt een tijdstempel en start (na een paar seconden) een back-up.
  DB.rawPut = DB.put;
  DB.rawRemove = DB.remove;
  DB.put = async r => { r.updatedAt = Date.now(); await DB.rawPut(r); schedule(); };
  DB.remove = async id => {
    await DB.rawRemove(id);
    if (session) write(LS.deletes, [...new Set([...read(LS.deletes, []), id])]);
    schedule();
  };
  const rawPutMany = DB.putMany;
  DB.putMany = async list => { const now = Date.now(); list.forEach(r => { r.updatedAt = now; }); await rawPutMany(list); schedule(); };

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(300); });
  window.addEventListener('online', () => schedule(300));

  /* ---------- Instellingen ---------- */

  function status() {
    if (!configured()) return { state: 'off' };
    if (!session) return { state: 'loggedout' };
    return { state: 'on', user: session.user || null, me: read(LS.me, null), last: read(LS.last, null), error: read(LS.error, null), busy: !!running };
  }

  function when(ts) {
    if (!ts) return 'nog niet';
    const d = new Date(ts), now = new Date();
    const time = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return `vandaag om ${time}`;
    return `${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} om ${time}`;
  }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // Inlogformulier (in Instellingen en op het welkomstscherm)
  const loginFormHtml = () => `
      <form class="acc-form" id="syncForm" autocomplete="on">
        <label>Naam<input type="text" name="username" autocomplete="username" autocapitalize="words" autocorrect="off" spellcheck="false" required></label>
        <label>Wachtwoord<input type="password" name="password" autocomplete="current-password" required></label>
        <button class="btn" type="submit">Inloggen</button>
        <p class="sync-msg" id="syncMsg" hidden></p>
      </form>`;

  function bindLoginForm(form, onDone) {
    const msg = form.querySelector('#syncMsg');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name = form.username.value.trim();
      const password = form.password.value.trim(); // geplakte spaties of enters negeren
      if (!name || !password) return;
      const btn = form.querySelector('button');
      btn.disabled = true;
      msg.hidden = false; msg.textContent = 'Inloggen…';
      try {
        const user = await signIn(name, password);
        onDone(user);
      } catch (err) {
        msg.textContent = err.message;
        btn.disabled = false;
      }
    });
  }

  function cardHtml() {
    const s = status();
    if (s.state === 'off') return `
      <p>Nog niet ingesteld. Hiervoor is de server op je eigen website nodig.</p>`;
    if (s.state === 'loggedout') return `
      <p>Log in met je naam en wachtwoord. Je recepten worden dan automatisch online bewaard, en op een ander toestel log je in en zijn ze er weer.</p>
      ${loginFormHtml()}
      <p class="small-note">Nog geen account? <button class="link" id="requestBtn">Vraag een account aan</button></p>`;
    const u = s.user || { name: '' }, me = s.me;
    return `
      <div class="acc-who">
        <div class="acc-avatar" aria-hidden="true">${esc((u.name || '?').charAt(0).toUpperCase())}</div>
        <div><b>${esc(u.name)}${u.admin ? ' <span class="acc-role">beheerder</span>' : ''}</b>
          <small>${me ? `${me.recipes} ${me.recipes === 1 ? 'recept' : 'recepten'} · ` : ''}${s.busy ? 'bezig met back-up…' : `back-up ${when(s.last)}`}</small></div>
      </div>
      ${s.error ? `<p class="sync-state bad">⚠️ ${esc(s.error)}</p>` : ''}
      <div class="acc-email"><span>E-mail</span><b>${me && me.email ? esc(me.email) : '<i>nog niet ingevuld</i>'}</b><button class="link" id="emailBtn">${me && me.email ? 'Wijzigen' : 'Invullen'}</button></div>
      <div class="acc-actions">
        <button class="btn ghost" id="pwBtn">Wachtwoord wijzigen</button>
      </div>
      <button class="link" id="syncNowBtn">Nu back-up maken</button>
      <button class="link" id="signOutBtn">Uitloggen</button>
      <p class="small-note">Bij uitloggen worden je recepten van dit toestel gehaald. Online blijven ze bewaard: log weer in en ze komen terug.</p>`;
  }

  function bindCard(el) {
    // Eén ontvanger per kaart; opnieuw tekenen hangt geen nieuwe ontvangers op.
    const render = () => { el.innerHTML = cardHtml(); bindButtons(el, render); };
    bindButtons(el, render);
    const update = () => {
      if (!el.isConnected) { listeners.delete(update); return; }
      if (!el.querySelector('#syncForm')) render(); // niet tekenen terwijl iemand typt
    };
    listeners.add(update);
  }

  function bindButtons(el, render) {
    const form = el.querySelector('#syncForm');
    if (form) bindLoginForm(form, user => { render(); if (typeof Sync.onSignIn === 'function') Sync.onSignIn(user); });
    el.querySelector('#syncNowBtn')?.addEventListener('click', () => syncNow());
    el.querySelector('#pwBtn')?.addEventListener('click', () => Sync.onPasswordButton && Sync.onPasswordButton());
    el.querySelector('#emailBtn')?.addEventListener('click', () => Sync.onEmailButton && Sync.onEmailButton());
    el.querySelector('#usersBtn')?.addEventListener('click', () => { location.hash = '#/gebruikers'; });
    el.querySelector('#requestBtn')?.addEventListener('click', () => Sync.onRequestButton && Sync.onRequestButton());
    el.querySelector('#signOutBtn')?.addEventListener('click', async () => {
      if (!confirm('Uitloggen? Je recepten worden van dit toestel gehaald. Online blijven ze bewaard.')) return;
      let done = await signOut();
      if (!done && confirm('De laatste back-up lukte niet, dus wijzigingen van dit toestel kunnen verloren gaan. Toch uitloggen?')) done = await signOut({ force: true });
      if (done && typeof Sync.onSignOut === 'function') Sync.onSignOut();
    });
  }


  // Waarschuwingsstipje op het tandwiel als de back-up niet lukt
  listeners.add(() => document.body.classList.toggle('sync-problem', !!(session && read(LS.error, null))));

  // Bij het opstarten
  if (configured() && session) schedule(500);
  document.body.classList.toggle('sync-problem', !!(session && read(LS.error, null)));

  // Ontvanger die false teruggeeft wordt weer verwijderd
  function onChange(fn) {
    const wrapped = () => { if (fn() === false) listeners.delete(wrapped); };
    listeners.add(wrapped);
  }

  // Voor andere onderdelen (bijv. recepten importeren) die de server nodig hebben
  function call(action, body) {
    if (!configured() || !session) return Promise.reject(new Error('Log eerst in (tandwiel → Account) om recepten van websites te kunnen ophalen.'));
    return api(action, body);
  }

  // Zonder inloggen (bijv. een gedeeld recept via een QR-code openen)
  function publicCall(action, body) {
    if (!configured()) return Promise.reject(new Error('Deze app is niet met een server verbonden.'));
    return api(action, body, { auth: false });
  }

  return { when, syncNow, cardHtml, bindCard, status, onChange, call, publicCall, signIn, signOut, refreshMe, changePassword, requestAccount, loginFormHtml, bindLoginForm,
    onRemoteChange: null, onSignIn: null, onSignOut: null, onPasswordButton: null, onEmailButton: null, onRequestButton: null };
})();
