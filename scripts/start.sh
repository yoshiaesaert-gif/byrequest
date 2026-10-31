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
npx tsx scripts/orphan-notes.ts || true
npx tsx scripts/house-requests.ts || true
npx tsx scripts/demo-life.ts || true
npx tsx scripts/clean-demo.ts || true
npx tsx scripts/rebalance-covers.ts || true
# The minute ticker is plain node with a tiny heap. Next runs without the npx wrapper and with a heap cap, so the
# garbage collector works harder before the 512 MB container limit is reached instead of the container being killed.
(sleep 20; exec node --max-old-space-size=32 scripts/tick.mjs) &
exec node --max-old-space-size=${NODE_HEAP_MB:-340} node_modules/next/dist/bin/next start -p "${PORT:-3000}" -H 0.0.0.0
