"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/* Turns a plain sentence into a prefilled request, for example "a 10 minute shower video for €80". */
export function parseAsk(q: string) {
  const t = q.toLowerCase();
  const category = /voice|audio|good ?night|good ?morning|message/.test(t) ? "voice" : /photo|pic|selfie|set/.test(t) ? "photos" : /idea|custom|surprise|birthday/.test(t) ? "custom" : "video";
  const num = /(\d{1,3})\s*(min|minute|photo|pic)/.exec(t)?.[1];
  const euro = /€\s*(\d{2,4})|(\d{2,4})\s*(eur|euro)/.exec(t);
  const p = new URLSearchParams({ c: category });
  if (num) p.set("amount", num);
  if (euro) p.set("budget", euro[1] ?? euro[2]);
  const title = q.trim().replace(/\s+/g, " ").slice(0, 60);
  if (title) p.set("title", title.charAt(0).toUpperCase() + title.slice(1));
  return `/post?${p}`;
}

export default function Ask() {
  const [q, setQ] = useState("");
  const router = useRouter();
  return (
    <form className="ask" onSubmit={(e) => { e.preventDefault(); router.push(parseAsk(q)); }}>
      <svg className="ico lg" aria-hidden="true"><use href="#i-spark" /></svg>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Describe it in a few words, like a 10 minute shower video" aria-label="Describe your request" />
      <button className="btn btn-primary">Start</button>
    </form>
  );
}
