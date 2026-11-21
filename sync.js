'use strict';

// Automatische online back-up via Supabase.
// De recepten blijven ook lokaal staan (de app werkt offline). Na elke wijziging
// en bij het openen van de app worden lokale en online recepten samengevoegd:
// per recept wint de versie die het laatst is gewijzigd.
const Sync = (() => {
  const LS = {
    session: 'recepten-sync-session',
    deletes: 'recepten-sync-deletes',   // verwijderde ids die nog online weg moeten
    last: 'recepten-sync-last',
    error: 'recepten-sync-error',
  };
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* geen opslag */ } };

  // Testomgevingen kunnen de configuratie overschrijven.
  const cfg = read('recepten-sync-config-override', null) || (typeof SYNC_CONFIG !== 'undefined' ? SYNC_CONFIG : {});
  const configured = () => !!(cfg.url && cfg.key);
  const base = () => cfg.url.replace(/\/+$/, '');

  let session = read(LS.session, null);
  let running = null, again = false, timer = null;
  const listeners = new Set();
  const notify = () => [...listeners].forEach(fn => { try { fn(); } catch { /* */ } });

  /* ---------- Inloggen ---------- */

  async function authCall(path, body) {
    const res = await fetch(`${base()}/auth/v1/${path}`, {
      method: 'POST',
      headers: { apikey: cfg.key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(authMessage(data));
    return data;
  }

  function authMessage(d) {
    const m = (d.error_description || d.msg || d.message || d.error || '').toLowerCase();
    if (m.includes('invalid login')) return 'E-mailadres of wachtwoord klopt niet.';
    if (m.includes('already registered') || m.includes('already exists')) return 'Er bestaat al een account met dit e-mailadres. Log in.';
    if (m.includes('not confirmed')) return 'Bevestig eerst je e-mailadres via de link in de mail.';
    if (m.includes('password')) return 'Kies een wachtwoord van minimaal 6 tekens.';
    if (m.includes('signups not allowed') || m.includes('signup')) return 'Nieuwe accounts zijn uitgeschakeld voor dit project.';
    return d.error_description || d.msg || d.message || 'Er ging iets mis.';
  }

  function keepSession(d) {
    session = {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: d.expires_at ? d.expires_at * 1000 : Date.now() + (d.expires_in || 3600) * 1000,
      user: { id: d.user.id, email: d.user.email },
    };
    write(LS.session, session);
  }

  async function signIn(email, password) {
    keepSession(await authCall('token?grant_type=password', { email, password }));
    await syncNow();
  }

  async function signUp(email, password) {
    const d = await authCall('signup', { email, password });
    if (d.access_token) { keepSession(d); await syncNow(); return 'ok'; }
    return 'confirm'; // e-mailbevestiging staat aan
  }

  function signOut() {
    session = null;
    [LS.session, LS.deletes, LS.last, LS.error].forEach(k => write(k, null));
    notify();
  }

  async function token() {
    if (session.expires_at - Date.now() < 60_000) {
      try {
        keepSession(await authCall('token?grant_type=refresh_token', { refresh_token: session.refresh_token }));
      } catch (e) {
        if (navigator.onLine) { signOut(); throw new Error('Je bent uitgelogd. Log opnieuw in.'); }
        throw e;
      }
    }
    return session.access_token;
  }

  /* ---------- Database ---------- */

  async function rest(path, { method = 'GET', body, prefer } = {}) {
    const headers = { apikey: cfg.key, Authorization: `Bearer ${await token()}` };
    if (body) headers['Content-Type'] = 'application/json';
    if (prefer) headers.Prefer = prefer;
    const res = await fetch(`${base()}/rest/v1/${path}`, { method, headers, body: body && JSON.stringify(body) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      if (res.status === 404 || d.code === '42P01' || d.code === 'PGRST205') throw new Error('De tabel "recipes" bestaat nog niet in Supabase.');
      throw new Error(d.message || `Serverfout ${res.status}`);
    }
    return res.status === 204 || method !== 'GET' ? null : res.json();
  }

  const upsert = rows => rest('recipes?on_conflict=user_id,id', {
    method: 'POST', body: rows, prefer: 'resolution=merge-duplicates,return=minimal',
  });

  function chunks(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  /* ---------- Samenvoegen ---------- */

  async function run() {
    const uid = session.user.id;
    let deletes = read(LS.deletes, []);
    let changedLocally = false;

    // 1. Verwijderingen online doorvoeren
    for (const part of chunks(deletes, 20)) {
      await upsert(part.map(id => ({ user_id: uid, id, data: null, deleted: true, updated_at: Date.now() })));
      deletes = deletes.filter(id => !part.includes(id));
      write(LS.deletes, deletes);
    }

    // 2. Wat staat er online? (alleen id's en tijden, dus licht)
    const remote = await rest('recipes?select=id,updated_at,deleted');
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
      const rows = await rest(`recipes?select=id,data,updated_at&id=in.(${part.map(encodeURIComponent).join(',')})`);
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
      await upsert(part.map(r => ({ user_id: uid, id: r.id, data: r, deleted: false, updated_at: r.updatedAt || Date.now() })));
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
      } catch (e) {
        write(LS.error, navigator.onLine === false ? 'Geen internet; de back-up volgt later.' : e.message);
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
    return { state: 'on', email: session.user.email, last: read(LS.last, null), error: read(LS.error, null), busy: !!running };
  }

  function when(ts) {
    if (!ts) return 'nog niet';
    const d = new Date(ts), now = new Date();
    const time = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return `vandaag om ${time}`;
    return `${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} om ${time}`;
  }

  function cardHtml() {
    const s = status();
    if (s.state === 'off') return `
      <h3>Online back-up</h3>
      <p>Nog niet ingesteld. Hiervoor is een Supabase-project nodig.</p>`;
    if (s.state === 'loggedout') return `
      <h3>Online back-up</h3>
      <p>Log in om je recepten automatisch online te bewaren. Op een nieuwe iPhone log je met hetzelfde account in en komen al je recepten terug.</p>
      <form class="sync-form" id="syncForm" autocomplete="on">
        <input type="email" name="email" placeholder="E-mailadres" autocomplete="username" required>
        <input type="password" name="password" placeholder="Wachtwoord (min. 6 tekens)" autocomplete="current-password" minlength="6" required>
        <button class="btn" type="submit" data-act="in">Inloggen</button>
        <button class="btn ghost" type="button" data-act="up">Nieuw account maken</button>
        <p class="sync-msg" id="syncMsg" hidden></p>
      </form>`;
    return `
      <h3>Online back-up</h3>
      <p class="sync-state ${s.error ? 'bad' : 'good'}">
        ${s.busy ? 'Bezig met back-up…' : s.error ? `⚠️ ${esc(s.error)}` : `✓ Automatische back-up staat aan`}
      </p>
      <p>Laatste back-up: ${when(s.last)}<br>Account: ${esc(s.email)}</p>
      <button class="btn ghost" id="syncNowBtn">Nu back-up maken</button>
      <button class="link" id="signOutBtn">Uitloggen</button>`;
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
    if (form) {
      const msg = el.querySelector('#syncMsg');
      const go = async mode => {
        const email = form.email.value.trim(), password = form.password.value;
        if (!email || password.length < 6) { msg.hidden = false; msg.textContent = 'Vul je e-mailadres en een wachtwoord van minimaal 6 tekens in.'; return; }
        form.querySelectorAll('button').forEach(b => { b.disabled = true; });
        msg.hidden = false; msg.textContent = mode === 'up' ? 'Account maken…' : 'Inloggen…';
        try {
          if (mode === 'up' && (await signUp(email, password)) === 'confirm') {
            msg.textContent = 'Je account is gemaakt. Open de bevestigingsmail en tik op de link; kom daarna terug en log in.';
            form.querySelectorAll('button').forEach(b => { b.disabled = false; });
            return;
          }
          if (mode === 'in') await signIn(email, password);
          render();
        } catch (e) {
          msg.textContent = e.message === 'Failed to fetch' ? 'Geen verbinding met de server.' : e.message;
          form.querySelectorAll('button').forEach(b => { b.disabled = false; });
        }
      };
      form.addEventListener('submit', e => { e.preventDefault(); go('in'); });
      form.querySelector('[data-act=up]').addEventListener('click', () => go('up'));
    }
    el.querySelector('#syncNowBtn')?.addEventListener('click', () => syncNow());
    el.querySelector('#signOutBtn')?.addEventListener('click', () => {
      if (confirm('Uitloggen? Je recepten blijven op deze iPhone staan, maar er wordt geen back-up meer gemaakt.')) { signOut(); render(); }
    });
  }

  // Waarschuwingsstipje op het tandwiel als de back-up niet lukt
  listeners.add(() => document.body.classList.toggle('sync-problem', !!(session && read(LS.error, null))));

  // Bij het opstarten
  if (configured() && session) schedule(500);
  document.body.classList.toggle('sync-problem', !!(session && read(LS.error, null)));

  return { syncNow, cardHtml, bindCard, status, onRemoteChange: null };
})();
