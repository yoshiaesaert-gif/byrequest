"use client";
import Oops from "@/components/oops";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <Oops error={error} reset={reset} />;
}
