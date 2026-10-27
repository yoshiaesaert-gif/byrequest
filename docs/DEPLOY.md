# Hosted demo

## Render (recommended now)

1. Sign in at https://render.com with GitHub.
2. New, then Blueprint, then choose `yoshiaesaert-gif/byrequest`. Render reads `render.yaml` and creates the web service and the Postgres database, with all secrets generated.
3. Fill in `DEMO_PASSWORD` when asked, then Apply.
4. Open the URL Render shows once the deploy is live. Any username, and the demo password.

The free plan sleeps after 15 minutes without visits (the first visit then takes about a minute) and has no persistent disk: seeded demo files are rebuilt on start, new uploads are lost on a restart. A paid instance with a disk at `/app/storage` keeps them. The free database expires after 30 days.

## Vercel (needs changes first)

Vercel needs ffmpeg bundled (for example `ffmpeg-static`), object storage for uploads (Vercel Blob or S3, with direct client uploads because of the request size limit) and a scheduler for the release worker.

# Railway

One service runs the web app, the migrations and the release worker. Postgres is a Railway database. Uploads live on a Railway volume. The whole site sits behind a password (`DEMO_PASSWORD`), and verification and payouts use the clearly marked test provider.

## Steps

1. Sign in at https://railway.com with GitHub.
2. New Project, then Deploy from GitHub repo, then choose `yoshiaesaert-gif/byrequest`. Allow Railway access to that repository when asked.
3. In the project, click Create, then Database, then PostgreSQL.
4. Open the `byrequest` service, tab Variables, and add:

| Variable | Value |
|---|---|
| DATABASE_URL | `${{Postgres.DATABASE_URL}}` |
| SESSION_SECRET | a long random string |
| CRON_SECRET | a long random string |
| CONFIDENTIAL_KEY | a long random string |
| SANDBOX_WEBHOOK_SECRET | a long random string |
| DEMO_PASSWORD | the password for the demo |
| DEV_SHOW_CODE | `1` (shows login codes on screen and the demo accounts) |
| BRQ_PROVIDER_ENV | `test` |
| STORAGE_DIR | `/data/storage` |

5. Same service, tab Settings, Networking: Generate Domain (port 3000).
6. Same service: add a Volume with mount path `/data`.
7. Redeploy if it did not start by itself. The first start runs the migrations and seeds the demo data once.
8. Open the domain. The browser asks for a username and password: any username, and the `DEMO_PASSWORD`.

## Notes

1. `SEED_DEMO=0` skips the demo data on an empty database.
2. Leave `DEV_SHOW_CODE` off for anything beyond a private demo: with it on, login codes are shown on screen.
3. Email sending, real payments and real verification providers are not connected in this environment.

## Translation
The site is in Dutch, English and French. Fixed texts are translated by hand in `src/i18n/nl.ts` and `src/i18n/fr.ts`. What people write is translated automatically, once, by the minute scheduler, and always marked "Automatically translated" with the original one click away.
* `DEEPL_API_KEY`: optional. A DeepL API Free key (ends in `:fx`) gives 500,000 characters a month for free. Without it the free MyMemory tier is used, which allows far less per day.
* `TRANSLATE_PROVIDER=off`: turns machine translation off.
