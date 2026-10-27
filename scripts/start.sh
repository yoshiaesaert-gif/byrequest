#!/bin/sh
# Container entry: migrate, seed demo data once, run the release worker, then serve.
set -e
npx drizzle-kit migrate
if [ "${SEED_DEMO:-1}" = "1" ]; then npx tsx scripts/seed.ts --if-empty; fi
(sleep 20; npx tsx scripts/worker.ts) &
exec npx next start -p "${PORT:-3000}" -H 0.0.0.0
