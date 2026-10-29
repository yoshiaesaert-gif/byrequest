import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { checkUnsub } from "@/server/mailkit";
import { log } from "@/server/onboarding";

/* One click unsubscribe for mail apps (RFC 8058): Gmail and Apple Mail post here from their own button. */
export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const id = checkUnsub((await params).token);
  const u = id ? await db.query.users.findFirst({ where: eq(schema.users.id, id) }) : null;
  if (u && !u.prefs.mailOff) {
    await db.update(schema.users).set({ prefs: { ...u.prefs, mailOff: true } }).where(eq(schema.users.id, u.id));
    await log(db, `user:${u.id}`, "mail.unsubscribed", u.id, { via: "one-click" });
  }
  return new Response(null, { status: 204 });
}
