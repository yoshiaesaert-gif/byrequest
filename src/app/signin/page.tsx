import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth";
import Landing from "./landing";

/* The public landing page and sign in, on one screen. ?as=earn opens on the creator side. */
export default async function SignIn({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  if (await currentUser()) redirect("/");
  const as = (await searchParams).as;
  return <Landing initial={as === "earn" ? "earn" : as === "buy" ? "buy" : undefined} year={new Date().getFullYear()} />;
}
