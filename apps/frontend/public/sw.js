/**
 * Fargo PWA — Service Worker
 * استراتژی‌های کش:
 *  - Navigation (صفحات): network-first با fallback به /offline
 *  - API (/api/*):       network-first بدون کش
 *  - آیکون‌ها/static:   stale-while-revalidate
 */

const CACHE_NAME = "fargo-cache-v1";

// منابع حیاتی که در install کش می‌شوند
const PRECACHE_URLS = ["/", "/offline", "/manifest.webmanifest"];

// ========================
// Install
// ========================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ========================
// Activate — پاک کردن کش‌های قدیمی
// ========================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ========================
// Fetch — انتخاب استراتژی بر اساس نوع درخواست
// ========================
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // فقط GET روی همین origin
  if (request.method !== "GET" || url.origin !== location.origin) return;

  // API calls: شبکه اول، کش نمی‌شود
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkOnly(request));
    return;
  }

  // درخواست‌های ناوبری (صفحات HTML): شبکه اول + offline fallback
  if (request.mode === "navigate") {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // بقیه (CSS, JS, تصاویر، آیکون‌ها): stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ========================
// استراتژی‌ها
// ========================

/** شبکه اول — برای API */
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/** شبکه اول با offline fallback — برای صفحات */
async function navigationStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // نمایش صفحه offline
    return (
      caches.match("/offline") ??
      new Response("<h1>Offline</h1>", {
        headers: { "Content-Type": "text/html" },
      })
    );
  }
}

/** کش قدیمی + بروزرسانی در پس‌زمینه — برای static assets */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached ?? (await networkFetch) ?? new Response("", { status: 404 });
}
