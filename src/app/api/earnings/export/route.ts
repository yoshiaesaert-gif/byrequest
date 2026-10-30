import { requireCreator } from "@/server/auth";
import { earnings, isPeriod } from "@/server/earnings";
import { pdfStatement, xlsxStatement } from "@/server/statement";

/* Earnings export for the signed in creator: ?p=30d&f=pdf|xlsx */
export async function GET(req: Request) {
  const u = await requireCreator();
  const url = new URL(req.url);
  const p = isPeriod(url.searchParams.get("p")) ? (url.searchParams.get("p") as Parameters<typeof earnings>[1]) : "30d";
  const f = url.searchParams.get("f") === "xlsx" ? "xlsx" : "pdf";
  const e = await earnings(u.id, p);
  const name = `byrequest-earnings-${p}-${new Date().toISOString().slice(0, 10)}.${f}`;
  const body = f === "pdf" ? await pdfStatement(e, { handle: u.handle, id: u.id }) : await xlsxStatement(e, { handle: u.handle });
  return new Response(new Uint8Array(body), { headers: {
    "Content-Type": f === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store",
  } });
}
