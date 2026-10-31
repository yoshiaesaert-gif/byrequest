import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/server/auth";

/* Stars for the help assistant at the end of a conversation. One rating per person per ten minutes is enough. */
export async function POST(req: Request) {
  const u = await requireUser();
  const b = (await req.json().catch(() => null)) as { stars?: number; comment?: string; role?: string; filed?: boolean; turns?: { role: string; content: string }[] } | null;
  const stars = Math.round(Number(b?.stars));
  if (!(stars >= 1 && stars <= 5)) return Response.json({ error: "Pick 1 to 5 stars." }, { status: 400 });
  const recent = await db.query.helpRatings.findFirst({ where: and(eq(schema.helpRatings.userId, u.id), gt(schema.helpRatings.createdAt, new Date(Date.now() - 600_000))) });
  const conversation = (b?.turns ?? []).slice(-12).map((x) => `${x.role === "user" ? "user" : "assistant"}: ${String(x.content).slice(0, 400)}`).join("\n").slice(-2500);
  const values = { stars, comment: b?.comment?.trim().slice(0, 500) || null, role: b?.role === "creator" ? "creator" : "buyer", filed: !!b?.filed, turns: (b?.turns ?? []).length, conversation };
  if (recent) await db.update(schema.helpRatings).set(values).where(eq(schema.helpRatings.id, recent.id));
  else await db.insert(schema.helpRatings).values({ userId: u.id, ...values });
  return Response.json({ ok: true });
}
