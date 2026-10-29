/* Notifications whose deal or request no longer exists lead nowhere; remove them. Runs at start. */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  const r = await db.execute(sql`delete from notifications n where
    (n.href ~ '^/deals/[0-9a-f-]{36}' and not exists (select 1 from deals d where d.id::text = substring(n.href from 8 for 36)))
    or (n.href ~ '^/requests/[0-9a-f-]{36}' and not exists (select 1 from requests r where r.id::text = substring(n.href from 11 for 36)))`);
  console.log(`Orphan notifications removed: ${r.rowCount ?? 0}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
