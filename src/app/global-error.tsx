"use client";
import Oops from "@/components/oops";
import "./globals.css";
import "./app.css";

/* Replaces the root layout when that itself fails, so it brings its own html and body. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body><Oops error={error} reset={reset} /></body></html>;
}
