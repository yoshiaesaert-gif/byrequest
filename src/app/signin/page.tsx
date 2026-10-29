import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { currentUser } from "@/server/auth";
import { owner } from "@/server/referrals";
import { REF_COOKIE, normalizeCode } from "@/domain/referral";
import Landing from "./landing";

/* The public landing page and sign in, on one screen. ?as=earn opens on the creator side.
   Arriving through an invite link (?ref= or the remembered cookie) shows who invited you. */
export default async function SignIn({ searchParams }: { searchParams: Promise<{ as?: string; ref?: string }> }) {
  if (await currentUser()) redirect("/");
  const sp = await searchParams;
  const code = sp.ref ?? (await cookies()).get(REF_COOKIE)?.value;
  const o = code ? await owner(code).catch(() => null) : null;
  return <Landing initial={sp.as === "earn" ? "earn" : sp.as === "buy" ? "buy" : undefined} year={new Date().getFullYear()} invite={o && code ? { code: normalizeCode(code) } : undefined} />;
}
