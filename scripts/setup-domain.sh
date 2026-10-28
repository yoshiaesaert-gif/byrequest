#!/usr/bin/env bash
# Points byrequest.me at the hosting and verifies it. Needs network access to the APIs used.
#   TARGET=render  (recommended: the app runs there with its database, worker and file storage)
#   TARGET=vercel  (only after the app is moved to Vercel, see docs/DOMAIN.md)
# Environment: GODADDY_API_KEY, GODADDY_API_SECRET, and RENDER_API_KEY + RENDER_SERVICE_ID or VERCEL_TOKEN + VERCEL_PROJECT.
set -euo pipefail
DOMAIN="${DOMAIN:-byrequest.me}"
TARGET="${TARGET:-render}"
GD="https://api.godaddy.com/v1/domains/$DOMAIN/records"
AUTH="Authorization: sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}"

if [ "$TARGET" = "render" ]; then
  APEX_IP="216.24.57.1"; WWW="${RENDER_HOST:-byrequest.onrender.com}"
  for d in "$DOMAIN" "www.$DOMAIN"; do
    curl -fsS -X POST "https://api.render.com/v1/services/$RENDER_SERVICE_ID/custom-domains" \
      -H "Authorization: Bearer $RENDER_API_KEY" -H "content-type: application/json" -d "{\"name\":\"$d\"}" || echo "custom domain $d may already exist"
  done
else
  APEX_IP="76.76.21.21"; WWW="cname.vercel-dns.com"
  for d in "$DOMAIN" "www.$DOMAIN"; do
    curl -fsS -X POST "https://api.vercel.com/v10/projects/$VERCEL_PROJECT/domains" \
      -H "Authorization: Bearer $VERCEL_TOKEN" -H "content-type: application/json" -d "{\"name\":\"$d\"}" || echo "domain $d may already exist"
  done
fi

# Replace the parked records with ours. TTL 600 so a later change spreads quickly.
curl -fsS -X PUT "$GD/A/@" -H "$AUTH" -H "content-type: application/json" -d "[{\"data\":\"$APEX_IP\",\"ttl\":600}]"
curl -fsS -X PUT "$GD/CNAME/www" -H "$AUTH" -H "content-type: application/json" -d "[{\"data\":\"$WWW\",\"ttl\":600}]"
# Mail authentication for the login codes (Resend). Add the DKIM record Resend shows for the domain as well.
curl -fsS -X PUT "$GD/TXT/send" -H "$AUTH" -H "content-type: application/json" -d '[{"data":"v=spf1 include:amazonses.com ~all","ttl":600}]' || true
curl -fsS -X PUT "$GD/TXT/_dmarc" -H "$AUTH" -H "content-type: application/json" -d '[{"data":"v=DMARC1; p=quarantine; adkim=s; aspf=s","ttl":600}]' || true

echo "Records now:"; curl -fsS "$GD" -H "$AUTH" | head -c 2000; echo
echo "DNS can take up to an hour. Then check: curl -I https://$DOMAIN"
