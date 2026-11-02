import NextLink from "next/link";
import type { Link } from "@/server/linkactivity";

/* One card per invite link: the numbers on top, then every copy, share, preview and open in plain words. */
const TZ = "Europe/Brussels";
const at = (d: Date) => new Date(d).toLocaleString("nl-BE", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dur = (s?: number) => s == null ? "" : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
const list = (xs: [string, number][]) => xs.length ? xs.map(([k, n]) => `${k} ${n}`).join(" · ") : "–";
const ICON: Record<string, string> = { copy: "⧉", code: "⧉", share: "↗", qr: "▦", preview: "◌", open: "●", signup: "★" };

export function LinkActivity({ links }: { links: Link[] }) {
  if (!links.length) return <p className="muted t-sm">No invite link was used yet.</p>;
  return (<div className="la">{links.map((l, i) => (
    <details key={l.code} id={l.code} className="la-card" open={i === 0}>
      <summary><b><NextLink href={`/admin/users/${l.ownerId}`}>{l.owner}</NextLink></b><span className="num">{l.code}</span><span className="la-sum">{l.k.people} {l.k.people === 1 ? "person" : "people"} reached · {l.k.signups} sign ups · last open {l.k.lastOpen ? at(l.k.lastOpen) : "never"}</span></summary>
      <dl className="la-k">
        <div><dt>Copied or shared</dt><dd className="num">{l.k.copies + l.k.shares}</dd><span>{l.k.copies} copies · {l.k.shares} shares{l.k.byCh.length ? ` (${list(l.k.byCh)})` : ""}</span></div>
        <div><dt>Pasted in chats</dt><dd className="num">{l.k.previews}</dd><span>{l.k.previews ? list(l.k.previewApps) : "no link previews seen"}</span></div>
        <div><dt>Opens</dt><dd className="num">{l.k.opens}</dd><span>{l.k.ownOpens} by {l.owner} · {l.k.opens - l.k.ownOpens} by others</span></div>
        <div className="hot"><dt>Different people</dt><dd className="num">{l.k.people}</dd><span>{l.k.people ? list(l.k.peopleCh) : "nobody else yet"}</span></div>
        <div><dt>Got interested</dt><dd className="num">{l.k.entered}</dd><span>confirmed 18+ or went to sign up</span></div>
        <div><dt>Signed up</dt><dd className="num">{l.k.signups}</dd><span>account made through the link</span></div>
      </dl>
      {l.k.people ? <p className="la-mix">Where: {list(l.k.places)}<br />Devices: {list(l.k.devices)}</p> : null}
      <ol className="la-list">{l.rows.map((r, j) => (
        <li key={j} className={`la-r k-${r.kind} w-${r.who}`}>
          <time>{at(r.at)}</time><i aria-hidden="true">{ICON[r.kind]}</i>
          <div><b>{r.vid ? <NextLink href={`/admin/visitors?v=${r.vid}`}>{r.text} ›</NextLink> : r.text}</b>
            {r.kind === "open" ? <small>{[r.device, r.place, r.secs != null ? `${dur(r.secs)} on the site` : null].filter(Boolean).join(" · ")}{r.reached ? <em>{r.uid ? <NextLink href={`/admin/users/${r.uid}`}>{r.reached} ›</NextLink> : r.reached}</em> : null}</small> : r.sub ? <small>{r.sub}</small> : null}</div>
        </li>))}</ol>
      <p className="t-xs muted">Different people are counted by network and device, so two people on one wifi with the same phone and browser count as one. What happens inside WhatsApp or another chat app is end to end encrypted: nobody can see how many people received the link, only who opened it. Links shared with the channel buttons carry the app name; the share button and copy do not.</p>
    </details>))}</div>);
}
