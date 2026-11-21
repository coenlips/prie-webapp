// Service worker: zorgt dat de app ook offline werkt.
// Verhoog VERSION na elke wijziging, samen met APP_VERSION in app.js.
const VERSION = 'v11';
const CACHE = `recepten-${VERSION}`;
const FILES = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'db.js',
  'timer.js',
  'receptenmaker.js',
  'vendor/pdfjs/pdf.min.mjs',
  'vendor/pdfjs/pdf.worker.min.mjs',
  'manifest.webmanifest',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Eerst netwerk (zodat updates direct binnenkomen), cache als terugval bij offline.
// 'no-cache' dwingt de browser om bij de server te controleren of er een nieuwere
// versie is, in plaats van een tot 10 minuten oude kopie te gebruiken.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
