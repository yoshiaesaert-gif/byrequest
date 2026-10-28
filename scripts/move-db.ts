/* One time move of all data to a new database. Runs at start, right after the migrations and
   before the demo seed: when MOVE_FROM_URL is set and the new database has no users yet, every
   table in public is copied in foreign key order. Rows travel as JSON, so enums, arrays, jsonb
   and dates keep their exact values. Remove MOVE_FROM_URL afterwards. */
import "dotenv/config";
import { Client } from "pg";

async function main() {
  const from = process.env.MOVE_FROM_URL;
  if (!from) return;
  const src = new Client({ connectionString: from, ssl: from.includes("render.com") ? { rejectUnauthorized: false } : undefined });
  const dst = new Client({ connectionString: process.env.DATABASE_URL });
  await src.connect(); await dst.connect();
  try {
    if (Number((await dst.query("select count(*) n from users")).rows[0].n) > 0) { console.log("move-db: target already has data, skipped"); return; }
    const tables = (await src.query("select tablename t from pg_tables where schemaname='public'")).rows.map((r) => r.t as string);
    const deps = (await src.query(`select c.conrelid::regclass::text a, c.confrelid::regclass::text b from pg_constraint c
      join pg_namespace n on n.oid = c.connamespace where c.contype = 'f' and n.nspname = 'public'`)).rows as { a: string; b: string }[];
    const clean = (s: string) => s.replace(/^public\./, "").replace(/"/g, "");
    const order: string[] = [], left = new Set(tables);
    while (left.size) {
      const ready = [...left].filter((t) => !deps.some((d) => clean(d.a) === t && clean(d.b) !== t && left.has(clean(d.b))));
      if (!ready.length) throw new Error("move-db: foreign key cycle in " + [...left].join(", "));
      for (const t of ready) { order.push(t); left.delete(t); }
    }
    await dst.query("begin");
    for (const t of order) {
      const cols = (await dst.query("select column_name c from information_schema.columns where table_schema='public' and table_name=$1", [t])).rows.map((r) => `"${r.c}"`).join(",");
      if (!cols) continue;
      let n = 0;
      for (let off = 0; ; off += 500) {
        const { rows } = await src.query(`select coalesce(json_agg(x), '[]')::text j from (select * from "${t}" order by ctid offset ${off} limit 500) x`);
        const batch = JSON.parse(rows[0].j) as unknown[];
        if (!batch.length) break;
        await dst.query(`insert into "${t}" (${cols}) select ${cols} from json_populate_recordset(null::"${t}", $1::json)`, [rows[0].j]);
        n += batch.length;
      }
      console.log(`move-db: ${t} ${n}`);
    }
    await dst.query("commit");
    console.log("move-db: done");
  } catch (e) { await dst.query("rollback").catch(() => null); throw e; }
  finally { await src.end(); await dst.end(); }
}
main().catch((e) => { console.error(e); process.exit(1); });
