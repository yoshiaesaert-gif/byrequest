import Link from "next/link";
import { cookies } from "next/headers";
import { requireUser } from "@/server/auth";
import { unread } from "@/server/queries";
import { access } from "@/server/onboarding";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { Av, I } from "@/components/ui";
import { MenuButton, HideButton, Live } from "@/components/chrome";
import NavLinks from "@/components/navlinks";
import Footer from "@/components/footer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const mode = u.isCreator && (await cookies()).get("brq_mode")?.value === "sell" ? "sell" : "buy";
  const n = await unread(u.id);
  const staff = await db.query.staff.findFirst({ where: eq(schema.staff.userId, u.id) });
  const active = u.isCreator ? (await access(u.id)).status === "active" : false;
  const buy = mode === "buy";
  const nav = buy ? [["/", "Home"], ["/for-you", "For you"], ["/deals", "Deals"], ["/vault", "Vault"]] : [["/", "Home"], ["/for-you", "For you"], ["/deals", "Offers"], ["/studio", "Studio"]];
  const tabs = buy
    ? [["/", "home", "Home"], ["/for-you", "foryou", "For you"], ["/post", "plus", ""], ["/deals", "deals", "Deals"], ["/vault", "vault", "Vault"]]
    : [["/", "home", "Home"], ["/for-you", "foryou", "For you"], ["/deals", "deals", "Offers"], ["/inbox", "inbox", "Inbox"], ["/studio", "wallet", "Studio"]];
  const inboxBtn = <Link href="/inbox" className="icon-btn" aria-label={`Inbox${n ? `, ${n} new` : ""}`}><I n="inbox" />{n ? <span className="dot">{n > 9 ? "9+" : n}</span> : null}</Link>;
  return (
    <div className="app" data-frost={u.prefs.frost ? "on" : "off"}>
      <header className="topnav"><div className="topnav-in">
        <Link href="/" className="wordmark" aria-label="ByRequest home"><img className="lg-g" src="/logo.png" alt="byrequest" /><img className="lg-w" src="/logo_white.png" alt="" /></Link>
        <nav className="mainnav" aria-label="Main"><NavLinks items={nav} /></nav>
        <form className="navsearch" action="/for-you"><I n="search" c="sm" /><input name="q" placeholder="Search requests" aria-label="Search requests" /></form>
        <div className="navright">
          {buy ? <Link href="/post" className="btn btn-primary btn-sm"><I n="plus" c="sm" />Post a request</Link> : <span className="mode-pill">Creating</span>}
          {inboxBtn}
          <MenuButton handle={u.handle} avatar={<Av a={u.avatar} name={u.handle} size={30} />} big={<Av a={u.avatar} name={u.handle} size={44} />} mode={mode} isCreator={u.isCreator} verified={active} staff={!!staff && staff.role !== "none"} />
        </div>
      </div></header>
      <header className="mtop">
        <Link href="/" className="wordmark" aria-label="ByRequest home"><img className="lg-g" src="/logo.png" alt="byrequest" /><img className="lg-w" src="/logo_white.png" alt="" /></Link>
        <HideButton />
        {inboxBtn}
        <MenuButton compact handle={u.handle} avatar={<Av a={u.avatar} name={u.handle} size={30} />} big={<Av a={u.avatar} name={u.handle} size={44} />} mode={mode} isCreator={u.isCreator} verified={active} staff={!!staff && staff.role !== "none"} />
      </header>
      <main className="main" id="main">{children}<Footer /></main>
      <nav className="tabbar" aria-label="Tabs"><NavLinks tabs items={tabs} /></nav>
      <Live uid={u.id} discreet={u.prefs.discreetPush} neutralTab={u.prefs.neutralTab} />
    </div>
  );
}
