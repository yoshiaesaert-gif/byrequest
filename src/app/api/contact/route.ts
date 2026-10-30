import { headers } from "next/headers";
import { currentUser } from "@/server/auth";
import { sendContact } from "@/server/issues";
import { RuleError } from "@/domain/rules";

/* Contact form: no account needed. A hidden field catches bots. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { message?: string; topic?: string; contact?: string; site?: string } | null;
  if (!b || typeof b.message !== "string") return Response.json({ error: "Tell us a little more, so we can help." }, { status: 400 });
  if (b.site) return Response.json({ ok: true });   // honeypot: pretend it worked
  const h = await headers();
  const ip = (h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0] || "").trim();
  const u = await currentUser().catch(() => null);
  try { await sendContact({ message: b.message, topic: String(b.topic ?? ""), contact: String(b.contact ?? "") }, { userId: u?.id ?? null, ip }); return Response.json({ ok: true }); }
  catch (e) { return Response.json({ error: e instanceof RuleError ? e.message : "That did not work. Please try again." }, { status: 400 }); }
}
