"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* Staff pages only: tells the server which time zone this computer is in, and reloads the numbers once when it changed. */
export default function TzSync() {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    const now = document.cookie.match(/(?:^|; )brq_tz=([^;]+)/)?.[1];
    if (now && decodeURIComponent(now) === tz) return;
    document.cookie = `brq_tz=${encodeURIComponent(tz)}; path=/; max-age=${365 * 86400}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
    router.refresh();
  }, [router]);
  return null;
}
