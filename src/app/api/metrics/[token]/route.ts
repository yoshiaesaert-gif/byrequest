import { growthMetrics, validToken } from "@/server/growth";

/* The private read-only growth link: counts per day, landing page and campaign. ?days=7..90, default 30. */
export const dynamic = "force-dynamic";
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!(await validToken(token))) return Response.json({ error: "This link is not valid or was revoked." }, { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  const days = Number(new URL(req.url).searchParams.get("days")) || 30;
  return Response.json(await growthMetrics(days), { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
