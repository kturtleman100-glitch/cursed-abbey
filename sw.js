// 오프라인 저장소 (서비스 워커)
// 한 번 받은 게임 파일을 브라우저에 저장해 두어, 다음부터는 빠르게 열리고 인터넷이 없어도 실행된다.
// 1795774443418 는 `npm run build` 때 빌드 시각으로 바뀐다 → 새 버전을 올리면 옛 저장분은 자동으로 지워진다.
const CACHE = 'cursed-abbey-1795774443418';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const font = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !font) return;

  // 페이지 자체: 인터넷이 되면 항상 새 버전, 안 되면 저장된 것
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match('./index.html')) || Response.error()),
    );
    return;
  }

  // 모델·텍스처·소리·코드: 저장된 것이 있으면 바로 쓰고, 없으면 받아서 저장
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }),
  );
});
