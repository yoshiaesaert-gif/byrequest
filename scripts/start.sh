#!/bin/sh
# Container entry: migrate, seed demo data once, run the release worker, then serve.
set -e
npx drizzle-kit migrate
npx tsx scripts/move-db.ts
if [ "${SEED_DEMO:-1}" = "1" ]; then npx tsx scripts/seed.ts --if-empty; fi
npx tsx scripts/sync-legal.ts || true
npx tsx scripts/owner.ts || true
npx tsx scripts/extra-creators.ts || true
npx tsx scripts/creator-looks.ts || true
npx tsx scripts/house-requests.ts || true
npx tsx scripts/demo-life.ts || true
npx tsx scripts/clean-demo.ts || true
npx tsx scripts/rebalance-covers.ts || true
(sleep 20; npx tsx scripts/worker.ts) &
exec npx next start -p "${PORT:-3000}" -H 0.0.0.0
