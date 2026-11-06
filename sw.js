// Service worker of the installed app: the game works offline after the first visit.
// The app files come from the cache; Three.js and the fonts are cached the first time they load.
const VERSION = '101.0.0-d7b48218';
const CACHE = `full-pull-${VERSION}`;
// the build fills in the Three.js script and the font stylesheet that the page loads from other hosts
const PRECACHE = ["https://fonts.googleapis.com/css2?family=Teko:wght@500;600;700&family=Barlow+Semi+Condensed:wght@400;500;600;700&display=swap","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon.svg', ...PRECACHE];
const RUNTIME = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('full-pull-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // the game page: network first, so a new version arrives; the cache when offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          void caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // app files, Three.js and fonts: the cache first, then the network
  if (url.origin === self.location.origin || RUNTIME.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok || res.type === 'opaque') {
              const copy = res.clone();
              void caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});
