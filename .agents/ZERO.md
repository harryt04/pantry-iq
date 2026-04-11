# Zero Sync (Rocicorp)

Real-time sync engine between browser and PostgreSQL. Port `8001`. Requires `wal_level=logical` in Postgres.

## Data Flow

**Read:** Component → Zero hook → local SQLite cache (<100ms) → Zero server → Postgres (background sync)
**Write:** All writes go through REST API (`/api/*`) → Postgres → Zero detects via logical replication → pushes to clients. No direct client-side writes.

## Row-Level Security

User → Locations (`location.userId === session.user.id`) → Conversations → Messages. Cross-user access impossible.

## Graceful Fallback

If Zero unavailable: `ZeroProvider` passes `client: null`; hooks fall back to REST API (~500ms). App stays functional.

## Key Files

- `lib/zero/index.ts` – client setup
- `lib/zero/permissions.ts` – RLS rules

## Troubleshooting

**Cannot connect:** `curl http://localhost:8001/health` → `{"status":"ok"}`. Check `NEXT_PUBLIC_ZERO_URL`. `docker-compose logs zero`.

**Permission denied:** Verify `session.user.id`. Check user owns location. Review `lib/zero/permissions.ts`.

**Data not syncing:** `SHOW wal_level;` must return `logical`. Check `pg_replication_slots` and `pg_stat_replication`.

**Client always null:** User must be authenticated before ZeroProvider mounts. Check network errors to `localhost:8001`.

**Empty cache:** Clear localStorage. Verify `SELECT * FROM conversations WHERE user_id = ?` has data. Check permission filter isn't over-restrictive.

## Docker Config

```yaml
postgres:
  command: ["postgres", "-c", "wal_level=logical"]  # REQUIRED

zero:
  image: rocicorp/zero:latest
  ports: ["8001:8001"]
  depends_on: {postgres: {condition: service_healthy}}
```
