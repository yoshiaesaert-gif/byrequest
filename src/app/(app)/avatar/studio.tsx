"use client";
import Script from "next/script";
import { useEffect, useRef, useState, useTransition } from "react";
import { setAvatar } from "../actions";
import { toast } from "@/components/chrome";

type Engine = { studio: (root: HTMLElement, opts: Record<string, unknown>) => unknown; presets: Record<string, unknown> };
const LOOKS = ["kai", "milo", "ava", "dre", "lina", "jens", "nour", "noah", "ruby", "sem"];

/* Mounts the avatar engine from the prototype (public/avatar.js). 3D looks are saved as a look id;
   built avatars are saved as their part specification. */
export default function Studio({ current }: { current: string | null }) {
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const state = useRef<{ look: string | null; spec: Record<string, unknown> | null }>({ look: current ?? "kai", spec: null });
  const [pending, start] = useTransition();
  useEffect(() => {
    const E = (window as unknown as { BRQAvatar?: Engine }).BRQAvatar;
    if (!ready || !E || !root.current) return;
    const order = current ? [current, ...LOOKS.filter((l) => l !== current)] : LOOKS;
    E.studio(root.current, { initial: E.presets.milo, looks: order.map((id) => ({ id, src: `/av/${id}.webp` })), onLook: (l: { id: string }) => { state.current = { look: l.id, spec: null }; }, onChange: (a: Record<string, unknown>) => { state.current = { ...state.current, spec: a }; } });
  }, [ready, current]);
  const save = () => start(async () => {
    const s = state.current;
    const modeBtn = root.current?.querySelector(".st-mode .on")?.textContent ?? "";
    await setAvatar(modeBtn.startsWith("Build") && s.spec ? { kind: "built", spec: s.spec } : { kind: "3d", look: s.look ?? "kai" });
    toast("Avatar saved");
  });
  return (<>
    <Script src="/avatar.js" strategy="afterInteractive" onReady={() => setReady(true)} />
    <button className="btn btn-primary btn-lg btn-block" style={{ marginBottom: 16 }} onClick={save} disabled={pending}>{pending ? "Saving…" : "Save avatar"}</button>
    <div className="st" ref={root} />
  </>);
}
