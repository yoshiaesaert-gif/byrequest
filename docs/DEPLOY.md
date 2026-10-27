# Hosted demo on Railway

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
