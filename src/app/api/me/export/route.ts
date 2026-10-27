import { currentUser } from "@/server/auth";
import { exportData } from "@/server/privacy";

export async function GET() {
  const u = await currentUser();
  if (!u) return new Response("Unauthorized", { status: 401 });
  const data = await exportData(u.id);
  return new Response(JSON.stringify(data, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="byrequest-${u.handle}.json"`, "cache-control": "no-store" } });
}
