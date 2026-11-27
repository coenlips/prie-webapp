'use strict';

// Streepjescode van een klantkaart scannen met de camera.
// Gebruikt zxing (vendor/zxing, MIT/Apache), alleen geladen als je echt gaat scannen;
// alles gebeurt op het toestel, er gaat geen beeld naar internet.
const Scanner = (() => {
  const FORMATS = ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E', 'Code128', 'Code39', 'ITF', 'Codabar', 'QRCode', 'DataMatrix', 'PDF417'];
  let ready = null;

  function load() {
    if (ready) return ready;
    ready = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/zxing/zxing-reader.js';
      s.onload = () => {
        try {
          // Het rekenhart (wasm) van onze eigen site halen, niet van een CDN
          ZXingWASM.prepareZXingModule({ overrides: { locateFile: p => `vendor/zxing/${p}` }, fireImmediately: true })
            .then(() => resolve(ZXingWASM), reject);
        } catch (e) { reject(e); }
      };
      s.onerror = () => reject(new Error('De scanner kon niet geladen worden. Ben je online?'));
      document.head.appendChild(s);
    }).catch(e => { ready = null; throw e; });
    return ready;
  }

  const clean = t => String(t || '').replace(/\s+/g, '');

  async function fromImage(file) {
    const Z = await load();
    const r = await Z.readBarcodes(file, { formats: FORMATS, tryHarder: true, maxNumberOfSymbols: 1 });
    return r.length ? clean(r[0].text) : '';
  }

  // Opent de zoeker. Geeft het gescande nummer terug, of '' bij annuleren.
  function open() {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'scan-view';
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-label', 'Scan je kaart');
      wrap.innerHTML = `
        <video class="cam" playsinline muted autoplay></video>
        <div class="scan-top"><button type="button" id="scanCancel">Annuleer</button><b>Scan je kaart</b><span></span></div>
        <div class="scan-frame"><div class="scan-line"></div></div>
        <p class="scan-hint" id="scanHint">Camera starten…</p>
        <div class="scan-bottom">
          <label class="btn ghost scan-photo">📷 Of maak een foto<input type="file" accept="image/*" capture="environment" id="scanFile" hidden></label>
        </div>`;
      document.body.appendChild(wrap);
      document.body.classList.add('scanning');
      const video = wrap.querySelector('video'), hint = wrap.querySelector('#scanHint'), frame = wrap.querySelector('.scan-frame');
      const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
      let stream = null, timer = null, done = false;

      const finish = value => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (stream) stream.getTracks().forEach(t => t.stop());
        const close = () => { wrap.remove(); document.body.classList.remove('scanning'); resolve(value); };
        if (value) {
          frame.classList.add('found'); frame.innerHTML = '';
          hint.outerHTML = `<div class="scan-ok">✓ ${esc(value.replace(/(.{4})(?=.)/g, '$1 '))}</div>`;
          if (navigator.vibrate) navigator.vibrate(60);
          setTimeout(close, 700);
        } else close();
      };
      wrap.querySelector('#scanCancel').onclick = () => finish('');

      // Foto als reserve (of als de camera niet live mag)
      wrap.querySelector('#scanFile').addEventListener('change', async e => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        hint.textContent = 'Foto bekijken…';
        try {
          const v = await fromImage(f);
          if (v) finish(v); else hint.textContent = 'Geen streepjescode gevonden. Probeer het nog eens, wat dichterbij en met genoeg licht.';
        } catch (err) { hint.textContent = err.message; }
        e.target.value = '';
      });

      // Live: elk beeldje het stuk in het kader bekijken
      const tick = async Z => {
        if (done) return;
        if (video.readyState >= 2 && video.videoWidth) {
          const vw = video.videoWidth, vh = video.videoHeight;
          // Het kader beslaat ongeveer het midden; ruim nemen zodat scheve kaarten ook lukken
          const w = Math.round(vw * 0.9), h = Math.round(vh * 0.5);
          canvas.width = w; canvas.height = h;
          ctx.drawImage(video, (vw - w) / 2, (vh - h) / 2, w, h, 0, 0, w, h);
          try {
            const r = await Z.readBarcodes(ctx.getImageData(0, 0, w, h), { formats: FORMATS, tryHarder: false, maxNumberOfSymbols: 1 });
            if (r.length && r[0].text) return finish(clean(r[0].text));
          } catch { /* volgende beeldje */ }
        }
        timer = setTimeout(() => tick(Z), 180);
      };

      (async () => {
        let Z;
        try { Z = await load(); } catch (e) { hint.textContent = e.message; return; }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          hint.textContent = 'Live scannen kan hier niet. Maak een foto van de streepjescode.';
          return;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
          if (done) { stream.getTracks().forEach(t => t.stop()); return; }
          video.srcObject = stream;
          await video.play().catch(() => {});
          hint.textContent = 'Houd de streepjescode in het kader';
          tick(Z);
        } catch {
          hint.textContent = 'Geen toegang tot de camera. Sta de camera toe, of maak een foto van de streepjescode.';
        }
      })();
    });
  }

  return { open, fromImage, load };
})();
