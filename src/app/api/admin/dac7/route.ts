import { and, eq, gte, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentUser } from "@/server/auth";
import { log } from "@/server/onboarding";
import { unseal } from "@/server/seal";
import type { TaxDetails } from "@/server/onboarding";

/* DAC7 working file for one calendar year: per seller the details, consideration and fees per
   quarter and the number of activities. Admins only, every download logged. The official filing
   goes through MyMinfin (Belgium) or the Belastingdienst portal (Netherlands) in their format. */
const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET(req: Request) {
  const u = await currentUser();
  const s = u ? await db.query.staff.findFirst({ where: eq(schema.staff.userId, u.id) }) : null;
  if (!u || s?.role !== "admin") return new Response("Forbidden", { status: 403 });
  const year = Number(new URL(req.url).searchParams.get("year")) || new Date().getFullYear() - 1;
  const rows = await db.select({ d: schema.deals, handle: schema.users.handle }).from(schema.deals).innerJoin(schema.users, eq(schema.users.id, schema.deals.creatorId))
    .where(and(eq(schema.deals.status, "released"), gte(schema.deals.settledAt, new Date(Date.UTC(year, 0, 1))), lt(schema.deals.settledAt, new Date(Date.UTC(year + 1, 0, 1)))));
  const by = new Map<string, { handle: string; q: number[]; fees: number[]; n: number }>();
  for (const { d, handle } of rows) {
    const e = by.get(d.creatorId) ?? { handle, q: [0, 0, 0, 0], fees: [0, 0, 0, 0], n: 0 };
    const qi = Math.floor(d.settledAt!.getUTCMonth() / 3);
    e.q[qi] += d.dealCents; e.fees[qi] += d.dealCents - d.creatorCents; e.n++;
    by.set(d.creatorId, e);
  }
  const head = ["seller_ref", "handle", "entity", "legal_name", "address", "country", "tin", "date_of_birth", "business_number", "vat_number", "consideration_q1", "consideration_q2", "consideration_q3", "consideration_q4", "fees_q1", "fees_q2", "fees_q3", "fees_q4", "activities", "missing_details"];
  const lines = [head.join(",")];
  for (const [id, e] of by) {
    const t = await db.query.taxProfiles.findFirst({ where: eq(schema.taxProfiles.userId, id) });
    const x = t ? unseal<TaxDetails>(t.sealed) : null;
    lines.push([id, e.handle, t?.entity, x?.legalName, x?.address, t?.country, x?.tin, x?.dateOfBirth, x?.businessNumber, x?.vatNumber, ...e.q.map((c) => (c / 100).toFixed(2)), ...e.fees.map((c) => (c / 100).toFixed(2)), e.n, t ? "" : "yes"].map(csv).join(","));
  }
  await log(db, `staff:${u.id}`, "tax.dac7_export", null, { year, sellers: by.size });
  return new Response(lines.join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="dac7-${year}.csv"`, "cache-control": "no-store" } });
}
