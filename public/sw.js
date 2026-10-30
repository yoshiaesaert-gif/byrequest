/* ByRequest service worker. It makes the site installable and shows a calm screen when there is no connection.
   It never stores pages, chats or media: everything private always comes fresh from the server. */
const OFFLINE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ByRequest</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.5 -apple-system,system-ui,sans-serif;background:#F7F7F4;color:#0E1013;text-align:center;padding:24px}
b{display:block;font-size:1.3rem;margin-bottom:6px}button{margin-top:18px;border:0;border-radius:999px;padding:12px 22px;background:#14151A;color:#fff;font:inherit;font-weight:700}</style></head>
<body><div><b>You are offline</b>ByRequest needs a connection. Your messages and uploads are safe.<br><button onclick="location.reload()">Try again</button></div></body></html>`;
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
