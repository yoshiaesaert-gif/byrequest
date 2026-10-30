import { cookies, headers } from "next/headers";
import { currentUser } from "@/server/auth";
import { beat, type Beat } from "@/server/analytics";
import { REF_COOKIE } from "@/domain/referral";

/* Receives page views, clicks and heartbeats from the tracker. Never fails the page. */
export async function POST(req: Request) {
  try {
    const b = JSON.parse(await req.text()) as Beat;
    if (!b || typeof b.p !== "string" || !["page", "click", "ping"].includes(b.k)) return new Response(null, { status: 204 });
    const h = await headers();
    const ip = (h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "").trim();
    const u = await currentUser().catch(() => null);
    // Team devices are never counted: once an internal account used this browser it stays out, also signed out.
    const jar = await cookies();
    if (u?.internal) { jar.set("brq_int", "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 400 * 86400 }); return new Response(null, { status: 204 }); }
    if (jar.get("brq_int")) return new Response(null, { status: 204 });
    const s = await beat(b, { ip, ua: h.get("user-agent") ?? "", userId: u?.id ?? null, refCode: jar.get(REF_COOKIE)?.value ?? null });
    return Response.json({ s }, { headers: { "Cache-Control": "no-store" } });
  } catch { return new Response(null, { status: 204 }); }
}
