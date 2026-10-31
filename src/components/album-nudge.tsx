"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";

/* Explains the preview album once the profile is done and the creator comes back: a calm card a few seconds after
   the page opens. At most three times, with days in between; never again after "Make my album". */
const KEY = "brq_album_nudge";
const LIFT = 72;   // the promised lift in the chance of being chosen, in percent
export default function AlbumNudge() {
  const t = useT();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let s: { n?: number; at?: number; done?: boolean } = {};
    try { s = JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { /* private mode */ }
    if (s.done || (s.n ?? 0) >= 3 || (s.at && Date.now() - s.at < 5 * 86400_000)) return;
    const id = window.setTimeout(() => { setOpen(true); try { localStorage.setItem(KEY, JSON.stringify({ n: (s.n ?? 0) + 1, at: Date.now() })); } catch { /* private mode */ } }, 4000);
    return () => clearTimeout(id);
  }, []);
  if (!open) return null;
  const done = () => { try { localStorage.setItem(KEY, JSON.stringify({ done: true })); } catch { /* private mode */ } setOpen(false); };
  return (<div className="ask-back" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
    <div className="an" role="dialog" aria-modal="true" aria-labelledby="an-t">
      <span className="an-k">{t("Your profile is ready")}</span>
      <h2 id="an-t">{t("One more step: your preview album")}</h2>
      <p className="an-big"><b>+{LIFT}%</b>{t("more chance to get the deal when a buyer can see a preview")}</p>
      <ul>
        <li><i>1</i><span><b>{t("Only on request")}</b>{t("Nobody sees your album. A buyer asks, you decide whether to share it, per buyer.")}</span></li>
        <li><i>2</i><span><b>{t("Seen once, then gone")}</b>{t("Each photo shows once for 10 seconds, each video once, with the buyer's name on it. No download, no screenshots of a clean copy.")}</span></li>
        <li><i>3</i><span><b>{t("You stay in control")}</b>{t("A few photos or one short video is enough. Change or remove them whenever you want.")}</span></li>
      </ul>
      <div className="an-btns"><button className="btn btn-secondary" onClick={() => setOpen(false)}>{t("Later")}</button><Link className="btn btn-primary" href="/studio#album" onClick={done}>{t("Make my album")}</Link></div>
    </div>
  </div>);
}
