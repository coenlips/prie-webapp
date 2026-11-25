// Recept als pdf (A4) in de stijl van een kookmagazine, met QR-code naar een deellink.
// De bladzijde wordt op een canvas getekend en als afbeelding in een eenvoudige pdf gezet
// (werkt zonder internet en zonder externe bibliotheken, behalve de meegeleverde QR-maker).
const RecipePdf = (() => {
  const MM = 7.5;                       // pixels per millimeter (≈ 190 dpi)
  const W = 210 * MM, H = 297 * MM;
  const C = { red: '#c62d1f', redDark: '#8e1a12', cream: '#f7f2e8', paper: '#fffdf8', teal: '#5fa3a0', mustard: '#a8821f', ink: '#2b1d14', muted: '#7a6a5c', line: '#e3d8c4', light: '#f0624f' };
  const SANS = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';
  const mm = v => v * MM;
  const pt = v => v * 0.3528 * MM;      // punten naar pixels

  let qrLoading = null;
  const loadQr = () => qrLoading || (qrLoading = new Promise((ok, fail) => {
    if (window.qrcode) return ok();
    const s = document.createElement('script');
    s.src = 'vendor/qrcode.js'; s.onload = ok; s.onerror = () => { qrLoading = null; fail(new Error('De QR-maker kon niet worden geladen.')); };
    document.head.appendChild(s);
  }));
  const loadImg = src => new Promise(ok => { if (!src) return ok(null); const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

  // Tekst met letterafstand (canvas kan dat niet overal zelf)
  function spaced(ctx, text, x, y, spacing, align = 'left') {
    const chars = [...text];
    const w = chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
    let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const prev = ctx.textAlign; ctx.textAlign = 'left';
    for (const c of chars) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + spacing; }
    ctx.textAlign = prev;
    return w;
  }
  const spacedWidth = (ctx, text, spacing) => [...text].reduce((s, c) => s + ctx.measureText(c).width, 0) + spacing * ([...text].length - 1);
  function wrap(ctx, text, width) {
    const words = text.split(/\s+/), out = [];
    let line = '';
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width <= width || !line) line = t; else { out.push(line); line = w; }
    }
    if (line) out.push(line);
    return out;
  }
  const dashed = (ctx, x1, y, x2, color = C.line, w = mm(.25)) => { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash([mm(1), mm(.8)]); ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); ctx.restore(); };
  const hline = (ctx, x1, y, x2, color, w) => { ctx.fillStyle = color; ctx.fillRect(x1, y, x2 - x1, w); };
  const fmtTime = m => { m = +m || 0; return m >= 60 ? `${Math.floor(m / 60)} u${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`; };
  const lines = s => String(s || '').split('\n').map(l => l.trim()).filter(Boolean);

  function drawCover(ctx, img, x, y, w, h) {
    const r = Math.max(w / img.width, h / img.height), sw = w / r, sh = h / r;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  }
  function wordmark(ctx, x, y, size, align = 'left') {
    ctx.font = `400 ${size}px "Bebas Neue"`;
    const w = spacedWidth(ctx, 'RICETTA', size * .05), x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    const g = ctx.createLinearGradient(x0, y - size, x0 + w, y);
    [[0, C.redDark], [.32, C.red], [.46, C.light], [.6, C.red], [1, C.redDark]].forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; spaced(ctx, 'RICETTA', x0, y, size * .05);
  }
  function stat(ctx, label, value, cx, y) {
    ctx.fillStyle = C.mustard; ctx.font = `500 ${pt(6.5)}px Oswald`; spaced(ctx, label.toUpperCase(), cx, y, pt(6.5) * .18, 'center');
    ctx.fillStyle = C.ink; ctx.font = `400 ${pt(15)}px "Bebas Neue"`; spaced(ctx, value.toUpperCase(), cx, y + pt(15) * .95, pt(15) * .04, 'center');
  }

  // Lijsten (ingrediënten en stappen) opmaken als blokken met hoogte; daarna over kolommen verdelen
  function blocks(ctx, kind, list, width, s) {
    const out = []; let n = 0;
    const fs = pt(8.2 * s), lh = fs * 1.36;
    for (const l of list) {
      if (l.startsWith('#')) { out.push({ type: 'sub', text: l.replace(/^#+\s*/, '').toUpperCase(), h: pt(8 * s) + mm(3.6) }); continue; }
      ctx.font = `400 ${fs}px ${SANS}`;
      if (kind === 'ing') { const t = wrap(ctx, l, width - mm(4)); out.push({ type: 'ing', lines: t, h: t.length * lh + mm(1.5) }); }
      else { const t = wrap(ctx, l, width - mm(8.2)); out.push({ type: 'step', n: ++n, lines: t, h: Math.max(t.length * lh, mm(5.4)) + mm(1.8) }); }
    }
    return { items: out, fs, lh };
  }
  function drawBlock(ctx, b, x, y, width, fs, lh, s) {
    if (b.type === 'sub') { ctx.fillStyle = C.mustard; ctx.font = `500 ${pt(8 * s)}px Oswald`; spaced(ctx, b.text, x, y + mm(2.2) + pt(8 * s) * .8, pt(8 * s) * .16); return; }
    ctx.font = `400 ${fs}px ${SANS}`; ctx.fillStyle = C.ink; ctx.textBaseline = 'alphabetic';
    if (b.type === 'ing') {
      ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(x + mm(.8), y + mm(.75) + lh * .45, mm(.8), 0, 7); ctx.fill();
      ctx.fillStyle = C.ink; b.lines.forEach((t, i) => ctx.fillText(t, x + mm(4), y + mm(.75) + fs + i * lh - fs * .12));
      dashed(ctx, x, y + b.h - mm(.2), x + width);
    } else {
      const r = mm(2.7), cx = x + r, cy = y + mm(.9) + r;
      ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff8ee'; ctx.font = `400 ${pt(9.5 * s)}px "Bebas Neue"`; ctx.textAlign = 'center'; ctx.fillText(String(b.n), cx, cy + pt(9.5 * s) * .36); ctx.textAlign = 'left';
      ctx.font = `400 ${fs}px ${SANS}`; ctx.fillStyle = C.ink;
      b.lines.forEach((t, i) => ctx.fillText(t, x + mm(8.2), y + mm(.9) + fs + i * lh - fs * .1));
    }
  }
  function heading(ctx, text, x, y, width) {
    ctx.fillStyle = C.ink; ctx.font = `400 ${pt(17)}px "Bebas Neue"`;
    const w = spaced(ctx, text.toUpperCase(), x, y + pt(17) * .8, pt(17) * .06);
    dashed(ctx, x + w + mm(3), y + pt(17) * .45, x + width, C.line, mm(.3));
  }
  // Blokken over kolommen verdelen; geeft terug wat niet meer paste
  function flow(items, cols, top, bottom) {
    const placed = []; let c = 0, y = top;
    for (let i = 0; i < items.length; i++) {
      const b = items[i];
      // kopje niet onderaan een kolom laten hangen
      const need = b.type === 'sub' && items[i + 1] ? b.h + items[i + 1].h : b.h;
      if (y + need > bottom && y > top) { c++; y = top; }
      if (c >= cols.length) return { placed, rest: items.slice(i) };
      placed.push({ b, x: cols[c].x, y, w: cols[c].w }); y += b.h;
    }
    return { placed, rest: [] };
  }

  function promo(ctx, url, from) {
    const x = mm(14), w = mm(182), h = mm(28), y = H - mm(8) - h;
    ctx.fillStyle = C.paper; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = C.teal; ctx.lineWidth = mm(.3);
    ctx.strokeRect(x + mm(.15), y + mm(.15), w - mm(.3), h - mm(.3)); ctx.strokeRect(x + mm(.9), y + mm(.9), w - mm(1.8), h - mm(1.8));
    // QR-code
    const q = window.qrcode(0, 'M'); q.addData(url); q.make();
    const n = q.getModuleCount(), size = mm(20), qx = x + mm(4), qy = y + (h - size) / 2, cell = size / n;
    ctx.fillStyle = '#fff'; ctx.fillRect(qx - mm(1), qy - mm(1), size + mm(2), size + mm(2));
    ctx.fillStyle = C.ink;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(qx + c * cell, qy + r * cell, cell + .6, cell + .6);
    const tx = qx + size + mm(5), tw = mm(102);
    ctx.fillStyle = C.mustard; ctx.font = `500 ${pt(8)}px Oswald`; spaced(ctx, 'SCAN EN KOOK MEE', tx, y + mm(7), pt(8) * .2);
    ctx.fillStyle = C.ink; ctx.font = `400 ${pt(13.5)}px "Bebas Neue"`; spaced(ctx, 'ZET DIT RECEPT MET ÉÉN TIK IN JE EIGEN RICETTA', tx, y + mm(12.6), pt(13.5) * .04);
    ctx.fillStyle = C.muted; ctx.font = `400 ${pt(7.6)}px ${SANS}`;
    wrap(ctx, 'Scan de code met je telefoon. Heb je Ricetta nog niet? Dan maak je meteen kennis met de app: al je recepten bij elkaar, een kookstand met timers, een slimme boodschappenlijst en recepten delen met vrienden.', tw)
      .slice(0, 3).forEach((t, i) => ctx.fillText(t, tx, y + mm(17) + i * pt(7.6) * 1.35));
    ctx.save(); ctx.strokeStyle = C.line; ctx.lineWidth = mm(.3); ctx.setLineDash([mm(1), mm(.8)]); ctx.beginPath(); ctx.moveTo(x + w - mm(44), y + mm(5)); ctx.lineTo(x + w - mm(44), y + h - mm(5)); ctx.stroke(); ctx.restore();
    wordmark(ctx, x + w - mm(5), y + mm(14.5), pt(26), 'right');
    ctx.fillStyle = C.muted; ctx.font = `500 ${pt(6.5)}px Oswald`;
    const by = from ? `UIT HET RICETTARIO VAN ${from.toUpperCase()}` : 'GEDEELD VIA RICETTA';
    let fsz = pt(6.5); while (spacedWidth(ctx, by, fsz * .16) > mm(36) && fsz > pt(4.5)) { fsz *= .92; ctx.font = `500 ${fsz}px Oswald`; }
    spaced(ctx, by, x + w - mm(5), y + mm(20.5), fsz * .16, 'right');
    return { qr: [qx, qy, size] };
  }

  function newPage() {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.red; for (let x = 0; x < W; x += mm(14)) ctx.fillRect(x, 0, mm(7), mm(7));
    return { cv, ctx };
  }

  async function render(r, { url, from, placeholder }) {
    await Promise.all(['400 40px "Bebas Neue"', '500 20px Oswald'].map(f => document.fonts.load(f).catch(() => {})));
    await loadQr();
    const img = await loadImg(r.photo || placeholder);
    const pages = [];
    let { cv, ctx } = newPage(); pages.push(cv);
    // Foto
    const photoH = mm(78);
    if (img) drawCover(ctx, img, 0, mm(7), W, photoH); else { ctx.fillStyle = C.line; ctx.fillRect(0, mm(7), W, photoH); }
    // Vaandel met de titel
    let ts = pt(30), title = (r.title || 'Recept').toUpperCase(), tl;
    ctx.font = `400 ${ts}px "Bebas Neue"`;
    while (spacedWidth(ctx, title, ts * .05) > mm(150) && ts > pt(20)) { ts *= .94; ctx.font = `400 ${ts}px "Bebas Neue"`; }
    tl = spacedWidth(ctx, title, ts * .05) > mm(150) ? wrap(ctx, title, mm(150)) : [title];
    const bw = Math.max(...tl.map(t => spacedWidth(ctx, t, ts * .05))) + mm(18), bh = tl.length * ts * 1.02 + mm(6), bx = (W - bw) / 2, by = mm(7) + photoH - mm(12);
    ctx.fillStyle = C.redDark;
    const tail = (x0, dir) => { ctx.beginPath(); const ty = by + mm(3), th = bh, tw = mm(10); if (dir < 0) { ctx.moveTo(x0, ty); ctx.lineTo(x0 + tw, ty); ctx.lineTo(x0 + tw, ty + th); ctx.lineTo(x0, ty + th); ctx.lineTo(x0 + tw * .32, ty + th / 2); } else { ctx.moveTo(x0, ty); ctx.lineTo(x0 + tw, ty); ctx.lineTo(x0 + tw * .68, ty + th / 2); ctx.lineTo(x0 + tw, ty + th); ctx.lineTo(x0, ty + th); } ctx.closePath(); ctx.fill(); };
    tail(bx - mm(7), -1); tail(bx + bw - mm(3), 1);
    ctx.fillStyle = C.red; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = 'rgba(255,248,238,.85)'; ctx.lineWidth = mm(.4); ctx.strokeRect(bx + mm(1.6), by + mm(1.6), bw - mm(3.2), bh - mm(3.2));
    ctx.fillStyle = '#fff8ee'; ctx.font = `400 ${ts}px "Bebas Neue"`;
    tl.forEach((t, i) => spaced(ctx, t, W / 2, by + mm(3.4) + ts * .82 + i * ts * 1.02, ts * .05, 'center'));
    let y = by + bh + mm(6);
    // Soort gerecht en omschrijving
    const kick = [...(r.courses || []), ...(r.categories || [])].slice(0, 3).join(' · ').toUpperCase();
    if (kick) { ctx.fillStyle = C.mustard; ctx.font = `500 ${pt(8)}px Oswald`; spaced(ctx, kick, W / 2, y, pt(8) * .2, 'center'); y += mm(5.5); }
    if (r.description) { ctx.fillStyle = C.muted; ctx.font = `italic 400 ${pt(10.5)}px ${SANS}`; ctx.textAlign = 'center'; ctx.fillText(r.description, W / 2, y, mm(170)); ctx.textAlign = 'left'; y += mm(4); }
    // Porties en tijd tussen dubbele lijnen
    y += mm(2);
    const dbl = yy => { hline(ctx, mm(14), yy, W - mm(14), C.teal, mm(.35)); hline(ctx, mm(14), yy + mm(.9), W - mm(14), C.teal, mm(.35)); };
    dbl(y);
    const stats = [['Porties', String(r.servings || '')], ['Voorbereiden', r.prepTime ? fmtTime(r.prepTime) : ''], ['Kooktijd', r.cookTime ? fmtTime(r.cookTime) : '']].filter(s => s[1]);
    stats.forEach((s, i) => stat(ctx, s[0], s[1], W / 2 + (i - (stats.length - 1) / 2) * mm(38), y + mm(5.5)));
    y += mm(14); dbl(y);
    const top = y + mm(6);
    // Ingrediënten links, bereiding in twee kolommen rechts; zo nodig kleiner, en anders verder op een tweede bladzijde
    const promoTop = H - mm(36) - mm(5);
    const ingX = mm(14), ingW = mm(56), stX = mm(77), stW = mm(56.5), stX2 = stX + stW + mm(6);
    let s = 1, ing, st, fIng, fSt;
    for (; s >= .7; s -= .03) {
      ing = blocks(ctx, 'ing', lines(r.ingredients), ingW, s); st = blocks(ctx, 'step', lines(r.steps), stW, s);
      fIng = flow(ing.items, [{ x: ingX, w: ingW }], top + mm(9), promoTop);
      fSt = flow(st.items, [{ x: stX, w: stW }, { x: stX2, w: stW }], top + mm(9), promoTop);
      if (!fIng.rest.length && !fSt.rest.length) break;
    }
    s = Math.max(s, .7);
    heading(ctx, 'Ingrediënten', ingX, top, ingW);
    heading(ctx, 'Bereiding', stX, top, stX2 + stW - stX);
    fIng.placed.forEach(p => drawBlock(ctx, p.b, p.x, p.y, p.w, ing.fs, ing.lh, s));
    fSt.placed.forEach(p => drawBlock(ctx, p.b, p.x, p.y, p.w, st.fs, st.lh, s));
    const links = [{ page: 0, ...promo(ctx, url, from) }];
    // Wat niet paste: op volgende bladzijden in drie kolommen
    let restIng = fIng.rest, restSt = fSt.rest;
    while (restIng.length || restSt.length) {
      ({ cv, ctx } = newPage()); pages.push(cv);
      wordmark(ctx, mm(14), mm(20), pt(18));
      ctx.fillStyle = C.muted; ctx.font = `500 ${pt(7)}px Oswald`; spaced(ctx, `${(r.title || '').toUpperCase()} · VERVOLG`, W - mm(14), mm(19), pt(7) * .18, 'right');
      const cols = [0, 1, 2].map(i => ({ x: mm(14) + i * mm(62), w: mm(56) }));
      let yy = mm(30);
      if (restIng.length) { heading(ctx, 'Ingrediënten (vervolg)', mm(14), yy, mm(182)); const f = flow(restIng, cols, yy + mm(9), H - mm(16)); f.placed.forEach(p => drawBlock(ctx, p.b, p.x, p.y, p.w, ing.fs, ing.lh, s)); restIng = f.rest; yy = Math.max(...f.placed.map(p => p.y + p.b.h), yy) + mm(8); }
      if (!restIng.length && restSt.length) { heading(ctx, 'Bereiding (vervolg)', mm(14), yy, mm(182)); const f = flow(restSt, cols, yy + mm(9), H - mm(16)); f.placed.forEach(p => drawBlock(ctx, p.b, p.x, p.y, p.w, st.fs, st.lh, s)); restSt = f.rest; }
      if (pages.length > 4) break;
    }
    return { pages, links };
  }

  // Eenvoudige pdf met per bladzijde één JPEG-afbeelding en een klikbare link op de QR-code
  async function toPdf(pages, links, url, title) {
    const enc = new TextEncoder(), parts = [], offsets = [];
    let size = 0;
    const add = d => { const b = typeof d === 'string' ? enc.encode(d) : d; parts.push(b); size += b.length; };
    const obj = (n, body) => { offsets[n] = size; add(`${n} 0 obj\n`); body(); add('\nendobj\n'); };
    const jpgs = await Promise.all(pages.map(cv => new Promise(ok => cv.toBlob(b => b.arrayBuffer().then(a => ok(new Uint8Array(a))), 'image/jpeg', .88))));
    const pw = 595.28, ph = 841.89, k = pw / W;
    const esc = s => String(s).replace(/[\\()]/g, m => '\\' + m).replace(/[^\x20-\x7e]/g, '');
    add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const n = pages.length, first = 4;   // 1 catalog, 2 pages, 3 info; per bladzijde: page, content, image (+ annot)
    obj(1, () => add('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => add(`<< /Type /Pages /Count ${n} /Kids [${pages.map((_, i) => `${first + i * 4} 0 R`).join(' ')}] >>`));
    obj(3, () => add(`<< /Title (${esc(title)}) /Creator (Ricetta) /Producer (Ricetta) >>`));
    pages.forEach((cv, i) => {
      const pn = first + i * 4, cn = pn + 1, im = pn + 2, an = pn + 3;
      const l = links.find(x => x.page === i);
      obj(pn, () => add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im${i} ${im} 0 R >> >> /Contents ${cn} 0 R${l ? ` /Annots [${an} 0 R]` : ''} >>`));
      const content = `q ${pw} 0 0 ${ph} 0 0 cm /Im${i} Do Q`;
      obj(cn, () => { add(`<< /Length ${content.length} >>\nstream\n`); add(content); add('\nendstream'); });
      obj(im, () => { add(`<< /Type /XObject /Subtype /Image /Width ${cv.width} /Height ${cv.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpgs[i].length} >>\nstream\n`); add(jpgs[i]); add('\nendstream'); });
      obj(an, () => {
        if (!l) { add('null'); return; }
        const [x, y, s] = l.qr, x1 = x * k, y1 = ph - (y + s) * k, x2 = (x + s) * k, y2 = ph - y * k;
        add(`<< /Type /Annot /Subtype /Link /Rect [${x1.toFixed(1)} ${y1.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}] /Border [0 0 0] /A << /S /URI /URI (${esc(url)}) >> >>`);
      });
    });
    const total = first + n * 4, xref = size;
    add(`xref\n0 ${total}\n0000000000 65535 f \n`);
    for (let i = 1; i < total; i++) add(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    add(`trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }

  async function make(r, opts) {
    const { pages, links } = await render(r, opts);
    return toPdf(pages, links, opts.url, r.title || 'Recept');
  }
  return { make, render };
})();
