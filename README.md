# CyberWeather

Live visualization of global cyber risk — a dark command-center homepage with a rotating 3D globe of real threat activity (botnet C2 servers, mass-scanning sources), a live threat feed, priority-ranked CVEs, and an event timeline.

Built with Next.js (App Router) + TypeScript, react-globe.gl, Tailwind v4, Drizzle ORM, and Postgres. All data comes from free public feeds:

| Feed | What it provides | Key needed |
|---|---|---|
| [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) | Known-exploited CVEs (the anchor dataset) | No |
| [NVD 2.0](https://nvd.nist.gov/developers/vulnerabilities) | CVSS scores + descriptions (enrichment) | Optional (`NVD_API_KEY` raises rate limits) |
| [FIRST EPSS](https://www.first.org/epss/) | Exploit-probability scores | No |
| [Feodo Tracker](https://feodotracker.abuse.ch/) | Botnet C2 server IPs → globe markers | No |
| [SANS ISC DShield](https://isc.sans.edu/api/) | Top attacking IPs → globe markers | No |
| [URLhaus](https://urlhaus.abuse.ch/) | Malware distribution URLs | Yes (free `ABUSECH_AUTH_KEY`, skipped when unset) |

IP geolocation is offline via `geoip-lite`. CVEs are ranked by a stored priority score: `100 × (0.4·CVSS/10 + 0.4·EPSS + 0.2·KEV)`.

## Run it

Requires Node 20+, and Postgres — either local (create role `cyber` / db `cyberweather` matching `.env.local`) or `docker compose up -d` (uses `postgres:16-alpine`).

```bash
npm install
npm run db:push        # create tables
npm run ingest         # first full ingest (~3-5 min; NVD is rate-limited without a key)
npm run dev            # http://localhost:3000
```

`.env.local` ships with working defaults for the compose/local database. Optional extras: `NVD_API_KEY`, `ABUSECH_AUTH_KEY`, `ENABLE_CRON=1`.

## Keeping data fresh

Manual: `npm run ingest -- --source=fast` (KEV/Feodo/DShield/URLhaus, seconds) or `--source=slow` (NVD/EPSS, minutes). `--source=all` does everything. Any comma-separated list of source names also works.

Via HTTP: `curl -X POST -H "x-ingest-token: $INGEST_TOKEN" "localhost:3000/api/ingest?source=fast"`.

Scheduled, pick one:
- **OS cron** (recommended): fast sources every 15 min, slow hourly:
  ```
  */15 * * * *  cd /path/to/cyber && npm run ingest -- --source=fast
  0    * * * *  cd /path/to/cyber && npm run ingest -- --source=slow
  ```
- **In-process**: run `next start` with `ENABLE_CRON=1` (see `src/instrumentation.ts`).

## Architecture

```
scripts/ingest.ts / POST /api/ingest     entry points → same runner
src/lib/ingest/
  runner.ts        run tracking, chunked upserts, per-source error isolation
  sources/*.ts     one module per feed: fetch → normalize → {cves, events}
  geo.ts           offline IP→lat/lon with deterministic jitter
  score.ts         priority score recompute (one UPDATE)
src/lib/db/schema.ts   cves / threat_events (dedup_key unique) / ingestion_runs (cursor jsonb)
src/app/api/           globe | feed | cves/top | timeline | stats (JSON, polled via SWR)
src/components/        Globe (react-globe.gl, ssr:false) + glass panels
```

Notes:
- `threat_events.dedup_key` makes every ingester idempotent — reruns insert nothing new.
- NVD sync is incremental via a `lastModStartDate` watermark stored in `ingestion_runs.cursor`, with 7s inter-page sleeps when keyless.
- Globe arcs are illustrative: feeds tell us where threats live, not who they target, so arcs flow to major internet hubs, chosen deterministically per event so the scene is stable across polls.
- The globe API caps payloads (400 points / 60 arcs, severity-first) to keep rendering smooth.
