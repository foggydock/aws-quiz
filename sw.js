/* AWS CLF 問題集 サービスワーカー
   方針: アプリ本体(index.html等)はキャッシュしてオフラインでも起動できるようにする。
   stale-while-revalidate = まずキャッシュを即返し、裏で最新を取り直して次回に反映。
   ※ questions.json は端末ごとに違う/公開版には無いので precache しない（取得失敗してもアプリは動く）。 */
const CACHE = "awsq-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
