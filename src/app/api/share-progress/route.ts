import { currentUser } from "@/server/auth";
import { barData } from "@/server/sharebonus";

export async function GET() {
  const u = await currentUser();
  if (!u) return Response.json({ on: false }, { status: 401 });
  const d = await barData(u.id).catch(() => null);
  return Response.json(d ?? { on: false }, { headers: { "Cache-Control": "private, max-age=30" } });
}
