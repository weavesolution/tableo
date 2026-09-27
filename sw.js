/* Mood Wala Food — service worker
   - Pages: network-first (so updates show up), cached copy if offline / very slow.
   - Icons, manifests, Google Fonts: served from cache, refreshed in background.
   - Apps Script (orders / menu / sync) is NEVER cached — always live. */
const VERSION = 'mw-v3';
const SHELL = [
  './', './index.html', './admin.html',
  './manifest.webmanifest', './admin.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './icons/admin-192.png', './icons/admin-512.png', './icons/admin-apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c =>
    Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' }))))
  ).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function networkFirst(req){
  return caches.open(VERSION).then(cache => {
    const net = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    });
    const slow = new Promise(r => setTimeout(r, 4000)).then(() =>
      cache.match(req, { ignoreSearch: true }));
    // whichever gives a usable page first; network result still updates the cache
    return Promise.any([net, slow.then(r => r || Promise.reject())])
      .catch(() => cache.match(req, { ignoreSearch: true })
        .then(r => r || cache.match('./index.html')));
  });
}

function staleWhileRevalidate(req){
  return caches.open(VERSION).then(cache => cache.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin){
    if (req.mode === 'navigate') return e.respondWith(networkFirst(req));
    if (url.pathname.endsWith('sw.js')) return;
    return e.respondWith(staleWhileRevalidate(req));
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    return e.respondWith(staleWhileRevalidate(req));
  }
  // everything else (script.google.com etc.) goes straight to the network
});
