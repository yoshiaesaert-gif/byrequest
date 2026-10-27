import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as base from "./schema";
import * as compliance from "./compliance";

const schema = { ...base, ...compliance };

const g = globalThis as unknown as { brqPool?: Pool };
const pool = g.brqPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
if (process.env.NODE_ENV !== "production") g.brqPool = pool;

export const db = drizzle(pool, { schema });
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export { schema };
