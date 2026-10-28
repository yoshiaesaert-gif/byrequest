import { createHmac } from "node:crypto";
import { describe, expect, it, beforeAll } from "vitest";
import { adapterById, IgnoredEvent, SignatureError, type IdentityAdapter } from "./providers";

const sorted = (v: unknown): string => v === null || typeof v !== "object" ? JSON.stringify(v)
  : Array.isArray(v) ? "[" + v.map(sorted).join(",") + "]"
  : "{" + Object.keys(v as object).sort().map((k) => JSON.stringify(k) + ":" + sorted((v as Record<string, unknown>)[k])).join(",") + "}";

describe("didit webhook", () => {
  let a: IdentityAdapter;
  beforeAll(() => { process.env.DIDIT_WEBHOOK_SECRET = "s3cret"; process.env.BRQ_IDENTITY_PROVIDER = "didit"; a = adapterById("identity", "didit") as IdentityAdapter; });
  const send = (body: object, sig?: string) => {
    const raw = JSON.stringify(body);
    return a.verifyWebhook(raw, new Headers({ "x-signature-v2": sig ?? createHmac("sha256", "s3cret").update(sorted(body)).digest("hex") }));
  };
  const now = () => Math.floor(Date.now() / 1000);

  it("accepts an approved adult", async () => {
    const e = await send({ session_id: "s1", status: "Approved", created_at: now(), decision: { id_verification: { date_of_birth: "1990-01-01", first_name: "A", last_name: "B" } } });
    expect(e).toMatchObject({ externalRef: "s1", decision: "approved", over18: true });
  });
  it("flags a minor", async () => {
    const y = new Date().getFullYear() - 16;
    const e = await send({ session_id: "s2", status: "Approved", created_at: now(), decision: { id_verification: { date_of_birth: `${y}-01-01` } } });
    expect(e.over18).toBe(false);
  });
  it("rejects a bad signature and stale events", async () => {
    await expect(async () => send({ session_id: "s3", status: "Approved", created_at: now() }, "00ff")).rejects.toThrow(SignatureError);
    await expect(async () => send({ session_id: "s3", status: "Approved", created_at: now() - 999 })).rejects.toThrow(SignatureError);
  });
  it("ignores statuses that are not final", async () => {
    await expect(async () => send({ session_id: "s4", status: "In Progress", created_at: now() })).rejects.toThrow(IgnoredEvent);
  });
});

describe("didit simple signature", () => {
  it("accepts X-Signature-Simple", async () => {
    process.env.DIDIT_WEBHOOK_SECRET = "s3cret"; process.env.BRQ_IDENTITY_PROVIDER = "didit";
    const a = adapterById("identity", "didit") as IdentityAdapter;
    const ts = Math.floor(Date.now() / 1000);
    const body = { session_id: "s9", status: "Declined", webhook_type: "status.updated", timestamp: ts };
    const sig = createHmac("sha256", "s3cret").update(`${ts}:s9:Declined:status.updated`).digest("hex");
    const e = await a.verifyWebhook(JSON.stringify(body), new Headers({ "x-signature-simple": sig, "x-timestamp": String(ts) }));
    expect(e.decision).toBe("declined");
  });
});
