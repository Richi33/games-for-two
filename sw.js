const C = 'g2-v2';
const PRE = ['/offline.html', '/manifest.webmanifest', '/icon-192.png', '/favicon.svg'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c => Promise.all(PRE.map(u => c.add(u).catch(() => {})))));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {                              // сторінка: мережа, а без мережі — «Немає мережі»
    e.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }
  e.respondWith(
    fetch(req)
      .then(r => { if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(req, cp)); } return r; })
      .catch(() => caches.match(req))
  );
});
