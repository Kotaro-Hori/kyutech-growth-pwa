/* v2.4 offline shell only. NEVER cache private API response or dynamically retrieved player data. */
const CACHE_NAME='kyutech-growth-appshell-v2.4';
const BASE=new URL(self.registration.scope);
const SHELL=['index.html','cloud-app.js','cloud-app.css','styles.css','manifest.webmanifest','apple-touch-icon.png','icon-192.png','icon-512.png','demo.html','app.js','local-db.js','security-guide.html','cloud-test.html','cloud-test.js'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const c=await caches.open(CACHE_NAME);for(const file of SHELL){try{const r=await fetch(new URL(file,BASE),{cache:'reload'});if(r.ok)await c.put(new URL(file,BASE),r.clone());else if(['index.html','cloud-app.js','cloud-app.css','styles.css'].includes(file))throw Error(file)}catch(e){if(['index.html','cloud-app.js','cloud-app.css','styles.css'].includes(file))throw e}}await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE_NAME&&(k.startsWith('kyutech-growth-appshell-')||k.startsWith('kyutech-growth-v'))).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin||!url.pathname.startsWith(BASE.pathname))return;
const rel=url.pathname.slice(BASE.pathname.length);
if(req.mode==='navigate'&&rel==='cloud-test.html'){event.respondWith(fetch(req).catch(()=>new Response('接続テストはオンライン専用です。',{status:503})));return;}
if(req.mode==='navigate'&&(!rel||rel==='index.html')){event.respondWith(fetch(req).catch(async()=>{const c=await caches.open(CACHE_NAME);return await c.match(new URL('index.html',BASE))||new Response('再読み込みしてください。',{status:503})}));return;}
if(SHELL.includes(rel)){event.respondWith(fetch(req).catch(async()=>{const c=await caches.open(CACHE_NAME);return await c.match(new URL(rel,BASE))||new Response('オフラインキャッシュはありません。',{status:503})}));}
});