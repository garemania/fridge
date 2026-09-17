// 캐시 이름을 바꾸면 예전 캐시가 지워집니다
const CACHE = 'fridge-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 인식 서버·바코드 조회 같은 외부 요청은 캐시하지 않음
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate' ||
    url.pathname.endsWith('/') || url.pathname.endsWith('.html') || url.pathname.endsWith('.webmanifest');

  if (isPage) {
    // 화면 파일은 네트워크 우선 — 새로 올린 index.html이 새로고침만으로 반영됨
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
        return res;
      }).catch(() =>
        caches.match(req).then(hit => hit || caches.match('./index.html'))
      )
    );
    return;
  }

  // 아이콘 등 나머지는 캐시 우선
  e.respondWith(
    caches.match(req).then(hit =>
      hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
        return res;
      })
    )
  );
});
