// Service worker Class Tekavis — dibuat manual (bukan Workbox), sengaja
// dibikin konservatif: cuma nyentuh asset statis (css/js/icon), sama
// sekali gak pernah ikut campur request ke /api/*, Supabase, atau
// Cloudinary — biar login, data realtime, dan semua fetch dinamis selalu
// dapet response fresh langsung dari jaringan, gak ada risiko ke-cache
// atau nyangkut data basi.

const CACHE_NAME = 'kelas-cms-static-v1';

// Cuma file yang PATH-nya gak berubah antar deploy (gak ada ?v= versioning)
// yang di-precache pas install. CSS/JS di-cache belakangan secara lazy
// lewat fetch handler di bawah, per-URL persis (termasuk ?v=N-nya) —
// jadi otomatis "ganti" begitu index.html nunjuk ke versi ?v= yang baru,
// gak perlu bump CACHE_NAME tiap kali ada deploy baru.
const PRECACHE_URLS = ['/', '/index.html', '/manifest.json', '/favicon.svg'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/js/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.svg'
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // JANGAN PERNAH intercept: API sendiri, manifest dinamis, Supabase, atau
  // Cloudinary. Biarin browser nge-fetch langsung kayak biasa — ini yang
  // jaga login/auth/realtime/upload foto tetap jalan normal, gak ke-cache.
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.endsWith('.supabase.co') ||
    url.hostname.includes('cloudinary.com')
  ) {
    return;
  }

  // Cuma urus request GET; POST/PATCH/DELETE dst dibiarin lewat apa adanya.
  if (req.method !== 'GET') return;

  if (isStaticAsset(url)) {
    // CACHE FIRST — asset statis (css/js/icon) jarang berubah per-URL
    // (perubahan kode selalu nembak URL ?v= baru), jadi aman diprioritaskan
    // dari cache biar kebuka instan kayak app native.
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // NETWORK FIRST — halaman (navigasi) & request GET lain: selalu coba
  // jaringan dulu biar kontennya fresh, fallback ke cache pas offline aja.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
  );
});
