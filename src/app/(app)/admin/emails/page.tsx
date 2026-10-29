import { requireStaff } from "@/server/admin";
import { KINDS, mailStats, preview, type Kind } from "@/server/lifecycle";
import { render } from "@/server/mailkit";
import { when } from "@/components/ui";
import { MailTest } from "../parts";

const ABOUT: Record<Kind, [string, string]> = {
  invite_24h: ["Invite code", "Everyone, about a day after sign up (22 hours to 4 days), between 10:00 and 21:00."],
  creator_setup: ["Finish verification", "Creators who started but are not verified after 24 hours (up to 7 days)."],
  creator_first_apply: ["First application", "Verified creators without any application, 2 to 21 days after sign up."],
  buyer_first_request: ["First request", "Buyers without a request, 2 to 14 days after sign up."],
  winback_14d: ["We miss you", "Anyone not seen for 14 days. Once."],
};

/* Every automatic email, as people get it, in each language. Rules: once per kind, at most one email a
   day per person, never at night (Brussels time), never to someone who switched them off. */
export default async function Emails({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { user } = await requireStaff("admin");
  const lang = (["nl", "en", "fr"].includes((await searchParams).lang ?? "") ? (await searchParams).lang : "nl") as "nl" | "en" | "fr";
  const [stats, built] = await Promise.all([mailStats(), Promise.all(KINDS.map(async (k) => ({ k, b: await preview(k, lang, user.id, user.handle) })))]);
  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Emails</h1><p>Automatic emails. Each goes once per person, at most one a day, only between 10:00 and 21:00 Brussels time, and never to someone who switched them off. Subjects and preview lines stay neutral for lock screens.</p></div>
    <div className="optrow" style={{ marginBottom: 16 }}>{(["nl", "en", "fr"] as const).map((l) => <a key={l} href={`?lang=${l}`} className={"chip" + (l === lang ? " is-on" : "")}>{l.toUpperCase()}</a>)}</div>
    <section><h2 className="bo-sh">Sent</h2>
      <div className="bo-table"><table><thead><tr><th>Email</th><th>Status</th><th className="r">Count</th><th>Last</th></tr></thead>
        <tbody>{stats.length ? stats.map((s) => <tr key={s.kind + s.status}><td>{ABOUT[s.kind as Kind]?.[0] ?? s.kind}</td><td>{s.status}</td><td className="r num">{s.n}</td><td>{when(s.last)}</td></tr>) : <tr><td colSpan={4} className="muted">None sent yet.</td></tr>}</tbody></table></div></section>
    <div className="mail-grid">{built.map(({ k, b }) => (
      <section key={k} className="card mail-card">
        <div className="mail-h"><div><b>{ABOUT[k][0]}</b><p className="t-xs muted">{ABOUT[k][1]}</p><p className="t-sm">Subject: <b>{b.subject}</b></p><p className="t-xs muted">Preview: {b.mail.preheader}</p></div><MailTest kind={k} lang={lang} /></div>
        <iframe title={k} className="mail-frame" srcDoc={render(b.mail)} />
      </section>))}</div>
  </div>);
}
