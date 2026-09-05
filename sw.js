/* AWS CLF 問題集 サービスワーカー
   方針: アプリ本体(index.html等)はキャッシュしてオフラインでも起動できるようにする。
   stale-while-revalidate = まずキャッシュを即返し、裏で最新を取り直して次回に反映。
   ※ questions.json は端末ごとに違う/公開版には無いので precache せず、常にnetwork-onlyで取得する（キャッシュに古い問題数が残るのを防ぐ）。 */
const CACHE = "awsq-v26";
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
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("questions.json")) { e.respondWith(fetch(req)); return; }
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
