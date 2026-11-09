import "server-only";
import { desc, eq, and } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "./admin";
import { log } from "./onboarding";

/* What the ID partner read from someone's document, for admins only. Nothing is copied to our database: the details
   are fetched from Didit at the moment an admin asks, the images are short lived links, and every look is in the audit log. */
export type IdRecord = {
  when: string; purpose: string; status: string;
  doc: { type?: string; number?: string; country?: string; issued?: string; expires?: string };
  person: { name?: string; first?: string; last?: string; birth?: string; age?: number; gender?: string; nationality?: string; birthplace?: string };
  checks: { faceMatch?: number; liveness?: number; estimatedAge?: number; sameFaceElsewhere?: number; warnings: string[] };
  network: { country?: string; city?: string; isp?: string; vpn?: boolean; dataCenter?: boolean; device?: string };
  images: { label: string; url: string }[];
};

type Any = Record<string, unknown>;
const first = (v: unknown) => (Array.isArray(v) ? (v[0] as Any | undefined) : undefined) ?? {};

export async function idRecord(userId: string): Promise<{ ok: true; records: IdRecord[] } | { ok: false; error: string }> {
  const { user, role } = await requireStaff();
  if (role !== "admin") return { ok: false, error: "Only admins can see ID details." };
  const checks = await db.select().from(schema.identityChecks).where(and(eq(schema.identityChecks.userId, userId), eq(schema.identityChecks.provider, "didit"))).orderBy(desc(schema.identityChecks.createdAt)).limit(3);
  if (!checks.length) return { ok: false, error: "No ID check with the partner for this account." };
  const records: IdRecord[] = [];
  for (const c of checks) {
    if (!c.externalRef) continue;
    const r = await fetch(`${process.env.DIDIT_BASE_URL || "https://verification.didit.me"}/v3/session/${c.externalRef}/decision/`, { headers: { "x-api-key": process.env.DIDIT_API_KEY ?? "" }, cache: "no-store", signal: AbortSignal.timeout(15000) }).catch(() => null);
    if (!r || !r.ok) { records.push({ when: c.createdAt.toISOString(), purpose: c.purpose, status: `${c.status} (details not available: older partner account or not started)`, doc: {}, person: {}, checks: { warnings: [] }, network: {}, images: [] }); continue; }
    const d = (await r.json()) as Any;
    const idv = first(d.id_verifications), lv = first(d.liveness_checks), fm = first(d.face_matches), ip = first(d.ip_analyses);
    const warn = [...((idv.warnings as Any[]) ?? []), ...((lv.warnings as Any[]) ?? []), ...((fm.warnings as Any[]) ?? []), ...((ip.warnings as Any[]) ?? [])].map((w) => String(w.short_description ?? w.risk ?? "")).filter(Boolean);
    const img = (label: string, u: unknown) => (typeof u === "string" && u.startsWith("https://") ? [{ label, url: u }] : []);
    records.push({
      when: String(d.created_at ?? c.createdAt.toISOString()), purpose: c.purpose, status: String(d.status ?? c.status),
      doc: { type: idv.document_type as string, number: idv.document_number as string, country: (idv.issuing_state_name ?? idv.issuing_state) as string, issued: idv.date_of_issue as string, expires: idv.expiration_date as string },
      person: { name: idv.full_name as string, first: idv.first_name as string, last: idv.last_name as string, birth: idv.date_of_birth as string, age: idv.age as number, gender: idv.gender as string, nationality: idv.nationality as string, birthplace: idv.place_of_birth as string },
      checks: { faceMatch: fm.score as number, liveness: lv.score as number, estimatedAge: lv.age_estimation as number, sameFaceElsewhere: ((d.linked_records as Any)?.same_face as Any)?.count as number, warnings: [...new Set(warn)] },
      network: { country: ip.ip_country as string, city: ip.ip_city as string, isp: ip.isp as string, vpn: ip.is_vpn_or_tor as boolean, dataCenter: ip.is_data_center as boolean, device: [ip.device_brand, ip.device_model, ip.os_family].filter(Boolean).join(" ") },
      images: [...img("Photo on the document", idv.portrait_image), ...img("Document front", idv.full_front_image ?? idv.front_image), ...img("Document back", idv.full_back_image ?? idv.back_image), ...img("Live selfie", lv.reference_image), ...img("Selfie used for the face match", fm.target_image)],
    });
  }
  await log(db, `staff:${user.id}`, "identity.viewed", userId, { records: records.length });
  return { ok: true, records };
}
