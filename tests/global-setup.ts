import { execSync } from "node:child_process";

/* Fresh schema for every run of the integration tests. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL || "postgres://brq:brq@localhost:5432/byrequest_test";
  execSync(`psql "${url}" -q -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;"`, { stdio: "inherit" });
  execSync("npx drizzle-kit migrate", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
