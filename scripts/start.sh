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
# The cap follows the container: about two thirds of its memory limit, so an upgrade needs no setting.
LIMIT=$(cat /sys/fs/cgroup/memory.max 2>/dev/null || cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null || echo max)
case "$LIMIT" in ''|max|*[!0-9]*) AUTO=340 ;; *) AUTO=$((LIMIT / 1048576 * 2 / 3)); [ "$AUTO" -gt 4096 ] && AUTO=340 ;; esac
# Listen on every address, IPv6 and IPv4 ("::"), when the container has IPv6: Render's paid network may connect over
# IPv6 and never reaches a server bound to 0.0.0.0 only. Without IPv6, "::" fails to start, so fall back to IPv4.
if [ -s /proc/net/if_inet6 ]; then HOST="::"; else HOST="0.0.0.0"; fi
echo "listening on $HOST:${PORT:-3000}, heap ${NODE_HEAP_MB:-$AUTO} MB"
exec node --max-old-space-size=${NODE_HEAP_MB:-$AUTO} node_modules/next/dist/bin/next start -p "${PORT:-3000}" -H "$HOST"
