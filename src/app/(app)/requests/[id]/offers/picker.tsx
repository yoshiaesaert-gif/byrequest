"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { acceptOffer } from "../../../actions";
import { toast } from "@/components/chrome";
import { VAULT_LABEL, VAULT_ORDER, type VaultPeriod } from "@/domain/rules";
import { useT } from "@/i18n/client";

type O = { id: string; status: string; showsFace: boolean; vault: VaultPeriod; etaHours: number; note: string; handle: string; look: string | null; rating: number | null; deals: number; visibility: string };
const eur2 = (c: number) => "€" + (c / 100).toFixed(2);
const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;
const eta = (h: number, t: ReturnType<typeof useT>) => (h < 72 ? t("Within {n} hours", { n: h }) : t("Within {n} days", { n: Math.round(h / 24) }));

export default function Picker({ requestId, open, dealId, money, offers, ageOk, waiver, paid }: { paid: boolean; requestId: string; open: boolean; dealId: string | null; money: { deal: number; fee: number; vat: number; vatPct: number; total: number }; offers: O[]; ageOk: boolean; waiver: string }) {
  const [waived, setWaived] = useState(false);
  const t = useT();
  const SORTS = ["Best match", "Top rated", "No face", "Longest access", "Fastest"];
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
        <div className="sortbar">{SORTS.map((s) => <button key={s} className={"chip" + (sort === s ? " is-on" : "")} onClick={() => setSort(s)}>{t(s)}</button>)}</div>
        {list.length === 0 ? <div className="card empty"><b className="t-h3">{t("No offers yet")}</b><p className="muted t-sm">{t("Creators usually respond within a few hours. You get a neutral notification for each offer.")}</p></div> : null}
        <div className="offers">{list.map((x) => {
          const locked = !open || x.status !== "pending";
          return (
            <div key={x.id} role="button" tabIndex={locked ? -1 : 0} className={"card offer" + (sel === x.id ? " is-sel" : "") + (locked && x.status !== "accepted" ? " is-dim" : "")} aria-pressed={sel === x.id} onClick={() => !locked && setSel(x.id)} onKeyDown={(e) => { if (!locked && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setSel(x.id); } }}>
              <div className="media avfill">{x.look ? <img src={x.look} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}</div>
              <div style={{ minWidth: 0 }}>
                <div className="name"><b>{x.handle}</b>{x.rating ? <span className="meta"><span className="star">★</span>{x.rating.toFixed(1)} · {t("{n} deals", { n: x.deals })}</span> : <span className="badge ok">{t("New")}</span>}
                  <Link className="pflink" href={`/c/${x.handle}`} onClick={(e) => e.stopPropagation()}>{t("View profile")}</Link></div>
                {x.note ? <p className="msg">{x.note}</p> : null}
                <div className="tags"><span className="badge brand">{x.showsFace ? t("Face shown") : t("No face")}</span><span className="badge"><Ico n="vault" c="sm" />{t("Vault")} {t(VAULT_LABEL[x.vault])}</span><span className="badge"><Ico n="clock" c="sm" />{eta(x.etaHours, t)}</span>{x.status === "accepted" ? <span className="badge ok">{t("Accepted")}</span> : null}</div>
              </div>
              <div className="price"><span className="radio" /><b className="num">{"€" + Math.round(money.deal / 100)}</b></div>
            </div>);
        })}</div>
      </div>
      <aside className="sticky"><div className="card checkout">
        {dealId ? (<>
          <span className="badge ok" style={{ alignSelf: "flex-start" }}><Ico n="check" c="sm" />{t("Offer accepted")}</span>
          <b className="t-h3">{t("Your deal has started")}</b><p className="t-sm muted">{t("The other creators were told the request is closed.")}</p>
          <Link href={`/deals/${dealId}`} className="btn btn-primary btn-block">{t("Open deal")}</Link></>)
          : o ? (<>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>{o.look ? <img src={o.look} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} /> : null}<div><b>{o.handle}</b><div className="t-sm muted">{o.showsFace ? t("Face shown") : t("No face")} · {t("Vault")} {t(VAULT_LABEL[o.vault])} · {eta(o.etaHours, t).toLowerCase()}</div></div></div>
            <div className="breakdown"><div><span className="muted">{t("Budget")}</span><span className="num">{eur2(money.deal)}</span></div><div><span className="muted">{t("Service fee")}</span><span className="num">{eur2(money.fee)}</span></div><div><span className="muted">{t("VAT")} {money.vatPct}%</span><span className="num">{eur2(money.vat)}</span></div><div className="tot"><span>{paid ? t("Paid, VAT included") : t("Total, VAT included")}</span><span className="num">{eur2(money.total)}</span></div></div>
            {paid ? (<>
              <p className="t-sm muted">{t("Already paid when you posted. Choosing starts the deal on the money that is held.")}</p>
              <button className="btn btn-brand btn-lg btn-block" disabled={pending || !open} onClick={() => start(async () => { const r = await acceptOffer(o.id, true); if (r && !r.ok) toast(t(r.error), "err"); })}>{pending ? t("Starting the deal…") : t("Choose {name}", { name: o.handle })}</button>
            </>) : ageOk ? (<>
              <label className="check waiver"><input type="checkbox" checked={waived} onChange={(e) => setWaived(e.target.checked)} /><span>{t(waiver)}</span></label>
              <button className="btn btn-brand btn-lg btn-block" disabled={pending || !open || !waived} onClick={() => start(async () => { const r = await acceptOffer(o.id, waived); if (r && !r.ok) toast(t(r.error), "err"); })}>{pending ? t("Securing payment…") : t("Accept and secure {amount}", { amount: eur2(money.total) })}</button>
            </>) : (<>
              <p className="t-sm">{t("Confirm your age once before you pay. It takes a minute with our verification partner. ByRequest only keeps the result, never your ID.")}</p>
              <Link href={`/verify-age?next=${encodeURIComponent(`/requests/${requestId}/offers`)}`} className="btn btn-brand btn-lg btn-block">{t("Confirm my age")}</Link>
            </>)}
            <div className="protect"><span><Ico n="shield" c="sm" />{t("Paid out only after review and your 24 hours to object")}</span><span><Ico n="lock" c="sm" />{t("Watermarked, no download, no forwarding")}</span><span><Ico n="check" c="sm" />{t("Shows as BRQ DIGITAL on your statement")}</span></div></>)
          : <p className="t-sm muted">{t("Select an offer to see the total.")}</p>}
      </div></aside>
    </div>
  );
}
