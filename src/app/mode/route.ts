import { currentUser } from "@/server/auth";

/* Switching between buying and creating is a plain link, so it keeps working in a tab that was
   opened before a new release (server actions from an older build no longer resolve). */
export async function GET(req: Request) {
  const u = await currentUser();
  const to = new URL(req.url).searchParams.get("to") === "sell" ? "sell" : "buy";
  // Behind the hosting proxy req.url carries the internal address (0.0.0.0), so the target is built
  // from the domain the visitor actually used.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "byrequest.me";
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0] ?? (host.startsWith("localhost") ? "http" : "https");
  const headers = new Headers({ Location: `${proto}://${host}${u ? "/" : "/signin"}`, "Cache-Control": "no-store" });
  if (u) headers.append("Set-Cookie", `brq_mode=${u.isCreator ? to : "buy"}; Path=/; Max-Age=31536000; SameSite=Lax`);
  return new Response(null, { status: 303, headers });
}
