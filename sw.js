// Sigorta Paneli — PWA service worker.
// Ağ ÖNCELİKLİ: çevrimiçiyken her zaman ağdan taze içerik gelir (bayat içerik yok,
// dev'de HMR bozulmaz). Sayfa gezinmesi ağa ulaşamazsa "Sunucuya ulaşılamıyor"
// sayfası döner. Eskiden önbellekteki "/" kabuğu dönüyordu; o kabuk istenen sayfaya
// yönlendirmeye çalışıp yine kendine düştüğü için "Yönlendiriliyor…"da takılıyordu.
const CACHE = "sigorta-shell-v2";

const CEVRIMDISI_HTML = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sunucuya ulaşılamıyor · Sigorta Paneli</title>
<style>
  :root { --bg:#f8fafc; --kart:#fff; --yazi:#0f172a; --soluk:#475569; --cizgi:#e2e8f0;
          --uyari:#b45309; --uyari-zemin:#fef3c7; --marka:#2563eb; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0f172a; --kart:#111c33; --yazi:#e2e8f0; --soluk:#94a3b8; --cizgi:#1e293b;
            --uyari:#fbbf24; --uyari-zemin:#3a2a08; --marka:#3b82f6; }
  }
  * { box-sizing:border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:16px;
         background:var(--bg); color:var(--yazi);
         font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  .kart { max-width:420px; width:100%; background:var(--kart); border:1px solid var(--cizgi);
          border-radius:14px; padding:28px 24px; text-align:center; }
  .rozet { display:inline-flex; align-items:center; gap:8px; padding:4px 12px; border-radius:999px;
           background:var(--uyari-zemin); color:var(--uyari); font-weight:600; font-size:13px; }
  .rozet i { width:8px; height:8px; border-radius:50%; background:var(--uyari); }
  h1 { font-size:20px; margin:16px 0 8px; }
  p { color:var(--soluk); margin:0 0 20px; }
  button { font:inherit; font-weight:600; color:#fff; background:var(--marka); border:0;
           border-radius:9px; padding:10px 20px; cursor:pointer; }
  small { display:block; margin-top:14px; color:var(--soluk); }
</style></head>
<body><main class="kart">
  <span class="rozet"><i></i>Bağlantı yok</span>
  <h1>Sunucuya ulaşılamıyor</h1>
  <p>İnternet bağlantını kontrol et. Bağlantın varsa sunucu uykudan uyanıyor olabilir; bu bir dakika kadar sürebilir.</p>
  <button type="button" onclick="location.reload()">Tekrar dene</button>
  <small id="sayac">Birkaç saniye içinde kendiliğinden tekrar denenecek.</small>
</main>
<script>
  var kalan = 15, s = document.getElementById("sayac");
  setInterval(function () {
    kalan -= 1;
    if (kalan <= 0) { location.reload(); return; }
    s.textContent = kalan + " sn içinde kendiliğinden tekrar denenecek.";
  }, 1000);
  window.addEventListener("online", function () { location.reload(); });
</script>
</body></html>`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;                  // yalnız GET
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // API (8002) vb. çapraz köken — dokunma
  if (req.mode === "navigate") {
    // Sayfa gezinmesi: ağ dene, ulaşılamazsa açık bir hata sayfası göster
    event.respondWith(
      fetch(req).catch(() => new Response(CEVRIMDISI_HTML, {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      }))
    );
    return;
  }
  // Statikler: ağ öncelikli; başarısızsa cache
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || Response.error()))
  );
});
