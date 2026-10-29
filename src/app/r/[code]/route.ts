import { NextResponse, type NextRequest } from "next/server";
import { linkOpened } from "@/server/referrals";
import { REF_COOKIE, REF_COOKIE_DAYS, normalizeCode } from "@/domain/referral";

/* Invite link: byrequest.me/r/CODE. Remembers the code for 30 days and opens sign up on the right
   side (creators by default, ?as=buy for buyers). An unknown code still lands on sign up, untagged. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const as = req.nextUrl.searchParams.get("as") === "buy" ? "buy" : "earn";
  const o = await linkOpened(code).catch(() => null);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const to = new URL(`/signin?as=${as}${o ? `&ref=${encodeURIComponent(normalizeCode(code))}` : ""}`, `${proto}://${host}`);
  const res = NextResponse.redirect(to, 302);
  if (o) res.cookies.set(REF_COOKIE, normalizeCode(code), { path: "/", sameSite: "lax", httpOnly: true, secure: proto === "https", maxAge: REF_COOKIE_DAYS * 86400 });
  return res;
}
