"use client";
import { LOOKS } from "@/domain/looks";
import Script from "next/script";
import { useEffect, useRef, useState, useTransition } from "react";
import { setAvatar } from "../actions";
import { toast } from "@/components/chrome";
import { useT } from "@/i18n/client";

type Engine = { studio: (root: HTMLElement, opts: Record<string, unknown>) => unknown; presets: Record<string, unknown> };


/* Mounts the avatar engine from the prototype (public/avatar.js). 3D looks are saved as a look id;
   built avatars are saved as their part specification. */
export default function Studio({ current }: { current: string | null }) {
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const state = useRef<{ look: string | null; spec: Record<string, unknown> | null; mode: string; photo: { src: string; blur: boolean } | null }>({ look: current ?? "kai", spec: null, mode: current ? "3d" : "av", photo: null });
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const t = useT();
  // The engine writes its own labels in English; translate its text nodes as they appear.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const run = () => {
      // "Build" is also a profile field (body build), so the editor tab has its own key.
      el.querySelectorAll<HTMLElement>('[data-mode="av"]').forEach((b) => { const v = t("Build (avatar)"); if (b.textContent === "Build" && v !== "Build (avatar)") b.textContent = v; });
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) { const s = n.nodeValue?.trim(); if (s) { const v = t(s); if (v !== s) n.nodeValue = n.nodeValue!.replace(s, v); } }
      el.querySelectorAll<HTMLElement>("[aria-label],[title]").forEach((x) => { for (const a of ["aria-label", "title"]) { const s = x.getAttribute(a); if (s && t(s) !== s) x.setAttribute(a, t(s)); } });
    };
    run();
    const mo = new MutationObserver(() => { mo.disconnect(); run(); mo.observe(el, { childList: true, subtree: true, characterData: true }); });
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => mo.disconnect();
  }, [t, ready]);
  useEffect(() => {
    const E = (window as unknown as { BRQAvatar?: Engine }).BRQAvatar;
    if (!ready || !E || !root.current) return;
    const order = current ? [current, ...LOOKS.filter((l) => l !== current)] : LOOKS;
    E.studio(root.current, { initial: E.presets.milo, looks: order.map((id) => ({ id, src: `/av/${id}.webp` })), onLook: (l: { id: string }) => { state.current = { ...state.current, look: l.id, spec: null }; setSaved(false); }, onChange: (a: Record<string, unknown>) => { state.current = { ...state.current, spec: a }; setSaved(false); }, onMode: (m: string) => { state.current.mode = m; setSaved(false); }, onPhoto: (p: { src: string; blur: boolean }) => { state.current.photo = p; setSaved(false); } });
  }, [ready, current]);
  const save = () => start(async () => {
    const s = state.current;
    if (s.mode === "ph") {
      if (!s.photo) { toast(t("Choose a photo first")); return; }
      await setAvatar({ kind: "photo", src: s.photo.src, blur: s.photo.blur }); setSaved(true); toast(t("Avatar saved")); return;
    }
    // "Build" is the part editor when no 3D looks are offered; read the mode, not the (translated) label.
    const built = root.current?.querySelector(".on[data-mode]")?.getAttribute("data-mode") === "av" && !root.current?.querySelector('[data-mode="3d"]');
    await setAvatar(built && s.spec ? { kind: "built", spec: s.spec } : { kind: "3d", look: s.look ?? "kai" });
    setSaved(true); toast(t("Avatar saved"));
  });
  return (<>
    <Script src="/avatar.js" strategy="afterInteractive" onReady={() => setReady(true)} />
    <div className="st" ref={root} />
    <div className="av-save"><span className="t-sm muted">{saved ? t("Saved. This is how others see you.") : t("Not saved yet. Your avatar changes only after you save.")}</span><button className="btn btn-primary btn-lg" onClick={save} disabled={pending}>{pending ? t("Saving…") : saved ? t("Saved") : t("Save avatar")}</button></div>
  </>);
}
