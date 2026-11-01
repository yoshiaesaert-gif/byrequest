import "server-only";
import { createReadStream } from "node:fs";

/* A file as a web stream that stops cleanly when the viewer leaves halfway (a video closed while loading).
   Node's Readable.toWeb keeps pushing into a closed stream there and throws "Controller is already closed". */
export function fileStream(path: string, range?: { start: number; end: number }): ReadableStream<Uint8Array> {
  const rs = createReadStream(path, range);
  const it = rs[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>({
    async pull(c) {
      try { const { value, done } = await it.next(); if (done) c.close(); else c.enqueue(new Uint8Array(value as Buffer)); }
      catch (e) { try { c.error(e); } catch { /* already gone */ } rs.destroy(); }
    },
    cancel() { rs.destroy(); },
  });
}
