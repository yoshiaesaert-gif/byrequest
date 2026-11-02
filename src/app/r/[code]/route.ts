import { NextResponse, type NextRequest } from "next/server";
import { linkOpened } from "@/server/referrals";
import { currentUser } from "@/server/auth";
import { REF_COOKIE, REF_COOKIE_DAYS, normalizeCode } from "@/domain/referral";

/* Invite link: byrequest.me/r/CODE. Remembers the code for 30 days and opens sign up on the right
   side (creators by default, ?as=buy for buyers). An unknown code still lands on sign up, untagged. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const as = req.nextUrl.searchParams.get("as") === "buy" ? "buy" : "earn";
  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "").trim();
  const me = await currentUser().catch(() => null);
  const dev = req.cookies.get("brq_dev")?.value ?? null;   // the account that last used this browser
  const o = await linkOpened(code, { ua: req.headers.get("user-agent") ?? "", ip, userId: me?.id ?? dev, ch: req.nextUrl.searchParams.get("c") }).catch(() => null);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  // Creators land on the creator page first (what it is, live budgets, real reviews); buyers go straight to sign up.
  const refq = o ? `ref=${encodeURIComponent(normalizeCode(code))}` : "";
  const to = new URL(as === "earn" ? `/creators${refq ? `?${refq}` : ""}` : `/signin?as=${as}${refq ? `&${refq}` : ""}`, `${proto}://${host}`);
  const res = NextResponse.redirect(to, 302);
  if (o) res.cookies.set(REF_COOKIE, normalizeCode(code), { path: "/", sameSite: "lax", httpOnly: true, secure: proto === "https", maxAge: REF_COOKIE_DAYS * 86400 });
  return res;
}
