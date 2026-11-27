'use strict';

// Streepjescodes tekenen (SVG) voor klantkaarten: EAN-13 als het nummer daarvoor geldig is,
// anders Code 128 (cijfers in paren via set C, overige tekens via set B).
const Barcode = (() => {
  /* ---------- EAN-13 ---------- */
  const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
  const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
  const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

  const eanCheck = d12 => (10 - [...d12].reduce((s, c, i) => s + Number(c) * (i % 2 ? 3 : 1), 0) % 10) % 10;
  const isEan13 = s => /^\d{13}$/.test(s) && eanCheck(s.slice(0, 12)) === Number(s[12]);

  function ean13Modules(s) {
    const par = PARITY[Number(s[0])];
    let bits = '101';
    for (let i = 1; i <= 6; i++) bits += (par[i - 1] === 'L' ? L : G)[Number(s[i])];
    bits += '01010';
    for (let i = 7; i <= 12; i++) bits += R[Number(s[i])];
    return bits + '101';
  }

  /* ---------- Code 128 ---------- */
  const C128 = ['212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412', '211214', '211232', '2331112'];
  const START_B = 104, START_C = 105, CODE_B = 100, CODE_C = 99, STOP = 106;

  function code128Values(s) {
    const vals = [];
    let set = null, i = 0;
    const digitsAhead = k => { let n = 0; while (k + n < s.length && /\d/.test(s[k + n])) n++; return n; };
    while (i < s.length) {
      const run = digitsAhead(i);
      // Set C loont bij minstens 4 cijfers (of het hele restant aan cijfers, even aantal)
      if (run >= 4 || (run >= 2 && run === s.length - i && run % 2 === 0)) {
        if (set !== 'C') { vals.push(set ? CODE_C : START_C); set = 'C'; }
        const n = run - (run % 2);
        for (let k = 0; k < n; k += 2) vals.push(Number(s.substr(i + k, 2)));
        i += n;
      } else {
        if (set !== 'B') { vals.push(set ? CODE_B : START_B); set = 'B'; }
        const c = s.charCodeAt(i);
        if (c < 32 || c > 126) throw new Error('Alleen cijfers, letters en gewone tekens');
        vals.push(c - 32); i++;
      }
    }
    const check = vals.reduce((sum, v, k) => sum + v * (k || 1), 0) % 103;
    return [...vals, check, STOP];
  }

  function code128Modules(s) {
    let bits = '';
    for (const v of code128Values(s)) {
      [...C128[v]].forEach((w, k) => { bits += (k % 2 ? '0' : '1').repeat(Number(w)); });
    }
    return bits;
  }

  /* ---------- Tekenen ---------- */
  // Geeft een SVG met stille zones; de breedte schaalt mee met de container.
  function svg(value, { height = 90 } = {}) {
    const v = String(value || '').replace(/\s+/g, '');
    if (!v) return '';
    const ean = isEan13(v);
    const bits = ean ? ean13Modules(v) : code128Modules(v);
    const quiet = 10;
    const w = bits.length + quiet * 2;
    let d = '', x = 0;
    while (x < bits.length) {
      if (bits[x] === '1') {
        let n = 1; while (bits[x + n] === '1') n++;
        d += `M${x + quiet} 0h${n}v${height}h-${n}z`;
        x += n;
      } else x++;
    }
    // Kleuren in style-attributen, zodat de algemene icoon-opmaak (fill: none, stroke) er niet aan zit
    return `<svg class="barcode" viewBox="0 0 ${w} ${height}" preserveAspectRatio="none" role="img" aria-label="Streepjescode ${esc(v)}" shape-rendering="crispEdges" style="background:#fff"><path d="${d}" style="fill:#000;stroke:none"/></svg>`;
  }

  return { svg, isEan13, format: v => (isEan13(String(v).replace(/\s+/g, '')) ? 'EAN-13' : 'Code 128') };
})();
