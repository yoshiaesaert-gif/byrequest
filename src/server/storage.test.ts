import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* A tiny in-memory S3 stands in for R2: put, get and delete by path. */
describe("bucket storage", () => {
  it("keeps files encrypted in the bucket and restores them after a restart", async () => {
    const objects = new Map<string, Buffer>();
    const srv = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c)).on("end", () => {
        if (req.method === "PUT") { objects.set(req.url!, Buffer.concat(chunks)); res.end(); }
        else if (req.method === "DELETE") { objects.delete(req.url!); res.end(); }
        else if (objects.has(req.url!)) res.end(objects.get(req.url!));
        else { res.statusCode = 404; res.end(); }
      });
    }).listen(0);
    const port = (srv.address() as { port: number }).port;
    const dir = await mkdtemp(path.join(tmpdir(), "brq-"));
    Object.assign(process.env, { STORAGE_DIR: dir, S3_BUCKET: "vault", S3_ENDPOINT: `http://127.0.0.1:${port}`, S3_ACCESS_KEY_ID: "k", S3_SECRET_ACCESS_KEY: "s", STORAGE_KEY: "test" });
    const m = await import("./media");

    const key = "2026-10/a.jpg";
    const sealed = m.seal(Buffer.from("hello vault"));
    expect(sealed.includes(Buffer.from("hello vault"))).toBe(false);
    objects.set(`/vault/${key}`, sealed);
    await rm(dir, { recursive: true, force: true });            // the server restarted: local disk is empty
    const { readFile } = await import("node:fs/promises");
    expect(String(await readFile(await m.localFile(key)))).toBe("hello vault");
    await m.remove(key);
    expect(objects.size).toBe(0);
    srv.close(); await rm(dir, { recursive: true, force: true });
  });
});
