"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseAsk } from "./ask-parse";

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
