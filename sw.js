const CACHE_NAME = 'habit-pwa-v1';
  const SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './sw.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
    // Third-party (runtime cached as well)
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
  ];

  self.addEventListener('install', (event)=>{
    event.waitUntil((async ()=>{
      const cache = await caches.open(CACHE_NAME);
      try{ await cache.addAll(SHELL); }catch(e){ /* ignore CDN failures */ }
      await self.skipWaiting();
    })());
  });

  self.addEventListener('activate', (event)=>{
    event.waitUntil((async ()=>{
      const keys = await caches.keys();
      await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));
      await self.clients.claim();
    })());
  });

  self.addEventListener('fetch', (event)=>{
    const req = event.request;
    const url = new URL(req.url);

    // App shell navigation fallback
    if(req.mode === 'navigate'){
      event.respondWith((async ()=>{
        try{ return await fetch(req); }
        catch{
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('./index.html')) || Response.error();
        }
      })());
      return;
    }

    // Cache-first for same-origin and jsdelivr assets
    if(url.origin === location.origin || /(^|\.)jsdelivr\.net$/.test(url.hostname)){
      event.respondWith((async ()=>{
        const cached = await caches.match(req);
        if(cached) return cached;
        try{
          const res = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone());
          return res;
        }catch{
          return cached || fetch(req);
        }
      })());
    }
  });