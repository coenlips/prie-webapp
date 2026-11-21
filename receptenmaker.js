// Leest PDF's die met de app Receptenmaker zijn gemaakt en zet ze om naar recepten.
// Een Receptenmaker-PDF bevat: naam, bereidingstijd, foto, INGREDIËNTEN en een
// genummerde BEREIDING, met onderaan een voettekst van receptenmaker.com.

import * as pdfjs from './vendor/pdfjs/pdf.min.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;

const HEADINGS = {
  ingredients: /^ingredi[eë]nten$/i,
  steps: /^bereiding(swijze)?$/i,
  notes: /^(notities|opmerkingen|tips?)$/i,
};
const FOOTER = /(toegevoegd via receptenmaker|^receptenmaker\.com$|^pagina \d+ van \d+$|powered by tcpdf)/i;

/* ---------- Tekst in regels ---------- */

async function pageLines(page) {
  const { items } = await page.getTextContent();
  const rows = [];
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const x = it.transform[4], y = it.transform[5];
    let row = rows.find(r => Math.abs(r.y - y) < 3);
    if (!row) rows.push(row = { y, parts: [] });
    row.parts.push({ x, w: it.width, str: it.str });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map(r => {
    r.parts.sort((a, b) => a.x - b.x);
    let text = '', end = null;
    for (const p of r.parts) {
      if (end !== null && p.x - end > 1 && !/\s$/.test(text) && !/^\s/.test(p.str)) text += ' ';
      text += p.str;
      end = p.x + p.w;
    }
    const first = r.parts[0];
    const firstWord = first.str.trim().split(/\s+/)[0];
    return {
      text: text.replace(/\s+/g, ' ').trim(),
      left: first.x,
      right: end,
      // geschatte breedte van het eerste woord, om afgebroken regels te herkennen
      firstWordW: first.w * (firstWord.length / Math.max(1, first.str.length)),
    };
  });
}

/* ---------- Foto ---------- */

async function largestImage(page) {
  const ops = await page.getOperatorList();
  const names = [];
  ops.fnArray.forEach((fn, i) => {
    if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintJpegXObject) names.push(ops.argsArray[i][0]);
  });
  let best = null;
  for (const name of names) {
    const img = await new Promise(res => {
      const get = store => { try { store.get(name, res); return true; } catch { return false; } };
      if (!get(page.objs)) get(page.commonObjs) || res(null);
    });
    if (img && (!best || img.width * img.height > best.width * best.height)) best = img;
  }
  if (!best || best.width < 100) return '';

  const max = 1200;
  const scale = Math.min(1, max / Math.max(best.width, best.height));
  const c = document.createElement('canvas');
  c.width = Math.round(best.width * scale);
  c.height = Math.round(best.height * scale);
  const ctx = c.getContext('2d');

  if (best.bitmap) {
    ctx.drawImage(best.bitmap, 0, 0, c.width, c.height);
  } else if (best.data) {
    const full = document.createElement('canvas');
    full.width = best.width; full.height = best.height;
    const id = full.getContext('2d').createImageData(best.width, best.height);
    const src = best.data, n = best.width * best.height;
    if (src.length === n * 4) id.data.set(src);
    else if (src.length === n * 3) for (let i = 0; i < n; i++) {
      id.data[i * 4] = src[i * 3]; id.data[i * 4 + 1] = src[i * 3 + 1]; id.data[i * 4 + 2] = src[i * 3 + 2]; id.data[i * 4 + 3] = 255;
    } else return '';
    full.getContext('2d').putImageData(id, 0, 0);
    ctx.drawImage(full, 0, 0, c.width, c.height);
  } else {
    return '';
  }
  return c.toDataURL('image/jpeg', 0.8);
}

/* ---------- Omzetten naar recept ---------- */

function parseMinutes(s) {
  const h = s.match(/(\d+(?:[.,]\d+)?)\s*(uur|u\b)/i);
  const m = s.match(/(\d+)\s*min/i);
  if (!h && !m) return 0;
  return Math.round((h ? parseFloat(h[1].replace(',', '.')) * 60 : 0) + (m ? +m[1] : 0));
}

const parenBalance = s => (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;

// Voegt regels samen die in de PDF over twee regels zijn afgebroken.
function joinWrapped(lines, rightMargin) {
  const out = [];
  for (const l of lines) {
    const prev = out[out.length - 1];
    const wrapped = prev && (
      parenBalance(prev.text) > 0 ||
      prev.right + 4 + l.firstWordW > rightMargin - 2
    );
    if (wrapped) { prev.text += ' ' + l.text; prev.right = l.right; }
    else out.push({ ...l });
  }
  return out.map(l => l.text);
}

const capitalize = s => s ? s[0].toLocaleUpperCase('nl') + s.slice(1) : s;

export async function parsePdf(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  const meta = await doc.getMetadata().catch(() => null);

  let lines = [];
  for (let i = 1; i <= doc.numPages; i++) {
    lines.push(...(await pageLines(await doc.getPage(i))).filter(l => !FOOTER.test(l.text)));
  }
  const photo = await largestImage(await doc.getPage(1)).catch(() => '');
  await doc.destroy();

  const metaTitle = meta?.info?.Title?.trim();
  const title = capitalize(metaTitle || lines[0]?.text || file.name.replace(/\.pdf$/i, '').replace(/_/g, ' '));
  if (lines[0] && lines[0].text.toLowerCase() === title.toLowerCase()) lines = lines.slice(1);

  // In secties verdelen
  const sections = { intro: [], ingredients: [], steps: [], notes: [] };
  let current = 'intro';
  for (const l of lines) {
    const key = Object.keys(HEADINGS).find(k => HEADINGS[k].test(l.text));
    if (key) { current = key; continue; }
    sections[current].push(l);
  }

  const rightMargin = Math.max(...lines.map(l => l.right));

  // Intro: bereidingstijd, porties, overige tekst als omschrijving
  let time = 0, servings = 0;
  const desc = [];
  for (const { text } of sections.intro) {
    const p = text.match(/(\d+)\s*(personen|persoon|porties?|stuks)/i);
    if (p && !servings) { servings = +p[1]; continue; }
    const t = parseMinutes(text);
    if (t && !time && text.length < 40) { time = t; continue; }
    desc.push(text);
  }

  // Bereiding: een nieuwe stap begint met een nummer
  const steps = [];
  for (const { text } of sections.steps) {
    const m = text.match(/^(\d+)[.)]?\s+(.*)$/);
    if (m && +m[1] === steps.length + 1) steps.push(m[2]);
    else if (steps.length) steps[steps.length - 1] += ' ' + text;
    else steps.push(text);
  }

  if (!sections.ingredients.length && !steps.length) {
    throw new Error('geen ingrediënten of bereiding gevonden');
  }

  return {
    title,
    description: desc.join(' '),
    servings: servings || 4,
    servingsGuessed: !servings,
    prepTime: time || '',
    cookTime: '',
    ingredients: joinWrapped(sections.ingredients, rightMargin).join('\n'),
    steps: steps.join('\n'),
    notes: joinWrapped(sections.notes, rightMargin).join('\n'),
    photo,
    tags: [],
    category: '',
  };
}
