import Link from "next/link";
import { LOOKS } from "@/domain/looks";
import { shuffled } from "@/content/themes";

/* Three rings of creator avatars turning slowly in opposite directions, the live number of verified
   creators in the middle, and a short pitch beside it. Faces stay upright while the rings turn. */
export default function Orbit({ count, t }: { count: number; t: (s: string, v?: Record<string, string | number>) => string }) {
  const pool = shuffled(LOOKS);
  const rings = [pool.slice(0, 6), pool.slice(6, 16), pool.slice(16, 30)];
  return (<section className="orb-sec">
    <div className="orb" aria-hidden="true">
      {rings.map((ring, r) => (
        <div key={r} className={`orb-ring r${r}`}>{ring.map((l, i) => (
          <span key={l} className="orb-av" style={{ ["--a" as string]: `${(360 / ring.length) * i + r * 17}deg` }}><img src={`/av/${l}.webp`} alt="" loading="lazy" /></span>))}</div>))}
      <div className="orb-core"><b className="num">{count}</b><span>{t("verified creators")}</span></div>
    </div>
    <div className="orb-copy">
      <span className="h-kick dark">{t("Real people")}</span>
      <h2>{t("Every taste.")}<br />{t("One request away.")}</h2>
      <p>{t("Every creator is checked on age and identity. You only see who applies for your request, and you choose. Face or no face, your call.")}</p>
      <div className="orb-stack">{pool.slice(30, 35).map((l) => <img key={l} src={`/av/${l}.webp`} alt="" loading="lazy" />)}<span>{t("and more every day")}</span></div>
      <Link href="/post" className="btn btn-primary btn-lg">{t("Post a request")}</Link>
    </div>
  </section>);
}
