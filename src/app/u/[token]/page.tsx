import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getT } from "@/i18n/server";
import { checkUnsub } from "@/server/mailkit";
import { log } from "@/server/onboarding";

/* One tap unsubscribe from tips and reminders, straight from the email, without signing in.
   Codes and messages about your own deals keep coming. */
export default async function Unsubscribe({ params }: { params: Promise<{ token: string }> }) {
  const { t } = await getT();
  const id = checkUnsub((await params).token);
  const u = id ? await db.query.users.findFirst({ where: eq(schema.users.id, id) }) : null;
  if (u && !u.prefs.mailOff) {
    await db.update(schema.users).set({ prefs: { ...u.prefs, mailOff: true } }).where(eq(schema.users.id, u.id));
    await log(db, `user:${u.id}`, "mail.unsubscribed", u.id);
  }
  return (<main className="unsub"><img src="/logo.png" alt="byrequest" height={34} />
    <h1 className="t-h2">{u ? t("You are unsubscribed") : t("This link no longer works")}</h1>
    <p className="muted">{u ? t("No more tips and reminders. Sign in codes and messages about your own deals still arrive. You can switch tips back on in your settings.") : t("Sign in and change your email settings under Profile and privacy.")}</p>
    <Link className="btn btn-primary" href="/">{t("Go to ByRequest")}</Link></main>);
}
