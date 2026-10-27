import { NextResponse, type NextRequest } from "next/server";

/* Optional password gate for hosted demo environments. Set DEMO_PASSWORD to enable it.
   Webhooks, the release worker and the health check keep their own protection. */
export function proxy(req: NextRequest) {
  const pass = process.env.DEMO_PASSWORD;
  if (!pass) return NextResponse.next();
  const [, b64] = (req.headers.get("authorization") ?? "").split(" ");
  const [, given] = b64 ? atob(b64).split(":") : [];
  if (given === pass) return NextResponse.next();
  return new NextResponse("Private demo", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="ByRequest demo", charset="UTF-8"' } });
}

export const config = { matcher: ["/((?!api/webhooks|api/cron|api/health).*)"] };
