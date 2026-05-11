# Sales Performance Dashboard

Vercel-hosted dashboard for n8n-generated sales coaching reports.

The app does not read Google Docs after creation. n8n posts the same structured coaching content it already generated into `/api/ingest`, and the dashboard stores one row per scored call.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS and shadcn/ui
- Neon Postgres through `@neondatabase/serverless`

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app can load without `DATABASE_URL`, but ingest requires both:

```bash
DATABASE_URL="postgres://..."
INGEST_SECRET="long-random-secret"
```

Use `USE_DEMO_DATA=true` locally if you want a sample call without connecting a database.

## Database

Run `scripts/schema.sql` against the Neon database, or let `/api/ingest` create the table on the first successful post.

Primary dedupe key:

```text
airtable_record_id
```

## Ingest API

Endpoint:

```text
POST /api/ingest
Authorization: Bearer <INGEST_SECRET>
Content-Type: application/json
```

The endpoint upserts dashboard rows and returns:

```json
{
  "ok": true,
  "id": 123,
  "airtable_record_id": "rec...",
  "rep_slug": "rep-name"
}
```

## Routes

- `/` global searchable call library
- `/rep/[slug]` rep-scoped call library
- `/call/[id]` full coaching report

## n8n Wiring

The prepared n8n node config is in `docs-n8n-dashboard-ingest.md`.

Do not wire the active n8n workflow until the Vercel deployment URL and `INGEST_SECRET` are final. The dashboard branch must stay additive and use error output handling so Slack, Google Drive, Airtable, and loop continuation remain unchanged.
