"use client";
import { useEffect, useState } from "react";
import { Av } from "./ui";

/* A profile picture you can click to see it large. Escape or a click anywhere closes it. */
type A = Parameters<typeof Av>[0]["a"];
export default function AvZoom({ a, name, size, square }: { a: A; name: string; size: number; square?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [open]);
  const src = a?.kind === "photo" ? a.src : a?.kind === "3d" ? `/av/${a.look}.webp` : null;
  if (!src) return <Av a={a} name={name} size={size} square={square} />;
  return (<>
    <button type="button" className="avz" onClick={() => setOpen(true)} aria-label={`${name}, enlarge`}><Av a={a} name={name} size={size} square={square} /></button>
    {open ? <div className="avz-back" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label={name}><img src={src} alt={name} /></div> : null}
  </>);
}
