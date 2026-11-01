import { NextResponse, type NextRequest } from "next/server";

/* Optional password gate for hosted demo environments. Set DEMO_PASSWORD to enable it.
   Webhooks, the release worker and the health check keep their own protection. */
export function proxy(req: NextRequest) {
  // One address only: visitors on the Render address are sent to the real domain, where their session lives.
  const host = req.headers.get("host") ?? "";
  if (host.endsWith(".onrender.com") && !req.nextUrl.pathname.startsWith("/api/")) {
    const to = new URL(req.nextUrl.pathname + req.nextUrl.search, process.env.SITE_URL || "https://byrequest.me");
    return NextResponse.redirect(to, 308);
  }
  // Signed out (and every link preview): the public, share-safe version of these addresses, with a 200 and its own tags.
  if (!req.cookies.get("brq_s")) {
    const p = req.nextUrl.pathname;
    const to = p === "/" ? "/signin" : p === "/safety" ? "/share/safety" : /^\/c\/[^/]+$/.test(p) ? `/share${p}` : null;
    if (to) { const u = req.nextUrl.clone(); u.pathname = to; return gate(req, NextResponse.rewrite(u)); }
  }
  return gate(req, NextResponse.next());
}

function gate(req: NextRequest, ok: NextResponse) {
  const pass = process.env.DEMO_PASSWORD;
  if (!pass) return ok;
  const [, b64] = (req.headers.get("authorization") ?? "").split(" ");
  const [, given] = b64 ? atob(b64).split(":") : [];
  if (given === pass) return ok;
  return new NextResponse("Private demo", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="ByRequest demo", charset="UTF-8"' } });
}

// Pages only: API routes (uploads in particular) skip the proxy, which would cap request bodies at 10 MB.
export const config = { matcher: ["/((?!api/|_next/|og.png).*)"] };
