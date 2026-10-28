# byrequest.me online zetten

## Waar de site draait

De app draait op Render: een Docker container met de Postgres database, de minuut-worker (uitbetalingen, vertalingen, verlopen requests) en opslag voor geleverde bestanden. Vercel kan Next.js hosten, maar heeft geen blijvende schijf voor uploads en geen worker die elke minuut draait. Daarom wijst het domein standaard naar Render. Overstappen naar Vercel vraagt eerst: uploads naar object storage (bv. S3 of R2), de worker als Vercel Cron of aparte dienst, en de database extern.

## DNS bij GoDaddy (Render)

| Type | Naam | Waarde | TTL |
|---|---|---|---|
| A | @ | 216.24.57.1 | 600 |
| CNAME | www | byrequest.onrender.com | 600 |
| TXT | _dmarc | v=DMARC1; p=quarantine; adkim=s; aspf=s | 600 |
| TXT, CNAME | zoals Resend toont | voor de e-mail met inlogcodes | 600 |

Verwijder bij GoDaddy de standaard "Parked" A record en eventuele doorsturing. In Render: service byrequest, Settings, Custom Domains, voeg `byrequest.me` en `www.byrequest.me` toe. Render maakt het SSL certificaat zelf aan.

Voor Vercel zijn de waarden: A @ 76.76.21.21 en CNAME www cname.vercel-dns.com.

## Automatisch

`scripts/setup-domain.sh` doet alles hierboven via de API's. Nodig als omgevingsvariabelen: `GODADDY_API_KEY`, `GODADDY_API_SECRET`, `RENDER_API_KEY`, `RENDER_SERVICE_ID` (of `VERCEL_TOKEN`, `VERCEL_PROJECT` met `TARGET=vercel`).

## Inloggen voor echte gebruikers

1. Maak een account bij Resend, voeg het domein byrequest.me toe en zet de DNS records die Resend toont.
2. Zet in Render: `RESEND_API_KEY` en `MAIL_FROM` (bv. `Notes <code@byrequest.me>`).
3. Vanaf dan gaan codes alleen nog per mail. De code verschijnt niet meer op het scherm, ook niet als `DEV_SHOW_CODE=1`.
4. Voor de echte lancering: `DEV_SHOW_CODE` uit (de demo accounts verdwijnen dan van het inlogscherm) en `DEMO_PASSWORD` weg.
