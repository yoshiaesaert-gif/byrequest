import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth";

/* Switching between buying and creating is a plain link, so it keeps working in a tab that was
   opened before a new release (server actions from an older build no longer resolve). */
export async function GET(req: Request) {
  const u = await currentUser();
  const to = new URL(req.url).searchParams.get("to") === "sell" ? "sell" : "buy";
  const res = NextResponse.redirect(new URL(u ? "/" : "/signin", req.url), 303);
  if (u) res.cookies.set("brq_mode", u.isCreator ? to : "buy", { path: "/", sameSite: "lax", maxAge: 31536000 });
  return res;
}
