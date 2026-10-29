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
  const pass = process.env.DEMO_PASSWORD;
  if (!pass) return NextResponse.next();
  const [, b64] = (req.headers.get("authorization") ?? "").split(" ");
  const [, given] = b64 ? atob(b64).split(":") : [];
  if (given === pass) return NextResponse.next();
  return new NextResponse("Private demo", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="ByRequest demo", charset="UTF-8"' } });
}

export const config = { matcher: ["/((?!api/webhooks|api/cron|api/health).*)"] };
