"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { answerAlbum, addParticipant } from "../actions";
import { toast } from "@/components/chrome";

export function AlbumAnswer({ id, buyer, kind, canUpload }: { id: string; buyer: string; kind: string; canUpload: boolean }) {
  const [files, setFiles] = useState<File[]>([]);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  if (done) return null;
  return (<div className="lrow" style={{ gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center" }}>
    <div style={{ minWidth: 0 }}><b>{buyer} asks for a {kind} preview</b><div className="t-sm muted">Up to 5 photos. Reviewed first, then viewable once for 60 seconds.</div>
      {canUpload ? <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))} style={{ marginTop: 8 }} /> : <Link href="/onboarding" className="t-sm" style={{ fontWeight: 600 }}>Finish setup to send previews</Link>}</div>
    <div className="optrow">
      <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => start(async () => { const r = await answerAlbum(id, null); toast(r.ok ? r.msg! : r.error, r.ok ? "ok" : "err"); if (r.ok) setDone(true); })}>Decline</button>
      <button className="btn btn-primary btn-sm" disabled={pending || !files.length || !canUpload} onClick={() => start(async () => { const f = new FormData(); files.forEach((x) => f.append("files", x)); const r = await answerAlbum(id, f); toast(r.ok ? r.msg! : r.error, r.ok ? "ok" : "err"); if (r.ok) setDone(true); })}>Send</button>
    </div>
  </div>);
}

export function AddParticipant() {
  const [label, setLabel] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (<div className="upbox" style={{ padding: "14px 0" }}>
    <div className="field"><label htmlFor="pl">Private label, only for you</label><div style={{ display: "flex", gap: 8 }}><input id="pl" className="input" maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="For example: training partner" />
      <button className="btn btn-primary" disabled={pending || !label.trim()} onClick={() => start(async () => { const r = await addParticipant(label); if (r.ok) { setLink(r.link!); setLabel(""); } else toast(r.error, "err"); })}>Add</button></div></div>
    {link ? <div className="banner info" style={{ margin: 0 }}><div className="grow"><b>Send this private link to them yourself</b><div className="t-sm" style={{ wordBreak: "break-all" }}>{link}</div><div className="t-xs muted">It is shown only now. Anyone with the link can verify and consent for this person.</div></div><button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard?.writeText(link); toast("Link copied"); }}>Copy</button></div> : null}
  </div>);
}
