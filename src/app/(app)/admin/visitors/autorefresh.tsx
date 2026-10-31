"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* Keeps the dashboard live: new numbers every 10 seconds while the tab is open, paused when it is hidden. */
export default function AutoRefresh({ every = 10 }: { every?: number }) {
  const router = useRouter();
  const [at, setAt] = useState("");
  useEffect(() => {
    const go = () => { if (document.visibilityState === "visible") { router.refresh(); setAt(new Date().toLocaleTimeString("nl-BE", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit", second: "2-digit" })); } };
    const id = window.setInterval(go, every * 1000);
    const vis = () => document.visibilityState === "visible" && go();
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, [router, every]);
  return <span className="dz-rt"><i />Live{at ? ` · updated ${at}` : " · updates every 10 seconds"}</span>;
}
