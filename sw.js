/* KYUTECH GROWTH v1.1.1 — offline-first app shell. */
const CACHE_NAME = 'kyutech-growth-appshell-v1.1.1';
const CACHE_PREFIXES = ['kyutech-growth-appshell-', 'kyutech-growth-v'];
const BASE = new URL(self.registration.scope);
const SHELL = ['index.html', 'app.js', 'styles.css', 'manifest.webmanifest',
               'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];
const canonical = name => new URL(name, BASE).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // The HTML, JS, and CSS must all be cached before an offline launch is possible.
    // Add other files separately so a missing icon never breaks the entire install.
    for (const file of SHELL) {
      try {
        const response = await fetch(new Request(canonical(file), {cache: 'reload'}));
        if (!response.ok || response.type === 'opaque') throw new Error(file + ': HTTP ' + response.status);
        await cache.put(canonical(file), response);
      } catch (err) {
        if (['index.html', 'app.js', 'styles.css'].includes(file)) throw err;
        console.warn('Optional PWA asset could not be cached:', file, err);
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME && CACHE_PREFIXES.some(p => k.startsWith(p)))
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // iOS Home Screen navigation must work with no Wi-Fi; ignore cache-busting query strings.
    if (req.mode === 'navigate') {
      const saved = await cache.match(canonical('index.html'));
      if (saved) return saved;
      try { return await fetch(req); }
      catch { return new Response('オフライン用の準備が完了していません。Wi-Fiに接続してアプリを一度開いてください。',
        {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}); }
    }
    const rel = url.pathname.slice(BASE.pathname.length);
    const local = SHELL.includes(rel);
    if (local) {
      const saved = await cache.match(canonical(rel));
      if (saved) return saved;
    }
    return fetch(req);
  })());
});
