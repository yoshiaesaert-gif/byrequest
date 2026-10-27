"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { acceptOffer } from "../../../actions";
import { toast } from "@/components/chrome";
import { VAULT_LABEL, VAULT_ORDER, type VaultPeriod } from "@/domain/rules";

type O = { id: string; status: string; showsFace: boolean; vault: VaultPeriod; etaHours: number; note: string; handle: string; look: string | null; rating: number | null; deals: number; visibility: string };
const eur2 = (c: number) => "€" + (c / 100).toFixed(2);
const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;
const eta = (h: number) => (h < 24 ? `Within ${h} hours` : h < 72 ? `Within ${h} hours` : `Within ${Math.round(h / 24)} days`);

export default function Picker({ requestId, open, dealId, money, offers }: { requestId: string; open: boolean; dealId: string | null; money: { deal: number; fee: number; total: number }; offers: O[] }) {
  const [sort, setSort] = useState("Best match");
  const [sel, setSel] = useState<string | null>(offers.find((o) => o.status === "pending")?.id ?? null);
  const [pending, start] = useTransition();
  const list = useMemo(() => {
    const l = offers.filter((o) => o.status !== "withdrawn");
    if (sort === "Top rated") return [...l].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sort === "No face") return l.filter((o) => !o.showsFace);
    if (sort === "Longest access") return [...l].sort((a, b) => VAULT_ORDER.indexOf(b.vault) - VAULT_ORDER.indexOf(a.vault));
    if (sort === "Fastest") return [...l].sort((a, b) => a.etaHours - b.etaHours);
    return l;
  }, [offers, sort]);
  const o = offers.find((x) => x.id === sel);

  return (
    <div className="two">
      <div>
        <div className="sortbar">{["Best match", "Top rated", "No face", "Longest access", "Fastest"].map((s) => <button key={s} className={"chip" + (sort === s ? " is-on" : "")} onClick={() => setSort(s)}>{s}</button>)}</div>
        {list.length === 0 ? <div className="card empty"><b className="t-h3">No offers yet</b><p className="muted t-sm">Creators usually respond within a few hours. You get a neutral notification for each offer.</p></div> : null}
        <div className="offers">{list.map((x) => {
          const locked = !open || x.status !== "pending";
          return (
            <div key={x.id} role="button" tabIndex={locked ? -1 : 0} className={"card offer" + (sel === x.id ? " is-sel" : "") + (locked && x.status !== "accepted" ? " is-dim" : "")} aria-pressed={sel === x.id} onClick={() => !locked && setSel(x.id)} onKeyDown={(e) => { if (!locked && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setSel(x.id); } }}>
              <div className="media avfill">{x.look ? <img src={x.look} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}</div>
              <div style={{ minWidth: 0 }}>
                <div className="name"><b>{x.handle}</b>{x.rating ? <span className="meta"><span className="star">★</span>{x.rating.toFixed(1)} · {x.deals} deals</span> : <span className="badge ok">New</span>}
                  <Link className="pflink" href={`/c/${x.handle}`} onClick={(e) => e.stopPropagation()}>View profile</Link></div>
                {x.note ? <p className="msg">{x.note}</p> : null}
                <div className="tags"><span className="badge brand">{x.showsFace ? "Face shown" : "No face"}</span><span className="badge"><Ico n="vault" c="sm" />Vault {VAULT_LABEL[x.vault]}</span><span className="badge"><Ico n="clock" c="sm" />{eta(x.etaHours)}</span>{x.status === "accepted" ? <span className="badge ok">Accepted</span> : null}</div>
              </div>
              <div className="price"><span className="radio" /><b className="num">{"€" + Math.round(money.deal / 100)}</b></div>
            </div>);
        })}</div>
      </div>
      <aside className="sticky"><div className="card checkout">
        {dealId ? (<>
          <span className="badge ok" style={{ alignSelf: "flex-start" }}><Ico n="check" c="sm" />Offer accepted</span>
          <b className="t-h3">Your deal has started</b><p className="t-sm muted">The other creators were told the request is closed.</p>
          <Link href={`/deals/${dealId}`} className="btn btn-primary btn-block">Open deal</Link></>)
          : o ? (<>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>{o.look ? <img src={o.look} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} /> : null}<div><b>{o.handle}</b><div className="t-sm muted">{o.showsFace ? "Face shown" : "No face"} · Vault {VAULT_LABEL[o.vault]} · {eta(o.etaHours).toLowerCase()}</div></div></div>
            <div className="breakdown"><div><span className="muted">Offer</span><span className="num">{eur2(money.deal)}</span></div><div><span className="muted">Service fee</span><span className="num">{eur2(money.fee)}</span></div><div className="tot"><span>Secured now</span><span className="num">{eur2(money.total)}</span></div></div>
            <button className="btn btn-brand btn-lg btn-block" disabled={pending || !open} onClick={() => start(async () => { const r = await acceptOffer(o.id); if (r && !r.ok) toast(r.error, "err"); })}>{pending ? "Securing payment…" : `Accept and secure ${eur2(money.total)}`}</button>
            <div className="protect"><span><Ico n="shield" c="sm" />Paid out only after review and your 24 hours to object</span><span><Ico n="lock" c="sm" />Watermarked, no download, no forwarding</span><span><Ico n="check" c="sm" />Shows as BRQ DIGITAL on your statement</span></div></>)
          : <p className="t-sm muted">Select an offer to see the total.</p>}
      </div></aside>
    </div>
  );
}
