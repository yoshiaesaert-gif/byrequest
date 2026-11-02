"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* The invite page follows the link live: fresh numbers every 20 seconds while it is open. */
export default function Live() {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => document.visibilityState === "visible" && router.refresh(), 20_000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
