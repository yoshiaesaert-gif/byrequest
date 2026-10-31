/* ByRequest service worker. It makes the site installable and makes sure the app never gets stuck on a dead
   screen: no connection, a restart or an update in progress shows a calm ByRequest screen that checks by itself
   and opens the page again as soon as the site answers. It never stores pages, chats or media. */
const PAGE = (nl) => `<!doctype html><html lang="${nl ? "nl" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0B0A12"><title>ByRequest</title>
<style>html,body{margin:0;height:100%}body{display:grid;place-items:center;font:16px/1.5 -apple-system,system-ui,sans-serif;background:#0B0A12;color:#F4F1EA;text-align:center;padding:24px;box-sizing:border-box}
.c{max-width:340px}.d{display:inline-flex;gap:6px;margin-bottom:22px}.d i{width:9px;height:9px;border-radius:50%;background:linear-gradient(135deg,#FFD66B,#E0559A);animation:p 1.2s infinite ease-in-out}.d i:nth-child(2){animation-delay:.15s}.d i:nth-child(3){animation-delay:.3s}
@keyframes p{0%,80%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:none}}
b{display:block;font-size:1.35rem;margin-bottom:6px;letter-spacing:-.01em}p{margin:0;color:rgba(244,241,234,.7)}
.a{display:flex;gap:10px;justify-content:center;margin-top:24px}a,button{border:0;border-radius:12px;padding:12px 20px;font:inherit;font-weight:700;text-decoration:none;cursor:pointer}
button{background:linear-gradient(90deg,#FFD66B,#F59A3E 32%,#E0559A 68%,#A262F5);color:#1A0B2E}a{background:rgba(244,241,234,.1);color:#F4F1EA}</style></head>
<body><div class="c"><div class="d"><i></i><i></i><i></i></div>
<b>${nl ? "Even geduld" : "One moment"}</b><p>${nl ? "ByRequest is zo terug. Deze pagina opent vanzelf zodra het weer werkt. Je berichten en uploads zijn veilig." : "ByRequest is back in a moment. This page opens by itself as soon as it works again. Your messages and uploads are safe."}</p>
<div class="a"><button onclick="location.reload()">${nl ? "Opnieuw" : "Try again"}</button><a href="/">${nl ? "Naar home" : "Home"}</a></div></div>
<script>(function(){var n=0;function t(){fetch("/api/health",{cache:"no-store"}).then(function(r){if(r.ok)location.reload();else s()}).catch(s)}function s(){n++;setTimeout(t,Math.min(15000,2000+n*1000))}s()})()</script></body></html>`;
const wait = (req) => new Response(PAGE(/^nl/i.test(req.headers.get("accept-language") || "")), { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).then((r) => {
    // Our own pages, including our 404 and error page, are HTML and pass through. The hosting edge answers 502,
    // 503 or 504, or a bare non HTML error, while the server restarts: that gets the waiting screen instead.
    const html = (r.headers.get("content-type") || "").includes("text/html");
    return (r.status >= 502 && r.status <= 504) || (!html && r.status >= 400) ? wait(e.request) : r;
  }).catch(() => wait(e.request)));
});

/* Notifications (Web Push). The text is already discreet when the person chose so; tapping opens the right page. */
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: "ByRequest", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "ByRequest", { body: d.body || "", icon: "/app-192.png", badge: "/app-192.png", tag: d.tag || "brq", renotify: true, data: { href: d.href || "/inbox" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const href = (e.notification.data && e.notification.data.href) || "/inbox";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ("focus" in c) { c.navigate(href).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(href);
  }));
});
